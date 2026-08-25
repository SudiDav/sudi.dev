import { AdminTopBar } from '@/components/admin/admin-ui'
import { NewsletterList } from '@/components/admin/newsletter-list'
import { SubscriberList } from '@/components/admin/subscriber-list'
import { listNewsletters, listSubscribers } from '@/app/admin/actions'

export const metadata = { robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function AdminNewslettersPage() {
  const [newsletterResult, subscriberResult] = await Promise.all([listNewsletters(), listSubscribers()])

  return (
    <>
      <AdminTopBar
        title="Newsletters"
        subtitle="Manage subscribers and review branded post announcements before sending them."
      />
      <div className="mt-6 flex flex-col gap-10">
        {subscriberResult.ok ? (
          <SubscriberList contacts={subscriberResult.contacts} hasMore={subscriberResult.hasMore} />
        ) : (
          <div className="rounded-lg bg-[#EF444415] px-4 py-3 text-[13px] text-admin-danger">
            Could not load subscribers: {subscriberResult.error}
          </div>
        )}

        <section aria-labelledby="broadcasts-heading">
          <h2 id="broadcasts-heading" className="mb-4 text-base font-semibold text-admin-text">
            Broadcasts
          </h2>
          {newsletterResult.ok ? (
            <NewsletterList broadcasts={newsletterResult.broadcasts} />
          ) : (
            <div className="rounded-lg bg-[#EF444415] px-4 py-3 text-[13px] text-admin-danger">
              Could not load broadcasts: {newsletterResult.error}
            </div>
          )}
        </section>
      </div>
    </>
  )
}
