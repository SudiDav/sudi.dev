import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as AdminSidebarModule from '@/components/admin/admin-sidebar'
import AdminPostsPage from '@/app/admin/(shell)/posts/page'
import { PostEditor } from '@/app/admin/posts/[id]/edit/post-editor'
import { getAdminPostCounts, getAdminPosts } from '@/lib/admin-data'

const { AdminSidebar } = AdminSidebarModule

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/posts',
  useRouter: () => ({ replace: vi.fn() }),
}))

vi.mock('@/lib/admin-data', () => ({
  getAdminPosts: vi.fn(),
  getAdminPostCounts: vi.fn(),
}))

vi.mock('@/app/admin/actions', () => ({
  setPostStatus: vi.fn(),
}))

describe('responsive admin navigation', () => {
  it('renders a compact mobile trigger and a modal navigation alongside the desktop sidebar', () => {
    const html = renderToStaticMarkup(
      React.createElement(AdminSidebar, {
        name: 'Sudi M. David',
        email: 'contact@sudi.dev',
      }),
    )

    expect(html).toContain('aria-label="Open admin navigation"')
    expect(html).toContain('<dialog')
    expect(html).toContain('aria-label="Mobile admin navigation"')
    expect(html.match(/aria-current="page"/g)).toHaveLength(2)
  })

  it('closes an open mobile dialog when the viewport enters desktop mode', () => {
    type Listener = (event: { matches: boolean }) => void
    type TestDialog = { open: boolean; close: () => void }
    type TestQuery = {
      matches: boolean
      addEventListener: (type: 'change', listener: Listener) => void
      removeEventListener: (type: 'change', listener: Listener) => void
    }
    const listeners = new Set<Listener>()
    const query: TestQuery = {
      matches: false,
      addEventListener: (_type: 'change', listener: Listener) => listeners.add(listener),
      removeEventListener: (_type: 'change', listener: Listener) => listeners.delete(listener),
    }
    const dialog: TestDialog = { open: true, close: vi.fn() }
    const onClose = vi.fn()
    const closeOnDesktop = (
      AdminSidebarModule as unknown as {
        closeMobileNavOnDesktop?: (
          dialog: TestDialog,
          query: TestQuery,
          onClose: () => void,
        ) => () => void
      }
    ).closeMobileNavOnDesktop

    expect(closeOnDesktop).toBeTypeOf('function')
    const cleanup = closeOnDesktop?.(dialog, query, onClose)
    listeners.forEach((listener) => listener({ matches: true }))

    expect(dialog.close).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()

    cleanup?.()
    expect(listeners).toHaveLength(0)
  })
})

describe('responsive posts collection', () => {
  beforeEach(() => {
    vi.mocked(getAdminPosts).mockResolvedValue([
      {
        id: 'responsive-admins',
        title: 'Responsive Admins',
        category: 'Craft',
        status: 'Published',
        date: 'Sep 9, 2026',
        views: '42',
        comments: '3',
      },
      {
        id: 'no-analytics-yet',
        title: 'No Analytics Yet',
        category: 'Craft',
        status: 'Draft',
        date: 'Sep 9, 2026',
        views: '—',
        comments: '—',
      },
    ])
    vi.mocked(getAdminPostCounts).mockResolvedValue([
      { label: 'All Posts', value: '1' },
      { label: 'Published', value: '1' },
      { label: 'Drafts', value: '0' },
      { label: 'Archived', value: '0' },
    ])
  })

  it('renders phone-friendly post cards as an alternative to the desktop table', async () => {
    const page = await AdminPostsPage({ searchParams: Promise.resolve({}) })
    const html = renderToStaticMarkup(page)

    expect(html).toContain('aria-label="Posts on small screens"')
    expect(html).toContain('Responsive Admins')
    expect(html).toContain('42 views')
    expect(html).toContain('3 comments')
    expect(html).not.toContain('— views')
    expect(html).not.toContain('— comments')
    expect(html).toContain('[scrollbar-width:none]')
    expect(html).toContain('min-h-11')
    expect(html).toContain('<dt class="text-admin-text-secondary">Published</dt>')
    expect(html).toContain('<dt class="text-admin-text-secondary">Views</dt>')
    expect(html).toContain('<dt class="text-admin-text-secondary">Comments</dt>')
    expect(html).toContain('<p class="mt-1 text-xs text-admin-text-secondary">Craft</p>')
    expect(html).toMatch(/class="[^"]*hidden[^"]*lg:block[^"]*"><table/)
  })
})

describe('responsive post editor', () => {
  it('keeps each top-bar action at least 44 pixels tall for touch input', () => {
    const html = renderToStaticMarkup(
      React.createElement(PostEditor, {
        canPublish: true,
      }),
    )

    expect(html.match(/min-h-11/g) ?? []).toHaveLength(3)
  })
})
