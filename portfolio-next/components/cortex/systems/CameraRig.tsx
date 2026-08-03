import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Vector3, Quaternion } from 'three'
import { brainRuntime } from '../brain/brainRuntime'
import { useCortex } from '../state/cortexStore'

/**
 * Subtle camera choreography (docs/01.5, 07): the orbit target eases toward the mean
 * of the active regions so the view "settles" on what you activated, and returns to
 * centre on deselect. The nudge is clamped to a small radius so it never disorients,
 * and only the target moves — user rotation and zoom stay fully in control.
 *
 * Focus flight (card click): when a knowledge card is clicked, `focusRegion` is set and
 * the rig flies the camera to that region's optimal viewing angle — along the region's
 * outward normal in WORLD space, recomputed every frame so the flight stays correct
 * while the brain keeps rotating. Orbit distance is preserved (no zoom jump), the polar
 * angle is clamped to the OrbitControls limits, and any user orbit input cancels the
 * flight immediately — the user is always in charge.
 */
export function CameraRig() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controls = useThree((s) => s.controls) as any
  const camera = useThree((s) => s.camera)
  const desired = useMemo(() => new Vector3(), [])
  const q = useMemo(() => new Quaternion(), [])
  const slerpedQ = useMemo(() => new Quaternion(), [])
  
  const lastIdleDir = useRef<Vector3 | null>(null)
  const lastIdleDist = useRef<number | null>(null)

  // Any user orbit gesture cancels an in-flight focus — the user is always in charge.
  useEffect(() => {
    if (!controls || !controls.addEventListener) return
    const cancel = () => {
      if (useCortex.getState().focusRegion != null) useCortex.getState().clearFocus()
      lastIdleDir.current = null // clear return flight if user interrupts
      lastIdleDist.current = null
    }
    controls.addEventListener('start', cancel)
    return () => controls.removeEventListener('start', cancel)
  }, [controls])

  useFrame((_, dt) => {
    if (!controls || !controls.target) return
    const s = useCortex.getState()
    const focus = s.focusRegion
    const g = brainRuntime.group

    // Shift the vanishing point to the right, which visually moves the brain to the left.
    // Reduced from 10% to 5% to move the exhibit slightly back to the right, freeing up space.
    const { width, height } = _.size
    camera.setViewOffset(width, height, width * 0.05, 0, width, height)

    let isFlying = false
    const currentDir = camera.position.clone().sub(controls.target).normalize()
    const targetDir = currentDir.clone()
    const currentDist = camera.position.distanceTo(controls.target)
    let targetDist = currentDist
    
    // If a lobe is focused, smoothly orbit the camera so the entire exhibit rotates to face it
    if (focus != null && g && brainRuntime.anchorNormals[focus]) {
      isFlying = true
      if (lastIdleDir.current === null) {
        lastIdleDir.current = currentDir.clone()
        lastIdleDist.current = currentDist
      }
      
      // Medulla (Brainstem) specific inspection camera to avoid pedestal obstruction
      if (focus === 6) {
        // A slightly lowered front-right perspective that keeps the medulla as the visual focus
        const medullaView = new Vector3(0.25, -0.15, 0.9).normalize()
        targetDir.copy(medullaView).applyQuaternion(g.quaternion).normalize()
      } else {
        targetDir.copy(brainRuntime.anchorNormals[focus]).applyQuaternion(g.quaternion).normalize()
      }
      
      targetDist = 4.5 * 0.85
    } else if (lastIdleDir.current != null && lastIdleDist.current != null) {
      isFlying = true
      // Smoothly return to the previous idle orientation and distance
      targetDir.copy(lastIdleDir.current)
      targetDist = lastIdleDist.current
      
      if (currentDir.angleTo(lastIdleDir.current) < 0.01 && Math.abs(currentDist - targetDist) < 0.01) {
        lastIdleDir.current = null
        lastIdleDist.current = null
        isFlying = false
      }
    }

    if (isFlying) {
      // --- Camera Target always stays perfectly centered on the brain ---
      desired.set(0, 0, 0)
      
      // Softer, more cinematic settle
      const k = 1 - Math.pow(0.1, Math.min(dt, 0.1))
      controls.target.lerp(desired, k * 0.5)

      // Spherically interpolate the camera's direction around the target
      q.setFromUnitVectors(currentDir, targetDir)
      slerpedQ.identity().slerp(q, 0.05)
      currentDir.applyQuaternion(slerpedQ).normalize()
      
      // Lerp the distance
      const kf = 1 - Math.pow(0.008, Math.min(dt, 0.1))
      const newDist = currentDist + (targetDist - currentDist) * kf
      
      // Apply the new position
      camera.position.copy(controls.target).addScaledVector(currentDir, newDist)
    }
  })

  return null
}
