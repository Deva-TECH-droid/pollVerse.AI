import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import '../styles/LandingPage.css';

gsap.registerPlugin(ScrollTrigger);

const FEATURES = [
  {
    icon: '🔐',
    title: 'Secure Authentication',
    desc: 'JWT-based registration and login keep your account safe and sessions secure.',
  },
  {
    icon: '📧',
    title: 'Email Notifications',
    desc: 'Get notified automatically when a new poll is created and stay in the loop.',
  },
  {
    icon: '🗳️',
    title: 'One-Time Voting',
    desc: 'Cast a single vote per poll with live vote counts and real-time percentages.',
  },
  {
    icon: '⏳',
    title: 'Auto Poll Closing',
    desc: 'Polls close automatically after a set duration — e.g. 12 hours — no manual work.',
  },
  {
    icon: '🏆',
    title: 'Winner Declaration',
    desc: 'The winning option is declared automatically based on the highest vote count.',
  },
  {
    icon: '🎁',
    title: 'Prediction Rewards',
    desc: 'Earn 20 credits for every correct prediction you make on closed polls.',
  },
  {
    icon: '📨',
    title: 'Winner Emails',
    desc: 'Congratulatory emails are sent to users who voted for the winning option.',
  },
  {
    icon: '🌟',
    title: 'Milestone Rewards',
    desc: 'Unlock special milestone rewards after reaching 200 credits.',
  },
  {
    icon: '👨‍💼',
    title: 'Admin Dashboard',
    desc: 'Create, manage, and monitor all polls from a powerful admin dashboard.',
  },
  {
    icon: '📊',
    title: 'User Dashboard',
    desc: 'Track your votes, credits, and full prediction history in one place.',
  },
  {
    icon: '📱',
    title: 'Fully Responsive',
    desc: 'Beautiful, user-friendly interface across desktop, tablet, and mobile.',
  },
  {
    icon: '☁️',
    title: 'MERN Stack',
    desc: 'Built with MongoDB Atlas, JWT, Nodemailer, and Cloudinary on the MERN stack.',
  },
];

const STEPS = [
  { num: '01', title: 'Sign Up & Login', desc: 'Register with your email and verify via OTP — no password needed.' },
  { num: '02', title: 'Browse Live Polls', desc: 'Explore active polls, see live vote counts, and pick your prediction.' },
  { num: '03', title: 'Cast Your Vote', desc: 'Vote once per poll. Results update in real time via WebSockets.' },
  { num: '04', title: 'Earn Credits', desc: 'When the poll closes, correct predictions earn you 20 credits each.' },
];

function LandingPage() {
  const containerRef = useRef(null);
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const stepsRef = useRef(null);
  const ctaRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.from('.landing-bg-orb', {
        scale: 0,
        opacity: 0,
        duration: 1.2,
        stagger: 0.2,
      })
        .from('.hero-badge', { y: 30, opacity: 0, duration: 0.6 }, '-=0.6')
        .from('.hero-title .word', { y: 80, opacity: 0, rotateX: -40, duration: 0.8, stagger: 0.12 }, '-=0.4')
        .from('.hero-subtitle', { y: 30, opacity: 0, duration: 0.7 }, '-=0.3')
        .from('.hero-desc', { y: 20, opacity: 0, duration: 0.6 }, '-=0.4')
        .from('.hero-actions .btn', { y: 30, opacity: 0, duration: 0.6, stagger: 0.15 }, '-=0.3')
        .from('.hero-stats .stat', { y: 20, opacity: 0, duration: 0.5, stagger: 0.1 }, '-=0.2')
        .from('.hero-visual', { x: 60, opacity: 0, duration: 1 }, '-=0.8');

      gsap.to('.hero-visual-ring', {
        rotation: 360,
        duration: 20,
        repeat: -1,
        ease: 'none',
      });

      gsap.to('.hero-visual-pulse', {
        scale: 1.15,
        opacity: 0.4,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      gsap.from('.section-label', {
        scrollTrigger: { trigger: '.how-section', start: 'top 80%' },
        y: 30,
        opacity: 0,
        duration: 0.6,
      });

      gsap.from('.step-card', {
        scrollTrigger: { trigger: stepsRef.current, start: 'top 75%' },
        y: 60,
        opacity: 0,
        duration: 0.7,
        stagger: 0.15,
      });

      gsap.from('.features-header', {
        scrollTrigger: { trigger: featuresRef.current, start: 'top 80%' },
        y: 40,
        opacity: 0,
        duration: 0.7,
      });

      gsap.from('.feature-card', {
        scrollTrigger: { trigger: '.features-grid', start: 'top 80%' },
        y: 50,
        opacity: 0,
        duration: 0.6,
        stagger: 0.08,
      });

      gsap.from('.cta-content > *', {
        scrollTrigger: { trigger: ctaRef.current, start: 'top 80%' },
        y: 40,
        opacity: 0,
        duration: 0.7,
        stagger: 0.12,
      });

      gsap.to('.floating-poll', {
        y: -15,
        duration: 2.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        stagger: { each: 0.4, from: 'random' },
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="landing-page" ref={containerRef}>
      <div className="landing-bg">
        <div className="landing-bg-orb orb-1" />
        <div className="landing-bg-orb orb-2" />
        <div className="landing-bg-orb orb-3" />
        <div className="landing-bg-grid" />
      </div>

      {/* Hero */}
      <section className="landing-hero" ref={heroRef}>
        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-dot" />
            Real-Time Voting Platform
          </div>

          <h1 className="hero-title">
            <span className="word">Predict.</span>{' '}
            <span className="word">Vote.</span>{' '}
            <span className="word accent-word">Win.</span>
          </h1>

          <p className="hero-subtitle">Welcome to LivePoll</p>

          <p className="hero-desc">
            A next-generation real-time polling platform where your predictions matter.
            Vote on live polls, watch results update instantly, earn credits for correct
            predictions, and compete on the leaderboard — all powered by the MERN stack.
          </p>

          <div className="hero-actions">
            <Link to="/login" className="btn btn-primary">
              <span>Login / Sign Up</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <Link to="/polls" className="btn btn-secondary">
              Browse Live Polls
            </Link>
          </div>

          <div className="hero-stats">
            <div className="stat">
              <span className="stat-value">Live</span>
              <span className="stat-label">Real-Time Results</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <span className="stat-value">20+</span>
              <span className="stat-label">Credits Per Win</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <span className="stat-value">JWT</span>
              <span className="stat-label">Secure Auth</span>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-visual-ring" />
          <div className="hero-visual-pulse" />
          <div className="floating-poll poll-1">
            <span>🗳️</span>
            <div>
              <strong>Who wins the match?</strong>
              <div className="mini-bar"><div style={{ width: '72%' }} /></div>
              <small>72% · Live</small>
            </div>
          </div>
          <div className="floating-poll poll-2">
            <span>🏆</span>
            <div>
              <strong>+20 Credits!</strong>
              <small>Correct prediction</small>
            </div>
          </div>
          <div className="floating-poll poll-3">
            <span>⏳</span>
            <div>
              <strong>Closes in 4h</strong>
              <small>Auto-close enabled</small>
            </div>
          </div>
          <div className="hero-visual-center">
            <span>⚡</span>
            <p>LivePoll</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="how-section" ref={stepsRef}>
        <span className="section-label">How It Works</span>
        <h2 className="section-title">From Sign-Up to Rewards in 4 Steps</h2>
        <p className="section-desc">
          LivePoll makes voting simple, fair, and rewarding. Here's how the platform works end to end.
        </p>
        <div className="steps-grid">
          {STEPS.map((step) => (
            <div className="step-card" key={step.num}>
              <span className="step-num">{step.num}</span>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="features-section" ref={featuresRef}>
        <div className="features-header">
          <span className="section-label">Features</span>
          <h2 className="section-title">Everything You Need to Vote & Win</h2>
          <p className="section-desc">
            Packed with powerful features for voters, admins, and everyone in between.
          </p>
        </div>
        <div className="features-grid">
          {FEATURES.map((f) => (
            <div className="feature-card" key={f.title}>
              <span className="feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section" ref={ctaRef}>
        <div className="cta-content">
          <h2>Ready to make your first prediction?</h2>
          <p>Join LivePoll today — vote on live polls, earn credits, and climb the leaderboard.</p>
          <div className="hero-actions">
            <Link to="/login" className="btn btn-primary btn-lg">
              <span>Get Started — It's Free</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <Link to="/polls" className="btn btn-secondary btn-lg">
              View Active Polls
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;
