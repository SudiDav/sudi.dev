'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { auth } from '@/auth'
import { getPost } from '@/lib/content'
import { authenticatedActorKey, guestActorKey } from '@/lib/comments/identity'
import { submitComment } from '@/lib/comments/service'
import { neonCommentStore } from '@/lib/comments/store'
import type { CommentIdentity, SubmitCommentResult } from '@/lib/comments/types'

export type CommentFormState = SubmitCommentResult | null

function field(formData: FormData, name: string) {
  const value = formData.get(name)
  return typeof value === 'string' ? value : ''
}

export async function submitArticleComment(
  _previousState: CommentFormState,
  formData: FormData,
): Promise<SubmitCommentResult> {
  try {
    const articleSlug = field(formData, 'articleSlug')
    const post = await getPost(articleSlug)
    if (!post || (post.status && post.status !== 'Published')) {
      return { ok: false, message: 'This article cannot accept comments.' }
    }

    const session = await auth()
    const sessionUser = session?.user
    const authenticated =
      sessionUser?.provider && sessionUser.commenterId
        ? {
            type: sessionUser.provider,
            subject: sessionUser.commenterId,
            name: sessionUser.name?.trim() || 'Reader',
            avatarUrl: sessionUser.image ?? null,
          }
        : null

    let identity: CommentIdentity
    let actorKey: string
    if (authenticated) {
      identity = authenticated
      actorKey = authenticatedActorKey(authenticated.type, authenticated.subject)
    } else {
      const guestName = field(formData, 'guestName')
      identity = { type: 'guest', name: guestName }
      const forwardedFor = (await headers()).get('x-forwarded-for')
      const ip = forwardedFor?.split(',')[0]?.trim() || 'unknown'
      actorKey = guestActorKey(ip)
    }

    const result = await submitComment(neonCommentStore, {
      input: {
        articleSlug,
        parentId: field(formData, 'parentId') || null,
        guestName: field(formData, 'guestName'),
        body: field(formData, 'body'),
      },
      identity,
      actorKey,
      now: new Date(),
    })

    if (result.ok && result.status === 'published') {
      revalidatePath(`/blog/${articleSlug}`)
    }
    return result
  } catch {
    return { ok: false, message: 'Comments are temporarily unavailable. Please try again.' }
  }
}
