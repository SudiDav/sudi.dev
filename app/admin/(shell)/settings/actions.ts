'use server'

import { signOut } from '@/auth'

/** Log Out on the Settings screen — now a real sign-out, not decoration. */
export async function signOutAction() {
  await signOut({ redirectTo: '/admin/signin' })
}
