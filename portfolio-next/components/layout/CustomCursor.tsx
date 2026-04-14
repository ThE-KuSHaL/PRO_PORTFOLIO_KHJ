'use client';
// components/layout/CustomCursor.tsx
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

type ArmId = 'up' | 'right' | 'down' | 'left';

const ARMS: { id: ArmId; dur: number; delay: number }[] = [
  { id: 'up',    dur: 2.8, delay: 0   },
  { id: 'right', dur: 3.2, delay: 0.4 },
  { id: 'down',  dur: 2.6, delay: 0.8 },
  { id: 'left',  dur: 3.5, delay: 0.2 },
];

const isVertical = (id: ArmId) => id === 'up' || id === 'down';

const ARM_LENGTH = 10; // px
const ARM_GAP    = 3;  // gap from dot edge

function armStyle(id: ArmId): React.CSSProperties {
  const vert = isVertical(id);
  const base: React.CSSProperties = {
    position: 'absolute',
    background: '#06b6d4',
    willChange: 'transform',
  };
  if (vert) {
    return { ...base, width: 1.5, height: ARM_LENGTH,
      left: -0.75,
      ...(id === 'up' ? { bottom: ARM_GAP + 2 } : { top: ARM_GAP + 2 }) };
  } else {
    return { ...base, height: 1.5, width: ARM_LENGTH,
      top: -0.75,
      ...(id === 'left' ? { right: ARM_GAP + 2 } : { left: ARM_GAP + 2 }) };
  }
}

function originFor(id: ArmId): string {
  switch (id) {
    case 'up':    return 'bottom center';
    case 'down':  return 'top center';
    case 'left':  return 'right center';
    case 'right': return 'left center';
  }
}

export default function CustomCursor() {
  const crossRef = useRef<HTMLDivElement>(null);
  const dotRef   = useRef<HTMLDivElement>(null);
  const glowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hovering,   setHovering]   = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // Disable custom cursor on touch/pointer: coarse (phones/tablets)
    const mq = window.matchMedia('(pointer: coarse)');
    if (mq.matches) {
      setIsTouchDevice(true);
      // Restore default cursor on body for mobile
      document.body.style.cursor = 'auto';
      return;
    }

    const cross = crossRef.current;
    const dot   = dotRef.current;
    if (!cross || !dot) return;

    let isMoving = false;
    function onMove(e: MouseEvent) {
      // translate3d forces hardware GPU acceleration for much smoother rendering
      cross!.style.transform = `translate3d(${e.clientX}px,${e.clientY}px, 0)`;
      
      if (!isMoving) {
        isMoving = true;
        dot!.style.transition  = 'box-shadow 40ms ease';
        dot!.style.boxShadow   = 'none';
      }

      if (glowTimer.current) clearTimeout(glowTimer.current);
      glowTimer.current = setTimeout(() => {
        isMoving = false;
        dot!.style.transition = 'box-shadow 150ms ease';
        dot!.style.boxShadow  = '0 0 8px #06b6d4, 0 0 16px rgba(6,182,212,0.4)';
      }, 80); // Quick turnaround for high responsiveness feeling
    }

    const showCursor = () => { cross!.style.opacity = '1'; };
    const hideCursor = () => { cross!.style.opacity = '0'; };

    function onDown() { setIsClicking(true);  }
    function onUp()   { setIsClicking(false); }

    function onHoverIn()  { setHovering(true);  }
    function onHoverOut() { setHovering(false); }

    window.addEventListener('mousemove',   onMove,       { passive: true });
    document.addEventListener('mouseenter', showCursor);
    document.addEventListener('mouseleave', hideCursor);
    document.addEventListener('mousedown',  onDown);
    document.addEventListener('mouseup',    onUp);

    const targets = document.querySelectorAll('a, button, [data-cursor]');
    targets.forEach(el => {
      el.addEventListener('mouseenter', onHoverIn);
      el.addEventListener('mouseleave', onHoverOut);
    });

    return () => {
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseenter', showCursor);
      document.removeEventListener('mouseleave', hideCursor);
      document.removeEventListener('mousedown',  onDown);
      document.removeEventListener('mouseup',    onUp);
      if (glowTimer.current) clearTimeout(glowTimer.current);
      targets.forEach(el => {
        el.removeEventListener('mouseenter', onHoverIn);
        el.removeEventListener('mouseleave', onHoverOut);
      });
    };
  }, []);

  // Reduced amplitudes (60% less than before)
  const perpDrift = hovering ? 1.2  : 0.6;
  const rotDrift  = hovering ? 1.6  : 0.8;
  const scalePulse = hovering ? 1.04 : 1.04; // ~0.4px on 10px arm ≈ 4%

  // Don't render custom cursor on touch devices
  if (isTouchDevice) return null;

  return (
    <div
      ref={crossRef}
      aria-hidden="true"
      style={{
        position: 'fixed', top: 0, left: 0,
        width: 0, height: 0,
        pointerEvents: 'none', zIndex: 9999,
        willChange: 'transform, opacity', opacity: 1,
        transition: 'opacity 0.2s',
      }}
    >
      {/* Center dot */}
      <div
        ref={dotRef}
        style={{
          position: 'absolute',
          width: 4, height: 4,
          borderRadius: '50%',
          background: '#06b6d4',
          transform: 'translate(-50%,-50%)',
          transition: 'box-shadow 80ms ease',
        }}
      />

      {/* 4 arms — independent organic oscillation + click collapse */}
      {ARMS.map(({ id, dur, delay }) => {
        const vert = isVertical(id);
        const driftAxis = vert ? 'x' : 'y';

        // Click collapse: scale arm to 0 from the dot end (inner end)
        const clickScale = isClicking ? 0 : 1;

        return (
          <motion.div
            key={id}
            style={{
              ...armStyle(id),
              transformOrigin: originFor(id),
            }}
            animate={isClicking ? {
              // Collapse inward — scale to 0 from inner origin
              scaleX: vert ? 1 : 0,
              scaleY: vert ? 0 : 1,
              [driftAxis]: 0,
              rotate: 0,
            } : {
              // Normal sway oscillation
              [driftAxis]: [-perpDrift, perpDrift, -perpDrift],
              rotate: [-rotDrift, rotDrift, -rotDrift],
              scaleY: vert ? [1, scalePulse, 1] : 1,
              scaleX: vert ? 1 : [1, scalePulse, 1],
            }}
            transition={isClicking ? {
              duration: 0.12,
              ease: 'easeIn',
            } : {
              duration: hovering ? dur * 0.55 : dur,
              delay: isClicking ? 0 : delay,
              repeat: Infinity,
              repeatType: 'mirror',
              ease: 'easeInOut',
            }}
          />
        );

        void clickScale; // suppress unused warning
      })}
    </div>
  );
}
