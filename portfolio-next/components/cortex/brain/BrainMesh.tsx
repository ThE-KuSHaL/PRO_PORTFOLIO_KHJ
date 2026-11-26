import { useGLTF } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { BufferGeometry, Group, Quaternion } from 'three'
import '../interaction/bvh'
import { processBrainScene } from './processBrainGeometry'
import { createBrainMaterial } from './masterMaterial'
import { brainRuntime } from './brainRuntime'
import { SurfaceComponents } from './SurfaceComponents'
import { HoverLabel } from '../scene/HoverLabel'
import { useCortex } from '../state/cortexStore'
import { useQuality } from '../state/qualityStore'
import { REGION_COUNT } from '../state/regions'
import type { QualitySettings } from '../config/quality'

/** Shader clock used by the still profile: a moment with the signal packets spread nicely. */
const STILL_TIME = 2.6

const DRAG_THRESHOLD_SQ = 36 // px^2 — beyond this a pointer-up is an orbit drag, not a click

/** Resolve which region a pointer event hit by reading the face's per-vertex region id. */
function regionFromEvent(e: ThreeEvent<PointerEvent>): number | null {
  const geom = (e.object as unknown as { geometry: BufferGeometry }).geometry
  const attr = geom.getAttribute('aRegionId')
  if (!attr) return null
  let vi: number
  if (e.face) vi = e.face.a
  else if (e.faceIndex != null) vi = e.faceIndex * 3
  else return null
  const id = Math.round(attr.getX(vi))
  return id >= 0 && id < REGION_COUNT ? id : null
}

/**
 * The Engineer's Brain: one merged, region-tagged mesh with the master material.
 * A single useFrame advances time, applies idle float/rotate/breathe, and eases the
 * per-region activation/hover uniforms toward the discrete store state — so hovering
 * or selecting never causes a per-frame React re-render.
 */
export function BrainMesh({ quality }: { quality: QualitySettings }) {
  const { animate } = quality
  const { scene } = useGLTF(quality.model, '/draco/') // compressed; the decoder is served by this site
  const processed = useMemo(() => {
    const p = processBrainScene(scene)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(p.geometry as any).computeBoundsTree?.()
    return p
  }, [scene])
  const { material, uniforms } = useMemo(() => createBrainMaterial(quality.clearcoat), [quality.clearcoat])
  // Small surface-mounted parts reward zoom: all of them on Full, fewer on Balanced, none on Lite.
  const componentBudget = useQuality((s) => s.componentBudget)

  const groupRef = useRef<Group>(null)
  const activeEase = useRef(new Float32Array(REGION_COUNT))
  const hoverEase = useRef(new Float32Array(REGION_COUNT))
  const down = useRef({ x: 0, y: 0, region: -1 })
  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  useEffect(() => {
    brainRuntime.group = groupRef.current
    brainRuntime.centroids = processed.regionCentroids
    brainRuntime.anchors = processed.regionCentroids.map((c) =>
      c.clone().add(c.clone().normalize().multiplyScalar(0.14)),
    )
    brainRuntime.anchorNormals = processed.regionCentroids.map((c) => c.clone().normalize())
    brainRuntime.ready = true
    useCortex.getState().setReady(true)
    return () => {
      brainRuntime.ready = false
      brainRuntime.group = null
      useCortex.getState().setReady(false) // so the loader shows while another profile builds
      material.dispose()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(processed.geometry as any).disposeBoundsTree?.()
      processed.geometry.dispose()
    }
  }, [material, processed])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1)
    const t = animate ? state.clock.elapsedTime : STILL_TIME
    uniforms.uTime.value = t

    // Idle breathing: a calm, alive rest state — slow vertical drift, a slower rotation,
    // and a gentle scale breath on its own frequency so the motion never reads as a loop.
    // All three respect prefers-reduced-motion consistently.
    const motion = reducedMotion || !animate ? 0 : 1
    const g = groupRef.current
    if (g) {
      g.position.y = Math.sin(t * 0.5) * 0.03 * motion
      g.scale.setScalar(1 + Math.sin(t * 0.8) * 0.006 * motion)
      
      const s = useCortex.getState()
      const focus = s.focusRegion
      
      // The entire exhibit rotates via the camera now.
      // We only apply the gentle idle spin when no lobe is focused.
      if (focus == null) {
        g.rotation.y += dt * 0.022 * motion
      }
    }

    // Interaction choreography (docs/07 + modification_02): hover is a confident, held
    // state; selection "deploys" — deliberate, never pops. Packet cadence uses a per-region
    // BOOST CLOCK: while hovered/selected the region's clock advances faster, so packets
    // stay quick for the entire interaction (no burst-then-fade), easing back only on exit.
    const s = useCortex.getState()
    // The still profile has no in-between frames, so states switch at once.
    const kHover = animate ? 1 - Math.pow(0.004, dt) : 1 // confident ease (~0.15s), holds while inside
    const kSelect = animate ? 1 - Math.pow(0.02, dt) : 1 // deliberate deploy: ~0.28s
    const boost = uniforms.uBoost.value
    let target = 0
    for (let i = 0; i < REGION_COUNT; i++) {
      const ta = s.selected.includes(i) ? 1 : 0
      const th = s.hovered === i ? 1 : 0
      activeEase.current[i] += (ta - activeEase.current[i]) * kSelect
      hoverEase.current[i] += (th - hoverEase.current[i]) * kHover
      uniforms.uActive.value[i] = activeEase.current[i]
      uniforms.uHover.value[i] = hoverEase.current[i]
      // Sustained cadence (+40% over the M15 values so hover reads clearly distinct from
      // idle at a glance): hover ≈ +63% packet speed, select ≈ +84%, additive per region.
      boost[i] += dt * (hoverEase.current[i] * 0.63 + activeEase.current[i] * 0.84) * motion
      target += ta
    }
    uniforms.uBrainActivity.value += (target / REGION_COUNT - uniforms.uBrainActivity.value) * kSelect

    // Synchronization crescendo: swells when all seven regions are active (~1.5s ease).
    const syncTarget = target >= REGION_COUNT ? 1 : 0
    const ks = animate ? 1 - Math.pow(0.02, dt) : 1
    uniforms.uSync.value += (syncTarget - uniforms.uSync.value) * ks
    uniforms.uMicroDetail.value = useQuality.getState().microDetail ? 1 : 0
  })

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    const r = regionFromEvent(e)
    if (r != null && useCortex.getState().hovered !== r) useCortex.getState().setHovered(r)
    document.body.style.cursor = r != null ? 'pointer' : 'auto'
  }
  const onPointerOut = () => {
    useCortex.getState().setHovered(null)
    document.body.style.cursor = 'auto'
  }
  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    // The ray passes through the whole brain. Stop at the first (front) surface, or the far side wins.
    e.stopPropagation()
    down.current ={ x: e.clientX, y: e.clientY, region: regionFromEvent(e) ?? -1 }
  }
  const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
    const dx = e.clientX - down.current.x
    const dy = e.clientY - down.current.y
    if (dx * dx + dy * dy > DRAG_THRESHOLD_SQ) return // was an orbit drag

    // A mouse selects what it is hovering. A finger or pen never hovers (a tap sends no pointermove),
    // so it selects the region that was under it.
    const touch = e.pointerType !== 'mouse'
    const r = touch ? (down.current.region >= 0 ? down.current.region : regionFromEvent(e)) : useCortex.getState().hovered
    if (r != null) {
      e.stopPropagation()
      useCortex.getState().toggleSelected(r)
    }
    if (touch) useCortex.getState().setHovered(null) // nothing stays "hovered" once the finger lifts
  }

  return (
    <group ref={groupRef}>
      <mesh
        geometry={processed.geometry}
        material={material}
        castShadow={quality.shadows}
        receiveShadow={quality.shadows}
        frustumCulled={false}
        onPointerMove={onPointerMove}
        onPointerOut={onPointerOut}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      />
      {componentBudget > 0 && <SurfaceComponents geometry={processed.geometry} budget={componentBudget} />}
      <HoverLabel />
    </group>
  )
}
