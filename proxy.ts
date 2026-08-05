import { auth } from '@/auth'

/**
 * Next.js 16 renamed `middleware` to `proxy`. Auth.js's `auth` export is a
 * valid proxy handler, and the `authorized` callback in auth.ts decides.
 *
 * This is a redirect convenience, NOT the security boundary. Next's docs note
 * a proxy may be deployed to a CDN and run apart from render code, so the real
 * gate lives in the admin layout and in every server action, both of which
 * call `isAdmin()` themselves.
 */
export default auth

export const config = {
  matcher: ['/admin/:path*'],
}
