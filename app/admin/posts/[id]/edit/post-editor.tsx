'use client'

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
import { updatePost, addPost } from '@/app/admin/actions'

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

const STATUSES = ['Published', 'Draft', 'Archived'] as const

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
export function PostEditor({ post, canPublish }: { post?: Post; canPublish: boolean }) {
  const creating = !post
  const router = useRouter()
  const [title, setTitle] = useState(post?.title ?? '')
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '')
  const [body, setBody] = useState(post?.body ?? '')
  const [status, setStatus] = useState<Post['status']>(post?.status ?? 'Draft')
  const [category, setCategory] = useState(post?.category ?? 'Development')
  const [cover, setCover] = useState(post?.cover ?? '')
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const words = wordCount(body)
  const minutes = Math.max(1, Math.round(words / 200))

  const save = (nextStatus?: Post['status']) => {
    setError(null)
    startTransition(async () => {
      if (!post) {
        // Creating: mint the file, then move to its real edit URL so further
        // saves update rather than trying to create again.
        const result = await addPost({
          title,
          excerpt,
          body,
          category,
          status: nextStatus ?? status ?? 'Draft',
          cover,
        })
        if (result.ok && result.slug) router.replace(`/admin/posts/${result.slug}/edit`)
        else if (!result.ok) setError(result.error)
        return
      }

      const result = await updatePost(post.slug, {
        title,
        excerpt,
        body,
        category,
        status: nextStatus ?? status,
        readingTime: `${minutes} min read`,
      })
      if (result.ok) {
        if (nextStatus) setStatus(nextStatus)
        setSaved(new Date().toLocaleTimeString())
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <div className="flex min-h-screen flex-col bg-admin-card">
      {/* Editor Top Bar — ROW, padding [12,24], 1px bottom border */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-admin-border px-6 py-3">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/posts"
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] text-admin-text-secondary hover:bg-admin-bg"
          >
            <ArrowLeft size={16} />
            Posts
          </Link>
          <span className="text-xs text-admin-text-tertiary">
            {pending
              ? 'Saving…'
              : creating
                ? 'New post · not saved yet'
                : saved
                  ? `${status} · Saved ${saved}`
                  : `${status} · No unsaved changes`}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {post ? (
            <Link
              href={`/blog/${post.slug}`}
              className="inline-flex items-center gap-1.5 rounded-[7px] border border-admin-border px-3.5 py-1.5 text-[13px] text-admin-text-secondary hover:bg-admin-bg"
            >
              <Eye size={14} />
              Preview
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => save()}
            disabled={pending || !canPublish || !title.trim()}
            className="inline-flex items-center gap-1.5 rounded-[7px] border border-admin-border px-3.5 py-1.5 text-[13px] text-admin-text-secondary hover:bg-admin-bg disabled:opacity-50"
          >
            {creating ? 'Create' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => save(status === 'Published' ? 'Draft' : 'Published')}
            disabled={pending || !canPublish || !title.trim()}
            className="inline-flex items-center gap-1.5 rounded-[7px] bg-accent px-4 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Send size={14} />
            {creating ? 'Create & Publish' : status === 'Published' ? 'Unpublish' : 'Publish'}
          </button>
        </div>
      </header>

      {!canPublish ? (
        <p className="flex items-center gap-2 border-b border-admin-border bg-[#F59E0B15] px-6 py-2.5 text-[13px] text-admin-warning">
          <TriangleAlert size={14} />
          Saving is disabled — set GITHUB_TOKEN and GITHUB_REPO to publish from a deployed site.
        </p>
      ) : null}

      {error ? (
        <p className="flex items-center gap-2 border-b border-admin-border bg-[#EF444415] px-6 py-2.5 text-[13px] text-admin-danger">
          <TriangleAlert size={14} />
          {error}
        </p>
      ) : null}

      {saved && !pending && !error ? (
        <p className="flex items-center gap-2 border-b border-admin-border bg-[#10B98115] px-6 py-2.5 text-[13px] text-admin-success">
          <Check size={14} />
          Saved to content/posts/{post?.slug}.mdx
        </p>
      ) : null}

      <div className="flex flex-1 flex-col xl:flex-row">
        <div className="flex flex-1 flex-col">
          {/* Toolbar — ROW, padding [8,24], gap 4, #FAFBFC, 1px bottom border */}
          <div className="flex flex-wrap items-center gap-1 border-b border-admin-border bg-admin-subtle px-6 py-2">
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

          <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-6 py-8">
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-admin-border px-6 py-8 text-center">
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
                onChange={(event) => setCover(event.target.value)}
                className="mt-1 w-full max-w-sm rounded-md border border-admin-border px-3 py-1.5 text-center text-xs text-admin-text placeholder:text-admin-text-tertiary focus:border-accent focus:outline-none"
              />
            </div>

            <textarea
              aria-label="Post title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              rows={2}
              className="resize-none border-0 font-display text-[36px] leading-[1.3] font-bold text-admin-text focus:outline-none"
            />

            <textarea
              aria-label="Post subtitle"
              value={excerpt}
              onChange={(event) => setExcerpt(event.target.value)}
              rows={2}
              className="resize-none border-0 text-lg leading-[1.5] text-admin-text-tertiary focus:outline-none"
            />

            <textarea
              aria-label="Post body (MDX)"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={24}
              className="resize-y border-0 font-mono text-[13px] leading-[1.8] text-admin-text focus:outline-none"
            />
          </div>
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-5 border-admin-border p-6 xl:w-[320px] xl:border-l">
          <h2 className="font-display text-[15px] font-semibold text-admin-text">Post Settings</h2>

          <SidebarField label="Status">
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as Post['status'])}
              className="rounded-lg border border-admin-border bg-admin-input px-3 py-2 text-[13px] text-admin-text focus:border-accent focus:outline-none"
            >
              {STATUSES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </SidebarField>

          <SidebarField label="Category">
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="rounded-lg border border-admin-border bg-admin-input px-3 py-2 text-[13px] text-admin-text focus:border-accent focus:outline-none"
            >
              {['Development', 'DevOps', 'Architecture', 'Open Source'].map((option) => (
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
              <span className="text-xs text-admin-text">{title} | Sudi David</span>
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
