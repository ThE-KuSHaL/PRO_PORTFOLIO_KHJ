'use client';
// components/sections/JourneySection.tsx
import { motion } from 'framer-motion';
import SectionLabel from '@/components/ui/SectionLabel';
import { journeyMilestones } from '@/lib/data';
// River-curve path that mathematically intersects every milestone's (x, y) defined in data.ts
const PATH_D = `M 400 40 C 400 100, 580 100, 580 160 L 580 260 C 580 320, 400 320, 400 380 C 400 435, 220 435, 220 490 L 220 590 C 220 640, 400 640, 400 690 C 400 740, 580 740, 580 790 C 580 835, 400 835, 400 880`;

export default function JourneySection() {
  return (
    <section
      id="journey"
      aria-label="Journey"
      style={{
        paddingLeft: 'calc(200px + clamp(1.5rem,4vw,4rem))',
        paddingTop: 'clamp(5rem,8vh,7rem)',
        paddingBottom: 'clamp(5rem,8vh,7rem)',
        paddingRight: 'clamp(1.5rem,4vw,4rem)',
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
      }}
      className="max-md:pl-8 max-md:pr-8"
    >
      <SectionLabel color="#6366f1">Journey</SectionLabel>

      <p
        style={{
          fontSize: '1rem',
          fontFamily: 'Space Grotesk, sans-serif',
          color: 'rgba(255,255,255,0.35)',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          marginBottom: '3rem',
        }}
      >
        THE PATH THAT LED HERE.
      </p>

      {/* SVG journey map — renders in natural flow */}
      <div style={{ position: 'relative', maxWidth: 800, width: '100%', margin: '0 auto' }}>
        <svg
          viewBox="0 0 800 920"
          width="100%"
          height="auto" // Scale height gracefully
          overflow="visible"
          aria-hidden="true"
          style={{ display: 'block' }}
        >
          <defs>
            <filter id="jglow2" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Ghost path — subtle guide */}
          <path
            d={PATH_D}
            fill="none"
            stroke="rgba(6,182,212,0.08)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Animated draw path — draws as the user scrolls into view */}
          <motion.path
            d={PATH_D}
            fill="none"
            stroke="rgba(6,182,212,0.55)"
            strokeWidth="2.5"
            strokeLinecap="round"
            filter="url(#jglow2)"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, margin: '-10% 0px -40% 0px' }}
            transition={{ duration: 2, ease: 'easeOut' }}
          />

          {/* Milestones */}
          {journeyMilestones.map((m, i) => {
            const isLeft = m.side === 'left';
            const labelX = (isLeft ? m.x - 55 : m.x + 55) as number;
            const textAnchor = (isLeft ? 'end' : 'start') as 'start' | 'middle' | 'end';

            return (
              <MilestoneGroup
                key={i}
                index={i}
                x={m.x} y={m.y}
                labelX={labelX} textAnchor={textAnchor}
                year={m.year} title={m.title} summary={m.summary}
              />
            );
          })}
        </svg>
      </div>
    </section>
  );
}

interface MilestoneGroupProps {
  index: number;
  x: number; y: number;
  labelX: number; textAnchor: 'start' | 'middle' | 'end';
  year: string; title: string; summary: string;
}

function MilestoneGroup({ index, x, y, labelX, textAnchor, year, title, summary }: MilestoneGroupProps) {
  return (
    <motion.g
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10% 0px -20% 0px' }}
      transition={{ delay: index * 0.15 + 0.3, duration: 0.5 }}
    >
      {/* Outer pulse ring */}
      <circle cx={x} cy={y} r={22} fill="none" stroke="#6366f1" strokeWidth="1.5" opacity="0.25" />
      {/* Node */}
      <circle cx={x} cy={y} r={8} fill="#06b6d4" filter="url(#jglow2)" />

      {/* Year */}
      <text x={labelX} y={y - 20} textAnchor={textAnchor}
        fill="rgba(6,182,212,0.85)" fontSize="13" fontWeight="700" letterSpacing="1.5"
        fontFamily="Space Grotesk, sans-serif"
      >{year}</text>

      {/* Title */}
      <text x={labelX} y={y + 2} textAnchor={textAnchor}
        fill="#f0f4ff" fontSize="16" fontWeight="700"
        fontFamily="Space Grotesk, sans-serif"
      >{title}</text>

      {/* Summary */}
      <text x={labelX} y={y + 22} textAnchor={textAnchor}
        fill="rgba(255,255,255,0.45)" fontSize="12"
        fontFamily="Space Grotesk, sans-serif"
      >{summary}</text>
    </motion.g>
  );
}
