'use client';
// The Roots — Blender-sculpted tree (public/models/tree_{low,mid,high}.glb) with custom shaders.
//  • Bark shader: stretched value-noise albedo + height AO (cheaper on `low`).
//  • Energy shader: emissive veins with pulses travelling from roots (low Y) to branch tips.
//  • Fruits: fresnel glass + glowing core, brighter on hover/active; each is a click target.
// Mesh size, DPR, antialiasing and frame rate are chosen by the device tier (see lib/device.ts).

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { GpuTier } from '@/lib/device';

type NodeId = '10th' | 'puc' | 'be';
type Tier = Exclude<GpuTier, 'none'>;

interface EducationTree3DProps {
  activeNode: NodeId | null;
  hoveredNode: NodeId | null;
  onNodeClick: (id: NodeId) => void;
  onNodeHover: (id: NodeId | null) => void;
  nodesData: { id: NodeId; year: string; label: string; isBE: boolean }[];
  tier: Tier;
  mobile: boolean;
}

const FRUIT_RADIUS: Record<NodeId, number> = { '10th': 0.34, puc: 0.38, be: 0.5 }; // matches build_tree.py
const COLORS: Record<NodeId, string> = { '10th': '#818cf8', puc: '#818cf8', be: '#22d3ee' };
const FOV = 38;
/** Bump whenever tools/blender/build_tree.py re-exports the GLBs — /models/* is cached as immutable. */
const MODEL_VERSION = '6';

// ── GLSL ────────────────────────────────────────────────────────────────────
const NOISE = /* glsl */ `
float hash31(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash31(i), hash31(i + vec3(1,0,0)), f.x), mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x), mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y), f.z);
}`;

interface SharedUniforms {
  uTime: { value: number };
  uGain: { value: number };
  uEnergy: { value: THREE.Color };
}

function makeBark(tier: Tier, u: SharedUniforms) {
  const rich = tier !== 'low';
  const m = new THREE.MeshStandardMaterial({ color: new THREE.Color('#7a5a45'), roughness: 0.95, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = u.uTime;
    sh.uniforms.uGain = u.uGain;
    sh.uniforms.uEnergy = u.uEnergy;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvP = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vP;\nuniform float uTime; uniform float uGain; uniform vec3 uEnergy;\n${NOISE}`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float yy = clamp((vP.y + 2.4) / 7.8, 0.0, 1.0);
        ${rich ? 'diffuseColor.rgb *= mix(0.55, 1.2, vnoise(vP * vec3(7.0, 1.6, 7.0)));' : ''}
        diffuseColor.rgb *= mix(0.5, 1.0, smoothstep(0.0, 0.3, yy));`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float vein = ${
          rich
            ? 'smoothstep(0.93, 0.992, 1.0 - abs(vnoise(vP * 5.2) * 2.0 - 1.0))'
            : 'pow(abs(sin(vP.x * 6.0 + vP.z * 5.0 + vP.y * 2.6)), 60.0)'
        };
        float ph = fract(yy * 1.15 - uTime * 0.11);
        float pulse = smoothstep(0.0, 0.06, ph) * (1.0 - smoothstep(0.06, 0.38, ph));
        totalEmissiveRadiance += uEnergy * vein * (0.22 + 2.4 * pulse) * uGain;`,
      );
  };
  m.customProgramCacheKey = () => `bark-${tier}`;
  return m;
}

function makeFruit(color: string, r: number) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uLit: { value: 0 }, uR: { value: r }, uTime: { value: 0 } },
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV; varying vec3 vL;
      void main(){
        vL = position;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uLit; uniform float uR; uniform float uTime;
      varying vec3 vN; varying vec3 vV; varying vec3 vL;
      void main(){
        float stem = step(-0.95 * uR, vL.y);                 // stem, cap and neck
        float f = pow(1.0 - clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0), 2.4);
        float d = length((vL - vec3(0.0, -1.25 * uR, 0.0)) / vec3(uR, 1.18 * uR, uR));
        float core = exp(-d * d * 2.2);
        float flick = 0.94 + 0.06 * sin(uTime * 2.0 + vL.x * 9.0);
        vec3 glow = uColor * (core * (1.7 + 2.0 * uLit) * flick + f * (1.1 + 1.3 * uLit));
        float alpha = clamp(0.28 + f * 0.55 + core * 0.5 + uLit * 0.2, 0.0, 1.0);
        vec3 metal = vec3(0.03, 0.04, 0.06) + vec3(0.12, 0.14, 0.18) * f;
        gl_FragColor = vec4(mix(glow, metal, stem), mix(alpha, 1.0, stem));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

let haloTex: THREE.CanvasTexture | null = null;
function getHaloTexture() {
  if (haloTex) return haloTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  haloTex = new THREE.CanvasTexture(c);
  haloTex.colorSpace = THREE.SRGBColorSpace;
  return haloTex;
}

/** Camera distance + horizontal offset so the model's real bounds fit any aspect; desktop shifts it right of the copy. */
function layoutFor(width: number, height: number, mobile: boolean, bh: number, bw: number) {
  const aspect = width / Math.max(height, 1);
  const half = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  // phones: let the outermost twigs crop so the trunk and fruit stay large enough to read
  const z = Math.max(bh / (2 * half), (bw * (mobile ? 0.74 : 1)) / (2 * half * aspect)) * 1.12;
  const worldW = 2 * z * half * aspect;
  return { z, offsetX: mobile ? 0 : worldW * 0.17 };
}

// ── Scene pieces ────────────────────────────────────────────────────────────
interface FruitProps {
  id: NodeId;
  mesh: THREE.Mesh;
  meta: EducationTree3DProps['nodesData'][number];
  mobile: boolean;
  active: boolean;
  hovered: boolean;
  onClick: () => void;
  onHover: (h: boolean) => void;
}

function Fruit({ id, mesh, meta, mobile, active, hovered, onClick, onHover }: FruitProps) {
  const r = FRUIT_RADIUS[id];
  const mat = useMemo(() => makeFruit(COLORS[id], r), [id, r]);
  const group = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Sprite>(null);
  const haloMat = useMemo(
    () => new THREE.SpriteMaterial({ map: getHaloTexture(), color: COLORS[id], blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }),
    [id],
  );
  useEffect(() => () => { mat.dispose(); haloMat.dispose(); }, [mat, haloMat]);

  useFrame(({ clock }) => {
    const target = active ? 1 : hovered ? 0.65 : 0;
    const u = mat.uniforms;
    u.uLit.value += (target - u.uLit.value) * 0.12;
    u.uTime.value = clock.elapsedTime;
    haloMat.opacity = 0.22 + u.uLit.value * 0.5;
    if (halo.current) halo.current.scale.setScalar(r * (5 + u.uLit.value * 2.5));
    if (group.current) {
      const s = 1 + u.uLit.value * 0.1;
      group.current.scale.lerp(new THREE.Vector3(s, s, s), 0.15);
      group.current.rotation.z = Math.sin(clock.elapsedTime * 0.6 + mesh.position.x) * 0.03; // gentle sway from the hang point
    }
  });

  const lit = active || hovered;
  return (
    <group ref={group} position={mesh.position}>
      <mesh geometry={mesh.geometry} material={mat} />
      <sprite ref={halo} material={haloMat} position={[0, -1.25 * r, 0]} />
      {/* generous invisible hit target — much larger than the bulb, bigger again on touch */}
      <mesh
        position={[0, -1.25 * r, 0]}
        onPointerOver={(e) => { e.stopPropagation(); onHover(true); }}
        onPointerOut={() => onHover(false)}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
      >
        <sphereGeometry args={[r * (mobile ? 3.4 : 2.5), 8, 8]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      <Html position={[0, -3.0 * r, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'auto' }}>
        <button
          onClick={onClick}
          onMouseEnter={() => onHover(true)}
          onMouseLeave={() => onHover(false)}
          aria-label={`${meta.label}, ${meta.year}`}
          style={{
            background: 'rgba(3,8,20,0.72)', border: `1px solid ${COLORS[id]}55`, borderRadius: 8, cursor: 'pointer', textAlign: 'center', padding: mobile ? '3px 7px' : '5px 10px',
            transform: mobile && id === 'puc' ? 'translateX(-30%)' : undefined,
            color: lit ? '#ffffff' : 'rgba(255,255,255,0.78)', transition: 'color .3s, opacity .3s',
            opacity: lit ? 1 : 0.85, textShadow: '0 2px 6px rgba(0,0,0,0.9)', whiteSpace: 'nowrap',
          }}
        >
          <div style={{ fontSize: mobile ? '0.7rem' : meta.isBE ? '0.95rem' : '0.85rem', fontWeight: 600 }}>{meta.label}</div>
          <div style={{ fontSize: mobile ? '0.62rem' : '0.7rem', fontWeight: 600, color: COLORS[id], marginTop: 2 }}>{meta.year}</div>
        </button>
      </Html>
    </group>
  );
}

function Scene(props: EducationTree3DProps) {
  const { tier, mobile, activeNode, hoveredNode, onNodeClick, onNodeHover, nodesData } = props;
  const { nodes } = useGLTF(`/models/tree_${tier}.glb?v=${MODEL_VERSION}`, '/draco/') as unknown as { nodes: Record<string, THREE.Mesh> };
  const size = useThree((s) => s.size);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const pointer = useThree((s) => s.pointer);
  const root = useRef<THREE.Group>(null);

  const uniforms = useMemo<SharedUniforms>(
    () => ({ uTime: { value: 0 }, uGain: { value: 1 }, uEnergy: { value: new THREE.Color('#22d3ee') } }),
    [],
  );
  const bark = useMemo(() => makeBark(tier, uniforms), [tier, uniforms]);
  useEffect(() => () => bark.dispose(), [bark]);

  const bounds = useMemo(() => {
    const g = nodes.tree?.geometry;
    if (!g) return { cy: 1.6, h: 8.4, w: 8 };
    g.computeBoundingBox();
    const b = g.boundingBox!;
    return { cy: (b.min.y + b.max.y) / 2, h: b.max.y - b.min.y + 1.4, w: Math.max(b.max.x - b.min.x, b.max.z - b.min.z) };
  }, [nodes]);
  const { z, offsetX } = layoutFor(size.width, size.height, mobile, bounds.h, bounds.w);
  useEffect(() => {
    camera.fov = FOV;
    camera.position.set(0, bounds.cy, z);
    camera.lookAt(0, bounds.cy, 0);
    camera.updateProjectionMatrix();
  }, [camera, z, bounds]);

  // ambient motes (skipped on the low tier)
  const motes = useMemo(() => {
    const n = tier === 'high' ? 120 : tier === 'mid' ? 60 : 0;
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      p[i * 3] = (Math.random() - 0.5) * 10;
      p[i * 3 + 1] = -2 + Math.random() * 9;
      p[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    return { g, n };
  }, [tier]);
  useEffect(() => () => motes.g.dispose(), [motes]);

  const groundMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: getHaloTexture(), color: '#22d3ee', transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }),
    [],
  );
  useEffect(() => () => groundMat.dispose(), [groundMat]);

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime;
    uniforms.uGain.value += ((activeNode ? 1.6 : hoveredNode ? 1.25 : 1) - uniforms.uGain.value) * 0.06;
    if (root.current && !mobile) {
      root.current.rotation.y += ((pointer.x * 0.2 + Math.sin(clock.elapsedTime * 0.15) * 0.05) - root.current.rotation.y) * 0.04;
    } else if (root.current) {
      root.current.rotation.y = Math.sin(clock.elapsedTime * 0.2) * 0.08;
    }
  });

  const tree = nodes.tree;
  return (
    <>
      <hemisphereLight args={['#8fb4ff', '#1a1226', 1.15]} />
      <directionalLight position={[4, 8, 5]} intensity={1.7} color="#d4e5ff" />
      <directionalLight position={[-5, 3, -4]} intensity={1.3} color="#22d3ee" />

      <group position={[offsetX, 0, 0]}>
        <mesh position={[0, -1.35, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[8, 8, 1]} material={groundMat}>
          <planeGeometry args={[1, 1]} />
        </mesh>
        <group ref={root}>
          {tree && <mesh geometry={tree.geometry} material={bark} />}
          {(['10th', 'puc', 'be'] as NodeId[]).map((id) => {
            const mesh = nodes[`fruit_${id}`];
            const meta = nodesData.find((n) => n.id === id);
            if (!mesh || !meta) return null;
            return (
              <Fruit
                key={id}
                id={id}
                mesh={mesh}
                meta={meta}
                mobile={mobile}
                active={activeNode === id}
                hovered={hoveredNode === id}
                onClick={() => onNodeClick(id)}
                onHover={(h) => onNodeHover(h ? id : null)}
              />
            );
          })}
        </group>
        {motes.n > 0 && (
          <points geometry={motes.g}>
            <pointsMaterial color="#818cf8" size={0.035} transparent opacity={0.35} depthWrite={false} blending={THREE.AdditiveBlending} />
          </points>
        )}
      </group>
    </>
  );
}

/** Low tier renders at ~30 fps on demand; other tiers run a normal loop. Both stop when off-screen. */
function Pacer({ visible, tier }: { visible: boolean; tier: Tier }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (tier !== 'low' || !visible) return;
    const id = window.setInterval(invalidate, 33);
    return () => window.clearInterval(id);
  }, [tier, visible, invalidate]);
  return null;
}

export default function EducationTree3D(props: EducationTree3DProps) {
  const { tier } = props;
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '100px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrap} style={{ position: 'absolute', inset: 0 }}>
      <Canvas
        frameloop={tier === 'low' ? 'demand' : visible ? 'always' : 'never'}
        dpr={tier === 'high' ? [1, 1.75] : tier === 'mid' ? [1, 1.5] : 1}
        gl={{ antialias: tier !== 'low', alpha: true, powerPreference: tier === 'high' ? 'high-performance' : 'default', stencil: false }}
        camera={{ fov: FOV, position: [0, 1.6, 13], near: 0.1, far: 60 }}
        style={{ touchAction: 'pan-y' }}
        aria-label="Interactive 3D tree of education milestones"
      >
        <Pacer visible={visible} tier={tier} />
        <Suspense fallback={null}>
          <Scene {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
}
