'use client';
// components/hero/HeroSection.tsx
import { useRef, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import GlitchName from './GlitchName';
import TypewriterRoles from './TypewriterRoles';
import ProjectTicker from './ProjectTicker';
import PhotoPlaceholder from './PhotoPlaceholder';
import KHJEmblem from './KHJEmblem';

const PrinterArm = dynamic(() => import('./PrinterArm'), { ssr: false });

export default function HeroSection() {
  const [isMobile, setIsMobile] = useState(false);
  const [emblemVisible, setEmblemVisible] = useState(false);
  const [armDone, setArmDone] = useState(false);
  const emblemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
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
        style={{
          position: 'absolute',
          // Desktop: right half
          left: isMobile ? 0 : '50%',
          right: 0,
          top: 0,
          bottom: 0,
          zIndex: 0,
          // Mobile: dim the photo so text reads over it
          opacity: isMobile ? 0.35 : 1,
        }}
      >
        <PhotoPlaceholder />
      </div>

      {/* ── CONTENT COLUMN ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          // Desktop: left half with sidebar offset; Mobile: full width with safe padding
          width: isMobile ? '100%' : '50%',
          padding: isMobile
            ? 'clamp(5rem, 10vh, 7rem) 1.5rem 3rem'
            : 'clamp(2rem, 5vw, 5rem) clamp(1.5rem, 4vw, 3.5rem)',
          paddingLeft: isMobile ? '1.5rem' : 'calc(200px + clamp(1.5rem, 3vw, 3rem))',
        }}
      >
        {/* KHJ Emblem — wrapper always has explicit dimensions so getBoundingClientRect works even at opacity:0 */}
        <div
          ref={emblemRef}
          style={{
            position: 'relative',
            display: 'inline-flex',
            marginBottom: '1.5rem',
            transform: isMobile ? 'scale(0.75)' : 'scale(1)',
            transformOrigin: 'left center',
            // Explicit size so the arm can read real coordinates before the emblem is visible
            width: 220,
            height: 220,
            opacity: emblemVisible ? 1 : 0,
            transition: 'opacity 0.6s ease',
          }}
        >
          <KHJEmblem visible={emblemVisible} size={220} />
        </div>

        {/* Printer arm — renders once on mount, calls onComplete to show emblem */}
        {!armDone && (
          <PrinterArm
            emblemRef={emblemRef}
            onComplete={() => {
              setEmblemVisible(true);
              setArmDone(true);
            }}
          />
        )}

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
            <span key={chip.label} style={{
              fontSize: isMobile ? '0.65rem' : '0.7rem',
              fontWeight: 600,
              color: chip.color,
              padding: isMobile ? '3px 8px' : '4px 10px',
              borderRadius: 999,
              border: `1px solid ${chip.color}55`,
              background: `${chip.color}10`,
              letterSpacing: '0.03em',
              backdropFilter: 'blur(4px)',
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
            style={{
              padding: isMobile ? '10px 20px' : '10px 22px',
              background: 'linear-gradient(135deg, #06b6d4, #6366f1)',
              color: '#f0f4ff', fontWeight: 600,
              fontSize: isMobile ? '0.8rem' : '0.82rem',
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
            style={{
              padding: isMobile ? '10px 20px' : '10px 22px',
              background: 'rgba(6,182,212,0.1)',
              backdropFilter: 'blur(8px)',
              color: '#06b6d4', fontWeight: 600,
              fontSize: isMobile ? '0.8rem' : '0.82rem',
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
