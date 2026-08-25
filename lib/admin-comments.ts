import 'server-only'

import { getPosts } from './content'

const GITHUB_API = 'https://api.github.com'

type GithubDiscussion = {
  number: number
  title: string
  html_url: string
  comments: number
  created_at: string
}

type GithubDiscussionComment = {
  id: number
  body: string
  created_at: string
  updated_at: string
  user: {
    login: string
    html_url: string
  } | null
}

export type AdminComment = {
  id: string
  author: string
  authorUrl: string
  body: string
  createdAt: string
  updatedAt: string
  discussionTitle: string
  discussionUrl: string
  postSlug: string | null
  postTitle: string | null
}

export type AdminCommentsResult = {
  comments: AdminComment[]
  discussions: number
  error: string | null
}

function repository() {
  return process.env.GITHUB_REPO || process.env.NEXT_PUBLIC_GISCUS_REPO || ''
}

function headers(includeToken = true) {
  const token = includeToken ? process.env.GITHUB_TOKEN : undefined
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function githubJson<T>(path: string): Promise<T> {
  const token = process.env.GITHUB_TOKEN
  let response = await fetch(`${GITHUB_API}${path}`, {
    headers: headers(),
    cache: 'no-store',
  })

  // A publishing token may not include the Discussions permission. Public
  // repositories can still be read without auth, so retry once anonymously.
  if (!response.ok && token && (response.status === 401 || response.status === 403)) {
    response = await fetch(`${GITHUB_API}${path}`, {
      headers: headers(false),
      cache: 'no-store',
    })
  }

  if (!response.ok) {
    throw new Error(`GitHub returned ${response.status}`)
  }

  return response.json() as Promise<T>
}

async function discussions() {
  const repo = repository()
  if (!repo) throw new Error('Set GITHUB_REPO or NEXT_PUBLIC_GISCUS_REPO to load comments')

  return githubJson<GithubDiscussion[]>(
    `/repos/${repo}/discussions?per_page=100&sort=created&direction=desc`,
  )
}

function postSlugFromDiscussion(title: string) {
  return title.startsWith('blog/') ? title.slice('blog/'.length) : null
}

/** Load the public GitHub Discussions that power the site's giscus comments. */
export async function getAdminComments(): Promise<AdminCommentsResult> {
  try {
    const [githubDiscussions, posts] = await Promise.all([discussions(), getPosts()])
    const postsBySlug = new Map(posts.map((post) => [post.slug, post]))
    const repo = repository()

    const grouped = await Promise.all(
      githubDiscussions.map(async (discussion) => {
        const replies = await githubJson<GithubDiscussionComment[]>(
          `/repos/${repo}/discussions/${discussion.number}/comments?per_page=100&sort=created&direction=asc`,
        )
        const postSlug = postSlugFromDiscussion(discussion.title)
        const post = postSlug ? postsBySlug.get(postSlug) : undefined

        return replies.map((reply) => ({
          id: String(reply.id),
          author: reply.user?.login ?? 'Deleted user',
          authorUrl: reply.user?.html_url ?? 'https://github.com',
          body: reply.body,
          createdAt: reply.created_at,
          updatedAt: reply.updated_at,
          discussionTitle: discussion.title,
          discussionUrl: discussion.html_url,
          postSlug,
          postTitle: post?.title ?? null,
        }))
      }),
    )

    return {
      comments: grouped
        .flat()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      discussions: githubDiscussions.length,
      error: null,
    }
  } catch (error) {
    console.error('Unable to load GitHub Discussions for admin comments', error)
    return {
      comments: [],
      discussions: 0,
      error: error instanceof Error ? error.message : 'GitHub Discussions are unavailable',
    }
  }
}

export async function getAdminCommentCount() {
  try {
    const items = await discussions()
    return { count: items.reduce((total, item) => total + item.comments, 0), error: null }
  } catch (error) {
    console.error('Unable to count GitHub Discussions for admin dashboard', error)
    return { count: 0, error: error instanceof Error ? error.message : 'Unavailable' }
  }
}
