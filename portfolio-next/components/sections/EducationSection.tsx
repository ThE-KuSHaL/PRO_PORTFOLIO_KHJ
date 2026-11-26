'use client';
// components/sections/EducationSection.tsx
// "The Roots": schooling is the roots, PUC is the trunk, engineering is the great branch
// that bears the Engineer's Brain. The scene lives in RootsScene; this file owns the story data.

import { useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import SectionLabel from '../ui/SectionLabel';
import { semesterData } from '@/lib/data';
import { useGpuTier, useIsMobile } from '@/lib/device';
import ROOTS_META from '@/lib/roots-meta.json';

// three.js stays out of the main bundle; only fetched when the section nears the viewport.
const RootsScene = dynamic(() => import('./RootsScene'), { ssr: false });

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
          maxHeight: '100%',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          background: 'rgba(3,7,18,0.95)',
          padding: '2rem',
          borderRadius: 16,
          border: `1px solid ${node.isBE ? 'rgba(6,182,212,0.2)' : 'rgba(99,102,241,0.2)'}`,
          boxShadow: '0 32px 64px rgba(0,0,0,0.8)',
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
        <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.64)', letterSpacing: '0.04em', marginBottom: 16 }}>
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
          <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
            {node.note}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: node.isBE ? '1fr 1.5fr' : '1fr', gap: '2rem' }}>
          {/* Growth areas & Tags */}
          <div>
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.64)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
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
              <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.64)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
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
                                {sem.courses.map((c) => <div key={c} style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>· {c}</div>)}
                              </div>
                            </div>
                            <div>
                              <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#818cf8', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Key Projects</p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {sem.projects.map((p) => <div key={p} style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>⚡ {p}</div>)}
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

        {/* The fruit leads on to the next district of the city */}
        {node.isBE && (
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: '1.5rem' }}
            onClick={() => {
              onClose();
              document.getElementById('skills')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Enter the Engineer&apos;s Brain
          </button>
        )}
      </motion.div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function EducationSection() {
  const ref = useRef<HTMLElement>(null);
  const nearView = useInView(ref, { once: true, margin: '400px' });
  const titleRef = useRef<HTMLHeadingElement>(null);
  const storyRef = useRef<HTMLUListElement>(null);
  // Written straight to the one line concerned, and only on change: no React render, and no
  // page-wide style rule watching the tree (that cost slow processors a quarter of their frame rate).
  const lightLine = useCallback((part: string, lit: boolean) => {
    storyRef.current?.querySelector(`[data-part="${part}"]`)?.toggleAttribute('data-lit', lit);
  }, []);
  const titleSeen = useInView(titleRef, { once: true, amount: 0.9 }); // the title card switches on once
  const tier = useGpuTier();
  const [activeNode, setActiveNode] = useState<NodeId | null>(null);
  const isMobile = useIsMobile();

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
        // No opaque fill: the PCB city animation behind the page shows through the tree's sky.
        background: 'transparent',
        height: isMobile ? undefined : 'max(100svh, 34rem)',
        padding: isMobile ? '3.5rem 0 2rem' : 0,
      }}
    >
      {/* Soft navy scrim: keeps the headline readable without hiding the circuitry */}
      <div aria-hidden="true" className="roots-scrim" />

      {/* the title card has the open sky to itself, clear of both the tree and the city */}
      <div className="roots-head">
        <SectionLabel color="#6366f1">Education</SectionLabel>
        <h2 ref={titleRef} className="roots-title" data-on={titleSeen}>
          <span>The </span>
          <span>Roots</span>
        </h2>
      </div>

      <div className="roots-copy">
        {/* each line lights up in step with its part of the tree (see globals.css) */}
        <ul ref={storyRef} className="roots-story">
          <li data-part="roots">School laid the <b>roots</b>.</li>
          <li data-part="trunk">PUC raised the <b>trunk</b>.</li>
          <li data-part="branch">Engineering grew the branch that carries my <b>Engineer&apos;s Brain</b>.</li>
        </ul>
        <p className="roots-hint">
          <span className="mouse">Point at the roots, the trunk or the fruit.</span>
          <span className="touch">Tap the roots, the trunk or the fruit.</span>
        </p>
      </div>

      {/* The scene: full-bleed backdrop on desktop, in-flow block on phones */}
      <div className="roots-stage" style={isMobile ? { minHeight: `calc(100vw / ${ROOTS_META.tall.aspect})` } : undefined}>
        {tier && nearView && (
          <RootsScene
            tier={tier}
            mobile={isMobile}
            nodes={NODES.map((n) => ({ id: n.id, year: n.year, label: n.label }))}
            onSelect={handleNodeClick}
            onLit={lightLine}
          />
        )}
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
