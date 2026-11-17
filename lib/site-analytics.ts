/** Public tracking configuration; this is not an account/API credential. */
export function publicAnalyticsConfig(hostname: string, pathname: string) {
  if (hostname !== 'sudi.dev' || pathname === '/admin' || pathname.startsWith('/admin/')) return null
  // Count document loads only. Automatic SPA tracking could observe a later
  // client-side transition from a public page into the owner's admin area.
  return { token: '70736dadccdf41de8b5ea8bcfb25687b', spa: false }
}
