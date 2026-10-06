import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import PlayerAvatar, { resolvePhotoUrl } from './PlayerAvatar';
import '../styles/TournamentAuction.css';

const API_URL = process.env.REACT_APP_API_URL || '';

// High-voltage Marquee Star Pool for instant IPL Auction
const MARQUEE_STAR_PLAYERS = [
  { name: 'Virat Kohli', role: 'Batsman', category: 'Grade A', basePrice: 2.0, country: 'India', stats: { mat: 115, runs: 4008, avg: 52.7, sr: 138.0, hs: 122 } },
  { name: 'Rohit Sharma', role: 'Batsman', category: 'Grade A', basePrice: 2.0, country: 'India', stats: { mat: 151, runs: 3974, avg: 31.3, sr: 140.9, hs: 121 } },
  { name: 'Jasprit Bumrah', role: 'Bowler', category: 'Grade A', basePrice: 2.0, country: 'India', stats: { mat: 62, runs: 45, avg: 19.6, sr: 6.55, wkt: 74, hs: '3/11' } },
  { name: 'Hardik Pandya', role: 'All-Rounder', category: 'Grade A', basePrice: 2.0, country: 'India', stats: { mat: 92, runs: 1348, avg: 32.5, sr: 139.8, hs: 71, wkt: 73 } },
  { name: 'Suryakumar Yadav', role: 'Batsman', category: 'Grade A', basePrice: 2.0, country: 'India', stats: { mat: 60, runs: 2141, avg: 45.5, sr: 171.6, hs: 117 } },
  { name: 'Rishabh Pant', role: 'Wicketkeeper', category: 'Grade A', basePrice: 2.0, country: 'India', stats: { mat: 66, runs: 987, avg: 26.2, sr: 126.4, hs: 65, wkt: 32 } },
  { name: 'Ravindra Jadeja', role: 'All-Rounder', category: 'Grade A', basePrice: 1.5, country: 'India', stats: { mat: 66, runs: 480, avg: 28.0, sr: 125.3, hs: 46, wkt: 53 } },
  { name: 'Shubman Gill', role: 'Batsman', category: 'Grade B', basePrice: 1.5, country: 'India', stats: { mat: 44, runs: 1040, avg: 30.5, sr: 139.6, hs: 126 } },
  { name: 'Mohammed Siraj', role: 'Bowler', category: 'Grade B', basePrice: 1.5, country: 'India', stats: { mat: 36, runs: 22, avg: 22.8, sr: 7.8, wkt: 42, hs: '4/17' } },
  { name: 'Kuldeep Yadav', role: 'Bowler', category: 'Grade B', basePrice: 1.5, country: 'India', stats: { mat: 35, runs: 18, avg: 14.1, sr: 6.74, wkt: 59, hs: '5/24' } },
  { name: 'Ram Sharma', role: 'Batsman', category: 'Grade B', basePrice: 1.0, country: 'India', stats: { mat: 28, runs: 850, avg: 38.0, sr: 142.0, hs: 88 } },
  { name: 'Shyam Yadav', role: 'Bowler', category: 'Grade B', basePrice: 1.0, country: 'India', stats: { mat: 25, runs: 40, avg: 18.2, sr: 7.2, wkt: 38, hs: '4/20' } },
  { name: 'Rahul Tripathi', role: 'Batsman', category: 'Grade B', basePrice: 1.0, country: 'India', stats: { mat: 32, runs: 790, avg: 31.0, sr: 144.5, hs: 74 } },
  { name: 'Aman Verma', role: 'All-Rounder', category: 'Grade B', basePrice: 1.0, country: 'India', stats: { mat: 30, runs: 620, avg: 29.5, sr: 148.0, hs: 68, wkt: 24 } },
  { name: 'Mohit Kumar', role: 'Bowler', category: 'Grade C', basePrice: 0.5, country: 'India', stats: { mat: 20, runs: 15, avg: 20.4, sr: 8.1, wkt: 26, hs: '3/18' } },
  { name: 'Arjun Singh', role: 'All-Rounder', category: 'Grade C', basePrice: 0.5, country: 'India', stats: { mat: 18, runs: 340, avg: 24.2, sr: 135.0, hs: 54, wkt: 14 } },
];

export default function TournamentAuctionArena({
  tournament,
  onUpdate,
  onFinalized,
  getToken,
}) {
  // Phase state: 'lobby' | 'live' | 'final_squads' | 'finishing'
  const [phase, setPhase] = useState(
    tournament.auctionConfig?.status === 'completed'
      ? 'final_squads'
      : (tournament.auctionPool?.some((p) => p.status === 'sold' || p.status === 'unsold') ? 'live' : 'lobby')
  );

  const [selectedFilter, setSelectedFilter] = useState('All');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [currentBid, setCurrentBid] = useState(0);
  const [lastBidder, setLastBidder] = useState(null); // teamName
  const [timer, setTimer] = useState(15);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [statusStamp, setStatusStamp] = useState(null); // 'SOLD' | 'UNSOLD' | null
  const [pulsingTeam, setPulsingTeam] = useState(null);
  const [autoAIBidding, setAutoAIBidding] = useState(true);
  const [viewTeamModal, setViewTeamModal] = useState(null);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);

  // New player form
  const [newPlayer, setNewPlayer] = useState({
    name: '',
    role: 'Batsman',
    category: 'Grade A',
    country: 'India',
    basePrice: 1.0,
    photoUrl: '',
  });

  // New team form
  const [newTeam, setNewTeam] = useState({
    name: '',
    captain: '',
    viceCaptain: '',
    budget: tournament.auctionConfig?.budgetPerTeam || 100,
    logo: '',
  });

  // DOM and Animation Refs
  const timerIntervalRef = useRef(null);
  const aiTimeoutRef = useRef(null);
  const threeCanvasRef = useRef(null);
  const playerCardRef = useRef(null);
  const soldStampRef = useRef(null);
  const currentBidRef = useRef(null);

  // Three.js internal references
  const threeSceneRef = useRef(null);
  const gavelMeshRef = useRef(null);
  const particleGroupRef = useRef(null);
  const spotlightsRef = useRef([]);

  const auctionPool = useMemo(() => tournament.auctionPool || [], [tournament.auctionPool]);
  const teams = useMemo(() => tournament.teams || [], [tournament.teams]);
  const history = useMemo(() => tournament.auctionHistory || [], [tournament.auctionHistory]);

  // Web Audio Synthesizer for Auction Ambiance
  const playSound = useCallback((type) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      if (type === 'bid') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'gavel_hammer') {
        // Deep wooden hammer strike + anvil resonant impact
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(32, now + 0.4);
        gain.gain.setValueAtTime(0.65, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);

        // Echo strike
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(80, now + 0.08);
        gain2.gain.setValueAtTime(0.35, now + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.005, now + 0.35);
        osc2.start(now + 0.08);
        osc2.stop(now + 0.35);
      } else if (type === 'cheer') {
        // Stadium fanfare chord
        [440, 554.37, 659.25, 880].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.04);
          gain.gain.setValueAtTime(0.2, now + idx * 0.04);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.85);
          osc.start(now + idx * 0.04);
          osc.stop(now + 0.85);
        });
      } else if (type === 'tick') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(900, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.06);
      } else if (type === 'unsold') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(110, now + 0.4);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      }
    } catch (_) {}
  }, []);

  // Filter player pool
  const filteredPool = useMemo(() => {
    return auctionPool.filter((p) => {
      if (selectedFilter === 'All') return true;
      if (selectedFilter === 'Sold') return p.status === 'sold';
      if (selectedFilter === 'Unsold') return p.status === 'unsold';
      if (selectedFilter === 'Pending') return p.status === 'pending';
      return p.role === selectedFilter || p.category === selectedFilter;
    });
  }, [auctionPool, selectedFilter]);

  const currentPlayer = useMemo(() => {
    if (filteredPool.length === 0) return auctionPool.find((p) => p.status === 'pending') || null;
    return filteredPool[currentIdx] || filteredPool[0] || null;
  }, [filteredPool, currentIdx, auctionPool]);

  // -------------------------------------------------------------
  // THREE.JS 3D AUCTION STAGE
  // -------------------------------------------------------------
  useEffect(() => {
    if (phase !== 'live') return;
    const canvas = threeCanvasRef.current;
    if (!canvas) return;

    let animId;
    const width = canvas.parentElement?.clientWidth || window.innerWidth;
    const height = canvas.parentElement?.clientHeight || 480;

    const scene = new THREE.Scene();
    threeSceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 5, 14);
    camera.lookAt(0, 1.2, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Ambient stadium glow
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // 3D Hexagonal Auction Podium Platform
    const podiumGeo = new THREE.CylinderGeometry(4.2, 4.6, 1.2, 6);
    const podiumMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.3,
      metalness: 0.8,
      wireframe: false,
    });
    const podium = new THREE.Mesh(podiumGeo, podiumMat);
    podium.position.y = -0.6;
    scene.add(podium);

    // Glowing Neon Rim Ring on Podium
    const ringGeo = new THREE.TorusGeometry(4.35, 0.08, 16, 6);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.02;
    scene.add(ring);

    // 3D Golden Auction Gavel Hammer & Sound Block
    const gavelGroup = new THREE.Group();
    gavelGroup.position.set(0, 0.8, 1.5);

    // Striking block
    const blockGeo = new THREE.BoxGeometry(1.6, 0.28, 1.6);
    const blockMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.4, metalness: 0.3 });
    const blockMesh = new THREE.Mesh(blockGeo, blockMat);
    blockMesh.position.y = -0.4;
    gavelGroup.add(blockMesh);

    // Gavel Head (Golden cylinder)
    const gavelHeadGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.95, 16);
    const gavelHeadMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.2 });
    const gavelHead = new THREE.Mesh(gavelHeadGeo, gavelHeadMat);
    gavelHead.rotation.z = Math.PI / 2;
    gavelHead.position.set(0, 0.4, 0);

    // Gavel Handle (Polished mahogany)
    const gavelHandleGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.4, 12);
    const gavelHandleMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.3 });
    const gavelHandle = new THREE.Mesh(gavelHandleGeo, gavelHandleMat);
    gavelHandle.rotation.x = Math.PI / 2;
    gavelHandle.position.set(0, 0.4, 0.7);

    const hammerPivot = new THREE.Group();
    hammerPivot.add(gavelHead);
    hammerPivot.add(gavelHandle);
    hammerPivot.position.set(0, 0, 0);
    gavelGroup.add(hammerPivot);

    scene.add(gavelGroup);
    gavelMeshRef.current = hammerPivot;

    // Spotlights (Cyan, Gold, Magenta) sweeping across the stage
    const spotColors = [0x06b6d4, 0xf59e0b, 0xa855f7];
    const spots = [];
    spotColors.forEach((col, idx) => {
      const spot = new THREE.SpotLight(col, 2.5, 30, Math.PI / 6, 0.4, 1.2);
      spot.position.set((idx - 1) * 7, 10, 4);
      spot.target = podium;
      scene.add(spot);
      spots.push(spot);
    });
    spotlightsRef.current = spots;

    // Floating Golden Dust Particle System
    const particleCount = 180;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePos[i] = (Math.random() - 0.5) * 16;
      particlePos[i + 1] = Math.random() * 8;
      particlePos[i + 2] = (Math.random() - 0.5) * 12;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.12,
      color: 0xfde047,
      transparent: true,
      opacity: 0.65,
    });
    const particlePoints = new THREE.Points(particleGeo, particleMat);
    scene.add(particlePoints);
    particleGroupRef.current = particlePoints;

    // Animation Render Loop
    let time = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      time += 0.015;

      // Slow majestic rotation of podium
      podium.rotation.y += 0.003;
      ring.rotation.z += 0.003;

      // Sweep spotlights
      spots.forEach((spot, i) => {
        spot.position.x = Math.sin(time + i * 2) * 6 + (i - 1) * 3;
      });

      // Gently orbit particles
      particlePoints.rotation.y = time * 0.05;

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const newW = canvas.parentElement?.clientWidth || window.innerWidth;
      const newH = canvas.parentElement?.clientHeight || 480;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      podiumGeo.dispose();
      podiumMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
    };
  }, [phase]);

  // 3D Hammer strike animation trigger on SOLD
  const trigger3DGavelStrike = useCallback(() => {
    if (!gavelMeshRef.current) return;
    const hammer = gavelMeshRef.current;
    gsap.timeline()
      .to(hammer.rotation, { x: -0.6, duration: 0.18, ease: 'power2.out' })
      .to(hammer.rotation, {
        x: 0.35,
        duration: 0.1,
        ease: 'power4.in',
        onComplete: () => {
          playSound('gavel_hammer');
          // Pulse the spotlights to gold
          spotlightsRef.current.forEach((spot) => {
            spot.color.setHex(0xf59e0b);
            spot.intensity = 4.5;
            setTimeout(() => {
              spot.intensity = 2.5;
            }, 600);
          });
        },
      })
      .to(hammer.rotation, { x: 0, duration: 0.3, ease: 'back.out(2)' });
  }, [playSound]);

  // Initialize stage when current player changes
  useEffect(() => {
    if (currentPlayer) {
      setCurrentBid(currentPlayer.status === 'sold' ? currentPlayer.soldPrice : currentPlayer.basePrice);
      setLastBidder(currentPlayer.soldTo || null);
      setTimer(15);
      setStatusStamp(currentPlayer.status === 'sold' ? 'SOLD' : currentPlayer.status === 'unsold' ? 'UNSOLD' : null);
      setIsTimerRunning(currentPlayer.status === 'pending');

      // GSAP Entrance animation for player card
      if (playerCardRef.current) {
        gsap.fromTo(
          playerCardRef.current,
          { opacity: 0, scale: 0.88, y: 25, rotateY: 10 },
          { opacity: 1, scale: 1, y: 0, rotateY: 0, duration: 0.5, ease: 'back.out(1.2)' }
        );
      }
    } else {
      setIsTimerRunning(false);
    }
  }, [currentPlayer]);

  // Countdown timer with sound ticks
  useEffect(() => {
    if (isTimerRunning && timer > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            return 0;
          }
          if (prev <= 5) playSound('tick');
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [isTimerRunning, timer, playSound]);

  // Place Bid for a team
  const handlePlaceBid = useCallback((teamName, customAmount = null) => {
    if (!currentPlayer || currentPlayer.status === 'sold' || currentPlayer.status === 'unsold') return;

    const team = teams.find((t) => t.name === teamName);
    if (!team) return;

    const increment = tournament.auctionConfig?.bidIncrement || 0.25;
    const bidValue = customAmount !== null ? customAmount : Math.round((currentBid + increment) * 100) / 100;

    if (team.budget < bidValue) {
      alert(`⚠️ ${team.name} has insufficient budget! Available Purse: ₹${team.budget} Cr`);
      return;
    }

    setCurrentBid(bidValue);
    setLastBidder(team.name);
    setTimer(15);
    setIsTimerRunning(true);
    setPulsingTeam(team.name);
    setTimeout(() => setPulsingTeam(null), 1000);
    playSound('bid');

    // GSAP current bid pulse
    if (currentBidRef.current) {
      gsap.fromTo(
        currentBidRef.current,
        { scale: 1.35, color: '#fbbf24' },
        { scale: 1, color: '#fef08a', duration: 0.35, ease: 'power2.out' }
      );
    }
  }, [currentPlayer, teams, tournament.auctionConfig?.bidIncrement, currentBid, playSound]);

  // AI Auto-Bidding Simulation
  useEffect(() => {
    if (!autoAIBidding || !isTimerRunning || !currentPlayer || currentPlayer.status !== 'pending' || timer <= 2) {
      return;
    }

    const availableTeams = teams.filter((t) => !t.isUserTeam && t.name !== lastBidder && t.budget >= currentBid + 0.25);
    if (availableTeams.length === 0) return;

    const delay = Math.floor(Math.random() * 2200) + 1500;
    aiTimeoutRef.current = setTimeout(() => {
      if (Math.random() > 0.3 && availableTeams.length > 0) {
        const randomTeam = availableTeams[Math.floor(Math.random() * availableTeams.length)];
        handlePlaceBid(randomTeam.name);
      }
    }, delay);

    return () => clearTimeout(aiTimeoutRef.current);
  }, [autoAIBidding, isTimerRunning, currentBid, lastBidder, timer, currentPlayer, handlePlaceBid, teams]);

  // Sell or Unsold action
  const handleFinalizePlayer = async (sold) => {
    if (!currentPlayer || submittingAction) return;

    setSubmittingAction(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/gully-cricket/tournaments/${tournament._id}/auction/sell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          playerId: currentPlayer.id || currentPlayer._id,
          sold: Boolean(sold),
          soldTo: sold ? lastBidder : null,
          soldPrice: sold ? currentBid : 0,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update player status');
      }

      const updated = await res.json();
      setIsTimerRunning(false);
      setStatusStamp(sold ? 'SOLD' : 'UNSOLD');

      if (sold) {
        trigger3DGavelStrike();
        playSound('cheer');
      } else {
        playSound('unsold');
      }

      onUpdate(updated);

      // Auto-advance to next pending player
      setTimeout(() => {
        const nextPendingIdx = updated.auctionPool.findIndex((p) => p.status === 'pending');
        if (nextPendingIdx !== -1) {
          const inFiltered = filteredPool.findIndex(
            (p) => (p.id || p._id) === (updated.auctionPool[nextPendingIdx].id || updated.auctionPool[nextPendingIdx]._id)
          );
          setCurrentIdx(inFiltered !== -1 ? inFiltered : 0);
        } else {
          // If all players are done, suggest final squads review
          setPhase('final_squads');
        }
      }, 2600);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Prepopulate pool with marquee star players
  const handlePreloadMarqueePool = async () => {
    if (!window.confirm('Prepopulate auction pool with 16 premier marquee cricket players?')) return;
    setSubmittingAction(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/gully-cricket/tournaments/${tournament._id}/auction/pool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ players: MARQUEE_STAR_PLAYERS }),
      });
      if (!res.ok) throw new Error('Failed to load sample players');
      const updated = await res.json();
      onUpdate(updated);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Add individual player
  const handleAddPlayerSubmit = async (e) => {
    e.preventDefault();
    if (!newPlayer.name.trim()) return;

    setSubmittingAction(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/gully-cricket/tournaments/${tournament._id}/auction/pool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newPlayer),
      });
      if (!res.ok) throw new Error('Failed to add player');
      const updated = await res.json();
      onUpdate(updated);
      setShowAddPlayerModal(false);
      setNewPlayer({ name: '', role: 'Batsman', category: 'Grade A', country: 'India', basePrice: 1.0, photoUrl: '' });
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Add team directly from lobby
  const handleAddTeamSubmit = async (e) => {
    e.preventDefault();
    if (!newTeam.name.trim()) return;

    setSubmittingAction(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/gully-cricket/tournaments/${tournament._id}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: newTeam.name,
          captain: newTeam.captain,
          viceCaptain: newTeam.viceCaptain,
          budget: newTeam.budget,
          logo: newTeam.logo,
          players: [],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to add team');
      }
      const updated = await res.json();
      onUpdate(updated);
      setShowAddTeamModal(false);
      setNewTeam({ name: '', captain: '', viceCaptain: '', budget: 100, logo: '' });
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Finish Auction & AI Fixture Generation
  const handleFinishAuction = async () => {
    const soldCount = auctionPool.filter((p) => p.status === 'sold').length;
    if (soldCount === 0) {
      alert('⚠️ Please auction and sell at least some players to teams before finishing the auction.');
      return;
    }

    if (!window.confirm('Confirm and Finish Auction? AI will analyze final squads and generate the official IPL tournament schedule!')) {
      return;
    }

    setPhase('finishing');
    setSubmittingAction(true);

    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/gully-cricket/tournaments/${tournament._id}/auction/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to finish auction and generate fixtures');
      }

      const data = await res.json();

      // Allow user to see AI fixture creation celebration
      setTimeout(() => {
        onFinalized(data.tournament);
      }, 3200);
    } catch (err) {
      alert(err.message);
      setPhase('final_squads');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Top 3 Paid Players
  const topPaid = [...auctionPool]
    .filter((p) => p.status === 'sold')
    .sort((a, b) => (b.soldPrice || 0) - (a.soldPrice || 0))
    .slice(0, 3);

  const totalSold = auctionPool.filter((p) => p.status === 'sold').length;
  const totalUnsold = auctionPool.filter((p) => p.status === 'unsold').length;
  const totalPending = auctionPool.filter((p) => p.status === 'pending').length;

  // -------------------------------------------------------------
  // RENDER: FINISHING OVERLAY (AI ANALYZES & GENERATES FIXTURES)
  // -------------------------------------------------------------
  if (phase === 'finishing') {
    return (
      <div className="taa-finishing-screen">
        <div className="taa-finishing-card">
          <div className="taa-finishing-orb">🤖</div>
          <h2 className="taa-finishing-title">AI Team Analysis & Fixture Engine</h2>
          <p className="taa-finishing-sub">
            Evaluating squad depths, player synergies, and generating IPL-style tournament fixtures...
          </p>
          <div className="taa-finishing-loader">
            <div className="taa-finishing-bar" />
          </div>
          <div className="taa-finishing-steps">
            <div className="step-item">✅ Auction Squads Verified & Saved</div>
            <div className="step-item">🧠 AI Strength & Balance Analyzed</div>
            <div className="step-item">📅 Round-Robin League Fixtures Generated</div>
            <div className="step-item">📊 IPL Points Table Initialized</div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: AUCTION LOBBY (PHASE 1)
  // -------------------------------------------------------------
  if (phase === 'lobby') {
    return (
      <div className="taa-lobby-container">
        {/* Lobby Header */}
        <div className="taa-lobby-header">
          <div>
            <span className="taa-badge-ipl">🏏 IPL MEGA AUCTION LOBBY</span>
            <h1 className="taa-lobby-title">{tournament.name} — Player Auction</h1>
            <p className="taa-lobby-desc">
              Review participating franchise teams and the registered player pool before hitting the auction floor.
            </p>
          </div>
          <div className="taa-lobby-cta-row">
            <button
              type="button"
              className="taa-btn-start-auction"
              disabled={teams.length < 2 || auctionPool.length < 2}
              onClick={() => setPhase('live')}
            >
              🚀 Start Live 3D Auction
            </button>
          </div>
        </div>

        {/* Requirements Notification */}
        {(teams.length < 2 || auctionPool.length < 2) && (
          <div className="taa-lobby-alert">
            ℹ️ <strong>To start the auction:</strong> Ensure you have at least 2 teams and at least 2 registered players in the pool.
          </div>
        )}

        {/* Section 1: Participating Franchise Teams */}
        <section className="taa-lobby-section">
          <div className="taa-lobby-section-header">
            <h3>🛡️ Participating Franchise Teams ({teams.length} / {tournament.numberOfTeams})</h3>
            <button
              type="button"
              className="taa-btn-outline"
              onClick={() => setShowAddTeamModal(true)}
              disabled={teams.length >= tournament.numberOfTeams}
            >
              + Register Team
            </button>
          </div>

          <div className="taa-teams-lobby-grid">
            {teams.map((t) => {
              const bought = auctionPool.filter((p) => p.status === 'sold' && p.soldTo === t.name);
              return (
                <div key={t.name} className="taa-lobby-team-card">
                  <div className="taa-lobby-team-top">
                    {t.logo ? (
                      <img src={resolvePhotoUrl(t.logo)} alt={t.name} className="taa-lobby-team-logo" />
                    ) : (
                      <div className="taa-lobby-team-logo placeholder">{t.name.slice(0, 2).toUpperCase()}</div>
                    )}
                    <div>
                      <h4 className="taa-lobby-team-name">{t.name}</h4>
                      <span className="taa-lobby-team-purse">💰 Purse: ₹{Number(t.budget).toFixed(2)} Cr</span>
                    </div>
                  </div>
                  <div className="taa-lobby-team-details">
                    <div>Captain: <strong>{t.captain || 'TBD'}</strong></div>
                    <div>Current Squad: <strong>{bought.length} players</strong></div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 2: Registered Players Pool */}
        <section className="taa-lobby-section" style={{ marginTop: 28 }}>
          <div className="taa-lobby-section-header">
            <h3>👥 Registered Auction Pool ({auctionPool.length} Players)</h3>
            <div style={{ display: 'flex', gap: 10 }}>
              {auctionPool.length === 0 && (
                <button
                  type="button"
                  className="taa-btn-outline gold"
                  onClick={handlePreloadMarqueePool}
                  disabled={submittingAction}
                >
                  ⚡ Preload Marquee Stars
                </button>
              )}
              <button
                type="button"
                className="taa-btn-outline"
                onClick={() => setShowAddPlayerModal(true)}
              >
                + Register Player
              </button>
            </div>
          </div>

          {auctionPool.length === 0 ? (
            <div className="taa-empty-lobby">
              <p>No players registered yet. Add custom players or click <strong>⚡ Preload Marquee Stars</strong> to instantly populate 16 top cricket players!</p>
            </div>
          ) : (
            <div className="taa-players-lobby-grid">
              {auctionPool.map((p, idx) => (
                <div key={p.id || p._id || idx} className="taa-lobby-player-card">
                  <div className="taa-lobby-player-avatar-wrap">
                    <PlayerAvatar
                      name={p.name}
                      photoUrl={p.photoUrl}
                      size={54}
                      allowUpload={true}
                      getToken={getToken}
                      onPhotoUploaded={(url) => {
                        p.photoUrl = url;
                        onUpdate({ ...tournament });
                      }}
                    />
                  </div>
                  <div className="taa-lobby-player-body">
                    <h5 className="taa-lobby-player-name">{p.name}</h5>
                    <div className="taa-lobby-player-tags">
                      <span className="taa-tag-role">{p.role}</span>
                      <span className="taa-tag-cat">{p.category}</span>
                    </div>
                    <div className="taa-lobby-player-price">Base: ₹{Number(p.basePrice).toFixed(2)} Cr</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Modals for Add Player and Add Team */}
        {showAddPlayerModal && renderAddPlayerModal()}
        {showAddTeamModal && renderAddTeamModal()}
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: FINAL SQUADS SHOWCASE (PHASE 3)
  // -------------------------------------------------------------
  if (phase === 'final_squads') {
    return (
      <div className="taa-final-squads-container">
        <header className="taa-final-header">
          <div>
            <span className="taa-badge-ipl">🎉 AUCTION COMPLETED</span>
            <h1 className="taa-lobby-title">Final Tournament Squads</h1>
            <p className="taa-lobby-desc">
              All players have been auctioned. Review franchise rosters and click Finish Auction to generate fixtures and kick off the league!
            </p>
          </div>
          <div className="taa-final-header-actions">
            <button
              type="button"
              className="taa-btn-outline"
              onClick={() => setPhase('live')}
            >
              🔨 Back to Auction Floor
            </button>
            <button
              type="button"
              className="taa-btn-start-auction"
              disabled={submittingAction}
              onClick={handleFinishAuction}
            >
              ✅ Finish Auction & Generate Fixtures
            </button>
          </div>
        </header>

        {/* Franchise Squads Grid */}
        <div className="taa-final-grid">
          {teams.map((t) => {
            const teamPlayers = auctionPool.filter((p) => p.status === 'sold' && p.soldTo === t.name);
            const totalSpent = teamPlayers.reduce((acc, p) => acc + (p.soldPrice || 0), 0);

            return (
              <div key={t.name} className="taa-final-card">
                <div className="taa-final-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {t.logo ? (
                      <img src={resolvePhotoUrl(t.logo)} alt={t.name} className="taa-final-logo" />
                    ) : (
                      <div className="taa-final-logo placeholder">{t.name.slice(0, 2).toUpperCase()}</div>
                    )}
                    <div>
                      <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem' }}>{t.name}</h3>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        Spent: ₹{totalSpent.toFixed(2)} Cr · Purse: ₹{Number(t.budget).toFixed(2)} Cr
                      </span>
                    </div>
                  </div>
                  <span className="taa-squad-count-badge">{teamPlayers.length} Players</span>
                </div>

                <div className="taa-final-squad-list">
                  {teamPlayers.length === 0 ? (
                    <div style={{ padding: '16px', color: '#64748b', textAlign: 'center', fontSize: '0.85rem' }}>
                      No players acquired during auction.
                    </div>
                  ) : (
                    teamPlayers.map((p, idx) => (
                      <div key={p.id || p._id || idx} className="taa-final-player-row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <PlayerAvatar name={p.name} photoUrl={p.photoUrl} size={34} />
                          <div>
                            <div style={{ color: '#f8fafc', fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</div>
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{p.role} · {p.category}</span>
                          </div>
                        </div>
                        <span style={{ color: '#facc15', fontWeight: 800, fontSize: '0.92rem' }}>
                          ₹{Number(p.soldPrice).toFixed(2)} Cr
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: 3D / GSAP LIVE AUCTION ARENA (PHASE 2)
  // -------------------------------------------------------------
  return (
    <div className="taa-container">
      {/* Top Header & Sold Marquee Ticker */}
      <header className="taa-top-bar">
        <div className="taa-logo-area">
          <span style={{ fontSize: '1.6rem' }}>🔨</span>
          <div className="taa-logo-text">
            IPL 3D <span className="highlight">AUCTION ARENA</span>
          </div>
          <span className="taa-header-stats">
            ({totalSold} Sold · {totalUnsold} Unsold · {totalPending} Pending)
          </span>
        </div>

        {/* Live Sold Players Marquee */}
        <div className="taa-sold-marquee">
          <div className="taa-marquee-content">
            {history.filter((h) => h.type === 'sold').length > 0 ? (
              history
                .filter((h) => h.type === 'sold')
                .map((h, i) => (
                  <span key={i} className="taa-sold-chip">
                    <strong>{h.playerName}</strong>
                    <span className="price">₹{Number(h.price).toFixed(2)} Cr</span>
                    <span className="team-badge">{h.teamName}</span>
                  </span>
                ))
            ) : (
              <span style={{ color: '#94a3b8', fontStyle: 'italic', padding: '0 20px' }}>
                🔴 Live Bidding in progress — sold players will stream live here...
              </span>
            )}
          </div>
        </div>

        <div className="taa-top-actions">
          <button
            type="button"
            className="taa-btn-lobby"
            onClick={() => setPhase('lobby')}
          >
            📋 Lobby
          </button>
          <button
            type="button"
            className="taa-btn-finalize"
            onClick={() => setPhase('final_squads')}
          >
            🏆 Review Final Squads
          </button>
        </div>
      </header>

      {/* Main Grid: Pool (Left) - 3D Stage (Center) - Teams/Bids (Right) */}
      <div className="taa-grid">
        {/* LEFT: Player Pool Panel */}
        <section className="taa-pool-panel">
          <div className="taa-pool-header">
            <h3>👥 Player Pool ({auctionPool.length})</h3>
            <button
              type="button"
              className="taa-filter-btn active"
              onClick={() => setShowAddPlayerModal(true)}
            >
              + Add
            </button>
          </div>

          <div className="taa-filter-bar">
            {['All', 'Pending', 'Sold', 'Unsold', 'Batsman', 'Bowler', 'All-Rounder', 'Wicketkeeper'].map((f) => (
              <button
                key={f}
                type="button"
                className={`taa-filter-btn ${selectedFilter === f ? 'active' : ''}`}
                onClick={() => {
                  setSelectedFilter(f);
                  setCurrentIdx(0);
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Top 3 Paid Podium */}
          <div className="taa-top-podium">
            <h4>🏆 Top Paid Stars</h4>
            {topPaid.length > 0 ? (
              topPaid.map((p, idx) => (
                <div key={idx} className="taa-top-player-row">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                    <strong>{p.name}</strong>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>({p.soldTo})</span>
                  </span>
                  <span style={{ color: '#facc15', fontWeight: 800 }}>₹{Number(p.soldPrice).toFixed(2)} Cr</span>
                </div>
              ))
            ) : (
              <div style={{ fontSize: '0.78rem', color: '#64748b', textAlign: 'center', padding: '4px 0' }}>
                Bidding underway...
              </div>
            )}
          </div>

          {/* Scrollable Player List */}
          <ul className="taa-pool-list">
            {filteredPool.map((p, idx) => {
              const isSelected = currentPlayer && (currentPlayer.id || currentPlayer._id) === (p.id || p._id);
              return (
                <li
                  key={p.id || p._id || idx}
                  className={`taa-pool-item ${isSelected ? 'active' : ''} ${p.status === 'sold' ? 'sold' : ''} ${p.status === 'unsold' ? 'unsold' : ''}`}
                  onClick={() => setCurrentIdx(idx)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <PlayerAvatar name={p.name} photoUrl={p.photoUrl} size={32} />
                    <div>
                      <div className="taa-pool-item-name">{p.name}</div>
                      <div className="taa-pool-item-meta">{p.role} · {p.category}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="taa-pool-item-price">
                      ₹{Number(p.status === 'sold' ? p.soldPrice : p.basePrice).toFixed(2)} Cr
                    </span>
                    {p.status === 'sold' && (
                      <span className="taa-status-sub-sold">SOLD: {p.soldTo}</span>
                    )}
                    {p.status === 'unsold' && (
                      <span className="taa-status-sub-unsold">UNSOLD</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* CENTER: 3D THREE.JS AUCTION STAGE */}
        <section className="taa-stage-panel">
          {/* 3D WebGL Canvas Backdrop */}
          <div className="taa-three-stage-wrapper">
            <canvas ref={threeCanvasRef} className="taa-three-canvas" />
          </div>

          {/* Interactive Floating Presentation Card */}
          {currentPlayer ? (
            <div className="taa-stage-card" ref={playerCardRef}>
              <div className="taa-stage-header">
                <span className={`taa-role-badge ${currentPlayer.role.toLowerCase()}`}>{currentPlayer.role}</span>
                <span className="taa-country-tag">
                  <span>🇮🇳</span> {currentPlayer.country || 'India'}
                </span>
              </div>

              {/* Player Visual with Cutout Photo */}
              <div className="taa-player-visual">
                <PlayerAvatar
                  name={currentPlayer.name}
                  photoUrl={currentPlayer.photoUrl}
                  size={140}
                  variant="cutout"
                  allowUpload={true}
                  getToken={getToken}
                  onPhotoUploaded={(url) => {
                    currentPlayer.photoUrl = url;
                    onUpdate({ ...tournament });
                  }}
                />
              </div>

              <h2 className="taa-player-title">{currentPlayer.name}</h2>

              {/* Performance Stats */}
              <div className="taa-stats-grid">
                <div className="taa-stat-cell">
                  <span className="taa-stat-label">Matches</span>
                  <span className="taa-stat-val">{currentPlayer.stats?.mat || 35}</span>
                </div>
                <div className="taa-stat-cell">
                  <span className="taa-stat-label">Runs / Wkts</span>
                  <span className="taa-stat-val">
                    {currentPlayer.stats?.runs || (currentPlayer.stats?.wkt ? `${currentPlayer.stats.wkt} wkt` : 820)}
                  </span>
                </div>
                <div className="taa-stat-cell">
                  <span className="taa-stat-label">Average</span>
                  <span className="taa-stat-val">{currentPlayer.stats?.avg || 34.5}</span>
                </div>
                <div className="taa-stat-cell">
                  <span className="taa-stat-label">Strike Rate</span>
                  <span className="taa-stat-val">{currentPlayer.stats?.sr || 140.2}</span>
                </div>
              </div>

              {/* Bid & Timer Box */}
              <div className="taa-bid-panel">
                <div className="taa-box">
                  <span className="taa-box-label">Base Price</span>
                  <span className="taa-box-val">₹{Number(currentPlayer.basePrice).toFixed(2)} Cr</span>
                </div>

                <div className="taa-box taa-box-highlight">
                  <span className="taa-box-label">Current Bid</span>
                  <span className="taa-box-val taa-box-val-gold" ref={currentBidRef}>
                    ₹{Number(currentBid).toFixed(2)} Cr
                  </span>
                  <span className="taa-box-sub">
                    {lastBidder ? `Led by ${lastBidder}` : 'Opening Bid'}
                  </span>
                </div>

                <div className="taa-box">
                  <span className="taa-box-label">Timer</span>
                  <div className="taa-timer-ring">
                    <svg width="56" height="56" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="28" cy="28" r="24" fill="none" stroke="#1e293b" strokeWidth="4" />
                      <circle
                        cx="28"
                        cy="28"
                        r="24"
                        fill="none"
                        stroke={timer <= 4 ? '#ef4444' : '#10b981'}
                        strokeWidth="4"
                        strokeDasharray={150}
                        strokeDashoffset={150 - (timer / 15) * 150}
                        style={{ transition: 'stroke-dashoffset 1s linear' }}
                      />
                    </svg>
                    <span className="taa-timer-number">{timer}</span>
                  </div>
                </div>
              </div>

              {/* SOLD / UNSOLD Dramatic Stamp */}
              {statusStamp && (
                <div
                  ref={soldStampRef}
                  className={`taa-status-stamp ${statusStamp === 'SOLD' ? 'taa-stamp-sold' : 'taa-stamp-unsold'}`}
                >
                  {statusStamp}
                  {statusStamp === 'SOLD' && lastBidder && (
                    <div style={{ fontSize: '0.9rem', marginTop: 4, letterSpacing: '1px' }}>TO {lastBidder}</div>
                  )}
                </div>
              )}

              {/* Stage Controls: Hammer Sold, Pass, Timer Reset, AI Battle */}
              <div className="taa-stage-actions">
                {currentPlayer.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      className="taa-btn-hammer"
                      disabled={submittingAction || !lastBidder}
                      onClick={() => handleFinalizePlayer(true)}
                    >
                      🔨 SOLD {lastBidder ? `to ${lastBidder}` : ''}
                    </button>
                    <button
                      type="button"
                      className="taa-btn-pass"
                      disabled={submittingAction}
                      onClick={() => handleFinalizePlayer(false)}
                    >
                      ❌ Mark UNSOLD
                    </button>
                    <button
                      type="button"
                      className="taa-btn-pass"
                      onClick={() => {
                        setTimer(15);
                        setIsTimerRunning(true);
                      }}
                    >
                      ⏱️ Reset Clock
                    </button>
                  </>
                )}

                <button
                  type="button"
                  className={`taa-btn-ai-toggle ${autoAIBidding ? 'active' : ''}`}
                  onClick={() => setAutoAIBidding((prev) => !prev)}
                >
                  🤖 {autoAIBidding ? 'AI Bidding: ON' : 'AI Bidding: OFF'}
                </button>
              </div>
            </div>
          ) : (
            <div className="taa-stage-card empty-card">
              <span style={{ fontSize: '3.5rem', marginBottom: 10 }}>🎉</span>
              <h2>All Players Auctioned!</h2>
              <p style={{ color: '#94a3b8', margin: '10px 0 20px 0' }}>
                Every player in the pool has been processed. Review franchise rosters and finalize squads!
              </p>
              <button
                type="button"
                className="taa-btn-start-auction"
                onClick={() => setPhase('final_squads')}
              >
                🏆 View Final Squads & Continue
              </button>
            </div>
          )}
        </section>

        {/* RIGHT: Live Franchise Teams & Bidding Controls */}
        <section className="taa-teams-panel">
          <div className="taa-teams-panel-header">
            <h3>🛡️ Franchise Bidding Deck</h3>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{teams.length} Teams</span>
          </div>

          {teams.map((t) => {
            const boughtPlayers = auctionPool.filter((p) => p.status === 'sold' && p.soldTo === t.name);
            const isPulsing = pulsingTeam === t.name;
            const isLastBidder = lastBidder === t.name;

            return (
              <div
                key={t.name}
                className={`taa-team-card ${isPulsing ? 'pulse' : ''} ${isLastBidder ? 'leading' : ''}`}
                onClick={() => setViewTeamModal(t)}
              >
                <div className="taa-team-row">
                  <div className="taa-team-info">
                    {t.logo ? (
                      <img src={resolvePhotoUrl(t.logo)} alt={t.name} className="taa-team-logo" />
                    ) : (
                      <div className="taa-team-logo placeholder">{t.name.slice(0, 2).toUpperCase()}</div>
                    )}
                    <div>
                      <div className="taa-team-name">
                        {t.name}
                        {isLastBidder && <span className="taa-lead-tag">TOP BIDDER</span>}
                      </div>
                      <div className="taa-team-sub">
                        Squad: <strong>{boughtPlayers.length}</strong> players
                      </div>
                    </div>
                  </div>
                  <div className="taa-team-purse">
                    ₹{Number(t.budget).toFixed(2)} Cr
                  </div>
                </div>

                {/* Instant Live Bid Triggers */}
                {currentPlayer && currentPlayer.status === 'pending' && (
                  <div className="taa-team-controls" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="taa-bid-btn"
                      disabled={t.budget < currentBid + 0.25}
                      onClick={() => handlePlaceBid(t.name, Math.round((currentBid + 0.25) * 100) / 100)}
                    >
                      +0.25 Cr
                    </button>
                    <button
                      type="button"
                      className="taa-bid-btn"
                      disabled={t.budget < currentBid + 0.5}
                      onClick={() => handlePlaceBid(t.name, Math.round((currentBid + 0.5) * 100) / 100)}
                    >
                      +0.50 Cr
                    </button>
                    <button
                      type="button"
                      className="taa-bid-btn"
                      disabled={t.budget < currentBid + 1.0}
                      onClick={() => handlePlaceBid(t.name, Math.round((currentBid + 1.0) * 100) / 100)}
                    >
                      +1.00 Cr
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </div>

      {/* Team Details Modal (Live Squad Inspection) */}
      {viewTeamModal && (
        <div className="taa-modal-overlay" onClick={() => setViewTeamModal(null)}>
          <div className="taa-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {viewTeamModal.logo && (
                  <img src={resolvePhotoUrl(viewTeamModal.logo)} alt={viewTeamModal.name} style={{ width: 44, height: 44, borderRadius: '50%' }} />
                )}
                <div>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '1.25rem' }}>{viewTeamModal.name}</h3>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>
                    Remaining Purse: ₹{Number(viewTeamModal.budget).toFixed(2)} Cr
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="taa-close-btn"
                onClick={() => setViewTeamModal(null)}
              >
                ✕
              </button>
            </div>

            <h4 style={{ margin: '14px 0 6px 0', color: '#94a3b8' }}>
              Purchased Squad ({auctionPool.filter((p) => p.status === 'sold' && p.soldTo === viewTeamModal.name).length} Players)
            </h4>

            <div style={{ maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {auctionPool
                .filter((p) => p.status === 'sold' && p.soldTo === viewTeamModal.name)
                .map((p, idx) => (
                  <div key={idx} className="taa-modal-player-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <PlayerAvatar name={p.name} photoUrl={p.photoUrl} size={36} />
                      <div>
                        <strong style={{ color: '#fff' }}>{p.name}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{p.role} · {p.category}</div>
                      </div>
                    </div>
                    <span style={{ color: '#facc15', fontWeight: 800 }}>₹{Number(p.soldPrice).toFixed(2)} Cr</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Modals for Adding Player / Team */}
      {showAddPlayerModal && renderAddPlayerModal()}
      {showAddTeamModal && renderAddTeamModal()}
    </div>
  );

  // Helper renderers for Modals
  function renderAddPlayerModal() {
    return (
      <div className="taa-modal-overlay" onClick={() => setShowAddPlayerModal(false)}>
        <div className="taa-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
          <h3 style={{ margin: 0, color: '#fff' }}>+ Register Player for Auction</h3>
          <form onSubmit={handleAddPlayerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="gc-field-label">Player Name</label>
              <input
                type="text"
                required
                value={newPlayer.name}
                onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                placeholder="e.g. Ram"
                className="taa-form-input"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="gc-field-label">Role</label>
                <select
                  value={newPlayer.role}
                  onChange={(e) => setNewPlayer({ ...newPlayer, role: e.target.value })}
                  className="taa-form-input"
                >
                  <option>Batsman</option>
                  <option>Bowler</option>
                  <option>All-Rounder</option>
                  <option>Wicketkeeper</option>
                </select>
              </div>
              <div>
                <label className="gc-field-label">Base Price (Cr)</label>
                <input
                  type="number"
                  step="0.25"
                  min="0.2"
                  value={newPlayer.basePrice}
                  onChange={(e) => setNewPlayer({ ...newPlayer, basePrice: Number(e.target.value) })}
                  className="taa-form-input"
                />
              </div>
            </div>

            <div>
              <label className="gc-field-label">Permanent Profile Photo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <PlayerAvatar
                  name={newPlayer.name || 'New Player'}
                  photoUrl={newPlayer.photoUrl}
                  size={48}
                  allowUpload={true}
                  getToken={getToken}
                  onPhotoUploaded={(url) => setNewPlayer({ ...newPlayer, photoUrl: url })}
                />
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Click avatar to upload photo. It will save permanently!
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button
                type="button"
                className="ls-btn-secondary"
                onClick={() => setShowAddPlayerModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="gc-submit-btn" disabled={submittingAction}>
                Add to Auction Pool
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  function renderAddTeamModal() {
    return (
      <div className="taa-modal-overlay" onClick={() => setShowAddTeamModal(false)}>
        <div className="taa-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
          <h3 style={{ margin: 0, color: '#fff' }}>+ Register Franchise Team</h3>
          <form onSubmit={handleAddTeamSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="gc-field-label">Team Name</label>
              <input
                type="text"
                required
                value={newTeam.name}
                onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                placeholder="e.g. Mumbai Kings"
                className="taa-form-input"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="gc-field-label">Captain (optional)</label>
                <input
                  type="text"
                  value={newTeam.captain}
                  onChange={(e) => setNewTeam({ ...newTeam, captain: e.target.value })}
                  placeholder="e.g. Rohit"
                  className="taa-form-input"
                />
              </div>
              <div>
                <label className="gc-field-label">Purse Budget (Cr)</label>
                <input
                  type="number"
                  min="20"
                  max="500"
                  value={newTeam.budget}
                  onChange={(e) => setNewTeam({ ...newTeam, budget: Number(e.target.value) })}
                  className="taa-form-input"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button
                type="button"
                className="ls-btn-secondary"
                onClick={() => setShowAddTeamModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="gc-submit-btn" disabled={submittingAction}>
                Register Team
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
}
