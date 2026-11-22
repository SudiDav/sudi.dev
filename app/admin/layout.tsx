import type { Metadata } from 'next'
import { SiteDocument } from '@/app/site-document'

export const metadata: Metadata = {
  title: 'Admin | Sudi M. David',
  // UI-only with no authentication — keep it out of search results.
  robots: { index: false, follow: false },
}

/**
 * Metadata only. The sidebar shell lives in the `(shell)` route group so the
 * Post Editor, which the design draws without a sidebar, can opt out of it.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <SiteDocument locale="en">{children}</SiteDocument>
}
