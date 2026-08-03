import type { Region } from '../state/regions'
import type { RegionPalette } from '../config/palette'

/**
 * A floating technical instrument (docs/09, reference_ui): glassmorphic, thin
 * illuminated border in the region colour, concise content, staggered skill chips.
 *
 * Structure: an outer positioned slot (stable — the connector attaches to its rect)
 * wraps an inner card that deploys (fade + scale + rise) via CSS, so the slot's
 * centring transform and the deploy transform never collide.
 */
export function KnowledgePanel({
  region,
  palette,
  side,
  panelRef,
  onClose,
  onFocus,
}: {
  region: Region
  palette: RegionPalette
  side: 'left' | 'right' | 'bottom'
  panelRef: (el: HTMLDivElement | null) => void
  onClose: () => void
  /** Clicking the card flies the camera to this region's optimal viewing angle. */
  onFocus?: () => void
}) {
  return (
    <div ref={panelRef} className="panel-slot" data-side={side}>
      <div
        className="panel"
        style={{ ['--accent' as string]: palette.primary }}
        role="group"
        aria-label={`${region.knowledge} knowledge region`}
      >
        <span className="panel__edge" aria-hidden="true" />
        <button
          className="panel__close"
          onClick={(e) => {
            e.stopPropagation() // closing must never trigger a focus flight
            onClose()
          }}
          aria-label="Close panel"
        >
          ×
        </button>
        <div className="panel__head">
          {/* Hexagon node glyph — the reference's per-card instrument icon (region-coloured,
              minimal). Marks the card as a knowledge node without adding visual noise. */}
          <svg className="panel__glyph" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 2.2 20.5 7v10L12 21.8 3.5 17V7L12 2.2Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="2.4" fill="currentColor" />
          </svg>
          <div className="panel__headtext">
            <span className="panel__region">{region.name}</span>
            <h3 className="panel__title">{region.knowledge}</h3>
          </div>
        </div>
        <p className="panel__desc">{region.description}</p>
        <div className="panel__chips">
          {region.skills.map((skill, i) => (
            <span key={skill} className="chip" style={{ animationDelay: `${0.3 + i * 0.05}s` }}>
              {skill}
            </span>
          ))}
        </div>
        
        {onFocus && (
          <button 
            className="panel__focus" 
            onClick={(e) => {
              e.stopPropagation()
              onFocus()
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="11" y1="8" x2="11" y2="14"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
            Inspect Anatomy
          </button>
        )}
      </div>
    </div>
  )
}
