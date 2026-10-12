import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { isAdmin } from '@/auth'
import { ArticleBody } from '@/components/article-body'
import { getLatestPost } from '@/lib/publish'

export const metadata = { robots: { index: false, follow: false } }

export default async function AdminPostPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!(await isAdmin())) {
    const callbackUrl = `/admin/posts/${encodeURIComponent(id)}/preview`
    redirect(`/admin/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`)
  }

  const post = await getLatestPost(id)
  if (!post) notFound()

  return (
    <main className="min-h-screen bg-bg-primary">
      <header className="border-b border-border bg-bg-card px-4 py-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-[900px] flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-text-tertiary">
              Saved content preview · {post.status ?? 'Published'}
            </p>
            <h1 className="mt-1 font-display text-lg font-semibold text-text-primary">{post.title}</h1>
          </div>
          <Link
            href={`/admin/posts/${post.slug}/edit`}
            className="inline-flex min-h-11 items-center rounded-md border border-border px-3.5 text-sm text-text-secondary hover:bg-bg-secondary"
          >
            Back to editor
          </Link>
        </div>
      </header>

      <article className="mx-auto w-full max-w-[900px] px-4 py-10 sm:px-6">
        <p className="mb-8 text-lg leading-[1.6] text-text-secondary">{post.excerpt}</p>
        <div className="flex flex-col gap-7">
          <ArticleBody body={post.body} />
        </div>
      </article>
    </main>
  )
}
