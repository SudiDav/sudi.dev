import { getSettings } from '@/lib/site'
import { isPublishingConfigured } from '@/lib/publish'
import { SettingsForm } from './settings-form'

export const metadata = { robots: { index: false, follow: false } }

/**
 * Design: "Admin — Settings" — a two-column layout (fluid left, 360 right).
 * Values come from content/site.json and saving writes back to it.
 */
export default async function AdminSettingsPage() {
  return <SettingsForm settings={await getSettings()} canPublish={isPublishingConfigured()} />
}
