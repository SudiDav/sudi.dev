import type { Metadata } from 'next'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { PageIntro } from '@/components/page-intro'
import { FilterBar } from '@/components/filter-bar'
import { WorkProjectCard } from '@/components/work-project-card'
import { CompanyShowcase } from '@/components/company-showcase'
import { WORK_GUTTER } from '@/components/layout'
import { getProjects } from '@/lib/content'
import { filterProjects, PROJECT_FILTERS } from '@/lib/filters'
import '@/components/work-exhibition.css'

export const metadata: Metadata = {
  title: 'Work | Sudi M. David',
  description: "A selection of projects I've built, contributed to, or am currently working on.",
  alternates: { canonical: '/work' },
  openGraph: {
    type: 'website',
    url: '/work',
    title: 'Work | Sudi M. David',
    description: "A selection of projects I've built, contributed to, or am currently working on.",
  },
}

const CAREER_START = 2017

export default async function WorkPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams
  const active = PROJECT_FILTERS.includes(category as (typeof PROJECT_FILTERS)[number])
    ? (category as string)
    : 'All'

  const allProjects = await getProjects()
  const projects = filterProjects(allProjects, active)

  const years = new Date().getFullYear() - CAREER_START
  const domains = new Set(allProjects.map(project => project.category)).size

  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1440px] flex-1">
        <PageIntro
          compact
          segment="work"
          title="Work"
          subtitle="A selection of projects I've built, contributed to, or am currently working on."
        >
          <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-text-secondary">
            <span>{allProjects.length} {allProjects.length === 1 ? 'project' : 'projects'}</span>
            <span aria-hidden="true">·</span>
            <span>{years}+ years</span>
            <span aria-hidden="true">·</span>
            <span>{domains} {domains === 1 ? 'domain' : 'domains'}</span>
          </p>
        </PageIntro>

        <section id="all-projects" aria-label="Project gallery" className={`scroll-mt-6 pb-14 ${WORK_GUTTER}`}>
          <FilterBar
            options={PROJECT_FILTERS}
            active={active}
            label="Filter projects by category"
            size="work"
          />

          {projects.length === 0 ? (
            <p className="py-12 text-sm text-text-secondary">
              No projects in this category yet.
            </p>
          ) : (
            <div className="work-project-grid mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:gap-5">
              {projects.map(project => <WorkProjectCard key={project.slug} project={project} />)}
            </div>
          )}
        </section>

        <CompanyShowcase />
      </main>

      <SiteFooter />
    </div>
  )
}
