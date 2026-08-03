'use client';

import React from 'react';
import { CortexApp } from '../cortex/App';

import SectionLabel from '@/components/ui/SectionLabel';

export default function SkillsSection() {
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
        contain: 'paint'
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

      <div className="relative w-full flex-1 min-h-[600px] overflow-visible z-0">
        <CortexApp />
      </div>
    </section>
  );
}
