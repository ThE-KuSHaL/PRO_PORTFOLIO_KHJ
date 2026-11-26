import { OrbitControls } from '@react-three/drei'
import { Suspense } from 'react'
import { BrainMesh } from '../brain/BrainMesh'
import { Lighting } from './Lighting'
import { BasePlatform } from './BasePlatform'
import { Particles } from './Particles'
import { RegionProjector } from './RegionProjector'
import { PerfMonitor } from '../engine/PerfMonitor'
import { CameraRig } from '../systems/CameraRig'
import { ProximityGate } from './ProximityGate'
import { StillDriver } from './StillDriver'
import { Warmup } from './Warmup'
import type { QualitySettings } from '../config/quality'
import { useQuality } from '../state/qualityStore'

/**
 * Assembles the 3D scene: dark background, cinematic rig, the merged brain on its
 * dock, ambient particles, and an intentional (never orthographic) orbit camera.
 */
export function Stage({ quality, active }: { quality: QualitySettings; active: boolean }) {
  const chosen = useQuality((s) => s.chosen)
  // On touch screens up/down belongs to page scrolling, so the view stays level and only turns sideways.
  // Otherwise each swipe past the brain tips it a little, until it is seen from above or from underneath.
  const level = window.matchMedia('(pointer: coarse)').matches
  return (
    <>
      <Lighting envResolution={quality.envResolution} shadows={quality.shadows} />

      <Suspense fallback={null}>
        <BrainMesh quality={quality} />
      </Suspense>

      <BasePlatform animate={quality.animate} glass={quality.glass} />
      {quality.particleCount > 0 && <Particles count={quality.particleCount} />}
      <RegionProjector />
      <CameraRig animate={quality.animate} />
      {/* only while we are the ones choosing: a visitor's own pick is left alone */}
      {quality.animate && !chosen && <PerfMonitor />}
      {!quality.animate && <StillDriver active={active} />}
      <ProximityGate />
      <Warmup effects={quality.effects} />

      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping={quality.animate} // no drifting frames after release in the still profile
        dampingFactor={0.045}
        rotateSpeed={0.55}
        zoomSpeed={0.65}
        minDistance={1.75}
        maxDistance={8}
        minPolarAngle={level ? Math.PI / 2 : 0}
        maxPolarAngle={level ? Math.PI / 2 : Math.PI * 0.86}
        target={[0, 0, 0]}
      />
    </>
  )
}
