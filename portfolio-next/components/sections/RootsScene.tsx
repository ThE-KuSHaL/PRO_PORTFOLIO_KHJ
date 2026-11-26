'use client';
// components/sections/RootsScene.tsx
// THE ROOTS: a cable-and-circuit megatree over the cyber city.
//
// The world is path-traced offline in Blender (tools/blender/build_roots_scene.py), which is why it
// stays cinematic on a phone. At runtime we draw:
//   • the city layer: a still picture with city light pulses and drifting haze
//   • the tree layer over it: the render + a data map (R = path along the cables, G = story part,
//     B = nearness) + a soft glow map → energy pulses roots → trunk → branch, and each part glowing alone
//   The tree is RIGID: only light moves on it, and it ignores the mouse position. Do not move or bend the
//   picture to fake rotation. A per-pixel depth shift doubled and tore the twigs, and a smooth sideways
//   warp made the tree waver like a flame (both rejected by the owner).
//   • the fruit as live 3D: the Engineer's Brain inside a glassy skin, hanging from the great branch
// The sky is transparent, so the site's PCB animation shows through.
// Interaction works like a game: small markers hint that something is there, a part wakes up as the
// pointer approaches, and the part itself (not just its marker) can be clicked.

import {
  Component, Suspense, useCallback, useEffect, useMemo, useRef, useState,
  type MutableRefObject, type PointerEvent as ReactPointerEvent, type ReactNode,
} from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Pointer } from 'lucide-react';
import * as THREE from 'three';
import type { GpuTier } from '@/lib/device';
import META from '@/lib/roots-meta.json';

// /roots/* and /models/* are served `immutable`: bump after every re-render from Blender.
const ASSET_VERSION = '4';
const asset = (path: string) => `${path}?v=${ASSET_VERSION}`;

export type RootsNodeId = '10th' | 'puc' | 'be';
type Part = 'roots' | 'trunk' | 'branch';

/** In story order: the idle glow travels through these one after another. */
const STORY: { part: Part; id: RootsNodeId; tag: string; chapter: string; spoken: string }[] = [
  { part: 'roots', id: '10th', tag: 'Roots', chapter: 'Schooling', spoken: 'The roots, schooling' },
  { part: 'trunk', id: 'puc', tag: 'Trunk', chapter: 'Pre-university', spoken: 'The trunk, pre-university' },
  { part: 'branch', id: 'be', tag: 'Fruit', chapter: 'Engineering', spoken: "The fruit, my Engineer's Brain" },
];
const PULSE_SECONDS = 6.6;

/** Called only when a part's glow switches on or off. */
export type OnLit = (part: Part, lit: boolean) => void;

/** What the pointer is doing, shared with the render loop without re-rendering React. */
interface Signal { near: [number, number, number]; hot: number }

interface Rect { x: number; y: number; w: number; h: number }

/** Cover-fit the plate. Desktop keeps the tree right-anchored without letting the fruit slide under the headline. */
function fitPlate(cw: number, ch: number, aspect: number, brainX: number, trunkX: number): Rect {
  const w = Math.max(cw, ch * aspect);
  const h = w / aspect;
  let x = cw - w;
  if (x + brainX * w < cw * 0.5) x = Math.min(0, cw * 0.5 - brainX * w);
  // Upright screens only see a slice: centre it between the fruit and the trunk so both stay in view.
  if (cw < ch) x = Math.min(0, Math.max(cw - w, cw * 0.5 - ((brainX + trunkX) / 2) * w));
  return { x, y: (ch - h) * 0.45, w, h };
}

// ── drifting haze ────────────────────────────────────────────────────────────
/**
 * A small seamless cloud texture, generated once in the browser (no download). Sampling it twice is far
 * cheaper than computing fractal noise per pixel, which matters on the phones this has to run on.
 */
function makeCloudTexture(size = 128) {
  let seed = 23;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const sum = new Float32Array(size * size);
  let total = 0;
  for (const [cells, weight] of [[4, 0.55], [8, 0.3], [16, 0.15]]) {
    const lattice = Array.from({ length: cells * cells }, random);
    const at = (x: number, y: number) => lattice[(y % cells) * cells + (x % cells)]; // wraps → tiles
    total += weight;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * cells, fy = (y / size) * cells;
        const ix = Math.floor(fx), iy = Math.floor(fy);
        const sx = (fx - ix) ** 2 * (3 - 2 * (fx - ix));
        const sy = (fy - iy) ** 2 * (3 - 2 * (fy - iy));
        const top = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * sx;
        const bottom = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * sx;
        sum[y * size + x] += (top + (bottom - top) * sy) * weight;
      }
    }
  }
  const pixels = new Uint8Array(size * size * 4);
  sum.forEach((v, i) => pixels.fill(Math.round((v / total) * 255), i * 4, i * 4 + 4));
  const texture = new THREE.DataTexture(pixels, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** `?haze=0` turns it off and `?haze=1.5` thickens it, for side-by-side tuning. */
function hazeAmount() {
  const raw = new URLSearchParams(window.location.search).get('haze');
  const value = raw === null ? 1 : Number(raw);
  return Number.isFinite(value) ? Math.min(Math.max(value, 0), 2) : 1;
}

// ── fruit geometry (same profile and calyx numbers the Blender poster uses) ───
function podRadius(h: number) {
  const p = META.wide.pod;
  for (let i = 0; i < p.length - 1; i++) {
    const [h0, r0] = p[i], [h1, r1] = p[i + 1];
    if (h >= h0 && h <= h1) return r0 + ((r1 - r0) * (h - h0)) / (h1 - h0);
  }
  return p[p.length - 1][1];
}

function makePodGeometry() {
  const curve = new THREE.SplineCurve(META.wide.pod.map(([h, r]) => new THREE.Vector2(r, h)));
  const geometry = new THREE.LatheGeometry(curve.getPoints(40), 56);
  geometry.scale(1, 1, 0.86);
  geometry.computeVertexNormals();
  return geometry;
}

/** All sepals in one mesh. uv.x runs neck → tip, uv.y runs -1 → 1 across the blade. */
function makeCalyxGeometry() {
  const position: number[] = [], uv: number[] = [], index: number[] = [];
  const top = META.wide.pod[META.wide.pod.length - 1][0];
  const N = 14;
  META.wide.sepals.forEach(([degrees, length]) => {
    const base = position.length / 3;
    const phi = THREE.MathUtils.degToRad(degrees);
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const h = top + 0.04 - u * length;
      const r = podRadius(Math.min(h, top)) + 0.055 + 0.3 * u ** 3;
      const half = 0.34 * Math.min(1, 0.35 + u * 3.2) * (1 - u) ** 0.75 + 0.004;
      for (const side of [-1, 0, 1]) {
        const a = phi + (side * half) / Math.max(r, 0.2);
        const bulge = side === 0 ? 0.045 : 0;
        position.push(Math.sin(a) * (r + bulge), h, Math.cos(a) * (r + bulge) * 0.86);
        uv.push(u, side);
      }
    }
    for (let i = 0; i < N; i++) {
      for (let k = 0; k < 2; k++) {
        const o = base + i * 3 + k;
        index.push(o, o + 1, o + 4, o, o + 4, o + 3);
      }
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(index);
  return geometry;
}

// ── shaders ──────────────────────────────────────────────────────────────────
const PLATE_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

/** Energy packet position along the story path (0 = city/schooling, 1 = brain). */
const PACKET = /* glsl */ `
  float packet(float flow, float t) {
    float sum = 0.0;
    for (int i = 0; i < 2; i++) {
      float head = fract(t * 0.095 + float(i) * 0.5) * 1.3 - 0.12;
      float d = flow - head;
      sum += exp(-d * d * (d > 0.0 ? 2600.0 : 240.0));   // sharp front, long tail
    }
    return sum;
  }
`;

/** Light only ever travels along the cables, outward from the city and the roots. */
const TRAVEL = /* glsl */ `
  vec3 travel(vec3 col, float flow, float t, float lit, float lum) {
    float p = packet(flow, t);
    col += vec3(0.22, 0.66, 1.0) * p * (lit * 1.15 + lum * 0.45);
    float traffic = smoothstep(0.9, 1.0, fract(flow * 34.0 - t * 0.85));
    return col + vec3(0.16, 0.5, 0.95) * traffic * lit * 0.45;
  }
`;

// Both layers are uploaded premultiplied, so filtering never mixes see-through black into an edge.
const BACK_FRAG = /* glsl */ `
  uniform sampler2D uBack;
  uniform sampler2D uBackData;
  uniform sampler2D uCloud;
  uniform float uTime;
  uniform float uHaze;
  uniform float uAspect;
  varying vec2 vUv;
  ${PACKET}
  ${TRAVEL}
  void main() {
    vec4 c = texture2D(uBack, vUv);
    vec4 d = texture2D(uBackData, vUv);
    vec3 col = c.rgb / max(c.a, 0.004);
    col = travel(col, d.r, uTime, smoothstep(0.24, 0.78, col.b), dot(col, vec3(0.2126, 0.7152, 0.0722)));

    // Haze: two cloud layers drifting against each other, thickest on distant things near the horizon.
    // It lies behind the tree, which stays crisp and gains depth against it.
    vec2 hp = vec2(vUv.x * uAspect, vUv.y);
    float cloud = texture2D(uCloud, hp * vec2(0.62, 1.25) + vec2(uTime * 0.0085, 0.0)).r * 0.62
                + texture2D(uCloud, hp * vec2(1.4, 2.3) + vec2(-uTime * 0.0145, uTime * 0.0025)).r * 0.38;
    cloud = smoothstep(0.3, 0.72, cloud);
    float far = 1.0 - smoothstep(0.17, 0.46, d.b);   // d.b = nearness: sky 0, skyline ~.15
    float low = (vUv.y - 0.34) / 0.25;               // uv.y of the horizon is about 0.31
    float haze = uHaze * far * (exp(-low * low) + 0.1) * (0.3 + 0.7 * cloud);
    haze *= mix(0.4, 0.62, smoothstep(0.0, 0.5, c.a)); // thinner over open sky: the PCB animation stays visible
    haze = clamp(haze, 0.0, 0.8);
    vec3 hazeColor = mix(vec3(0.035, 0.085, 0.155), vec3(0.075, 0.165, 0.27), cloud);

    // premultiplied "haze over plate": the sky stays see-through
    gl_FragColor = vec4(min(col, 1.0) * c.a * (1.0 - haze) + hazeColor * haze, c.a * (1.0 - haze) + haze);
  }
`;

const PLATE_FRAG = /* glsl */ `
  uniform sampler2D uPlate;
  uniform sampler2D uData;
  uniform sampler2D uAura;
  uniform float uTime;
  uniform vec3 uGlow;     // how awake each part is: roots, trunk, branch
  uniform float uFocus;   // 1 while one part has the player's attention
  uniform vec3 uSel;      // which one
  varying vec2 vUv;
  ${PACKET}
  ${TRAVEL}
  float isPart(float v, float id) { return 1.0 - smoothstep(0.04, 0.1, abs(v - id)); }
  void main() {
    vec4 d = texture2D(uData, vUv);
    vec4 c = texture2D(uPlate, vUv);
    vec3 col = c.rgb / max(c.a, 0.004);

    float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
    float lit = smoothstep(0.24, 0.78, col.b);       // the glowing fibres
    col = travel(col, d.r, uTime, lit, lum);

    // each story part glows on its own, in its own hue
    vec3 roots = vec3(0.05, 0.86, 0.70), trunk = vec3(0.10, 0.58, 1.0), branch = vec3(0.46, 0.46, 1.0);
    vec3 mask = vec3(isPart(d.g, 0.25), isPart(d.g, 0.5), isPart(d.g, 0.75));
    float chosen = dot(mask, uSel);
    col *= 1.0 - 0.34 * uFocus * (1.0 - min(chosen, 1.0));
    vec3 body = mask * uGlow;
    col += (roots * body.x + trunk * body.y + branch * body.z) * (lit * 0.62 + lum * 0.55 + 0.012);
    vec3 spill = texture2D(uAura, vUv).rgb * uGlow;
    vec3 aura = (roots * spill.x + trunk * spill.y + branch * spill.z) * 0.27;

    gl_FragColor = vec4(min(col, 1.0) * c.a + aura, min(1.0, c.a + max(aura.r, max(aura.g, aura.b)) * 0.7));
  }
`;

const BRAIN_VERT = /* glsl */ `
  varying vec3 vP;
  varying vec3 vN;
  void main() {
    vP = position;
    vN = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const brainFrag = (rich: boolean) => /* glsl */ `
  uniform float uTime;
  uniform float uHot;
  varying vec3 vP;
  varying vec3 vN;
  ${PACKET}
  vec3 hash3(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
    return fract(sin(p) * 43758.5453);
  }
  // distance to the nearest cell border: the circuit net wrapped over the cortex
  float cells(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    float a = 8.0, b = 8.0;
    ${rich
      ? 'for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {'
      : 'vec3 s = step(0.5, f) - 1.0; for (int x = 0; x <= 1; x++) for (int y = 0; y <= 1; y++) for (int z = 0; z <= 1; z++) {'}
      vec3 g = vec3(float(x), float(y), float(z))${rich ? '' : ' + s'};
      vec3 r = g + hash3(i + g) - f;
      float d = dot(r, r);
      if (d < a) { b = a; a = d; } else if (d < b) { b = d; }
    }
    return sqrt(b) - sqrt(a);
  }
  void main() {
    float facing = 1.0 - abs(normalize(vN).z);
    float rim = pow(facing, 2.1);
    float line = 1.0 - smoothstep(0.018, 0.07, cells(vP * 7.6));
    float arrive = packet(1.0 - vP.y * 0.05, uTime);     // lights up when the energy reaches it
    // barely there: a ghost of the folds inside the glass, found only by looking for it
    float e = rim * 0.8 + line * 0.16 + 0.05 + arrive * 0.12;
    vec3 linearCol = vec3(0.006, 0.03, 0.075) + vec3(0.05, 0.36, 0.95) * e;
    vec3 col = pow(clamp(linearCol, 0.0, 1.0), vec3(1.0 / 2.2));
    float alpha = clamp(0.085 + rim * 0.1 + uHot * 0.02, 0.0, 1.0);
    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

/** Glassy fruit skin: clear in the middle, bright at the rim, six segment seams and a soft gloss. */
const POD_VERT = /* glsl */ `
  varying vec3 vP;
  varying vec3 vN;
  void main() {
    vP = position;
    vN = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const POD_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uHot;
  varying vec3 vP;
  varying vec3 vN;
  ${PACKET}
  void main() {
    vec3 n = normalize(vN);
    float rim = pow(1.0 - clamp(abs(n.z), 0.0, 1.0), 2.4);
    float around = atan(vP.x, vP.z / 0.86);
    float seam = (1.0 - smoothstep(0.0, 0.075, abs(cos(3.0 * around)))) * smoothstep(-1.19, -1.0, vP.y);
    float gloss = pow(max(dot(n, normalize(vec3(-0.5, 0.55, 0.67))), 0.0), 34.0);
    float ripe = packet(1.0, uTime) * 0.5 + uHot * 0.6;
    float belly = smoothstep(1.2, -0.9, vP.y);            // colour deepens toward the bottom
    vec3 skin = mix(vec3(0.10, 0.30, 0.85), vec3(0.30, 0.36, 1.0), belly);
    vec3 col = skin * (0.07 + rim * (0.85 + ripe) + seam * (0.2 + ripe * 0.3))
             + vec3(0.75, 0.9, 1.0) * gloss * 0.5;
    float alpha = clamp(0.1 + rim * 0.55 + seam * 0.14 + gloss * 0.35, 0.0, 0.9);
    gl_FragColor = vec4(col, alpha);                      // premultiplied: colour adds light over the brain
  }
`;

const CALYX_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uHot;
  varying vec2 vUv;
  ${PACKET}
  void main() {
    float across = abs(vUv.y);
    float midrib = 1.0 - smoothstep(0.06, 0.16, across);
    float edge = smoothstep(0.74, 0.96, across);
    float veins = (1.0 - smoothstep(0.0, 0.1, abs(fract(vUv.x * 4.0 - across * 0.8) - 0.5))) * (1.0 - edge) * 0.4;
    float ripe = packet(0.97, uTime) * 0.6 + uHot * 0.5;
    // petal-like caps: a lighter blade than the bark behind it, so the fruit's shape reads at a glance
    vec3 blade = mix(vec3(0.07, 0.19, 0.36), vec3(0.03, 0.08, 0.18), smoothstep(0.0, 1.0, across));
    vec3 col = blade * (1.15 - vUv.x * 0.35)
             + vec3(0.24, 0.72, 1.0) * (midrib + veins) * (0.9 + ripe)
             + vec3(0.46, 0.74, 1.0) * edge * (0.85 + ripe * 0.4);
    gl_FragColor = vec4(min(col, 1.0), 1.0);
  }
`;

const HALO_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uHot;
  varying vec2 vUv;
  ${PACKET}
  void main() {
    float r = length(vUv - 0.5) * 2.0;
    float g = pow(max(0.0, 1.0 - r), 2.4) * (0.2 + uHot * 0.34 + packet(1.0, uTime) * 0.16);
    gl_FragColor = vec4(vec3(0.18, 0.44, 1.0) * g, g * 0.55);
  }
`;

const premultiplied = {
  transparent: true,
  depthWrite: false,
  blending: THREE.CustomBlending,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneMinusSrcAlphaFactor,
} as const;

// ── scene ────────────────────────────────────────────────────────────────────
interface SceneProps {
  tier: GpuTier;
  rect: Rect;
  layout: 'wide' | 'tall';
  plateUrl: string;
  signal: MutableRefObject<Signal>;
  markers: MutableRefObject<(HTMLButtonElement | null)[]>;
  onReady: () => void;
  onLit?: OnLit;
}

function Scene({ tier, rect, layout, plateUrl, signal, markers, onReady, onLit }: SceneProps) {
  const size = useThree((s) => s.size);
  const [plate, data, aura, back, backData] = useLoader(THREE.TextureLoader, [
    plateUrl, asset(`/roots/data_${layout}.webp`), asset(`/roots/aura_${layout}.webp`),
    asset(`/roots/back_${layout}.avif`), asset(`/roots/backdata_${layout}.webp`),
  ]);
  const model = tier === 'low' ? 'brain_fruit_low' : 'brain_fruit';
  const gltf = useGLTF(asset(`/models/${model}.glb`), '/draco/');

  const brainGeo = useMemo(() => {
    let geo: THREE.BufferGeometry | null = null;
    gltf.scene.traverse((o) => { if (!geo && (o as THREE.Mesh).isMesh) geo = (o as THREE.Mesh).geometry; });
    return geo as THREE.BufferGeometry | null;
  }, [gltf]);
  const podGeo = useMemo(makePodGeometry, []);
  const calyxGeo = useMemo(makeCalyxGeometry, []);
  useEffect(() => () => { podGeo.dispose(); calyxGeo.dispose(); }, [podGeo, calyxGeo]);

  const mats = useMemo(() => {
    // Raw texel values in and out: the grade is already baked into the render.
    for (const t of [plate, data, aura, back, backData]) {
      t.colorSpace = THREE.NoColorSpace;
      t.generateMipmaps = false;
      t.minFilter = THREE.LinearFilter;
      t.premultiplyAlpha = t === plate || t === back;
      t.needsUpdate = true;
    }
    const time = { value: 0 };
    const fruitHot = { value: 0 };
    const cloud = makeCloudTexture();
    const fruit = { uTime: time, uHot: fruitHot };
    return {
      time,
      fruitHot,
      cloud,
      back: new THREE.ShaderMaterial({
        uniforms: {
          uBack: { value: back }, uBackData: { value: backData }, uTime: time,
          uCloud: { value: cloud }, uHaze: { value: hazeAmount() }, uAspect: { value: META[layout].aspect },
        },
        vertexShader: PLATE_VERT, fragmentShader: BACK_FRAG,
        depthTest: false, depthWrite: false, blending: THREE.NoBlending,
      }),
      plate: new THREE.ShaderMaterial({
        uniforms: {
          uPlate: { value: plate }, uData: { value: data }, uAura: { value: aura }, uTime: time,
          uGlow: { value: new THREE.Vector3() },
          uSel: { value: new THREE.Vector3() }, uFocus: { value: 0 },
        },
        vertexShader: PLATE_VERT, fragmentShader: PLATE_FRAG, ...premultiplied, depthTest: false,
      }),
      // same vertex shader as the colour pass, so both produce identical depth values
      depth: new THREE.ShaderMaterial({
        vertexShader: BRAIN_VERT, fragmentShader: 'void main() { gl_FragColor = vec4(0.0); }',
        colorWrite: false, transparent: true,
      }),
      brain: new THREE.ShaderMaterial({
        uniforms: fruit, vertexShader: BRAIN_VERT, fragmentShader: brainFrag(tier !== 'low'), ...premultiplied,
      }),
      pod: new THREE.ShaderMaterial({ uniforms: fruit, vertexShader: POD_VERT, fragmentShader: POD_FRAG, ...premultiplied }),
      calyx: new THREE.ShaderMaterial({
        uniforms: fruit, vertexShader: PLATE_VERT, fragmentShader: CALYX_FRAG, side: THREE.DoubleSide, ...premultiplied,
      }),
      halo: new THREE.ShaderMaterial({
        uniforms: fruit, vertexShader: PLATE_VERT, fragmentShader: HALO_FRAG, ...premultiplied, depthTest: false,
      }),
    };
  }, [plate, data, aura, back, backData, tier, layout]);

  useEffect(() => () => {
    for (const m of [mats.cloud, mats.back, mats.plate, mats.depth, mats.brain, mats.pod, mats.calyx, mats.halo]) m.dispose();
  }, [mats]);
  // Prepare the shader programs in the background while the section approaches, then reveal. Left to the
  // first drawn frame, the driver builds them while the page waits.
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let alive = true;
    const reveal = () => { if (alive) { onReady(); invalidate(); } };
    const timer = window.setTimeout(() => { gl.compileAsync(scene, camera).then(reveal, reveal); }, 0);
    return () => { alive = false; window.clearTimeout(timer); };
  }, [mats, gl, scene, camera, invalidate, onReady]);

  const m = META[layout];
  const bx = rect.x + m.brain.c[0] * rect.w - size.width / 2;
  const by = size.height / 2 - (rect.y + m.brain.c[1] * rect.h);
  const br = m.brain.r * rect.w;                       // brain radius: the fruit's unit of size
  const neck = META.wide.pod[META.wide.pod.length - 1][0];
  const fruitRef = useRef<THREE.Group>(null);
  const brainRef = useRef<THREE.Group>(null);
  const level = useRef([0, 0, 0]);

  useFrame((_, dt) => {
    const step = Math.min(dt, 0.1);
    const t = (mats.time.value += step);
    const k = 1 - Math.exp(-step * 3.2);

    // The story beat: roots, then trunk, then fruit take turns to glow. Attention overrides it.
    const { near, hot } = signal.current;
    const beat = (t / PULSE_SECONDS) % 1;
    for (let i = 0; i < 3; i++) {
      let from = beat - i / 3 - 0.1;
      from -= Math.round(from);
      const idle = hot >= 0 ? 0.08 : 0.12 + 0.62 * Math.exp(-((from * 7.5) ** 2));
      const target = hot === i ? 1.2 : Math.max(idle, near[i] * 0.85);
      level.current[i] += (target - level.current[i]) * Math.min(1, k * 2.2);
      // Touch the DOM only when a part switches on or off: writing styles every frame repaints the marker
      // text each time, which cost weak CPUs their frame rate. CSS transitions do the in-between.
      const marker = markers.current[i];
      const lit = level.current[i] > 0.4 ? 'true' : 'false';
      if (marker && marker.dataset.lit !== lit) {
        marker.dataset.lit = lit;
        onLit?.(STORY[i].part, lit === 'true');
      }
    }
    (mats.plate.uniforms.uGlow.value as THREE.Vector3).fromArray(level.current);
    const sel = mats.plate.uniforms.uSel.value as THREE.Vector3;
    if (hot >= 0) sel.set(+(hot === 0), +(hot === 1), +(hot === 2));
    mats.plate.uniforms.uFocus.value += ((hot >= 0 ? 1 : 0) - mats.plate.uniforms.uFocus.value) * k * 2;
    mats.fruitHot.value = level.current[2] * 0.75;

    const g = fruitRef.current;
    if (g) {
      g.position.set(bx, by + neck * br, 200);           // pivot at the stem
      g.rotation.z = Math.sin(t * 0.8) * 0.018;          // the fruit alone sways a little where it hangs
      g.scale.setScalar(br * (1 + Math.max(0, level.current[2] - 0.7) * 0.1));
    }
    brainRef.current?.rotation.set(-0.17, Math.sin(t * 0.32) * 0.3, 0);
  });

  return (
    <>
      <mesh
        position={[rect.x + rect.w / 2 - size.width / 2, size.height / 2 - (rect.y + rect.h / 2), 0]}
        scale={[rect.w, rect.h, 1]}
        material={mats.back}
        renderOrder={0}
      >
        <planeGeometry args={[1, 1]} />
      </mesh>
      <mesh
        position={[rect.x + rect.w / 2 - size.width / 2, size.height / 2 - (rect.y + rect.h / 2), 10]}
        scale={[rect.w, rect.h, 1]}
        material={mats.plate}
        renderOrder={0.5}
      >
        <planeGeometry args={[1, 1]} />
      </mesh>
      <mesh position={[bx, by, 20]} scale={[br * 5, br * 5, 1]} material={mats.halo} renderOrder={1}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      <group ref={fruitRef}>
        <group position={[0, -neck, 0]}>
          <group ref={brainRef} position={[0, -0.1, 0]} scale={0.9}>
            {/* depth first, so only the front surface of the cortex is shaded (no inner geometry streaks) */}
            {brainGeo && <mesh geometry={brainGeo} material={mats.depth} renderOrder={2} />}
            {brainGeo && <mesh geometry={brainGeo} material={mats.brain} renderOrder={3} />}
          </group>
          <mesh geometry={podGeo} material={mats.pod} renderOrder={4} />
          <mesh geometry={calyxGeo} material={mats.calyx} renderOrder={5} />
        </group>
      </group>
    </>
  );
}

/** 30 fps on weak GPUs: demand frameloop, invalidated on a timer. */
function Pacer({ active }: { active: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => invalidate(), 1000 / 30);
    return () => window.clearInterval(id);
  }, [active, invalidate]);
  return null;
}

class WebGLGuard extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFail(); }
  render() { return this.state.failed ? null : this.props.children; }
}

/** The story-part ids from the data map, readable on the CPU so the tree itself can be pointed at. */
function usePartMap(layout: 'wide' | 'tall', enabled: boolean) {
  const map = useRef<ImageData | null>(null);
  useEffect(() => {
    map.current = null;
    if (!enabled) return;
    let stale = false;
    const img = new Image();
    img.onload = () => {
      if (stale) return;
      const canvas = document.createElement('canvas');
      canvas.width = 480;
      canvas.height = Math.round((480 * img.height) / img.width);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      map.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    };
    img.src = asset(`/roots/data_${layout}.webp`);
    return () => { stale = true; };
  }, [layout, enabled]);
  return map;
}

// ── component ────────────────────────────────────────────────────────────────
export interface RootsSceneProps {
  tier: GpuTier;
  mobile: boolean;
  nodes: { id: RootsNodeId; year: string; label: string }[];
  onSelect: (id: RootsNodeId) => void;
  onLit?: OnLit;
}

export default function RootsScene({ tier, mobile, nodes, onSelect, onLit }: RootsSceneProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hot, setHot] = useState<Part | null>(null);
  const [plateWidth, setPlateWidth] = useState<number | null>(null);
  const layout = mobile ? 'tall' : 'wide';
  const m = META[layout];
  const still = tier === 'none' || failed;
  const signal = useRef<Signal>({ near: [0, 0, 0], hot: -1 });
  const markers = useRef<(HTMLButtonElement | null)[]>([null, null, null]);
  const partMap = usePartMap(layout, !still && visible);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    // render only while really on screen (the scene is already loaded and compiled before it gets here)
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '-2px 0px' });
    io.observe(el);
    return () => { ro.disconnect(); io.disconnect(); };
  }, []);

  const rect: Rect = mobile ? { x: 0, y: 0, w: size.w, h: size.h } : fitPlate(size.w, size.h, m.aspect, m.brain.c[0], m.anchors.trunk[0]);

  // Pick the render resolution once per layout, so resizing never re-downloads.
  useEffect(() => { setPlateWidth(null); setReady(false); }, [layout]);
  useEffect(() => {
    if (plateWidth || !size.w) return;
    const px = rect.w * Math.min(window.devicePixelRatio || 1, 2);
    setPlateWidth(mobile ? (px > 800 && tier !== 'low' ? 1100 : 760) : tier === 'high' && px > 1750 ? 2560 : 1600);
  }, [plateWidth, size.w, rect.w, mobile, tier]);

  const onReady = useCallback(() => setReady(true), []);
  const at = (f: number[]) => ({ left: rect.x + f[0] * rect.w, top: rect.y + f[1] * rect.h });

  const focus = (part: Part | null) => {
    setHot(part);
    signal.current.hot = STORY.findIndex((s) => s.part === part);
  };

  /** Which story part is under this point of the view: the fruit by shape, the tree by its data map. */
  const partAt = (x: number, y: number): Part | null => {
    const fruit = at(m.brain.c);
    const br = m.brain.r * rect.w;
    if (((x - fruit.left) / (br * 1.3)) ** 2 + ((y - fruit.top + br * 0.1) / (br * 1.55)) ** 2 < 1) return 'branch';
    const map = partMap.current;
    if (!map) return null;
    const ix = Math.round(((x - rect.x) / rect.w) * map.width);
    const iy = Math.round(((y - rect.y) / rect.h) * map.height);
    const votes = [0, 0, 0];
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const px = ix + dx, py = iy + dy;
        if (px < 0 || py < 0 || px >= map.width || py >= map.height) continue;
        const id = map.data[(py * map.width + px) * 4 + 1];
        [64, 128, 191].forEach((want, i) => { if (Math.abs(id - want) < 9) votes[i]++; });
      }
    }
    const best = votes.indexOf(Math.max(...votes));
    return votes[best] >= 5 ? STORY[best].part : null;
  };

  const local = (e: { clientX: number; clientY: number }) => {
    const box = wrap.current!.getBoundingClientRect();
    return { x: e.clientX - box.left, y: e.clientY - box.top };
  };

  const onMove = (e: ReactPointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const { x, y } = local(e);
    let closest: Part | null = null;
    let best = 60;
    STORY.forEach(({ part }, i) => {
      const spot = at(m.anchors[part]);
      const d = Math.hypot(x - spot.left, y - spot.top);
      const near = Math.min(1, Math.max(0, (190 - d) / 130));
      signal.current.near[i] = near;
      if (d < best) { best = d; closest = part; }
    });
    const next = closest ?? partAt(x, y);
    // one name at a time: the part being pointed at wins over anything merely nearby
    STORY.forEach(({ part }, i) => {
      const marker = markers.current[i];
      if (marker) marker.dataset.near = String(signal.current.near[i] > 0.55 && (next === null || next === part));
    });
    if (wrap.current) wrap.current.dataset.over = String(!!next);
    if (next !== hot) focus(next);
  };

  const onLeave = () => {
    signal.current.near = [0, 0, 0];
    markers.current.forEach((marker) => { if (marker) marker.dataset.near = 'false'; });
    focus(null);
  };

  const fade = mobile
    ? 'linear-gradient(180deg, transparent 0%, #000 9%, #000 90%, transparent 100%)'
    : 'linear-gradient(180deg, transparent 0%, #000 7%, #000 92%, transparent 100%)';

  return (
    <div className="roots-scene">
      <div
        ref={wrap}
        className="roots-view"
        style={mobile ? { aspectRatio: String(m.aspect) } : undefined}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
      >
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', maskImage: fade, WebkitMaskImage: fade }}>
          {still && size.w > 0 && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={asset(`/roots/poster_${layout}.avif`)}
              alt="A giant circuit tree over a cyber city, with a glowing brain inside a glass fruit on its largest branch"
              style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.w, height: rect.h, maxWidth: 'none' }}
            />
          )}
          {!still && plateWidth && size.w > 0 && (
            <WebGLGuard onFail={() => setFailed(true)}>
              <Canvas
                orthographic
                camera={{ position: [0, 0, 1000], near: 1, far: 2000 }}
                dpr={tier === 'high' ? [1, 2] : tier === 'mid' ? [1, 1.5] : [1, 1.75]}
                gl={{ alpha: true, antialias: tier !== 'low', powerPreference: 'high-performance', stencil: false }}
                frameloop={!visible ? 'never' : tier === 'low' ? 'demand' : 'always'}
                style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: ready ? 1 : 0, transition: 'opacity 0.9s ease' }}
                aria-hidden="true"
              >
                {tier === 'low' && <Pacer active={visible} />}
                <Suspense fallback={null}>
                  <Scene
                    tier={tier}
                    rect={rect}
                    layout={layout}
                    plateUrl={asset(`/roots/plate_${layout}_${plateWidth}.avif`)}
                    signal={signal}
                    markers={markers}
                    onReady={onReady}
                    onLit={onLit}
                  />
                </Suspense>
              </Canvas>
            </WebGLGuard>
          )}
        </div>

        {/* the tree and fruit themselves are the click targets; the markers are the keyboard targets */}
        <div
          className="roots-hit"
          aria-hidden="true"
          onClick={(e) => {
            const { x, y } = local(e);
            const part = partAt(x, y);
            const story = STORY.find((s) => s.part === part);
            if (story) onSelect(story.id);
          }}
        />

        {size.w > 0 && STORY.map(({ part, id, tag, chapter, spoken }, i) => {
          const node = nodes.find((n) => n.id === id);
          if (!node) return null;
          const spot = at(m.anchors[part]);
          const side = part === 'branch' ? 'below' : spot.left > size.w * (mobile ? 0.56 : 0.8) ? 'left' : 'right';
          return (
            <button
              key={part}
              ref={(el) => { markers.current[i] = el; }}
              type="button"
              className="beacon"
              data-part={part}
              data-side={side}
              data-active={hot === part}
              data-still={still}
              style={spot}
              aria-label={`${spoken}: ${node.label}, ${node.year}. Open details`}
              onFocus={() => focus(part)}
              onBlur={() => focus(null)}
              onClick={() => onSelect(id)}
            >
              <span className="beacon-ping" aria-hidden="true" />
              <span className="beacon-ping" aria-hidden="true" />
              <span className="beacon-mark" aria-hidden="true" />
              <span className="beacon-tag" aria-hidden="true">
                <Pointer size="0.8em" strokeWidth={2.4} />
                {tag}
              </span>
              <span className="beacon-label" aria-hidden="true">
                <strong>{node.label}</strong>
                <small>{chapter}, {node.year.toLowerCase()}</small>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
