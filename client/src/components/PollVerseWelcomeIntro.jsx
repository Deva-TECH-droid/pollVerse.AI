import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { sounds } from '../utils/soundEffects';
import '../styles/PollVerseWelcomeIntro.css';

const WORD_1 = 'POLLVERSE'.split('');
const WORD_2 = '.AI'.split('');

const POLL_OPTIONS = [
  { label: 'Team India 🏏', color: '#38bdf8', pct: 0, target: 68 },
  { label: 'Australia 🦘', color: '#fb923c', pct: 0, target: 22 },
  { label: 'England 🏴', color: '#a78bfa', pct: 0, target: 10 },
];

const LIVE_VOTES = ['🇮🇳 Rahul voted', '🇬🇧 Priya voted', '🇺🇸 Alex voted', '🇦🇺 Sam voted', '🇧🇷 Leo voted'];

function PollVerseWelcomeIntro({ onComplete, isEmbedded = false }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const lightRef = useRef(null);
  const [muted, setMuted] = useState(false);
  const [pollOptions, setPollOptions] = useState(POLL_OPTIONS);
  const [liveVote, setLiveVote] = useState(null);
  const [voteCount, setVoteCount] = useState(0);

  const toggleSound = () => {
    const isMuted = sounds.toggleMute();
    setMuted(isMuted);
  };

  // Mouse tilt parallax
  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    gsap.to('.pv-main-content', { rotateY: x * 10, rotateX: -y * 10, duration: 0.8, ease: 'power2.out' });
    gsap.to('.pv-glow-orb-1', { x: x * 50, y: y * 50, duration: 1 });
    gsap.to('.pv-glow-orb-2', { x: -x * 60, y: -y * 60, duration: 1 });
  };

  useEffect(() => {
    // ------- Canvas: Particle Network -------
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const pts = Array.from({ length: Math.min(90, Math.floor(window.innerWidth / 13)) }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 1.1,
      vy: (Math.random() - 0.5) * 1.1,
      size: Math.random() * 2.5 + 1,
      hue: Math.random() > 0.5 ? 200 : 260,
      alpha: Math.random() * 0.6 + 0.3,
    }));

    const drawCanvas = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(99,102,241,${0.18 * (1 - dist / 130)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
        pts[i].x += pts[i].vx; pts[i].y += pts[i].vy;
        if (pts[i].x < 0 || pts[i].x > canvas.width) pts[i].vx *= -1;
        if (pts[i].y < 0 || pts[i].y > canvas.height) pts[i].vy *= -1;
        ctx.beginPath();
        ctx.arc(pts[i].x, pts[i].y, pts[i].size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${pts[i].hue},80%,70%,${pts[i].alpha})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = `hsla(${pts[i].hue},80%,70%,0.6)`;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      animId = requestAnimationFrame(drawCanvas);
    };
    drawCanvas();

    // ------- GSAP Cinematic Timeline -------
    const ctxGsap = gsap.context(() => {
      const tl = gsap.timeline();
      const lightEl = lightRef.current;

      // === ACT 1: Suspense Dark Room — "Something is being initialized" ===
      tl.to('.pv-suspense-text', { opacity: 1, duration: 0.6, ease: 'power2.out' })
        // Data stream lines load in
        .fromTo('.pv-data-stream-line', { scaleX: 0, opacity: 0 }, {
          scaleX: 1, opacity: 1, stagger: 0.08, duration: 0.4, ease: 'power2.out',
        })
        // 4x spotlight blink escalating intensity
        .to(lightEl, { opacity: 0.7, scale: 1.3, duration: 0.12, onStart: () => sounds.playLightBlink(0.7) })
        .to(lightEl, { opacity: 0, scale: 0.2, duration: 0.2 })
        .to(lightEl, { opacity: 1, scale: 1.8, duration: 0.14, onStart: () => sounds.playLightBlink(1.0) })
        .to(lightEl, { opacity: 0.1, scale: 0.3, duration: 0.18 })
        .to(lightEl, { opacity: 1, scale: 2.5, duration: 0.16, onStart: () => sounds.playLightBlink(1.3) })
        .to(lightEl, { opacity: 0, scale: 0.2, duration: 0.22 })
        .to(lightEl, {
          opacity: 1, scale: 10, duration: 0.5, ease: 'power3.in',
          onStart: () => sounds.playLightBlink(1.9),
        })

        // === ACT 2: ILLUMINATION BOOM — Everything floods into view ===
        .to('.pv-suspense-container', { opacity: 0, duration: 0.2 })
        .to('.pv-grid-bg', { opacity: 0.85, duration: 1.2, ease: 'power2.out' }, '-=0.15')
        .to('.pv-hex-bg', { opacity: 0.6, duration: 1.5 }, '-=1.0')
        .to('.pv-glow-orb', { opacity: 0.85, scale: 1, stagger: 0.15, duration: 1.0 }, '-=0.9')
        .call(() => sounds.playIlluminationBoom())
        // Floating platform category chips appear
        .fromTo('.pv-category-chip', { y: 30, opacity: 0, scale: 0.8 }, {
          y: 0, opacity: 1, scale: 1, stagger: 0.07, duration: 0.5, ease: 'back.out(1.8)',
        }, '-=0.5')

        // === ACT 3: POLLVERSE Text Reveal — Cinematic Split Fly-In ===
        .to('.pv-badge-tag', { y: 0, opacity: 1, duration: 0.6, ease: 'back.out(2)' }, '-=0.6');

      // POLLVERSE letters — each from different corners
      const w1 = document.querySelectorAll('.pv-w1-letter');
      w1.forEach((el, idx) => {
        const dirs = [
          { x: -500, y: -300, rotate: -120 },
          { x: 500, y: -300, rotate: 120 },
          { y: 400, scale: 0, rotate: 60 },
          { y: -400, rotateX: 200, rotate: -60 },
        ];
        const from = dirs[idx % 4];
        tl.from(el, {
          ...from, opacity: 0, duration: 0.65, ease: 'power3.out',
          onStart: () => sounds.playLetterSnap(idx),
        }, `-=${idx === 0 ? 0.5 : 0.55}`);
      });

      // .AI accent letters with flip-in
      const w2 = document.querySelectorAll('.pv-w2-letter');
      w2.forEach((el, idx) => {
        tl.from(el, {
          scale: 4, rotateY: 180, opacity: 0, duration: 0.55,
          ease: 'back.out(2)', onStart: () => sounds.playLetterSnap(idx + 10),
        }, '-=0.4');
      });

      // === ACT 4: Live Poll Democracy Scene ===
      tl.to('.pv-poll-stage', { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'power3.out' }, '-=0.2')
        .to('.pv-poll-title', { opacity: 1, y: 0, duration: 0.4 }, '-=0.3')
        .call(() => {
          // Animate vote bars filling up
          let step = 0;
          const maxSteps = 60;
          const barInterval = setInterval(() => {
            step++;
            setPollOptions(prev => prev.map(opt => ({
              ...opt,
              pct: Math.min(opt.target, Math.round((opt.target * step) / maxSteps)),
            })));
            setVoteCount(Math.floor(step * 48));
            if (step % 8 === 0) sounds.playVoteSurge();
            if (step >= maxSteps) clearInterval(barInterval);
          }, 30);

          // Rotating live vote popups
          LIVE_VOTES.forEach((vote, i) => {
            setTimeout(() => {
              setLiveVote(vote);
              setTimeout(() => setLiveVote(null), 1800);
            }, i * 600 + 400);
          });
        })

        // === ACT 5: Feature Cards + CTA ===
        .fromTo('.pv-card', { y: 60, opacity: 0, rotateX: -25 }, {
          y: 0, opacity: 1, rotateX: 0, stagger: 0.12, duration: 0.65, ease: 'power3.out',
        }, '+=0.6')
        .to('.pv-actions', { opacity: 1, y: 0, duration: 0.6, ease: 'back.out(1.5)' }, '-=0.3');

      // Floating glowing orbs background drift
      gsap.to('.pv-glow-orb-1', { y: '-=30', x: '+=20', duration: 4, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      gsap.to('.pv-glow-orb-2', { y: '+=25', x: '-=15', duration: 5, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      gsap.to('.pv-glow-orb-3', { y: '-=20', x: '+=10', duration: 3.5, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    }, containerRef);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
      ctxGsap.revert();
    };
  }, []);

  const handleFinish = () => {
    gsap.to(containerRef.current, {
      opacity: 0, scale: 1.05, duration: 0.6, ease: 'power2.inOut',
      onComplete: () => { if (onComplete) onComplete(); },
    });
  };

  return (
    <div className="pv-welcome-overlay" ref={containerRef} onMouseMove={handleMouseMove}>
      {/* Canvas Particle Network */}
      <canvas className="pv-canvas" ref={canvasRef} />

      {/* Hexagonal Tech Grid */}
      <div className="pv-hex-bg" />
      {/* Glowing Ambient Grid Lines */}
      <div className="pv-grid-bg" />
      {/* Three Massive Glow Orbs */}
      <div className="pv-glow-orb pv-glow-orb-1" />
      <div className="pv-glow-orb pv-glow-orb-2" />
      <div className="pv-glow-orb pv-glow-orb-3" />

      {/* Top Navigation */}
      <div className="pv-top-bar">
        <button className="pv-top-btn" onClick={toggleSound}>
          {muted ? '🔇 Muted' : '🔊 Sound On'}
        </button>
        <button className="pv-top-btn" onClick={handleFinish}>
          Skip Intro ➔
        </button>
      </div>

      {/* === ACT 1: Suspense Initialization === */}
      <div className="pv-suspense-container">
        <div className="pv-light-source" ref={lightRef} />
        {/* Animated data stream lines */}
        <div className="pv-data-streams">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="pv-data-stream-line" style={{ top: `${12 + i * 10}%`, animationDelay: `${i * 0.12}s` }} />
          ))}
        </div>
        <p className="pv-suspense-text">⚡ Initializing PollVerse AI Engine...</p>
      </div>

      {/* Floating Category Chips (appear before title) */}
      <div className="pv-category-chips">
        {['🏏 Cricket', '⚽ Football', '🎬 Movies', '🎮 Gaming', '🔬 Science', '🎵 Music'].map((chip, i) => (
          <div key={i} className="pv-category-chip">{chip}</div>
        ))}
      </div>

      {/* === ACT 2-3: Main Illuminated Brand Content === */}
      <div className="pv-main-content">
        <div className="pv-badge-tag">
          <span className="pv-badge-dot" />
          The Future of Real-Time Live Polling
        </div>

        {/* Giant Brand Name */}
        <div className="pv-logo-title">
          <div className="pv-word-row">
            {WORD_1.map((char, idx) => (
              <span key={`w1-${idx}`} className="pv-letter pv-w1-letter">{char}</span>
            ))}
          </div>
          <div className="pv-word-row pv-word-accent">
            {WORD_2.map((char, idx) => (
              <span key={`w2-${idx}`} className="pv-letter pv-w2-letter">{char}</span>
            ))}
          </div>
        </div>

        {/* === ACT 4: Live Poll Democracy Scene === */}
        <div className="pv-poll-stage">
          <div className="pv-poll-title">
            🗳️ LIVE RIGHT NOW — <span className="pv-highlight">{voteCount.toLocaleString()} votes cast</span>
          </div>

          {/* Animated Vote Bars */}
          <div className="pv-poll-options">
            {pollOptions.map((opt, i) => (
              <div key={i} className="pv-poll-row">
                <span className="pv-poll-label">{opt.label}</span>
                <div className="pv-poll-bar-track">
                  <div
                    className="pv-poll-bar-fill"
                    style={{
                      width: `${opt.pct}%`,
                      background: `linear-gradient(90deg, ${opt.color}99 0%, ${opt.color} 100%)`,
                      boxShadow: `0 0 14px ${opt.color}80`,
                    }}
                  />
                </div>
                <span className="pv-poll-pct" style={{ color: opt.color }}>{opt.pct}%</span>
              </div>
            ))}
          </div>

          {/* Live Voter Popup Toast */}
          {liveVote && (
            <div className="pv-live-vote-toast">
              <span className="pv-toast-dot" />
              {liveVote}
            </div>
          )}
        </div>

        {/* Feature Cards */}
        <div className="pv-floating-cards">
          {[
            { icon: '⚡', title: 'Instant Real-Time', sub: 'WebSocket Powered' },
            { icon: '🤖', title: 'AI Predictions', sub: 'Smart Analytics' },
            { icon: '🏆', title: 'Credit Rewards', sub: 'Earn 20 credits / win' },
            { icon: '🏏', title: 'Gully Cricket', sub: 'Ball-by-Ball Scoring' },
          ].map((card, i) => (
            <div key={i} className="pv-card">
              <span className="pv-card-icon">{card.icon}</span>
              <div className="pv-card-info">
                <strong>{card.title}</strong>
                <small>{card.sub}</small>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="pv-actions">
          <button className="pv-btn-enter" onClick={handleFinish}>
            Enter PollVerse
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
          <button className="pv-btn-sound" onClick={toggleSound} title="Toggle Sound">
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PollVerseWelcomeIntro;
