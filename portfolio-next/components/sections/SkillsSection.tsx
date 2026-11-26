'use client';
// Skills: the Engineer's Brain. Every device gets the 3D brain; the quality profile (inside it) decides
// how heavy it is. The code and model load when the section nears the viewport, and rendering stops when
// it is scrolled away. Browsers without WebGL 2 get a plain 2D skill map instead.

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { REGIONS } from '../cortex/state/regions';

const CortexApp = dynamic(() => import('../cortex/App').then((m) => m.CortexApp), {
  ssr: false,
  loading: () => (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'rgba(6,182,212,0.6)', fontSize: '0.8rem' }}>
      Loading the brain…
    </div>
  ),
});

// Mirrors cortex/config/palette.ts REGION_COLORS (kept local so the 3D bundle isn't pulled in).
const REGION_HEX = ['#3EA8FF', '#2DFF88', '#FFB347', '#8C5BFF', '#57F7FF', '#FF6464', '#FFE45A'];

function hasWebGL2() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    gl?.getExtension('WEBGL_lose_context')?.loseContext(); // a probe only: free the context at once
    return !!gl;
  } catch {
    return false;
  }
}

/** WebGL-free version of the brain: tap a region to open its knowledge card. */
function SkillsFlat() {
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

    </div>
  );
}

export default function SkillsSection() {
  const ref = useRef<HTMLElement>(null);
  const [mode, setMode] = useState<'waiting' | '3d' | 'flat'>('waiting');
  const [visible, setVisible] = useState(false); // on screen → the brain may render

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const nearIO = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      setMode(hasWebGL2() ? '3d' : 'flat');
      nearIO.disconnect();
    }, { rootMargin: '600px' });
    // -2px: a section that merely touches the screen edge counts as "intersecting", which left the brain
    // rendering all the time the visitor spent on the next section.
    const visIO = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '-2px 0px' });
    nearIO.observe(el); visIO.observe(el);
    return () => { nearIO.disconnect(); visIO.disconnect(); };
  }, []);

  return (
    <section
      id="skills"
      ref={ref}
      className="skills-section pointer-events-auto"
      aria-label="Skills & Expertise"
    >
      {mode === 'flat' ? (
        <div className="skills-flat">
          <h2 className="sec-title">Engineer&apos;s Brain</h2>
          <SkillsFlat />
        </div>
      ) : (
        // the brain carries the section's one heading
        <div className="skills-exhibit">{mode === '3d' && <CortexApp active={visible} />}</div>
      )}
    </section>
  );
}
