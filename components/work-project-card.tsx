import { ArrowRight, ChevronDown } from 'lucide-react'
import { GithubIcon } from './brand-icons'
import { OutboundLink } from './outbound-link'
import { TechBadge } from './tech-badge'
import { ProjectFolio } from './project-folio'
import type { Project } from '@/lib/content.types'
import type { SiteLocale } from '@/lib/locale'

const projectLinkClass = 'inline-flex items-center gap-2 rounded-sm text-sm font-semibold text-[color:color-mix(in_srgb,var(--accent)_72%,var(--text-primary))] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent'

export function WorkProjectCard({ project, locale = 'en' }: { project: Project; locale?: SiteLocale }) {
  const { slug, title, year, category, cover, description, tech, links } = project
  const summary = project.shortDescription ?? description
  const fr = locale === 'fr'
  const categoryLabel = fr ? ({ Fintech: 'Fintech', Platforms: 'Plateformes', 'Side Projects': 'Projets personnels' }[category] ?? category) : category

  return (
    <article id={slug} className="work-project-card flex min-w-0 scroll-mt-6 flex-col">
      <div className="work-project-artwork">
        <ProjectFolio
          src={cover || undefined}
          alt=""
          title={title}
          presentation={project.coverPresentation}
          logo={project.logo}
          sizes="(min-width: 1440px) 403px, (min-width: 1280px) calc((100vw - 232px) / 3), (min-width: 1024px) calc((100vw - 160px) / 3), (min-width: 768px) calc((100vw - 80px) / 2), (min-width: 640px) calc((100vw - 48px) / 2), calc(100vw - 32px)"
        />
      </div>

      <div className="flex flex-1 flex-col gap-1.5 px-4 pb-4 pt-3">
        <h2 className="font-display text-lg leading-tight font-bold text-text-primary xl:text-xl">{title}</h2>
        <p className="text-sm leading-relaxed text-text-secondary">{summary}</p>

        <div className="mt-auto flex flex-wrap items-baseline gap-x-4 gap-y-2 pt-2">
          {links.live && (
            <OutboundLink href={links.live} aria-label={fr ? `Voir le projet : ${title} (s’ouvre dans un nouvel onglet)` : `View project: ${title} (opens in a new tab)`} className={projectLinkClass}>
              {fr ? 'Voir le projet' : 'View project'}
              <ArrowRight size={15} aria-hidden="true" />
            </OutboundLink>
          )}
          {links.github && (
            <OutboundLink href={links.github} aria-label={fr ? `Code source : ${title} (s’ouvre dans un nouvel onglet)` : `Source: ${title} (opens in a new tab)`} className={projectLinkClass}>
              <GithubIcon size={15} aria-hidden="true" />
              {fr ? 'Code source' : 'Source'}
            </OutboundLink>
          )}

          <details className="group open:basis-full">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-sm text-sm text-text-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
              {fr ? 'Détails du projet' : 'Project details'}
              <ChevronDown size={14} className="group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="mt-2.5 space-y-2.5 border-l border-border pl-3">
              <p className="font-mono text-xs text-text-secondary">{categoryLabel} · {year}</p>
              {summary !== description && <p className="text-sm leading-relaxed text-text-secondary">{description}</p>}
              {tech.length > 0 && (
                <ul className="flex flex-wrap gap-1.5" aria-label={fr ? 'Technologies utilisées' : 'Built with'}>
                  {tech.map(value => <li key={value}><TechBadge label={value} /></li>)}
                </ul>
              )}
            </div>
          </details>
        </div>
      </div>
    </article>
  )
}
