'use client';
// components/background/PCBBackground.tsx
// Ambient PCB background.
//  • Lite devices (phones, low RAM, data-saver): one static dimmed poster — no canvas, no JS loop.
//  • Full devices: a 75-frame 960×540 WebP ping-pong loop (≈2.8 MB, ≈155 MB decoded) drawn on a
//    reduced-resolution canvas, started only after the page is idle, paused while the tab is
//    hidden, and auto-disabled if the device can't draw it cheaply.

import { useEffect, useRef } from 'react';
import { useLite } from '@/lib/device';

const TOTAL_FRAMES = 75;
const TARGET_FPS = 22;
const CYCLE_DURATION = 70;   // seconds for one forward+reverse breath
const EASE_BLEND = 0.15;     // 0 = linear triangle wave, 1 = full cosine
const SCALE_FACTOR = 1.08;   // crop watermark edges
const SHIFT_X = 0.04;        // keep brightest traces off the portrait
const MAX_CANVAS_W = 960;    // canvas internal width cap (CSS stretches it)
const BAIL_MS_PER_DRAW = 8;  // average draw cost above this → stop animating

const THETA_SPEED = (2 * Math.PI) / CYCLE_DURATION;
const frameSrc = (i: number) => `/bg/f${String(i).padStart(3, '0')}.webp`;

function framePosition(theta: number, count: number): number {
  const t = ((theta / (2 * Math.PI)) % 1 + 1) % 1;
  const linear = t < 0.5 ? t * 2 : (1 - t) * 2;
  const cosine = (1 - Math.cos(theta)) / 2;
  return (linear * (1 - EASE_BLEND) + cosine * EASE_BLEND) * (count - 1);
}

export default function PCBBackground() {
  const lite = useLite();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (lite !== false) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { alpha: false });
    if (!canvas || !ctx) return;

    let frames: HTMLImageElement[] = [];
    let cancelled = false;
    let stopped = false;
    let raf = 0;
    let theta = 0;
    let last = 0;
    let drawn = 0;
    let cost = 0;
    const interval = 1000 / TARGET_FPS;

    const draw = () => {
      if (!frames.length) return;
      const pos = framePosition(theta, frames.length);
      const a = Math.floor(pos);
      const b = Math.min(a + 1, frames.length - 1);
      const blend = pos - a;
      const img = frames[a];
      if (!img) return;

      const cw = canvas.width, ch = canvas.height;
      const aspect = img.naturalWidth / img.naturalHeight;
      let w = cw, h = cw / aspect;
      if (cw / ch < aspect) { h = ch; w = ch * aspect; }
      w *= SCALE_FACTOR; h *= SCALE_FACTOR;
      const dx = (cw - w) / 2 - cw * SHIFT_X;
      const dy = (ch - h) / 2;

      ctx.globalAlpha = 1;
      ctx.drawImage(img, dx, dy, w, h);
      if (blend > 0.01 && frames[b]) {
        ctx.globalAlpha = blend;
        ctx.drawImage(frames[b], dx, dy, w, h);
        ctx.globalAlpha = 1;
      }
    };

    const resize = () => {
      const w = window.innerWidth, h = window.innerHeight;
      const s = Math.min(1, MAX_CANVAS_W / w);
      canvas.width = Math.round(w * s);
      canvas.height = Math.round(h * s);
      draw();
    };

    const tick = (ts: number) => {
      raf = requestAnimationFrame(tick);
      const elapsed = ts - last;
      if (elapsed < interval) return;
      last = ts - (elapsed % interval);
      theta = (theta + (Math.min(elapsed, 100) / 1000) * THETA_SPEED) % (2 * Math.PI);

      const t0 = performance.now();
      draw();
      cost += performance.now() - t0;
      if (++drawn === 40 && cost / drawn > BAIL_MS_PER_DRAW) {
        stopped = true;                 // too slow: freeze on the current frame
        cancelAnimationFrame(raf);
      }
    };

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && frames.length && !stopped && !cancelled) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };

    const load = () => {
      if (cancelled) return;
      const imgs: (HTMLImageElement | undefined)[] = new Array(TOTAL_FRAMES);
      let done = 0;
      const finish = () => {
        if (cancelled) return;
        frames = imgs.filter((i): i is HTMLImageElement => !!i);
        if (frames.length < 2) return;
        resize();
        canvas.style.opacity = '1';
        last = performance.now();
        if (!document.hidden) raf = requestAnimationFrame(tick);
      };
      for (let i = 0; i < TOTAL_FRAMES; i++) {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => { imgs[i] = img; if (++done === TOTAL_FRAMES) finish(); };
        img.onerror = () => { if (++done === TOTAL_FRAMES) finish(); };
        img.src = frameSrc(i);
      }
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });
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
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('load', kick);
      document.removeEventListener('visibilitychange', onVisibility);
      frames = [];
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
          objectFit: 'cover', transform: `translateX(-${SHIFT_X * 100}%) scale(${SCALE_FACTOR})`,
        }}
      />

      {lite === false && (
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            display: 'block', opacity: 0, transition: 'opacity 0.8s ease',
          }}
        />
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
