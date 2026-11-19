import NextAuth from 'next-auth'
import GitHub, { type GitHubEmail, type GitHubProfile } from 'next-auth/providers/github'
import Credentials from 'next-auth/providers/credentials'

function ownerEmail() {
  return process.env.ADMIN_EMAIL?.trim().toLowerCase()
}

function isOwner(email: string | null | undefined) {
  const owner = ownerEmail()
  return Boolean(owner && email?.trim().toLowerCase() === owner)
}

export function isGitHubSignInConfigured() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET_1 || process.env.AUTH_SECRET_2 || process.env.AUTH_SECRET_3
  return Boolean(ownerEmail() && secret && process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET)
}

async function verifiedPrimaryEmail(headers: HeadersInit) {
  for (let page = 1; ; page++) {
    const url = `https://api.github.com/user/emails?per_page=100&page=${page}`
    const response = await fetch(url, { headers, cache: 'no-store' })
    if (!response.ok) throw new Error('GitHub email verification was unavailable.')
    const addresses: GitHubEmail[] = await response.json()
    const primary = addresses.find(address => address.primary === true)
    if (primary) return primary.verified === true ? primary.email : null
    if (!response.headers.get('link')?.includes('rel="next"')) return null
  }
}

const github = GitHub({
  authorization: { params: { scope: 'read:user user:email', prompt: 'select_account' } },
  userinfo: {
    url: 'https://api.github.com/user',
    async request({ tokens }: { tokens: { access_token?: string } }) {
      if (!tokens.access_token) throw new Error('GitHub did not return an access token.')
      const headers = {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'sudi.dev',
      }
      // Profile visibility can make /user.email public, private, or a secondary alias.
      const [user, email] = await Promise.all([
        fetch('https://api.github.com/user', { headers, cache: 'no-store' }),
        verifiedPrimaryEmail(headers),
      ])
      if (!user.ok) throw new Error('GitHub account verification was unavailable.')
      const profile: GitHubProfile = await user.json()
      return { ...profile, email }
    },
  },
})

export const isDevBypassEnabled =
  process.env.NODE_ENV !== 'production' && process.env.AUTH_DEV_BYPASS === 'true'

const devBypass = Credentials({
  id: 'dev',
  name: 'Development bypass',
  credentials: {},
  authorize: () => {
    const email = ownerEmail()
    return email ? { id: 'dev-admin', name: 'Sudi David', email } : null
  },
})

export const { handlers, signIn, signOut, auth } = NextAuth(() => ({
  providers: isDevBypassEnabled ? [github, devBypass] : [github],
  session: { strategy: 'jwt' },
  pages: { signIn: '/admin/signin', error: '/admin/signin' },
  callbacks: {
    signIn({ account, user }) {
      const allowedProvider = account?.provider === 'github' ||
        (isDevBypassEnabled && account?.provider === 'dev')
      return allowedProvider && isOwner(user.email)
    },
    authorized({ auth: session, request }) {
      if (isOwner(session?.user?.email)) return true
      if (process.env.NODE_ENV !== 'development' || !process.env.AUTH_URL) return false

      // Auth.js builds its default redirect from NextURL, which aliases 127.0.0.1 to localhost.
      const current = new URL(request.url)
      if (current.hostname !== '127.0.0.1' || current.pathname === '/admin/signin') return false
      const signInPage = new URL('/admin/signin', current.origin)
      signInPage.searchParams.set('callbackUrl', current.pathname + current.search)
      return Response.redirect(signInPage, 307)
    },
  },
}))

/** Used by the admin layout and each privileged server action. */
export async function isAdmin(): Promise<boolean> {
  if (!ownerEmail()) return false
  const session = await auth()
  return isOwner(session?.user?.email)
}
