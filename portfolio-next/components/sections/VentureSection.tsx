'use client';
// components/sections/VentureSection.tsx
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import SectionLabel from '@/components/ui/SectionLabel';

export default function VentureSection() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section
      id="venture"
      ref={ref}
      aria-label="Current Venture"
      style={{
        padding: 'clamp(4rem,8vh,7rem) clamp(1.5rem,5vw,4rem)',
        paddingLeft: 'calc(200px + clamp(1.5rem,4vw,4rem))',
        position: 'relative',
        zIndex: 2,
      }}
      className="max-md:pl-8 max-md:pr-8"
    >
      <SectionLabel color="#f59e0b">Venture</SectionLabel>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        style={{
          borderRadius: 20,
          border: '1px solid rgba(245,158,11,0.2)',
          background: 'rgba(245,158,11,0.04)',
          padding: 'clamp(2rem,4vw,3rem)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Corner glow */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -60,
            right: -60,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Funded badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#f59e0b',
              padding: '4px 12px',
              borderRadius: 999,
              border: '1px solid rgba(245,158,11,0.4)',
              background: 'rgba(245,158,11,0.08)',
            }}
          >
            ✦ Funded
          </span>
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#06b6d4',
              padding: '4px 12px',
              borderRadius: 999,
              border: '1px solid rgba(6,182,212,0.3)',
              background: 'rgba(6,182,212,0.06)',
            }}
          >
            ⏱ ETA: ~2 months
          </span>
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#6366f1',
              padding: '4px 12px',
              borderRadius: 999,
              border: '1px solid rgba(99,102,241,0.3)',
              background: 'rgba(99,102,241,0.06)',
            }}
          >
            🔒 Stealth
          </span>
        </div>

        <h2
          style={{
            fontSize: 'clamp(1.5rem,3vw,2.2rem)',
            fontWeight: 700,
            color: '#f0f4ff',
            marginBottom: '1rem',
            lineHeight: 1.2,
          }}
        >
          Currently Building Something Big
        </h2>

        <p
          style={{
            fontSize: '0.92rem',
            color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.75,
            maxWidth: 600,
            marginBottom: '1.5rem',
          }}
        >
          Under QUIRK TECHNOLOGIES — a funded B2B product at the intersection of CAD automation,
          IoT infrastructure, and cloud services. This isn&apos;t a side project. It&apos;s a company in stealth.
          ~2 months to launch.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {['CAD Automation', 'IoT Infrastructure', 'Cloud Services', 'B2B', 'QUIRK TECHNOLOGIES'].map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Build progress
            </span>
            <span style={{ fontSize: '0.65rem', color: '#06b6d4', fontWeight: 600 }}>~85%</span>
          </div>
          <div style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: '0%' }}
              animate={isInView ? { width: '85%' } : {}}
              transition={{ duration: 1.2, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
              style={{
                height: '100%',
                borderRadius: 999,
                background: 'linear-gradient(to right, #06b6d4, #6366f1)',
              }}
            />
          </div>
        </div>
      </motion.div>
    </section>
  );
}
