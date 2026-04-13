'use client';
// components/hero/PhotoPlaceholder.tsx
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useState } from 'react';

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
            // Flips X, then translates negatively on the flipped axis (moves it visually RIGHT)
            transform: 'scaleX(-1) translateX(-8%)',
            // Brighten up the photo and add a subtle cyan drop-shadow to separate from the PCB background
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

      {/* Subtle left margin fade so it blends into the left column softly, without darkening the human */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to right, rgba(3,8,16,1) 0%, rgba(3,8,16,0) 25%)',
          pointerEvents: 'none',
        }}
      />
    </motion.div>
  );
}
