'use client';
// components/hero/TypewriterRoles.tsx
import { useEffect, useRef } from 'react';

const ROLES = [
  'Budding Entrepreneur',
  'AI-Powered Builder',
  'IoT Engineer · CAD Specialist',
  'Backend Developer',
];

export default function TypewriterRoles() {
  const elRef = useRef<HTMLSpanElement>(null);
  const state = useRef({ ri: 0, ci: 0, del: false });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function tick() {
      const el = elRef.current;
      if (!el) return;
      const { ri, ci, del } = state.current;
      const role = ROLES[ri];
      if (!del) {
        el.textContent = role.slice(0, ci + 1);
        if (ci + 1 === role.length) {
          state.current = { ri, ci: ci + 1, del: false };
          timer = setTimeout(() => { state.current.del = true; tick(); }, 2000);
        } else {
          state.current = { ri, ci: ci + 1, del: false };
          timer = setTimeout(tick, 68);
        }
      } else {
        el.textContent = role.slice(0, ci - 1);
        if (ci - 1 === 0) {
          state.current = { ri: (ri + 1) % ROLES.length, ci: 0, del: false };
          timer = setTimeout(tick, 400);
        } else {
          state.current = { ri, ci: ci - 1, del: true };
          timer = setTimeout(tick, 36);
        }
      }
    }
    const init = setTimeout(tick, 3400);
    return () => { clearTimeout(init); clearTimeout(timer); };
  }, []);

  return (
    <p
      style={{
        fontSize: 'clamp(0.9rem, 1.8vw, 1.1rem)',
        color: '#06b6d4',
        fontWeight: 500,
        minHeight: '1.5em',
        letterSpacing: '0.01em',
      }}
      aria-live="polite"
      aria-label="Current role"
    >
      <span ref={elRef} />
      <span
        style={{
          display: 'inline-block',
          width: 2,
          height: '1em',
          background: '#06b6d4',
          marginLeft: 2,
          verticalAlign: 'text-bottom',
          animation: 'blink 0.9s step-end infinite',
        }}
      />
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </p>
  );
}
