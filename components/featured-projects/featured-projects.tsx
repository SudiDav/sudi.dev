import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import './featured-projects.css'

export type FeaturedProject = {
  slug: string
  title: string
  blurb: string
  cover?: string
  tech: string[]
  year: string
  category?: string
}

/** The homepage's three featured projects, as plain cards linking into the Work page. */
export function FeaturedProjects({ projects }: { projects: FeaturedProject[] }) {
  return (
    <section className="featured-projects" aria-labelledby="featured-projects">
      <div className="featured-projects-heading">
        <div>
          <p className="featured-projects-kicker">Selected work</p>
          <h2 id="featured-projects">Featured Projects</h2>
        </div>
        <Link href="/work">View all →</Link>
      </div>
      <ol className="featured-projects-cards">
        {projects.map(project => (
          <li key={project.slug} className="featured-projects-card">
            <div className="featured-projects-cover">
              {project.cover && (
                <Image src={project.cover} alt="" width={768} height={432} sizes="(min-width: 900px) 33vw, 100vw" />
              )}
            </div>
            <div className="featured-projects-body">
              <p className="featured-projects-meta">{project.category ?? 'Project'} · {project.year}</p>
              <h3>{project.title}</h3>
              <p className="featured-projects-blurb">{project.blurb}</p>
              <ul className="featured-projects-tags" aria-label="Built with">
                {project.tech.slice(0, 3).map(tech => <li key={tech}>{tech}</li>)}
              </ul>
              <Link href={`/work#${project.slug}`} className="featured-projects-link">
                View project<span className="sr-only">: {project.title}</span>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
