import { redirect } from 'next/navigation'
import { signIn, isAdmin, isDevBypassEnabled } from '@/auth'
import { ShieldAlert } from 'lucide-react'
import { GithubIcon } from '@/components/brand-icons'

export const metadata = {
  title: 'Sign in | Sudi M. David',
  robots: { index: false, follow: false },
}

function getAdminCallbackUrl(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value
  if (!candidate) return '/admin'

  try {
    const parsed = new URL(candidate, 'https://admin.local')
    const path = `${parsed.pathname}${parsed.search}`
    if (
      (parsed.pathname === '/admin' || parsed.pathname.startsWith('/admin/')) &&
      !parsed.pathname.startsWith('/admin/signin')
    ) {
      return path
    }
  } catch {
    // Invalid callback URLs fall back to the admin home.
  }

  return '/admin'
}

/**
 * The admin sign-in screen. Not in the design file — the design assumes an
 * already-authenticated admin — so it is deliberately plain and built from the
 * existing admin tokens rather than inventing a new visual language.
 */
export default async function AdminSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string | string[] }>
}) {
  const { error, callbackUrl } = await searchParams
  const redirectTo = getAdminCallbackUrl(callbackUrl)
  if (await isAdmin()) redirect(redirectTo)

  return (
    <div className="flex min-h-screen items-center justify-center bg-admin-bg px-6">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-xl border border-admin-border bg-admin-card p-8">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-2xl font-bold text-admin-text">Admin</h1>
          <p className="text-[13px] text-admin-text-secondary">
            Sign in with the site owner&apos;s GitHub account to manage content.
          </p>
        </div>

        {error ? (
          <p className="flex items-start gap-2 rounded-lg bg-[#EF444415] p-3 text-[13px] text-admin-danger">
            <ShieldAlert size={16} className="mt-0.5 shrink-0" />
            That account isn&apos;t authorised for this site.
          </p>
        ) : null}

        <form
          action={async () => {
            'use server'
            await signIn('github', { redirectTo })
          }}
        >
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <GithubIcon size={16} />
            Continue with GitHub
          </button>
        </form>

        {isDevBypassEnabled ? (
          <form
            action={async () => {
              'use server'
              await signIn('dev', { redirectTo })
            }}
            className="flex flex-col gap-2 border-t border-admin-border pt-6"
          >
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-admin-border px-4 py-2.5 text-sm font-medium text-admin-text-secondary transition-colors hover:bg-admin-bg"
            >
              Continue without GitHub (dev)
            </button>
            <span className="text-[11px] text-admin-text-tertiary">
              Local development only. This provider is not registered in a production build.
            </span>
          </form>
        ) : null}
      </div>
    </div>
  )
}
