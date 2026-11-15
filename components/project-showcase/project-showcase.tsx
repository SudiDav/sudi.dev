'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { SHOWCASE_SLOTS } from '@/lib/project-showcase'
import './project-showcase.css'

export type ShowcaseProject = {
  slug: string
  title: string
  blurb: string
  /** An optimised cover URL (getImageProps), small enough for a GPU texture. */
  cover?: string
  tech: string[]
  year: string
  category?: string
}

type Engine = { setVisible(visible: boolean): void; highlight(index: number | null): void; dispose(): void }

/**
 * The homepage's featured projects: three monoliths built in Blender, each
 * holding a project's cover on a floating screen, crowned by the 3D S. The
 * cards below are the real content (server-rendered, keyboard reachable);
 * pointing at either a card or a monolith lights up its partner. Without
 * WebGL the stage folds away and the cards remain.
 */
export function ProjectShowcase({ projects }: { projects: ShowcaseProject[] }) {
  const featured = projects.slice(0, SHOWCASE_SLOTS)
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<Engine | null>(null)
  const [mode, setMode] = useState<'pending' | 'live' | 'static'>('pending')
  const [active, setActive] = useState<number | null>(null)
  const router = useRouter()
  const slugs = featured.map(project => project.slug).join()

  useEffect(() => {
    const section = sectionRef.current
    const canvas = canvasRef.current
    if (!section || !canvas) return
    let disposed = false
    let started = false
    let visible = false
    const covers = featured.map(project => project.cover)

    function start() {
      started = true
      import('./showcase-engine')
        .then(async ({ createShowcaseEngine, loadShowcase }) => {
          const gltf = await loadShowcase()
          if (disposed) return
          const engine = createShowcaseEngine(canvas!, gltf, {
            covers,
            onHover: setActive,
            onSelect: index => router.push(`/work#${featured[index].slug}`),
            onUnavailable: () => setMode('static'),
          })
          engineRef.current = engine
          engine.setVisible(visible)
          setMode('live')
        })
        .catch(() => { if (!disposed) setMode('static') })
    }

    // Load the model shortly before the section scrolls in...
    const preload = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started) start()
    }, { rootMargin: '300px 0px' })
    // ...but render only while the stage is actually on screen.
    const onScreen = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      engineRef.current?.setVisible(visible)
    })
    preload.observe(section)
    onScreen.observe(canvas)

    return () => {
      disposed = true
      preload.disconnect()
      onScreen.disconnect()
      engineRef.current?.dispose()
      engineRef.current = null
    }
    // `slugs` stands in for `featured`, which is a new array on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugs, router])

  function point(index: number | null) {
    setActive(index)
    engineRef.current?.highlight(index)
  }

  return (
    <section ref={sectionRef} className="project-showcase" data-mode={mode} aria-labelledby="featured-projects">
      <div className="project-showcase-heading">
        <div>
          <p className="project-showcase-kicker">Selected work · built in Blender</p>
          <h2 id="featured-projects">Featured Projects</h2>
        </div>
        <Link href="/work">View all →</Link>
      </div>
      <div className="project-showcase-stage">
        <canvas
          ref={canvasRef}
          className="project-showcase-canvas"
          role="img"
          aria-label={`Three glowing monoliths showing ${featured.map(p => p.title).join(', ')}, beneath a turning 3D S logo`}
        />
      </div>
      <ol className="project-showcase-cards">
        {featured.map((project, index) => (
          <li
            key={project.slug}
            className="project-showcase-card"
            data-active={active === index}
            onPointerEnter={() => point(index)}
            onPointerLeave={() => point(null)}
            onFocus={() => point(index)}
            onBlur={() => point(null)}
          >
            <span className="project-showcase-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <p className="project-showcase-meta">{project.category ?? 'Project'} · {project.year}</p>
            <h3>{project.title}</h3>
            <p className="project-showcase-blurb">{project.blurb}</p>
            <ul className="project-showcase-tags" aria-label="Built with">
              {project.tech.slice(0, 3).map(tech => <li key={tech}>{tech}</li>)}
            </ul>
            <Link href={`/work#${project.slug}`} className="project-showcase-link">
              View project<span className="sr-only">: {project.title}</span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}
