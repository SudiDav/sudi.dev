import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

/**
 * The single account allowed into the admin.
 *
 * This is the whole authorisation model: there is one author, so rather than a
 * user table there is one address, checked on every sign-in. Anyone else who
 * completes Google's flow is rejected before a session is ever issued.
 */
const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.toLowerCase().trim()

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],
  session: { strategy: 'jwt' },
  pages: { signIn: '/admin/signin', error: '/admin/signin' },
  callbacks: {
    /**
     * Returning false here aborts the sign-in — no session, no cookie.
     *
     * `email_verified` matters: without it, an unverified Google account
     * claiming the admin address would be let in.
     */
    signIn({ profile }) {
      if (!ADMIN_EMAIL) return false
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
