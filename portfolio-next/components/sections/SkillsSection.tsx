'use client';
// components/sections/SkillsSection.tsx
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import SectionLabel from '@/components/ui/SectionLabel';
import { skills } from '@/lib/data';

function LED({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: on ? '#06b6d4' : 'rgba(255,255,255,0.15)',
        boxShadow: on ? '0 0 6px 2px rgba(6,182,212,0.6)' : 'none',
        transition: 'all 0.3s',
        flexShrink: 0,
      }}
    />
  );
}

const VARIANT_COLOR: Record<string, string> = {
  primary: '#06b6d4',
  secondary: '#6366f1',
  dim: 'rgba(255,255,255,0.35)',
};

export default function SkillsSection() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section
      id="skills"
      ref={ref}
      aria-label="Skills"
      style={{
        padding: 'clamp(4rem,8vh,7rem) clamp(1.5rem,5vw,4rem)',
        paddingLeft: 'calc(200px + clamp(1.5rem,4vw,4rem))',
        position: 'relative',
        zIndex: 2,
      }}
      className="max-md:pl-8 max-md:pr-8"
    >
      <SectionLabel color="#4f87ff">Skills</SectionLabel>
      <h2 style={{ fontSize: 'clamp(1.8rem,3.5vw,2.8rem)', fontWeight: 700, marginBottom: '0.25rem', color: '#f0f4ff' }}>
        Mission Control.
      </h2>
      <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', marginBottom: '2.5rem' }}>
        Systems live. All channels operational.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1rem',
        }}
      >
        {skills.map((cat, ci) => (
          <motion.div
            key={cat.category}
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: ci * 0.07, duration: 0.5 }}
            style={{
              borderRadius: 12,
              border: '1px solid rgba(99,102,241,0.15)',
              background: 'rgba(255,255,255,0.025)',
              padding: '1.25rem',
              backdropFilter: 'blur(8px)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Panel header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: '1rem',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <LED on={isInView} />
              <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.35)', flex: 1 }}>
                SYS::{cat.category.replace(' ', '_').toUpperCase()}
              </span>
              <span style={{ fontSize: '1rem', color: '#06b6d4', lineHeight: 1 }}>{cat.icon}</span>
            </div>

            {/* Skills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {cat.items.map((skill, si) => (
                <motion.span
                  key={skill.label}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ delay: ci * 0.07 + si * 0.04 + 0.2, duration: 0.3 }}
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: 999,
                    color: VARIANT_COLOR[skill.variant],
                    border: `1px solid ${VARIANT_COLOR[skill.variant]}44`,
                    background: `${VARIANT_COLOR[skill.variant]}0e`,
                    letterSpacing: '0.03em',
                  }}
                >
                  {skill.label}
                </motion.span>
              ))}
            </div>

            {/* Subtle scan line */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 1,
                background: 'linear-gradient(to right, transparent, rgba(6,182,212,0.2), transparent)',
              }}
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
