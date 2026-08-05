import type { Metadata } from 'next'
import { AdminSidebar } from '@/components/admin/admin-sidebar'

export const metadata: Metadata = {
  title: 'Admin | Sudi David',
  // The admin is UI-only with no auth; keep it out of search results.
  robots: { index: false, follow: false },
}

/**
 * Design: the admin frames are 1440×900 rows of a fixed sidebar plus a main
 * column of padding [32,40], gap 32, on $admin-bg.
 *
 * The admin is light-only — the design has no dark admin frames — so this
 * subtree does not respond to the site's theme toggle.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-admin-bg lg:flex-row">
      <AdminSidebar />
      <main className="flex flex-1 flex-col gap-8 px-6 py-8 lg:px-10">{children}</main>
    </div>
  )
}
