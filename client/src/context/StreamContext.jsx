import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import socket from '../socket';

const API_URL = process.env.REACT_APP_API_URL || '';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
};

const StreamContext = createContext(null);

export function StreamProvider({ children }) {
  const [activeMatchId, setActiveMatchId] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [mediaStream, setMediaStream] = useState(null);

  const mediaStreamRef = useRef(null);
  const peerConnectionsRef = useRef(new Map());
  const activeMatchIdRef = useRef(null);

  // Keep refs in sync
  useEffect(() => {
    activeMatchIdRef.current = activeMatchId;
  }, [activeMatchId]);

  useEffect(() => {
    mediaStreamRef.current = mediaStream;
  }, [mediaStream]);

  // Set up persistent broadcaster WebRTC signaling listeners
  useEffect(() => {
    const onViewerJoined = async ({ viewerSocketId }) => {
      if (!viewerSocketId) return;
      const currentMatchId = activeMatchIdRef.current;
      if (!currentMatchId) return;

      const waitForStream = () => {
        return new Promise((resolve) => {
          if (mediaStreamRef.current) return resolve(true);
          let retries = 0;
          const timer = setInterval(() => {
            retries++;
            if (mediaStreamRef.current) {
              clearInterval(timer);
              resolve(true);
            } else if (retries >= 12) {
              clearInterval(timer);
              resolve(false);
            }
          }, 400);
        });
      };

      const ready = await waitForStream();
      if (!ready || !mediaStreamRef.current) {
        console.warn('⚠️ Broadcaster persistent stream not ready for viewer:', viewerSocketId);
        return;
      }

      try {
        console.log(`🎥 Persistent Broadcaster creating offer for viewer ${viewerSocketId}`);
        const existingPc = peerConnectionsRef.current.get(viewerSocketId);
        if (existingPc) {
          try { existingPc.close(); } catch (e) { }
        }

        const pc = new RTCPeerConnection(RTC_CONFIG);
        peerConnectionsRef.current.set(viewerSocketId, pc);

        mediaStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, mediaStreamRef.current);
        });

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('streamIceCandidate', {
              targetSocketId: viewerSocketId,
              candidate: event.candidate,
            });
          }
        };

        pc.onconnectionstatechange = () => {
          console.log(`WebRTC Broadcaster → viewer ${viewerSocketId}: ${pc.connectionState}`);
          if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            try { pc.close(); } catch (e) { }
            peerConnectionsRef.current.delete(viewerSocketId);
          }
        };

        const offer = await pc.createOffer({ offerToReceiveAudio: false, offerToReceiveVideo: false });
        await pc.setLocalDescription(offer);

        socket.emit('streamOffer', {
          matchId: currentMatchId,
          targetSocketId: viewerSocketId,
          offer,
        });
      } catch (err) {
        console.error('Error creating offer for viewer in StreamContext:', err);
      }
    };

    const onStreamAnswer = async ({ viewerSocketId, answer }) => {
      const pc = peerConnectionsRef.current.get(viewerSocketId);
      if (pc && answer) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.error('Error setting remote description from answer in StreamContext:', err);
        }
      }
    };

    const onIceCandidate = async ({ fromSocketId, candidate }) => {
      if (!candidate) return;
      try {
        const pc = peerConnectionsRef.current.get(fromSocketId);
        if (pc && pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error('Error adding ICE candidate in StreamContext:', err);
      }
    };

    socket.on('streamViewerJoined', onViewerJoined);
    socket.on('streamAnswer', onStreamAnswer);
    socket.on('streamIceCandidate', onIceCandidate);

    return () => {
      socket.off('streamViewerJoined', onViewerJoined);
      socket.off('streamAnswer', onStreamAnswer);
      socket.off('streamIceCandidate', onIceCandidate);
    };
  }, []);

  // Stop broadcasting explicitly (creator clicks Stop Stream)
  const stopBroadcast = useCallback(async (matchIdOverride) => {
    const matchId = matchIdOverride || activeMatchIdRef.current;

    // Stop all local tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try { track.stop(); } catch (e) { }
      });
      mediaStreamRef.current = null;
    }
    setMediaStream(null);
    setCameraActive(false);
    setIsStreaming(false);

    // Close all viewer peer connections
    peerConnectionsRef.current.forEach((pc) => {
      try { pc.close(); } catch (e) { }
    });
    peerConnectionsRef.current.clear();

    if (matchId) {
      socket.emit('streamStopped', { matchId });
      try {
        await fetch(`${API_URL}/api/gully-cricket/matches/${matchId}/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isLiveStreaming: false }),
        });
      } catch (err) {
        console.warn('Failed to update stream status on server:', err.message);
      }
    }
    setActiveMatchId(null);
  }, []);

  // Start broadcasting
  const startBroadcast = useCallback(async (matchId, desiredFacingMode = 'environment') => {
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: desiredFacingMode },
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      setMediaStream(stream);
      setActiveMatchId(matchId);
      setFacingMode(desiredFacingMode);
      setCameraActive(true);
      setIsStreaming(true);

      // Notify backend and viewers
      await fetch(`${API_URL}/api/gully-cricket/matches/${matchId}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLiveStreaming: true }),
      });

      socket.emit('streamStarted', { matchId });
      socket.emit('streamBroadcasterReady', { matchId });

      return stream;
    } catch (err) {
      console.error('Failed to start camera/broadcast:', err);
      throw err;
    }
  }, []);

  // Flip camera between environment and user
  const toggleFacingMode = useCallback(async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    if (!activeMatchIdRef.current || !mediaStreamRef.current) {
      setFacingMode(nextMode);
      return;
    }

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { exact: nextMode },
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
        },
        audio: false,
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      const oldVideoTrack = mediaStreamRef.current.getVideoTracks()[0];

      if (oldVideoTrack) {
        mediaStreamRef.current.removeTrack(oldVideoTrack);
        oldVideoTrack.stop();
      }
      mediaStreamRef.current.addTrack(newVideoTrack);

      // Replace video track in all active viewer peer connections
      peerConnectionsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(newVideoTrack).catch((e) => console.warn('Track replace error:', e));
        }
      });

      setFacingMode(nextMode);
      setMediaStream(mediaStreamRef.current);
    } catch (err) {
      console.warn('Exact flip failed, trying ideal facingMode:', err.message);
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: nextMode } },
          audio: false,
        });
        const newTrack = fallbackStream.getVideoTracks()[0];
        const oldTrack = mediaStreamRef.current.getVideoTracks()[0];
        if (oldTrack) {
          mediaStreamRef.current.removeTrack(oldTrack);
          oldTrack.stop();
        }
        mediaStreamRef.current.addTrack(newTrack);

        peerConnectionsRef.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (sender) sender.replaceTrack(newTrack).catch(() => {});
        });
        setFacingMode(nextMode);
        setMediaStream(mediaStreamRef.current);
      } catch (e2) {
        console.error('Flip camera failed completely:', e2);
      }
    }
  }, [facingMode]);

  // Toggle microphone audio mute
  const toggleAudioMute = useCallback(() => {
    if (mediaStreamRef.current) {
      const audioTracks = mediaStreamRef.current.getAudioTracks();
      const nextMuted = !isAudioMuted;
      audioTracks.forEach((track) => {
        track.enabled = !nextMuted;
      });
      setIsAudioMuted(nextMuted);
    }
  }, [isAudioMuted]);

  return (
    <StreamContext.Provider
      value={{
        activeMatchId,
        mediaStream,
        isStreaming,
        cameraActive,
        facingMode,
        isAudioMuted,
        startBroadcast,
        stopBroadcast,
        toggleFacingMode,
        toggleAudioMute,
      }}
    >
      {children}
    </StreamContext.Provider>
  );
}

export function useStreamContext() {
  return useContext(StreamContext);
}
