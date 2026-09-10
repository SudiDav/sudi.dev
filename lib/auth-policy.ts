type SignInAttempt = {
  provider?: string
  profile?: Record<string, unknown>
  userEmail?: string | null
  adminEmail?: string
  devBypassEnabled: boolean
}

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() || null
}

export function isAdminEmail(
  email: string | null | undefined,
  adminEmail: string | undefined,
) {
  const normalizedAdmin = normalizeEmail(adminEmail)
  return Boolean(normalizedAdmin && normalizeEmail(email) === normalizedAdmin)
}

export function canSignIn(attempt: SignInAttempt) {
  if (attempt.provider === 'google') {
    return attempt.profile?.email_verified === true && Boolean(normalizeEmail(attempt.userEmail))
  }

  if (attempt.provider === 'github') return true

  if (attempt.provider === 'dev') {
    return (
      attempt.devBypassEnabled &&
      isAdminEmail(attempt.userEmail, attempt.adminEmail)
    )
  }

  return false
}

export function commentIdentityFromAccount(provider: string | undefined, subject: string) {
  if ((provider !== 'google' && provider !== 'github') || !subject) return null
  return { provider, subject } as const
}
