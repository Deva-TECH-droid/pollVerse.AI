import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import socket from '../socket';
import '../styles/BigScreen.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export default function BigScreenPage() {
  const { id } = useParams();

  const [match, setMatch] = useState(null);
  const [inningsSummaries, setInningsSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewerCount, setViewerCount] = useState(0);

  // Big screen specific controls
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [celebration, setCelebration] = useState(null); // { type: 'six' | 'four' | 'wicket', text: string, sub: string }

  // Streaming WebRTC refs
  const [isStreaming, setIsStreaming] = useState(false);
  const [remoteStreamActive, setRemoteStreamActive] = useState(false);
  const videoRef = useRef(null);
  const viewerPcRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const iceCandidateQueueRef = useRef([]);

  // Sequence tracking to prevent out-of-order broadcasts
  const lastSeqRef = useRef(0);
  const celebrationTimeoutRef = useRef(null);

  // Synthesized Web Audio sound effects (no external mp3 files required)
  const playSound = useCallback((type) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'six') {
        // High ascending cheer fanfare
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.3);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      } else if (type === 'four') {
        // Upbeat boundary chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.15);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === 'wicket') {
        // Dramatic descent
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.4);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      }
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }, [soundEnabled]);

  const triggerCelebration = useCallback((type, text, sub) => {
    if (celebrationTimeoutRef.current) {
      clearTimeout(celebrationTimeoutRef.current);
    }
    setCelebration({ type, text, sub });
    playSound(type);
    celebrationTimeoutRef.current = setTimeout(() => {
      setCelebration(null);
    }, 3800);
  }, [playSound]);

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Fetch initial match info
  useEffect(() => {
    const fetchMatch = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/gully-cricket/matches/${id}`);
        if (!res.ok) throw new Error('Match not found');
        const data = await res.json();
        setMatch(data.match);
        setInningsSummaries(data.innings || []);
        setIsStreaming(Boolean(data.match?.isLiveStreaming));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMatch();
  }, [id]);

  // Real-time socket listeners for Score Updates & Stream status
  useEffect(() => {
    if (!id) return;

    const viewerId = `bigscreen_${Math.random().toString(36).substring(2, 9)}`;
    socket.emit('joinMatchViewer', { matchId: id, viewerId });

    // Handle incoming score broadcasts
    const onScoreUpdate = (data) => {
      if (String(data.matchId) !== String(id) && String(data.match?._id) !== String(id)) return;

      // Discard stale out-of-order broadcasts
      if (data.seq && data.seq < lastSeqRef.current) return;
      if (data.seq) lastSeqRef.current = data.seq;

      if (data.match) setMatch(data.match);
      if (data.innings) setInningsSummaries(data.innings);
      if (data.match?.isLiveStreaming !== undefined) {
        setIsStreaming(Boolean(data.match.isLiveStreaming));
      }

      // Check for celebration events
      if (data.latestBall) {
        const lb = data.latestBall;
        if (lb.isWicket) {
          triggerCelebration('wicket', 'WICKET!', `${lb.outBatsmanName || 'Batter'} is OUT! (${lb.wicketType || 'Wicket'})`);
        } else if (lb.runs === 6) {
          triggerCelebration('six', 'MAXIMUM SIX! 💥', 'Massive hit over the boundary ropes!');
        } else if (lb.runs === 4) {
          triggerCelebration('four', 'CRACKING FOUR! ⚡', 'Pure timing speeding to the fence!');
        }
      }
    };

    const onViewerCount = ({ matchId, count }) => {
      if (String(matchId) === String(id)) setViewerCount(count);
    };

    const onStreamUpdate = ({ matchId, isLiveStreaming }) => {
      if (String(matchId) === String(id)) {
        setIsStreaming(Boolean(isLiveStreaming));
        if (!isLiveStreaming) {
          setRemoteStreamActive(false);
        }
      }
    };

    const onStreamBroadcasterReady = ({ matchId }) => {
      if (String(matchId) === String(id)) {
        setIsStreaming(true);
        if (showVideo) {
          socket.emit('streamViewerJoin', { matchId: id });
        }
      }
    };

    const onStreamEnded = ({ matchId }) => {
      if (String(matchId) === String(id)) {
        setIsStreaming(false);
        setRemoteStreamActive(false);
      }
    };

    socket.on('matchScoreUpdate', onScoreUpdate);
    socket.on('viewerCountUpdate', onViewerCount);
    socket.on('matchStreamUpdate', onStreamUpdate);
    socket.on('streamBroadcasterReady', onStreamBroadcasterReady);
    socket.on('streamEnded', onStreamEnded);

    return () => {
      socket.emit('leaveMatchViewer');
      socket.off('matchScoreUpdate', onScoreUpdate);
      socket.off('viewerCountUpdate', onViewerCount);
      socket.off('matchStreamUpdate', onStreamUpdate);
      socket.off('streamBroadcasterReady', onStreamBroadcasterReady);
      socket.off('streamEnded', onStreamEnded);
      if (celebrationTimeoutRef.current) clearTimeout(celebrationTimeoutRef.current);
    };
  }, [id, showVideo, triggerCelebration]);

  // WebRTC Video Receiver for optional split view
  useEffect(() => {
    if (!showVideo || !id) return;

    const setupViewerPeerConnection = () => {
      if (viewerPcRef.current) {
        try { viewerPcRef.current.close(); } catch (e) {}
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      viewerPcRef.current = pc;
      remoteStreamRef.current = new MediaStream();

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          remoteStreamRef.current = event.streams[0];
        } else {
          remoteStreamRef.current.addTrack(event.track);
        }
        if (videoRef.current) {
          videoRef.current.srcObject = remoteStreamRef.current;
          videoRef.current.play().catch(() => {});
        }
        setRemoteStreamActive(true);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('streamIceCandidate', {
            targetSocketId: pc.broadcasterSocketId,
            candidate: event.candidate,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          setRemoteStreamActive(false);
        }
      };

      return pc;
    };

    const onStreamOffer = async ({ matchId, broadcasterSocketId, offer }) => {
      if (String(matchId) !== String(id)) return;
      try {
        const pc = setupViewerPeerConnection();
        pc.broadcasterSocketId = broadcasterSocketId;
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Flush queued candidates
        while (iceCandidateQueueRef.current.length > 0) {
          const c = iceCandidateQueueRef.current.shift();
          await pc.addIceCandidate(new RTCIceCandidate(c));
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('streamAnswer', {
          matchId: id,
          targetSocketId: broadcasterSocketId,
          answer,
        });
      } catch (err) {
        console.error('BigScreen WebRTC offer error:', err);
      }
    };

    const onStreamIceCandidate = async ({ candidate }) => {
      if (!candidate || !viewerPcRef.current) return;
      try {
        if (viewerPcRef.current.remoteDescription) {
          await viewerPcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          iceCandidateQueueRef.current.push(candidate);
        }
      } catch (err) {
        console.error('BigScreen ICE candidate error:', err);
      }
    };

    socket.on('streamOffer', onStreamOffer);
    socket.on('streamIceCandidate', onStreamIceCandidate);

    // Announce presence to broadcaster
    socket.emit('streamViewerJoin', { matchId: id });

    return () => {
      socket.off('streamOffer', onStreamOffer);
      socket.off('streamIceCandidate', onStreamIceCandidate);
      if (viewerPcRef.current) {
        try { viewerPcRef.current.close(); } catch (e) {}
        viewerPcRef.current = null;
      }
      setRemoteStreamActive(false);
    };
  }, [showVideo, id]);

  if (loading) {
    return (
      <div className="bigscreen-wrapper">
        <div className="bigscreen-container" style={{ textAlign: 'center', paddingTop: '15vh' }}>
          <div className="bs-pulse-dot" style={{ width: 24, height: 24, margin: '0 auto 1.5rem' }}></div>
          <h2 style={{ fontFamily: 'Chakra Petch', fontSize: '2rem', color: '#fbbf24' }}>
            CONNECTING TO STADIUM ARENA...
          </h2>
          <p style={{ color: '#94a3b8' }}>Establishing live real-time score feeds</p>
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="bigscreen-wrapper">
        <div className="bigscreen-container" style={{ textAlign: 'center', paddingTop: '15vh' }}>
          <h2 style={{ color: '#f87171', fontSize: '2rem' }}>⚠️ Match Unavailable</h2>
          <p style={{ color: '#94a3b8' }}>{error || 'The requested match could not be loaded.'}</p>
          <Link to="/gully-cricket" className="bs-btn-icon" style={{ display: 'inline-flex', marginTop: '1rem' }}>
            ← Back to Gully Cricket
          </Link>
        </div>
      </div>
    );
  }

  // ── Compute Active Innings & Live Stats ─────────────────────────────────
  const latestInningsSummary = inningsSummaries.length > 0 ? inningsSummaries[inningsSummaries.length - 1] : null;
  const battingTeamKey = latestInningsSummary?.battingTeam || match.battingTeam || 'teamA';
  const bowlingTeamKey = latestInningsSummary?.bowlingTeam || (battingTeamKey === 'teamA' ? 'teamB' : 'teamA');
  const battingTeamObj = match[battingTeamKey] || match.teamA;
  const bowlingTeamObj = match[bowlingTeamKey] || match.teamB;

  const currentBattingName = latestInningsSummary ? (match[battingTeamKey]?.name || battingTeamObj.name) : battingTeamObj.name;
  const totalRuns = latestInningsSummary ? latestInningsSummary.totalRuns : 0;
  const totalWickets = latestInningsSummary ? latestInningsSummary.totalWickets : 0;
  const oversDisplay = latestInningsSummary ? latestInningsSummary.oversDisplay : '0.0';
  const totalOvers = match.overs || 10;
  const target = match.firstInningsScore ? match.firstInningsScore + 1 : (latestInningsSummary?.target || null);

  // Run rates
  const [ovCompletedStr, ballsRemStr] = String(oversDisplay).split('.');
  const oversDecimal = Number(ovCompletedStr || 0) + Number(ballsRemStr || 0) / 6;
  const crr = oversDecimal > 0 ? (totalRuns / oversDecimal).toFixed(2) : '0.00';
  const remainingOvers = Math.max(0, totalOvers - oversDecimal);
  const remainingRuns = target !== null ? Math.max(0, target - totalRuns) : 0;
  const rrr = target !== null && remainingOvers > 0 ? (remainingRuns / remainingOvers).toFixed(2) : '—';
  const ballsRemaining = Math.max(0, Math.round(remainingOvers * 6));

  // Current Batters & Bowler
  const curState = latestInningsSummary?.current;
  const strikerName = curState?.striker;
  const nonStrikerName = curState?.nonStriker;
  const bowlerName = curState?.bowler;

  const battingCard = latestInningsSummary?.battingCard || [];
  const bowlingCard = latestInningsSummary?.bowlingCard || [];

  const strikerStats = battingCard.find((b) => b.name === strikerName) || {
    name: strikerName || battingTeamObj.players[0] || 'Batter 1',
    runs: 0,
    ballsFaced: 0,
    fours: 0,
    sixes: 0,
    strikeRate: 0,
  };

  const nonStrikerStats = battingCard.find((b) => b.name === nonStrikerName) || {
    name: nonStrikerName || battingTeamObj.players[1] || 'Batter 2',
    runs: 0,
    ballsFaced: 0,
    fours: 0,
    sixes: 0,
    strikeRate: 0,
  };

  const bowlerStats = bowlingCard.find((b) => b.name === bowlerName) || {
    name: bowlerName || bowlingTeamObj.players[0] || 'Bowler',
    overs: '0.0',
    maidens: 0,
    runsConceded: 0,
    wickets: 0,
    economy: 0,
  };

  const recentBalls = latestInningsSummary?.recentBalls || [];
  const partnership = latestInningsSummary?.currentPartnership;
  const commentary = latestInningsSummary?.latestCommentary;
  const isMatchComplete = match.status === 'completed';

  return (
    <div className="bigscreen-wrapper">
      <div className="bigscreen-container">
        {/* Top Header Bar */}
        <header className="bs-header-bar">
          <div className="bs-match-identity">
            <span className="bs-logo-tag">⚡ STADIUM ARENA</span>
            <h1 className="bs-match-title">
              {match.teamA.name} <span className="bs-vs">VS</span> {match.teamB.name}
            </h1>
          </div>

          <div className="bs-header-center">
            <div className="bs-badge-live">
              <span className="bs-pulse-dot"></span>
              {isMatchComplete ? 'COMPLETED' : 'LIVE'}
            </div>
            <div className="bs-badge-viewers">
              👥 {viewerCount.toLocaleString()} Spectating
            </div>
          </div>

          <div className="bs-header-controls">
            {/* Live Stream View Toggle */}
            <button
              className={`bs-btn-icon ${showVideo ? 'bs-btn-video-toggle' : ''}`}
              onClick={() => setShowVideo(!showVideo)}
              title="Toggle Live Video Stream"
            >
              🎥 {showVideo ? 'Hide Camera' : 'Live Camera'}
            </button>

            {/* Sound Effects Toggle */}
            <button
              className="bs-btn-icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute Stadium Audio' : 'Enable Stadium Audio (Celebrations)'}
            >
              {soundEnabled ? '🔊 Sound ON' : '🔇 Sound OFF'}
            </button>

            {/* Fullscreen Button */}
            <button
              className="bs-btn-icon"
              onClick={toggleFullscreen}
              title="Toggle Stadium Fullscreen (F11)"
            >
              {isFullscreen ? '↙ Standard' : '⛶ Fullscreen'}
            </button>

            {/* Back Link */}
            <Link to={`/gully-cricket/match/${id}`} className="bs-btn-icon">
              ✕ Exit
            </Link>
          </div>
        </header>

        {/* Celebration Overlay Banner */}
        {celebration && (
          <div className={`bs-celebration-banner bs-celebration-${celebration.type}`}>
            <h2 className="bs-celebration-title">{celebration.text}</h2>
            <p className="bs-celebration-sub">{celebration.sub}</p>
          </div>
        )}

        {/* Match Completed Banner */}
        {isMatchComplete && (
          <div className="bs-match-completed-box">
            <div className="bs-completed-trophy">🏆</div>
            <h2 className="bs-completed-result">{match.result || 'Match Concluded'}</h2>
            <Link to={`/gully-cricket/match/${id}/summary`} className="bs-btn-icon" style={{ display: 'inline-flex' }}>
              📊 View Detailed Match Scorecard & Awards
            </Link>
          </div>
        )}

        {/* Main Grid: Scoreboard + Optional Live Video Stream */}
        <div className={showVideo ? 'bs-arena-with-video' : 'bs-arena-grid'}>
          {/* Main Stadium Scoreboard Card */}
          <div className="bs-scoreboard-card">
            {/* Score & Batting Team Header */}
            <div className="bs-score-main-row">
              <div className="bs-batting-identity">
                <div className="bs-team-circle-badge">
                  {currentBattingName.slice(0, 2).toUpperCase()}
                </div>
                <div className="bs-team-name-group">
                  <span className="bs-team-current-label">
                    {inningsSummaries.length === 2 ? '2nd Innings · Batting' : '1st Innings · Batting'}
                  </span>
                  <h2 className="bs-team-current-name">{currentBattingName}</h2>
                  <span className="bs-innings-indicator">
                    {match.overs} Overs Match · Toss: {match[match.tossWonBy]?.name} elected to {match.tossDecision}
                  </span>
                </div>
              </div>

              {/* Huge LED Score Digits */}
              <div className="bs-score-digits-box">
                <div className="bs-score-runs-wickets">
                  {totalRuns}<span className="bs-score-divider">/</span>{totalWickets}
                </div>
                <div className="bs-overs-box">
                  <span className="bs-overs-label">Overs</span>
                  <span className="bs-overs-value">
                    {oversDisplay} <span className="bs-overs-max">/ {totalOvers}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Target & Run-Rate Equation */}
            <div className="bs-equation-bar">
              <div className="bs-equation-target">
                {target !== null ? (
                  <>
                    <span>Target: <strong>{target}</strong></span>
                    <span>·</span>
                    <span>Need <strong>{remainingRuns}</strong> runs in <strong>{ballsRemaining}</strong> balls</span>
                  </>
                ) : (
                  <span>First Innings in progress · Setting target for {bowlingTeamObj.name}</span>
                )}
              </div>

              <div className="bs-equation-rates">
                <div className="bs-rate-item">
                  CRR: <strong>{crr}</strong>
                </div>
                {target !== null && (
                  <div className="bs-rate-item bs-rate-rrr">
                    RRR: <strong>{rrr}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Balls Over Ticker */}
            <div className="bs-recent-balls-section">
              <span className="bs-balls-label">Recent Balls:</span>
              <div className="bs-balls-tape">
                {recentBalls.length > 0 ? (
                  recentBalls.map((b, i) => {
                    let ballClass = '';
                    if (b.isWicket) ballClass = 'bs-ball-wicket';
                    else if (b.display === '6') ballClass = 'bs-ball-six';
                    else if (b.display === '4') ballClass = 'bs-ball-four';
                    else if (b.display?.includes('Wd') || b.display?.includes('Nb')) ballClass = 'bs-ball-extra';

                    return (
                      <span key={i} className={`bs-ball-pill ${ballClass}`}>
                        {b.display}
                      </span>
                    );
                  })
                ) : (
                  <span style={{ color: '#64748b', fontSize: '0.9rem' }}>No balls bowled yet in this over</span>
                )}
              </div>
            </div>

            {/* Active Batters & Current Bowler Podium */}
            <div className="bs-players-podium">
              {/* Striker Card */}
              <div className="bs-player-card bs-player-card-striker">
                <div className="bs-player-top">
                  <h3 className="bs-player-name">
                    <span className="bs-strike-star">⭐</span> {strikerStats.name}
                  </h3>
                  <span className="bs-player-role-badge bs-player-role-striker">ON STRIKE</span>
                </div>
                <div className="bs-player-metrics-grid">
                  <div className="bs-metric-box">
                    <span className="bs-metric-label">Runs</span>
                    <span className="bs-metric-number bs-metric-highlight">{strikerStats.runs}</span>
                  </div>
                  <div className="bs-metric-box">
                    <span className="bs-metric-label">Balls</span>
                    <span className="bs-metric-number">{strikerStats.ballsFaced}</span>
                  </div>
                  <div className="bs-metric-box">
                    <span className="bs-metric-label">4s / 6s</span>
                    <span className="bs-metric-number">{strikerStats.fours} / {strikerStats.sixes}</span>
                  </div>
                  <div className="bs-metric-box">
                    <span className="bs-metric-label">S/R</span>
                    <span className="bs-metric-number">{strikerStats.strikeRate || (strikerStats.ballsFaced > 0 ? ((strikerStats.runs / strikerStats.ballsFaced) * 100).toFixed(1) : '0.0')}</span>
                  </div>
                </div>
              </div>

              {/* Non-Striker Card */}
              <div className="bs-player-card">
                <div className="bs-player-top">
                  <h3 className="bs-player-name">{nonStrikerStats.name}</h3>
                  <span className="bs-player-role-badge">NON-STRIKER</span>
                </div>
                <div className="bs-player-metrics-grid">
                  <div className="bs-metric-box">
                    <span className="bs-metric-label">Runs</span>
                    <span className="bs-metric-number">{nonStrikerStats.runs}</span>
                  </div>
                  <div className="bs-metric-box">
                    <span className="bs-metric-label">Balls</span>
                    <span className="bs-metric-number">{nonStrikerStats.ballsFaced}</span>
                  </div>
                  <div className="bs-metric-box">
                    <span className="bs-metric-label">4s / 6s</span>
                    <span className="bs-metric-number">{nonStrikerStats.fours} / {nonStrikerStats.sixes}</span>
                  </div>
                  <div className="bs-metric-box">
                    <span className="bs-metric-label">S/R</span>
                    <span className="bs-metric-number">{nonStrikerStats.strikeRate || (nonStrikerStats.ballsFaced > 0 ? ((nonStrikerStats.runs / nonStrikerStats.ballsFaced) * 100).toFixed(1) : '0.0')}</span>
                  </div>
                </div>
              </div>

              {/* Bowler Card */}
              <div className="bs-player-card bs-player-card-bowler">
                <div className="bs-player-top">
                  <h3 className="bs-player-name">🎯 {bowlerStats.name}</h3>
                  <span className="bs-player-role-badge bs-player-role-bowler">BOWLING</span>
                </div>
                <div className="bs-player-metrics-grid">
                  <div className="bs-metric-box">
                    <span className="bs-metric-label">Overs</span>
                    <span className="bs-metric-number bs-metric-cyan">{bowlerStats.overs}</span>
                  </div>
                  <div className="bs-metric-box">
                    <span className="bs-metric-label">Maidens</span>
                    <span className="bs-metric-number">{bowlerStats.maidens || 0}</span>
                  </div>
                  <div className="bs-metric-box">
                    <span className="bs-metric-label">Runs</span>
                    <span className="bs-metric-number">{bowlerStats.runsConceded}</span>
                  </div>
                  <div className="bs-metric-box">
                    <span className="bs-metric-label">Wickets</span>
                    <span className="bs-metric-number bs-metric-highlight">{bowlerStats.wickets}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Optional Live Video Stream Viewport */}
          {showVideo && (
            <div className="bs-video-panel">
              <div className="bs-video-header">
                <h3 className="bs-video-title">
                  <span className="bs-pulse-dot"></span> 🎥 Live Camera Stream
                </h3>
                <span style={{ fontSize: '0.8rem', color: isStreaming ? '#34d399' : '#94a3b8' }}>
                  {isStreaming ? (remoteStreamActive ? 'Connected (WebRTC)' : 'Receiving signal...') : 'Broadcaster Offline'}
                </span>
              </div>
              <div className="bs-video-viewport">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="bs-video-element"
                  style={{ display: remoteStreamActive ? 'block' : 'none' }}
                />
                {!remoteStreamActive && (
                  <div className="bs-video-placeholder">
                    <span className="bs-video-placeholder-icon">📹</span>
                    <p style={{ margin: 0, fontWeight: 700, color: '#e2e8f0' }}>
                      {isStreaming ? 'Connecting to live camera feed...' : 'Broadcaster has not started streaming yet'}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>
                      When the match creator turns on their camera, video appears right here in real time.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Partnership & Live Commentary Footer Bar */}
        <div className="bs-match-footer-bar">
          <div className="bs-info-box">
            <span className="bs-info-icon">🤝</span>
            <div className="bs-info-content">
              <span className="bs-info-title">Current Partnership</span>
              <span className="bs-info-text">
                {partnership ? (
                  <>
                    <strong>{partnership.runs}</strong> runs off <strong>{partnership.balls}</strong> balls ({partnership.batsmen.join(' & ')})
                  </>
                ) : (
                  `${strikerStats.name} & ${nonStrikerStats.name}`
                )}
              </span>
            </div>
          </div>

          <div className="bs-info-box">
            <span className="bs-info-icon">🎙️</span>
            <div className="bs-info-content">
              <span className="bs-info-title">Latest Commentary</span>
              <span className="bs-info-text">
                {commentary || `Match underway at ${match.overs} overs per side`}
              </span>
            </div>
          </div>
        </div>

        {/* Playing XI Squads Section */}
        <section className="bs-squads-section">
          <div className="bs-squads-header">
            <h3 className="bs-squads-title">📋 Playing XI Lineups</h3>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              ⭐ Striker &nbsp;·&nbsp; 🎯 Current Bowler &nbsp;·&nbsp; <s>Out</s>
            </span>
          </div>

          <div className="bs-squads-grid">
            {/* Team A Squad */}
            <div className="bs-team-squad-column">
              <div className="bs-team-squad-name">
                <span>🏏 {match.teamA.name}</span>
                {battingTeamKey === 'teamA' && <span className="bs-logo-tag" style={{ fontSize: '0.7rem' }}>BATTING</span>}
              </div>
              <div className="bs-squad-chips-wrap">
                {match.teamA.players.map((p, i) => {
                  const isStriker = p === strikerName && battingTeamKey === 'teamA';
                  const isBowler = p === bowlerName && bowlingTeamKey === 'teamA';
                  const playerCard = battingCard.find((b) => b.name === p);
                  const isOut = playerCard?.isOut;

                  let chipClass = '';
                  if (isStriker) chipClass = 'is-active-striker';
                  else if (isBowler) chipClass = 'is-active-bowler';
                  else if (isOut) chipClass = 'is-out';

                  return (
                    <span key={i} className={`bs-player-squad-chip ${chipClass}`}>
                      {isStriker && '⭐ '}
                      {isBowler && '🎯 '}
                      {p}
                      {playerCard && (
                        <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                          ({playerCard.runs})
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Team B Squad */}
            <div className="bs-team-squad-column">
              <div className="bs-team-squad-name">
                <span>🏏 {match.teamB.name}</span>
                {battingTeamKey === 'teamB' && <span className="bs-logo-tag" style={{ fontSize: '0.7rem' }}>BATTING</span>}
              </div>
              <div className="bs-squad-chips-wrap">
                {match.teamB.players.map((p, i) => {
                  const isStriker = p === strikerName && battingTeamKey === 'teamB';
                  const isBowler = p === bowlerName && bowlingTeamKey === 'teamB';
                  const playerCard = battingCard.find((b) => b.name === p);
                  const isOut = playerCard?.isOut;

                  let chipClass = '';
                  if (isStriker) chipClass = 'is-active-striker';
                  else if (isBowler) chipClass = 'is-active-bowler';
                  else if (isOut) chipClass = 'is-out';

                  return (
                    <span key={i} className={`bs-player-squad-chip ${chipClass}`}>
                      {isStriker && '⭐ '}
                      {isBowler && '🎯 '}
                      {p}
                      {playerCard && (
                        <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                          ({playerCard.runs})
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
