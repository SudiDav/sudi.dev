'use client'

import { POST_CATEGORIES } from '@/lib/filters'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Eye,
  Send,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  CodeXml,
  List,
  ListOrdered,
  Quote,
  Minus,
  Image as ImageIcon,
  Check,
  TriangleAlert,
} from 'lucide-react'
import type { Post } from '@/lib/content.types'
import { useRouter } from 'next/navigation'
import { updatePost, addPost, publishReviewedPost } from '@/app/admin/actions'
import { DeploymentStatus } from '@/components/admin/deployment-status'
import type { PublishResult } from '@/lib/publish'
import type { NewsletterOutcome } from '@/lib/newsletter'
import { NewsletterStatus } from '@/components/admin/newsletter-status'

/**
 * Design: "Admin — Post Editor". The chrome is unchanged from the frame; the
 * fields are now real inputs bound to the post.
 *
 * The formatting toolbar is deliberately still inert — the body is edited as
 * MDX source, so a rich-text toolbar would need a full editor and a
 * serialiser back to MDX. Wiring buttons that only appear to work would be
 * worse than leaving them plainly decorative.
 */
const TEXT_FORMAT = [Heading1, Heading2, Heading3, Pilcrow]
const INLINE_FORMAT = [Bold, Italic, Underline, Strikethrough, CodeXml]
const BLOCK_FORMAT = [List, ListOrdered, Quote, Minus]

type EditablePost = Pick<Post, 'title' | 'excerpt' | 'body' | 'category' | 'cover' | 'status'>

function editablePost(post: Post): EditablePost {
  return {
    title: post.title,
    excerpt: post.excerpt,
    body: post.body,
    category: post.category,
    cover: post.cover ?? '',
    status: post.status,
  }
}

const POST_STATUSES = ['Draft', 'Published', 'Archived'] as const

function SidebarField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-admin-text-secondary">{label}</span>
      {children}
    </div>
  )
}

const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length

/**
 * Shared by the edit route and the "new" route. Without a `post` it creates
 * one: the slug is minted from the title on save, so a draft never needs a
 * placeholder file on disk before it has a name.
 */
export function PostEditor({
  post,
  initialVersion,
  canPublish,
  initialPublish,
  initialNewsletter,
}: {
  post?: Post
  initialVersion?: string
  canPublish: boolean
  initialPublish?: PublishResult
  initialNewsletter?: NewsletterOutcome
}) {
  const creating = !post
  const router = useRouter()
  const [title, setTitle] = useState(post?.title ?? '')
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '')
  const [body, setBody] = useState(post?.body ?? '')
  const [status, setStatus] = useState<Post['status']>(post?.status ?? 'Draft')
  const [category, setCategory] = useState(post?.category ?? POST_CATEGORIES[0])
  const [cover, setCover] = useState(post?.cover ?? '')
  const [savedBaseline, setSavedBaseline] = useState<EditablePost | null>(
    post ? editablePost(post) : null,
  )
  const [expectedVersion, setExpectedVersion] = useState(initialVersion)
  const [conflicted, setConflicted] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const [publish, setPublish] = useState<PublishResult | null>(initialPublish ?? null)
  const [newsletter, setNewsletter] = useState<NewsletterOutcome | null>(initialNewsletter ?? null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const words = wordCount(body)
  const minutes = Math.max(1, Math.round(words / 200))
  const currentValues: EditablePost = { title, excerpt, body, category, cover, status }
  const dirty = savedBaseline !== null &&
    (currentValues.title !== savedBaseline.title ||
      currentValues.excerpt !== savedBaseline.excerpt ||
      currentValues.body !== savedBaseline.body ||
      currentValues.category !== savedBaseline.category ||
      currentValues.cover !== savedBaseline.cover ||
      currentValues.status !== savedBaseline.status)
  const persistedStatus = savedBaseline?.status ?? null

  const acceptSavedPost = (savedPost: Post | undefined, fallback: EditablePost) => {
    const persisted = savedPost ? editablePost(savedPost) : fallback
    setTitle(persisted.title)
    setExcerpt(persisted.excerpt)
    setBody(persisted.body)
    setCategory(persisted.category)
    setCover(persisted.cover)
    setStatus(persisted.status)
    setSavedBaseline(persisted)
  }

  const recordConflict = (result: { code?: string; error: string }) => {
    if (result.code === 'post_conflict' || result.code === 'post_review_required') {
      setConflicted(true)
      setError(
        result.code === 'post_conflict'
          ? 'This post changed after you opened it. Your edits are still here. Reload and review the latest draft before saving or publishing.'
          : 'This post needs a fresh review before publishing. Reload and review the latest saved post.',
      )
      return true
    }
    setError(result.error)
    return false
  }

  const save = () => {
    setError(null)
    const submitted: EditablePost = { ...currentValues }
    startTransition(async () => {
      if (!post) {
        // Creating: mint the file, then move to its real edit URL so further
        // saves update rather than trying to create again.
        const result = await addPost({
          title,
          excerpt,
          body,
          category,
          status: status === 'Archived' ? 'Archived' : 'Draft',
          cover,
        })
        if (result.ok && result.slug) {
          const params = new URLSearchParams()
          if (result.publish?.sha) params.set('sha', result.publish.sha)
          if (result.publish?.branch) params.set('branch', result.publish.branch)
          if (result.publish?.commitUrl) params.set('commitUrl', result.publish.commitUrl)
          if (result.newsletter?.ok) {
            params.set('newsletterId', result.newsletter.id)
            params.set('newsletterName', result.newsletter.name)
          }
          router.replace(
            `/admin/posts/${result.slug}/edit${params.toString() ? `?${params.toString()}` : ''}`,
          )
        }
        else if (!result.ok) setError(result.error)
        return
      }

      const result = await updatePost(
        post.slug,
        {
          title: submitted.title,
          excerpt: submitted.excerpt,
          body: submitted.body,
          category: submitted.category,
          cover: submitted.cover,
          status: submitted.status,
          readingTime: `${minutes} min read`,
        },
        expectedVersion,
      )
      if (result.ok) {
        setPublish(result.publish ?? null)
        setNewsletter(result.newsletter ?? null)
        setExpectedVersion(result.publish?.postVersion)
        acceptSavedPost(result.publish?.post, submitted)
        setSaved(new Date().toLocaleTimeString())
      } else {
        recordConflict(result)
      }
    })
  }

  const publishReviewed = (unpublish = false) => {
    if (!post || !expectedVersion || dirty || conflicted) return
    setError(null)
    const reviewedValues: EditablePost = { ...currentValues }
    startTransition(async () => {
      const result = unpublish
        ? await updatePost(post.slug, { status: 'Draft' }, expectedVersion)
        : await publishReviewedPost(post.slug, expectedVersion)
      if (!result.ok) {
        recordConflict(result)
        return
      }
      setPublish(result.publish ?? null)
      setNewsletter(result.newsletter ?? null)
      setExpectedVersion(result.publish?.postVersion)
      const fallback: EditablePost = {
        ...reviewedValues,
        status: unpublish ? 'Draft' : 'Published',
      }
      acceptSavedPost(result.publish?.post, fallback)
      setSaved(new Date().toLocaleTimeString())
    })
  }

  return (
    <div className="flex min-h-screen flex-col bg-admin-card">
      {/* Editor Top Bar — ROW, padding [12,24], 1px bottom border */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-border px-4 py-3 sm:gap-4 sm:px-6">
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-4">
          <Link
            href="/admin/posts"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] text-admin-text-secondary hover:bg-admin-bg"
          >
            <ArrowLeft size={16} />
            Posts
          </Link>
          <span className="min-w-0 text-xs text-admin-text-tertiary">
            {pending
              ? 'Saving…'
              : creating
                ? 'New post · not saved yet'
                : saved
                  ? `${persistedStatus} · Saved ${saved}`
                  : `${persistedStatus} · ${dirty ? 'Unsaved changes' : 'No unsaved changes'}`}
          </span>
        </div>

        <div className="flex w-full flex-wrap items-center justify-end gap-2.5 sm:w-auto">
          {post ? (
            <Link
              href={`/admin/posts/${post.slug}/preview`}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-[7px] border border-admin-border px-3.5 py-1.5 text-[13px] text-admin-text-secondary hover:bg-admin-bg"
            >
              <Eye size={14} />
              Preview
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => save()}
            disabled={pending || conflicted || (post !== undefined && !expectedVersion) || !canPublish || !title.trim()}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-[7px] border border-admin-border px-3.5 py-1.5 text-[13px] text-admin-text-secondary hover:bg-admin-bg disabled:opacity-50"
          >
            {creating ? 'Create draft' : 'Save'}
          </button>
          {post ? (
            <button
              type="button"
              onClick={() => publishReviewed(persistedStatus === 'Published')}
              disabled={pending || conflicted || !canPublish || dirty || !expectedVersion}
              title={dirty ? 'Save your changes before publishing.' : undefined}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-[7px] bg-accent px-4 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Send size={14} />
              {persistedStatus === 'Published' ? 'Unpublish' : 'Publish'}
            </button>
          ) : null}
        </div>
      </header>

      {post && dirty ? (
        <p className="border-b border-admin-border bg-admin-subtle px-4 py-2.5 text-[13px] text-admin-text-secondary sm:px-6">
          Save your changes before publishing.
        </p>
      ) : null}
      {post && !expectedVersion && !conflicted ? (
        <div className="flex flex-wrap items-center gap-3 border-b border-admin-border bg-admin-subtle px-4 py-2.5 text-[13px] text-admin-text-secondary sm:px-6">
          <p className="min-w-0 flex-1">Reload and review the saved post before publishing.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="min-h-11 rounded-md border border-admin-border px-3 py-1.5 font-medium hover:bg-admin-bg"
          >
            Reload and review latest draft
          </button>
        </div>
      ) : null}

      {!canPublish ? (
        <p className="flex items-start gap-2 border-b border-admin-border bg-[#F59E0B15] px-4 py-2.5 text-[13px] text-admin-warning sm:items-center sm:px-6">
          <TriangleAlert size={14} />
          Saving is disabled — set GITHUB_TOKEN and GITHUB_REPO to publish from a deployed site.
        </p>
      ) : null}

      {error ? (
        <div className="flex flex-wrap items-center gap-3 border-b border-admin-border bg-[#EF444415] px-4 py-2.5 text-[13px] text-admin-danger sm:px-6">
          <TriangleAlert size={14} />
          <p className="min-w-0 flex-1">{error}</p>
          {conflicted ? (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-11 rounded-md border border-admin-danger/30 px-3 py-1.5 font-medium text-admin-danger hover:bg-[#EF444415]"
            >
              Reload and review latest draft
            </button>
          ) : null}
        </div>
      ) : null}

      {saved && !pending && !error ? (
        <p className="flex items-start gap-2 border-b border-admin-border bg-[#10B98115] px-4 py-2.5 text-[13px] text-admin-success sm:items-center sm:px-6">
          <Check size={14} />
          Saved to content/posts/{post?.slug}.mdx
        </p>
      ) : null}

      {publish ? (
        <div className="border-b border-admin-border px-4 py-2.5 sm:px-6">
          <DeploymentStatus publish={publish} />
          <NewsletterStatus newsletter={newsletter} />
        </div>
      ) : null}

      <div className="flex flex-1 flex-col xl:flex-row">
        <div className="flex flex-1 flex-col">
          {/* Toolbar — ROW, padding [8,24], gap 4, #FAFBFC, 1px bottom border */}
          <div className="flex flex-wrap items-center gap-1 border-b border-admin-border bg-admin-subtle px-4 py-2 sm:px-6">
            {[TEXT_FORMAT, INLINE_FORMAT, BLOCK_FORMAT].map((group, groupIndex) => (
              <div key={groupIndex} className="flex items-center gap-0.5">
                {groupIndex > 0 ? <span className="mx-2 h-4 w-px bg-admin-border" /> : null}
                {group.map((Icon, index) => (
                  <span key={index} className="rounded p-1.5 text-admin-text-secondary">
                    <Icon size={18} />
                  </span>
                ))}
              </div>
            ))}
            <span className="ml-auto font-mono text-[11px] text-admin-text-tertiary">
              {words.toLocaleString()} words · {minutes} min read
            </span>
          </div>

          <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-admin-border px-4 py-6 text-center sm:px-6 sm:py-8">
              <ImageIcon size={22} className="text-admin-text-tertiary" />
              <span className="text-sm text-admin-text-tertiary">
                {cover || 'Click to add a cover image'}
              </span>
              <span className="text-[11px] text-admin-text-tertiary">
                Recommended: 1200×630px · JPG, PNG, or WebP
              </span>
              {/*
                Uploading needs an asset store this site does not have yet, so
                the field takes a path to an image already in /public.
              */}
              <input
                aria-label="Cover image path"
                value={cover}
                placeholder="/images/…"
                disabled={pending}
                onChange={(event) => setCover(event.target.value)}
                className="mt-1 w-full max-w-sm rounded-md border border-admin-border px-3 py-1.5 text-center text-xs text-admin-text placeholder:text-admin-text-tertiary focus:border-accent focus:outline-none"
              />
            </div>

            <textarea
              aria-label="Post title"
              value={title}
              disabled={pending}
              onChange={(event) => setTitle(event.target.value)}
              rows={2}
              className="resize-none border-0 font-display text-[32px] leading-[1.3] font-bold text-admin-text focus:outline-none sm:text-[36px]"
            />

            <textarea
              aria-label="Post subtitle"
              value={excerpt}
              disabled={pending}
              onChange={(event) => setExcerpt(event.target.value)}
              rows={2}
              className="resize-none border-0 text-lg leading-[1.5] text-admin-text-tertiary focus:outline-none"
            />

            <textarea
              aria-label="Post body (MDX)"
              value={body}
              disabled={pending}
              onChange={(event) => setBody(event.target.value)}
              rows={24}
              className="resize-y border-0 font-mono text-[13px] leading-[1.8] text-admin-text focus:outline-none"
            />
          </div>
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-5 border-admin-border p-4 sm:p-6 xl:w-[320px] xl:border-l">
          <h2 className="font-display text-[15px] font-semibold text-admin-text">Post Settings</h2>

          <SidebarField label="Status">
            <select
              aria-label="Status"
              aria-describedby="post-status-help"
              value={status}
              disabled={pending}
              onChange={(event) => setStatus(event.target.value as Post['status'])}
              className="rounded-lg border border-admin-border bg-admin-input px-3 py-2 text-[13px] text-admin-text focus:border-accent focus:outline-none"
            >
              {POST_STATUSES.map((option) => (
                <option
                  key={option}
                  value={option}
                  disabled={option === 'Published' && persistedStatus !== 'Published'}
                >
                  {option}
                </option>
              ))}
            </select>
            <p id="post-status-help" className="text-xs leading-relaxed text-admin-text-tertiary">
              {creating
                ? 'Create a draft first, then review and publish it.'
                : persistedStatus === 'Published'
                  ? 'This post is published. Choose Draft or Archived and save to take it offline.'
                  : dirty
                    ? 'Save your changes, then click Publish to make the saved post public.'
                    : 'Click Publish to make this saved post public. Draft and Archived posts stay hidden.'}
            </p>
            {post && persistedStatus !== 'Published' ? (
              <button
                type="button"
                onClick={() => publishReviewed()}
                disabled={pending || conflicted || !canPublish || dirty || !expectedVersion}
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                <Send size={14} />
                Publish post
              </button>
            ) : null}
          </SidebarField>

          <SidebarField label="Category">
            <select
              value={category}
              disabled={pending}
              onChange={(event) => setCategory(event.target.value)}
              className="rounded-lg border border-admin-border bg-admin-input px-3 py-2 text-[13px] text-admin-text focus:border-accent focus:outline-none"
            >
              {POST_CATEGORIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </SidebarField>

          <SidebarField label="Tags">
            <div className="flex flex-wrap items-center gap-2">
              {(post?.tags ?? []).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-accent-dim px-2.5 py-1 text-[11px] text-accent"
                >
                  {tag}
                </span>
              ))}
              {post?.tags?.length ? null : (
                <span className="text-xs text-admin-text-tertiary">No tags</span>
              )}
            </div>
          </SidebarField>

          <SidebarField label="Publish Date">
            <span className="text-[13px] text-admin-text">
              {post?.date ?? new Date().toISOString().slice(0, 10)}
            </span>
          </SidebarField>

          <SidebarField label="URL Slug">
            <span className="font-mono text-xs">
              <span className="text-admin-text-tertiary">/blog/</span>
              <span className="text-admin-text">
                {post?.slug ??
                  (title.trim()
                    ? title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
                    : '…')}
              </span>
            </span>
          </SidebarField>

          <div className="flex flex-col gap-3 border-t border-admin-border pt-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold text-admin-text">SEO</h3>
              <span
                className={`text-[11px] font-medium ${
                  excerpt.length <= 160 ? 'text-admin-success' : 'text-admin-warning'
                }`}
              >
                {excerpt.length <= 160 ? 'Good' : 'Too long'}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-admin-text-secondary">Meta Title</span>
              <span className="text-xs text-admin-text">{title} | Sudi M. David</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-admin-text-secondary">
                Meta Description
              </span>
              <span className="text-xs text-admin-text">{excerpt}</span>
              <span className="text-[10px] text-admin-text-tertiary">
                {excerpt.length} / 160 characters
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-admin-border pt-5">
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] font-medium text-admin-text">Featured Post</span>
              <span className="text-[11px] text-admin-text-tertiary">Pin to blog homepage</span>
            </div>
            <span
              className={`flex h-5 w-9 items-center rounded-full p-0.5 ${
                post?.featured ? 'justify-end bg-accent' : 'bg-admin-border'
              }`}
            >
              <span className="size-4 rounded-full bg-admin-knob" />
            </span>
          </div>
        </aside>
      </div>
    </div>
  )
}
