'use client';
// components/hero/HeroSection.tsx
import { useEffect, useState } from 'react';
import GlitchName from './GlitchName';
import TypewriterRoles from './TypewriterRoles';
import ProjectTicker from './ProjectTicker';
import PhotoPlaceholder from './PhotoPlaceholder';
import KHJEmblem from './KHJEmblem';

export default function HeroSection() {
  const [emblemVisible, setEmblemVisible] = useState(false);

  // The emblem's own layer-by-layer assembly plays shortly after load.
  useEffect(() => {
    const t = setTimeout(() => setEmblemVisible(true), 250);
    return () => clearTimeout(t);
  }, []);

  return (
    <section
      id="hero"
      aria-label="Hero"
      style={{
        minHeight: '100svh',      // svh respects mobile browser chrome
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
      }}
    >
      {/* ── PHOTO — full bleed background on BOTH layouts ── */}
      {/* On desktop it sits in the right half; on mobile it spans full width as a bg layer */}
      <div
        className="hero-photo"
      >
        <PhotoPlaceholder />
      </div>

      {/* ── CONTENT COLUMN ── */}
      <div
        className="hero-col"
      >
        {/* KHJ Emblem — wrapper always has explicit dimensions so getBoundingClientRect works even at opacity:0 */}
        <div
          className="hero-emblem"
          style={{
            position: 'relative',
            display: 'inline-flex',
            marginBottom: '1.5rem',
            // Explicit size so the arm can read real coordinates before the emblem is visible
            width: 220,
            height: 220,
            opacity: emblemVisible ? 1 : 0,
            transition: 'opacity 0.6s ease',
          }}
        >
          <KHJEmblem visible={emblemVisible} size={220} />
        </div>

        <GlitchName />

        <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
          <TypewriterRoles />
        </div>

        {/* Stat chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginTop: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: '📍 VVCE, Mysuru', color: 'rgba(255,255,255,0.35)' },
            { label: '⚡ QUIRK TECHNOLOGIES', color: 'rgba(6,182,212,0.7)' },
            { label: '🛡️ Kavach — AI Fraud Detection', color: 'rgba(99,102,241,0.8)' },
          ].map(chip => (
            <span key={chip.label} className="hero-chip" style={{
              fontWeight: 600,
              color: chip.color,
              borderRadius: 999,
              border: `1px solid ${chip.color}55`,
              background: `${chip.color}10`,
              letterSpacing: '0.03em',
            }}>
              {chip.label}
            </span>
          ))}
        </div>

        {/* CTA buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
          <a
            href="#projects"
            onClick={e => { e.preventDefault(); document.querySelector('#projects')?.scrollIntoView({ behavior: 'smooth' }); }}
            className="hero-cta"
            style={{
              background: 'linear-gradient(135deg, #06b6d4, #6366f1)',
              color: '#f0f4ff', fontWeight: 600,
              borderRadius: 8, border: 'none', cursor: 'pointer',
              textDecoration: 'none', letterSpacing: '0.03em',
              boxShadow: '0 4px 20px rgba(6,182,212,0.3)',
            }}
          >
            See my work
          </a>
          <a
            href="#contact"
            onClick={e => { e.preventDefault(); document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' }); }}
            className="hero-cta"
            style={{
              background: 'rgba(6,182,212,0.12)',
              color: '#06b6d4', fontWeight: 600,
              borderRadius: 8,
              border: '1px solid rgba(6,182,212,0.4)',
              cursor: 'pointer',
              textDecoration: 'none', letterSpacing: '0.03em',
            }}
          >
            Get in touch
          </a>
        </div>

        <ProjectTicker />
      </div>
    </section>
  );
}
