import { redirect } from 'next/navigation'
import { signIn, isAdmin } from '@/auth'
import { LogIn, ShieldAlert } from 'lucide-react'

export const metadata = {
  title: 'Sign in | Sudi David',
  robots: { index: false, follow: false },
}

/**
 * The admin sign-in screen. Not in the design file — the design assumes an
 * already-authenticated admin — so it is deliberately plain and built from the
 * existing admin tokens rather than inventing a new visual language.
 */
export default async function AdminSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  if (await isAdmin()) redirect('/admin')

  const { error } = await searchParams

  return (
    <div className="flex min-h-screen items-center justify-center bg-admin-bg px-6">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-xl border border-admin-border bg-admin-card p-8">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-2xl font-bold text-admin-text">Admin</h1>
          <p className="text-[13px] text-admin-text-secondary">
            Sign in with the site owner&apos;s Google account to manage content.
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
            await signIn('google', { redirectTo: '/admin' })
          }}
        >
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <LogIn size={16} />
            Continue with Google
          </button>
        </form>
      </div>
    </div>
  )
}
