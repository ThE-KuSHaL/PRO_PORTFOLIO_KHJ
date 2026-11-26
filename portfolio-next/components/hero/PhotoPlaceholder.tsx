'use client';
// components/hero/PhotoPlaceholder.tsx
import { motion } from 'framer-motion';
import { useLite } from '@/lib/device';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import HERO_PORTRAIT from '@/lib/portrait-meta.json';

// LightRays is canvas-based — load client-side only
const LightRays = dynamic(() => import('@/components/ui/LightRays'), { ssr: false });

export default function PhotoPlaceholder() {
  const lite = useLite();
  const [imgError, setImgError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.9, delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
    >
      {!imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={HERO_PORTRAIT.src}
          srcSet={HERO_PORTRAIT.srcSet}
          sizes="(max-width: 767px) 70vw, 45vw"
          alt="Kushal H J"
          fetchPriority="high"
          decoding="async"
          width={HERO_PORTRAIT.width}
          height={HERO_PORTRAIT.height}
          onError={() => setImgError(true)}
          className="hero-portrait"
          style={{ filter: lite ? 'none' : 'drop-shadow(0 4px 20px rgba(0,0,0,0.4))' }}
        />
      ) : (
        <div style={{
          width: '100%', height: '100%', minHeight: 420,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(6,182,212,0.4)', fontSize: '0.75rem', fontFamily: 'monospace',
        }}>
          [ photo not found ]
        </div>
      )}

      {/* LightRays — restrained ambient atmospheric lighting */}
      {lite === false && <LightRays
        rayCount={8}
        color="rgba(6,182,212,"
        colorAlt="rgba(99,102,241,"
        maxOpacity={0.25}
        speed={0.5}
        blur={32}
        fadeOnScroll={true}
        style={{ zIndex: 2 }}
      />}

      {/* ── Edge dissolve — minimal feathering, background stays visible ── */}

      {/* Left edge — light blend into content column */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, zIndex: 3,
          background: 'linear-gradient(to right, rgba(3,8,16,0.3) 0%, rgba(3,8,16,0.08) 12%, transparent 25%)',
          pointerEvents: 'none',
        }}
      />

      {/* Right edge — barely-there feather */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, zIndex: 3,
          background: 'linear-gradient(to left, rgba(3,8,16,0.15) 0%, transparent 10%)',
          pointerEvents: 'none',
        }}
      />

      {/* Top edge — whisper feather */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '18%', zIndex: 3,
          background: 'linear-gradient(to bottom, rgba(3,8,16,0.2) 0%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Bottom edge — light ground blend */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '20%', zIndex: 3,
          background: 'linear-gradient(to top, rgba(3,8,16,0.25) 0%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />
    </motion.div>
  );
}
