import { redirect } from 'next/navigation'
import { isAdmin } from '@/auth'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { getSettings } from '@/lib/site'

/**
 * The admin shell — sidebar plus the main column of padding [32,40], gap 32,
 * on $admin-bg.
 *
 * This server-side check is the real security boundary. `proxy.ts` redirects
 * unauthenticated visitors for a fast, clean UX, but Next's docs warn a proxy
 * can be deployed apart from render code, so authorisation is enforced here
 * too — and again in every server action that writes.
 *
 * The Post Editor sits OUTSIDE this group (its design has no sidebar) and
 * therefore performs its own check.
 */
export default async function AdminShellLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) redirect('/admin/signin')

  const settings = await getSettings()

  return (
    <div className="flex min-h-screen flex-col bg-admin-bg lg:flex-row">
      <AdminSidebar name={settings.displayName} email={settings.email} />
      <main className="flex flex-1 flex-col gap-8 px-6 py-8 lg:px-10">{children}</main>
    </div>
  )
}
