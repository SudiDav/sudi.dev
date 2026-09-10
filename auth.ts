import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { canSignIn, commentIdentityFromAccount, isAdminEmail } from '@/lib/auth-policy'

/**
 * The single account allowed into the admin.
 *
 * This is the whole admin authorisation model: there is one author, so rather
 * than a user table there is one address, checked at every protected boundary.
 * Other Google and GitHub identities may hold reader sessions for comments,
 * but those sessions never satisfy the admin check below.
 */
const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.toLowerCase().trim()

/**
 * A development-only sign-in that skips GitHub entirely.
 *
 * This exists so the admin is usable before OAuth credentials are set up. It is
 * gated on TWO conditions that both have to hold: NODE_ENV must not be
 * production, and AUTH_DEV_BYPASS must be explicitly "true". `next build` sets
 * NODE_ENV=production, so the provider is not merely hidden in a deployed
 * build — it is not registered at all, and there is no route to reach it.
 *
 * Delete this block once GitHub sign-in is configured.
 */
const devBypassEnabled =
  process.env.NODE_ENV !== 'production' && process.env.AUTH_DEV_BYPASS === 'true'

const devBypass = Credentials({
  id: 'dev',
  name: 'Development bypass',
  credentials: {},
  authorize: () =>
    ADMIN_EMAIL ? { id: 'dev-admin', name: 'Sudi David', email: ADMIN_EMAIL } : null,
})

export const isDevBypassEnabled = devBypassEnabled

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: devBypassEnabled ? [Google, GitHub, devBypass] : [Google, GitHub],
  session: { strategy: 'jwt' },
  pages: { signIn: '/admin/signin', error: '/admin/signin' },
  callbacks: {
    /**
     * Google readers must have a verified address. GitHub identities are valid
     * readers even when they keep their email private; admin access remains a
     * separate exact match against whichever primary email GitHub reports.
     */
    signIn({ account, profile, user }) {
      return canSignIn({
        provider: account?.provider,
        profile: profile ?? undefined,
        userEmail: user.email,
        adminEmail: ADMIN_EMAIL,
        devBypassEnabled,
      })
    },
    jwt({ token, account }) {
      if (account) {
        const identity = commentIdentityFromAccount(account.provider, account.providerAccountId)
        token.commentProvider = identity?.provider
        token.commentSubject = identity?.subject
      }
      return token
    },
    session({ session, token }) {
      if (
        session.user &&
        (token.commentProvider === 'google' || token.commentProvider === 'github') &&
        typeof token.commentSubject === 'string'
      ) {
        session.user.provider = token.commentProvider
        session.user.commenterId = token.commentSubject
      }
      return session
    },
    /**
     * Re-check on every request. If ADMIN_EMAIL is later changed, existing
     * sessions minted for the old address stop being treated as admin rather
     * than lingering until they expire.
     */
    authorized({ auth: session }) {
      return isAdminEmail(session?.user?.email, ADMIN_EMAIL)
    },
  },
})

/**
 * True when the caller is the admin. Every server action and the admin layout
 * calls this — the proxy is a redirect convenience, not the security boundary.
 */
export async function isAdmin(): Promise<boolean> {
  const session = await auth()
  return isAdminEmail(session?.user?.email, ADMIN_EMAIL)
}
