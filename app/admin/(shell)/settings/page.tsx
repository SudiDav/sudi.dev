import { LogOut, Camera } from 'lucide-react'
import { AdminTopBar, AdminCard } from '@/components/admin/admin-ui'
import { GithubIcon, TwitterIcon, LinkedinIcon } from '@/components/brand-icons'

/**
 * Design: "Admin — Settings" — a two-column layout (fluid left, 360 right).
 * Fields are label (Inter 12/500) over an input of padding [10,14] on #FFFFFF
 * with a 1px $admin-border and radius 8.
 *
 * Every field is presentational and every value comes from the design frame.
 * Nothing saves: persistence is out of scope for this phase, so the form is
 * deliberately not wired to a submit handler that would silently discard input.
 */
function Field({
  label,
  value,
  textarea,
}: {
  label: string
  value: string
  textarea?: boolean
}) {
  const id = `field-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`
  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-admin-text-secondary">
        {label}
      </label>
      {textarea ? (
        <textarea
          id={id}
          defaultValue={value}
          rows={3}
          className="rounded-lg border border-admin-border bg-white px-3.5 py-2.5 text-[13px] text-admin-text focus:border-accent focus:outline-none"
        />
      ) : (
        <input
          id={id}
          defaultValue={value}
          className="rounded-lg border border-admin-border bg-white px-3.5 py-2.5 text-[13px] text-admin-text focus:border-accent focus:outline-none"
        />
      )}
    </div>
  )
}

const SOCIALS = [
  { Icon: GithubIcon, label: 'GitHub', value: 'github.com/sudidavid' },
  { Icon: TwitterIcon, label: 'Twitter / X', value: '@sudidavid' },
  { Icon: LinkedinIcon, label: 'LinkedIn', value: 'linkedin.com/in/sudidavid' },
]

export default function AdminSettingsPage() {
  return (
    <>
      <AdminTopBar title="Settings" />

      <div className="flex flex-col gap-8 xl:flex-row">
        <div className="flex flex-1 flex-col gap-6">
          <AdminCard title="Profile Information">
            <div className="flex items-center gap-4">
              <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-accent">
                <Camera size={20} className="text-white" />
              </span>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  className="w-fit rounded-lg border border-admin-border px-3.5 py-2 text-[13px] font-medium text-admin-text"
                >
                  Change photo
                </button>
                <span className="text-[11px] text-admin-text-tertiary">
                  JPG, PNG or WebP. Max 2MB.
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Field label="Display Name" value="Sudi David" />
              <Field label="Email Address" value="sudi@sudidavid.dev" />
            </div>

            <Field
              label="Bio"
              textarea
              value="Full-stack engineer specializing in real-time systems, distributed architectures, and developer tooling."
            />

            <div className="flex flex-col gap-4 sm:flex-row">
              <Field label="Location" value="San Francisco, CA" />
              <Field label="Website" value="sudidavid.dev" />
            </div>
          </AdminCard>

          <AdminCard title="Social Links">
            {SOCIALS.map(({ Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <Icon size={18} className="shrink-0 text-admin-text-secondary" />
                <input
                  aria-label={label}
                  defaultValue={value}
                  className="w-full rounded-lg border border-admin-border bg-white px-3.5 py-2.5 text-[13px] text-admin-text focus:border-accent focus:outline-none"
                />
              </div>
            ))}
          </AdminCard>
        </div>

        <div className="flex w-full flex-col gap-6 xl:w-[360px]">
          <AdminCard title="SEO & Metadata">
            <Field label="Site Title" value="Sudi David — Developer Portfolio" />
            <Field
              label="Meta Description"
              textarea
              value="Full-stack engineer building real-time systems and developer tools."
            />
          </AdminCard>

          <AdminCard title="Session">
            <p className="text-[13px] leading-[1.5] text-admin-text-secondary">
              Sign out of your admin account. You can log back in at any time.
            </p>
            <button
              type="button"
              className="inline-flex w-fit items-center gap-2 rounded-lg border border-admin-border px-4 py-2 text-[13px] font-medium text-admin-text-secondary"
            >
              <LogOut size={14} />
              Log Out
            </button>
          </AdminCard>
        </div>
      </div>
    </>
  )
}
