import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { sounds } from '../utils/soundEffects';
import '../styles/PollVerseWelcomeIntro.css';

const WORD_1 = 'POLLVERSE'.split('');
const WORD_2 = 'LIVE'.split('');

function PollVerseWelcomeIntro({ onComplete, isEmbedded = false }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const lightRef = useRef(null);
  const [muted, setMuted] = useState(false);


  // Mouse tilt effect
  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);

    gsap.to('.pv-main-content', {
      rotateY: x * 12,
      rotateX: -y * 12,
      duration: 0.8,
      ease: 'power2.out',
    });

    gsap.to('.pv-glow-orb-1', { x: x * 40, y: y * 40, duration: 1 });
    gsap.to('.pv-glow-orb-2', { x: -x * 50, y: -y * 50, duration: 1 });
  };

  const toggleSound = () => {
    const isMuted = sounds.toggleMute();
    setMuted(isMuted);
  };

  useEffect(() => {
    // -------------------------------------------------------------
    // 1. Interactive Canvas Particles Background
    // -------------------------------------------------------------
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const particles = [];
    const particleCount = Math.min(80, Math.floor(window.innerWidth / 15));

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2,
        size: Math.random() * 2.5 + 1,
        color: i % 2 === 0 ? '#38bdf8' : '#818cf8',
        alpha: Math.random() * 0.7 + 0.3,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(56, 189, 248, ${0.15 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Draw and update particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.globalAlpha = 1.0;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // -------------------------------------------------------------
    // 2. GSAP Timeline Animation
    // -------------------------------------------------------------
    const ctxGsap = gsap.context(() => {
      const tl = gsap.timeline();


      // Stage 1: Suspense light blinks (4 times)
      const lightEl = lightRef.current;

      tl.to('.pv-suspense-text', { opacity: 1, duration: 0.5 })
        // Blink 1
        .to(lightEl, { opacity: 0.9, scale: 1.2, duration: 0.15, onStart: () => sounds.playLightBlink(0.8) })
        .to(lightEl, { opacity: 0, scale: 0.3, duration: 0.25 })
        // Blink 2
        .to(lightEl, { opacity: 1, scale: 1.5, duration: 0.15, onStart: () => sounds.playLightBlink(1.0) })
        .to(lightEl, { opacity: 0.1, scale: 0.4, duration: 0.2 })
        // Blink 3
        .to(lightEl, { opacity: 1, scale: 2, duration: 0.2, onStart: () => sounds.playLightBlink(1.2) })
        .to(lightEl, { opacity: 0, scale: 0.2, duration: 0.3 })
        // Blink 4 (Final intense burst)
        .to(lightEl, {
          opacity: 1,
          scale: 8,
          duration: 0.4,
          ease: 'power2.in',
          onStart: () => sounds.playLightBlink(1.8),
        })

        // Stage 2: Illumination Boom & Grid Reveal
        .to('.pv-suspense-container', { opacity: 0, display: 'none', duration: 0.3 })
        .to('.pv-grid-bg', { opacity: 0.8, duration: 1.2, ease: 'power2.out' }, '-=0.2')
        .to('.pv-glow-orb', { opacity: 0.7, duration: 1.5, stagger: 0.2 }, '-=1.0')
        .call(() => sounds.playIlluminationBoom())

        // Stage 3: Split Text Fly-In from 4 Directions
        .to('.pv-badge-tag', { y: 0, opacity: 1, duration: 0.6, ease: 'back.out(1.7)' }, '-=0.8');

      // Word 1 ("POLLVERSE") letter animations
      const word1Letters = document.querySelectorAll('.pv-w1-letter');
      word1Letters.forEach((letEl, idx) => {
        let fromVars = {};
        if (idx % 4 === 0) fromVars = { x: -300, y: -200, rotate: -90, opacity: 0 };
        else if (idx % 4 === 1) fromVars = { x: 300, y: -200, rotate: 90, opacity: 0 };
        else if (idx % 4 === 2) fromVars = { y: 300, scale: 0, opacity: 0 };
        else fromVars = { y: -300, rotateX: 180, opacity: 0 };

        tl.from(
          letEl,
          {
            ...fromVars,
            duration: 0.7,
            ease: 'power3.out',
            onStart: () => sounds.playLetterSnap(idx),
          },
          `-=${idx === 0 ? 0.4 : 0.6}`
        );
      });

      // Word 2 ("LIVE") accent letter animations
      const word2Letters = document.querySelectorAll('.pv-w2-letter');
      word2Letters.forEach((letEl, idx) => {
        tl.from(
          letEl,
          {
            scale: 3,
            rotateY: 180,
            opacity: 0,
            duration: 0.6,
            ease: 'back.out(2)',
            onStart: () => sounds.playLetterSnap(idx + 9),
          },
          '-=0.45'
        );
      });

      // Stage 4: Subtitle & 3D Floating Cards
      tl.to('.pv-subtitle', { y: 0, opacity: 1, duration: 0.7, ease: 'power2.out' }, '-=0.2')
        .fromTo(
          '.pv-card',
          { y: 60, opacity: 0, rotateX: -30 },
          { y: 0, opacity: 1, rotateX: 0, duration: 0.7, stagger: 0.15, ease: 'power3.out' },
          '-=0.4'
        )

        // Stage 5: Enter & Action Buttons
        .to('.pv-actions', { opacity: 1, y: 0, duration: 0.6, ease: 'back.out(1.5)' }, '-=0.3');
    }, containerRef);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
      ctxGsap.revert();
    };
  }, []);

  const handleFinish = () => {
    gsap.to(containerRef.current, {
      opacity: 0,
      scale: 1.05,
      duration: 0.6,
      ease: 'power2.inOut',
      onComplete: () => {
        if (onComplete) onComplete();
      },
    });
  };

  return (
    <div
      className="pv-welcome-overlay"
      ref={containerRef}
      onMouseMove={handleMouseMove}
    >
      {/* Background Interactive Canvas */}
      <canvas className="pv-canvas" ref={canvasRef} />

      {/* Grid & Glowing Orbs */}
      <div className="pv-grid-bg" />
      <div className="pv-glow-orb pv-glow-orb-1" />
      <div className="pv-glow-orb pv-glow-orb-2" />
      <div className="pv-glow-orb pv-glow-orb-3" />

      {/* Top Bar Navigation */}
      <div className="pv-top-bar">
        <button className="pv-top-btn" onClick={toggleSound}>
          {muted ? '🔇 Muted' : '🔊 Sound On'}
        </button>
        <button className="pv-top-btn" onClick={handleFinish}>
          Skip Intro ➔
        </button>
      </div>

      {/* Stage 1: Suspense Light Core */}
      <div className="pv-suspense-container">
        <div className="pv-light-source" ref={lightRef} />
        <p className="pv-suspense-text">Initializing PollVerse Engine...</p>
      </div>

      {/* Stage 2-5: Illuminated Content */}
      <div className="pv-main-content">
        <div className="pv-badge-tag">
          <span className="pv-badge-dot" />
          The Future of Real-Time Polling
        </div>

        <div className="pv-logo-title">
          {/* Word 1: POLLVERSE */}
          <div className="pv-word-row">
            {WORD_1.map((char, index) => (
              <span key={`w1-${index}`} className="pv-letter pv-w1-letter">
                {char}
              </span>
            ))}
          </div>
          {/* Word 2: LIVE */}
          <div className="pv-word-row pv-word-accent">
            {WORD_2.map((char, index) => (
              <span key={`w2-${index}`} className="pv-letter pv-w2-letter">
                {char}
              </span>
            ))}
          </div>
        </div>

        <p className="pv-subtitle">
          Experience real-time interactive predictions, instant vote analytics, and credit rewards.
        </p>

        {/* Floating 3D Cards */}
        <div className="pv-floating-cards">
          <div className="pv-card">
            <span className="pv-card-icon">⚡</span>
            <div className="pv-card-info">
              <strong>Real-Time Sync</strong>
              <small>WebSockets Powered</small>
            </div>
          </div>

          <div className="pv-card">
            <span className="pv-card-icon">🏆</span>
            <div className="pv-card-info">
              <strong>Prediction Rewards</strong>
              <small>Earn 20 Credits / Win</small>
            </div>
          </div>

          <div className="pv-card">
            <span className="pv-card-icon">🏏</span>
            <div className="pv-card-info">
              <strong>Gully Cricket</strong>
              <small>Ball-by-Ball Scoring</small>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pv-actions">
          <button className="pv-btn-enter" onClick={handleFinish}>
            Enter Experience
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>

          <button className="pv-btn-sound" onClick={toggleSound} title="Toggle Audio Synthesizer">
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PollVerseWelcomeIntro;
