'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Gamepad2, Globe2, Pause, Play, RotateCcw, Sparkles } from 'lucide-react'
import { WORLD_SECTORS, type SectorId } from './world-data'
import type { WorldEngine } from './world-engine'
import './world.css'

export function PortfolioWorld() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const engine = useRef<WorldEngine | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  const [mode, setMode] = useState<'explore' | 'play'>('explore')
  const [selected, setSelected] = useState<SectorId | null>(null)
  const [collected, setCollected] = useState<string[]>([])
  const [paused, setPaused] = useState(false)
  const sector = WORLD_SECTORS.find(item => item.id === selected)
  const complete = collected.length === WORLD_SECTORS.length

  useEffect(() => {
    let disposed = false
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const motionChanged = () => setPaused(motion.matches)
    motion.addEventListener('change', motionChanged)
    import('./world-engine').then(({ createWorldEngine }) => {
      if (disposed || !canvas.current) return
      try {
        engine.current = createWorldEngine(canvas.current, {
          onSelect: setSelected,
          onCollect: setCollected,
          onUnavailable: () => {
            engine.current?.dispose()
            engine.current = null
            setStatus('unavailable')
            setMode('explore')
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
      engine.current?.dispose()
      engine.current = null
      motion.removeEventListener('change', motionChanged)
    }
  }, [])

  function switchMode(next: 'explore' | 'play') {
    setMode(next)
    setCollected([])
    setSelected(null)
    engine.current?.setMode(next)
    if (next === 'play') canvas.current?.focus({ preventScroll: true })
  }

  function select(id: SectorId) {
    setSelected(id)
    engine.current?.select(id)
  }

  return (
    <div className="portfolio-world" data-mode={mode} data-ready={status === 'ready'}>
      <div className="world-toolbar">
        <div className="world-identity"><span className="world-status-dot" />the inner world<span className="world-version">yin / yang</span></div>
        <div className="world-mode" role="group" aria-label="World mode">
          <button type="button" aria-pressed={mode === 'explore'} onClick={() => switchMode('explore')}><Globe2 size={14} />Explore</button>
          <button type="button" aria-pressed={mode === 'play'} disabled={status !== 'ready'} onClick={() => switchMode('play')}><Gamepad2 size={15} />Play</button>
        </div>
      </div>

      <div className="world-viewport">
        <div className="world-atmosphere" aria-hidden="true" />
        {status !== 'ready' && (
          <div className="world-fallback" aria-hidden="true">
            <svg className="world-fallback-symbol" viewBox="0 0 100 100"><circle cx="50" cy="50" r="47" fill="#13131B" /><path d="M50 3a47 47 0 0 0 0 94 23.5 23.5 0 0 0 0-47 23.5 23.5 0 0 1 0-47" fill="#EDEDF0" /><circle cx="50" cy="26.5" r="6" fill="#EDEDF0" /><circle cx="50" cy="73.5" r="6" fill="#13131B" /><circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth=".5" /></svg>
          </div>
        )}
        <canvas ref={canvas} className="world-canvas" tabIndex={status === 'ready' ? 0 : -1}
          aria-label={mode === 'play' ? 'Yin and yang exploration game. Use arrow keys or W A S D to guide a spark to five reflections. Tab to reflection buttons for automatic navigation.' : '3D yin and yang symbol surrounded by Emotion, Energy, Vibration, Frequency, and Reality. Drag to rotate, or choose a reflection above.'}
          aria-describedby="world-instructions" />

        <div className="world-scene-caption" aria-hidden="true">
          <span>{mode === 'play' ? 'A journey toward balance' : 'Opposites. In conversation.'}</span>
          <span>{mode === 'play' ? `${collected.length} / ${WORLD_SECTORS.length} reflections` : 'Stillness meets motion'}</span>
        </div>

        {status === 'ready' && (
          <div className="world-view-controls">
            <button type="button" aria-label="Bounce the yin and yang" title="Bounce the yin and yang" onClick={() => engine.current?.pulse()}><Sparkles size={15} /></button>
            <button type="button" aria-label="Reset camera" title="Reset camera" onClick={() => engine.current?.resetView()}><RotateCcw size={15} /></button>
            <button type="button" aria-label={paused ? 'Resume ambient motion' : 'Pause ambient motion'} title={paused ? 'Resume ambient motion' : 'Pause ambient motion'} aria-pressed={paused}
              onClick={() => { engine.current?.setPaused(!paused); setPaused(!paused) }}>{paused ? <Play size={14} /> : <Pause size={14} />}</button>
          </div>
        )}

        {mode === 'play' && !complete && (
          <div className="world-dpad" role="group" aria-label="Spark direction controls">
            {[
              { key: 'ArrowUp', label: 'Move forward', Icon: ArrowUp },
              { key: 'ArrowLeft', label: 'Move left', Icon: ArrowLeft },
              { key: 'ArrowDown', label: 'Move backward', Icon: ArrowDown },
              { key: 'ArrowRight', label: 'Move right', Icon: ArrowRight },
            ].map(({ key, label, Icon }) => (
              <button key={key} type="button" aria-label={label} data-direction={key}
                onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); engine.current?.setDirection(key, true) }}
                onPointerUp={() => engine.current?.setDirection(key, false)}
                onPointerCancel={() => engine.current?.setDirection(key, false)}
                onLostPointerCapture={() => engine.current?.setDirection(key, false)}
                onKeyDown={event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); engine.current?.setDirection(key, true) } }}
                onKeyUp={() => engine.current?.setDirection(key, false)}
                onBlur={() => engine.current?.setDirection(key, false)}><Icon size={16} /></button>
            ))}
          </div>
        )}
      </div>

      <div className="world-sector-list" role="group" aria-label={mode === 'play' ? 'Journey through five reflections' : 'Emotion to reality: a personal philosophy'}>
        {WORLD_SECTORS.map(item => (
          <button type="button" key={item.id} aria-pressed={selected === item.id} onClick={() => select(item.id)}
            className={collected.includes(item.id) ? 'is-collected' : ''}>
            <span className="world-sector-indicator">{collected.includes(item.id) ? <Check size={12} /> : <span />}</span>
            {item.label}
            {item.id !== 'reality' && <ArrowRight className="world-path-arrow" size={12} aria-hidden="true" />}
          </button>
        ))}
      </div>

      <div className="world-detail" aria-live="polite" aria-atomic="true">
        {complete ? (
          <><div><span className="world-detail-label">{WORLD_SECTORS.length} / {WORLD_SECTORS.length} reflections discovered</span><h2>A moment of balance.</h2><p>Light and shadow, feeling and intention. Carry a little of that awareness into what you create next.</p></div>
            <div className="world-complete-actions"><Link href="/work">View my work <ArrowRight size={14} /></Link><button type="button" onClick={() => switchMode('play')}>Play again <RotateCcw size={13} /></button></div></>
        ) : sector ? (
          <><div><span className="world-detail-label">{mode === 'play' ? (collected.includes(sector.id) ? 'Reflection discovered' : 'Following the spark') : sector.label}</span><h2>{sector.title}</h2><p>{sector.description}</p></div><span className="world-detail-code" aria-hidden="true">{sector.symbol}/0{WORLD_SECTORS.length}</span></>
        ) : (
          <><div><span className="world-detail-label">{mode === 'play' ? 'Follow your curiosity' : 'Yin & yang'}</span><h2>{mode === 'play' ? 'Five reflections. Find your balance.' : 'A little light within the shadow.'}</h2><p>{mode === 'play' ? 'Guide the spark to each reflection, or choose a stage and let it lead you there. There is no clock to race.' : 'A little shadow within the light. For me, balance means making room for both feeling and intention.'}</p></div><span className="world-detail-code" aria-hidden="true">{'☯'}</span></>
        )}
      </div>
      <p id="world-instructions" className="world-instructions">
        {status === 'loading' ? 'Preparing your world…' : status === 'unavailable' ? '3D is unavailable in this browser. You can still explore each reflection above.' : mode === 'play' ? <><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or arrow keys when the world is focused</span><span>Tap a reflection to follow it</span></> : <><span>Drag to orbit</span><span>Tap yin & yang to bounce</span><span>Press Play to follow the spark.</span></>}
      </p>
    </div>
  )
}
