import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { PageIntro } from '@/components/page-intro'
import { PAGE_GUTTER } from '@/components/layout'
import { getSettings } from '@/lib/site'
import type { SiteLocale } from '@/lib/locale'
import { localizedMetadata } from '@/lib/locale'
import './privacy-room.css'

const DESCRIPTION = 'What this site collects, what it does not, and how to have it removed.'
const DESCRIPTION_FR = 'Ce que ce site collecte, ce qu’il ne collecte pas et comment demander la suppression de vos données.'

export const metadata = localizedMetadata('en', '/privacy', 'Privacy | Sudi M. David', DESCRIPTION)

/**
 * Written against what the site actually does rather than from a template.
 * Every claim below is checkable in the codebase:
 *
 *   newsletter  → subscribe() in app/admin/actions.ts, Resend audience
 *   comments    → GitHub Discussions via giscus
 *   analytics   → components/site-analytics.tsx, selected by hosting provider
 *   self-hosted fonts → next/font/google inlines them at build time
 *
 * If any of those change, this page has to change with it.
 */
const UPDATED = '30 October 2026'
const UPDATED_FR = '30 octobre 2026'

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

export default async function PrivacyPage({ locale = 'en' }: { locale?: SiteLocale } = {}) {
  const fr = locale === 'fr'
  const settings = await getSettings()
  const cloudflare = process.env.HOSTING_PROVIDER === 'cloudflare'

  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      <SiteHeader locale={locale} />

      <main className="mx-auto w-full max-w-[1440px] flex-1">
        <PageIntro
          segment={fr ? 'confidentialité' : 'privacy'}
          title={fr ? 'Confidentialité' : 'Privacy'}
          subtitle={fr ? DESCRIPTION_FR : 'The short version: this site collects almost nothing, and what it does collect you hand over on purpose.'}
        />

        <div className={`privacy-reading-room ${PAGE_GUTTER}`}>
          <aside className="privacy-reading-room__margin" aria-label={fr ? 'Détails du document' : 'Document details'}>
            <span>{fr ? 'NOTES' : 'FIELD NOTES'}</span>
            <span>{fr ? 'CONFIDENTIALITÉ' : 'PRIVACY'}</span>
            <span>{fr ? 'MIS À JOUR · ' + UPDATED_FR : 'UPDATED · ' + UPDATED}</span>
          </aside>
          <div className="privacy-reading-room__paper flex max-w-[720px] flex-col gap-10 pb-20">
          <Section title={fr ? 'Ce que je collecte' : 'What I collect'}>
            <P>
              <strong className="text-text-primary">{fr ? 'Si vous vous abonnez' : 'If you subscribe'}</strong> — {fr ? 'votre adresse e-mail, et rien d’autre. Elle est conservée dans ma liste de diffusion chez Resend et sert à confirmer votre inscription et à vous envoyer les nouveaux articles. Elle n’est volontairement pas stockée dans le dépôt de ce site, qui est public. Aucun nom, profil ou suivi ne lui est associé.' : <>your email address, and nothing else. It is held in my mailing list at Resend and used to tell me you signed up and to send you new posts. It is deliberately not stored in this site&apos;s repository, which is public. No name, no profile, no tracking attached to it.</>}
            </P>
            <P>
              <strong className="text-text-primary">{fr ? 'Si vous commentez' : 'If you comment'}</strong> — {fr ? 'rien ne m’est transmis directement. Les commentaires utilisent GitHub Discussions : vous vous connectez avec votre compte GitHub et votre commentaire est publié dans le dépôt de ce site sous votre nom d’utilisateur GitHub. Je ne vois jamais votre adresse e-mail et je n’ai rien à stocker.' : <>nothing reaches me directly. Comments run on GitHub Discussions, so you sign in with your GitHub account and your comment lives in this site&apos;s repository, publicly, under your GitHub username. I never see your email address, and there is nothing for me to store.</>}
            </P>
            <P>{fr ? 'C’est toute la liste.' : 'That is the whole list.'}</P>
          </Section>

          <Section title={fr ? 'Ce que je ne collecte pas' : "What I don't collect"}>
            <P>
              {fr ? 'Pas de publicité, de pixels de suivi ni de profilage, et rien qui vous suive sur d’autres sites.' : 'No advertising, no tracking pixels, no profiling, and nothing that follows you anywhere else.'}
            </P>
            <P>
              {cloudflare ? (
                <>{fr ? 'Cloudflare Web Analytics comptabilise les chargements des pages publiques sans cookies ni suivi individuel entre les sites. Les aperçus locaux et les pages d’administration sont exclus. Le suivi automatique de la navigation dans une page est désactivé. Je consulte des statistiques globales plutôt que des profils individuels.' : <>Cloudflare Web Analytics counts public page loads without cookies or tracking
                  individual visitors across sites. Local previews and admin page loads are
                  excluded. Automatic tracking of navigation within a page is disabled. I see
                  aggregate statistics rather than individual visitor profiles.</>}</>
              ) : (
                <>{fr ? 'Je mesure les pages consultées avec Vercel Web Analytics. Aucun cookie n’est créé ; l’identification des visiteurs est réinitialisée chaque jour. Je consulte des statistiques globales sur les pages et les navigateurs, pas des profils individuels.' : <>I count page views through Vercel Web Analytics. It sets no cookie; visitor
                  identification resets daily. I see aggregate statistics about pages and
                  browsers rather than individual visitor profiles.</>}</>
              )}
            </P>
            <P>
              {fr ? 'Ce site ne crée aucun cookie pour ses visiteurs. Le seul cookie qu’il émet est une session de connexion réservée à l’administration, inaccessible aux visiteurs. Si vous vous connectez pour commenter, il s’agit de la session de GitHub, régie par les conditions de GitHub.' : <>This site sets no cookies for visitors. The only cookie it issues is a sign-in
              session for me, on admin pages you cannot reach. If you sign in to comment, that is
              GitHub&apos;s session, under GitHub&apos;s terms rather than mine.</>}
            </P>
            <P>
              {fr ? 'Les polices sont servies depuis ce site au lieu d’être récupérées auprès de Google. Consulter une page ici ne l’en informe donc pas.' : 'Fonts are served from this site rather than fetched from Google, so opening a page here does not tell anyone else that you did.'}
            </P>
            <P>
              {fr ? 'La recherche dans le blog s’effectue dans votre navigateur. La requête apparaît dans la barre d’adresse et n’est pas envoyée à un serveur.' : 'Searching the blog happens in your browser. The query goes into the address bar, not to a server.'}
            </P>
          </Section>

          <Section title={fr ? 'Qui d’autre intervient' : 'Who else touches it'}>
            <P>
              <strong className="text-text-primary">Resend</strong> {fr ? 'conserve la liste de diffusion et envoie les e-mails ; votre adresse d’abonnement est donc stockée chez ce prestataire.' : 'holds the mailing list and delivers its email, so a subscription address lives with them.'}
            </P>
            <P>
              <strong className="text-text-primary">{fr ? 'giscus et GitHub' : 'giscus and GitHub'}</strong> {fr ? 'gèrent les commentaires. La zone de commentaire est intégrée depuis giscus.app ; publier un commentaire nécessite d’autoriser l’application giscus à accéder à votre compte GitHub. L’affichage d’un article avec des commentaires contacte donc giscus.app. Ni le cadre ni moi ne plaçons de cookie de suivi ; giscus indique ne proposer ni suivi ni publicité.' : <>power the comments. The comment box is an embedded frame served by giscus.app, and posting through it means authorising the giscus app against your GitHub account. Loading a post with comments therefore contacts giscus.app. Neither the frame nor I set any tracking cookie, and giscus states that it has no tracking and no ads.</>}
            </P>
            <P>
              <strong className="text-text-primary">{cloudflare ? 'Cloudflare' : 'Vercel'}</strong>{' '}
              {fr ? 'héberge le site, traite les informations habituelles des requêtes serveur — notamment les adresses IP, les pages demandées et les horodatages — et fournit les statistiques décrites ci-dessus.' : 'hosts the site, processes ordinary server request information such as IP addresses, requested pages, and timestamps, and runs the analytics described above.'}
            </P>
            <P>
              <strong className="text-text-primary">{fr ? 'OpenStreetMap et CARTO' : 'OpenStreetMap and CARTO'}</strong> {fr ? 'fournissent les tuiles cartographiques de la carte de localisation sur la page À propos. Ouvrir cette carte demande des images aux serveurs de CARTO ; seules les informations habituelles d’une requête d’image leur sont transmises. La carte ne se charge que si vous le demandez.' : <>serve the map tiles behind the location on the About page. Opening that map requests images from
              CARTO&apos;s servers; nothing about you is sent beyond what any image request
              carries, and the map is not loaded at all unless you ask for it.</>}
            </P>
            <P>{fr ? 'Aucune donnée n’est vendue ni partagée en dehors de ces services.' : 'Nothing is sold, and nothing is shared beyond those.'}</P>
          </Section>

          <Section title={fr ? 'Demander la suppression' : 'Having it removed'}>
            <P>
              Email{' '}
              <a
                href={`mailto:${settings.email}`}
                className="text-accent underline underline-offset-2"
              >
                {settings.email}
              </a>{' '}
              {fr ? 'et demandez la suppression. Je supprimerai votre inscription à la liste de diffusion, votre commentaire ou les deux. Vous n’avez pas à donner de raison et je ne vous en demanderai pas.' : 'and ask. I will delete your subscription, your comment, or both. You do not need to give a reason, and I will not ask for one.'}
            </P>
          </Section>

          <Section title={fr ? 'Modifications' : 'Changes'}>
            <P>
              {fr ? `Dernière mise à jour : ${UPDATED_FR}. Si les données collectées changent, cette page sera mise à jour et cette date aussi.` : `Last updated ${UPDATED}. If what I collect ever changes, this page changes with it and that date moves.`}
            </P>
          </Section>
          </div>
        </div>
      </main>

      <SiteFooter locale={locale} />
    </div>
  )
}
