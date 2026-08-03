'use client';
// components/sections/EducationSection.tsx
// SVG-based interactive education growth tree — "The Roots"
// Circuitry-inspired trunk with three milestone nodes.
// Hover illumination, contextual cards near nodes, enriched content.
// Responsive: desktop horizontal layout, mobile stacked.

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import Image from 'next/image';
import SectionLabel from '../ui/SectionLabel';
import { semesterData } from '@/lib/data';
import EducationTree3D from './EducationTree3D';

// ─── Data ────────────────────────────────────────────────────────────────────

type NodeId = '10th' | 'puc' | 'be';

interface NodeData {
  id: NodeId;
  year: string;
  label: string;
  sub: string;
  note: string;
  focus: string;
  growthAreas: string[];
  tags: string[];
  isBE: boolean;
  cx: number;
  cy: number;
}

// ViewBox = 0 0 1440 800
// Growth direction: bottom-right → middle → top-left
const NODES: NodeData[] = [
  {
    id: '10th',
    year: '2019',
    label: '10th Grade',
    sub: 'Sri Venkateshwara High School',
    note: 'Foundation of disciplined learning.',
    focus: 'General Sciences & Mathematics',
    growthAreas: ['Logical thinking', 'Academic discipline', 'Curiosity for machines'],
    tags: ['Foundation', 'STEM Start'],
    isBE: false,
    cx: 1320,
    cy: 750,
  },
  {
    id: 'puc',
    year: '2021–2023',
    label: '11th & 12th (PUC)',
    sub: 'Sri Jayachamarajendra PU College (SVM), Mysuru',
    note: 'The spark of structured thinking. PCMC (Physics, Chem, Math, CS).',
    focus: 'Physics · Chemistry · Mathematics · Computer Science',
    growthAreas: ['Algorithmic thinking', 'First code written', 'Problem decomposition'],
    tags: ['PCMC', 'First Code'],
    isBE: false,
    cx: 1000,
    cy: 520,
  },
  {
    id: 'be',
    year: '2024–PRESENT',
    label: 'B.E. Information Science',
    sub: 'VVCE, Mysuru',
    note: 'Beyond the syllabus. Building real systems.',
    focus: 'Systems Engineering · AI · IoT · Cloud Infrastructure',
    growthAreas: ['AI product development', 'IoT hardware design', 'Startup founding', 'Full-stack systems'],
    tags: ['Active', 'Builder', 'Founder'],
    isBE: true,
    cx: 350,
    cy: 250,
  },
];

// ─── SVG Sub-components ──────────────────────────────────────────────────────
// Replaced by high-fidelity Three.js EducationTree3D component.


// ─── Contextual Card ─────────────────────────────────────────────────────────

function NodeModal({
  node,
  onClose,
}: {
  node: NodeData;
  onClose: () => void;
}) {
  const [openSem, setOpenSem] = useState<number | null>(0);
  const accentColor = node.isBE ? '#06b6d4' : '#818cf8';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(2,6,23,0.6)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: '2rem',
      }}
      onClick={onClose}
    >
      <motion.div
        key={node.id}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 700,
          background: 'rgba(3,7,18,0.95)',
          padding: '2rem',
          borderRadius: 16,
          border: `1px solid ${node.isBE ? 'rgba(6,182,212,0.2)' : 'rgba(99,102,241,0.2)'}`,
          boxShadow: '0 32px 64px rgba(0,0,0,0.8)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Circuitry trace header line */}
        <svg width="100%" height="6" style={{ display: 'block', marginBottom: 24 }}>
          <line x1="0" y1="1" x2="35%" y2="1" stroke={accentColor} strokeWidth="1" strokeOpacity="0.35" />
          <rect x="35%" y="0" width="3" height="2" rx="0.5" fill={accentColor} fillOpacity="0.4" />
          <line x1="37%" y1="1" x2="100%" y2="1" stroke={accentColor} strokeWidth="0.5" strokeOpacity="0.1" strokeDasharray="4 6" />
        </svg>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <span
              style={{
                display: 'inline-block',
                fontSize: '0.75rem',
                fontWeight: 800,
                color: accentColor,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                padding: '4px 12px',
                background: `${accentColor}12`,
                borderRadius: 12,
                border: `1px solid ${accentColor}30`,
                marginBottom: '1rem',
              }}
            >
              {node.year}
            </span>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f0f4ff', marginBottom: 6, letterSpacing: '-0.02em' }}>
              {node.label}
            </h3>
            <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
              {node.sub}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '50%',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            aria-label="Close"
            onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Educational focus */}
        <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.04em', marginBottom: 16 }}>
          {node.focus}
        </p>

        {/* Note */}
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: 8,
            borderLeft: `2px solid ${accentColor}`,
            marginBottom: 20,
          }}
        >
          <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
            {node.note}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: node.isBE ? '1fr 1.5fr' : '1fr', gap: '2rem' }}>
          {/* Growth areas & Tags */}
          <div>
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                Growth Areas
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {node.growthAreas.map((area) => (
                  <div key={area} style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4, paddingLeft: 10, borderLeft: `1px solid ${accentColor}30` }}>
                    {area}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {node.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 8,
                    background: `${accentColor}10`,
                    border: `1px solid ${accentColor}22`,
                    color: accentColor,
                    letterSpacing: '0.04em',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Semester accordion — only for B.E. */}
          {node.isBE && (
            <div>
              <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                Academic Modules
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {semesterData.map((sem, si) => (
                  <div key={sem.sem} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenSem(openSem === si ? null : si); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                        padding: '12px 16px',
                        background: openSem === si ? 'rgba(6,182,212,0.04)' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#f0f4ff',
                        transition: '0.2s',
                      }}
                    >
                      {openSem === si ? <ChevronDown size={14} color="#06b6d4" /> : <ChevronRight size={14} color="rgba(255,255,255,0.25)" />}
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, marginLeft: 10 }}>Semester {sem.sem}</span>
                      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', marginLeft: 'auto', fontWeight: 500 }}>{sem.period}</span>
                    </button>

                    <AnimatePresence>
                      {openSem === si && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'circOut' }}
                        >
                          <div style={{ padding: '4px 16px 16px 40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div>
                              <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#06b6d4', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Core Courses</p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {sem.courses.map((c) => <div key={c} style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>· {c}</div>)}
                              </div>
                            </div>
                            <div>
                              <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#818cf8', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Key Projects</p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {sem.projects.map((p) => <div key={p} style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>⚡ {p}</div>)}
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
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function EducationSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-10%' });
  const [activeNode, setActiveNode] = useState<NodeId | null>(null);
  const [hoveredNode, setHoveredNode] = useState<NodeId | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const activeData = activeNode ? NODES.find((n) => n.id === activeNode) ?? null : null;

  const handleNodeClick = (id: NodeId) => {
    setActiveNode((prev) => (prev === id ? null : id));
  };

  return (
    <section
      id="education"
      ref={ref}
      aria-label="Education"
      style={{
        position: 'relative',
        width: '100%',
        overflow: 'hidden',
        background: '#020617',
        padding: isMobile
          ? '3rem 1.5rem 2rem'
          : 'clamp(4rem,8vh,7rem) clamp(1.5rem,5vw,4rem)',
        paddingLeft: isMobile ? '1.5rem' : 'calc(var(--sidebar-width, 200px) + clamp(1.5rem,4vw,4rem))',
        transition: 'padding-left 0.3s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      {/* ── Atmospheric layers ── */}

      {/* Radial vignette — cinematic depth falloff */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 70% 65% at 35% 40%, transparent 0%, rgba(2,6,23,0.5) 65%, rgba(2,6,23,0.85) 100%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Top gradient — atmospheric darkening */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '15%',
          background: 'linear-gradient(to bottom, rgba(2,6,23,0.7), transparent)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Bottom gradient — ground fade */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '12%',
          background: 'linear-gradient(to top, rgba(2,6,23,0.6), transparent)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* ── Background Cinematic Environment Layer ── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <Image
          src="/roots_environment.webp"
          alt="Immersive Cybernetic Environment"
          fill
          priority
          style={{ objectFit: 'cover' }}
        />
        {/* Subtle darkening overlay to balance readability */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(2, 6, 23, 0.4)' }} />
      </div>

      {/* ── Foreground Text Content ── */}
      <div style={{ pointerEvents: 'none', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%', minHeight: isMobile ? '70vh' : '800px', paddingBottom: isMobile ? '2rem' : '4rem' }}>

        {/* Section header */}
        <div style={{ pointerEvents: 'auto', marginTop: 'auto', marginBottom: 'auto', paddingLeft: isMobile ? '1rem' : '2rem' }}>
          <SectionLabel color="#6366f1">Education</SectionLabel>
          <h2
            style={{
              fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
              fontWeight: 800,
              marginBottom: '1rem',
              color: '#f0f4ff',
              textShadow: '0 4px 24px rgba(0,0,0,0.6)',
              letterSpacing: '-0.02em',
            }}
          >
            The roots.
          </h2>
          <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.6)', maxWidth: 480, lineHeight: 1.6, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
            Growing through logic. Energy pulses from roots to branch tips.
          </p>
        </div>
      </div>

      {/* ── Background Environmental 3D Tree ── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
        <EducationTree3D
          activeNode={activeNode}
          hoveredNode={hoveredNode}
          onNodeClick={handleNodeClick}
          onNodeHover={setHoveredNode}
          nodesData={NODES.map(n => ({ id: n.id, year: n.year, label: n.label, isBE: n.isBE }))}
        />
      </div>

      {/* ── Centered Cinematic Modal Overlay ── */}
      <AnimatePresence mode="wait">
        {activeData && (
          <NodeModal
            key={activeData.id}
            node={activeData}
            onClose={() => setActiveNode(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
