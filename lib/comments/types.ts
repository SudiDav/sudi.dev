export type AuthorType = 'google' | 'github' | 'guest'
export type CommentStatus = 'pending' | 'published' | 'rejected' | 'spam'
export type ModerationStatus = Exclude<CommentStatus, 'pending'>

export type PublicComment = {
  id: string
  parentId: string | null
  authorName: string
  authorAvatarUrl: string | null
  authorType: AuthorType
  body: string
  createdAt: string
}

export type AdminComment = PublicComment & {
  articleSlug: string
  status: CommentStatus
  updatedAt: string
}

export type SubmitCommentInput = {
  articleSlug: string
  parentId: string | null
  guestName: string
  body: string
}

export type ValidatedSubmission = SubmitCommentInput

export type SubmitCommentResult =
  | { ok: true; status: 'pending'; comment?: never }
  | { ok: true; status: 'published'; comment: PublicComment }
  | { ok: false; message: string }

export type CommentIdentity =
  | {
      type: 'google' | 'github'
      subject: string
      name: string
      avatarUrl: string | null
    }
  | { type: 'guest'; name: string; avatarUrl?: never }
