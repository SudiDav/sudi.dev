'use client'

import { useState, useTransition } from 'react'
import { LogOut, Upload, User, Check, TriangleAlert } from 'lucide-react'
import { AdminCard } from '@/components/admin/admin-ui'
import { GithubIcon, TwitterIcon, LinkedinIcon } from '@/components/brand-icons'
import { updateSettings } from '@/app/admin/actions'
import { signOutAction } from './actions'
import type { SiteSettings } from '@/lib/site'

const inputClass =
  'w-full rounded-lg border border-admin-border bg-white px-3.5 py-2.5 text-[13px] text-admin-text focus:border-accent focus:outline-none'

function Field({
  label,
  value,
  onChange,
  textarea,
}: {
  label: string
  value: string
  onChange: (value: string) => void
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
          rows={3}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
        />
      ) : (
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
        />
      )}
    </div>
  )
}

const SOCIAL_ICONS = { github: GithubIcon, twitter: TwitterIcon, linkedin: LinkedinIcon }
const SOCIAL_LABELS = { github: 'GitHub', twitter: 'Twitter / X', linkedin: 'LinkedIn' }

/**
 * Design: "Admin — Settings". Every field now writes to content/site.json,
 * which feeds the site metadata, the RSS channel, and the footer.
 */
export function SettingsForm({
  settings: initial,
  canPublish,
}: {
  settings: SiteSettings
  canPublish: boolean
}) {
  const [settings, setSettings] = useState(initial)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const set = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }))
    setSaved(false)
  }

  const save = () => {
    setError(null)
    startTransition(async () => {
      const result = await updateSettings(settings)
      if (result.ok) setSaved(true)
      else setError(result.error)
    })
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-[26px] font-bold text-admin-text">Settings</h1>
        <button
          type="button"
          onClick={save}
          disabled={pending || !canPublish}
          className="rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      {!canPublish ? (
        <p className="flex items-center gap-2 rounded-lg bg-[#F59E0B15] p-3 text-[13px] text-admin-warning">
          <TriangleAlert size={14} />
          Saving is disabled — set GITHUB_TOKEN and GITHUB_REPO to publish from a deployed site.
        </p>
      ) : null}

      {error ? (
        <p className="flex items-center gap-2 rounded-lg bg-[#EF444415] p-3 text-[13px] text-admin-danger">
          <TriangleAlert size={14} />
          {error}
        </p>
      ) : null}

      {saved && !pending ? (
        <p className="flex items-center gap-2 rounded-lg bg-[#10B98115] p-3 text-[13px] text-admin-success">
          <Check size={14} />
          Saved to content/site.json
        </p>
      ) : null}

      <div className="flex flex-col gap-8 xl:flex-row">
        <div className="flex flex-1 flex-col gap-6">
          <AdminCard title="Profile Information">
            <div className="flex items-center gap-4">
              <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-accent">
                <User size={22} className="text-white" />
              </span>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  className="inline-flex w-fit items-center gap-1.5 rounded-md bg-accent px-3.5 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
                >
                  <Upload size={14} />
                  Change photo
                </button>
                <span className="text-[11px] text-admin-text-tertiary">
                  JPG, PNG or WebP. Max 2MB.
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Field
                label="Display Name"
                value={settings.displayName}
                onChange={(value) => set('displayName', value)}
              />
              <Field
                label="Email Address"
                value={settings.email}
                onChange={(value) => set('email', value)}
              />
            </div>

            <Field label="Bio" textarea value={settings.bio} onChange={(value) => set('bio', value)} />

            <div className="flex flex-col gap-4 sm:flex-row">
              <Field
                label="Location"
                value={settings.location}
                onChange={(value) => set('location', value)}
              />
              <Field
                label="Website"
                value={settings.website}
                onChange={(value) => set('website', value)}
              />
            </div>
          </AdminCard>

          <AdminCard title="Social Links">
            {(Object.keys(SOCIAL_ICONS) as (keyof typeof SOCIAL_ICONS)[]).map((kind) => {
              const Icon = SOCIAL_ICONS[kind]
              return (
                <div key={kind} className="flex items-center gap-3">
                  <Icon size={18} className="shrink-0 text-admin-text-secondary" />
                  <input
                    aria-label={SOCIAL_LABELS[kind]}
                    value={settings.social[kind]}
                    onChange={(event) =>
                      set('social', { ...settings.social, [kind]: event.target.value })
                    }
                    className={inputClass}
                  />
                </div>
              )
            })}
          </AdminCard>
        </div>

        <div className="flex w-full flex-col gap-6 xl:w-[360px]">
          <AdminCard title="SEO & Metadata">
            <Field
              label="Site Title"
              value={settings.seo.title}
              onChange={(value) => set('seo', { ...settings.seo, title: value })}
            />
            <Field
              label="Meta Description"
              textarea
              value={settings.seo.description}
              onChange={(value) => set('seo', { ...settings.seo, description: value })}
            />
          </AdminCard>

          <AdminCard title="Session">
            <p className="text-[13px] leading-[1.5] text-admin-text-secondary">
              Sign out of your admin account. You can log back in at any time.
            </p>
            <form action={signOutAction}>
              <button
                type="submit"
                className="inline-flex w-fit items-center gap-2 rounded-lg border border-admin-border px-4 py-2 text-[13px] font-medium text-admin-text-secondary hover:bg-admin-bg"
              >
                <LogOut size={14} />
                Log Out
              </button>
            </form>
          </AdminCard>
        </div>
      </div>
    </>
  )
}
