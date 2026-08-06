import { notFound, redirect } from 'next/navigation'
import { isAdmin } from '@/auth'
import { getPost } from '@/lib/content'
import { isPublishingConfigured } from '@/lib/publish'
import { PostEditor } from './post-editor'

export const metadata = { robots: { index: false, follow: false } }

/**
 * Design: "Admin — Post Editor" — this frame has NO sidebar, so it sits outside
 * the `(shell)` route group and gates itself.
 */
export default async function AdminPostEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  if (!(await isAdmin())) redirect('/admin/signin')

  const { id } = await params
  const post = await getPost(id)
  if (!post) notFound()

  return <PostEditor post={post} canPublish={isPublishingConfigured()} />
}
