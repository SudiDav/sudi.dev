import { notFound, redirect } from 'next/navigation'
import { isAdmin } from '@/auth'
import { getPost } from '@/lib/content'
import { isPublishingConfigured } from '@/lib/publish'
import { PostEditor } from './post-editor'

export const metadata = { robots: { index: false, follow: false } }

/**
 * Design: "Admin — Post Editor" — this frame has NO sidebar, so it sits outside
 * the `(shell)` route group and gates itself.
 *
 * The id `new` is reserved: it opens the editor with empty fields and mints the
 * slug from the title on save. Without it, "New Post" would link at a post that
 * does not exist yet and 404.
 */
export default async function AdminPostEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  if (!(await isAdmin())) redirect('/admin/signin')

  const { id } = await params
  if (id === 'new') return <PostEditor canPublish={isPublishingConfigured()} />

  const post = await getPost(id)
  if (!post) notFound()

  return <PostEditor post={post} canPublish={isPublishingConfigured()} />
}
