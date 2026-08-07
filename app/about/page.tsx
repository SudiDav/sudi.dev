import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  MapPin,
  Mountain,
  BookOpen,
  Camera,
  Music,
  Mail,
  Calendar,
  Code2,
  Layout,
  Server,
  Container,
} from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { PageIntro } from '@/components/page-intro'
import {
  GithubIcon,
  TwitterIcon,
  LinkedinIcon,
  InstagramIcon,
} from '@/components/brand-icons'
import { PAGE_GUTTER } from '@/components/layout'
import { getSettings, socialUrl } from '@/lib/site'

export const metadata: Metadata = {
  title: 'About | Sudi David',
  description: "I build tools that make developers' lives easier.",
}

/** Design: "Experience Section" → Timeline. Newest first. */
const TIMELINE = [
  {
    role: 'Founder & Lead Developer',
    period: '2024 — Present',
    company: 'Nexus Tools',
    description:
      'Building open-source developer tools including Nexus CLI, Syncboard, and Datapipe. Focused on Rust, WebAssembly, and real-time collaboration.',
  },
  {
    role: 'Senior Infrastructure Engineer',
    period: '2021 — 2024',
    company: 'Vercel',
    description:
      'Scaled edge infrastructure to handle 30B+ requests/month. Led the migration from legacy deployment pipeline to a new Kubernetes-based architecture.',
  },
  {
    role: 'Software Engineer',
    period: '2019 — 2021',
    company: 'Stripe',
    description:
      'Built internal developer tools for the payments team. Designed and shipped a real-time monitoring dashboard used by 200+ engineers daily.',
  },
  {
    role: 'Junior Developer',
    period: '2018 — 2019',
    company: 'Freelance',
    description:
      'Built web applications for startups and small businesses. Focused on React, Node.js, and PostgreSQL.',
  },
]

/** Design: "Skills Section" → Skills Grid, four cards. */
const SKILLS = [
  { Icon: Code2, title: 'Languages', items: ['Rust', 'TypeScript', 'Go', 'Python'] },
  { Icon: Layout, title: 'Frontend', items: ['React', 'Next.js', 'Svelte', 'Tailwind'] },
  { Icon: Server, title: 'Backend', items: ['Node.js', 'PostgreSQL', 'Redis', 'Kafka'] },
  {
    Icon: Container,
    title: 'DevOps',
    items: ['Docker', 'Kubernetes', 'Terraform', 'GitHub Actions'],
  },
]

/** Design: "Beyond Code" → Beyond Right, four cards. */
const INTERESTS = [
  {
    Icon: Mountain,
    title: 'Trail Running',
    description: '50K ultramarathon finisher. I think best when moving.',
  },
  {
    Icon: BookOpen,
    title: 'Reading',
    description:
      'Science fiction and systems thinking. Currently reading Designing Data-Intensive Applications.',
  },
  {
    Icon: Camera,
    title: 'Photography',
    description: 'Street photography on film. Shooting on a Leica M6 with Portra 400.',
  },
  {
    Icon: Music,
    title: 'Music',
    description: 'Amateur jazz pianist. Practicing standards and exploring improvisation.',
  },
]

/** Design: three separate "Divider Wrap" frames sit between the sections. */
function Divider() {
  return (
    <div className={PAGE_GUTTER}>
      <hr className="border-0 border-t border-border" />
    </div>
  )
}

function SectionHeading({ label, title }: { label: string; title: string }) {
  return (
    <>
      <h2 className="font-mono text-[11px] font-semibold tracking-[1.5px] text-text-tertiary">
        {label}
      </h2>
      <p className="font-display text-[28px] font-bold text-text-primary">{title}</p>
    </>
  )
}

export default async function AboutPage() {
  const settings = await getSettings()
  const socials = (
    [
      { kind: 'github' as const, label: 'GitHub', Icon: GithubIcon },
      { kind: 'twitter' as const, label: 'X', Icon: TwitterIcon },
      { kind: 'linkedin' as const, label: 'LinkedIn', Icon: LinkedinIcon },
      { kind: 'instagram' as const, label: 'Instagram', Icon: InstagramIcon },
    ] as const
  ).filter(({ kind }) => Boolean(settings.social[kind]))

  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1440px] flex-1">
        <PageIntro segment="about" title="About" />

        {/* Hero Section — ROW, padding [48,120], gap 56, centred */}
        <section className={`flex flex-col items-center gap-14 py-12 lg:flex-row ${PAGE_GUTTER}`}>
          <div className="relative h-[420px] w-full shrink-0 overflow-hidden rounded-xl border border-border bg-bg-elevated lg:w-[340px]">
            <Image
              src={settings.portrait ?? settings.avatar}
              alt={settings.displayName}
              fill
              sizes="(max-width: 1024px) 100vw, 340px"
              className="object-cover"
              priority
            />
          </div>

          <div className="flex flex-1 flex-col gap-6">
            <h2 className="font-display text-[28px] leading-[1.3] font-bold text-text-primary">
              I build tools that make developers&apos; lives easier.
            </h2>
            <p className="text-[15px] leading-[1.7] text-text-secondary">
              I&apos;m Sudi David — a full-stack developer based in San Francisco with a deep
              interest in developer experience, performance engineering, and open source. I&apos;ve
              spent the last 8 years building products at the intersection of infrastructure and
              developer tooling.
            </p>
            <p className="text-[15px] leading-[1.7] text-text-secondary">
              Currently, I&apos;m focused on building Nexus CLI and contributing to the Rust
              ecosystem. Previously, I helped scale infrastructure at Vercel and built internal
              tooling at Stripe.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-2 rounded-full bg-accent-dim px-3.5 py-2 font-mono text-xs font-medium text-accent">
                Available for work
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-2 text-xs text-text-secondary">
                <MapPin size={14} className="text-text-tertiary" />
                San Francisco, CA
              </span>
            </div>
          </div>
        </section>

        <Divider />

        {/* Experience Section — COLUMN, padding [48,120], gap 32 */}
        <section className={`flex flex-col gap-8 py-12 ${PAGE_GUTTER}`}>
          <div className="flex flex-col gap-2">
            <SectionHeading label="EXPERIENCE" title="Where I've Worked" />
          </div>
          <ol className="flex flex-col">
            {TIMELINE.map((entry, index) => (
              <li key={entry.company} className="flex gap-6">
                <div className="flex w-6 flex-col items-center">
                  <span
                    className={`mt-1.5 size-3 shrink-0 rounded-full border ${
                      index === 0 ? 'border-accent bg-accent' : 'border-border bg-bg-card'
                    }`}
                  />
                  {index < TIMELINE.length - 1 ? (
                    <span className="w-px flex-1 bg-border" aria-hidden />
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col gap-2 pb-8">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-display text-base font-semibold text-text-primary">
                      {entry.role}
                    </h3>
                    <span className="font-mono text-xs text-text-tertiary">{entry.period}</span>
                  </div>
                  <p className="text-sm font-semibold text-accent">{entry.company}</p>
                  <p className="text-sm leading-[1.6] text-text-secondary">{entry.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <Divider />

        {/* Skills Section — COLUMN, padding [48,120], gap 32 */}
        <section className={`flex flex-col gap-8 py-12 ${PAGE_GUTTER}`}>
          <div className="flex flex-col gap-2">
            <SectionHeading label="EXPERTISE" title="Skills & Technologies" />
          </div>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {SKILLS.map(({ Icon, title, items }) => (
              <div
                key={title}
                className="flex flex-col gap-4 rounded-lg border border-border bg-bg-card p-6"
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={18} className="text-accent" />
                  <h3 className="font-display text-[15px] font-semibold text-text-primary">
                    {title}
                  </h3>
                </div>
                <ul className="flex flex-col gap-2.5">
                  {items.map((item) => (
                    <li key={item} className="text-[13px] text-text-secondary">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <Divider />

        {/* Beyond Code — ROW, padding [48,120], gap 56 */}
        <section className={`flex flex-col gap-14 py-12 lg:flex-row ${PAGE_GUTTER}`}>
          <div className="flex flex-1 flex-col gap-6">
            <div className="flex flex-col gap-2">
              <SectionHeading label="BEYOND CODE" title="When I'm Not Coding" />
            </div>
            <p className="text-[15px] leading-[1.7] text-text-secondary">
              I believe great software comes from well-rounded thinking. Outside of work, I explore
              other creative and physical outlets that keep me energized and inspired.
            </p>
          </div>
          <div className="flex flex-1 flex-col gap-4">
            {INTERESTS.map(({ Icon, title, description }) => (
              <div
                key={title}
                className="flex gap-4 rounded-lg border border-border bg-bg-card p-5"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-dim">
                  <Icon size={18} className="text-accent" />
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="font-display text-sm font-semibold text-text-primary">{title}</h3>
                  <p className="text-[13px] leading-[1.5] text-text-secondary">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Connect Section — COLUMN, padding [56,120], gap 24, centred, $bg-secondary */}
        <section
          className={`flex flex-col items-center gap-6 bg-bg-secondary py-14 text-center ${PAGE_GUTTER}`}
        >
          <h2 className="font-mono text-[11px] font-semibold tracking-[1.5px] text-accent">
            LET&apos;S CONNECT
          </h2>
          <p className="font-display text-[32px] font-bold text-text-primary">
            Interested in working together?
          </p>
          <p className="text-[15px] leading-[1.5] text-text-secondary">
            I&apos;m always open to new opportunities, collaborations, and interesting
            conversations.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="mailto:sudi@sudidavid.dev"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Mail size={16} />
              Get in Touch
            </a>
            <a
              href="https://cal.com/sudidavid"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-medium text-text-primary transition-colors hover:border-border-hover"
            >
              <Calendar size={16} />
              Schedule a Call
            </a>
          </div>
          <div className="flex items-center gap-5">
            {socials.map(({ kind, label, Icon }) => (
              <Link
                key={label}
                href={socialUrl(kind, settings.social[kind] ?? '')}
                aria-label={label}
                className="flex size-10 items-center justify-center rounded-lg border border-border bg-bg-card text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary"
              >
                <Icon size={16} />
              </Link>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
