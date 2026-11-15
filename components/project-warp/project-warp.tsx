'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { activeStop, progressForStop, stopVisibility, warpTime } from '@/lib/project-warp'
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
}

/**
 * Featured projects as a flight through space: scrolling the section moves a
 * camera down a tunnel, each project materialises as a holographic portal, and
 * its story appears beside it. Without WebGL, or with reduced motion, the same
 * stops render as a plain list of cards.
 */
export function ProjectWarp({ projects }: { projects: WarpProject[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stopsRef = useRef<(HTMLLIElement | null)[]>([])
  const [mode, setMode] = useState<'pending' | 'warp' | 'static'>('pending')
  const [active, setActive] = useState(0)
  const count = projects.length

  useEffect(() => {
    const track = trackRef.current
    const canvas = canvasRef.current
    if (!track || !canvas) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    let disposed = false
    let cleanup = () => {}

    import('./warp-engine').then(({ createWarpEngine }) => {
      if (disposed) return
      if (reduce.matches) { setMode('static'); return }
      let engine: ReturnType<typeof createWarpEngine>
      try {
        const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#607EBC'
        engine = createWarpEngine(canvas, projects, accent, () => { cleanup(); setMode('static') })
      } catch {
        setMode('static')
        return
      }
      setMode('warp')
      let shown = -1
      let frame = 0
      function update() {
        frame = 0
        const rect = track!.getBoundingClientRect()
        const travel = rect.height - window.innerHeight
        const time = warpTime(travel > 0 ? -rect.top / travel : 0, count)
        engine.setTime(time)
        stopsRef.current.forEach((stop, index) => stop?.style.setProperty('--show', stopVisibility(time, index).toFixed(3)))
        const current = activeStop(time, count)
        if (current !== shown) { shown = current; setActive(current) }
      }
      const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
      const observer = new IntersectionObserver(([entry]) => engine.setVisible(entry.isIntersecting))
      observer.observe(track)
      window.addEventListener('scroll', onScroll, { passive: true })
      window.addEventListener('resize', onScroll)
      const leave = () => { cleanup(); setMode('static') }
      reduce.addEventListener('change', leave)
      update()
      const rect = track.getBoundingClientRect()
      const travel = rect.height - window.innerHeight
      engine.jump(warpTime(travel > 0 ? -rect.top / travel : 0, count))
      cleanup = () => {
        cancelAnimationFrame(frame)
        observer.disconnect()
        window.removeEventListener('scroll', onScroll)
        window.removeEventListener('resize', onScroll)
        reduce.removeEventListener('change', leave)
        engine.dispose()
        cleanup = () => {}
      }
    }).catch(() => { if (!disposed) setMode('static') })

    return () => { disposed = true; cleanup() }
  }, [projects, count])

  /** Fly the page to a stop: from the project rail, or when keyboard focus reaches its link. */
  function visit(index: number, smooth = false) {
    const track = trackRef.current
    if (mode !== 'warp' || !track) return
    const travel = track.offsetHeight - window.innerHeight
    const top = track.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top: top + progressForStop(index, count) * travel, behavior: smooth ? 'smooth' : 'auto' })
  }

  return (
    <section className="project-warp" data-mode={mode} aria-labelledby="featured-projects">
      <div className="project-warp-heading">
        <div>
          <p className="project-warp-kicker">Selected work · {String(count).padStart(2, '0')} stops</p>
          <h2 id="featured-projects">Featured Projects</h2>
        </div>
        <Link href="/work">View all →</Link>
      </div>
      <div ref={trackRef} className="project-warp-track" style={{ '--count': count } as React.CSSProperties}>
        <div className="project-warp-viewport">
          <canvas ref={canvasRef} className="project-warp-canvas" aria-hidden="true" />
          <ol className="project-warp-stops">
            {projects.map((project, index) => (
              <li
                key={project.slug}
                ref={node => { stopsRef.current[index] = node }}
                className="project-warp-stop"
                data-side={index % 2 === 0 ? 'left' : 'right'}
                aria-current={mode === 'warp' && active === index ? 'step' : undefined}
              >
                {project.cover && (
                  // eslint-disable-next-line @next/next/no-img-element -- already an optimised URL from getImageProps
                  <img className="project-warp-cover" src={project.cover} alt="" loading="lazy" decoding="async" />
                )}
                <span className="project-warp-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <p className="project-warp-meta">{project.category ?? 'Project'} · {project.year}</p>
                <h3>{project.title}</h3>
                <p className="project-warp-blurb">{project.blurb}</p>
                <ul className="project-warp-tags" aria-label="Built with">
                  {project.tech.slice(0, 3).map(tech => <li key={tech}>{tech}</li>)}
                </ul>
                <Link href={`/work#${project.slug}`} className="project-warp-cta" onFocus={() => visit(index)}>
                  View project<span className="sr-only">: {project.title}</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ol>
          <nav className="project-warp-rail" aria-label="Jump to a project">
            <p aria-hidden="true">Scroll to fly · or pick a project</p>
            <ol>
              {projects.map((project, index) => (
                <li key={project.slug}>
                  <button type="button" aria-current={active === index} onClick={() => visit(index, true)}>
                    <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                    <span className="project-warp-rail-name">{project.title}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </div>
    </section>
  )
}
