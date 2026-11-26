import { Canvas } from '@react-three/fiber'
import { ACESFilmicToneMapping, NoToneMapping, PCFShadowMap } from 'three'
import { lazy, Suspense } from 'react'
import { Stage } from './Stage'
import { QUALITY, baseCameraDistance } from '../config/quality'
import { useQuality } from '../state/qualityStore'
import { useCortex } from '../state/cortexStore'

// Lite never downloads the post-processing library.
const Effects = lazy(() => import('./Effects').then((m) => ({ default: m.Effects })))

/**
 * The renderer surface. With post-processing on, tone mapping is OFF on the renderer so bloom runs in
 * linear HDR and the filmic curve is the final effect; without it the renderer tone-maps itself.
 * Lite draws only on demand (a still picture), so an idle page costs the GPU nothing.
 */
export function CortexCanvas({ active = true }: { active?: boolean }) {
  const profile = useQuality((s) => s.profile)
  const quality = QUALITY[profile]

  return (
    <Canvas
      key={profile} // renderer options (antialias, shadows, materials) are fixed per context
      frameloop={!active ? 'never' : quality.animate ? 'always' : 'demand'}
      shadows={quality.shadows ? { type: PCFShadowMap } : false}
      dpr={[1, quality.maxPixelRatio]}
      role="img"
      aria-label="Interactive 3D Engineer's Brain — a cybernetic processor of seven knowledge regions. Use the region navigator (press Tab) to explore by keyboard."
      camera={{ position: [0, 0, 4.5], fov: 45, near: 0.1, far: 20 }}
      gl={{
        antialias: !quality.effects,
        alpha: true,
        stencil: false,
        powerPreference: quality.animate ? 'high-performance' : 'default',
        toneMapping: quality.effects ? NoToneMapping : ACESFilmicToneMapping,
        toneMappingExposure: quality.effects ? 0.9 : 1.15,
      }}
      onPointerMissed={() => useCortex.getState().clearBackground()}
      onCreated={({ gl, camera, size }) => {
        camera.position.z = baseCameraDistance(size.width / size.height)
        // Recover gracefully from a lost GPU context instead of freezing on a black frame.
        const canvas = gl.domElement
        canvas.addEventListener(
          'webglcontextlost',
          (e) => {
            e.preventDefault()
            console.warn('[Project Cortex] WebGL context lost — awaiting restore')
          },
          false,
        )
        canvas.addEventListener(
          'webglcontextrestored',
          () => console.info('[Project Cortex] WebGL context restored'),
          false,
        )
      }}
    >
      <Stage quality={quality} active={active} />
      {quality.effects && (
        <Suspense fallback={null}>
          <Effects msaa={quality.msaa} />
        </Suspense>
      )}
    </Canvas>
  )
}
