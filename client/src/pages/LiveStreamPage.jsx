import React, { useEffect, useState, useRef, useCallback, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '@clerk/clerk-react';
import { AuthContext } from '../context/AuthContext';
import { createBroadcaster, createWatcher } from '../utils/liveStreamRtc';
import '../styles/GullyCricket.css';

const API_URL = process.env.REACT_APP_API_URL || '';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

function LiveStreamPage() {
  const { id } = useParams();
  const { getToken } = useAuth();
  const { user } = useContext(AuthContext);
  const [match, setMatch] = useState(null);
  const [inningsSummaries, setInningsSummaries] = useState([]);
  const [watchingLive, setWatchingLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [spectatorCount, setSpectatorCount] = useState(1);
  const [isStreaming, setIsStreaming] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
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

  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const broadcasterRef = useRef(null);
  const watcherRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const chatBottomRef = useRef(null);
  const socketRef = useRef(null);
  const videoViewportRef = useRef(null);
  const [isLargeScreen, setIsLargeScreen] = useState(false);

  const isCreator = Boolean(
    user && match?.createdBy?.email && user.email &&
    match.createdBy.email.toLowerCase() === user.email.toLowerCase()
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

  useEffect(() => {
    fetchMatchDetails();

    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.emit('joinMatchViewer', { matchId: id });

    socket.on('viewerCountUpdate', ({ matchId, count }) => {
      if (String(matchId) === String(id)) {
        setSpectatorCount(count || 1);
      }
    });

    socket.on('matchStreamUpdate', ({ matchId, isLiveStreaming }) => {
      if (String(matchId) === String(id)) {
        setIsStreaming(isLiveStreaming);
      }
    });

    // Real-time score sync — pushed by the server on every scored ball.
    socket.on('matchScoreUpdate', ({ matchId, match: updatedMatch, innings }) => {
      if (String(matchId) === String(id)) {
        setMatch(updatedMatch);
        setInningsSummaries(innings || []);
      }
    });

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
      if (broadcasterRef.current) {
        broadcasterRef.current.close();
        broadcasterRef.current = null;
      }
      if (watcherRef.current) {
        watcherRef.current.close();
        watcherRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, fetchMatchDetails]);

  // Viewers connect to the creator's WebRTC broadcast whenever the stream is
  // live; the creator never watches their own broadcast.
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !match || isCreator) return;

    if (!isStreaming) {
      setWatchingLive(false);
      remoteStreamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      return;
    }

    const watcher = createWatcher(socket, id, (stream) => {
      remoteStreamRef.current = stream;
      setWatchingLive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    });
    watcherRef.current = watcher;

    const handleBroadcasterAvailable = ({ matchId }) => {
      if (String(matchId) === String(id)) watcher.request();
    };
    const handleBroadcasterGone = ({ matchId }) => {
      if (String(matchId) === String(id)) {
        setWatchingLive(false);
        remoteStreamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
      }
    };
    socket.on('broadcasterAvailable', handleBroadcasterAvailable);
    socket.on('broadcasterDisconnected', handleBroadcasterGone);

    return () => {
      socket.off('broadcasterAvailable', handleBroadcasterAvailable);
      socket.off('broadcasterDisconnected', handleBroadcasterGone);
      watcher.close();
      if (watcherRef.current === watcher) watcherRef.current = null;
      setWatchingLive(false);
    };
  }, [id, match, isCreator, isStreaming]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const [facingMode, setFacingMode] = useState('environment'); // Default to Back Camera for Mobile Match Streaming!

  // Attach camera stream whenever cameraActive turns true and <video> mounts
  useEffect(() => {
    if (cameraActive && mediaStreamRef.current && videoRef.current) {
      videoRef.current.srcObject = mediaStreamRef.current;
      videoRef.current.play().catch((err) => {
        console.warn('Video auto-play error:', err.message);
      });
    }
  }, [cameraActive]);

  // Attach the remote broadcast stream once the <video> element mounts for a
  // watching viewer (the stream can arrive before the element renders).
  useEffect(() => {
    if (watchingLive && remoteStreamRef.current && videoRef.current) {
      videoRef.current.srcObject = remoteStreamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [watchingLive]);

  // Start Camera Capture for Creator (Mobile Back Camera or Laptop Webcam)
  const startCamera = async (desiredFacingMode = facingMode) => {
    stopCamera();
    try {
      let stream;
      // Try requested facingMode ('environment' for Mobile Back Camera, 'user' for Front)
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: desiredFacingMode },
          audio: false,
        });
      } catch (e1) {
        // Fallback try opposite mode or default video
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: desiredFacingMode === 'environment' ? 'user' : 'environment' },
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
      await startBroadcasting();
    } catch (err) {
      alert('Camera access error: ' + err.message + '\n\nPlease ensure camera permissions are allowed in your browser URL bar.');
    }
  };

  // Register this browser as the match's WebRTC broadcaster (creator only).
  const startBroadcasting = async () => {
    try {
      if (!broadcasterRef.current) {
        broadcasterRef.current = createBroadcaster(socketRef.current, () => mediaStreamRef.current);
      } else if (mediaStreamRef.current) {
        broadcasterRef.current.replaceStream(mediaStreamRef.current);
      }
      const token = await getToken();
      socketRef.current.emit('broadcasterReady', { matchId: id, token });
    } catch (err) {
      console.error('Failed to start broadcasting:', err);
    }
  };

  const stopBroadcasting = () => {
    if (broadcasterRef.current) {
      broadcasterRef.current.close();
      broadcasterRef.current = null;
    }
    if (socketRef.current) socketRef.current.emit('broadcasterStopped', { matchId: id });
  };

  const switchCameraMode = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    await startCamera(nextMode);
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
  };

  // Toggle Stream status on backend (creator only)
  const toggleStream = async (status) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/gully-cricket/matches/${id}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isLiveStreaming: status }),
      });
      if (res.ok) {
        setIsStreaming(status);
        if (!status) {
          stopCamera();
          stopBroadcasting();
        }
      }
    } catch (err) {
      console.error('Failed to toggle stream:', err);
    }
  };

  // Send Chat Message
  const handleSendChat = async (e, reactionEmoji = '') => {
    if (e) e.preventDefault();
    if (!chatInput.trim() && !reactionEmoji) return;

    const senderName = userNameInput.trim() || 'Cricket Fan';

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
      const token = await getToken();
      await fetch(`${API_URL}/api/gully-cricket/matches/${id}/micro-poll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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

  if (loading) {
    return (
      <div className="gc-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading live match stream & spectator hub...</p>
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

  // Live innings summaries come from the server's score engine (initial fetch
  // + real-time matchScoreUpdate pushes), so every viewer sees exactly what
  // the creator scored.
  const latestInnings = inningsSummaries.length > 0 ? inningsSummaries[inningsSummaries.length - 1] : null;

  const battingTeamKey = latestInnings?.battingTeam || match.battingTeam || 'teamA';
  const bowlingTeamKey = latestInnings?.bowlingTeam || match.bowlingTeam || (battingTeamKey === 'teamA' ? 'teamB' : 'teamA');
  const battingTeamObj = match[battingTeamKey] || match.teamA;
  const bowlingTeamObj = match[bowlingTeamKey] || match.teamB;

  const currentBattingName = battingTeamObj.name;
  const runs = latestInnings ? latestInnings.totalRuns : 0;
  const wickets = latestInnings ? latestInnings.totalWickets : 0;
  const oversDisplay = latestInnings ? latestInnings.oversDisplay : '0.0';
  const target = latestInnings?.target || (match.firstInningsScore ? match.firstInningsScore + 1 : null);

  const legalBalls = latestInnings?.legalBallCount || 0;
  const crr = latestInnings?.requiredRunRate?.currentRunRate
    ?? (legalBalls > 0 ? (runs / (legalBalls / 6)).toFixed(2) : '0.00');
  const rrr = latestInnings?.requiredRunRate?.requiredRunRate ?? '—';

  // Extract Batter & Bowler info strictly from match's actual players
  const battingPlayers = battingTeamObj.players || [];
  const bowlingPlayers = bowlingTeamObj.players || [];

  const findBatter = (name) => latestInnings?.battingCard?.find((b) => b.name === name);
  const strikerName = latestInnings?.current?.striker;
  const nonStrikerName = latestInnings?.current?.nonStriker;
  const batters = strikerName
    ? [
        { name: strikerName, runs: 0, ballsFaced: 0, ...(findBatter(strikerName) || {}) },
        ...(nonStrikerName ? [{ name: nonStrikerName, runs: 0, ballsFaced: 0, ...(findBatter(nonStrikerName) || {}) }] : []),
      ]
    : [
        { name: battingPlayers[0] || `${battingTeamObj.name} Batter 1`, runs: 0, ballsFaced: 0 },
        { name: battingPlayers[1] || `${battingTeamObj.name} Batter 2`, runs: 0, ballsFaced: 0 },
      ];

  const bowlerName = latestInnings?.current?.bowler;
  const bowlerFromCard = (bowlerName && latestInnings?.bowlingCard?.find((b) => b.name === bowlerName))
    || latestInnings?.bowlingCard?.slice(-1)[0];
  const bowler = bowlerFromCard || {
    name: bowlingPlayers[0] || `${bowlingTeamObj.name} Bowler 1`,
    wickets: 0,
    runsConceded: 0,
    oversBowled: 0,
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
          {(cameraActive || watchingLive) ? (
            <video ref={videoRef} autoPlay playsInline muted className="gc-camera-feed" />
          ) : (
            <div className="gc-simulated-video">
              <div className="gc-video-placeholder-content">
                <span className="gc-cricket-cam-icon">🎥</span>
                <h3>{isStreaming ? 'CONNECTING TO LIVE BROADCAST…' : 'STREAM OFFLINE'}</h3>
                <p>{match.teamA.name} vs {match.teamB.name} · {match.overs} Overs Match</p>
                {!isStreaming && isCreator && (
                  <button className="gc-start-cam-btn" onClick={() => startCamera(facingMode)}>
                    🎥 Start Camera Stream
                  </button>
                )}
                {!isStreaming && !isCreator && (
                  <p className="gc-stream-waiting-note">The live stream will start when the match creator goes live. Scores update in real time below.</p>
                )}
              </div>
            </div>
          )}

          {/* Overlaid Live Score HUD */}
          <div className="gc-video-hud-overlay">
            <div className="gc-hud-top-bar">
              <span className="gc-hud-live-tag">🔴 LIVE</span>
              <div className="gc-hud-right-actions">
                <span className="gc-hud-viewers">👥 {spectatorCount} watching</span>
                <button className="gc-hud-fullscreen-btn" onClick={toggleLargeScreen}>
                  {isLargeScreen ? '🗗 Normal' : '⛶ Large Screen'}
                </button>
              </div>
            </div>

            <div className="gc-hud-score-center">
              <div className="gc-hud-main-runs">
                <span className="gc-hud-team">{currentBattingName}</span>
                <strong className="gc-hud-score">{runs}/{wickets}</strong>
                <span className="gc-hud-overs">{oversDisplay} Overs</span>
              </div>
              <div className="gc-hud-rates">
                <span>CRR: <strong>{crr}</strong></span>
                <span>Target: <strong>{target}</strong></span>
                <span>RRR: <strong>{rrr}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Creator Control Strip (only the match creator can broadcast) */}
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
          </div>
        )}
      </div>

      {/* Current Batters & Bowler Section */}
      <div className="gc-current-play-card">
        <div className="gc-play-column">
          <h4 className="gc-play-heading">🏏 CURRENT BATTERS</h4>
          <div className="gc-batters-list">
            {batters.map((b, i) => (
              <div key={i} className="gc-batter-row">
                <span className="gc-batter-name">{b.name} {i === 0 ? '*' : ''}</span>
                <strong className="gc-batter-stats">{b.runs} <small>({b.ballsFaced || b.balls || 0})</small></strong>
              </div>
            ))}
          </div>
        </div>

        <div className="gc-play-divider"></div>

        <div className="gc-play-column">
          <h4 className="gc-play-heading">⚾ CURRENT BOWLER</h4>
          <div className="gc-bowler-row">
            <span className="gc-bowler-name">{bowler.name}</span>
            <strong className="gc-bowler-stats">{bowler.wickets}/{bowler.runsConceded || bowler.runs || 0} <small>({bowler.oversBowled || bowler.overs || 0} ov)</small></strong>
          </div>
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
            <span className="gc-chat-score-pill">🏏 {currentBattingName} {runs}/{wickets} ({oversDisplay})</span>
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
            <input
              type="text"
              placeholder="Your name..."
              value={userNameInput}
              onChange={(e) => setUserNameInput(e.target.value)}
              className="gc-chat-name-input"
            />
            <input
              type="text"
              placeholder="Type a message..."
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
                  placeholder={`e.g. ${batters[0]?.name || 'Player 1'}, ${batters[1]?.name || 'Player 2'}, ${bowler?.name || 'Player 3'}`}
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
