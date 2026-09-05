import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { sounds } from '../utils/soundEffects';
import '../styles/PollVerseWelcomeIntro.css';

const WORD_1 = 'POLLVERSE'.split('');
const WORD_2 = '.AI'.split('');

const POLL_OPTIONS = [
  { label: '🏆 Team India (T20 World Champions)', pct: 0, target: 58, color: '#38bdf8' },
  { label: '⚡ Australia (World Test Champions)', pct: 0, target: 26, color: '#f59e0b' },
  { label: '🦁 England (Bazball Era)', pct: 0, target: 16, color: '#ec4899' },
];

const CRICKET_MOCK_BALLS = ['1', '4', '0', 'W', '2', '6'];

function PollVerseWelcomeIntro({ onComplete }) {
  const containerRef = useRef(null);
  const threeCanvasRef = useRef(null);
  const lightRef = useRef(null);
  const [muted, setMuted] = useState(false);
  const [pollOptions, setPollOptions] = useState(POLL_OPTIONS);
  const [voteCount, setVoteCount] = useState(0);
  const [activeTab, setActiveTab] = useState('poll'); // 'poll' | 'cricket'

  // Toggle sound
  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    sounds.setMuted(next);
  };

  // Skip / Finish
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

  // ── Three.js 3D Sphere & Particle Universe ─────────────────────────────
  useEffect(() => {
    const canvas = threeCanvasRef.current;
    if (!canvas) return;

    let animFrameId;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 24;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 1. Central 3D Cricket / Data Sphere
    const sphereGeo = new THREE.SphereGeometry(6.2, 32, 32);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b4b,
      wireframe: true,
      roughness: 0.2,
      metalness: 0.8,
      transparent: true,
      opacity: 0.45,
    });
    const mainSphere = new THREE.Mesh(sphereGeo, sphereMat);
    scene.add(mainSphere);

    // 2. Seam Ring (Cricket Ball Seam + Data Orbit)
    const seamGeo = new THREE.TorusGeometry(6.3, 0.08, 16, 100);
    const seamMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, wireframe: false });
    const seamRing = new THREE.Mesh(seamGeo, seamMat);
    seamRing.rotation.x = Math.PI / 4;
    scene.add(seamRing);

    // 3. Orbital Ring representing Live Democracy / Polling
    const orbitGeo = new THREE.TorusGeometry(8.5, 0.05, 16, 120);
    const orbitMat = new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.6 });
    const orbitRing = new THREE.Mesh(orbitGeo, orbitMat);
    orbitRing.rotation.y = Math.PI / 3;
    scene.add(orbitRing);

    // 4. Starfield / Data Node Particles
    const particlesCount = 350;
    const posArray = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount * 3; i += 3) {
      posArray[i] = (Math.random() - 0.5) * 60;
      posArray[i + 1] = (Math.random() - 0.5) * 50;
      posArray[i + 2] = (Math.random() - 0.5) * 40;
    }
    const particlesGeo = new THREE.BufferGeometry();
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMat = new THREE.PointsMaterial({
      size: 0.22,
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const particlesMesh = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particlesMesh);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x22c55e, 3, 50);
    pointLight.position.set(12, 10, 10);
    scene.add(pointLight);

    const pointLight2 = new THREE.PointLight(0x6366f1, 3, 50);
    pointLight2.position.set(-12, -10, 10);
    scene.add(pointLight2);

    // Mouse interaction parallax
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Animation Loop
    const clock = new THREE.Clock();
    const animate = () => {
      const elapsedTime = clock.getElapsedTime();

      mainSphere.rotation.y = elapsedTime * 0.15;
      mainSphere.rotation.x = elapsedTime * 0.08;

      seamRing.rotation.z = elapsedTime * 0.25;
      orbitRing.rotation.x = elapsedTime * 0.18;
      orbitRing.rotation.y = elapsedTime * 0.12;

      particlesMesh.rotation.y = elapsedTime * 0.03;

      // Subtle camera parallax
      camera.position.x += (mouseX * 3 - camera.position.x) * 0.05;
      camera.position.y += (-mouseY * 3 - camera.position.y) * 0.05;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
      animFrameId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // ── GSAP Timeline ───────────────────────────────────────────────────
  useEffect(() => {
    const ctxGsap = gsap.context(() => {
      const tl = gsap.timeline();
      const lightEl = lightRef.current;

      // ACT 1: Suspense Initialization
      tl.to('.pv-suspense-text', { opacity: 1, duration: 0.5, ease: 'power2.out' })
        .fromTo('.pv-data-stream-line', { scaleX: 0, opacity: 0 }, {
          scaleX: 1, opacity: 1, stagger: 0.06, duration: 0.35, ease: 'power2.out',
        })
        .to(lightEl, { opacity: 0.8, scale: 1.5, duration: 0.12, onStart: () => sounds.playLightBlink(0.7) })
        .to(lightEl, { opacity: 0, scale: 0.2, duration: 0.15 })
        .to(lightEl, { opacity: 1, scale: 2.2, duration: 0.14, onStart: () => sounds.playLightBlink(1.1) })
        .to(lightEl, { opacity: 0.1, scale: 0.3, duration: 0.15 })
        .to(lightEl, { opacity: 1, scale: 8, duration: 0.45, ease: 'power3.in', onStart: () => sounds.playIlluminationBoom() })

        // ACT 2: Stage illumination
        .to('.pv-suspense-container', { opacity: 0, duration: 0.2 })
        .to('.pv-glow-orb', { opacity: 0.8, scale: 1, stagger: 0.1, duration: 0.8 }, '-=0.1')

        // ACT 3: Content entrance (Proper flow, no overlaps!)
        .fromTo('.pv-category-chip', { y: 20, opacity: 0, scale: 0.85 }, {
          y: 0, opacity: 1, scale: 1, stagger: 0.05, duration: 0.4, ease: 'back.out(1.8)',
        })
        .to('.pv-badge-tag', { y: 0, opacity: 1, duration: 0.5, ease: 'back.out(2)' }, '-=0.2');

      // Animated letters
      const w1 = document.querySelectorAll('.pv-w1-letter');
      w1.forEach((el, idx) => {
        tl.from(el, {
          y: 40, opacity: 0, scale: 0.5, rotate: -15, duration: 0.4, ease: 'back.out(2)',
          onStart: () => sounds.playLetterSnap(idx),
        }, `-=${idx === 0 ? 0.3 : 0.35}`);
      });

      const w2 = document.querySelectorAll('.pv-w2-letter');
      w2.forEach((el, idx) => {
        tl.from(el, {
          scale: 3, rotateY: 180, opacity: 0, duration: 0.4, ease: 'back.out(2)',
          onStart: () => sounds.playLetterSnap(idx + 10),
        }, '-=0.25');
      });

      // Dual showcase stage
      tl.to('.pv-poll-stage', { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'power3.out' }, '-=0.1')
        .call(() => {
          // Animate vote bars filling up
          let step = 0;
          const maxSteps = 50;
          const barInterval = setInterval(() => {
            step++;
            setPollOptions((prev) =>
              prev.map((opt) => ({
                ...opt,
                pct: Math.min(opt.target, Math.round((opt.target * step) / maxSteps)),
              }))
            );
            setVoteCount(Math.floor(step * 45));
            if (step % 10 === 0) sounds.playVoteSurge();
            if (step >= maxSteps) clearInterval(barInterval);
          }, 35);
        });
    }, containerRef);

    return () => ctxGsap.revert();
  }, []);

  return (
    <div className="pv-welcome-overlay" ref={containerRef}>
      {/* Interactive 3D Three.js Canvas */}
      <canvas className="pv-three-canvas" ref={threeCanvasRef} />

      {/* Hexagonal Grid and Ambient Glow Orbs */}
      <div className="pv-hex-bg" />
      <div className="pv-grid-bg" />
      <div className="pv-glow-orb pv-glow-orb-1" />
      <div className="pv-glow-orb pv-glow-orb-2" />
      <div className="pv-glow-orb pv-glow-orb-3" />

      {/* Top Controls */}
      <div className="pv-top-bar">
        <button className="pv-top-btn" onClick={toggleSound}>
          {muted ? '🔇 Muted' : '🔊 Sound On'}
        </button>
        <button className="pv-top-btn" onClick={handleFinish}>
          Skip Intro ➔
        </button>
      </div>

      {/* Suspense Flash Light */}
      <div className="pv-suspense-container">
        <div className="pv-light-source" ref={lightRef} />
        <div className="pv-data-streams">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="pv-data-stream-line"
              style={{ top: `${20 + i * 12}%`, animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
        <p className="pv-suspense-text">⚡ Initializing PollVerse & Cricket Universe...</p>
      </div>

      {/* Main Content Area (Clean flex layout, ZERO overlapping!) */}
      <div className="pv-main-content">
        {/* Category Chips positioned neatly above the badge tag */}
        <div className="pv-category-chips">
          {['🏏 Cricket Live', '⚡ Live Polling', '🏆 Leagues', '🎬 Movies', '🎮 Gaming', '🔬 Tech'].map((chip, i) => (
            <div key={i} className="pv-category-chip">{chip}</div>
          ))}
        </div>

        {/* Dual Mode Badge */}
        <div className="pv-badge-tag">
          <span className="pv-badge-dot" />
          The Future of Real-Time Democracy & Live Cricket
        </div>

        {/* Brand Title */}
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

        {/* Dual Showcase Card: Polls + Cricket */}
        <div className="pv-poll-stage">
          {/* Switcher Tabs */}
          <div className="pv-stage-tabs">
            <button
              className={`pv-stage-tab-btn ${activeTab === 'poll' ? 'active' : ''}`}
              onClick={() => setActiveTab('poll')}
            >
              🗳️ Live Polling Arena
            </button>
            <button
              className={`pv-stage-tab-btn ${activeTab === 'cricket' ? 'active' : ''}`}
              onClick={() => setActiveTab('cricket')}
            >
              🏏 Live Cricket Stadium
            </button>
          </div>

          {activeTab === 'poll' ? (
            /* Poll Arena */
            <div className="pv-stage-content">
              <div className="pv-poll-title">
                🗳️ WHO WILL WIN THE 2026 WORLD CUP? — <span className="pv-highlight">{voteCount.toLocaleString()} votes cast</span>
              </div>
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
            </div>
          ) : (
            /* Cricket Arena */
            <div className="pv-stage-content">
              <div className="pv-cricket-intro-box">
                <div className="pv-cricket-match-header">
                  <span className="pv-live-pill">🔴 LIVE T20I</span>
                  <span className="pv-cricket-series">Australia Tour of India 2026</span>
                </div>

                <div className="pv-cricket-scores-row">
                  <div className="pv-cricket-team">
                    <span>🇮🇳 IND</span>
                    <strong>159/4 <small>(17.2 ov)</small></strong>
                  </div>
                  <div className="pv-cricket-vs">VS</div>
                  <div className="pv-cricket-team">
                    <span>🇦🇺 AUS</span>
                    <strong>186/6 <small>(20.0 ov)</small></strong>
                  </div>
                </div>

                <div className="pv-cricket-status-line">
                  🔥 Need 28 runs in 16 balls · CRR: 10.22 · RRR: 10.50
                </div>

                <div className="pv-cricket-balls-strip">
                  <span className="pv-bbb-label">Over 18:</span>
                  <div className="pv-bbb-chips">
                    {CRICKET_MOCK_BALLS.map((ball, bIdx) => (
                      <span
                        key={bIdx}
                        className={`pv-ball-chip ${ball === 'W' ? 'is-wkt' : ball === '4' || ball === '6' ? 'is-boundary' : ''}`}
                      >
                        {ball}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Button to enter platform */}
          <div className="pv-stage-actions">
            <button className="pv-enter-btn" onClick={handleFinish}>
              ⚡ Enter PollVerse & Cricket Hub ➔
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PollVerseWelcomeIntro;
