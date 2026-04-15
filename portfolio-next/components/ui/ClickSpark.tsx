'use client';
// components/ui/ClickSpark.tsx
// Adapted from React Bits — canvas-based click spark effect
import { useEffect, useRef, useCallback } from 'react';

interface Spark {
  x: number;
  y: number;
  angle: number;
  length: number;
  life: number;            // 0 → 1
  decay: number;           // how fast it fades
  speed: number;
  color: string;
}

interface ClickSparkProps {
  sparkColor?: string;
  sparkSize?: number;
  sparkRadius?: number;
  sparkCount?: number;
  duration?: number;
  extraScale?: number;
}

export default function ClickSpark({
  sparkColor = '#06b6d4',
  sparkSize = 12,
  sparkRadius = 15,
  sparkCount = 8,
  duration = 400,
  extraScale = 1,
}: ClickSparkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparksRef = useRef<Spark[]>([]);
  const rafRef    = useRef<number | null>(null);
  const lastTsRef = useRef<number>(0);

  // Colour palette — cyan + indigo burst, matching site theme
  const COLOURS = [sparkColor, '#6366f1', '#4f87ff', '#06b6d4', '#8b5cf6'];

  const draw = useCallback((ts: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dt = Math.min((ts - lastTsRef.current) / 1000, 0.05); // seconds, capped
    lastTsRef.current = ts;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    sparksRef.current = sparksRef.current.filter(s => s.life < 1);

    for (const s of sparksRef.current) {
      s.life = Math.min(s.life + dt / (duration / 1000), 1);

      const progress = s.life;
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic

      const x2 = s.x + Math.cos(s.angle) * eased * s.length * extraScale;
      const y2 = s.y + Math.sin(s.angle) * eased * s.length * extraScale;

      const alpha = 1 - eased;

      ctx.beginPath();
      ctx.moveTo(s.x + Math.cos(s.angle) * sparkRadius, s.y + Math.sin(s.angle) * sparkRadius);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = s.color;
      ctx.lineWidth = sparkSize / 6 * (1 - eased * 0.5);
      ctx.globalAlpha = alpha;
      ctx.shadowBlur = 6;
      ctx.shadowColor = s.color;
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    if (sparksRef.current.length > 0) {
      rafRef.current = requestAnimationFrame(draw);
    } else {
      rafRef.current = null;
    }
  }, [sparkColor, sparkSize, sparkRadius, duration, extraScale]);

  const spawnSparks = useCallback((x: number, y: number) => {
    const newSparks: Spark[] = Array.from({ length: sparkCount }, (_, i) => ({
      x,
      y,
      angle: (i / sparkCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4,
      length: sparkSize * (2.5 + Math.random() * 2),
      life: 0,
      decay: 1,
      speed: 1 + Math.random() * 0.5,
      color: COLOURS[Math.floor(Math.random() * COLOURS.length)],
    }));

    sparksRef.current.push(...newSparks);

    if (!rafRef.current) {
      lastTsRef.current = performance.now();
      rafRef.current = requestAnimationFrame(draw);
    }
  }, [sparkCount, sparkSize, draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Size canvas to full viewport
    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });

    const onClick = (e: MouseEvent) => spawnSparks(e.clientX, e.clientY);
    window.addEventListener('click', onClick);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('click', onClick);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [spawnSparks]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 99998, // just below custom cursor (99999)
      }}
    />
  );
}
