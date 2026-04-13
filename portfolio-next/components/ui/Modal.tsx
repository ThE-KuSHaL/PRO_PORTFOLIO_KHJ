'use client';
// components/ui/Modal.tsx
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Project } from '@/lib/data';

interface ModalProps {
  project: Project | null;
  onClose: () => void;
}

export default function Modal({ project, onClose }: ModalProps) {
  useEffect(() => {
    if (project) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [project]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      {project && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(3,8,16,0.75)',
            backdropFilter: 'blur(12px)',
            padding: '1rem',
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 10 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 560,
              borderRadius: 16,
              background: 'rgba(10,14,28,0.96)',
              border: '1px solid rgba(6,182,212,0.2)',
              padding: '2rem',
              position: 'relative',
            }}
          >
            {/* Close */}
            <button
              onClick={onClose}
              aria-label="Close modal"
              style={{
                position: 'absolute',
                top: 16, right: 16,
                background: 'transparent',
                border: 'none',
                cursor: 'none',
                color: 'rgba(255,255,255,0.4)',
                padding: 4,
              }}
            >
              <X size={18} />
            </button>

            {/* Emoji */}
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{project.emoji}</div>

            {/* Title */}
            <h2
              id="modal-title"
              style={{
                fontSize: '1.4rem',
                fontWeight: 700,
                color: '#06b6d4',
                marginBottom: '0.25rem',
              }}
            >
              {project.name}
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', marginBottom: '1.25rem' }}>
              {project.subtitle}
            </p>

            {/* Description */}
            <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              {project.description}
            </p>

            {/* Tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: '1.5rem' }}>
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: 'rgba(6,182,212,0.1)',
                    border: '1px solid rgba(6,182,212,0.25)',
                    color: '#06b6d4',
                    letterSpacing: '0.04em',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Links */}
            <div style={{ display: 'flex', gap: 12 }}>
              {project.modal.demo ? (
                <a
                  href={project.modal.demo}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '8px 18px',
                    borderRadius: 8,
                    background: 'linear-gradient(135deg,#06b6d4,#6366f1)',
                    color: '#fff',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Live Demo
                </a>
              ) : null}
              {project.modal.github ? (
                <a
                  href={project.modal.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '8px 18px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    background: 'transparent',
                  }}
                >
                  GitHub
                </a>
              ) : null}
              {!project.modal.demo && !project.modal.github && project.status === 'confidential' && (
                <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>
                  🔒 Links will be released at launch
                </span>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
