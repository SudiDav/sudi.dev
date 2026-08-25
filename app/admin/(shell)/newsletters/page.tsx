import { AdminTopBar } from '@/components/admin/admin-ui'
import { NewsletterList } from '@/components/admin/newsletter-list'
import { listNewsletters } from '@/app/admin/actions'

export const metadata = { robots: { index: false, follow: false } }

export default async function AdminNewslettersPage() {
  const result = await listNewsletters()

  return (
    <>
      <AdminTopBar
        title="Newsletters"
        subtitle="Review branded post announcements before sending them to subscribers."
      />
      {!result.ok ? (
        <div className="mt-6 rounded-lg bg-[#EF444415] px-4 py-3 text-[13px] text-admin-danger">
          {result.error}
        </div>
      ) : (
        <div className="mt-6">
          <NewsletterList broadcasts={result.broadcasts} />
        </div>
      )}
    </>
  )
}
