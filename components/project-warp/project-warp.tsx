'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { OutboundLink } from '@/components/outbound-link'
import { activeStop, stepStop, stopVisibility, swipeStep } from '@/lib/project-warp'
import './project-warp.css'

export type WarpProject = {
  slug: string
  title: string
  blurb: string
  /** An optimised cover URL (getImageProps), small enough for a GPU texture. */
  cover?: string
  tech: string[]
  year: string
  category?: string
  links: { live?: string; github?: string }
}

/**
 * The Work page's flight through space. It sits in the page like any other
 * section and scrolls with it; picking a project on the rail flies the camera
 * to that project's holographic portal, and its story fades in beside it. The
 * arrow keys (while the tour is on screen) and a sideways swipe step along it.
 * While it runs it is the page's only project list (the plain list below is
 * hidden by CSS). Without WebGL, or with reduced motion, the warp steps aside
 * and the plain list takes its place.
 */
export function ProjectWarp({ projects }: { projects: WarpProject[] }) {
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stopsRef = useRef<(HTMLLIElement | null)[]>([])
  const engineRef = useRef<{ setTime: (time: number) => void } | null>(null)
  const [mode, setMode] = useState<'pending' | 'warp' | 'static'>('pending')
  /** The picked project (the rail), and the one the camera is nearest (the story). */
  const [picked, setPicked] = useState(0)
  const pickedRef = useRef(0)
  const [shown, setShown] = useState(0)
  const count = projects.length

  useEffect(() => {
    const section = sectionRef.current
    const canvas = canvasRef.current
    if (!section || !canvas) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    let disposed = false
    let cleanup = () => {}

    // Fade each story in step with the camera, wherever the flight is.
    let nearest = -1
    function onTime(time: number) {
      stopsRef.current.forEach((stop, index) => stop?.style.setProperty('--show', stopVisibility(time, index).toFixed(3)))
      const current = activeStop(time, count)
      if (current !== nearest) { nearest = current; setShown(current) }
    }

    // Decide before downloading three.js, so reduced motion never waits on it.
    const load = reduce.matches ? Promise.reject(new Error('reduced motion')) : import('./warp-engine')
    load.then(({ createWarpEngine }) => {
      if (disposed) return
      let engine: ReturnType<typeof createWarpEngine>
      try {
        const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#607EBC'
        engine = createWarpEngine(canvas, projects, accent, () => { cleanup(); setMode('static') }, onTime)
      } catch {
        setMode('static')
        return
      }
      setMode('warp')
      // /work#slug (from the home page) opens on that project.
      const found = projects.findIndex(project => `#${project.slug}` === window.location.hash)
      const start = Math.max(0, found)
      engine.jump(start)
      pickedRef.current = start
      setPicked(start)
      // The browser may have scrolled to that project's card in the plain list, which is now hidden.
      if (found >= 0) section.scrollIntoView()
      engineRef.current = engine
      const observer = new IntersectionObserver(entries => engine.setVisible(entries[entries.length - 1].isIntersecting))
      observer.observe(section)
      const step = (delta: number) => {
        const index = stepStop(pickedRef.current, delta, count)
        pickedRef.current = index
        setPicked(index)
        engine.setTime(index)
        // Focus inside the tour (a story's link or a rail dot) follows to the picked project's
        // dot, so it never stays on a story that has faded out.
        if (section.contains(document.activeElement)) {
          section.querySelectorAll<HTMLButtonElement>('.project-warp-rail button')[index]?.focus({ preventScroll: true })
        }
      }
      // The arrow keys belong to the tour only while most of it is on screen (or, in a very
      // short window, while it fills most of the screen).
      const track = canvas.parentElement!
      const onScreen = () => {
        const box = track.getBoundingClientRect()
        const shown = Math.min(box.bottom, window.innerHeight) - Math.max(box.top, 0)
        return shown >= 0.5 * Math.min(box.height, window.innerHeight)
      }
      const onKey = (event: KeyboardEvent) => {
        const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
        if (!delta || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
        if ((event.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable]') || !onScreen()) return
        event.preventDefault()
        step(delta)
      }
      let touch: { x: number; y: number } | null = null
      const onTouchStart = (event: TouchEvent) => {
        touch = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null
      }
      const onTouchEnd = (event: TouchEvent) => {
        const end = event.changedTouches[0]
        if (touch && end) {
          const delta = swipeStep(end.clientX - touch.x, end.clientY - touch.y)
          if (delta) step(delta)
        }
        touch = null
      }
      window.addEventListener('keydown', onKey)
      track.addEventListener('touchstart', onTouchStart, { passive: true })
      track.addEventListener('touchend', onTouchEnd, { passive: true })
      const leave = () => { cleanup(); setMode('static') }
      reduce.addEventListener('change', leave)
      cleanup = () => {
        observer.disconnect()
        window.removeEventListener('keydown', onKey)
        track.removeEventListener('touchstart', onTouchStart)
        track.removeEventListener('touchend', onTouchEnd)
        reduce.removeEventListener('change', leave)
        engine.dispose()
        engineRef.current = null
        cleanup = () => {}
      }
    }).catch(() => { if (!disposed) setMode('static') })

    return () => { disposed = true; cleanup() }
  }, [projects, count])

  // When the plain list takes over, it was hidden at load, so the browser could
  // not scroll to /work#slug itself.
  useEffect(() => {
    if (mode === 'static' && window.location.hash) document.getElementById(window.location.hash.slice(1))?.scrollIntoView()
  }, [mode])

  /** Fly to a project: from the rail, or when keyboard focus reaches its links. */
  function visit(index: number) {
    pickedRef.current = index
    setPicked(index)
    engineRef.current?.setTime(index)
  }

  return (
    <section ref={sectionRef} className="project-warp" data-mode={mode} aria-labelledby="project-warp-title">
      <div className="project-warp-heading">
        <div>
          <p className="project-warp-kicker">Warp tour · {String(count).padStart(2, '0')} stops</p>
          <h2 id="project-warp-title">Fly through the work</h2>
        </div>
      </div>
      <div className="project-warp-track">
        <div className="project-warp-viewport">
          <canvas ref={canvasRef} className="project-warp-canvas" aria-hidden="true" />
          <ol className="project-warp-stops">
            {projects.map((project, index) => (
              <li
                key={project.slug}
                ref={node => { stopsRef.current[index] = node }}
                className="project-warp-stop"
                data-side={index % 2 === 0 ? 'left' : 'right'}
                aria-current={mode === 'warp' && shown === index ? 'step' : undefined}
              >
                <span className="project-warp-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <p className="project-warp-meta">{project.category ?? 'Project'} · {project.year}</p>
                <h3>{project.title}</h3>
                <p className="project-warp-blurb">{project.blurb}</p>
                <ul className="project-warp-tags" aria-label="Built with">
                  {project.tech.slice(0, 3).map(tech => <li key={tech}>{tech}</li>)}
                </ul>
                {(project.links.live || project.links.github) && (
                  <div className="project-warp-actions">
                    {project.links.live && (
                      <OutboundLink href={project.links.live} className="project-warp-cta" onFocus={() => visit(index)}>
                        View project<span className="sr-only">: {project.title} (opens in a new tab)</span>
                        <ArrowRight size={16} aria-hidden="true" />
                      </OutboundLink>
                    )}
                    {project.links.github && (
                      <OutboundLink href={project.links.github} className="project-warp-source" onFocus={() => visit(index)}>
                        Source<span className="sr-only">: {project.title} (opens in a new tab)</span>
                      </OutboundLink>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ol>
          {/* A stepper through the work, newest first: the dots up to the picked project are lit. */}
          <nav className="project-warp-rail" aria-label="Pick a project">
            <ol>
              {projects.map((project, index) => (
                <li key={project.slug} data-reached={index <= picked ? '' : undefined} data-passed={index < picked ? '' : undefined}>
                  <button
                    type="button"
                    aria-current={picked === index}
                    aria-label={`${String(index + 1).padStart(2, '0')}: ${project.title}, ${project.year}`}
                    title={project.title}
                    onClick={() => visit(index)}
                  >
                    <span className="project-warp-rail-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                    <span className="project-warp-rail-dot" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </div>
      {/* The rail is the way in for screen readers; this hint is for keyboard and touch. */}
      <p className="project-warp-hint" aria-hidden="true">
        <span className="project-warp-hint-keys"><kbd>←</kbd> <kbd>→</kbd> to move between projects</span>
        <span className="project-warp-hint-touch">Swipe to move between projects</span>
      </p>
    </section>
  )
}
