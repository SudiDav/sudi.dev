import { PAGE_GUTTER } from './layout'

/**
 * Design: "Page Intro" on the Work / Blog / About frames — COLUMN,
 * padding [64,120,48,120], gap 16.
 *
 * The breadcrumb is a ROW gap 12 of three Geist Mono 12 nodes: a `~` and a `/`
 * in $text-tertiary, then the current segment in $accent.
 */
export function PageIntro({
  segment,
  title,
  subtitle,
  children,
}: {
  segment: string
  title: string
  subtitle?: string
  children?: React.ReactNode
}) {
  return (
    <section className={`flex flex-col gap-4 pt-16 pb-12 ${PAGE_GUTTER}`}>
      <div className="flex items-center gap-3 font-mono text-xs">
        <span className="text-text-tertiary">~</span>
        <span className="text-text-tertiary">/</span>
        <span className="text-accent">{segment}</span>
      </div>

      <h1 className="font-display text-3xl font-bold text-text-primary lg:text-[40px]">{title}</h1>

      {subtitle ? (
        <p className="max-w-[600px] text-base leading-[1.5] text-text-secondary">{subtitle}</p>
      ) : null}

      {children}
    </section>
  )
}
