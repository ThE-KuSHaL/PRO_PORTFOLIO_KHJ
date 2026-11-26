import { CortexCanvas } from './scene/CortexCanvas'
import { Hud, LoadingOverlay } from './ui/Hud'
import { PanelLayer } from './ui/PanelLayer'
import { PerfOverlay } from './ui/PerfOverlay'
import { RegionNav } from './ui/RegionNav'
import { Announcer } from './ui/Announcer'
import { ErrorBoundary } from './ui/ErrorBoundary'
import { QualitySwitch } from './ui/QualitySwitch'
import { useKeyboard } from './interaction/useKeyboard'
import { useQuality } from './state/qualityStore'

/**
 * Project Cortex — application shell.
 * The canvas fills the viewport; the HUD, knowledge panels, connector overlay and the
 * accessible region navigator sit above it as DOM. Keyboard navigation is bound
 * globally; the whole tree is guarded by an error boundary so a failed load degrades
 * gracefully.
 */
import './styles.css'

export function CortexApp({ active = true }: { active?: boolean }) {
  useKeyboard()
  const profile = useQuality((s) => s.profile)
  return (
    <div className="cortex-container" data-profile={profile} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <ErrorBoundary>
        <CortexCanvas active={active} />
        <PanelLayer />
        <Hud />
        <RegionNav />
        <QualitySwitch />
        <PerfOverlay />
        <Announcer />
        <LoadingOverlay />
      </ErrorBoundary>
    </div>
  )
}
