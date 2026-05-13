'use client';
// components/background/PCBBackground.tsx
// Premium animated PCB background using pre-rendered frame sequence
// from public/inf_loop/ — canvas-based, GPU-efficient, seamless loop

import { useEffect, useRef, useCallback } from 'react';

// ─── Configuration ───────────────────────────────────────────────────────────
const FRAME_DIR =
  '/inf_loop/Create_a_seamless_infinite_loop_202605122232_frames';
const FRAME_PREFIX = 'Create_a_seamless_infinite_loop_202605122232_';
const TOTAL_FRAMES = 150;
const TARGET_FPS = 22; // smooth, calm playback (approx 0.75x speed) without burning CPU
const SCALE_FACTOR = 1.08; // slight upscale to crop watermark edges

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build a zero-padded frame path, e.g. .../...001.jpg */
function framePath(index: number): string {
  const padded = String(index).padStart(3, '0');
  return `${FRAME_DIR}/${FRAME_PREFIX}${padded}.jpg`;
}

/** Preload all frames and return them as an array of HTMLImageElement */
function preloadFrames(): Promise<HTMLImageElement[]> {
  return new Promise((resolve, reject) => {
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
        // Silently skip bad frames — use the previous good frame as fallback
        loaded++;
        if (loaded === TOTAL_FRAMES) resolve(images);
      };
    }

    // Safety timeout — resolve with whatever we have after 30s
    setTimeout(() => {
      if (loaded < TOTAL_FRAMES) resolve(images);
    }, 30000);
  });
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function PCBBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const frameIndexRef = useRef(0);
  const animIdRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const readyRef = useRef(false);

  // ── Draw a single frame onto the canvas ────────────────────────────────
  const drawFrame = useCallback(
    (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, img: HTMLImageElement) => {
      if (!img) return;

      const cw = canvas.width;
      const ch = canvas.height;
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const canvasAspect = cw / ch;

      // Cover-fit: fill entire canvas while preserving aspect ratio
      let drawW: number, drawH: number;
      if (canvasAspect > imgAspect) {
        drawW = cw;
        drawH = cw / imgAspect;
      } else {
        drawH = ch;
        drawW = ch * imgAspect;
      }

      // Apply scale factor to crop out watermark edges
      drawW *= SCALE_FACTOR;
      drawH *= SCALE_FACTOR;

      // Center the image (cropping equally from all sides, but the extra
      // scale pushes the bottom-right watermark further out of view)
      const dx = (cw - drawW) / 2;
      const dy = (ch - drawH) / 2;

      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, dx, dy, drawW, drawH);
    },
    []
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

    // Redraw current frame at new size
    if (readyRef.current) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const frame = framesRef.current[frameIndexRef.current];
        if (frame) drawFrame(ctx, canvas, frame);
      }
    }
  }, [drawFrame]);

  // ── Main effect ────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Optimize rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Set initial canvas size
    handleResize();

    // Listen for resize
    window.addEventListener('resize', handleResize, { passive: true });

    const interval = 1000 / TARGET_FPS;
    let cancelled = false;

    // Animation loop using requestAnimationFrame
    function animate(timestamp: number) {
      if (cancelled) return;

      animIdRef.current = requestAnimationFrame(animate);

      // Throttle to TARGET_FPS
      const elapsed = timestamp - lastFrameTimeRef.current;
      if (elapsed < interval) return;

      // Align to frame boundary for smoother cadence
      lastFrameTimeRef.current = timestamp - (elapsed % interval);

      const frames = framesRef.current;
      if (!frames.length) return;

      const idx = frameIndexRef.current;
      const img = frames[idx];
      if (img) {
        drawFrame(ctx!, canvas!, img);
      }

      // Advance frame index, wrapping seamlessly
      frameIndexRef.current = (idx + 1) % frames.length;
    }

    // Preload all frames, then start animation
    preloadFrames().then((loadedFrames) => {
      if (cancelled) return;

      // Filter out any undefined entries from failed loads
      const validFrames = loadedFrames.filter(Boolean);
      if (validFrames.length === 0) return;

      framesRef.current = validFrames;
      readyRef.current = true;
      frameIndexRef.current = 0;
      lastFrameTimeRef.current = performance.now();

      // Draw first frame immediately
      drawFrame(ctx!, canvas!, validFrames[0]);

      // Start the loop
      animIdRef.current = requestAnimationFrame(animate);
    });

    // ── Cleanup ──────────────────────────────────────────────────────────
    return () => {
      cancelled = true;
      cancelAnimationFrame(animIdRef.current);
      window.removeEventListener('resize', handleResize);

      // Release image references for GC
      framesRef.current = [];
      readyRef.current = false;
    };
  }, [drawFrame, handleResize]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
        width: '100vw',
        height: '100vh',
        display: 'block',
      }}
    />
  );
}
