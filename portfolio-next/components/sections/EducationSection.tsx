'use client';
import { useState, useRef, useMemo } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, X, Sparkles } from 'lucide-react';
import SectionLabel from '@/components/ui/SectionLabel';
import { semesterData } from '@/lib/data';

// --- Types & Data ---

const TIMELINE_MAP = {
  '10th': {
    id: '10th',
    year: '2019–2020', label: '10th Grade', sub: 'SSLC — Sri Venkateshwara High School, Mysuru',
    note: 'First exposure to computers. Curiosity began.', isBE: false,
    fruitSize: 16, pos: { cx: 880, cy: 520 }
  },
  'puc': {
    id: 'puc',
    year: '2021–2023', label: '11th & 12th Grade (PUC)', sub: 'PCMB — JSS PU College, Mysuru',
    note: 'First Python script in 12th grade. Everything changed.', isBE: false,
    fruitSize: 28, pos: { cx: 580, cy: 400 }
  },
  'be': {
    id: 'be',
    year: '2024–present', label: 'B.E. Information Science Engineering', sub: 'Vidyavardhaka College of Engineering (VVCE), Mysuru',
    note: 'Beyond the syllabus. Building real systems.', isBE: true,
    fruitSize: 46, pos: { cx: 220, cy: 300 }
  }
};
type NodeId = keyof typeof TIMELINE_MAP;

// --- Components ---

import Image from 'next/image';

const DigitalBud = ({ cx, cy, delay = 0 }: { cx: number, cy: number, delay?: number }) => (
  <motion.g 
    initial={{ scale: 0, opacity: 0 }} 
    whileInView={{ scale: 1, opacity: 1 }} 
    viewport={{ margin: '50px' }} 
    transition={{ delay, duration: 1 }}
  >
    <rect x={cx-2} y={cy-2} width={4} height={4} fill="#06b6d4" transform={`rotate(45 ${cx} ${cy})`} />
    <motion.rect 
      x={cx-4} y={cy-4} width={8} height={8} fill="none" stroke="#06b6d4" strokeWidth={0.5} 
      transform={`rotate(45 ${cx} ${cy})`}
      animate={{ opacity: [0.2, 0.8, 0.2] }} transition={{ repeat: Infinity, duration: 2, delay: Math.random() }}
    />
  </motion.g>
);

export default function EducationSection() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const [activeNode, setActiveNode] = useState<NodeId>('be');
  const [openSem, setOpenSem] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile to switch between overlay (desktop) and stacked (mobile) layout
  useState(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
  });

  const activeData = TIMELINE_MAP[activeNode];

  // SVG replaced with static poetic-cyber-tree.png

  return (
    <section id="education" ref={ref} aria-label="Education"
      style={{
        position: 'relative',
        minHeight: isMobile ? 'auto' : '120vh',
        width: '100%',
        overflow: 'hidden',
        background: '#020617',
        // On mobile: flex column so SVG is above, panel is below
        display: isMobile ? 'flex' : 'block',
        flexDirection: 'column',
      }}
    >
      {/* Title placed top left */}
      <div style={{
        position: isMobile ? 'relative' : 'absolute',
        top: isMobile ? undefined : '8%',
        left: isMobile ? undefined : 'clamp(2rem, 6vw, 6rem)',
        zIndex: 10,
        padding: isMobile ? '2rem 1.5rem 0.5rem' : undefined,
      }}>
        <SectionLabel color="#6366f1">Education</SectionLabel>
        <h2 style={{ fontSize: 'clamp(2rem,4vw,3.5rem)', fontWeight: 700, marginBottom: '0.25rem', color: '#f0f4ff', textShadow: '0 4px 20px rgba(0,0,0,0.8)' }}>
          The roots.
        </h2>
        <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)', maxWidth: '400px' }}>
          Growing through logic. Energy pulses from roots (oldest) to branch tips (newest).
        </p>
      </div>

      {/* SVG Canvas — full background on desktop, compact strip on mobile */}
      <div style={{
        position: isMobile ? 'relative' : 'absolute',
        inset: isMobile ? undefined : 0,
        height: isMobile ? 280 : undefined,
        zIndex: 0,
        overflow: 'hidden',
      }}>
        {/* Render poetic-cyber-tree.png properly placed on the right */}
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '60%', opacity: 0.8 }}>
           <Image src="/poetic-cyber-tree.png" alt="Cyber Tree" fill style={{ objectFit: 'contain', objectPosition: 'right' }} priority />
        </div>

        <svg width="100%" height="100%" viewBox="0 0 1200 1000" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0 }}>
          {/* Definitions for Glow Filters */}
          <defs>
            <filter id="fruitGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Decorative Junction Nodes (PCB Junctions) */}
          <DigitalBud cx={950} cy={500} delay={0.5} />
          <DigitalBud cx={580} cy={400} delay={1.2} />
          <DigitalBud cx={880} cy={435} delay={1} />
          <DigitalBud cx={1150} cy={950} delay={0.1} />
          <DigitalBud cx={700} cy={380} delay={1.8} />

          {/* Render The 3 Main Interactive Fruits */}
          {Object.values(TIMELINE_MAP).map((node, i) => {
            const isActive = activeNode === node.id;
            return (
              <g key={node.id} style={{ cursor: 'pointer' }} onClick={() => setActiveNode(node.id as NodeId)}>
                {/* Hitbox */}
                <circle cx={node.pos.cx} cy={node.pos.cy} r={node.fruitSize * 1.5} fill="transparent" />
                
                {/* Outer Glow Circles */}
                <motion.circle 
                  cx={node.pos.cx} cy={node.pos.cy} r={node.fruitSize + 8} 
                  fill="none" stroke="#06b6d4" strokeWidth={1} strokeDasharray="4 4"
                  animate={{ rotate: 360, opacity: [0.1, 0.4, 0.1] }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} 
                />
                
                {/* Pulsing Core */}
                <motion.circle 
                  cx={node.pos.cx} cy={node.pos.cy} r={node.fruitSize / 2} 
                  fill={isActive ? '#06b6d4' : '#6366f1'} 
                  animate={{ 
                    scale: isActive ? [1, 1.15, 1] : [1, 1.05, 1],
                    boxShadow: isActive ? '0 0 30px #06b6d4' : '0 0 10px rgba(99,102,241,0.5)'
                  }}
                  transition={{ repeat: Infinity, duration: isActive ? 1.5 : 3 }}
                  style={{ filter: isActive ? 'url(#fruitGlow)' : 'none' }}
                />

                {/* Growth Ring */}
                <motion.circle 
                  cx={node.pos.cx} cy={node.pos.cy} r={node.fruitSize} 
                  fill="none" stroke={isActive ? '#06b6d4' : 'rgba(255,255,255,0.2)'} 
                  strokeWidth={2}
                  animate={isActive ? { scale: [1, 1.2, 1], opacity: [0.8, 0.2, 0.8] } : {}}
                  transition={{ repeat: Infinity, duration: 2.5 }}
                />

                {/* Label text */}
                <text 
                  x={node.pos.cx} y={node.pos.cy + node.fruitSize + 25} 
                  fill="#fff" textAnchor="middle" 
                  fontSize={node.id === 'be' ? 22 : 16} 
                  fontWeight={isActive ? 800 : 400}
                  style={{ pointerEvents: 'none', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,1))' }}
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Floating Info Glass Panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeNode}
          initial={{ opacity: 0, x: -50, filter: 'blur(10px)' }}
          whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, x: -50, filter: 'blur(10px)' }}
          transition={{ duration: 0.5, ease: 'backOut' }}
          style={{
            position: isMobile ? 'relative' : 'absolute',
            bottom: isMobile ? undefined : '6%',
            left: isMobile ? undefined : 'clamp(1rem, 5vw, 5rem)',
            zIndex: 20,
            margin: isMobile ? '0 1rem 2rem' : undefined,
            width: isMobile ? 'auto' : '90%',
            maxWidth: '520px',
            background: 'rgba(3,8,16,0.75)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            padding: '1.75rem',
            borderRadius: 24,
            border: '1px solid rgba(6,182,212,0.2)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8), inset 0 0 30px rgba(6,182,212,0.03)',
            overflowY: isMobile ? 'auto' : undefined,
            maxHeight: isMobile ? '60vh' : undefined,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ padding: '4px 12px', background: 'rgba(6,182,212,0.1)', borderRadius: 20, border: '1px solid rgba(6,182,212,0.2)' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#06b6d4', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                {activeData.year}
              </span>
            </div>
            <Sparkles size={16} color={activeData.isBE ? "#06b6d4" : "#6366f1"} />
          </div>

          <h3 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', marginBottom: 8, letterSpacing: '-0.02em', textShadow: '0 2px 15px rgba(0,0,0,0.5)' }}>
            {activeData.label}
          </h3>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, marginBottom: 10 }}>
            {activeData.sub}
          </p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: 12, borderLeft: `3px solid ${activeData.id === '10th' ? '#6366f1' : '#06b6d4'}` }}>
             <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', margin: 0, lineHeight: 1.4 }}>
               {activeData.note}
             </p>
          </div>

          {activeData.isBE && (
            <div style={{ marginTop: '2rem' }}>
              <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(6,182,212,0.4), transparent)', marginBottom: '1rem' }} />
              <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                Integrated Academic Modules
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {semesterData.map((sem, si) => (
                  <div key={sem.sem} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <button
                      onClick={() => setOpenSem(openSem === si ? null : si)}
                      style={{
                        display: 'flex', alignItems: 'center', width: '100%',
                        padding: '12px 16px', background: openSem === si ? 'rgba(6,182,212,0.05)' : 'transparent', 
                        border: 'none', cursor: 'pointer', transition: '0.2s', color: '#f0f4ff'
                      }}
                    >
                      {openSem === si ? <ChevronDown size={14} color="#06b6d4" /> : <ChevronRight size={14} color="rgba(255,255,255,0.4)" />}
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, marginLeft: 10 }}>Semester {sem.sem}</span>
                      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', marginLeft: 'auto', fontWeight: 500 }}>{sem.period}</span>
                    </button>

                    <AnimatePresence>
                      {openSem === si && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: 'circOut' }}
                        >
                          <div style={{ padding: '4px 16px 16px 40px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 12 : 20 }}>
                            <div>
                              <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#06b6d4', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Core Courses</p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {sem.courses.map((c) => <div key={c} style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.3 }}>· {c}</div>)}
                              </div>
                            </div>
                            <div>
                              <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Key Projects</p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {sem.projects.map((p) => <div key={p} style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.3 }}>⚡ {p}</div>)}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
