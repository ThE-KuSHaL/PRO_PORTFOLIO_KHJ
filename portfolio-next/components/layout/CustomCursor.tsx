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

    // Position follows the mouse, at most once per frame. The sway, hover and press looks are CSS
    // (globals.css, ".cur"), so nothing here runs while the mouse rests.
    let mx = -200, my = -200;
    let raf: number | null = null;
    const place = () => { raf = null; el.style.transform = `translate3d(${mx}px,${my}px,0)`; };

    // ── Event listeners — all passive or minimal ──
    const onMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; if (raf === null) raf = requestAnimationFrame(place); };

    const onEnter = () => { el.style.opacity = '1'; };
    const onLeave = () => { el.style.opacity = '0'; };
    const onDown  = () => { el.dataset.down = 'true'; };
    const onUp    = () => { el.dataset.down = 'false'; };

    const onHoverIn  = () => { el.dataset.hover = 'true'; };
    const onHoverOut = () => { el.dataset.hover = 'false'; };

    // Use delegation — works for all dynamically mounted elements too
    const onOver = (e: MouseEvent) => {
      const t = e.target as Element;
      if (t.closest('a, button, [data-cursor]')) onHoverIn();
    };
    const onOut = (e: MouseEvent) => {
      const t = e.target as Element;
      if (t.closest('a, button, [data-cursor]')) onHoverOut();
    };

    window.addEventListener('mousemove',   onMove,  { passive: true });
    document.addEventListener('mouseenter', onEnter);
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mousedown',  onDown);
    document.addEventListener('mouseup',    onUp);
    document.addEventListener('mouseover',  onOver);
    document.addEventListener('mouseout',   onOut);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseenter', onEnter);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout', onOut);
    };
  }, []);

  if (isTouchDevice) return null;

  // Static markup — never re-renders
  return (
    <div
      ref={containerRef}
      className="cur"
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
      <div className="cur-dot" />
      <div className="cur-arm cur-up" />
      <div className="cur-arm cur-right" />
      <div className="cur-arm cur-down" />
      <div className="cur-arm cur-left" />
    </div>
  );
}
