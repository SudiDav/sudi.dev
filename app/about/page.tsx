import type { Metadata } from 'next'
import Image from 'next/image'
import {
  MapPin,
  GraduationCap,
  Trophy,
  Languages,
  Boxes,
  Mail,
  Code2,
  Layout,
  Server,
  Container,
} from 'lucide-react'
import { OutboundLink } from '@/components/outbound-link'
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
  description: 'Full-stack engineer in Kigali building school management and fintech systems.',
}

/** Design: "Experience Section" → Timeline. Newest first. */
const TIMELINE = [
  {
    role: 'Full-Stack Engineer',
    period: 'Feb 2024 — Present',
    company: 'IST Africa · Kigali (Remote)',
    description:
      'Leading the redevelopment of a school management system for Danish schools, starting with the Absence module. Working across distributed teams spanning several regions.',
  },
  {
    role: 'Full-Stack Engineer',
    period: 'Feb 2021 — Jan 2024',
    company: 'Altech Group · Kigali (Hybrid)',
    description:
      'Managed a team of four and shipped a loan asset management system. Integrated Spark Energy and Omnivoltaic into the business process, and the Xero and Telerivet APIs to cut the finance team’s manual workload.',
  },
  {
    role: 'Full-Stack Engineer',
    period: 'Apr 2018 — Dec 2019',
    company: 'Fintech International · Kigali',
    description:
      'Built a reporting system for AB Bank on top of CHEQUEPOINT that cut user-side paperwork by 70%. Automated file generation into NCBA’s core banking system and replaced manual reconciliation with a balance-checking web service.',
  },
  {
    role: 'Full-Stack Engineer',
    period: 'Feb 2017 — Mar 2018',
    company: 'Fintech International · Kampala',
    description:
      'Connected local banks to the central bank through CHEQUEPOINT. Migrated a legacy banking system to MSSQL and ASP.NET, reducing user-facing errors by 85%.',
  },
]

/** Design: "Skills Section" → Skills Grid, four cards. */
const SKILLS = [
  { Icon: Code2, title: 'Languages', items: ['C#', 'TypeScript', 'JavaScript', 'SQL'] },
  {
    Icon: Server,
    title: 'Backend',
    items: ['.NET / ASP.NET Core', 'NestJS', 'Node.js', 'Entity Framework Core'],
  },
  { Icon: Layout, title: 'Frontend', items: ['React', 'Vue', 'Next.js', 'Tailwind'] },
  {
    Icon: Container,
    title: 'Data & Infra',
    items: ['SQL Server · PostgreSQL', 'MongoDB · RabbitMQ', 'Docker · Kubernetes', 'AWS · Cloudflare'],
  },
]

/**
 * Design: "Beyond Code" → Beyond Right, four cards.
 *
 * The design fills these with hobbies. They carry education, languages, an
 * award and current focus instead — the same card layout, but facts rather
 * than invented personal detail on a page that carries a real name and face.
 */
const INTERESTS = [
  {
    Icon: GraduationCap,
    title: 'Education',
    description:
      'BSc in Information Technology, Sikkim Manipal University (Kampala), 2013–2017. Graduated in the top 10% of my class.',
  },
  {
    Icon: Trophy,
    title: 'Facebook Developer Challenge, 2018',
    description:
      'Built JusticeBot — a chatbot that explains legal procedures in plain language and connects people to legal services for free.',
  },
  {
    Icon: Languages,
    title: 'Languages',
    description: 'Swahili and French natively, English at C2.',
  },
  {
    Icon: Boxes,
    title: 'Currently',
    description:
      'Microservices in .NET with RabbitMQ, Docker and Kubernetes — most recently an auction platform built to practise the patterns end to end.',
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
              I build the systems institutions run on.
            </h2>
            <p className="text-[15px] leading-[1.7] text-text-secondary">
              I&apos;m Sudi David — a full-stack engineer in Kigali. For eight years I&apos;ve
              worked on software that other people&apos;s work depends on: banking bridges,
              loan management, and now school administration. The kind of system where a bug is
              somebody&apos;s afternoon, not just a failed request.
            </p>
            <p className="text-[15px] leading-[1.7] text-text-secondary">
              Currently at IST Africa, rebuilding a school management platform for Danish schools.
              Before that I led a team at Altech Group on loan asset management, and spent two
              years at Fintech International connecting local banks to central bank
              infrastructure across Rwanda and Uganda.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-2 rounded-full bg-accent-dim px-3.5 py-2 font-mono text-xs font-medium text-accent">
                Available for work
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-2 text-xs text-text-secondary">
                <MapPin size={14} className="text-text-tertiary" />
                {settings.location}
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
              <SectionHeading label="BEYOND CODE" title="The Rest of It" />
            </div>
            <p className="text-[15px] leading-[1.7] text-text-secondary">
              Eight years of it, mostly in places where the software has to work the first time —
              banks, lenders, schools. Here is the rest of the picture.
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
              href={`mailto:${settings.email}`}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Mail size={16} />
              Get in Touch
            </a>

          </div>
          <div className="flex items-center gap-5">
            {socials.map(({ kind, label, Icon }) => (
              <OutboundLink
                key={label}
                href={socialUrl(kind, settings.social[kind] ?? '')}
                aria-label={label}
                className="flex size-10 items-center justify-center rounded-lg border border-border bg-bg-card text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary"
              >
                <Icon size={16} />
              </OutboundLink>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
