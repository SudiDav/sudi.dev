import type { Metadata } from 'next'
import { FolderCode, GitFork, Activity } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { PageIntro } from '@/components/page-intro'
import { FilterBar } from '@/components/filter-bar'
import { WorkProjectCard } from '@/components/work-project-card'
import { PAGE_GUTTER } from '@/components/layout'
import { getProjects } from '@/lib/content'
import { filterProjects, PROJECT_FILTERS } from '@/lib/filters'

export const metadata: Metadata = {
  title: 'Work | Sudi David',
  description: "A selection of projects I've built, contributed to, or am currently working on.",
}

/**
 * Design: Work Page → "Stats". These are the design's own figures, not counts
 * derived from the content — the frame reads 12 / 8 / 3 against six cards.
 */
const STATS = [
  { Icon: FolderCode, number: '12', label: 'Projects' },
  { Icon: GitFork, number: '8', label: 'Open Source' },
  { Icon: Activity, number: '3', label: 'Active' },
]

export default async function WorkPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams
  const active = PROJECT_FILTERS.includes(category as (typeof PROJECT_FILTERS)[number])
    ? (category as string)
    : 'All'

  const projects = filterProjects(await getProjects(), active)

  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1440px] flex-1">
        <PageIntro
          segment="work"
          title="Work"
          subtitle="A selection of projects I've built, contributed to, or am currently working on."
        >
          {/* Stats — ROW, padding-top 20, 1px dividers between each */}
          <div className="flex flex-wrap items-center pt-5">
            {STATS.map(({ Icon, number, label }, index) => (
              <div key={label} className="flex items-center">
                {index > 0 ? <span className="h-12 w-px bg-border" aria-hidden /> : null}
                <div className="flex flex-col items-center gap-2 px-7">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-accent-dim">
                    <Icon size={16} className="text-accent" />
                  </span>
                  <span className="font-mono text-[28px] font-bold text-text-primary">{number}</span>
                  <span className="text-xs font-medium text-text-tertiary">{label}</span>
                </div>
              </div>
            ))}
          </div>
        </PageIntro>

        {/* Filters — ROW, padding [0,120], gap 8 */}
        <div className={PAGE_GUTTER}>
          <FilterBar
            options={PROJECT_FILTERS}
            active={active}
            label="Filter projects by category"
            size="work"
          />
        </div>

        {/* Projects Section — COLUMN, padding [32,120,48,120], gap 20; rows of two */}
        <section className={`flex flex-col gap-5 pt-8 pb-12 ${PAGE_GUTTER}`}>
          {projects.length === 0 ? (
            <p className="py-12 text-sm text-text-secondary">
              No projects in this category yet.
            </p>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {projects.map((project) => (
                <WorkProjectCard key={project.slug} project={project} />
              ))}
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
