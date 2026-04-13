'use client';
// components/hero/HeroSection.tsx
import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import GlitchName from './GlitchName';
import TypewriterRoles from './TypewriterRoles';
import ProjectTicker from './ProjectTicker';
import PhotoPlaceholder from './PhotoPlaceholder';
import KHJEmblem from './KHJEmblem';

const PrinterArm = dynamic(() => import('./PrinterArm'), { ssr: false });

export default function HeroSection() {
  const [emblemVisible, setEmblemVisible] = useState(false);
  // ref attached to emblem wrapper — passed to PrinterArm for positioning
  const emblemRef = useRef<HTMLDivElement>(null);

  return (
    <section
      id="hero"
      aria-label="Hero"
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        position: 'relative',
        overflow: 'hidden',
      }}
      className="max-md:grid-cols-1"
    >
      {/* ── LEFT HALF ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 'clamp(2rem, 5vw, 5rem) clamp(1.5rem, 4vw, 3.5rem)',
          paddingLeft: 'calc(200px + clamp(1.5rem, 3vw, 3rem))',
          zIndex: 2,
          position: 'relative',
        }}
        className="max-md:pl-8 max-md:pr-8 max-md:pt-20"
      >
        {/* emblemRef wraps the KHJEmblem so PrinterArm can getBoundingClientRect() */}
        <div
          ref={emblemRef}
          style={{ position: 'relative', display: 'inline-flex', marginBottom: '1.8rem' }}
        >
          <KHJEmblem visible={emblemVisible} size={220} />
        </div>

        <GlitchName />

        <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
          <TypewriterRoles />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: '📍 VVCE, Mysuru', color: 'rgba(255,255,255,0.35)' },
            { label: '⚡ QUIRK TECHNOLOGIES', color: 'rgba(6,182,212,0.7)' },
            { label: '🏆 IIT Bombay TechFest Winner', color: 'rgba(99,102,241,0.8)' },
          ].map(chip => (
            <span key={chip.label} style={{
              fontSize: '0.7rem', fontWeight: 600, color: chip.color,
              padding: '4px 10px', borderRadius: 999,
              border: `1px solid ${chip.color}55`, background: `${chip.color}10`,
              letterSpacing: '0.03em',
            }}>
              {chip.label}
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
          <a
            href="#projects"
            data-cursor
            onClick={e => { e.preventDefault(); document.querySelector('#projects')?.scrollIntoView({ behavior: 'smooth' }); }}
            style={{
              padding: '10px 22px',
              background: 'linear-gradient(135deg, #06b6d4, #6366f1)',
              color: '#f0f4ff', fontWeight: 600, fontSize: '0.82rem',
              borderRadius: 8, border: 'none', cursor: 'none',
              textDecoration: 'none', letterSpacing: '0.03em',
            }}
          >
            See my work
          </a>
          <a
            href="#contact"
            data-cursor
            onClick={e => { e.preventDefault(); document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' }); }}
            style={{
              padding: '10px 22px', background: 'transparent', color: '#06b6d4',
              fontWeight: 600, fontSize: '0.82rem', borderRadius: 8,
              border: '1px solid rgba(6,182,212,0.4)', cursor: 'none',
              textDecoration: 'none', letterSpacing: '0.03em',
            }}
          >
            Get in touch
          </a>
        </div>

        <ProjectTicker />
      </div>

      {/* ── RIGHT HALF ── */}
      <div
        style={{ position: 'relative', zIndex: 2, height: '100%' }}
        className="max-md:hidden"
      >
        <PhotoPlaceholder />
      </div>

      {/* Printer arm — uses emblemRef for positioning */}
      <PrinterArm onComplete={() => setEmblemVisible(true)} emblemRef={emblemRef} />
    </section>
  );
}
