import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { useCortex } from '../state/cortexStore'

/**
 * Redraw policy for the still (Lite) profile: draw when the brain arrives, when the section comes back
 * into view, when the canvas changes size and when a region's state changes. Dragging is covered by
 * OrbitControls, which asks for a frame on every change. Otherwise nothing is drawn.
 */
export function StillDriver({ active }: { active: boolean }) {
  const invalidate = useThree((s) => s.invalidate)
  const width = useThree((s) => s.size.width)
  const height = useThree((s) => s.size.height)
  const ready = useCortex((s) => s.ready)

  useEffect(() => {
    if (!active) return
    // a few spaced frames: the mesh, the studio reflections and the labels settle one after another
    const timers = [0, 60, 200, 600].map((ms) => window.setTimeout(() => invalidate(), ms))
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [active, ready, width, height, invalidate])

  useEffect(() => useCortex.subscribe(() => {
    invalidate()
    window.setTimeout(() => invalidate(), 60) // second pass: the camera moves first, anchors follow
  }), [invalidate])

  return null
}
