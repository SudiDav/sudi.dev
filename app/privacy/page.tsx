import type { Metadata } from 'next'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { PageIntro } from '@/components/page-intro'
import { PAGE_GUTTER } from '@/components/layout'
import { getSettings } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Privacy | Sudi M. David',
  description: 'What this site collects, what it does not, and how to have it removed.',
  alternates: { canonical: '/privacy' },
}

/**
 * Written against what the site actually does rather than from a template.
 * Every claim below is checkable in the codebase:
 *
 *   newsletter  → subscribe() in app/admin/actions.ts, Resend audience
 *   comments    → lib/comments, Neon Postgres
 *   no analytics → no tracking dependency in package.json
 *   self-hosted fonts → next/font/google inlines them at build time
 *
 * If any of those change, this page has to change with it.
 */
const UPDATED = '10 September 2026'

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
              and nothing else. It is held in my mailing list at Resend and used to tell me you
              signed up and to send you new posts. It is deliberately not stored in this
              site&apos;s repository, which is public. No name, no profile, no tracking attached to
              it.
            </P>
            <P>
              <strong className="text-text-primary">If you comment</strong> — the name, comment
              text, sign-in provider, and optional profile image shown beside it are stored in
              Neon. Google and GitHub readers publish immediately. Guests provide only a name and
              comment, without an email address, and their comments wait for review.
            </P>
            <P>That is the whole list.</P>
          </Section>

          <Section title="What I don't collect">
            <P>
              No advertising, no tracking pixels, no profiling, and nothing that follows you
              anywhere else.
            </P>
            <P>
              I do count page views, through Vercel Web Analytics. It sets no cookie and stores no
              personal data: visitors are identified by a hash of the request that resets every
              day, so the same person cannot be recognised tomorrow, or on any other site. What I
              see is aggregate — which pages get read, roughly where in the world from, which
              browsers. Never who.
            </P>
            <P>
              This site sets a session cookie only when you choose to sign in. It stores the
              minimum identity needed to recognise your Google or GitHub session; OAuth access
              tokens and commenter email addresses are not stored in the comments database.
            </P>
            <P>
              To slow automated posting, the server turns a signed-in account identifier or a
              guest request address into a keyed, non-reversible identifier. Raw IP addresses are
              not stored, and the identifier is used only for comment throttling.
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
              <strong className="text-text-primary">Resend</strong> holds the mailing list and
              delivers its email, so a subscription address lives with them.
            </P>
            <P>
              <strong className="text-text-primary">Neon</strong> stores comment text and the
              public identity details described above. If you choose social sign-in, Google or
              GitHub handles that authentication under its own terms. Simply reading comments
              does not load an embedded comment service.
            </P>
            <P>
              <strong className="text-text-primary">Vercel</strong> hosts the site, keeps ordinary
              server logs — IP address, page requested, timestamp — as every web server does, and
              runs the analytics described above.
            </P>
            <P>
              <strong className="text-text-primary">OpenStreetMap and CARTO</strong> serve the map
              tiles behind the location on the About page. Opening that map requests images from
              CARTO&apos;s servers; nothing about you is sent beyond what any image request
              carries, and the map is not loaded at all unless you ask for it.
            </P>
            <P>Nothing is sold, and nothing is shared beyond those.</P>
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
