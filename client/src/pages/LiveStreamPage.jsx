import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { io } from 'socket.io-client';
import '../styles/GullyCricket.css';

const API_URL = process.env.REACT_APP_API_URL || '';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    // Open TURN relay for cross-network mobile→laptop streaming
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

function LiveStreamPage() {
  const { id } = useParams();
  const { user } = useUser();
  const [match, setMatch] = useState(null);
  const [inningsSummaries, setInningsSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [spectatorCount, setSpectatorCount] = useState(1);
  const [isStreaming, setIsStreaming] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [remoteStreamActive, setRemoteStreamActive] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // Mobile Back Camera by default
  const [lastBallAlert, setLastBallAlert] = useState(null);

  // Chat & Prediction Poll
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [userNameInput, setUserNameInput] = useState('');
  const [activeMicroPoll, setActiveMicroPoll] = useState(null);
  const [votedOptionId, setVotedOptionId] = useState(null);
  const [voterId] = useState(() => 'voter_' + Math.random().toString(36).substring(2, 9));

  // Custom micro-poll creator state
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('Who will hit the next SIX?');
  const [pollOptionsText, setPollOptionsText] = useState('');

  // Video Refs & WebRTC
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const remoteMediaStreamRef = useRef(null);
  const peerConnectionsRef = useRef(new Map()); // Broadcaster: viewerSocketId -> RTCPeerConnection
  const viewerPcRef = useRef(null); // Viewer: single RTCPeerConnection to broadcaster
  const iceCandidateQueueRef = useRef([]);
  const chatBottomRef = useRef(null);
  const socketRef = useRef(null);
  const videoViewportRef = useRef(null);
  const [isLargeScreen, setIsLargeScreen] = useState(false);

  // Determine if current logged-in user is the match creator
  const isCreator = Boolean(
    user && match?.createdBy?.userId && (
      String(user.id) === String(match.createdBy.userId) ||
      user.primaryEmailAddress?.emailAddress?.toLowerCase() === match.createdBy.email?.toLowerCase()
    )
  );

  // Fetch Match Details
  const fetchMatchDetails = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/gully-cricket/matches/${id}`);
      if (!res.ok) throw new Error('Match not found');
      const data = await res.json();
      const m = data.match;
      setMatch(m);
      setInningsSummaries(data.innings || []);
      setIsStreaming(Boolean(m.isLiveStreaming));
      if (m.chatMessages) setChatMessages(m.chatMessages);
      if (m.activeMicroPoll) {
        setActiveMicroPoll(m.activeMicroPoll);
      } else if (m.teamA?.players && m.teamB?.players) {
        setPollOptionsText(`${m.teamA.players[0] || 'Player 1'}, ${m.teamA.players[1] || 'Player 2'}, ${m.teamB.players[0] || 'Player 3'}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Clean up all WebRTC connections
  const cleanupWebRTC = useCallback(() => {
    peerConnectionsRef.current.forEach((pc) => {
      try { pc.close(); } catch (e) { }
    });
    peerConnectionsRef.current.clear();

    if (viewerPcRef.current) {
      try { viewerPcRef.current.close(); } catch (e) { }
      viewerPcRef.current = null;
    }
    remoteMediaStreamRef.current = null;
    iceCandidateQueueRef.current = [];
  }, []);

  const stopCamera = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
    cleanupWebRTC();
    if (socketRef.current) {
      socketRef.current.emit('streamStopped', { matchId: id });
    }
  }, [cleanupWebRTC, id]);

  // Helper: Broadcaster creates and sends WebRTC offer to a specific viewer
  const sendOfferToViewer = useCallback(async (socket, viewerSocketId) => {
    try {
      console.log(`🎥 Broadcaster creating offer for viewer ${viewerSocketId}`);
      // Close stale connection for this viewer if any
      const existingPc = peerConnectionsRef.current.get(viewerSocketId);
      if (existingPc) { try { existingPc.close(); } catch (e) { } }

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
        console.log(`WebRTC → viewer ${viewerSocketId}: ${pc.connectionState}`);
      };

      const offer = await pc.createOffer({ offerToReceiveAudio: false, offerToReceiveVideo: false });
      await pc.setLocalDescription(offer);

      socket.emit('streamOffer', {
        matchId: id,
        targetSocketId: viewerSocketId,
        offer,
      });
    } catch (err) {
      console.error('Error creating offer for viewer:', err);
    }
  }, [id]);

  // WebRTC & Socket Connection
  useEffect(() => {
    fetchMatchDetails();

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 2000,
    });
    socketRef.current = socket;

    const joinRooms = () => {
      socket.emit('joinMatchViewer', { matchId: id });
      socket.emit('streamViewerJoin', { matchId: id });
    };
    joinRooms();

    // Re-join rooms on reconnect so score updates resume immediately
    socket.on('connect', () => {
      console.log('🔗 Socket reconnected — rejoining match rooms');
      joinRooms();
    });

    // 1. Spectator count
    socket.on('viewerCountUpdate', ({ matchId, count }) => {
      if (String(matchId) === String(id)) {
        setSpectatorCount(count || 1);
      }
    });

    // 2. Real-Time Score Updates (Instantly reflected across all viewers)
    socket.on('matchScoreUpdate', ({ matchId, match: updatedMatch, innings: updatedInnings, latestBall }) => {
      if (String(matchId) === String(id) || String(updatedMatch?._id) === String(id)) {
        setMatch(updatedMatch);
        setInningsSummaries(updatedInnings || []);
        if (latestBall) {
          let alertText = '';
          if (latestBall.isWicket) alertText = '🔴 WICKET!';
          else if (latestBall.runs === 6) alertText = '🚀 SIX! (6 Runs)';
          else if (latestBall.runs === 4) alertText = '🔥 FOUR! (4 Runs)';
          else if (latestBall.extraType === 'wide') alertText = '⚡ WIDE BALL';
          else if (latestBall.extraType === 'noball') alertText = '⚡ NO BALL';

          if (alertText) {
            setLastBallAlert(alertText);
            setTimeout(() => setLastBallAlert(null), 3500);
          }
        }
      }
    });

    // 3. Stream Status Update
    socket.on('matchStreamUpdate', ({ matchId, isLiveStreaming }) => {
      if (String(matchId) === String(id)) {
        setIsStreaming(isLiveStreaming);
        if (!isLiveStreaming) {
          setRemoteStreamActive(false);
          remoteMediaStreamRef.current = null;
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        } else {
          socket.emit('streamViewerJoin', { matchId: id });
        }
      }
    });

    // 4. WebRTC: Broadcaster receives notification of new viewer
    socket.on('streamViewerJoined', async ({ viewerSocketId }) => {
      if (!viewerSocketId) return;

      // If media isn't ready yet (broadcaster still loading camera), wait up to 5s
      if (!mediaStreamRef.current) {
        let retries = 0;
        const waitForStream = setInterval(async () => {
          retries++;
          if (mediaStreamRef.current) {
            clearInterval(waitForStream);
            await sendOfferToViewer(socket, viewerSocketId);
          } else if (retries >= 5) {
            clearInterval(waitForStream);
            console.warn('⚠️ Broadcaster stream not ready after 5s for viewer:', viewerSocketId);
          }
        }, 1000);
        return;
      }

      await sendOfferToViewer(socket, viewerSocketId);
    });

    // 5. WebRTC: Broadcaster receives answer from viewer
    socket.on('streamAnswer', async ({ viewerSocketId, answer }) => {
      const pc = peerConnectionsRef.current.get(viewerSocketId);
      if (pc && answer) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.error('Error setting remote description from answer:', err);
        }
      }
    });

    // 6. WebRTC: Viewer receives offer from broadcaster
    socket.on('streamOffer', async ({ broadcasterSocketId, offer }) => {
      try {
        console.log('🎥 Viewer received stream offer from broadcaster');
        if (viewerPcRef.current) {
          try { viewerPcRef.current.close(); } catch (e) { }
        }

        const pc = new RTCPeerConnection(RTC_CONFIG);
        viewerPcRef.current = pc;
        iceCandidateQueueRef.current = [];

        pc.ontrack = (event) => {
          console.log('🎥 Remote video track received:', event.streams);
          if (event.streams && event.streams[0]) {
            const stream = event.streams[0];
            remoteMediaStreamRef.current = stream;
            setRemoteStreamActive(true);
            setIsStreaming(true);
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = stream;
              remoteVideoRef.current.play().catch((e) => console.log('Autoplay:', e));
            }
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('streamIceCandidate', {
              targetSocketId: broadcasterSocketId,
              candidate: event.candidate,
            });
          }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Process any queued ICE candidates
        while (iceCandidateQueueRef.current.length > 0) {
          const cand = iceCandidateQueueRef.current.shift();
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          } catch (e) { }
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('streamAnswer', {
          matchId: id,
          targetSocketId: broadcasterSocketId,
          answer,
        });
      } catch (err) {
        console.error('Error handling stream offer:', err);
      }
    });

    // 7. WebRTC: ICE Candidate exchange
    socket.on('streamIceCandidate', async ({ fromSocketId, candidate }) => {
      if (!candidate) return;
      try {
        const pcBroadcaster = peerConnectionsRef.current.get(fromSocketId);
        if (pcBroadcaster) {
          if (pcBroadcaster.remoteDescription) {
            await pcBroadcaster.addIceCandidate(new RTCIceCandidate(candidate));
          }
          return;
        }

        if (viewerPcRef.current) {
          if (viewerPcRef.current.remoteDescription) {
            await viewerPcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } else {
            iceCandidateQueueRef.current.push(candidate);
          }
        }
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    });

    // 8. Broadcaster is ready event
    socket.on('streamBroadcasterReady', () => {
      socket.emit('streamViewerJoin', { matchId: id });
    });

    // 9. Stream ended
    socket.on('streamEnded', () => {
      setRemoteStreamActive(false);
      setIsStreaming(false);
      remoteMediaStreamRef.current = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    });

    // 10. Chat & Poll updates
    socket.on('newMatchChatMessage', ({ matchId, message }) => {
      if (String(matchId) === String(id)) {
        setChatMessages((prev) => [...prev, message]);
      }
    });

    socket.on('newMicroPoll', ({ matchId, microPoll }) => {
      if (String(matchId) === String(id)) {
        setActiveMicroPoll(microPoll);
        setVotedOptionId(null);
      }
    });

    socket.on('microPollUpdated', ({ matchId, microPoll }) => {
      if (String(matchId) === String(id)) {
        setActiveMicroPoll(microPoll);
      }
    });

    return () => {
      socket.emit('leaveMatchViewer');
      socket.disconnect();
      stopCamera();
      cleanupWebRTC();
    };
  }, [
    id,
    fetchMatchDetails,
    cleanupWebRTC,
    stopCamera,
    sendOfferToViewer
  ]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const [isAudioMuted, setIsAudioMuted] = useState(true);

  // Attach local camera stream whenever cameraActive turns true
  useEffect(() => {
    if (cameraActive && mediaStreamRef.current && localVideoRef.current) {
      localVideoRef.current.srcObject = mediaStreamRef.current;
      localVideoRef.current.play().catch((err) => {
        console.warn('Local video auto-play error:', err.message);
      });
    }
  }, [cameraActive]);

  // Attach remote stream whenever remoteStreamActive turns true
  useEffect(() => {
    if (remoteStreamActive && remoteMediaStreamRef.current && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteMediaStreamRef.current;
      remoteVideoRef.current.play().catch((err) => {
        console.warn('Remote video auto-play error:', err.message);
      });
    }
  }, [remoteStreamActive]);

  // Start Camera Capture for Creator (Mobile Back Camera or Laptop Webcam)
  const startCamera = async (desiredFacingMode = facingMode) => {
    stopCamera();
    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: desiredFacingMode },
          audio: true,
        });
      } catch (e1) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: desiredFacingMode },
            audio: false,
          });
        } catch (e2) {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
      }

      mediaStreamRef.current = stream;
      setFacingMode(desiredFacingMode);
      setCameraActive(true);
      await toggleStream(true);

      // Register as broadcaster on socket and notify viewers
      if (socketRef.current) {
        socketRef.current.emit('streamBroadcasterJoin', { matchId: id });
      }
    } catch (err) {
      alert('Camera access error: ' + err.message + '\n\nPlease ensure camera permissions are allowed in your browser URL bar.');
      await toggleStream(true);
    }
  };

  const switchCameraMode = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    await startCamera(nextMode);
  };

  // Toggle Stream status on backend
  const toggleStream = async (status) => {
    try {
      const res = await fetch(`${API_URL}/api/gully-cricket/matches/${id}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLiveStreaming: status }),
      });
      if (res.ok) {
        setIsStreaming(status);
        if (!status) stopCamera();
      }
    } catch (err) {
      console.error('Failed to toggle stream:', err);
    }
  };

  // Send Chat Message
  const handleSendChat = async (e, reactionEmoji = '') => {
    if (e) e.preventDefault();
    if (!chatInput.trim() && !reactionEmoji) return;

    const senderName = userNameInput.trim() || user?.firstName || 'Cricket Fan';

    try {
      await fetch(`${API_URL}/api/gully-cricket/matches/${id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: senderName,
          text: chatInput.trim(),
          reactionEmoji,
        }),
      });
      setChatInput('');
    } catch (err) {
      console.error('Failed to send chat:', err);
    }
  };

  // Vote on Micro-Poll Prediction
  const handleVoteMicroPoll = async (optionId) => {
    if (votedOptionId !== null) return;
    try {
      const res = await fetch(`${API_URL}/api/gully-cricket/matches/${id}/micro-poll/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionId, voterId }),
      });
      if (res.ok) {
        setVotedOptionId(optionId);
      }
    } catch (err) {
      console.error('Failed to vote:', err);
    }
  };

  // Create Micro-Poll Prediction (Creator)
  const handleCreateMicroPoll = async (e) => {
    e.preventDefault();
    const optionsArray = pollOptionsText.split(',').map((s) => s.trim()).filter(Boolean);
    try {
      await fetch(`${API_URL}/api/gully-cricket/matches/${id}/micro-poll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: pollQuestion,
          options: optionsArray,
        }),
      });
      setShowPollModal(false);
    } catch (err) {
      console.error('Failed to create poll:', err);
    }
  };

  const toggleLargeScreen = () => {
    if (!document.fullscreenElement && videoViewportRef.current) {
      if (videoViewportRef.current.requestFullscreen) {
        videoViewportRef.current.requestFullscreen();
      } else if (videoViewportRef.current.webkitRequestFullscreen) {
        videoViewportRef.current.webkitRequestFullscreen();
      }
      setIsLargeScreen(true);
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
      setIsLargeScreen(false);
    } else {
      setIsLargeScreen(!isLargeScreen);
    }
  };

  if (loading) {
    return (
      <div className="gc-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Connecting to live match broadcast...</p>
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="gc-container">
        <p className="gc-error">⚠️ {error || 'Match not found'}</p>
        <Link to="/gully-cricket" className="gc-back-link">← Back to Matches</Link>
      </div>
    );
  }

  // Real-Time Score Computations from live match & summary data
  const latestInningsSummary = inningsSummaries.length > 0 ? inningsSummaries[inningsSummaries.length - 1] : null;
  const latestRawInnings = match.innings && match.innings.length > 0 ? match.innings[match.innings.length - 1] : null;

  const battingTeamKey = latestInningsSummary?.battingTeam || match.battingTeam || 'teamA';
  const bowlingTeamKey = latestInningsSummary?.bowlingTeam || match.bowlingTeam || (battingTeamKey === 'teamA' ? 'teamB' : 'teamA');
  const battingTeamObj = match[battingTeamKey] || match.teamA;
  const bowlingTeamObj = match[bowlingTeamKey] || match.teamB;

  const currentBattingName = latestInningsSummary ? (match[battingTeamKey]?.name || 'Batting Team') : battingTeamObj.name;
  const runs = latestInningsSummary ? latestInningsSummary.totalRuns : 0;
  const wickets = latestInningsSummary ? latestInningsSummary.totalWickets : 0;
  const oversDisplay = latestInningsSummary ? latestInningsSummary.oversDisplay : '0.0';
  const totalOvers = match.overs || 10;
  const target = match.firstInningsScore ? match.firstInningsScore + 1 : (latestInningsSummary?.target || null);

  const [ovCompletedStr, ballsRemStr] = String(oversDisplay).split('.');
  const oversDecimal = Number(ovCompletedStr || 0) + Number(ballsRemStr || 0) / 6;
  const crr = oversDecimal > 0 ? (runs / oversDecimal).toFixed(2) : '0.00';
  const remainingOvers = Math.max(0, totalOvers - oversDecimal);
  const remainingRuns = target !== null ? Math.max(0, target - runs) : 0;
  const rrr = target !== null && remainingOvers > 0 ? (remainingRuns / remainingOvers).toFixed(2) : '—';

  // Extract live Striker & Non-Striker information
  const curState = latestInningsSummary?.current || latestRawInnings?.current;
  const strikerName = curState?.striker;
  const nonStrikerName = curState?.nonStriker;
  const bowlerName = curState?.bowler;

  const battingCard = latestInningsSummary?.battingCard || [];
  const bowlingCard = latestInningsSummary?.bowlingCard || [];

  const strikerStats = battingCard.find((b) => b.name === strikerName) || { name: strikerName || battingTeamObj.players[0] || 'Batter 1', runs: 0, ballsFaced: 0, fours: 0, sixes: 0 };
  const nonStrikerStats = battingCard.find((b) => b.name === nonStrikerName) || { name: nonStrikerName || battingTeamObj.players[1] || 'Batter 2', runs: 0, ballsFaced: 0, fours: 0, sixes: 0 };

  const currentBowlerStats = bowlingCard.find((b) => b.name === bowlerName) || {
    name: bowlerName || bowlingTeamObj.players[0] || 'Bowler',
    wickets: 0,
    runsConceded: 0,
    overs: '0.0',
    economy: 0,
  };

  const recentBalls = latestInningsSummary?.recentBalls || [];

  return (
    <div className="gc-stream-container">
      {/* Top Header Navigation */}
      <div className="gc-stream-header-nav">
        <Link to={`/gully-cricket/match/${id}`} className="gc-back-link">
          ← Back to Match Dashboard
        </Link>
        <div className="gc-live-stream-badge">
          <span className="gc-pulse-red"></span> 🔴 LIVE STREAM
        </div>
      </div>

      {/* Main Video & Score Overlay Section */}
      <div className={`gc-stream-video-box ${isLargeScreen ? 'is-large-box' : ''}`}>
        {/* Video Screen */}
        <div ref={videoViewportRef} className={`gc-video-viewport ${isLargeScreen ? 'is-large-viewport' : ''}`}>
          {/* Creator's Local Video Camera Feed */}
          {cameraActive ? (
            <video ref={localVideoRef} autoPlay playsInline muted className="gc-camera-feed" />
          ) : remoteStreamActive ? (
            /* Viewer's WebRTC Stream received from Creator */
            <video
              ref={(el) => {
                remoteVideoRef.current = el;
                if (el && remoteMediaStreamRef.current && el.srcObject !== remoteMediaStreamRef.current) {
                  el.srcObject = remoteMediaStreamRef.current;
                  el.play().catch((err) => console.log('Autoplay play error:', err));
                }
              }}
              autoPlay
              playsInline
              muted={isAudioMuted}
              className="gc-camera-feed"
            />
          ) : (
            /* Sleek Animated Live Broadcast Screen when video is offline or loading */
            <div className="gc-simulated-video">
              <div className="gc-video-placeholder-content">
                <span className="gc-cricket-cam-icon">🏏</span>
                <div className="gc-broadcast-match-status-badge">
                  {isStreaming ? '🔴 LIVE STREAM CONNECTING...' : 'LIVE SCORECAST & SPECTATOR HUB'}
                </div>
                <h3>{match.teamA.name} <span className="gc-vs-highlight">vs</span> {match.teamB.name}</h3>
                <p className="gc-broadcast-meta-line">
                  ⚡ {match.overs} Overs Match · Real-time live score synchronization active
                </p>

                {isCreator && !isStreaming && (
                  <button className="gc-start-cam-btn" onClick={() => startCamera(facingMode)}>
                    🎥 Start Camera Stream
                  </button>
                )}
                {!isCreator && !isStreaming && (
                  <p className="gc-stream-waiting-note">
                    ⏳ Match broadcaster hasn't started the camera yet. Scores update live below!
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Alert Notification on Boundary / Wicket */}
          {lastBallAlert && (
            <div className="gc-ball-alert-banner">
              {lastBallAlert}
            </div>
          )}

          {/* Overlaid Live Score TV Broadcast HUD (Star Sports / Willow Style) */}
          <div className="gc-video-hud-overlay">
            {/* Top Scorebug Bar */}
            <div className="gc-hud-top-bar">
              <div className="gc-hud-left-tags">
                <span className="gc-hud-live-tag">🔴 LIVE</span>
                <span className="gc-hud-match-title-tag">{match.teamA.name} v {match.teamB.name}</span>
              </div>
              <div className="gc-hud-right-actions">
                {remoteStreamActive && (
                  <button
                    className="gc-hud-fullscreen-btn"
                    onClick={() => {
                      setIsAudioMuted(!isAudioMuted);
                      if (remoteVideoRef.current) remoteVideoRef.current.muted = !isAudioMuted;
                    }}
                  >
                    {isAudioMuted ? '🔇 Unmute' : '🔊 Sound On'}
                  </button>
                )}
                <span className="gc-hud-viewers">👥 {spectatorCount} watching</span>
                <button className="gc-hud-fullscreen-btn" onClick={toggleLargeScreen}>
                  {isLargeScreen ? '🗗 Normal Screen' : '⛶ TV Fullscreen'}
                </button>
              </div>
            </div>

            {/* Bottom Broadcast Ribbon with Live Score, Batters & Bowler */}
            <div className="gc-hud-broadcast-ribbon">
              {/* Score Tile */}
              <div className="gc-ribbon-score-tile">
                <span className="gc-ribbon-team-name">{currentBattingName}</span>
                <strong className="gc-ribbon-score-runs">{runs}/{wickets}</strong>
                <span className="gc-ribbon-overs">({oversDisplay}/{totalOvers} ov)</span>
              </div>

              {/* CRR & Target Tile */}
              <div className="gc-ribbon-stats-tile">
                <div>CRR: <strong>{crr}</strong></div>
                {target !== null && (
                  <div>Target: <strong>{target}</strong> · RRR: <strong>{rrr}</strong></div>
                )}
              </div>

              {/* Batters Tile */}
              <div className="gc-ribbon-batters-tile">
                <div className="gc-ribbon-player-row">
                  <span className="gc-ribbon-batter-name">🏏 {strikerStats.name} *</span>
                  <span className="gc-ribbon-player-score">{strikerStats.runs} <small>({strikerStats.ballsFaced || 0})</small></span>
                </div>
                <div className="gc-ribbon-player-row">
                  <span className="gc-ribbon-batter-name">🏏 {nonStrikerStats.name}</span>
                  <span className="gc-ribbon-player-score">{nonStrikerStats.runs} <small>({nonStrikerStats.ballsFaced || 0})</small></span>
                </div>
              </div>

              {/* Bowler Tile */}
              <div className="gc-ribbon-bowler-tile">
                <div className="gc-ribbon-player-row">
                  <span className="gc-ribbon-bowler-name">⚾ {currentBowlerStats.name}</span>
                  <span className="gc-ribbon-player-score">
                    {currentBowlerStats.wickets}/{currentBowlerStats.runsConceded || 0}
                    <small> ({currentBowlerStats.overs || '0.0'})</small>
                  </span>
                </div>
                {recentBalls.length > 0 && (
                  <div className="gc-ribbon-recent-over">
                    {recentBalls.map((rb, idx) => (
                      <span key={idx} className={`gc-recent-ball-pill ${rb.isWicket ? 'wkt' : rb.isBoundary ? 'bound' : ''}`}>
                        {rb.display}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Creator Control Strip (Visible to Match Creator Only) */}
        {isCreator && (
          <div className="gc-stream-control-strip">
            {isStreaming ? (
              <button className="gc-ctrl-btn gc-ctrl-stop" onClick={() => toggleStream(false)}>
                ⏹️ Stop Live Stream
              </button>
            ) : (
              <button className="gc-ctrl-btn gc-ctrl-start" onClick={() => startCamera(facingMode)}>
                🎥 Start Live Stream
              </button>
            )}

            {cameraActive && (
              <button className="gc-ctrl-btn gc-ctrl-flip" onClick={switchCameraMode}>
                🔄 Flip Cam ({facingMode === 'environment' ? 'Back 📷' : 'Front 👤'})
              </button>
            )}

            <button className="gc-ctrl-btn gc-ctrl-poll" onClick={() => setShowPollModal(true)}>
              🎯 Create Live Prediction
            </button>

            <Link to={`/gully-cricket/match/${id}/score`} className="gc-ctrl-btn gc-ctrl-score">
              📊 Open Scoring Console
            </Link>
          </div>
        )}
      </div>

      {/* Real-Time Batters & Bowler Statistics Section */}
      <div className="gc-current-play-card">
        <div className="gc-play-column">
          <h4 className="gc-play-heading">🏏 CURRENT BATTERS (REAL-TIME)</h4>
          <div className="gc-batters-list">
            <div className="gc-batter-row highlight-striker">
              <span className="gc-batter-name">{strikerStats.name} <span className="gc-striker-star">★ ON STRIKE</span></span>
              <strong className="gc-batter-stats">
                {strikerStats.runs} <small>({strikerStats.ballsFaced || 0} balls · {strikerStats.fours || 0}x4, {strikerStats.sixes || 0}x6)</small>
              </strong>
            </div>
            <div className="gc-batter-row">
              <span className="gc-batter-name">{nonStrikerStats.name}</span>
              <strong className="gc-batter-stats">
                {nonStrikerStats.runs} <small>({nonStrikerStats.ballsFaced || 0} balls · {nonStrikerStats.fours || 0}x4, {nonStrikerStats.sixes || 0}x6)</small>
              </strong>
            </div>
          </div>
        </div>

        <div className="gc-play-divider"></div>

        <div className="gc-play-column">
          <h4 className="gc-play-heading">⚾ CURRENT BOWLER (REAL-TIME)</h4>
          <div className="gc-bowler-row">
            <span className="gc-bowler-name">{currentBowlerStats.name}</span>
            <strong className="gc-bowler-stats">
              {currentBowlerStats.wickets}/{currentBowlerStats.runsConceded || 0}
              <small> ({currentBowlerStats.overs || '0.0'} ov · Econ: {currentBowlerStats.economy || '0.00'})</small>
            </strong>
          </div>

          {recentBalls.length > 0 && (
            <div className="gc-recent-balls-bar">
              <span className="gc-recent-label">This Over:</span>
              <div className="gc-recent-chips">
                {recentBalls.map((rb, i) => (
                  <span key={i} className={`gc-ball-chip ${rb.isWicket ? 'is-wkt' : rb.isBoundary ? 'is-four' : ''}`}>
                    {rb.display}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Grid: Live Predictions & Live Chat */}
      <div className="gc-stream-interactive-grid">
        {/* 🎯 Live Prediction (Micro Poll) */}
        <div className="gc-interactive-card gc-prediction-card">
          <div className="gc-card-title-bar">
            <h3>🎯 LIVE PREDICTION</h3>
            <span className="gc-live-pulse-badge">IN-MATCH POLL</span>
          </div>

          {activeMicroPoll && activeMicroPoll.isActive ? (
            <div className="gc-micropoll-body">
              <p className="gc-poll-question">{activeMicroPoll.question}</p>
              <div className="gc-poll-options">
                {activeMicroPoll.options.map((opt) => {
                  const total = activeMicroPoll.totalVotes || 1;
                  const pct = Math.round((opt.votes / total) * 100);
                  const isVoted = String(votedOptionId) === String(opt.id);

                  return (
                    <button
                      key={opt.id}
                      className={`gc-poll-opt-btn ${isVoted ? 'voted' : ''}`}
                      onClick={() => handleVoteMicroPoll(opt.id)}
                      disabled={votedOptionId !== null}
                    >
                      <div className="gc-poll-opt-fill" style={{ width: `${pct}%` }}></div>
                      <span className="gc-poll-opt-text">{opt.text}</span>
                      <span className="gc-poll-opt-pct">{pct}%</span>
                    </button>
                  );
                })}
              </div>
              {votedOptionId !== null && (
                <p className="gc-voted-thanks">✅ Thanks for predicting! Results update live.</p>
              )}
            </div>
          ) : (
            <div className="gc-no-poll">
              <p>No active prediction right now.</p>
              {isCreator && (
                <button className="gc-create-poll-link" onClick={() => setShowPollModal(true)}>
                  + Create Prediction Poll
                </button>
              )}
            </div>
          )}
        </div>

        {/* 💬 Live Spectator Chat */}
        <div className="gc-interactive-card gc-chat-card">
          <div className="gc-card-title-bar">
            <h3>💬 LIVE CHAT</h3>
            <span className="gc-spectator-pill">👥 {spectatorCount} watching</span>
          </div>

          <div className="gc-chat-feed">
            {chatMessages.length > 0 ? (
              chatMessages.map((msg, index) => (
                <div key={index} className="gc-chat-msg">
                  <span className="gc-chat-author">{msg.userName}:</span>
                  {msg.reactionEmoji && <span className="gc-chat-emoji">{msg.reactionEmoji}</span>}
                  <span className="gc-chat-text">{msg.text}</span>
                </div>
              ))
            ) : (
              <p className="gc-chat-empty">No messages yet. Be the first to cheer!</p>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick Reaction Emojis Bar */}
          <div className="gc-emoji-reaction-bar">
            {['🔥', '6️⃣', '4️⃣', '🏏', '👏', '😮'].map((emoji) => (
              <button key={emoji} className="gc-emoji-btn" onClick={() => handleSendChat(null, emoji)}>
                {emoji}
              </button>
            ))}
          </div>

          {/* Chat Form */}
          <form className="gc-chat-form" onSubmit={(e) => handleSendChat(e)}>
            {!user && (
              <input
                type="text"
                placeholder="Your name..."
                value={userNameInput}
                onChange={(e) => setUserNameInput(e.target.value)}
                className="gc-chat-name-input"
              />
            )}
            <input
              type="text"
              placeholder="Type a cheer or message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="gc-chat-text-input"
            />
            <button type="submit" className="gc-chat-send-btn">
              Send
            </button>
          </form>
        </div>
      </div>

      {/* Modal for Creating Micro-Poll */}
      {showPollModal && (
        <div className="gc-modal-overlay">
          <div className="gc-modal-box">
            <h3>🎯 Create Live Prediction Micro-Poll</h3>
            <form onSubmit={handleCreateMicroPoll}>
              <div className="gc-form-group">
                <label>Question:</label>
                <input
                  type="text"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="e.g. Who will hit the next SIX?"
                  required
                />
              </div>

              <div className="gc-form-group">
                <label>Options (comma-separated):</label>
                <input
                  type="text"
                  value={pollOptionsText}
                  onChange={(e) => setPollOptionsText(e.target.value)}
                  placeholder={`e.g. ${strikerStats.name}, ${nonStrikerStats.name}, ${currentBowlerStats.name}`}
                  required
                />
              </div>

              <div className="gc-modal-actions">
                <button type="button" className="gc-btn-secondary" onClick={() => setShowPollModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="gc-btn-primary">
                  Launch Live Prediction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default LiveStreamPage;
