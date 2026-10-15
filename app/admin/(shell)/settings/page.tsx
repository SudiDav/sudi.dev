import { getLatestSettingsSnapshot, isPublishingConfigured } from '@/lib/publish'
import { SettingsForm } from './settings-form'

export const metadata = { robots: { index: false, follow: false } }

/**
 * Design: "Admin — Settings" — a two-column layout (fluid left, 360 right).
 * Values come from content/site.json and saving writes back to it.
 */
export default async function AdminSettingsPage() {
  const snapshot = await getLatestSettingsSnapshot()
  return (
    <SettingsForm
      settings={snapshot.settings}
      initialVersion={snapshot.version}
      canPublish={isPublishingConfigured()}
    />
  )
}
