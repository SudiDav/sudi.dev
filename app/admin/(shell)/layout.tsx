import { AdminSidebar } from '@/components/admin/admin-sidebar'

/**
 * The admin shell — sidebar plus the main column of padding [32,40], gap 32,
 * on $admin-bg.
 *
 * The Post Editor frame deliberately sits OUTSIDE this group: its design has no
 * sidebar at all, just its own top bar over a full-width editor on #FFFFFF.
 */
export default function AdminShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-admin-bg lg:flex-row">
      <AdminSidebar />
      <main className="flex flex-1 flex-col gap-8 px-6 py-8 lg:px-10">{children}</main>
    </div>
  )
}
