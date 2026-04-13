'use client';
// components/sections/AboutSection.tsx
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import SectionLabel from '@/components/ui/SectionLabel';
import Image from 'next/image';

const CHIPS = [
  '2nd Year · ISE',
  'Funded Project · Active',
  'VVCE, Mysuru',
  'IIT Bombay TechFest Winner',
];

export default function AboutSection() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section
      id="about"
      ref={ref}
      aria-label="About"
      style={{
        padding: 'clamp(4rem,8vh,7rem) clamp(1.5rem,5vw,4rem)',
        paddingLeft: 'calc(200px + clamp(1.5rem,4vw,4rem))',
        position: 'relative',
        zIndex: 2,
      }}
      className="max-md:pl-8 max-md:pr-8"
    >
      <SectionLabel>About</SectionLabel>
      <h2
        style={{
          fontSize: 'clamp(1.8rem,3.5vw,2.8rem)',
          fontWeight: 700,
          marginBottom: '0.25rem',
          color: '#f0f4ff',
        }}
      >
        The builder behind the code.
      </h2>
      <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', marginBottom: '3rem' }}>
        A little about me — and why I build.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.4fr',
          gap: '3rem',
          alignItems: 'start',
        }}
        className="max-md:grid-cols-1"
      >
        {/* Left */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          {/* PFP Avatar */}
          <div
            style={{
              width: 120, height: 120,
              borderRadius: '50%',
              border: '1.5px solid rgba(6,182,212,0.4)',
              background: 'rgba(6,182,212,0.05)',
              position: 'relative',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden' }}>
              <Image 
                src="/pfp_PORT.png" 
                alt="Kushal H J" 
                fill 
                style={{ objectFit: 'cover', objectPosition: 'center top' }} 
              />
            </div>
            {/* Outer ring */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: -6,
                borderRadius: '50%',
                border: '1px solid rgba(99,102,241,0.3)',
                pointerEvents: 'none',
              }}
            />
          </div>

          {/* Stat chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CHIPS.map((chip, i) => (
              <motion.span
                key={chip}
                initial={{ opacity: 0, y: 8 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  padding: '5px 12px',
                  borderRadius: 999,
                  border: '1px solid rgba(6,182,212,0.22)',
                  background: 'rgba(6,182,212,0.06)',
                  color: 'rgba(6,182,212,0.85)',
                  letterSpacing: '0.04em',
                }}
              >
                {chip}
              </motion.span>
            ))}
          </div>
        </motion.div>

        {/* Right — narrative */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15 }}
          style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}
        >
          {[
            'It started with curiosity — how do machines talk to each other? That single question sent me down a rabbit hole that never ended.',
            'I\'m an ISE student at VVCE, Mysuru, but the real engineering happens far outside the syllabus. I build backend systems, AI-powered workflows using LLMs, and IoT pipelines that bridge physical hardware to cloud infrastructure.',
            'I co-founded QUIRK TECHNOLOGIES and shipped three real products: FLOW (gas sensing IoT), DHARMAJYOTI (AI legal companion), and VAHANA (IoT AQI system that won IIT Bombay TechFest).',
            'Right now I\'m building a funded B2B venture at the intersection of CAD, IoT, and cloud — stealth mode, ~2 months from launch.',
            'My goal isn\'t to graduate. It\'s to build things that last.',
          ].map((para, i) => (
            <p
              key={i}
              style={{
                fontSize: '0.9rem',
                lineHeight: 1.75,
                color: i === 4
                  ? 'rgba(6,182,212,0.9)'
                  : 'rgba(255,255,255,0.65)',
                fontWeight: i === 4 ? 600 : 400,
              }}
            >
              {para}
            </p>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
