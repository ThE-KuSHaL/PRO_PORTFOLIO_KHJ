import { useEffect, useRef, useState } from 'react'
import { Info } from 'lucide-react'
import { PROFILES, QUALITY } from '../config/quality'
import { useQuality } from '../state/qualityStore'
import { useCortex } from '../state/cortexStore'

/** Bottom-left of the exhibit: pick how heavy the brain is, with a short note on why that exists. */
export function QualitySwitch() {
  const profile = useQuality((s) => s.profile)
  const recommended = useQuality((s) => s.recommended)
  const setProfile = useQuality((s) => s.setProfile)
  const panelOpen = useCortex((s) => s.selected.length > 0)
  const [info, setInfo] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!info) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setInfo(false) }
    const onDown = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setInfo(false) }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown, { capture: true })
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown, { capture: true })
    }
  }, [info])

  return (
    <div className="quality" ref={root} data-panel-open={panelOpen}>
      {info && (
        <div className="quality__note" id="quality-note" role="note">
          <p><strong>One brain, built for any hardware.</strong></p>
          <p>Lite: a still view that is easy to run.</p>
          <p>Balanced: movement and a soft glow.</p>
          <p>Full: every part, shadow and effect.</p>
          <p>{QUALITY[recommended].label} suits this device best.</p>
          <p>Switch any time. Your pick is saved.</p>
        </div>
      )}
      <div className="quality__group" role="group" aria-label="Brain quality">
        {PROFILES.map((p) => (
          <button
            key={p}
            type="button"
            className="quality__btn"
            aria-pressed={p === profile}
            onClick={() => {
              if (p === profile) return
              useCortex.getState().clearSelection()
              useCortex.getState().setHovered(null)
              setProfile(p)
            }}
          >
            {QUALITY[p].label}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="quality__info"
        aria-label="About the quality profiles"
        aria-expanded={info}
        aria-controls="quality-note"
        onClick={() => setInfo((open) => !open)}
      >
        <Info size="1rem" aria-hidden="true" />
      </button>
    </div>
  )
}
