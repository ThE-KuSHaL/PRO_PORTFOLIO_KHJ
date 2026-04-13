'use client';
// components/hero/GlitchName.tsx
import { useEffect, useRef } from 'react';

export default function GlitchName() {
  const elRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    el.classList.add('glitch-active');
    const t = setTimeout(() => el.classList.remove('glitch-active'), 1800);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <style>{`
        .glitch-name {
          position: relative;
          font-size: clamp(2.2rem, 5vw, 3.8rem);
          font-weight: 700;
          letter-spacing: -0.02em;
          line-height: 1.05;
          color: #f0f4ff;
          text-shadow:
            3px 3px 0 rgba(99,102,241,0.28),
            6px 6px 0 rgba(6,182,212,0.1);
        }
        .glitch-name::before,
        .glitch-name::after {
          content: attr(data-text);
          position: absolute;
          inset: 0;
          opacity: 0;
        }
        .glitch-active::before {
          animation: glitch 0.22s steps(2) 6;
          opacity: 0.7;
          color: #06b6d4;
        }
        .glitch-active::after {
          animation: glitch 0.22s steps(2) reverse 6;
          opacity: 0.7;
          color: #6366f1;
        }
      `}</style>
      <h1
        ref={elRef}
        className="glitch-name"
        data-text="KUSHAL H J"
      >
        KUSHAL H J
      </h1>
    </>
  );
}
