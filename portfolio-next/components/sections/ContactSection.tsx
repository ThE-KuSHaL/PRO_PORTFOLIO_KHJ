'use client';
// components/sections/ContactSection.tsx
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ExternalLink, GitBranch, FileText } from 'lucide-react';
import SectionLabel from '@/components/ui/SectionLabel';

// ─── Map grid SVG ─────────────────────────────────────────────────────────────
function CyberMap({ width, height }: { width: number; height: number }) {
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%"
      style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
      {/* Base fill */}
      <rect width={width} height={height} fill="rgba(3,8,20,0.97)" />

      {/* Radial center glow */}
      <radialGradient id="mapglow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="rgba(6,182,212,0.06)" />
        <stop offset="100%" stopColor="transparent" />
      </radialGradient>
      <rect width={width} height={height} fill="url(#mapglow)" />

      {/* Minor grid */}
      {Array.from({ length: 22 }, (_, i) => (
        <line key={`h${i}`} x1={0} y1={(i + 1) * height / 22} x2={width} y2={(i + 1) * height / 22}
          stroke="rgba(6,182,212,0.07)" strokeWidth="0.6" />
      ))}
      {Array.from({ length: 34 }, (_, i) => (
        <line key={`v${i}`} x1={(i + 1) * width / 34} y1={0} x2={(i + 1) * width / 34} y2={height}
          stroke="rgba(6,182,212,0.07)" strokeWidth="0.6" />
      ))}

      {/* Major roads */}
      {[0.2, 0.45, 0.72].map((f, i) => (
        <line key={`mh${i}`} x1={0} y1={f * height} x2={width} y2={f * height}
          stroke="rgba(6,182,212,0.14)" strokeWidth="1.2" />
      ))}
      {[0.18, 0.42, 0.65, 0.84].map((f, i) => (
        <line key={`mv${i}`} x1={f * width} y1={0} x2={f * width} y2={height}
          stroke="rgba(6,182,212,0.14)" strokeWidth="1.2" />
      ))}

      {/* Topo contours — concentric rects for depth */}
      {[0.12, 0.22, 0.32].map((r, i) => (
        <rect key={`topo${i}`}
          x={width * (0.5 - r * 1.6)} y={height * (0.5 - r * 2)}
          width={width * r * 3.2} height={height * r * 4}
          fill="none" stroke="rgba(99,102,241,0.05)" strokeWidth="0.8" strokeDasharray="4 8" />
      ))}

      {/* City blocks */}
      {[
        [0.06, 0.08, 0.14, 0.22], [0.26, 0.12, 0.18, 0.3],
        [0.5, 0.06, 0.16, 0.2],  [0.72, 0.15, 0.12, 0.28],
        [0.1, 0.5, 0.2, 0.35],   [0.48, 0.52, 0.22, 0.38],
        [0.76, 0.55, 0.16, 0.32],
      ].map(([fx, fy, fw, fh], i) => (
        <rect key={`blk${i}`}
          x={fx * width} y={fy * height} width={fw * width} height={fh * height}
          fill="rgba(99,102,241,0.03)" stroke="rgba(6,182,212,0.07)" strokeWidth="0.7" />
      ))}
    </svg>
  );
}

// ─── Pin config ───────────────────────────────────────────────────────────────
interface PinConfig {
  id: string;
  label: string;
  icon: React.ElementType;
  accent: string;
  pctX: number; // 0-1
  pctY: number; // 0-1
  dur: number;
  delay: number;
  action: 'link' | 'copy' | 'download';
  href?: string;
  value?: string;
  btnLabel: string;
}

const PINS: PinConfig[] = [
  {
    id: 'linkedin', label: 'LinkedIn', icon: ExternalLink, accent: '#0ea5e9',
    pctX: 0.22, pctY: 0.38, dur: 2.8, delay: 0,
    action: 'link', href: 'https://linkedin.com/in/kushalhj', // TODO
    btnLabel: 'Connect on LinkedIn',
  },
  {
    id: 'github', label: 'GitHub', icon: GitBranch, accent: '#6366f1',
    pctX: 0.45, pctY: 0.58, dur: 3.2, delay: 0.5,
    action: 'link', href: 'https://github.com/kushalhj', // TODO
    btnLabel: 'View my code',
  },
  {
    id: 'mail', label: 'Email', icon: Mail, accent: '#06b6d4',
    pctX: 0.68, pctY: 0.32, dur: 3.0, delay: 1.0,
    action: 'copy', value: 'kushalhj.dev@gmail.com',
    btnLabel: 'Copy email',
  },
  {
    id: 'resume', label: 'Resume', icon: FileText, accent: '#f59e0b',
    pctX: 0.80, pctY: 0.62, dur: 3.4, delay: 1.5,
    action: 'download', href: '/resume.pdf', // TODO: place resume.pdf in /public
    btnLabel: 'Download Resume',
  },
];

// ─── SinglePin ────────────────────────────────────────────────────────────────
function SinglePin({ pin, isOpen, onToggle }: { pin: PinConfig; isOpen: boolean; onToggle: () => void }) {
  const [copied, setCopied] = useState(false);
  const Icon = pin.icon;

  async function handleAction(e: React.MouseEvent) {
    e.stopPropagation();
    if (pin.action === 'copy' && pin.value) {
      await navigator.clipboard.writeText(pin.value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else if (pin.action === 'link' && pin.href) {
      window.open(pin.href, '_blank', 'noopener,noreferrer');
    } else if (pin.action === 'download' && pin.href) {
      const a = document.createElement('a');
      a.href = pin.href; a.download = ''; a.click();
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: `${pin.pctX * 100}%`,
        top: `${pin.pctY * 100}%`,
        transform: 'translateX(-50%)',
        zIndex: 10,
      }}
    >
      {/* Info card */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 10 }}
            transition={{ duration: 0.22 }}
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute',
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginBottom: 14,
              width: 200,
              padding: '0.9rem 1.1rem',
              borderRadius: 10,
              background: 'rgba(3,8,20,0.96)',
              border: `1px solid ${pin.accent}80`,
              backdropFilter: 'blur(16px)',
              boxShadow: `0 0 24px ${pin.accent}22`,
            }}
          >
            <p style={{ fontSize: '0.68rem', fontWeight: 700, color: pin.accent,
              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
              {pin.label}
            </p>
            {pin.action === 'copy' && (
              <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', marginBottom: 8, wordBreak: 'break-all' }}>
                {pin.value}
              </p>
            )}
            <button
              onClick={handleAction}
              data-cursor
              style={{
                padding: '5px 12px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600,
                cursor: 'none', border: `1px solid ${copied ? '#22c55e80' : `${pin.accent}66`}`,
                background: copied ? 'rgba(34,197,94,0.1)' : `${pin.accent}15`,
                color: copied ? '#22c55e' : pin.accent,
              }}
            >
              {copied ? 'Copied ✓' : pin.btnLabel}
            </button>

            {/* Arrow pointer */}
            <div style={{
              position: 'absolute', bottom: -7, left: '50%', transform: 'translateX(-50%)',
              width: 0, height: 0,
              borderLeft: '7px solid transparent', borderRight: '7px solid transparent',
              borderTop: `7px solid ${pin.accent}80`,
            }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Light beam */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: pin.dur, delay: pin.delay, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      >
        {/* Beam */}
        <div style={{
          width: 2,
          height: 80,
          background: `linear-gradient(to top, ${pin.accent}99 0%, transparent 100%)`,
          filter: 'blur(1px)',
          marginBottom: -4,
        }} />

        {/* Pin body — teardrop via clip-path */}
        <div
          onClick={e => { e.stopPropagation(); onToggle(); }}
          data-cursor
          style={{
            width: 48,
            height: 56,
            position: 'relative',
            cursor: 'none',
            clipPath: 'path("M 24 0 C 37 0 48 11 48 24 C 48 37 24 56 24 56 C 24 56 0 37 0 24 C 0 11 11 0 24 0 Z")',
            background: `linear-gradient(160deg, ${pin.accent} 0%, ${pin.accent}88 100%)`,
            boxShadow: `0 8px 24px ${pin.accent}66, 0 0 12px ${pin.accent}33`,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: 12,
          }}
        >
          <Icon size={20} color="#fff" />
        </div>
      </motion.div>

      {/* Base ring — stays on ground, does not float */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: -6 }}>
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 2.5, delay: pin.delay, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: 48, height: 16, borderRadius: '50%',
            background: `${pin.accent}4d`,
            border: `1px solid ${pin.accent}66`,
          }}
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.12, 0.18, 0.12] }}
          transition={{ duration: 2.5, delay: pin.delay + 0.3, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            width: 64, height: 22, borderRadius: '50%',
            background: `${pin.accent}1a`,
            border: `1px solid ${pin.accent}33`,
            top: -3,
          }}
        />
      </div>
    </div>
  );
}

// ─── Mobile card grid ─────────────────────────────────────────────────────────
function MobileContactCards() {
  const [copied, setCopied] = useState(false);

  async function handleCopy(value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
      {PINS.map((pin) => {
        const Icon = pin.icon;
        return (
          <motion.div
            key={pin.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            onClick={() => {
              if (pin.action === 'copy' && pin.value) handleCopy(pin.value);
              else if (pin.action === 'link' && pin.href) window.open(pin.href, '_blank', 'noopener,noreferrer');
              else if (pin.action === 'download' && pin.href) { const a = document.createElement('a'); a.href = pin.href; a.download = ''; a.click(); }
            }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 10, padding: '1.25rem 1rem', borderRadius: 14,
              border: `1px solid ${pin.accent}40`,
              background: `${pin.accent}0a`,
              cursor: 'pointer', textAlign: 'center',
            }}
          >
            <div style={{ width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${pin.accent}18`, border: `1px solid ${pin.accent}44` }}>
              <Icon size={20} color={pin.accent} />
            </div>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f0f4ff' }}>{pin.label}</span>
            {pin.action === 'copy' && pin.value && (
              <span style={{ fontSize: '0.65rem', color: copied ? '#22c55e' : 'rgba(255,255,255,0.4)', wordBreak: 'break-all' }}>
                {copied ? 'Copied ✓' : pin.value}
              </span>
            )}
            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: pin.accent }}>{pin.btnLabel} →</span>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────
const MAP_W = 860;
const MAP_H = Math.round(MAP_W * (7 / 16)); // 16:7

export default function ContactSection() {
  const [openPin, setOpenPin] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (mapContainerRef.current && !mapContainerRef.current.contains(e.target as Node)) {
        setOpenPin(null);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <section
      id="contact"
      aria-label="Contact"
      style={{
        padding: 'clamp(4rem,8vh,7rem) clamp(1.5rem,5vw,4rem)',
        paddingLeft: 'calc(200px + clamp(1.5rem,4vw,4rem))',
        paddingBottom: '6rem',
        position: 'relative', zIndex: 2,
      }}
      className="max-md:pl-8 max-md:pr-8"
    >
      <SectionLabel color="#06b6d4">Contact</SectionLabel>
      <h2 style={{ fontSize: 'clamp(1.8rem,3.5vw,2.8rem)', fontWeight: 700, marginBottom: '0.25rem', color: '#f0f4ff' }}>
        Let&apos;s build something.
      </h2>
      <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.45)', marginBottom: '2.5rem', maxWidth: 460 }}>
        Building something ambitious? Need an IoT system or AI-powered product? Drop a pin.
      </p>

      {/* Mobile: card grid | Desktop: cyber map */}
      {isMobile ? (
        <MobileContactCards />
      ) : (
        <div
          ref={mapContainerRef}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: MAP_W,
            aspectRatio: '16 / 7',
            borderRadius: 8,
            border: '1px solid rgba(6,182,212,0.2)',
            overflow: 'visible',
            boxShadow: '0 0 60px rgba(6,182,212,0.05), 0 0 120px rgba(99,102,241,0.04)',
          }}
        >
          {/* map background */}
          <div style={{ position: 'absolute', inset: 0, borderRadius: 8, overflow: 'hidden' }}>
            <CyberMap width={MAP_W} height={MAP_H} />
          </div>

          {/* Map label */}
          <div style={{
            position: 'absolute', bottom: 8, right: 12,
            fontSize: '0.58rem', fontFamily: 'monospace',
            color: 'rgba(6,182,212,0.25)', letterSpacing: '0.14em', pointerEvents: 'none',
          }}>
            MYSURU · KARNATAKA · INDIA
          </div>

          {/* Pins */}
          {PINS.map(pin => (
            <SinglePin
              key={pin.id}
              pin={pin}
              isOpen={openPin === pin.id}
              onToggle={() => setOpenPin(prev => prev === pin.id ? null : pin.id)}
            />
          ))}
        </div>
      )}

      <p style={{ marginTop: '2.5rem', fontSize: '0.72rem', color: 'rgba(255,255,255,0.18)', letterSpacing: '0.06em' }}>
        Built by Kushal H J · QUIRK TECHNOLOGIES · 2025
      </p>
    </section>
  );
}
