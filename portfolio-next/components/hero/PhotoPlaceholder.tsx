'use client';
// components/hero/PhotoPlaceholder.tsx
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useState } from 'react';
import dynamic from 'next/dynamic';

// LightRays is canvas-based — load client-side only
const LightRays = dynamic(() => import('@/components/ui/LightRays'), { ssr: false });

export default function PhotoPlaceholder() {
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
        <Image
          src="/till knee_PORT.png"
          alt="Kushal H J"
          fill
          style={{
            objectFit: 'cover',
            objectPosition: 'left bottom',
            transform: 'scaleX(-1) translateX(-8%)',
            filter: 'brightness(1.15) contrast(1.05) drop-shadow(0 0 40px rgba(6,182,212,0.2))'
          }}
          onError={() => setImgError(true)}
          priority
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

      {/* LightRays — prominent volumetric beams, fades as user scrolls away */}
      <LightRays
        rayCount={12}
        color="rgba(6,182,212,"
        colorAlt="rgba(99,102,241,"
        maxOpacity={0.45}
        speed={0.8}
        blur={24}
        fadeOnScroll={true}
        style={{ zIndex: 2 }}
      />

      {/* Left margin fade — blends into left column */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, zIndex: 3,
          background: 'linear-gradient(to right, rgba(3,8,16,1) 0%, rgba(3,8,16,0) 28%)',
          pointerEvents: 'none',
        }}
      />

      {/* Bottom vignette — so photo doesn't feel cut-off */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%', zIndex: 3,
          background: 'linear-gradient(to top, rgba(3,8,16,0.6) 0%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />
    </motion.div>
  );
}
