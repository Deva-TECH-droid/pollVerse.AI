import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { sounds } from '../utils/soundEffects';
import '../styles/GullyCricketWelcomeIntro.css';

const TEXT_LINE1 = 'GULLY CRICKET'.split('');
const TEXT_LINE2 = 'SCORING'.split('');

function GullyCricketWelcomeIntro({ onComplete, onCreateMatch }) {
  const containerRef = useRef(null);
  const fireworksCanvasRef = useRef(null);
  const [muted, setMuted] = useState(false);
  const [scoreCount, setScoreCount] = useState('000/0');

  const toggleSound = () => {
    const isMuted = sounds.toggleMute();
    setMuted(isMuted);
  };

  useEffect(() => {
    // -------------------------------------------------------------
    // 1. Fireworks & Celebration Canvas Engine
    // -------------------------------------------------------------
    const canvas = fireworksCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const fireworks = [];
    const particles = [];

    class Firework {
      constructor(x, targetY) {
        this.x = x;
        this.y = canvas.height;
        this.targetY = targetY;
        this.speed = Math.random() * 3 + 7;
        this.angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.2;
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
        this.color = `hsl(${Math.random() * 60 + 35}, 100%, 65%)`; // Cricket gold/orange/yellow
        this.dead = false;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.y <= this.targetY) {
          this.dead = true;
          this.explode();
        }
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fill();
      }

      explode() {
        sounds.playFirework();
        const pCount = Math.floor(Math.random() * 30 + 40);
        for (let i = 0; i < pCount; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 6 + 2;
          particles.push({
            x: this.x,
            y: this.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            decay: Math.random() * 0.02 + 0.015,
            color: this.color,
            size: Math.random() * 3 + 1,
          });
        }
      }
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update fireworks
      for (let i = fireworks.length - 1; i >= 0; i--) {
        fireworks[i].update();
        fireworks[i].draw();
        if (fireworks[i].dead) fireworks.splice(i, 1);
      }

      // Update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08; // gravity
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.shadowBlur = 8;
          ctx.shadowColor = p.color;
          ctx.fill();
          ctx.globalAlpha = 1.0;
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const triggerFireworksBurst = () => {
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          fireworks.push(
            new Firework(
              Math.random() * (canvas.width * 0.8) + canvas.width * 0.1,
              Math.random() * (canvas.height * 0.4) + canvas.height * 0.15
            )
          );
        }, i * 250);
      }
    };

    // -------------------------------------------------------------
    // 2. GSAP Stadium Timeline Sequence
    // -------------------------------------------------------------
    const ctxGsap = gsap.context(() => {
      const tl = gsap.timeline();

      // Step 1: Floodlights turning on 1 by 1
      const towers = document.querySelectorAll('.gc-floodlight-tower');
      const beams = document.querySelectorAll('.gc-light-beam');

      towers.forEach((tower, idx) => {
        tl.to(
          tower,
          {
            onStart: () => {
              tower.classList.add('active');
              sounds.playFloodlightOn(idx);
            },
            duration: 0.15,
          },
          idx * 0.3
        ).to(beams[idx], { opacity: 0.7, duration: 0.4 }, `-=0.1`);
      });

      // Step 2: 3D Pitch Appearance & LED Stumps / Boundary Rope
      tl.to('.gc-pitch-container', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.2')
        .to('.gc-bail', { opacity: 1, duration: 0.3, ease: 'back.out(2)' }, '-=0.3')
        .to('.gc-boundary-rope', { opacity: 1, duration: 0.5 }, '-=0.4')

        // Step 3: Bat Swing & Leather Ball Hit towards Viewer
        .to('.gc-cricket-bat', {
          opacity: 1,
          rotate: -45,
          duration: 0.4,
          ease: 'power2.out',
        })
        .to('.gc-cricket-bat', {
          rotate: 60,
          duration: 0.25,
          ease: 'power4.in',
          onStart: () => sounds.playBatHit(),
        })
        .fromTo(
          '.gc-cricket-ball',
          { scale: 0.2, x: 0, y: 100, opacity: 1 },
          {
            scale: 7,
            y: -250,
            opacity: 0,
            duration: 0.5,
            ease: 'power2.in',
          },
          '-=0.25'
        )
        // Screen Shake effect on impact!
        .to(containerRef.current, { x: 12, y: -12, duration: 0.05, yoyo: true, repeat: 5 })

        // Step 4: Text Animation ("PollLive presents Gully Cricket Scoring")
        .to('.gc-present-tag', { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.5)' });

      // Line 1 Letters fly in like cricket balls
      const line1Letters = document.querySelectorAll('.gc-l1-letter');
      line1Letters.forEach((letEl, idx) => {
        tl.from(
          letEl,
          {
            x: (idx - 6) * 120,
            y: -300,
            rotate: 360,
            scale: 0,
            opacity: 0,
            duration: 0.5,
            ease: 'bounce.out',
            onStart: () => sounds.playLetterSnap(idx),
          },
          `-=${idx === 0 ? 0.3 : 0.42}`
        );
      });

      // Line 2 Letters
      const line2Letters = document.querySelectorAll('.gc-l2-letter');
      line2Letters.forEach((letEl, idx) => {
        tl.from(
          letEl,
          {
            x: (idx - 3) * 150,
            y: 300,
            rotate: -360,
            scale: 2,
            opacity: 0,
            duration: 0.4,
            ease: 'back.out(2)',
            onStart: () => sounds.playLetterSnap(idx + 7),
          },
          `-=${idx === 0 ? 0.2 : 0.35}`
        );
      });

      // Step 5: Digital Scoreboard Counter & Fireworks Climax
      tl.to('.gc-matrix-frame', { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, '-=0.2')
        .call(() => {
          let count = 0;
          const interval = setInterval(() => {
            count += 42;
            if (count >= 184) {
              setScoreCount('184/6');
              clearInterval(interval);
              triggerFireworksBurst();
            } else {
              setScoreCount(`${count}/2`);
            }
          }, 80);
        })
        .to('.gc-actions', { opacity: 1, y: 0, duration: 0.6, ease: 'back.out(1.7)' }, '+=0.2');
    }, containerRef);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
      ctxGsap.revert();
    };
  }, []);

  const handleEnter = () => {
    gsap.to(containerRef.current, {
      opacity: 0,
      scale: 0.95,
      duration: 0.5,
      ease: 'power2.inOut',
      onComplete: () => {
        if (onComplete) onComplete();
      },
    });
  };

  const handleCreate = () => {
    gsap.to(containerRef.current, {
      opacity: 0,
      duration: 0.4,
      onComplete: () => {
        if (onCreateMatch) onCreateMatch();
      },
    });
  };

  return (
    <div className="gc-welcome-overlay" ref={containerRef}>
      {/* Background Fireworks Canvas */}
      <canvas className="gc-fireworks-canvas" ref={fireworksCanvasRef} />

      {/* Ground & Night Sky Backdrop */}
      <div className="gc-stadium-bg" />

      {/* Top Bar Controls */}
      <div className="gc-top-bar">
        <button className="gc-top-btn" onClick={toggleSound}>
          {muted ? '🔇 Muted' : '🔊 Sound On'}
        </button>
        <button className="gc-top-btn" onClick={handleEnter}>
          Skip Intro ➔
        </button>
      </div>

      {/* 4 Stadium Floodlight Towers */}
      <div className="gc-floodlights-container">
        {[0, 1, 2, 3].map((tIdx) => (
          <div key={`tower-${tIdx}`} className="gc-floodlight-tower">
            <div className="gc-floodlight-head">
              {[...Array(6)].map((_, bIdx) => (
                <div key={`bulb-${bIdx}`} className="gc-light-bulb" />
              ))}
            </div>
            <div className="gc-light-beam" />
          </div>
        ))}
      </div>

      {/* 3D Pitch & Stumps */}
      <div className="gc-pitch-container">
        <div className="gc-cricket-pitch">
          <div className="gc-crease-line" />
          <div className="gc-stumps">
            <div className="gc-stump" />
            <div className="gc-stump" />
            <div className="gc-stump" />
            <div className="gc-bail" />
          </div>
          <div className="gc-crease-line" />
        </div>
        <div className="gc-boundary-rope" />
      </div>

      {/* Bat & Ball Animation Stage */}
      <div className="gc-animation-stage">
        <div className="gc-cricket-bat" />
        <div className="gc-cricket-ball" />
      </div>

      {/* Main Scoreboard Content */}
      <div className="gc-scoreboard-container">
        <div className="gc-present-tag">🏆 PollLive Presents 🏆</div>

        <div className="gc-main-title">
          <div className="gc-title-row">
            {TEXT_LINE1.map((char, index) => (
              <span key={`l1-${index}`} className="gc-ball-letter gc-l1-letter">
                {char === ' ' ? '\u00A0' : char}
              </span>
            ))}
          </div>

          <div className="gc-title-row gc-accent-row">
            {TEXT_LINE2.map((char, index) => (
              <span key={`l2-${index}`} className="gc-ball-letter gc-l2-letter">
                {char}
              </span>
            ))}
          </div>
        </div>

        {/* LED Digital Matrix Frame */}
        <div className="gc-matrix-frame">
          <span className="gc-score-label">MATCH STATUS</span>
          <span className="gc-score-digit">{scoreCount}</span>
          <span className="gc-score-label">BALL-BY-BALL LIVE</span>
        </div>

        {/* Action Controls */}
        <div className="gc-actions">
          <button className="gc-btn-primary" onClick={handleEnter}>
            <span>Enter Live Scoring</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>

          <button className="gc-btn-secondary" onClick={handleCreate}>
            + Create New Match
          </button>
        </div>
      </div>
    </div>
  );
}

export default GullyCricketWelcomeIntro;
