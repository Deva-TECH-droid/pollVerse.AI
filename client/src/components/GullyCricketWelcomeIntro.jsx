import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { sounds } from '../utils/soundEffects';
import '../styles/GullyCricketWelcomeIntro.css';

const TEXT_LINE1 = 'GULLY CRICKET'.split('');
const TEXT_LINE2 = 'ARENA'.split('');
const FLOATING_EMOJIS = ['🏏', '🏆', '⚡', '🔥', '🎯', '🏟️', '🎉', '⭐', '🥎', '💥', '4️⃣', '6️⃣'];

function GullyCricketWelcomeIntro({ onComplete, onCreateMatch }) {
  const containerRef = useRef(null);
  const fireworksCanvasRef = useRef(null);
  const [muted, setMuted] = useState(false);
  const [bowledBannerActive, setBowledBannerActive] = useState(false);
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
        this.speed = Math.random() * 3 + 8;
        this.angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.25;
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
        this.color = `hsl(${Math.random() * 60 + 25}, 100%, 65%)`; // Gold/Orange/Crimson
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
        ctx.arc(this.x, this.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = this.color;
        ctx.fill();
      }

      explode() {
        sounds.playFirework();
        const pCount = Math.floor(Math.random() * 35 + 45);
        for (let i = 0; i < pCount; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 7 + 2;
          particles.push({
            x: this.x,
            y: this.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            decay: Math.random() * 0.02 + 0.015,
            color: this.color,
            size: Math.random() * 3.5 + 1.2,
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
          ctx.shadowBlur = 10;
          ctx.shadowColor = p.color;
          ctx.fill();
          ctx.globalAlpha = 1.0;
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const triggerFireworksBurst = () => {
      for (let i = 0; i < 6; i++) {
        setTimeout(() => {
          fireworks.push(
            new Firework(
              Math.random() * (canvas.width * 0.8) + canvas.width * 0.1,
              Math.random() * (canvas.height * 0.35) + canvas.height * 0.12
            )
          );
        }, i * 220);
      }
    };

    // -------------------------------------------------------------
    // 2. Cinematic Cricket Ground Action & Bowled Sequence
    // -------------------------------------------------------------
    const ctxGsap = gsap.context(() => {
      const tl = gsap.timeline();

      // Scene 1: Stadium Floodlights Powering On
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
          idx * 0.25
        ).to(beams[idx], { opacity: 0.75, duration: 0.35 }, `-=0.1`);
      });

      // Scene 2: 3D Turf Pitch & Crease Markings Reveal
      tl.to('.gc-pitch-container', { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'power3.out' }, '-=0.2')
        .to('.gc-batsman-figure', { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, '-=0.3')
        .to('.gc-bowler-figure', { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out' }, '-=0.4')

        // Batsman tapping bat on crease
        .to('.gc-bat-wood', { rotate: -18, duration: 0.15, yoyo: true, repeat: 3, ease: 'power1.inOut' })

        // Scene 3: Bowler Run-Up & Delivery Stride
        .to('.gc-bowler-figure', {
          x: 60,
          y: -10,
          duration: 0.6,
          ease: 'power2.in',
          onStart: () => sounds.playBallWhoosh(),
        })
        .to('.gc-bowler-arm', { rotate: 360, duration: 0.35, ease: 'power3.in' }, '-=0.35')

        // Ball zooming down the 22-yard pitch with blazing comet trail
        .fromTo(
          '.gc-delivery-ball',
          { x: -140, y: -40, scale: 0.6, opacity: 1 },
          {
            x: 135,
            y: 32,
            scale: 1.5,
            duration: 0.55,
            ease: 'power3.in',
          },
          '-=0.2'
        )

        // Batsman swings & misses completely!
        .to('.gc-bat-wood', { rotate: 65, duration: 0.2, ease: 'power4.in' }, '-=0.25')

        // IMPACT: Ball Smashes Stumps!
        .call(() => {
          sounds.playStumpShatter();
          sounds.playCrowdRoar();
          setBowledBannerActive(true);
        })
        // Middle stump uprooted and cartwheeling backwards
        .to('.gc-stump-middle', {
          x: 90,
          y: -80,
          rotate: 320,
          duration: 0.6,
          ease: 'power2.out',
        })
        .to('.gc-stump-off', {
          x: 40,
          y: -40,
          rotate: 90,
          duration: 0.5,
          ease: 'power2.out',
        }, '-=0.55')
        // Bails flying with intense red LED flash!
        .to('.gc-bail-left', {
          x: -60,
          y: -120,
          rotate: -480,
          duration: 0.65,
          ease: 'power2.out',
        }, '-=0.55')
        .to('.gc-bail-right', {
          x: 110,
          y: -130,
          rotate: 520,
          duration: 0.65,
          ease: 'power2.out',
        }, '-=0.6')
        .to('.gc-stump-light-fx', { opacity: 1, scale: 2.2, duration: 0.2, yoyo: true, repeat: 1 }, '-=0.65')

        // Massive Screen Shake
        .to(containerRef.current, { x: 16, y: -16, duration: 0.04, yoyo: true, repeat: 6 })

        // "BOWLED 'EM!" Broadcast Overlay flashes
        .to('.gc-bowled-callout', { opacity: 1, scale: 1.15, duration: 0.35, ease: 'back.out(2)' })
        .to('.gc-bowled-callout', { opacity: 0, scale: 0.85, duration: 0.4, delay: 0.8 })

        // Scene 4: Cinematic Pitch Zoom & Transition into Live Scoring Platform
        .to('.gc-pitch-container', { scale: 1.3, opacity: 0.2, filter: 'blur(8px)', duration: 0.8, ease: 'power2.inOut' })
        .to('.gc-scoreboard-container', { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.5')
        .to('.gc-present-tag', { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.5)' }, '-=0.4');

      // Title Letters flying in
      const line1Letters = document.querySelectorAll('.gc-l1-letter');
      line1Letters.forEach((letEl, idx) => {
        tl.from(
          letEl,
          {
            x: (idx - 6) * 90,
            y: -250,
            rotate: 360,
            scale: 0,
            opacity: 0,
            duration: 0.45,
            ease: 'bounce.out',
            onStart: () => sounds.playLetterSnap(idx),
          },
          `-=${idx === 0 ? 0.3 : 0.38}`
        );
      });

      const line2Letters = document.querySelectorAll('.gc-l2-letter');
      line2Letters.forEach((letEl, idx) => {
        tl.from(
          letEl,
          {
            x: (idx - 2) * 120,
            y: 250,
            rotate: -360,
            scale: 2,
            opacity: 0,
            duration: 0.4,
            ease: 'back.out(2)',
            onStart: () => sounds.playLetterSnap(idx + 8),
          },
          `-=${idx === 0 ? 0.2 : 0.32}`
        );
      });

      // Feature Cards & Counter
      tl.fromTo(
        '.gc-platform-pill',
        { y: 30, opacity: 0, scale: 0.9 },
        { y: 0, opacity: 1, scale: 1, stagger: 0.1, duration: 0.5, ease: 'back.out(1.5)' },
        '-=0.2'
      )
        .to('.gc-matrix-frame', { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, '-=0.2')
        .call(() => {
          let count = 0;
          const interval = setInterval(() => {
            count += 48;
            if (count >= 196) {
              setScoreCount('196/4');
              clearInterval(interval);
              triggerFireworksBurst();
            } else {
              setScoreCount(`${count}/2`);
            }
          }, 70);
        })
        .to('.gc-actions', { opacity: 1, y: 0, duration: 0.6, ease: 'back.out(1.7)' }, '+=0.1');

      // Floating particles
      const floaters = document.querySelectorAll('.gc-float-emoji');
      floaters.forEach((el) => {
        gsap.set(el, {
          x: Math.random() * window.innerWidth,
          y: window.innerHeight + 50,
          opacity: 0,
          scale: Math.random() * 0.6 + 0.5,
        });
        gsap.to(el, {
          y: -100,
          x: `+=${(Math.random() - 0.5) * 180}`,
          rotation: Math.random() * 720 - 360,
          opacity: 0.75,
          duration: Math.random() * 6 + 5,
          delay: Math.random() * 6 + 1,
          repeat: -1,
          ease: 'none',
        });
      });
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
      scale: 0.96,
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

      {/* Stadium Floodlit Ground Backdrop */}
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

      {/* 3D Match Play Scene: Bowler, 22-Yard Pitch, Batsman & Stumps */}
      <div className="gc-pitch-container">
        {/* Animated Bowler Figure (Running in from bowling crease) */}
        <div className="gc-bowler-figure">
          <div className="gc-bowler-head" />
          <div className="gc-bowler-body" />
          <div className="gc-bowler-arm" />
          <div className="gc-bowler-legs" />
          <span className="gc-player-label-tag">BOWLER</span>
        </div>

        {/* 22-Yard Turf Pitch */}
        <div className="gc-cricket-pitch">
          <div className="gc-bowling-crease" />
          <div className="gc-pitch-stripes" />
          
          {/* Animated Cricket Leather Ball with Comet Trail */}
          <div className="gc-delivery-ball">
            <div className="gc-ball-seam" />
            <div className="gc-ball-glow-trail" />
          </div>

          <div className="gc-batting-crease" />
        </div>

        {/* Batsman Figure (Poised on crease with pads & helmet) */}
        <div className="gc-batsman-figure">
          <div className="gc-batsman-helmet" />
          <div className="gc-batsman-jersey" />
          <div className="gc-bat-wood" />
          <div className="gc-batsman-pads" />
          <span className="gc-player-label-tag gc-tag-batsman">BATSMAN</span>
        </div>

        {/* 3D Stumps & LED Zing Bails */}
        <div className="gc-stumps-set">
          <div className="gc-stump-light-fx" />
          <div className="gc-stump gc-stump-leg" />
          <div className="gc-stump gc-stump-middle" />
          <div className="gc-stump gc-stump-off" />
          <div className="gc-bail gc-bail-left" />
          <div className="gc-bail gc-bail-right" />
        </div>
      </div>

      {/* Dramatic "BOWLED 'EM!" Broadcast Callout */}
      <div className={`gc-bowled-callout ${bowledBannerActive ? 'active' : ''}`}>
        <div className="gc-bowled-glow" />
        <span className="gc-bowled-emoji">⚡🔴</span>
        <h2>BOWLED HIM!</h2>
        <p>MIDDLE STUMP UPROOTED · WHAT A DELIVERY!</p>
      </div>

      {/* Floating Cricket Particles */}
      <div className="gc-float-particles">
        {FLOATING_EMOJIS.map((emoji, idx) => (
          <span key={`float-${idx}`} className="gc-float-emoji">{emoji}</span>
        ))}
      </div>

      {/* Main Scoring Platform Dashboard Intro */}
      <div className="gc-scoreboard-container">
        <div className="gc-present-tag">🏏 PollVerse Gully Cricket 🏏</div>

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

        {/* Feature Pills */}
        <div className="gc-platform-features">
          <div className="gc-platform-pill">
            <span className="gc-pill-icon">📊</span>
            <span>Live Ball-by-Ball</span>
          </div>
          <div className="gc-platform-pill">
            <span className="gc-pill-icon">🎥</span>
            <span>Real-Time Streaming</span>
          </div>
          <div className="gc-platform-pill">
            <span className="gc-pill-icon">🎯</span>
            <span>Micro-Poll Predictions</span>
          </div>
          <div className="gc-platform-pill">
            <span className="gc-pill-icon">🏆</span>
            <span>Tournament Hub</span>
          </div>
        </div>

        {/* LED Digital Score Matrix */}
        <div className="gc-matrix-frame">
          <span className="gc-score-label">MATCH STATUS</span>
          <span className="gc-score-digit">{scoreCount}</span>
          <span className="gc-score-label">⚡ INSTANT REAL-TIME SCORING</span>
        </div>

        {/* Action Controls */}
        <div className="gc-actions">
          <button className="gc-btn-primary" onClick={handleEnter}>
            <span>Enter Cricket Hub</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>

          <button className="gc-btn-secondary" onClick={handleCreate}>
            + Create Live Match
          </button>
        </div>
      </div>
    </div>
  );
}

export default GullyCricketWelcomeIntro;
