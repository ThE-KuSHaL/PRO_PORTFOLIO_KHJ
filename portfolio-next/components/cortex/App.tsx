import { CortexCanvas } from './scene/CortexCanvas'
import { Hud, LoadingOverlay } from './ui/Hud'
import { PanelLayer } from './ui/PanelLayer'
import { PerfOverlay } from './ui/PerfOverlay'
import { RegionNav } from './ui/RegionNav'
import { Announcer } from './ui/Announcer'
import { ErrorBoundary } from './ui/ErrorBoundary'
import { useKeyboard } from './interaction/useKeyboard'

/**
 * Project Cortex — application shell.
 * The canvas fills the viewport; the HUD, knowledge panels, connector overlay and the
 * accessible region navigator sit above it as DOM. Keyboard navigation is bound
 * globally; the whole tree is guarded by an error boundary so a failed load degrades
 * gracefully.
 */
import './styles.css'

export function CortexApp() {
  useKeyboard()
  return (
    <div className="cortex-container" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      


      <ErrorBoundary>
        <CortexCanvas />
        <PanelLayer />
        <Hud />
        <RegionNav />
        <PerfOverlay />
        <Announcer />
        <LoadingOverlay />
      </ErrorBoundary>
    </div>
  )
}
