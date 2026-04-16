'use client';
// components/ui/LightRays.tsx
import React, { useEffect, useRef } from 'react';

interface LightRaysProps {
  rayCount?: number;
  color?: string;
  colorAlt?: string;
  maxOpacity?: number;
  speed?: number;
  blur?: number;
  /** If true, watch scroll and fade opacity out as page scrolls past parent */
  fadeOnScroll?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

interface Ray {
  angle: number;
  width: number;
  opacity: number;
  targetOpacity: number;
  speed: number;
  phase: number;
  color: string;
  length: number;
}

export default function LightRays({
  rayCount = 12,
  color    = 'rgba(6,182,212,',
  colorAlt = 'rgba(99,102,241,',
  maxOpacity  = 0.45,
  speed       = 0.8,
  blur        = 28,
  fadeOnScroll = true,
  className,
  style,
}: LightRaysProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const raysRef      = useRef<Ray[]>([]);
  const rafRef       = useRef<number | null>(null);
  const lastTsRef    = useRef<number>(0);
  const scrollOpRef  = useRef<number>(1);   // multiplier from scroll position

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // ── Spread rays in an upward cone ──────────────────────────────────────
    // Only emit in the upper hemisphere (-π..0) to look like rays rising up
    raysRef.current = Array.from({ length: rayCount }, (_, i) => {
      const spread = Math.PI * 1.6;                        // 288° cone
      const base   = -Math.PI / 2 - spread / 2;           // start angle
      const angle  = base + (i / (rayCount - 1)) * spread + (Math.random() - 0.5) * 0.3;
      const isAlt  = i % 3 === 1;
      return {
        angle,
        width:         0.06 + Math.random() * 0.1,
        opacity:       0,
        targetOpacity: Math.random() * maxOpacity,
        speed:         (0.0008 + Math.random() * 0.0016) * speed,
        phase:         Math.random() * Math.PI * 2,
        color:         isAlt ? colorAlt : color,
        length:        0.9 + Math.random() * 0.5,
      };
    });

    // ── Size canvas to parent ──────────────────────────────────────────────
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width  = p.offsetWidth;
      canvas.height = p.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);

    // ── Scroll fade ────────────────────────────────────────────────────────
    let cleanupScroll: (() => void) | null = null;
    if (fadeOnScroll) {
      const hero = canvas.closest('section') ?? canvas.parentElement?.parentElement;
      const onScroll = () => {
        if (!hero) return;
        const { top, height } = hero.getBoundingClientRect();
        // Fade starts when top < 0, fully gone at -height*0.5
        const progress = Math.min(Math.max(-top / (height * 0.5), 0), 1);
        scrollOpRef.current = 1 - progress;
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      cleanupScroll = () => window.removeEventListener('scroll', onScroll);
    }

    // ── Draw loop ──────────────────────────────────────────────────────────
    function draw(ts: number) {
      if (!ctx || !canvas) return;
      const dt = Math.min(ts - lastTsRef.current, 50);
      lastTsRef.current = ts;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const scrollMul = scrollOpRef.current;
      if (scrollMul < 0.005) {
        // Skip drawing entirely when fully scrolled past
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      // Emit from bottom center so rays shoot upward like a stage light
      const cx = canvas.width  * 0.5;
      const cy = canvas.height * 1.05;
      const diag = Math.sqrt(canvas.width ** 2 + canvas.height ** 2);

      for (const ray of raysRef.current) {
        // Slowly breathe the target opacity
        const drift = Math.sin(ts * 0.0005 * speed + ray.phase) * 0.5 + 0.5;
        ray.targetOpacity = drift * maxOpacity * scrollMul;
        ray.opacity += (ray.targetOpacity - ray.opacity) * ray.speed * dt;

        if (ray.opacity < 0.004) continue;

        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, diag * ray.length);
        grad.addColorStop(0,    `${ray.color}${Math.min(ray.opacity * 1.8, 1).toFixed(3)})`);
        grad.addColorStop(0.35, `${ray.color}${(ray.opacity * 0.9).toFixed(3)})`);
        grad.addColorStop(0.7,  `${ray.color}${(ray.opacity * 0.3).toFixed(3)})`);
        grad.addColorStop(1,    `${ray.color}0)`);

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, diag * ray.length, ray.angle - ray.width / 2, ray.angle + ray.width / 2);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.filter = `blur(${blur}px)`;
        ctx.fill();
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    lastTsRef.current = performance.now();
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      cleanupScroll?.();
    };
  }, [rayCount, color, colorAlt, maxOpacity, speed, blur, fadeOnScroll]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        mixBlendMode: 'screen',
        zIndex: 1,
        ...style,
      }}
    />
  );
}
