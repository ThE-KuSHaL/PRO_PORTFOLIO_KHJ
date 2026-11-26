import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { HalfFloatType, WebGLRenderTarget } from 'three'
import { useCortex } from '../state/cortexStore'

/**
 * Prepare the brain's shader programs while the section is still approaching. Left to the first draw,
 * the driver builds them while the page waits (over 4 s on a cold start in testing). compileAsync lets it
 * work in the background where the browser supports that.
 */
export function Warmup({ effects }: { effects: boolean }) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const invalidate = useThree((s) => s.invalidate)
  const ready = useCortex((s) => s.ready)

  useEffect(() => {
    if (!ready) return
    let alive = true
    const timer = window.setTimeout(() => {
      // With post-processing the scene is drawn into an HDR buffer, which needs its own program
      // variants: compile against a stand-in of that kind.
      const buffer = effects ? new WebGLRenderTarget(1, 1, { type: HalfFloatType }) : null
      gl.setRenderTarget(buffer)
      const done = gl.compileAsync(scene, camera)
      gl.setRenderTarget(null)
      done
        .then(() => { if (alive) invalidate() })
        .catch(() => {}) // the first draw then compiles as before
        .finally(() => buffer?.dispose())
    }, 0)
    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [ready, effects, gl, scene, camera, invalidate])

  return null
}
