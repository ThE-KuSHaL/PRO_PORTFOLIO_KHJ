import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { Box3, Vector3 } from 'three'
import { brainRuntime } from '../brain/brainRuntime'

const box = new Box3()
const size = new Vector3()
const center = new Vector3()
const edge = new Vector3()
const right = new Vector3()

/** Extra reach (px) beyond the brain's silhouette in which interaction still engages. */
const MARGIN_PX = 28

/**
 * Orbit/zoom only respond when the pointer is on — or immediately next to — the brain.
 * Everywhere else in the section the page scrolls normally and the brain ignores input.
 * Once a drag starts near the brain it keeps going until release, even if the pointer
 * wanders off. Works for mouse, pen and touch (decided on pointerdown / wheel).
 */
export function ProximityGate() {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controls = useThree((s) => s.controls) as any

  useEffect(() => {
    const root = gl.domElement.closest('.cortex-container') as HTMLElement | null
    if (!root || !controls) return

    let dragging = false

    const isNear = (cx: number, cy: number): boolean => {
      const g = brainRuntime.group
      if (!g) return false
      box.setFromObject(g)
      box.getCenter(center)
      box.getSize(size)
      const radius = size.length() * 0.5 * 0.72 // box diagonal over-estimates an ellipsoid
      right.setFromMatrixColumn(camera.matrixWorld, 0)
      const a = center.clone().project(camera)
      const b = edge.copy(center).addScaledVector(right, radius).project(camera)
      const r = gl.domElement.getBoundingClientRect()
      const sx = (a.x * 0.5 + 0.5) * r.width + r.left
      const sy = (-a.y * 0.5 + 0.5) * r.height + r.top
      const sr = Math.hypot((b.x - a.x) * 0.5 * r.width, (b.y - a.y) * 0.5 * r.height)
      return Math.hypot(cx - sx, cy - sy) <= sr + MARGIN_PX
    }

    const apply = (near: boolean) => {
      controls.enabled = near || dragging
      root.style.cursor = near || dragging ? (dragging ? 'grabbing' : 'grab') : ''
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      apply(isNear(e.clientX, e.clientY))
    }
    const onDown = (e: PointerEvent) => {
      const near = isNear(e.clientX, e.clientY)
      dragging = near
      apply(near)
    }
    const onUp = () => {
      dragging = false
      root.style.cursor = ''
    }
    const onWheel = (e: WheelEvent) => apply(isNear(e.clientX, e.clientY))

    controls.enabled = false
    root.addEventListener('pointermove', onMove, { passive: true })
    root.addEventListener('pointerdown', onDown, { capture: true })
    root.addEventListener('wheel', onWheel, { capture: true, passive: true })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerdown', onDown, { capture: true })
      root.removeEventListener('wheel', onWheel, { capture: true })
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      controls.enabled = true
      root.style.cursor = ''
    }
  }, [camera, gl, controls])

  return null
}
