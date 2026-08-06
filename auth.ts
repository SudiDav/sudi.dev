import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'

/**
 * The single account allowed into the admin.
 *
 * This is the whole authorisation model: there is one author, so rather than a
 * user table there is one address, checked on every sign-in. Anyone else who
 * completes Google's flow is rejected before a session is ever issued.
 */
const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.toLowerCase().trim()

/**
 * A development-only sign-in that skips Google entirely.
 *
 * This exists so the admin is usable before OAuth credentials are set up. It is
 * gated on TWO conditions that both have to hold: NODE_ENV must not be
 * production, and AUTH_DEV_BYPASS must be explicitly "true". `next build` sets
 * NODE_ENV=production, so the provider is not merely hidden in a deployed
 * build — it is not registered at all, and there is no route to reach it.
 *
 * Delete this block once Google sign-in is configured.
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
  providers: devBypassEnabled ? [Google, devBypass] : [Google],
  session: { strategy: 'jwt' },
  pages: { signIn: '/admin/signin', error: '/admin/signin' },
  callbacks: {
    /**
     * Returning false here aborts the sign-in — no session, no cookie.
     *
     * `email_verified` matters: without it, an unverified Google account
     * claiming the admin address would be let in.
     */
    signIn({ account, profile, user }) {
      if (!ADMIN_EMAIL) return false

      // The dev bypass mints the admin identity itself; it only exists when
      // both guards above allow it.
      if (account?.provider === 'dev') {
        return devBypassEnabled && user?.email?.toLowerCase() === ADMIN_EMAIL
      }

      return profile?.email?.toLowerCase() === ADMIN_EMAIL && profile.email_verified === true
    },
    /**
     * Re-check on every request. If ADMIN_EMAIL is later changed, existing
     * sessions minted for the old address stop being treated as admin rather
     * than lingering until they expire.
     */
    authorized({ auth: session }) {
      return session?.user?.email?.toLowerCase() === ADMIN_EMAIL
    },
  },
})

/**
 * True when the caller is the admin. Every server action and the admin layout
 * calls this — the proxy is a redirect convenience, not the security boundary.
 */
export async function isAdmin(): Promise<boolean> {
  if (!ADMIN_EMAIL) return false
  const session = await auth()
  return session?.user?.email?.toLowerCase() === ADMIN_EMAIL
}
