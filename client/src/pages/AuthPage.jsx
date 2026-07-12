import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SignIn, useAuth } from '@clerk/clerk-react';
import gsap from 'gsap';
import { Shield, Sparkles, Mail } from 'lucide-react';
import '../styles/AuthPage.css';

function AuthPage() {
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const containerRef = useRef(null);
  const cardRef = useRef(null);

  const from = location.state?.from?.pathname || '/polls';

  useEffect(() => {
    if (isSignedIn) {
      navigate(from, { replace: true });
    }
  }, [isSignedIn, navigate, from]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.auth-bg-orb', {
        scale: 0,
        opacity: 0,
        duration: 1,
        stagger: 0.2,
        ease: 'power2.out',
      });

      gsap.from(cardRef.current, {
        y: 60,
        opacity: 0,
        scale: 0.95,
        duration: 0.8,
        ease: 'power3.out',
        delay: 0.2,
      });

      gsap.from('.auth-logo', {
        y: -20,
        opacity: 0,
        duration: 0.6,
        delay: 0.5,
      });

      gsap.from('.auth-header > *', {
        y: 30,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        delay: 0.6,
      });

      gsap.from('.auth-feature-pill', {
        x: -20,
        opacity: 0,
        duration: 0.5,
        stagger: 0.08,
        delay: 1.1,
      });

      gsap.to('.auth-ring', {
        rotation: 360,
        duration: 25,
        repeat: -1,
        ease: 'none',
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="auth-container" ref={containerRef}>
      <div className="auth-bg">
        <div className="auth-bg-orb orb-a" />
        <div className="auth-bg-orb orb-b" />
        <div className="auth-ring" />
      </div>

      <div className="auth-layout">
        <div className="auth-side-panel">
          <div className="auth-logo">
            <span>⚡</span>
            <h2>LivePoll</h2>
          </div>
          <h3 className="auth-side-title">
            Predict. Vote. <span>Win Credits.</span>
          </h3>
          <p className="auth-side-desc">
            Secure sign-in powered by Clerk. Join thousands of voters making
            real-time predictions.
          </p>
          <div className="auth-feature-pills">
            <div className="auth-feature-pill">
              <Shield size={16} />
              Clerk Secured
            </div>
            <div className="auth-feature-pill">
              <Sparkles size={16} />
              20 Credits / Win
            </div>
            <div className="auth-feature-pill">
              <Mail size={16} />
              Email Notifications
            </div>
          </div>
        </div>

        <div className="auth-card" ref={cardRef}>
          <SignIn
            routing="path"
            path="/login"
            signUpUrl="/login"
            fallbackRedirectUrl={from}
            appearance={{
              variables: {
                colorPrimary: '#8b85ff',
                colorBackground: 'transparent',
                colorText: '#ffffff',
              },
              elements: {
                card: { boxShadow: 'none', background: 'transparent' },
                headerTitle: { color: '#ffffff' },
                headerSubtitle: { color: '#a0a0a0' },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
