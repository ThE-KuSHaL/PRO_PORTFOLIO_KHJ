'use client';
// components/hero/KHJEmblem.tsx
import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import LatchCards from './LatchCards';

interface KHJEmblemProps {
  visible: boolean;
  size?: number;
}

const r4 = (n: number) => Math.round(n * 10000) / 10000;

export default function KHJEmblem({ visible, size = 220 }: KHJEmblemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [isPressed, setIsPressed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Outside click → close
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const c = size / 2;
  const RO = 100 * (size / 220);
  const RI = 78 * (size / 220);

  // Tick marks
  const ticks: React.ReactElement[] = [];
  for (let i = 0; i < 12; i++) {
    const ang = (i * 30 * Math.PI) / 180;
    const isCardinal = i % 3 === 0;
    const r1 = RO + 3, r2 = RO + (isCardinal ? 11 : 6);
    const x1 = r4(c + Math.cos(ang) * r1), y1 = r4(c + Math.sin(ang) * r1);
    const x2 = r4(c + Math.cos(ang) * r2), y2 = r4(c + Math.sin(ang) * r2);
    ticks.push(
      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={isCardinal ? '#06b6d4' : 'rgba(6,182,212,0.28)'}
        strokeWidth={isCardinal ? 1.5 : 0.8} />
    );
  }

  // PCB traces
  const traces: React.ReactElement[] = [];
  [0, 45, 90, 135, 180, 225, 270, 315].forEach((deg, i) => {
    const ang = (deg * Math.PI) / 180;
    const exitX = r4(c + Math.cos(ang) * (RO + 2));
    const exitY = r4(c + Math.sin(ang) * (RO + 2));
    const diagonal = deg % 90 !== 0;
    const armLen = 20, turnLen = 16;
    let d: string;
    if (!diagonal) {
      const endX = r4(exitX + Math.cos(ang) * armLen);
      const endY = r4(exitY + Math.sin(ang) * armLen);
      const turnX = r4(endX + Math.cos(ang + Math.PI / 2) * turnLen);
      const turnY = r4(endY + Math.sin(ang + Math.PI / 2) * turnLen);
      d = `M ${exitX} ${exitY} L ${endX} ${endY} L ${turnX} ${turnY}`;
    } else {
      const midX = r4(exitX + Math.cos(ang) * armLen);
      const midY = r4(exitY + Math.sin(ang) * armLen);
      d = `M ${exitX} ${exitY} L ${midX} ${midY} L ${r4(midX + (i % 2 === 0 ? turnLen : 0))} ${r4(midY + (i % 2 === 0 ? 0 : turnLen))}`;
    }
    const dur = 2.4 + (i % 4) * 0.28;
    const col = i % 2 === 0 ? '#06b6d4' : '#6366f1';
    traces.push(
      <path key={i} d={d} fill="none" stroke={col} strokeWidth="1.4"
        strokeDasharray={40} strokeDashoffset={40} filter="url(#embglow)">
        <animate attributeName="strokeDashoffset" values="40;0;40"
          dur={`${dur}s`} begin={`${i * 0.38}s`} repeatCount="indefinite" />
      </path>
    );
  });

  function handleDown(e: React.MouseEvent) {
    e.stopPropagation();
    setIsPressed(true);
  }

  function handleUp(e: React.MouseEvent) {
    e.stopPropagation();
    if (isPressed) {
      if (showHint) setShowHint(false);
      setIsOpen(prev => !prev);
    }
    setIsPressed(false);
  }

  function handleCancel() {
    setIsPressed(false);
  }

  // Layer-by-layer 3D printer variants
  const layerVariants = {
    hidden: { z: -30, opacity: 0 },
    visible: (targetZ: number) => ({
      z: targetZ,
      opacity: 1,
      transition: {
        // Delay scales with targetZ so upper layers assemble later (3D print style)
        z: { type: 'spring', stiffness: 100, damping: 15, delay: 0.1 + targetZ * 0.015 },
        opacity: { duration: 0.5, delay: 0.1 + targetZ * 0.015 }
      }
    }),
    tap: (targetZ: number) => ({
      z: targetZ * 0.15, // Compress layers down like a real mechanical button
      transition: { type: 'spring', stiffness: 500, damping: 25 }
    })
  };

  const animState = visible ? (isPressed ? "tap" : "visible") : "hidden";

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      
      {/* 3D Isometric Wrapper */}
      <motion.div
        onMouseDown={handleDown}
        onMouseUp={handleUp}
        onMouseLeave={handleCancel}
        // Bobbing floating animation stacked with isometric view
        initial={{ rotateX: 60, rotateZ: -45 }}
        animate={visible ? { rotateX: 60, rotateZ: -45, y: [0, -6, 0] } : { rotateX: 60, rotateZ: -45, y: 0 }}
        transition={visible ? { y: { duration: 4, repeat: Infinity, ease: "easeInOut" } } : {}}
        style={{
          cursor: 'pointer',
          position: 'relative',
          zIndex: 2,
          width: size,
          height: size,
          transformStyle: 'preserve-3d',
        }}
        aria-label="KHJ Emblem — click to explore"
        role="button"
      >
        {/* Helper SVG for filters / gradients shared across layers */}
        <svg width="0" height="0" style={{ position: 'absolute' }}>
          <defs>
            <filter id="embglow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b2" />
              <feMerge>
                <feMergeNode in="b2" /><feMergeNode in="b1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="emblabelglow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <radialGradient id="coreGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(6,182,212,0.18)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>
        </svg>

        {/* LAYER 0: Shadow & Pulse Ring (Sits exactly on the board) */}
        <motion.div custom={0} variants={layerVariants} initial="hidden" animate={animState}
          style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d' }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} overflow="visible">
            {showHint && visible && (
              <motion.circle cx={c} cy={c} r={RO + 10}
                fill="none" stroke="rgba(6,182,212,0.5)" strokeWidth="1"
                animate={{ scale: [1, 1.15, 1], opacity: [0.7, 0.1, 0.7] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
            {/* Base plate */}
            <circle cx={c} cy={c} r={RO} fill="rgba(3,8,16,0.8)" stroke="#06b6d4" strokeWidth="2.2" opacity="0.6" />
            {ticks}
          </svg>
        </motion.div>

        {/* LAYER 1: Traces & Inner ring (Hovering slightly above) */}
        <motion.div custom={20} variants={layerVariants} initial="hidden" animate={animState}
          style={{ 
            position: 'absolute', inset: 0, 
            filter: 'drop-shadow(0 8px 10px rgba(0,0,0,0.6))',
            transformStyle: 'preserve-3d' 
          }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} overflow="visible">
            <circle cx={c} cy={c} r={RI} fill="rgba(6,182,212,0.05)" stroke="#6366f1" strokeWidth="1.8" opacity="0.8" />
            {traces}
          </svg>
        </motion.div>

        {/* LAYER 2: Core Button & KHJ Text (Highest layer) */}
        <motion.div custom={40} variants={layerVariants} initial="hidden" animate={animState}
          style={{ 
            position: 'absolute', inset: 0,
            filter: 'drop-shadow(0 15px 20px rgba(0,0,0,0.8)) drop-shadow(0 0 10px rgba(6,182,212,0.3))',
            transformStyle: 'preserve-3d'
          }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} overflow="visible">
            <circle cx={c} cy={c} r={RI - 3} fill="rgba(3,8,16,0.95)" stroke="#06b6d4" strokeWidth="1.5" />
            <circle cx={c} cy={c} r={RI - 3} fill="url(#coreGrad)" />
            <text x={c + 2} y={c + 2} textAnchor="middle" dominantBaseline="middle"
              fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="28"
              fill="#06b6d4" letterSpacing="2" filter="url(#emblabelglow)">
              KHJ
            </text>
          </svg>
        </motion.div>
      </motion.div>

      {/* Click hint label - kept in 2D space, outside the 3D wrapper so it's always readable */}
      <AnimatePresence>
        {showHint && visible && (
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            aria-hidden="true"
            style={{
              position: 'absolute', bottom: -10, left: '50%',
              transform: 'translateX(-50%)',
              fontSize: 10, fontFamily: 'monospace',
              color: 'rgba(6,182,212,0.5)',
              whiteSpace: 'nowrap', pointerEvents: 'none', letterSpacing: '0.08em',
              zIndex: 0,
            }}
          >
            press core to build
          </motion.p>
        )}
      </AnimatePresence>

      {/* Latch cards - rendering over top natively, unskewed */}
      <AnimatePresence>
        {isOpen && (
          <LatchCards onClose={() => setIsOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
