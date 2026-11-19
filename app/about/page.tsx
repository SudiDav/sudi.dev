import type { Metadata } from 'next'
import Image from 'next/image'
import {
  GraduationCap,
  Trophy,
  Languages,
  Boxes,
  Mail,
  Phone,
  Code2,
  Layout,
  Server,
  Container,
} from 'lucide-react'
import { LocationBadge } from '@/components/location-badge'
import { OutboundLink } from '@/components/outbound-link'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import {
  GithubIcon,
  TwitterIcon,
  LinkedinIcon,
  InstagramIcon,
} from '@/components/brand-icons'
import { PAGE_GUTTER } from '@/components/layout'
import { getSettings, socialUrl } from '@/lib/site'
import { CareerStepper } from '@/components/career-stepper/career-stepper'
import { PortraitRelief } from '@/components/portrait-relief'
import portraitReliefManifest from '@/components/portrait-relief-manifest.json'
import './about-room.css'

const aboutDescription = 'Sudi M. David explores the systems behind everyday life through software, philosophy, writing and 3D design from Lubumbashi.'

export const metadata: Metadata = {
  title: 'About | Sudi M. David',
  description: aboutDescription,
  alternates: { canonical: '/about' },
  openGraph: {
    type: 'website',
    url: '/about',
    title: 'About | Sudi M. David',
    description: aboutDescription,
  },
}

/** Design: "Experience Section" → Timeline. Newest first. */
const TIMELINE = [
  {
    role: 'Software Engineering Consultant & Entrepreneur',
    period: 'Apr 2026 — Present',
    company: 'Almafrica · Lubumbashi, DR Congo',
    description:
      'Building and consulting on the platform behind inclusive agricultural value chains, connecting smallholder farmers with buyers, financing and logistics. Developing containerized services with TypeScript, Node.js, PostgreSQL, Docker, C# and .NET.',
  },
  {
    role: 'Full-Stack Engineer',
    period: 'Feb 2024 — Apr 2026',
    company: 'IST Africa · Remote, Denmark',
    description:
      'Led the redevelopment of a school management system for Danish schools, starting with the Absence module. Worked across distributed teams spanning several regions.',
  },
  {
    role: 'Cloud, DevOps & Software Engineer',
    period: 'Feb 2021 — Jan 2024',
    company: 'Altech Group · Goma, DR Congo (Hybrid)',
    description:
      'Deployed and operated applications on AWS and DigitalOcean while leading a six-developer team that shipped a loan asset management system. Integrated Spark Energy and Omnivoltaic into business operations, and the Xero and Telerivet APIs to cut the finance team’s manual workload.',
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
    items: [
      'SQL Server · PostgreSQL',
      'MongoDB · RabbitMQ',
      'Docker · Kubernetes',
      'AWS · DigitalOcean',
      'Cloudflare · Coolify',
    ],
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
      'Building at Almafrica and consulting. Still writing microservices in my own time — most recently an auction platform, to work the patterns end to end rather than read about them.',
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
  const portraitSrc = settings.portrait || settings.avatar
  const portraitReliefReady = portraitSrc === portraitReliefManifest.source
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
        {/* Hero Section — ROW, padding [48,120], gap 56, centred */}
        <section className="about-portrait-studio" aria-label="Portrait studio">
          <div className="about-portrait-studio__copy">
            <h1 className="about-portrait-studio__title">About</h1>
            <h2 className="font-display text-[28px] leading-[1.3] font-bold">
              Explore the systems behind everything.
            </h2>
            <p className="text-[16px] leading-[1.65]">
              I’m Sudi. I build software, make things in 3D and write about technology and philosophy.
              I’m as curious about how a thought takes shape as I am about how a machine works.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-2 rounded-full bg-accent-dim px-3.5 py-2 font-mono text-xs font-medium text-accent">
                Available for work
              </span>
              <LocationBadge location={settings.location} />
            </div>
          </div>

          <figure className="about-portrait-studio__frame">
            <div className="about-portrait-studio__opening">
              {portraitReliefReady ? (
                <PortraitRelief
                  key={portraitSrc}
                  src={portraitSrc}
                  alt={settings.displayName}
                  expectedSourceSha256={portraitReliefManifest.sourceSha256}
                />
              ) : (
                <Image
                  src={portraitSrc}
                  alt={settings.displayName}
                  fill
                  sizes="(max-width: 1024px) 100vw, 340px"
                  className="about-portrait-studio__image"
                  priority
                />
              )}
            </div>
            <figcaption className="about-portrait-studio__caption">{settings.displayName}</figcaption>
          </figure>
        </section>

        <section aria-label="Biography" className={`flex flex-col gap-5 py-10 ${PAGE_GUTTER}`}>
          <div className="max-w-[70ch] space-y-4">
            <p className="text-[15px] leading-[1.7] text-text-secondary">
              Philosophy got there before software did. It taught me to ask what would have to
              be true for an explanation to hold. I still ask that question at work, especially
              when a payment looks fine in the logs and the person waiting for it tells a different story.
            </p>
            <p className="text-[15px] leading-[1.7] text-text-secondary">
              Some questions turn into essays. I’ve written about attention and about what we
              give someone when we give them our time. Others are easier to explore by making
              something. The little universe on my homepage is one of those experiments, built
              in Blender with Python.
            </p>
          </div>
        </section>

        <Divider />

        {/* Experience Section — COLUMN, padding [48,120], gap 32 */}
        <section className={`flex flex-col gap-8 py-12 ${PAGE_GUTTER}`}>
          <div className="flex flex-col gap-2">
            <SectionHeading label="EXPERIENCE" title="Where I've Worked" />
          </div>
          <CareerStepper steps={TIMELINE} />
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
                className="flex flex-col gap-4 rounded-2xl border border-border bg-bg-card p-6"
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
              I studied in Kampala, speak several languages, and once built a chatbot to explain
              legal procedures in everyday words. Each gave me a different way to think about
              who gets to understand a system.
            </p>
          </div>
          <div className="flex flex-1 flex-col gap-4">
            {INTERESTS.map(({ Icon, title, description }) => (
              <div
                key={title}
                className="flex gap-4 rounded-2xl border border-border bg-bg-card p-5"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-dim">
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
              className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Mail size={16} />
              Get in Touch
            </a>
            <a
              href={`tel:${settings.phone.replace(/[^+\d]/g, '')}`}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-card px-6 py-3 text-sm font-semibold text-text-primary transition-colors hover:border-border-hover"
            >
              <Phone size={16} />
              {settings.phone}
            </a>
          </div>
          <div className="flex items-center gap-5">
            {socials.map(({ kind, label, Icon }) => (
              <OutboundLink
                key={label}
                href={socialUrl(kind, settings.social[kind] ?? '')}
                aria-label={label}
                className="flex size-10 items-center justify-center rounded-full border border-border bg-bg-card text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary"
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
