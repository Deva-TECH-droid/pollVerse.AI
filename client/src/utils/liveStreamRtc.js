// WebRTC helpers for match live streaming. The match creator's browser is
// the broadcaster (one peer connection per watcher); every other user is a
// watcher. All signaling (offers/answers/ICE) is relayed through Socket.IO.

const RTC_CONFIG = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ],
};

// Creator side: answers each incoming watcher with its own peer connection
// carrying the given camera stream. Returns { replaceStream, close }.
export function createBroadcaster(socket, getStream) {
  const peers = new Map(); // watcherId -> RTCPeerConnection

  const handleWatcherJoin = async ({ watcherId }) => {
    const stream = getStream();
    if (!stream) return;
    const existing = peers.get(watcherId);
    if (existing) existing.close();

    const pc = new RTCPeerConnection(RTC_CONFIG);
    peers.set(watcherId, pc);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit('webrtcIceCandidate', { target: watcherId, candidate: e.candidate });
    };
    pc.onconnectionstatechange = () => {
      if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
        pc.close();
        if (peers.get(watcherId) === pc) peers.delete(watcherId);
      }
    };
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtcOffer', { target: watcherId, sdp: pc.localDescription });
    } catch (err) {
      console.error('Broadcast offer error:', err);
    }
  };

  const handleAnswer = async ({ from, sdp }) => {
    const pc = peers.get(from);
    if (!pc) return;
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    } catch (err) {
      console.error('Broadcast answer error:', err);
    }
  };

  const handleCandidate = async ({ from, candidate }) => {
    const pc = peers.get(from);
    if (!pc || !candidate) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      // Late/stale candidates are safe to ignore.
    }
  };

  socket.on('watcherJoin', handleWatcherJoin);
  socket.on('webrtcAnswer', handleAnswer);
  socket.on('webrtcIceCandidate', handleCandidate);

  return {
    // Swap camera (e.g. front/back flip) without renegotiating.
    replaceStream(stream) {
      peers.forEach((pc) => {
        const senders = pc.getSenders();
        stream.getTracks().forEach((track) => {
          const sender = senders.find((s) => s.track && s.track.kind === track.kind);
          if (sender) sender.replaceTrack(track);
        });
      });
    },
    close() {
      socket.off('watcherJoin', handleWatcherJoin);
      socket.off('webrtcAnswer', handleAnswer);
      socket.off('webrtcIceCandidate', handleCandidate);
      peers.forEach((pc) => pc.close());
      peers.clear();
    },
  };
}

// Viewer side: requests the stream and calls onStream(mediaStream) when the
// broadcaster's video arrives. Returns { request, close }.
export function createWatcher(socket, matchId, onStream) {
  let pc = null;
  let broadcasterId = null;

  const handleOffer = async ({ from, sdp }) => {
    broadcasterId = from;
    if (pc) pc.close();
    pc = new RTCPeerConnection(RTC_CONFIG);
    pc.ontrack = (e) => {
      if (e.streams && e.streams[0]) onStream(e.streams[0]);
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit('webrtcIceCandidate', { target: from, candidate: e.candidate });
    };
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtcAnswer', { target: from, sdp: pc.localDescription });
    } catch (err) {
      console.error('Watch answer error:', err);
    }
  };

  const handleCandidate = async ({ from, candidate }) => {
    if (!pc || from !== broadcasterId || !candidate) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      // Late/stale candidates are safe to ignore.
    }
  };

  socket.on('webrtcOffer', handleOffer);
  socket.on('webrtcIceCandidate', handleCandidate);
  socket.emit('watcherRequestStream', { matchId });

  return {
    request() {
      socket.emit('watcherRequestStream', { matchId });
    },
    close() {
      socket.off('webrtcOffer', handleOffer);
      socket.off('webrtcIceCandidate', handleCandidate);
      if (pc) pc.close();
      pc = null;
    },
  };
}
