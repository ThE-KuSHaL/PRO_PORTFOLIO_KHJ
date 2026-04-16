'use client';
// components/layout/CustomCursor.tsx
// Fully Direct-DOM implementation — zero React re-renders on move/hover/click
// All animation runs on a single rAF loop for max responsiveness
import { useEffect, useRef, useState } from 'react';

export default function CustomCursor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // Disable on touch/coarse-pointer devices (phones, tablets)
    if (window.matchMedia('(pointer: coarse)').matches) {
      setIsTouchDevice(true);
      document.body.style.cursor = 'auto';
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    // ── State tracked as plain refs (no React re-renders) ──
    let mx = -200, my = -200;          // mouse position
    let isHover   = false;
    let isDown    = false;
    let raf: number | null = null;

    // Arm sway state — 4 arms, each with its own phase clock
    const armPhases = [0, 0.4, 0.8, 0.2].map(p => p * Math.PI * 2);
    const armSpeeds = [2.8, 3.2, 2.6, 3.5].map(s => (Math.PI * 2) / s);
    let t = 0;
    let lastTs = performance.now();

    // ── DOM refs for every moving part ──
    const dot  = el.querySelector<HTMLElement>('.cur-dot')!;
    const arms = Array.from(el.querySelectorAll<HTMLElement>('.cur-arm'));

    function tick(ts: number) {
      const dt = Math.min((ts - lastTs) / 1000, 0.05); // seconds, capped
      lastTs = ts;
      t += dt;

      if (!el) return;

      // Move container to exact pointer position — translate3d = GPU composited
      el.style.transform = `translate3d(${mx}px,${my}px,0)`;

      const perpAmp  = isHover ? 1.6 : 0.8;
      const rotAmp   = isHover ? 2.2 : 1.1;
      const clickScl = isDown  ? 0   : 1;

      arms.forEach((arm, i) => {
        const vert = i < 2; // up=0, right=1, down=2, left=3
        const phase  = armPhases[i] + t * armSpeeds[i];
        const drift  = Math.sin(phase) * perpAmp;
        const rot    = Math.cos(phase) * rotAmp;
        const scaleY = vert  ? (isDown ? 0 : 1) : 1;
        const scaleX = !vert ? (isDown ? 0 : 1) : 1;

        const tx = vert  ? drift : 0;
        const ty = !vert ? drift : 0;

        arm.style.transform = isDown
          ? `translate(${tx}px,${ty}px) rotate(${rot}deg) scaleX(${scaleX}) scaleY(${scaleY})`
          : `translate(${tx}px,${ty}px) rotate(${rot}deg) scaleX(${scaleX * clickScl}) scaleY(${scaleY * clickScl})`;
      });

      // Dot: scale up when hovering
      const dotScale = isDown ? 0.5 : (isHover ? 1.8 : 1);
      dot.style.transform = `translate(-50%,-50%) scale(${dotScale})`;
      dot.style.boxShadow = isHover
        ? '0 0 0 2px rgba(6,182,212,0.35), 0 0 12px rgba(6,182,212,0.6)'
        : isDown ? 'none'
        : '0 0 6px #06b6d4';

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);

    // ── Event listeners — all passive or minimal ──
    const onMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };

    const onEnter = () => { el.style.opacity = '1'; };
    const onLeave = () => { el.style.opacity = '0'; };
    const onDown  = () => { isDown = true; };
    const onUp    = () => { isDown = false; };

    const onHoverIn  = () => { isHover = true; };
    const onHoverOut = () => { isHover = false; };

    window.addEventListener('mousemove',   onMove,  { passive: true });
    document.addEventListener('mouseenter', onEnter);
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mousedown',  onDown);
    document.addEventListener('mouseup',    onUp);

    // Use delegation instead of per-element listeners — much cheaper
    document.addEventListener('mouseover', (e) => {
      const t = e.target as Element;
      if (t.closest('a, button, [data-cursor]')) onHoverIn();
    });
    document.addEventListener('mouseout', (e) => {
      const t = e.target as Element;
      if (t.closest('a, button, [data-cursor]')) onHoverOut();
    });

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseenter', onEnter);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  if (isTouchDevice) return null;

  // Static markup — never re-renders
  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{
        position: 'fixed', top: 0, left: 0,
        width: 0, height: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        willChange: 'transform',
        opacity: 0,                  // starts hidden, shown on first mouseenter
        transition: 'opacity 0.15s',
      }}
    >
      {/* Center dot */}
      <div
        className="cur-dot"
        style={{
          position: 'absolute',
          width: 5, height: 5,
          borderRadius: '50%',
          background: '#06b6d4',
          willChange: 'transform, box-shadow',
          transition: 'box-shadow 60ms linear',
        }}
      />

      {/* Up arm */}
      <div className="cur-arm" style={{
        position: 'absolute', background: '#06b6d4',
        width: 1.5, height: 11, left: -0.75, bottom: 5,
        transformOrigin: 'bottom center',
        willChange: 'transform',
      }} />

      {/* Right arm */}
      <div className="cur-arm" style={{
        position: 'absolute', background: '#06b6d4',
        height: 1.5, width: 11, top: -0.75, left: 5,
        transformOrigin: 'left center',
        willChange: 'transform',
      }} />

      {/* Down arm */}
      <div className="cur-arm" style={{
        position: 'absolute', background: '#06b6d4',
        width: 1.5, height: 11, left: -0.75, top: 5,
        transformOrigin: 'top center',
        willChange: 'transform',
      }} />

      {/* Left arm */}
      <div className="cur-arm" style={{
        position: 'absolute', background: '#06b6d4',
        height: 1.5, width: 11, top: -0.75, right: 5,
        transformOrigin: 'right center',
        willChange: 'transform',
      }} />
    </div>
  );
}
