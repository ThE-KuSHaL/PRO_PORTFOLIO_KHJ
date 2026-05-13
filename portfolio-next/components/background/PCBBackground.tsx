'use client';
// components/background/PCBBackground.tsx
// Premium animated PCB background using pre-rendered frame sequence
// from public/inf_loop/ — canvas-based, GPU-efficient, ping-pong oscillation
//
// Playback uses a smoothed linear triangle wave:
//   85% linear pacing (uniform speed in both directions)
//   15% cosine blend (whisper-soft easing at reversal points only)
//   Result: floating, ambient motion with weightless direction changes.

import { useEffect, useRef, useCallback } from 'react';

// ─── Configuration ───────────────────────────────────────────────────────────
const FRAME_DIR =
  '/inf_loop/Create_a_seamless_infinite_loop_202605122232_frames';
const FRAME_PREFIX = 'Create_a_seamless_infinite_loop_202605122232_';
const TOTAL_FRAMES = 150;
const TARGET_FPS = 22;        // Render tick rate (GPU budget — unchanged)
const CYCLE_DURATION = 70;    // Seconds for one full forward+reverse breath (nearly subconscious)
const EASE_BLEND = 0.15;      // Cosine blend factor (0 = pure linear, 1 = full cosine)
const SCALE_FACTOR = 1.08;    // Slight upscale to crop watermark edges

// Derived: angular velocity — one full cycle = 2π radians
const THETA_SPEED = (2 * Math.PI) / CYCLE_DURATION;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build a zero-padded frame path */
function framePath(index: number): string {
  const padded = String(index).padStart(3, '0');
  return `${FRAME_DIR}/${FRAME_PREFIX}${padded}.jpg`;
}

/** Preload all frames into memory */
function preloadFrames(): Promise<HTMLImageElement[]> {
  return new Promise((resolve) => {
    const images: HTMLImageElement[] = new Array(TOTAL_FRAMES);
    let loaded = 0;

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      img.decoding = 'async';
      img.src = framePath(i + 1);

      img.onload = () => {
        images[i] = img;
        loaded++;
        if (loaded === TOTAL_FRAMES) resolve(images);
      };

      img.onerror = () => {
        loaded++;
        if (loaded === TOTAL_FRAMES) resolve(images);
      };
    }

    // Safety timeout
    setTimeout(() => {
      if (loaded < TOTAL_FRAMES) resolve(images);
    }, 30000);
  });
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function PCBBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const thetaRef = useRef(0);
  const animIdRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const readyRef = useRef(false);

  // ── Frame position from theta ──────────────────────────────────────────
  // Blends a linear triangle wave (uniform speed) with a cosine curve
  // (subtle endpoint easing). The blend factor controls how much easing
  // is applied at reversal points — keeping it low (0.15) ensures the
  // motion feels globally uniform with only a whisper of slowdown at turns.
  const getFramePosition = useCallback((theta: number, frameCount: number): number => {
    // Normalize theta into [0, 1) cycle position
    const t = ((theta / (2 * Math.PI)) % 1 + 1) % 1;

    // Linear triangle wave: perfectly uniform speed, 0→1→0
    const linear = t < 0.5 ? t * 2 : (1 - t) * 2;

    // Cosine curve: natural but aggressive endpoint easing, 0→1→0
    const cosine = (1 - Math.cos(theta)) / 2;

    // Blend: mostly linear with just a hint of cosine softness
    const blended = linear * (1 - EASE_BLEND) + cosine * EASE_BLEND;

    return blended * (frameCount - 1);
  }, []);



  // ── Draw blended frame onto canvas ─────────────────────────────────────
  const drawFrame = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      canvas: HTMLCanvasElement,
      img1: HTMLImageElement,
      img2: HTMLImageElement | null,
      blend: number
    ) => {
      if (!img1) return;

      const cw = canvas.width;
      const ch = canvas.height;
      const imgAspect = img1.naturalWidth / img1.naturalHeight;
      const canvasAspect = cw / ch;

      // Cover-fit
      let drawW: number, drawH: number;
      if (canvasAspect > imgAspect) {
        drawW = cw;
        drawH = cw / imgAspect;
      } else {
        drawH = ch;
        drawW = ch * imgAspect;
      }

      // Upscale to crop watermark
      drawW *= SCALE_FACTOR;
      drawH *= SCALE_FACTOR;

      // Shift convergence ~8% left so brightest traces avoid the portrait region
      const dx = (cw - drawW) / 2 - cw * 0.04;
      const dy = (ch - drawH) / 2;

      // Draw primary frame
      ctx.globalAlpha = 1;
      ctx.drawImage(img1, dx, dy, drawW, drawH);

      // Cross-fade neighbor for smooth inter-frame blending
      if (blend > 0.01 && img2) {
        ctx.globalAlpha = blend;
        ctx.drawImage(img2, dx, dy, drawW, drawH);
      }

      ctx.globalAlpha = 1;
    },
    []
  );

  // ── Render current oscillation state ───────────────────────────────────
  // Direction-agnostic: always interpolate between floor and ceil of framePos.
  // Whether framePos is increasing (forward) or decreasing (reverse),
  // the blend between adjacent frames stays smooth and continuous.
  const renderCurrentState = useCallback(
    (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
      const frames = framesRef.current;
      if (!frames.length) return;

      const framePos = getFramePosition(thetaRef.current, frames.length);
      const idxA = Math.floor(framePos);
      const idxB = Math.min(idxA + 1, frames.length - 1);
      const blend = framePos - idxA;

      const imgA = frames[idxA];
      const imgB = frames[idxB];

      if (imgA) drawFrame(ctx, canvas, imgA, imgB, blend);
    },
    [drawFrame, getFramePosition]
  );

  // ── Resize handler ─────────────────────────────────────────────────────
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    if (readyRef.current) {
      const ctx = canvas.getContext('2d');
      if (ctx) renderCurrentState(ctx, canvas);
    }
  }, [renderCurrentState]);

  // ── Main effect ────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });

    const interval = 1000 / TARGET_FPS;
    let cancelled = false;

    function animate(timestamp: number) {
      if (cancelled) return;
      animIdRef.current = requestAnimationFrame(animate);

      const elapsed = timestamp - lastFrameTimeRef.current;
      if (elapsed < interval) return;

      const dt = Math.min(elapsed, 100);
      lastFrameTimeRef.current = timestamp - (elapsed % interval);

      const frames = framesRef.current;
      if (!frames.length) return;

      // Advance the oscillation angle
      thetaRef.current += (dt / 1000) * THETA_SPEED;
      if (thetaRef.current >= 2 * Math.PI) {
        thetaRef.current -= 2 * Math.PI;
      }

      renderCurrentState(ctx!, canvas!);
    }

    // Preload then start
    preloadFrames().then((loadedFrames) => {
      if (cancelled) return;

      const validFrames = loadedFrames.filter(Boolean);
      if (validFrames.length === 0) return;

      framesRef.current = validFrames;
      readyRef.current = true;
      thetaRef.current = 0;
      lastFrameTimeRef.current = performance.now();

      drawFrame(ctx!, canvas!, validFrames[0], null, 0);
      animIdRef.current = requestAnimationFrame(animate);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(animIdRef.current);
      window.removeEventListener('resize', handleResize);
      framesRef.current = [];
      readyRef.current = false;
    };
  }, [drawFrame, handleResize, renderCurrentState]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Animated frame canvas — dimmed and softened */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: 'block',
          filter: 'brightness(0.62) blur(1.2px)',
        }}
      />

      {/* Dark cinematic overlay — unifies composition, improves text readability */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(3, 8, 16, 0.35)',
          pointerEvents: 'none',
        }}
      />

      {/* Radial vignette — cinematic depth falloff */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 70% 60% at 40% 45%, transparent 0%, rgba(3,8,16,0.5) 65%, rgba(3,8,16,0.82) 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
