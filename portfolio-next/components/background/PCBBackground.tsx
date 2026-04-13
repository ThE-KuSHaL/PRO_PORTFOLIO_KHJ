'use client';
// components/background/PCBBackground.tsx
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Segment {
  start: THREE.Vector3;
  end: THREE.Vector3;
  baseOpacity: number;
  curOpacity: number;
  mat: THREE.LineBasicMaterial;
}

interface Pulse {
  segment: Segment;
  progress: number; // 0–1
  speed: number;
  delay: number;    // ms remaining before first activation
  active: boolean;
  core: THREE.Line;
  inner: THREE.Line;
  outer: THREE.Line;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function rnd(a: number, b: number) { return a + Math.random() * (b - a); }
function rndInt(a: number, b: number) { return Math.floor(rnd(a, b + 1)); }

/** Nearest distance from point P to segment AB */
function distPtSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// ─── PCB Layout ──────────────────────────────────────────────────────────────
function buildPCB(W: number, H: number): THREE.Vector3[][] {
  const traces: THREE.Vector3[][] = [];

  // Helper: screen coords → Three.js world coords (negate y since camera top=0, bottom=-H)
  function seg(x1: number, y1: number, x2: number, y2: number) {
    traces.push([new THREE.Vector3(x1, -y1, 0), new THREE.Vector3(x2, -y2, 0)]);
  }

  // Step 1 — Horizontal spines
  const spineCount = rndInt(8, 12);
  const spineYs: number[] = [];
  for (let i = 0; i < spineCount; i++) {
    spineYs.push(rnd(H * 0.04, H * 0.96));
  }
  spineYs.sort((a, b) => a - b);

  // Connectors record
  const connectors: { x: number; y1: number; y2: number }[] = [];

  // Draw spines
  for (const y of spineYs) {
    // Spine may have 1-3 gaps
    let x = 0;
    while (x < W) {
      const len = rnd(120, W * 0.55);
      const end = Math.min(x + len, W);
      seg(x, y, end, y);
      x = end + rnd(10, 40); // gap
    }
  }

  // Step 2 — Vertical connectors between adjacent spines
  for (let si = 0; si < spineYs.length - 1; si++) {
    const y1 = spineYs[si];
    const y2 = spineYs[si + 1];
    const step = rnd(80, 180);
    for (let x = rnd(20, step); x < W - 20; x += rnd(80, 180)) {
      seg(x, y1, x, y2);
      connectors.push({ x, y1, y2 });
    }
  }

  // Step 3 — Branch traces off connectors
  for (const conn of connectors) {
    const midY = (conn.y1 + conn.y2) / 2;
    const numBranches = rndInt(1, 3);
    for (let b = 0; b < numBranches; b++) {
      const branchY = rnd(conn.y1, conn.y2);
      const goRight = Math.random() > 0.5;
      const branchLen = rnd(40, 120);
      const branchX2 = goRight ? conn.x + branchLen : conn.x - branchLen;
      seg(conn.x, branchY, branchX2, branchY);

      // Step 3b — vertical stub off branch end
      if (Math.random() > 0.4) {
        const stubLen = rnd(20, 50);
        const goDown = Math.random() > 0.5;
        const stubY2 = goDown ? branchY + stubLen : branchY - stubLen;
        seg(branchX2, branchY, branchX2, stubY2);
      }
    }

    // Spare horizontal run at midY
    if (Math.random() > 0.5) {
      const runLen = rnd(60, 160);
      const goRight = Math.random() > 0.5;
      seg(conn.x, midY, goRight ? conn.x + runLen : conn.x - runLen, midY);
    }
  }

  // Step 4 — Terminal pads encoded as tiny crosshairs (±2 px square approximation)
  // We'll render these as short perpendicular segments at terminus points
  function pad(x: number, y: number) {
    seg(x - 2, y, x + 2, y);
    seg(x, y - 2, x, y + 2);
  }
  for (const conn of connectors) {
    if (Math.random() > 0.55) pad(conn.x, conn.y1);
    if (Math.random() > 0.55) pad(conn.x, conn.y2);
  }

  return traces;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function PCBBackground() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let W = window.innerWidth;
    let H = window.innerHeight;
    let animId = 0;
    let lastTime = performance.now();

    // ── Three.js setup ────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    // Ortho camera: maps 1 unit = 1 px, y=0 top, y=H bottom
    function makeCamera(w: number, h: number): THREE.OrthographicCamera {
      // left, right, top, bottom, near, far
      // top=h means world y=h is screen top, bottom=0 means world y=0 is screen bottom
      // But our PCB generates y from 0 (top) to H (bottom).
      // Three.js Ortho: top > bottom = larger y appears higher.
      // We want y=0 at SCREEN top, y=H at SCREEN bottom → top=0, bottom=-h (y goes negative downward)
      // But buildPCB generates y as POSITIVE 0..H. So do: top=H, bottom=0 (y=0=bottom of screen → wrong)
      // Simplest: just negate Y in buildPCB — or set camera so y increases downward:
      // Use top=0, bottom=-H: y=0 is viewport top, y=-H is viewport bottom. Then negate all PCB y values.
      // SIMPLER: top=H, bottom=0 makes y=H map to top, y=0 to bottom — PCB y values need to be flipped.
      // EASIEST fix: top=0, bottom=H, i.e., standard screen coords where y increases downward.
      // Three.js: top boundary > bottom boundary required. Use top=H, bottom=0 but flip PCB y: y' = H - y.
      // Actually, just set top=H/2, bottom=-H/2 won't work without offset shift.
      //
      // CORRECT approach: camera left=0, right=W, top=0, bottom=-H, near=-100, far=100
      // Then PCB points at (x, y) for y in [0, H] need to be at (x, -y) in world space.
      // That means we must negate Y in seg() calls. Alternatively, use:
      //   camera: left=0, right=W, top=H, bottom=0 — world y=0 is bottom, y=H is top.
      //   Then in buildPCB, flip y: pass seg(x1, H-y1, x2, H-y2) — messy.
      //
      // SIMPLEST correct fix: keep camera as left=0,right=W,top=0,bottom=-H (y negative downward),
      // and negate ALL y values when creating geometry. 
      // OR just use a canvas2D approach for the background instead.
      //
      // Let's do the clean version: camera with top=0, bottom=-H.
      // buildPCB returns positive y (screen coords). We negate y when creating Vector3.
      const cam = new THREE.OrthographicCamera(0, w, 0, -h, -100, 100);
      return cam;
    }
    let camera = makeCamera(W, H);
    camera.position.set(0, 0, 10);

    // ── PCB geometry ──────────────────────────────────────────────────────
    const segments: Segment[] = [];
    const pulses: Pulse[] = [];
    const disposables: { geometry?: THREE.BufferGeometry; material?: THREE.Material }[] = [];

    function buildScene() {
      // Clear old objects
      while (scene.children.length) scene.remove(scene.children[0]);
      segments.length = 0;
      pulses.length = 0;
      disposables.forEach(d => { d.geometry?.dispose(); d.material?.dispose(); });
      disposables.length = 0;

      const rawTraces = buildPCB(W, H);
      const isMain = (i: number) => i < rawTraces.length * 0.45;
      const isBranch = (i: number) => i < rawTraces.length * 0.75;

      rawTraces.forEach((pts, i) => {
        const main = isMain(i);
        const branch = isBranch(i);
        const baseOpacity = main ? 0.18 : branch ? 0.12 : 0.08;
        const hex = (i % 3 === 0) ? 0x06b6d4 : 0x6366f1;

        const mat = new THREE.LineBasicMaterial({ color: hex, opacity: baseOpacity, transparent: true });
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const line = new THREE.Line(geo, mat);
        line.frustumCulled = false;
        scene.add(line);
        disposables.push({ geometry: geo, material: mat });

        const seg: Segment = { start: pts[0], end: pts[1], baseOpacity, curOpacity: baseOpacity, mat };
        segments.push(seg);

        // Pulse — only main + branch traces
        if ((main || branch) && pulses.length < 60 && Math.random() > 0.35) {
          function makePulseLine(width: number, opacity: number): THREE.Line {
            const pMat = new THREE.LineBasicMaterial({
              color: 0x06b6d4, opacity, transparent: true, linewidth: width,
            });
            const pGeo = new THREE.BufferGeometry().setFromPoints([pts[0].clone(), pts[0].clone()]);
            const pLine = new THREE.Line(pGeo, pMat);
            pLine.frustumCulled = false;
            scene.add(pLine);
            disposables.push({ geometry: pGeo, material: pMat });
            return pLine;
          }

          const pulse: Pulse = {
            segment: seg,
            progress: Math.random(),
            speed: rnd(0.015, 0.04),
            delay: rnd(0, 8000),
            active: false,
            core: makePulseLine(2, 0.85),
            inner: makePulseLine(4, 0.25),
            outer: makePulseLine(8, 0.08),
          };
          pulses.push(pulse);
        }
      });

      // Step 5 — Component outlines (IC chips)
      const chipCount = rndInt(4, 7);
      for (let c = 0; c < chipCount; c++) {
        const cx = rnd(W * 0.05, W * 0.95);
        const cy = rnd(H * 0.1, H * 0.9);
        const cw = rnd(60, 120);
        const ch = rnd(40, 80);
        const corners = [
          new THREE.Vector3(cx - cw / 2, cy - ch / 2, 0),
          new THREE.Vector3(cx + cw / 2, cy - ch / 2, 0),
          new THREE.Vector3(cx + cw / 2, cy + ch / 2, 0),
          new THREE.Vector3(cx - cw / 2, cy + ch / 2, 0),
          new THREE.Vector3(cx - cw / 2, cy - ch / 2, 0),
        ];
        const chipMat = new THREE.LineBasicMaterial({ color: 0x06b6d4, opacity: 0.07, transparent: true });
        const chipGeo = new THREE.BufferGeometry().setFromPoints(corners);
        const chipLine = new THREE.Line(chipGeo, chipMat);
        chipLine.frustumCulled = false;
        scene.add(chipLine);
        disposables.push({ geometry: chipGeo, material: chipMat });
      }
    }

    buildScene();

    // ── Mouse tracking ────────────────────────────────────────────────────
    const mouse = { x: -9999, y: -9999 };
    function onMouse(e: MouseEvent) { mouse.x = e.clientX; mouse.y = e.clientY; }
    window.addEventListener('mousemove', onMouse, { passive: true });

    // ── Pulse position update ─────────────────────────────────────────────
    function updatePulse(pulse: Pulse, tailFraction: number) {
      const { segment, progress } = pulse;
      // Pulse head and tail positions
      const tailProg = Math.max(0, progress - tailFraction);
      const headPos = new THREE.Vector3().lerpVectors(segment.start, segment.end, progress);
      const tailPos = new THREE.Vector3().lerpVectors(segment.start, segment.end, tailProg);

      for (const pLine of [pulse.core, pulse.inner, pulse.outer]) {
        const positions = pLine.geometry.attributes.position as THREE.BufferAttribute;
        positions.setXYZ(0, tailPos.x, tailPos.y, 0);
        positions.setXYZ(1, headPos.x, headPos.y, 0);
        positions.needsUpdate = true;
        pLine.geometry.computeBoundingBox();
      }
    }

    // ── Animation loop ────────────────────────────────────────────────────
    function animate(now: number) {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(now - lastTime, 50); // cap at 50ms
      lastTime = now;

      // ── Cursor reactivity ──────────────────────────────────────────────
      // Mouse in world coords (y flipped: Three.js y=0 is top with our camera)
      const mx = mouse.x, my = mouse.y;

      for (const seg of segments) {
        const distScreen = distPtSeg(mx, my, seg.start.x, -seg.start.y, seg.end.x, -seg.end.y);
        const boost = distScreen < 140 ? (1 - distScreen / 140) * 0.28 : 0;
        const target = Math.min(0.42, seg.baseOpacity + boost);
        seg.curOpacity += (target - seg.curOpacity) * 0.06;
        seg.mat.opacity = seg.curOpacity;
      }

      // ── Pulse advancement ──────────────────────────────────────────────
      for (const pulse of pulses) {
        if (!pulse.active) {
          pulse.delay -= dt;
          if (pulse.delay <= 0) pulse.active = true;
          else continue;
        }

        pulse.progress += pulse.speed * (dt / 16.67);
        if (pulse.progress > 1) {
          pulse.progress = 0;
          pulse.active = false;
          pulse.delay = rnd(2000, 10000);
        }

        const seg = pulse.segment;
        const distScreen = distPtSeg(mx, my, seg.start.x, -seg.start.y, seg.end.x, -seg.end.y);
        const pBoost = distScreen < 140 ? (1 - distScreen / 140) * 0.35 : 0;

        ;(pulse.core.material as THREE.LineBasicMaterial).opacity = Math.min(1, 0.9 + pBoost);
        ;(pulse.inner.material as THREE.LineBasicMaterial).opacity = Math.min(0.65, 0.3 + pBoost * 0.5);
        ;(pulse.outer.material as THREE.LineBasicMaterial).opacity = Math.min(0.35, 0.12 + pBoost * 0.25);

        updatePulse(pulse, 0.12);
      }

      renderer.render(scene, camera);
    }
    animId = requestAnimationFrame(animate);

    // ── Resize ────────────────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      W = window.innerWidth;
      H = window.innerHeight;
      renderer.setSize(W, H);
      camera = makeCamera(W, H);
      camera.position.set(0, 0, 10);
      buildScene();
    });
    ro.observe(document.body);

    // ── Cleanup ───────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onMouse);
      ro.disconnect();
      disposables.forEach(d => { d.geometry?.dispose(); d.material?.dispose(); });
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }}
    />
  );
}
