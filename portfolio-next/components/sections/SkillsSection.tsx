'use client';
// Skills: the 3D brain (three + r3f + postprocessing + 3.4 MB GLB) is lazy-loaded only when the
// section nears the viewport on capable devices, and its render loop pauses when scrolled away.
// Lite devices get a lightweight 2D skill map and may opt in to the 3D brain with a button.

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import SectionLabel from '@/components/ui/SectionLabel';
import { skills } from '@/lib/data';
import { useLite } from '@/lib/device';

const CortexApp = dynamic(() => import('../cortex/App').then((m) => m.CortexApp), {
  ssr: false,
  loading: () => (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'rgba(6,182,212,0.6)', fontSize: '0.8rem' }}>
      Loading neural map…
    </div>
  ),
});

const CHIP: Record<string, { color: string; bg: string }> = {
  primary:   { color: '#06b6d4',               bg: 'rgba(6,182,212,0.12)' },
  secondary: { color: '#818cf8',               bg: 'rgba(99,102,241,0.12)' },
  dim:       { color: 'rgba(255,255,255,0.55)', bg: 'rgba(255,255,255,0.06)' },
};

function SkillsLite({ onLoad3D }: { onLoad3D: () => void }) {
  return (
    <div style={{ position: 'relative', zIndex: 10 }}>
      <div style={{ display: 'grid', gap: '0.9rem', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
        {skills.map((cat) => (
          <div key={cat.category} style={{ padding: '1rem', borderRadius: 12, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(10,14,28,0.88)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f0f4ff', marginBottom: '0.6rem' }}>
              <span aria-hidden="true" style={{ color: '#06b6d4', marginRight: 8 }}>{cat.icon}</span>{cat.category}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {cat.items.map((it) => {
                const c = CHIP[it.variant] ?? CHIP.dim;
                return (
                  <span key={it.label} style={{ fontSize: '0.72rem', fontWeight: 600, padding: '3px 9px', borderRadius: 999, color: c.color, background: c.bg, border: `1px solid ${c.color}33` }}>
                    {it.label}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={onLoad3D}
        style={{ marginTop: '1.25rem', padding: '9px 16px', fontSize: '0.78rem', fontWeight: 600, color: '#06b6d4', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.4)', borderRadius: 8, cursor: 'pointer' }}
      >
        Load interactive 3D brain (≈3.5 MB)
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
        <h2 style={{ fontSize: 'clamp(1.8rem,3.5vw,2.8rem)', fontWeight: 700, marginBottom: '0.25rem', color: '#f0f4ff' }}>
          Developer Brain Matrix.
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1.5rem', maxWidth: '600px' }}>
          Explore my technical expertise through an interactive neural map. Tap regions to expand knowledge domains.
        </p>
      </div>

      <div ref={ref} className="relative w-full flex-1 min-h-[600px] overflow-visible z-0">
        {show3D ? <CortexApp active={visible} /> : lite === true ? <SkillsLite onLoad3D={() => setForced(true)} /> : null}
      </div>
    </section>
  );
}
