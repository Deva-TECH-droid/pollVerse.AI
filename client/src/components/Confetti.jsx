import React, { useMemo } from 'react';
import '../styles/Confetti.css';

function Confetti() {
  const particles = useMemo(() => {
    const colors = ['#6c63ff', '#8b85ff', '#f59e0b', '#22c55e', '#ef4444', '#0ea5e9', '#d946ef', '#fde047'];
    return Array.from({ length: 80 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 2.2 + Math.random() * 1.8,
      color: colors[i % colors.length],
      rotate: Math.random() * 360,
      width: 6 + Math.random() * 6,
      height: 10 + Math.random() * 6,
      drift: (Math.random() - 0.5) * 200,
    }));
  }, []);

  return (
    <div className="confetti-container" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            width: `${p.width}px`,
            height: `${p.height}px`,
            transform: `rotate(${p.rotate}deg)`,
            '--drift': `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}

export default Confetti;