'use client';
// components/ui/LightRays.tsx
// Inspired by React Bits LightRays — animated volumetric light beams
// rendered on a canvas overlay, perfectly tuned for the portfolio's cyan/indigo palette
import { useEffect, useRef } from 'react';

interface LightRaysProps {
  /** Number of rays to emit */
  rayCount?: number;
  /** Base color of the rays — defaults to portfolio cyan */
  color?: string;
  /** Second color for alternating rays */
  colorAlt?: string;
  /** Max opacity of each ray */
  maxOpacity?: number;
  /** Speed multiplier (1 = normal) */
  speed?: number;
  /** Blur amount (px) on the glow filter */
  blur?: number;
  className?: string;
  style?: React.CSSProperties;
}

interface Ray {
  angle: number;      // radians — direction the ray fans outward
  width: number;      // angular width of the beam (radians)
  opacity: number;    // current opacity
  targetOpacity: number;
  speed: number;      // opacity transition speed
  phase: number;      // phase offset for drift animation
  color: string;
  length: number;     // 0–1 relative to canvas diagonal
}

export default function LightRays({
  rayCount = 8,
  color = 'rgba(6,182,212,',          // will have opacity appended
  colorAlt = 'rgba(99,102,241,',
  maxOpacity = 0.18,
  speed = 1,
  blur = 40,
  className,
  style,
}: LightRaysProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const raysRef = useRef<Ray[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize rays
    raysRef.current = Array.from({ length: rayCount }, (_, i) => {
      const baseAngle = (i / rayCount) * Math.PI * 2 - Math.PI * 0.5; // spread 360°
      const isAlt = i % 2 === 1;
      return {
        angle: baseAngle + (Math.random() - 0.5) * 0.4,
        width: 0.04 + Math.random() * 0.08,
        opacity: 0,
        targetOpacity: Math.random() * maxOpacity,
        speed: (0.001 + Math.random() * 0.002) * speed,
        phase: Math.random() * Math.PI * 2,
        color: isAlt ? colorAlt : color,
        length: 0.7 + Math.random() * 0.4,
      };
    });

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width  = parent.offsetWidth;
      canvas.height = parent.offsetHeight;
    };
    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas.parentElement!);

    function draw(ts: number) {
      if (!ctx || !canvas) return;
      const dt = Math.min((ts - lastTsRef.current), 50); // ms, capped at 50ms
      lastTsRef.current = ts;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width  * 0.5;   // emit from center-bottom of the photo
      const cy = canvas.height * 1.1;
      const diagonal = Math.sqrt(canvas.width ** 2 + canvas.height ** 2);

      for (const ray of raysRef.current) {
        // Drift the target opacity slowly
        const drift = Math.sin(ts * 0.0006 * speed + ray.phase) * 0.5 + 0.5;
        ray.targetOpacity = drift * maxOpacity;

        // Smooth transition
        const diff = ray.targetOpacity - ray.opacity;
        ray.opacity += diff * ray.speed * dt;

        if (ray.opacity < 0.003) continue;

        // Draw the fan beam
        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, diagonal * ray.length);
        gradient.addColorStop(0,   `${ray.color}${ray.opacity.toFixed(3)})`);
        gradient.addColorStop(0.5, `${ray.color}${(ray.opacity * 0.4).toFixed(3)})`);
        gradient.addColorStop(1,   `${ray.color}0)`);

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(
          cx, cy,
          diagonal * ray.length,
          ray.angle - ray.width / 2,
          ray.angle + ray.width / 2
        );
        ctx.closePath();

        ctx.fillStyle = gradient;
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
      resizeObserver.disconnect();
    };
  }, [rayCount, color, colorAlt, maxOpacity, speed, blur]);

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
