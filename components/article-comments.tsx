import { auth } from '@/auth'
import { getPublishedComments } from '@/lib/comments/service'
import { neonCommentStore } from '@/lib/comments/store'
import type { PublicComment } from '@/lib/comments/types'
import { CommentAuthButtons, type CommentViewer } from './comment-auth-buttons'
import { CommentSection } from './comment-section'

/**
 * Design: Article Page → "Comment Section" — COLUMN, padding [48,0], gap 32,
 * with a 720px inner column. Replies use a quiet accent rail so the discussion
 * reads like notes in the margin without competing with the essay.
 */
export async function ArticleComments({ slug }: { slug: string }) {
  const session = await auth()
  const viewer: CommentViewer | null =
    session?.user?.provider && session.user.commenterId
      ? {
          name: session.user.name?.trim() || 'Reader',
          image: session.user.image ?? null,
          provider: session.user.provider,
        }
      : null

  let unavailable = false
  let comments: PublicComment[] = []
  try {
    comments = await getPublishedComments(neonCommentStore, slug)
  } catch {
    unavailable = true
  }

  return (
    <section className="flex flex-col items-center px-4 py-12 md:px-8">
      <div className="flex w-full max-w-[720px] flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-[22px] font-semibold text-text-primary">Comments</h2>
          <p className="text-[13px] leading-[1.6] text-text-secondary">
            A place to question, extend, or challenge the ideas in this essay.
          </p>
        </div>
        <CommentSection
          articleSlug={slug}
          initialComments={comments}
          viewer={viewer}
          unavailable={unavailable}
          auth={<CommentAuthButtons slug={slug} viewer={viewer} />}
        />
      </div>
    </section>
  )
}
