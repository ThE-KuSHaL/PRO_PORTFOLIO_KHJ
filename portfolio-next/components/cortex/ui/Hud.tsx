import { useCortex } from '../state/cortexStore'

/**
 * Minimal instrument HUD (docs/09). The brain is the interface; this only frames it.
 * Interactive knowledge panels, connectors and labels arrive in the interaction milestone.
 */
function stageLabel(active: number): string {
  if (active === 0) return 'Dormant'
  if (active === 1) return 'Awakened'
  if (active >= 7) return 'Synchronized'
  return 'Expanding'
}

export function Hud() {
  const active = useCortex((s) => s.selected.length)
  return (
    <div className="hud">
      <header className="hud__heading">
        <h2 className="hud__title">Engineer&rsquo;s Brain</h2>
        <p className="hud__subtitle">Interactive Knowledge Architecture</p>
        <p className="hud__cta">
          <span className="hud__hint-desktop">Click on the different parts of the brain to know more.</span>
          <span className="hud__hint-touch">Tap the different parts of the brain to know more.</span>
        </p>
      </header>

      <div className="hud__hint">
        <span className="hud__hint-desktop">{active > 0 ? 'Click it again to close · Esc to reset' : 'Drag the brain to rotate'}</span>
        <span className="hud__hint-touch">{active > 0 ? 'Tap it again to close' : 'Drag sideways to rotate'}</span>
      </div>
      <div className="hud__status">
        {stageLabel(active).toUpperCase()} &middot; {active} / 7 active
      </div>
    </div>
  )
}

export function LoadingOverlay() {
  const ready = useCortex((s) => s.ready)
  return (
    <div className="loader" style={{ opacity: ready ? 0 : 1, pointerEvents: ready ? 'none' : 'auto' }}>
      <div className="loader__inner">
        <div className="loader__ring" />
        <div className="loader__label">Initializing Cortex</div>
      </div>
    </div>
  )
}
