'use client'

import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { WORLD_SECTORS, type SectorId } from './world-data'
import type { WorldEngine } from './world-engine'
import './world.css'

export function PortfolioWorld() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const engine = useRef<WorldEngine | null>(null)
  const labels = useRef(new Map<SectorId, HTMLButtonElement>())
  const leaders = useRef(new Map<SectorId, SVGLineElement>())
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  const [selected, setSelected] = useState<SectorId | null>(null)
  const [paused, setPaused] = useState(false)
  const [explained, setExplained] = useState<SectorId | null>(null)

  useEffect(() => {
    if (!explained) return
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !labels.current.get(explained!)?.contains(event.target)) setExplained(null)
    }
    function escape(event: KeyboardEvent) { if (event.key === 'Escape') setExplained(null) }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('keydown', escape)
    }
  }, [explained])

  useEffect(() => {
    let disposed = false
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const motionChanged = () => setPaused(motion.matches)
    motion.addEventListener('change', motionChanged)
    import('./world-engine').then(({ createWorldEngine }) => {
      if (disposed || !canvas.current) return
      try {
        engine.current = createWorldEngine(canvas.current, {
          onProject: points => {
            const width = canvas.current?.clientWidth ?? 0
            const height = canvas.current?.clientHeight ?? 0
            for (const side of [-1, 1]) {
              const group = points.filter(point => (point.x < 0.5 ? -1 : 1) === side).sort((a, b) => a.y - b.y)
              let previousY = 30
              for (const point of group) {
                const label = labels.current.get(point.id)
                if (!label) continue
                const px = point.x * width
                const py = point.y * height
                const half = label.offsetWidth / 2
                const desiredX = side < 0 ? Math.min(px - 48, width * 0.22) : Math.max(px + 48, width * 0.78)
                const x = Math.max(half + 10, Math.min(width - half - 10, desiredX))
                const y = Math.min(height - 25, Math.max(previousY + 36, py - 8))
                previousY = y
                label.dataset.side = side < 0 ? 'left' : 'right'
                label.style.left = `${x}px`
                label.style.top = `${y}px`
                const line = leaders.current.get(point.id)
                line?.setAttribute('x1', String(px))
                line?.setAttribute('y1', String(py))
                line?.setAttribute('x2', String(x - side * half))
                line?.setAttribute('y2', String(y))
              }
            }
          },
          onHover: id => {
            clearTimeout(dismissTimer.current)
            if (id) setExplained(id)
            else dismissTimer.current = setTimeout(() => {
              const reading = [...labels.current.values()].some(label => label.querySelector('.world-explanation:not([hidden]):hover'))
              if (!reading) setExplained(null)
            }, 250)
          },
          onSelect: id => { clearTimeout(dismissTimer.current); setSelected(id); setExplained(id) },
          onCollect: () => {},
          onUnavailable: () => {
            engine.current?.dispose()
            engine.current = null
            setStatus('unavailable')
          },
        })
        setPaused(motion.matches)
        setStatus('ready')
      } catch {
        setStatus('unavailable')
      }
    }).catch(() => { if (!disposed) setStatus('unavailable') })
    return () => {
      disposed = true
      clearTimeout(dismissTimer.current)
      engine.current?.dispose()
      engine.current = null
      motion.removeEventListener('change', motionChanged)
    }
  }, [])

  function select(id: SectorId) {
    setSelected(id)
    engine.current?.select(id)
  }

  return (
    <div className="portfolio-world" data-ready={status === 'ready'}>
      <div className="world-viewport">
        <div className="world-atmosphere" aria-hidden="true" />
        {status !== 'ready' && (
          <div className="world-fallback" aria-hidden="true">
            <svg className="world-fallback-symbol" viewBox="0 0 100 100"><circle cx="50" cy="50" r="47" fill="#13131B" /><path d="M50 3a47 47 0 0 0 0 94 23.5 23.5 0 0 0 0-47 23.5 23.5 0 0 1 0-47" fill="#EDEDF0" /><circle cx="50" cy="26.5" r="6" fill="#EDEDF0" /><circle cx="50" cy="73.5" r="6" fill="#13131B" /><circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth=".5" /></svg>
          </div>
        )}
        <canvas ref={canvas} className="world-canvas" tabIndex={status === 'ready' ? 0 : -1}
          aria-label="3D yin and yang symbol. Drag to rotate. Tap the symbol or press Space to bounce."
          aria-describedby="world-instructions" />
        {status === 'ready' && (
          <button className="world-motion-toggle" type="button" aria-label={paused ? 'Resume ambient motion' : 'Pause ambient motion'} title={paused ? 'Resume ambient motion' : 'Pause ambient motion'} aria-pressed={paused}
            onClick={() => { engine.current?.setPaused(!paused); setPaused(!paused) }}>{paused ? <Play size={14} /> : <Pause size={14} />}</button>
        )}
        <svg className="world-label-leaders" aria-hidden="true">
          {WORLD_SECTORS.map(item => <line key={item.id} ref={node => { if (node) leaders.current.set(item.id, node); else leaders.current.delete(item.id) }} />)}
        </svg>
      <div className="world-sector-list" role="group" aria-label="Emotion to reality: a personal philosophy">
        {WORLD_SECTORS.map(item => (
          <button type="button" key={item.id} ref={node => { if (node) labels.current.set(item.id, node); else labels.current.delete(item.id) }} aria-label={item.label} aria-describedby={`reflection-${item.id}`} aria-pressed={selected === item.id}
            onFocus={event => { if (event.currentTarget.matches(':focus-visible')) { clearTimeout(dismissTimer.current); setExplained(item.id) } }}
            onBlur={() => setExplained(null)}
            onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); setExplained(null) } }}
            onClick={() => { select(item.id); setExplained(item.id) }}>
            {item.label}
            <span id={`reflection-${item.id}`} role="tooltip" className="world-explanation" hidden={explained !== item.id}
              onPointerEnter={() => clearTimeout(dismissTimer.current)} onPointerLeave={() => setExplained(null)}>
              {item.description}
            </span>
          </button>
        ))}
      </div>
      </div>
      <p id="world-instructions" className="sr-only">
        {status === 'unavailable' ? 'A static yin and yang symbol is shown because 3D is unavailable.' : 'Drag to orbit. Tap yin and yang or press Space to bounce. Hover an orbiting world to read its reflection, or focus a label with the keyboard.'}
      </p>
    </div>
  )
}
