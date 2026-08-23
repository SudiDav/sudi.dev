import type { Metadata } from 'next'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { PageIntro } from '@/components/page-intro'
import { PAGE_GUTTER } from '@/components/layout'
import { getSettings } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Privacy | Sudi David',
  description: 'What this site collects, what it does not, and how to have it removed.',
}

/**
 * Written against what the site actually does rather than from a template.
 * Every claim below is checkable in the codebase:
 *
 *   newsletter  → subscribe() in app/admin/actions.ts, content/subscribers.json
 *   comments    → components/comment-form.tsx, content/comments.json
 *   no analytics → no tracking dependency in package.json
 *   self-hosted fonts → next/font/google inlines them at build time
 *
 * If any of those change, this page has to change with it.
 */
const UPDATED = '23 August 2026'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-[22px] font-semibold text-text-primary">{title}</h2>
      {children}
    </section>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[15px] leading-[1.7] text-text-secondary">{children}</p>
}

export default async function PrivacyPage() {
  const settings = await getSettings()

  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1440px] flex-1">
        <PageIntro
          segment="privacy"
          title="Privacy"
          subtitle="The short version: this site collects almost nothing, and what it does collect you hand over on purpose."
        />

        <div className={`flex max-w-[720px] flex-col gap-10 pb-20 ${PAGE_GUTTER}`}>
          <Section title="What I collect">
            <P>
              <strong className="text-text-primary">If you subscribe</strong> — your email address,
              and nothing else. It is stored with the site&apos;s own content, used to let me know
              you signed up and to send you new posts. No name, no profile, no tracking attached to
              it.
            </P>
            <P>
              <strong className="text-text-primary">If you comment</strong> — your name, your email
              address, and what you wrote. The name and the comment appear on the post once
              I&apos;ve approved it. Your email address is never published; it exists so I can
              reply to you.
            </P>
            <P>That is the whole list.</P>
          </Section>

          <Section title="What I don't collect">
            <P>
              No analytics, no tracking pixels, no advertising, no profiling. I genuinely do not
              know who visits this site or how many of you there are.
            </P>
            <P>
              No cookies are set for visitors. The only cookie this site issues is a sign-in
              session for me, on admin pages you cannot reach.
            </P>
            <P>
              Fonts are served from this site rather than fetched from Google, so opening a page
              here does not tell anyone else that you did.
            </P>
            <P>
              Searching the blog happens in your browser. The query goes into the address bar, not
              to a server.
            </P>
          </Section>

          <Section title="Who else touches it">
            <P>
              <strong className="text-text-primary">Resend</strong> delivers the notification email
              when someone subscribes, so a subscription address passes through them.
            </P>
            <P>
              <strong className="text-text-primary">The host</strong> keeps ordinary server logs —
              IP address, page requested, timestamp — as every web server does.
            </P>
            <P>Nothing is sold, and nothing is shared beyond those two.</P>
          </Section>

          <Section title="Having it removed">
            <P>
              Email{' '}
              <a
                href={`mailto:${settings.email}`}
                className="text-accent underline underline-offset-2"
              >
                {settings.email}
              </a>{' '}
              and ask. I will delete your subscription, your comment, or both. You do not need to
              give a reason, and I will not ask for one.
            </P>
          </Section>

          <Section title="Changes">
            <P>
              Last updated {UPDATED}. If what I collect ever changes, this page changes with it and
              that date moves.
            </P>
          </Section>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
