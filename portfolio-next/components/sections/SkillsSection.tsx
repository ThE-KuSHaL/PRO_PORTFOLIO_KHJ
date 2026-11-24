'use client';
// Skills: the 3D brain (three + r3f + postprocessing + 3.4 MB GLB) is lazy-loaded only when the
// section nears the viewport on capable devices, and its render loop pauses when scrolled away.
// Lite devices get a lightweight 2D skill map and may opt in to the 3D brain with a button.

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import SectionLabel from '@/components/ui/SectionLabel';
import { REGIONS } from '../cortex/state/regions';
import { useLite } from '@/lib/device';

const CortexApp = dynamic(() => import('../cortex/App').then((m) => m.CortexApp), {
  ssr: false,
  loading: () => (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'rgba(6,182,212,0.6)', fontSize: '0.8rem' }}>
      Loading neural map…
    </div>
  ),
});

// Mirrors cortex/config/palette.ts REGION_COLORS (kept local so the 3D bundle isn't pulled in).
const REGION_HEX = ['#3EA8FF', '#2DFF88', '#FFB347', '#8C5BFF', '#57F7FF', '#FF6464', '#FFE45A'];

/** Lightweight, WebGL-free version of the brain: tap a region to open its knowledge card. */
function SkillsLite({ onLoad3D }: { onLoad3D: () => void }) {
  const [open, setOpen] = useState<number>(0);
  const region = REGIONS[open];
  const color = REGION_HEX[open];

  return (
    <div style={{ position: 'relative', zIndex: 10 }}>
      <div role="tablist" aria-label="Knowledge regions" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
        {REGIONS.map((r, i) => {
          const active = i === open;
          const c = REGION_HEX[i];
          return (
            <button
              key={r.id}
              role="tab"
              aria-selected={active}
              onClick={() => setOpen(i)}
              style={{
                textAlign: 'left', padding: '10px 12px', borderRadius: 10, cursor: 'pointer', minHeight: 56,
                color: '#f0f4ff', background: active ? `${c}1f` : 'rgba(10,14,28,0.88)',
                border: `1px solid ${active ? c : 'rgba(255,255,255,0.12)'}`,
                gridColumn: i === REGIONS.length - 1 ? '1 / -1' : undefined,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', fontWeight: 700 }}>
                <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: c, boxShadow: `0 0 8px ${c}` }} />
                {r.name}
              </span>
              <span style={{ display: 'block', marginTop: 3, fontSize: '0.68rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.3 }}>{r.knowledge}</span>
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        style={{ marginTop: 12, padding: '16px', borderRadius: 12, background: 'rgba(10,14,28,0.92)', border: `1px solid ${color}66`, boxShadow: `0 0 24px ${color}1a` }}
      >
        <div style={{ fontSize: '0.68rem', letterSpacing: '0.16em', textTransform: 'uppercase', color, fontWeight: 700 }}>{region.name}</div>
        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f0f4ff', margin: '4px 0 6px' }}>{region.knowledge}</div>
        <p style={{ margin: '0 0 12px', fontSize: '0.8rem', lineHeight: 1.5, color: 'rgba(255,255,255,0.6)' }}>{region.description}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {region.skills.map((sk) => (
            <span key={sk} style={{ fontSize: '0.72rem', fontWeight: 600, padding: '4px 10px', borderRadius: 999, color, background: `${color}1a`, border: `1px solid ${color}40` }}>
              {sk}
            </span>
          ))}
        </div>
      </div>

      <button
        onClick={onLoad3D}
        style={{ marginTop: 14, padding: '10px 16px', fontSize: '0.78rem', fontWeight: 600, color: '#06b6d4', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.4)', borderRadius: 8, cursor: 'pointer' }}
      >
        View 3D brain instead (≈3.5 MB)
      </button>
    </div>
  );
}

export default function SkillsSection() {
  const lite = useLite();
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);      // approached viewport → allow mount
  const [visible, setVisible] = useState(false); // currently on screen → render loop on
  const [forced, setForced] = useState(false);   // lite user opted in

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const nearIO = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setNear(true); nearIO.disconnect(); } }, { rootMargin: '600px' });
    const visIO = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    nearIO.observe(el); visIO.observe(el);
    return () => { nearIO.disconnect(); visIO.disconnect(); };
  }, []);

  const show3D = lite === false ? near : forced;

  return (
    <section
      id="skills"
      className="relative w-full overflow-hidden pointer-events-auto flex flex-col"
      aria-label="Skills & Expertise"
      style={{
        padding: 'clamp(4rem,8vh,7rem) clamp(1.5rem,5vw,4rem)',
        paddingLeft: 'calc(var(--sidebar-width, 200px) + clamp(1.5rem,4vw,4rem))',
        transition: 'padding-left 0.3s cubic-bezier(0.4,0,0.2,1)',
        minHeight: '100svh',
        position: 'relative',
        zIndex: 2,
        contain: 'paint',
      }}
    >
      <div style={{ position: 'relative', zIndex: 10 }}>
        <SectionLabel color="#06b6d4">Skills</SectionLabel>
        <h2 className="sec-title">
          Developer Brain Matrix.
        </h2>
        <p className="sec-sub">
          Explore my technical expertise through an interactive neural map. Tap regions to expand knowledge domains.
        </p>
      </div>

      <div ref={ref} className="relative w-full flex-1 min-h-[600px] overflow-visible z-0">
        {show3D ? <CortexApp active={visible} /> : lite === true ? <SkillsLite onLoad3D={() => setForced(true)} /> : null}
      </div>
    </section>
  );
}
