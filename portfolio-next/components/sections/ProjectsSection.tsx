'use client';
// components/sections/ProjectsSection.tsx
import { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Lock } from 'lucide-react';
import SectionLabel from '@/components/ui/SectionLabel';
import Modal from '@/components/ui/Modal';
import { projects, Project } from '@/lib/data';

const STATUS_COLOR: Record<string, string> = {
  active: '#06b6d4',
  live: '#22c55e',
  winner: '#f59e0b',
  confidential: '#6366f1',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  live: 'Live',
  winner: '🏆 Winner',
  confidential: '🔒 Confidential',
};

export default function ProjectsSection() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const [selected, setSelected] = useState<Project | null>(null);

  return (
    <section
      id="projects"
      ref={ref}
      aria-label="Projects"
      style={{
        padding: 'clamp(4rem,8vh,7rem) clamp(1.5rem,5vw,4rem)',
        paddingLeft: 'calc(200px + clamp(1.5rem,4vw,4rem))',
        position: 'relative',
        zIndex: 2,
      }}
      className="max-md:pl-8 max-md:pr-8"
    >
      <SectionLabel color="#06b6d4">Projects</SectionLabel>
      <h2 style={{ fontSize: 'clamp(1.8rem,3.5vw,2.8rem)', fontWeight: 700, marginBottom: '0.25rem', color: '#f0f4ff' }}>
        What I&apos;ve shipped.
      </h2>
      <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', marginBottom: '2.5rem' }}>
        Real systems, real impact.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1rem',
        }}
      >
        {projects.map((project, i) => {
          const isConfidential = project.status === 'confidential';
          return (
            <motion.article
              key={project.id}
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              onClick={() => setSelected(project)}
              role="button"
              aria-label={`Open ${project.name} details`}
              style={{
                gridColumn: isConfidential ? '1 / -1' : undefined,
                borderRadius: 14,
                border: `1px solid ${STATUS_COLOR[project.status]}28`,
                background: 'rgba(255,255,255,0.025)',
                padding: '1.5rem',
                cursor: 'none',
                transition: 'background 0.2s, border-color 0.2s, transform 0.2s',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                flexDirection: isConfidential ? 'row' : 'column',
                alignItems: isConfidential ? 'center' : undefined,
                gap: isConfidential ? '2rem' : undefined,
              }}
              whileHover={{
                background: `${STATUS_COLOR[project.status]}08`,
                borderColor: `${STATUS_COLOR[project.status]}55`,
                y: -2,
              }}
            >
              {/* Emoji */}
              <div style={{ fontSize: isConfidential ? '2.5rem' : '1.8rem', marginBottom: isConfidential ? 0 : '0.75rem' }}>
                {isConfidential ? <Lock size={32} color="#6366f1" /> : project.emoji}
              </div>

              <div style={{ flex: 1 }}>
                {/* Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.5rem' }}>
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      color: STATUS_COLOR[project.status],
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: STATUS_COLOR[project.status],
                        boxShadow: `0 0 6px ${STATUS_COLOR[project.status]}`,
                        display: 'inline-block',
                      }}
                    />
                    {STATUS_LABEL[project.status]}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f0f4ff', marginBottom: '0.2rem' }}>
                  {project.name}
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', marginBottom: '0.9rem' }}>
                  {project.subtitle}
                </p>

                {/* Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: '0.62rem',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: 'rgba(255,255,255,0.05)',
                        color: 'rgba(255,255,255,0.45)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Arrow hint */}
              <div style={{ marginTop: isConfidential ? 0 : '1rem', color: 'rgba(255,255,255,0.25)', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>View details</span>
                <span>→</span>
              </div>
            </motion.article>
          );
        })}
      </div>

      <Modal project={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
