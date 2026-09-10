import 'server-only'

import { getSql } from '@/lib/db'
import type {
  AdminComment,
  AuthorType,
  CommentStatus,
  ModerationStatus,
  PublicComment,
} from './types'

export type ParentComment = {
  id: string
  articleSlug: string
  parentId: string | null
  status: CommentStatus
}

export type NewComment = {
  articleSlug: string
  parentId: string | null
  authorType: AuthorType
  authorKey: string | null
  authorName: string
  authorAvatarUrl: string | null
  body: string
  status: CommentStatus
  actorKey: string
  createdAt: Date
}

export interface CommentStore {
  listPublished(articleSlug: string): Promise<PublicComment[]>
  findParent(id: string): Promise<ParentComment | null>
  lastCreatedAt(actorKey: string): Promise<Date | null>
  insert(comment: NewComment): Promise<PublicComment>
  listAdmin(status?: CommentStatus): Promise<AdminComment[]>
  countAll(): Promise<number>
  setStatus(id: string, status: ModerationStatus): Promise<boolean>
  deleteById(id: string): Promise<boolean>
}

type CommentRow = {
  id: string
  article_slug: string
  parent_id: string | null
  author_type: AuthorType
  author_name: string
  author_avatar_url: string | null
  body: string
  status: CommentStatus
  created_at: string | Date
  updated_at: string | Date
}

function toPublicComment(row: CommentRow): PublicComment {
  return {
    id: row.id,
    parentId: row.parent_id,
    authorName: row.author_name,
    authorAvatarUrl: row.author_avatar_url,
    authorType: row.author_type,
    body: row.body,
    createdAt: new Date(row.created_at).toISOString(),
  }
}

function toAdminComment(row: CommentRow): AdminComment {
  return {
    ...toPublicComment(row),
    articleSlug: row.article_slug,
    status: row.status,
    updatedAt: new Date(row.updated_at).toISOString(),
  }
}

export const neonCommentStore: CommentStore = {
  async listPublished(articleSlug) {
    const sql = getSql()
    const rows = (await sql`
      SELECT id, article_slug, parent_id, author_type, author_name,
             author_avatar_url, body, status, created_at, updated_at
      FROM comments
      WHERE article_slug = ${articleSlug} AND status = 'published'
      ORDER BY created_at ASC
    `) as CommentRow[]
    return rows.map(toPublicComment)
  },

  async findParent(id) {
    const sql = getSql()
    const rows = (await sql`
      SELECT id, article_slug, parent_id, status
      FROM comments
      WHERE id = ${id}
      LIMIT 1
    `) as Array<{
      id: string
      article_slug: string
      parent_id: string | null
      status: CommentStatus
    }>
    const row = rows[0]
    return row
      ? { id: row.id, articleSlug: row.article_slug, parentId: row.parent_id, status: row.status }
      : null
  },

  async lastCreatedAt(actorKey) {
    const sql = getSql()
    const rows = (await sql`
      SELECT created_at
      FROM comments
      WHERE actor_key = ${actorKey}
      ORDER BY created_at DESC
      LIMIT 1
    `) as Array<{ created_at: string | Date }>
    return rows[0] ? new Date(rows[0].created_at) : null
  },

  async insert(comment) {
    const sql = getSql()
    const rows = (await sql`
      INSERT INTO comments (
        article_slug, parent_id, author_type, author_key, author_name,
        author_avatar_url, body, status, actor_key, created_at, updated_at
      ) VALUES (
        ${comment.articleSlug}, ${comment.parentId}, ${comment.authorType},
        ${comment.authorKey}, ${comment.authorName}, ${comment.authorAvatarUrl},
        ${comment.body}, ${comment.status}, ${comment.actorKey},
        ${comment.createdAt}, ${comment.createdAt}
      )
      RETURNING id, article_slug, parent_id, author_type, author_name,
                author_avatar_url, body, status, created_at, updated_at
    `) as CommentRow[]
    return toPublicComment(rows[0])
  },

  async listAdmin(status) {
    const sql = getSql()
    const rows = (await sql.query(
      `SELECT id, article_slug, parent_id, author_type, author_name,
              author_avatar_url, body, status, created_at, updated_at
       FROM comments
       WHERE ($1::text IS NULL OR status = $1)
       ORDER BY created_at DESC`,
      [status ?? null],
    )) as CommentRow[]
    return rows.map(toAdminComment)
  },

  async countAll() {
    const sql = getSql()
    const rows = (await sql`SELECT count(*)::int AS count FROM comments`) as Array<{
      count: number
    }>
    return rows[0]?.count ?? 0
  },

  async setStatus(id, status) {
    const sql = getSql()
    const rows = (await sql`
      UPDATE comments
      SET status = ${status}, updated_at = now()
      WHERE id = ${id}
      RETURNING id
    `) as Array<{ id: string }>
    return rows.length === 1
  },

  async deleteById(id) {
    const sql = getSql()
    const rows = (await sql`DELETE FROM comments WHERE id = ${id} RETURNING id`) as Array<{
      id: string
    }>
    return rows.length === 1
  },
}
