'use client';
// components/background/PCBBackground.tsx
// Ambient PCB background.
//  • Lite devices (phones, low RAM, data-saver): one static dimmed poster.
//  • Full devices: a 70 s forward-and-back video of the circuit board (AV1 about 470 KB, H.264 about 1 MB),
//    decoded by the video hardware, fetched only after the page is idle. It replaced 75 stills (2.7 MB,
//    about 155 MB decoded) that JavaScript redrew on a canvas. Made by tools/background/make_pcb_video.py.

import { useEffect, useRef } from 'react';
import { useLite } from '@/lib/device';

const SCALE_FACTOR = 1.08;   // crop the frame edges
const SHIFT_X = 0.04;        // keep brightest traces off the portrait
const FRAMING = `translateX(-${SHIFT_X * 100}%) scale(${SCALE_FACTOR})`;

export default function PCBBackground() {
  const lite = useLite();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (lite !== false) return;
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;

    const show = () => { video.style.opacity = '1'; };
    // A hidden tab pauses; play() is refused in some power-saving modes, and then the poster simply stays.
    const play = () => { if (!cancelled && !document.hidden) video.play().catch(() => {}); };
    const onVisibility = () => { if (document.hidden) video.pause(); else play(); };
    const load = () => {
      if (cancelled) return;
      video.muted = true;
      video.preload = 'auto';
      video.load();
      play();
    };
    video.addEventListener('playing', show);
    document.addEventListener('visibilitychange', onVisibility);

    // Start only once the page is idle so the hero paints first.
    const kick = () => {
      const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
      if (ric) ric(load, { timeout: 2500 }); else setTimeout(load, 800);
    };
    if (document.readyState === 'complete') kick();
    else window.addEventListener('load', kick, { once: true });

    return () => {
      cancelled = true;
      video.pause();
      video.removeEventListener('playing', show);
      window.removeEventListener('load', kick);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [lite]);

  return (
    <div
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none', overflow: 'hidden', background: '#030810' }}
    >
      {/* Static poster — the whole background on lite devices, the loading state otherwise */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/bg/poster.webp"
        alt=""
        decoding="async"
        fetchPriority="low"
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', transform: FRAMING,
        }}
      />

      {lite === false && (
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          preload="none"
          disablePictureInPicture
          tabIndex={-1}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
            transform: FRAMING, opacity: 0, transition: 'opacity 0.8s ease',
          }}
        >
          <source src="/bg/pcb-v1.webm" type='video/webm; codecs="av01.0.04M.08"' />
          <source src="/bg/pcb-v1.mp4" type="video/mp4" />
        </video>
      )}

      {/* Dim (replaces CSS brightness/blur filter, which is costly on a full-screen layer) */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(2,5,10,0.6)' }} />
      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 70% 60% at 40% 45%, transparent 0%, rgba(3,8,16,0.5) 65%, rgba(3,8,16,0.82) 100%)',
        }}
      />
    </div>
  );
}
