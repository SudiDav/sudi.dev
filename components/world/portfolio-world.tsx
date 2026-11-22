'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import type { SiteLocale } from '@/lib/locale'
import { WORLD_SECTORS, type SectorId } from './world-data'
import type { WorldEngine } from './world-engine'
import './world.css'

const FRENCH_SECTORS: Record<SectorId, { label: string; description: string }> = {
  emotion: { label: 'Émotion', description: 'Accueillez ce que vous ressentez avant de le nommer. Il y a de la place pour la lumière comme pour l’ombre.' },
  energy: { label: 'Énergie', description: 'Laissez l’émotion devenir un mouvement, une conversation, une question ou un premier pas. Choisissez où porter votre attention.' },
  vibration: { label: 'Vibration', description: 'Certains moments invitent au calme. D’autres vous mettent en mouvement. Prenez le temps d’écouter les deux.' },
  frequency: { label: 'Fréquence', description: 'Ce que vous pratiquez devient familier. Revenez aux habitudes et aux intentions qui comptent pour vous.' },
  reality: { label: 'Réalité', description: 'Faites une place à la réflexion dans le quotidien. Un petit geste conscient suffit pour commencer.' },
}

export function PortfolioWorld({ locale = 'en' }: { locale?: SiteLocale } = {}) {
  const french = locale === 'fr'
  const sectors = french ? WORLD_SECTORS.map(item => ({ ...item, ...FRENCH_SECTORS[item.id] })) : WORLD_SECTORS
  const canvas = useRef<HTMLCanvasElement>(null)
  const engine = useRef<WorldEngine | null>(null)
  const labels = useRef(new Map<SectorId, HTMLButtonElement>())
  const leaders = useRef(new Map<SectorId, SVGLineElement>())
  const selfLabel = useRef<HTMLSpanElement>(null)
  const selfLeader = useRef<SVGLineElement>(null)
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  const [selected, setSelected] = useState<SectorId | null>(null)
  const [paused, setPaused] = useState(false)
  const motionLabel = paused
    ? (french ? 'Reprendre l’animation' : 'Resume ambient motion')
    : (french ? 'Mettre l’animation en pause' : 'Pause ambient motion')
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
    import('./world-engine').then(async ({ createWorldEngine, loadCosmos }) => {
      const cosmos = await loadCosmos()
      if (disposed || !canvas.current) return
      try {
        engine.current = createWorldEngine(canvas.current, cosmos, {
          onProject: (points, self) => {
            const width = canvas.current?.clientWidth ?? 0
            const height = canvas.current?.clientHeight ?? 0
            // "I am" hangs just beneath the S at the centre.
            const selfX = self.x * width
            const selfY = Math.min(height - 16, self.y * height + 30)
            selfLabel.current?.style.setProperty('left', `${selfX}px`)
            selfLabel.current?.style.setProperty('top', `${selfY}px`)
            selfLeader.current?.setAttribute('x1', String(selfX))
            selfLeader.current?.setAttribute('y1', String(self.y * height + 4))
            selfLeader.current?.setAttribute('x2', String(selfX))
            selfLeader.current?.setAttribute('y2', String(selfY - 10))
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
        <div className="world-room" aria-hidden="true">
          <picture>
            <source media="(max-width: 600px)" srcSet="/images/home-orbit-room-narrow.webp" />
            <Image
              src="/images/home-orbit-room-wide.webp"
              alt=""
              fill
              unoptimized
              sizes="(max-width: 600px) 100vw, 56vw"
              className="world-room-image"
              priority
            />
          </picture>
        </div>
        {status !== 'ready' && (
          <div className="world-fallback" aria-hidden="true">
            <picture>
              <source media="(max-width: 600px)" srcSet="/images/home-orbit-still-narrow.webp" />
              <Image
                src="/images/home-orbit-still-wide.webp"
                alt=""
                fill
                unoptimized
                sizes="(max-width: 899px) 100vw, (max-width: 1440px) 56vw, 750px"
                className="world-fallback-image"
              />
            </picture>
          </div>
        )}
        <canvas ref={canvas} className="world-canvas" tabIndex={status === 'ready' ? 0 : -1}
          aria-label={french
            ? 'Univers en 3D. Le yin et le yang surplombent le logo Sudi, entouré de cinq planètes au-dessus d’une galaxie spirale.'
            : '3D universe: a yin and yang symbol above the Sudi logo, labelled I am, among five planets over a spiral galaxy. Drag to rotate. Tap the symbol or press Space to bounce.'}
          aria-describedby="world-instructions" />
        {status === 'ready' && (
          <button className="world-motion-toggle" type="button" aria-label={motionLabel} title={motionLabel} aria-pressed={paused}
            onClick={() => { engine.current?.setPaused(!paused); setPaused(!paused) }}>{paused ? <Play size={14} /> : <Pause size={14} />}</button>
        )}
        <svg className="world-label-leaders" aria-hidden="true">
          {WORLD_SECTORS.map(item => <line key={item.id} ref={node => { if (node) leaders.current.set(item.id, node); else leaders.current.delete(item.id) }} />)}
          <line ref={selfLeader} />
        </svg>
        <span ref={selfLabel} className="world-self-label" aria-hidden="true">{french ? 'Je suis' : 'I am'}</span>
      <div className="world-sector-list" role="group" aria-label={french ? 'De l’émotion à la réalité, une philosophie personnelle' : 'Emotion to reality: a personal philosophy'}>
        {sectors.map(item => (
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
        {status === 'unavailable'
          ? (french ? 'Une image fixe du cosmos s’affiche lorsque la 3D est indisponible.' : 'A still render of the cosmos is shown because 3D is unavailable.')
          : (french
            ? 'Faites glisser pour tourner autour de l’univers. Touchez le yin et le yang ou appuyez sur Espace pour les faire rebondir. Survolez une planète ou sélectionnez son nom au clavier pour lire sa réflexion.'
            : 'Drag to orbit the universe. Tap yin and yang or press Space to bounce. Hover a planet to read its reflection, or focus a label with the keyboard.')}
      </p>
    </div>
  )
}
