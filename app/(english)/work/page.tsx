import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { PageIntro } from '@/components/page-intro'
import { FilterBar } from '@/components/filter-bar'
import { WorkProjectCard } from '@/components/work-project-card'
import { CompanyShowcase } from '@/components/company-showcase'
import { WORK_GUTTER } from '@/components/layout'
import { getProjects } from '@/lib/content'
import { filterProjects, PROJECT_FILTERS } from '@/lib/filters'
import type { SiteLocale } from '@/lib/locale'
import { localizedMetadata } from '@/lib/locale'
import '@/components/work-exhibition.css'

const DESCRIPTION = "A selection of projects I've built, contributed to, or am currently working on."
const DESCRIPTION_FR = 'Une sélection de projets que j’ai créés, auxquels j’ai contribué ou sur lesquels je travaille actuellement.'

export const metadata = localizedMetadata('en', '/work', 'Work | Sudi M. David', DESCRIPTION)

const CAREER_START = 2017

export default async function WorkPage({
  searchParams,
  locale = 'en',
}: {
  searchParams: Promise<{ category?: string }>
  locale?: SiteLocale
}) {
  const fr = locale === 'fr'
  const { category } = await searchParams
  const active = PROJECT_FILTERS.includes(category as (typeof PROJECT_FILTERS)[number])
    ? (category as string)
    : 'All'

  const allProjects = await getProjects(locale)
  const projects = filterProjects(allProjects, active)

  const years = new Date().getFullYear() - CAREER_START
  const domains = new Set(allProjects.map(project => project.category)).size

  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      <SiteHeader locale={locale} />

      <main className="mx-auto w-full max-w-[1440px] flex-1">
        <PageIntro
          compact
          segment={fr ? 'projets' : 'work'}
          title={fr ? 'Projets' : 'Work'}
          subtitle={fr ? DESCRIPTION_FR : DESCRIPTION}
        >
          <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-text-secondary">
            <span>{allProjects.length} {fr ? (allProjects.length === 1 ? 'projet' : 'projets') : (allProjects.length === 1 ? 'project' : 'projects')}</span>
            <span aria-hidden="true">·</span>
            <span>{years}+ {fr ? 'ans' : 'years'}</span>
            <span aria-hidden="true">·</span>
            <span>{domains} {fr ? (domains === 1 ? 'domaine' : 'domaines') : (domains === 1 ? 'domain' : 'domains')}</span>
          </p>
        </PageIntro>

        <section id="all-projects" aria-label={fr ? 'Galerie de projets' : 'Project gallery'} className={`scroll-mt-6 pb-14 ${WORK_GUTTER}`}>
          <FilterBar
            options={PROJECT_FILTERS}
            active={active}
            label={fr ? 'Filtrer les projets par catégorie' : 'Filter projects by category'}
            labels={fr ? { All: 'Tous', Fintech: 'Fintech', Platforms: 'Plateformes', 'Side Projects': 'Projets personnels' } : undefined}
            size="work"
          />

          {projects.length === 0 ? (
            <p className="py-12 text-sm text-text-secondary">
              {fr ? 'Aucun projet dans cette catégorie pour le moment.' : 'No projects in this category yet.'}
            </p>
          ) : (
            <div className="work-project-grid mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:gap-5">
              {projects.map(project => <WorkProjectCard key={project.slug} project={project} locale={locale} />)}
            </div>
          )}
        </section>

        <CompanyShowcase locale={locale} />
      </main>

      <SiteFooter locale={locale} />
    </div>
  )
}
