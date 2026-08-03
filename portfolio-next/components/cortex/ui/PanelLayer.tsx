import { useEffect, useRef } from 'react'
import { useCortex } from '../state/cortexStore'
import { REGIONS } from '../state/regions'
import { REGION_COLORS } from '../config/palette'
import { screenPoints } from '../interaction/projection'
import { KnowledgePanel } from './KnowledgePanel'
import { useMediaQuery } from './useMediaQuery'

export function PanelLayer() {
  const selected = useCortex((s) => s.selected)
  const toggleSelected = useCortex((s) => s.toggleSelected)
  const requestFocus = useCortex((s) => s.requestFocus)
  const compact = useMediaQuery('(max-width: 720px)')

  const containerRef = useRef<HTMLDivElement>(null)
  const panelRefs = useRef(new Map<number, HTMLDivElement>())
  const pathRefs = useRef(new Map<number, SVGPathElement>())
  const nodeRefs = useRef(new Map<number, SVGCircleElement>())
  const cardState = useRef(new Map<number, { x: number; y: number; phase: number }>())
  const selectedRef = useRef<number[]>(selected)
  selectedRef.current = selected
  
  // Track previous time for delta
  const lastTimeRef = useRef<number>(performance.now())

  useEffect(() => {
    if (compact) return
    let raf = 0
    const loop = (time: number) => {
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1)
      lastTimeRef.current = time

      if (!containerRef.current) {
        raf = requestAnimationFrame(loop)
        return
      }

      const rect = containerRef.current.getBoundingClientRect()
      const width = rect.width
      const height = rect.height

      // Process all 7 regions permanently for phase animations
      for (let id = 0; id < REGIONS.length; id++) {
        const isActive = selectedRef.current.includes(id)
        
        let state = cardState.current.get(id)
        if (!state) {
          state = { x: 0, y: 0, phase: 0 }
          cardState.current.set(id, state)
        }

        // Phase machine: climbs to 1.0 when active, falls to 0.0 when inactive.
        // Takes ~0.6 seconds to open fully, and ~0.4 seconds to close.
        if (isActive) {
          state.phase = Math.min(1.0, state.phase + dt * 1.6)
        } else {
          state.phase = Math.max(0.0, state.phase - dt * 2.5)
        }

        const panel = panelRefs.current.get(id)
        const path = pathRefs.current.get(id)
        const node = nodeRefs.current.get(id)
        const sp = screenPoints[id]

        if (!panel || !path || !node) continue

        // If completely closed, hide from DOM completely
        if (state.phase <= 0.0 || !sp || !sp.visible) {
          panel.style.display = 'none'
          path.style.display = 'none'
          node.style.display = 'none'
          continue
        }

        // --- Sequenced Animation Math ---
        // 0.0 to 0.5 = Connector trace grows
        // 0.5 to 1.0 = Card fades and slides in
        
        // Progress 0->1 for just the connector phase (first 50% of total phase)
        let connectorProgress = Math.min(1.0, state.phase * 2.0)
        // Smooth ease out for the connector growth
        connectorProgress = connectorProgress * (2 - connectorProgress)
        
        // Progress 0->1 for just the card phase (last 50% of total phase)
        let cardProgress = Math.max(0.0, (state.phase - 0.5) * 2.0)
        // Premium cubic ease out for the card
        cardProgress = 1 - Math.pow(1 - cardProgress, 3)

        panel.style.display = ''
        path.style.display = ''
        node.style.display = ''

        // 1. Position tracking
        const w = panel.offsetWidth
        const h = panel.offsetHeight
        const marginX = Math.max(40, width * 0.05)
        const targetX = width - marginX - w
        const targetY = height / 2 - h / 2

        // Snap position if just starting to open so it doesn't fly from 0,0
        if (isActive && state.phase < 0.1 && cardProgress === 0) {
          state.x = targetX
          state.y = targetY
        } else {
          state.x += (targetX - state.x) * 0.15
          state.y += (targetY - state.y) * 0.15
        }

        // 2. Card Visuals
        panel.style.opacity = String(cardProgress)
        // Slide in from 40px to the right and softly scale
        const offsetX = (1.0 - cardProgress) * 40
        const scale = 0.97 + (cardProgress * 0.03)
        panel.style.transform = `translate3d(${state.x + offsetX}px, ${state.y}px, 0) scale(${scale})`
        // Only clickable if fully opened
        panel.style.pointerEvents = cardProgress >= 1.0 ? 'auto' : 'none'
        panel.style.transformOrigin = 'center left'

        // 3. PCB Routing
        const ax = state.x
        const ay = state.y + h / 2
        const routeX = ax - 32
        const cr = 12
        let d = ''
        const dy = ay - sp.y
        const dx1 = routeX - sp.x
        const dx2 = ax - routeX

        if (Math.abs(dy) < 2) {
          d = `M ${sp.x} ${sp.y} L ${ax} ${ay}`
        } else {
          const dirY = Math.sign(dy)
          const dirX1 = Math.sign(dx1) || 1
          const dirX2 = Math.sign(dx2) || 1
          
          const safeCr1 = Math.min(cr, Math.abs(dx1), Math.abs(dy) / 2)
          const safeCr2 = Math.min(cr, Math.abs(dx2), Math.abs(dy) / 2)
          
          if (safeCr1 < 1 || safeCr2 < 1) {
            d = `M ${sp.x} ${sp.y} L ${routeX} ${sp.y} L ${routeX} ${ay} L ${ax} ${ay}`
          } else {
            const x1 = routeX - safeCr1 * dirX1
            const y1 = sp.y
            const x2 = routeX
            const y2 = sp.y + safeCr1 * dirY
            const x3 = routeX
            const y3 = ay - safeCr2 * dirY
            const x4 = routeX + safeCr2 * dirX2
            const y4 = ay
            
            d = `M ${sp.x} ${sp.y} L ${x1} ${y1} Q ${routeX} ${sp.y} ${x2} ${y2} L ${x3} ${y3} Q ${routeX} ${ay} ${x4} ${y4} L ${ax} ${ay}`
          }
        }

        path.setAttribute('d', d)
        
        // 4. Connector Animation
        // pathLength="1" is set on the SVG element, so dashoffset 1 is fully hidden, 0 is fully drawn.
        path.style.strokeDasharray = '1'
        path.style.strokeDashoffset = String(1.0 - connectorProgress)
        // Optionally scale the node dot so it pops in
        node.style.transform = `scale(${connectorProgress})`
        node.style.transformOrigin = `${sp.x}px ${sp.y}px`
        
        node.setAttribute('cx', String(sp.x))
        node.setAttribute('cy', String(sp.y))
      }

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [compact, selected.length])

  if (compact) {
    return (
      <div className="panel-dock">
        {selected.map((id) => (
          <KnowledgePanel
            key={id}
            region={REGIONS[id]}
            palette={REGION_COLORS[id]}
            side="bottom"
            panelRef={(el) => registerRef(panelRefs, id, el)}
            onClose={() => toggleSelected(id)}
          />
        ))}
      </div>
    )
  }

  return (
    <>
      <svg className="connectors" aria-hidden="true">
        {REGIONS.map((region, id) => {
          const color = REGION_COLORS[id].primary
          return (
            <g key={id}>
              <path
                ref={(el) => registerRef(pathRefs, id, el)}
                className="connector__path"
                pathLength={1}
                stroke={color}
                fill="none"
              />
              <circle
                ref={(el) => registerRef(nodeRefs, id, el)}
                className="connector__node"
                r={4}
                fill={color}
              />
            </g>
          )
        })}
      </svg>

      <div 
        ref={containerRef}
        className="absolute inset-0 z-10 pointer-events-none"
      >
        {REGIONS.map((region, id) => (
          <KnowledgePanel
            key={id}
            region={region}
            palette={REGION_COLORS[id]}
            side="left" // Side is dynamically handled by transforms now
            panelRef={(el) => registerRef(panelRefs, id, el)}
            onClose={() => toggleSelected(id)}
            onFocus={() => requestFocus(id)}
          />
        ))}
      </div>
    </>
  )
}

function registerRef<T>(ref: React.MutableRefObject<Map<number, T>>, id: number, el: T | null) {
  if (el) ref.current.set(id, el)
  else ref.current.delete(id)
}
