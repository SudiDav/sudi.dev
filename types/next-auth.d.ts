import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      commenterId?: string
      provider?: 'google' | 'github'
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    commentProvider?: 'google' | 'github'
    commentSubject?: string
  }
}
