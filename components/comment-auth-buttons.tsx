import { GithubIcon } from './brand-icons'
import { signIn, signOut } from '@/auth'

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.93A6 6 0 0 1 6.07 12c0-.67.11-1.33.32-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.55l3.35-2.62Z" />
      <path fill="#EA4335" d="M12 5.94c1.47 0 2.78.5 3.82 1.49l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z" />
    </svg>
  )
}

export type CommentViewer = {
  name: string
  image: string | null
  provider: 'google' | 'github'
}

export function CommentAuthButtons({
  slug,
  viewer,
}: {
  slug: string
  viewer: CommentViewer | null
}) {
  const redirectTo = `/blog/${slug}#comments`

  if (viewer) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <p className="text-[13px] text-text-secondary">
          Commenting as <span className="font-medium text-text-primary">{viewer.name}</span>
        </p>
        <form
          action={async () => {
            'use server'
            await signOut({ redirectTo })
          }}
        >
          <button type="submit" className="text-[12px] font-medium text-text-tertiary underline underline-offset-4 hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
            Sign out
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 border-b border-border pb-5">
      <p className="text-[13px] leading-5 text-text-secondary">
        Sign in for immediate publishing, or continue as a guest for review.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <form
          action={async () => {
            'use server'
            await signIn('google', { redirectTo })
          }}
        >
          <button type="submit" className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-text-primary px-4 text-[13px] font-semibold text-bg-primary hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-auto">
            <GoogleIcon />
            Continue with Google
          </button>
        </form>
        <form
          action={async () => {
            'use server'
            await signIn('github', { redirectTo })
          }}
        >
          <button type="submit" className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-border px-4 text-[13px] font-semibold text-text-primary hover:border-border-hover hover:bg-bg-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-auto">
            <GithubIcon size={16} />
            Continue with GitHub
          </button>
        </form>
      </div>
    </div>
  )
}
