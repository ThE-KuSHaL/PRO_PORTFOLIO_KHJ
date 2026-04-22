'use client';
// components/hero/PrinterArm.tsx
import { useEffect, useRef } from 'react';

interface PrinterArmProps {
  onComplete: () => void;
  emblemRef: React.RefObject<HTMLDivElement | null>;
}

const NS = 'http://www.w3.org/2000/svg';

function el<T extends SVGElement>(tag: string, attrs: Record<string, string>): T {
  const e = document.createElementNS(NS, tag) as T;
  Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
  return e;
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function ease(t: number) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }

export default function PrinterArm({ onComplete, emblemRef }: PrinterArmProps) {
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    // ISSUE 1 FIX: double rAF guarantees the browser has painted before we read geometry
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const container = emblemRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        // Guard: if element still has no size, bail out gracefully
        if (!rect || rect.width === 0) {
          onComplete();
          return;
        }

        const W = window.innerWidth;
        const H = window.innerHeight;
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const RO = 88;
        const RI = 68;
        const sx = W * 0.82;
        const sy = 38;

        // ── SVG overlay ──
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('width', String(W));
        svg.setAttribute('height', String(H));
        svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
        Object.assign(svg.style, {
          position: 'fixed', inset: '0', zIndex: '50',
          pointerEvents: 'none', overflow: 'visible',
        });

        // filter
        const defs = document.createElementNS(NS, 'defs');
        defs.innerHTML = `
          <filter id="arm-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>`;
        svg.appendChild(defs);

        // Printed circles (permanent layer)
        const cLen1 = 2 * Math.PI * RO;
        const cLen2 = 2 * Math.PI * RI;

        const pc1 = el<SVGCircleElement>('circle', {
          cx: String(cx), cy: String(cy), r: String(RO),
          fill: 'none', stroke: 'rgba(6,182,212,0.5)', 'stroke-width': '1.8',
          'stroke-dasharray': String(cLen1), 'stroke-dashoffset': String(cLen1),
          transform: `rotate(-90 ${cx} ${cy})`, filter: 'url(#arm-glow)',
        });
        const pc2 = el<SVGCircleElement>('circle', {
          cx: String(cx), cy: String(cy), r: String(RI),
          fill: 'none', stroke: '#06b6d4', 'stroke-width': '2',
          'stroke-dasharray': String(cLen2), 'stroke-dashoffset': String(cLen2),
          transform: `rotate(-90 ${cx} ${cy})`, filter: 'url(#arm-glow)',
        });

        svg.appendChild(pc1);
        svg.appendChild(pc2);

        // Arm group
        const armG = document.createElementNS(NS, 'g');

        const railH = el<SVGLineElement>('line', {
          x1: String(sx), y1: String(sy), x2: String(sx), y2: String(sy),
          stroke: 'rgba(6,182,212,0.55)', 'stroke-width': '1.8', filter: 'url(#arm-glow)',
        });
        const railV = el<SVGLineElement>('line', {
          x1: String(cx), y1: String(sy), x2: String(cx), y2: String(sy),
          stroke: 'rgba(6,182,212,0.55)', 'stroke-width': '1.8', filter: 'url(#arm-glow)',
        });
        const extBody = el<SVGRectElement>('rect', {
          width: '14', height: '18', rx: '3', fill: '#06b6d4', filter: 'url(#arm-glow)',
        });
        const nozzleDot = el<SVGCircleElement>('circle', {
          r: '3', fill: '#ffffff', opacity: '0.9',
        });

        armG.append(railH, railV, extBody, nozzleDot);
        svg.appendChild(armG);
        document.body.appendChild(svg);

        function posExt(x: number, y: number) {
          extBody.setAttribute('x', String(x - 7));
          extBody.setAttribute('y', String(y - 9));
          nozzleDot.setAttribute('cx', String(x));
          nozzleDot.setAttribute('cy', String(y + 12));
        }
        posExt(sx, sy);

        // Phase runner
        function phase(dur: number, tick: (t: number) => void): Promise<void> {
          return new Promise(resolve => {
            const t0 = performance.now();
            (function step(now: number) {
              const raw = (now - t0) / dur;
              const t = Math.min(1, raw);
              tick(ease(t));
              if (t < 1) requestAnimationFrame(step);
              else resolve();
            })(t0);
          });
        }

        (async () => {
          // P1: H-rail grows left
          await phase(420, t => {
            const nx = lerp(sx, cx, t);
            railH.setAttribute('x1', String(nx));
            posExt(nx, sy);
          });

          // P2: V-rail grows down, extruder descends
          await phase(400, t => {
            const ny = lerp(sy, cy, t);
            railV.setAttribute('y2', String(ny));
            posExt(cx, ny);
          });

          // P3: Outer circle
          await phase(1100, t => {
            pc1.setAttribute('stroke-dashoffset', String(cLen1 * (1 - t)));
            const ang = -Math.PI / 2 + 2 * Math.PI * t;
            posExt(cx + Math.cos(ang) * RO, cy + Math.sin(ang) * RO);
          });

          // P4: Inner circle
          await phase(760, t => {
            pc2.setAttribute('stroke-dashoffset', String(cLen2 * (1 - t)));
            const ang = -Math.PI / 2 + 2 * Math.PI * t;
            posExt(cx + Math.cos(ang) * RI, cy + Math.sin(ang) * RI);
          });

          // P5: Retract
          await phase(520, t => {
            const nx = lerp(cx, sx, t);
            const ny = lerp(cy, sy, t);
            railH.setAttribute('x1', String(lerp(cx, sx, t)));
            railV.setAttribute('y2', String(ny));
            posExt(nx, ny);
            armG.setAttribute('opacity', String(1 - t));
          });

          // P6: Arm gone, circles stay — fade in emblem
          armG.style.display = 'none';
          onComplete();

          // Cross-fade printed circles out as emblem fades in
          await phase(420, t => {
            pc1.setAttribute('opacity', String(1 - t));
            pc2.setAttribute('opacity', String(1 - t));
          });

          if (svg.parentNode) svg.parentNode.removeChild(svg);
        })();

        // Return cleanup for the inner rAF
        return () => {
          if (svg.parentNode) svg.parentNode.removeChild(svg);
        };
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
