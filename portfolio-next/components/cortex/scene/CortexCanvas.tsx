import { Canvas } from '@react-three/fiber'
import { NoToneMapping, PCFShadowMap } from 'three'
import { Stage } from './Stage'
import { Effects } from './Effects'
import { QUALITY, detectTier } from '../config/quality'
import { useCortex } from '../state/cortexStore'

const quality = QUALITY[detectTier()]

/**
 * The renderer surface. Tone mapping is deliberately OFF on the renderer
 * (NoToneMapping) so bloom runs in linear HDR; the filmic curve is applied as the
 * final post effect. Exposure is kept slightly dark so emissive energy reads as the
 * brightest element in the scene.
 */
export function CortexCanvas() {
  return (
    <Canvas
      shadows={{ type: PCFShadowMap }}
      dpr={[1, quality.maxPixelRatio]}
      role="img"
      aria-label="Interactive 3D Engineer's Brain — a cybernetic processor of seven knowledge regions. Use the region navigator (press Tab) to explore by keyboard."
      camera={{ position: [0, 0, 4.5], fov: 45, near: 0.1, far: 20 }}
      gl={{
        antialias: false,
        alpha: true,
        stencil: false,
        powerPreference: 'high-performance',
        toneMapping: NoToneMapping,
        toneMappingExposure: 0.9,
      }}
      onPointerMissed={() => useCortex.getState().clearBackground()}
      onCreated={({ gl }) => {
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
      <Stage particleCount={quality.particleCount} />
      <Effects />
    </Canvas>
  )
}
