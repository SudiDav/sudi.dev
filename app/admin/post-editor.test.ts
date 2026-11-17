import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Post } from '@/lib/content.types'
import type { ActionResult } from '@/app/admin/actions'

const { hooks, updatePostMock, publishReviewedPostMock, addPostMock, replaceMock, reloadMock } = vi.hoisted(() => ({
  hooks: { values: [] as unknown[], cursor: 0, pending: false, transitions: [] as Promise<void>[] },
  updatePostMock: vi.fn(),
  publishReviewedPostMock: vi.fn(),
  addPostMock: vi.fn(),
  replaceMock: vi.fn(),
  reloadMock: vi.fn(),
}))

// This is a component-wiring harness, not a React renderer. Only PostEditor's
// hooks run: state slots survive explicit render() calls; transitions expose
// pending until their callback promise settles. Children are traversed as
// elements without mounting them. No DOM events or React scheduling are tested.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    useState<T>(initial: T | (() => T)) {
      const slot = hooks.cursor++
      if (!(slot in hooks.values)) {
        hooks.values[slot] = typeof initial === 'function' ? (initial as () => T)() : initial
      }
      const setValue = (value: T | ((previous: T) => T)) => {
        hooks.values[slot] = typeof value === 'function'
          ? (value as (previous: T) => T)(hooks.values[slot] as T)
          : value
      }
      return [hooks.values[slot] as T, setValue]
    },
    useTransition() {
      return [hooks.pending, (callback: () => void | Promise<void>) => {
        hooks.pending = true
        const transition = Promise.resolve(callback()).finally(() => { hooks.pending = false })
        hooks.transitions.push(transition)
      }]
    },
  }
})

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: replaceMock }) }))
vi.mock('@/app/admin/actions', () => ({
  updatePost: updatePostMock,
  publishReviewedPost: publishReviewedPostMock,
  addPost: addPostMock,
}))
vi.mock('@/components/admin/deployment-status', () => ({ DeploymentStatus: () => null }))
vi.mock('@/components/admin/newsletter-status', () => ({ NewsletterStatus: () => null }))

import { PostEditor } from '@/app/admin/posts/[id]/edit/post-editor'

type ElementProps = {
  children?: ReactNode
  'aria-label'?: string
  label?: string
  value?: string
  disabled?: boolean
  onClick?: () => void
  onChange?: (event: { target: { value: string } }) => void
}
type TestElement = ReactElement<ElementProps>
type EditorProps = Parameters<typeof PostEditor>[0]

const reviewedPost: Post = {
  slug: 'reviewed-post', title: 'Reviewed title', excerpt: 'Reviewed excerpt',
  body: 'Reviewed body.', date: '2026-10-14', readingTime: '1 min read',
  category: 'Craft', cover: '/images/reviewed.png', featured: false, status: 'Draft',
}
const editorProps: EditorProps = { post: reviewedPost, initialVersion: 'original-review', canPublish: true }

function render(props = editorProps) {
  hooks.cursor = 0
  return PostEditor(props)
}

function elements(node: ReactNode): TestElement[] {
  if (Array.isArray(node)) return node.flatMap(elements)
  if (!isValidElement<ElementProps>(node)) return []
  return [node, ...elements(node.props.children)]
}

function text(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(text).join('')
  return isValidElement<ElementProps>(node) ? text(node.props.children) : ''
}

function button(tree: ReactNode, name: string) {
  const match = elements(tree).find((element) => element.type === 'button' && text(element.props.children) === name)
  if (!match) throw new Error(`Missing button: ${name}`)
  return match.props
}

function field(tree: ReactNode, label: string) {
  const match = elements(tree).find((element) => element.props['aria-label'] === label)
  if (!match) throw new Error(`Missing field: ${label}`)
  return match.props
}

function statusSelect(tree: ReactNode) {
  const section = elements(tree).find((element) => element.props.label === 'Status')
  const select = elements(section).find((element) => element.type === 'select')
  if (!select) throw new Error('Missing status select')
  return select
}

async function settle() {
  await Promise.all(hooks.transitions)
}

describe('reviewed post editor wiring', () => {
  beforeEach(() => {
    hooks.values = []
    hooks.cursor = 0
    hooks.pending = false
    hooks.transitions = []
    updatePostMock.mockReset()
    publishReviewedPostMock.mockReset()
    addPostMock.mockReset()
    replaceMock.mockReset()
    reloadMock.mockReset()
    vi.stubGlobal('window', { location: { reload: reloadMock } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('disables dirty publication and guards even a direct call to its handler', async () => {
    let tree = render()
    field(tree, 'Post title').onChange!({ target: { value: 'Unsaved title' } })
    tree = render()

    expect(field(tree, 'Post title').value).toBe('Unsaved title')
    expect(button(tree, 'Publish').disabled).toBe(true)
    expect(button(tree, 'Publish post').disabled).toBe(true)
    button(tree, 'Publish').onClick!()
    button(tree, 'Publish post').onClick!()
    await settle()

    expect(publishReviewedPostMock).not.toHaveBeenCalled()
    expect(updatePostMock).not.toHaveBeenCalled()
  })

  it('keeps refreshed props from advancing the version behind the reviewed fields', async () => {
    publishReviewedPostMock.mockResolvedValueOnce({ ok: true, publish: {
      target: 'github', postVersion: 'published-version', post: { ...reviewedPost, status: 'Published' },
    } })
    render()
    const tree = render({
      ...editorProps,
      post: { ...reviewedPost, title: 'Later remote title', body: 'Later remote body.' },
      initialVersion: 'later-unreviewed-version',
    })

    expect(field(tree, 'Post title').value).toBe('Reviewed title')
    expect(field(tree, 'Post body (MDX)').value).toBe('Reviewed body.')
    expect(button(tree, 'Publish').disabled).toBe(false)
    expect(button(tree, 'Publish post').disabled).toBe(false)
    button(tree, 'Publish post').onClick!()
    await settle()

    expect(publishReviewedPostMock).toHaveBeenCalledExactlyOnceWith('reviewed-post', 'original-review')
    expect(updatePostMock).not.toHaveBeenCalled()
    const publishedTree = render()
    expect(statusSelect(publishedTree).props.value).toBe('Published')
    expect(elements(statusSelect(publishedTree).props.children).find((option) => option.props.value === 'Published')?.props.disabled).toBe(false)
  })

  it('preserves stale-save edits and blocks both controls until explicit reload', async () => {
    updatePostMock.mockResolvedValueOnce({ ok: false, code: 'post_conflict', error: 'Source changed' })
    let tree = render()
    field(tree, 'Post body (MDX)').onChange!({ target: { value: 'My unsaved body.' } })
    tree = render()
    button(tree, 'Save').onClick!()
    await settle()
    tree = render()

    expect(updatePostMock).toHaveBeenCalledExactlyOnceWith('reviewed-post', {
      title: 'Reviewed title', excerpt: 'Reviewed excerpt', body: 'My unsaved body.',
      category: 'Craft', cover: '/images/reviewed.png', status: 'Draft', readingTime: '1 min read',
    }, 'original-review')
    expect(field(tree, 'Post body (MDX)').value).toBe('My unsaved body.')
    expect(button(tree, 'Save').disabled).toBe(true)
    expect(button(tree, 'Publish').disabled).toBe(true)
    expect(button(tree, 'Publish post').disabled).toBe(true)
    button(tree, 'Publish').onClick!()
    button(tree, 'Publish post').onClick!()
    await settle()
    expect(publishReviewedPostMock).not.toHaveBeenCalled()
    expect(reloadMock).not.toHaveBeenCalled()
    button(tree, 'Reload and review latest draft').onClick!()
    expect(reloadMock).toHaveBeenCalledOnce()
  })

  it('freezes fields while saving and adopts canonical fields and version together', async () => {
    let finishSave!: (result: ActionResult) => void
    updatePostMock.mockReturnValueOnce(new Promise<ActionResult>((resolve) => { finishSave = resolve }))
    const canonical: Post = {
      ...reviewedPost, title: 'Canonical title', excerpt: 'Canonical excerpt', body: 'Canonical body.',
      category: 'DevOps', cover: '/images/canonical.png',
    }
    let tree = render()
    field(tree, 'Post title').onChange!({ target: { value: 'Submitted title' } })
    tree = render()
    button(tree, 'Save').onClick!()
    tree = render()

    const editableFields = elements(tree).filter((element) =>
      ['input', 'textarea', 'select'].includes(String(element.type)),
    )
    expect(editableFields).toHaveLength(6)
    expect(editableFields.every((element) => element.props.disabled === true)).toBe(true)
    expect(button(tree, 'Save').disabled).toBe(true)
    expect(button(tree, 'Publish').disabled).toBe(true)
    expect(button(tree, 'Publish post').disabled).toBe(true)

    finishSave({ ok: true, publish: { target: 'github', post: canonical, postVersion: 'canonical-version' } })
    await settle()
    tree = render()
    expect(field(tree, 'Post title').value).toBe('Canonical title')
    expect(field(tree, 'Post subtitle').value).toBe('Canonical excerpt')
    expect(field(tree, 'Post body (MDX)').value).toBe('Canonical body.')
    expect(field(tree, 'Cover image path').value).toBe('/images/canonical.png')
    expect(elements(tree).find((element) => element.type === 'select' && element.props.value === 'DevOps')).toBeDefined()
    expect(button(tree, 'Publish').disabled).toBe(false)
    expect(field(tree, 'Post title').disabled).toBe(false)

    publishReviewedPostMock.mockResolvedValueOnce({ ok: true })
    button(tree, 'Publish').onClick!()
    await settle()
    expect(publishReviewedPostMock).toHaveBeenCalledExactlyOnceWith('reviewed-post', 'canonical-version')
  })

  it('shows every status but permits only Draft and Archived creation, clamping a crafted Published value to Draft', async () => {
    const newProps: EditorProps = { canPublish: true }
    addPostMock.mockResolvedValue({ ok: false, error: 'Fixture leaves the form open' })
    let tree = render(newProps)
    const options = elements(statusSelect(tree).props.children)
    expect(options.map((option) => option.props.value)).toEqual(['Draft', 'Published', 'Archived'])
    expect(options.filter((option) => !option.props.disabled).map((option) => option.props.value)).toEqual(['Draft', 'Archived'])
    expect(elements(tree).filter((element) => element.type === 'button').map((element) => text(element.props.children))).toEqual(['Create draft'])
    field(tree, 'Post title').onChange!({ target: { value: 'New title' } })

    for (const [selected, expected] of [['Draft', 'Draft'], ['Archived', 'Archived'], ['Published', 'Draft']]) {
      tree = render(newProps)
      statusSelect(tree).props.onChange!({ target: { value: selected } })
      tree = render(newProps)
      button(tree, 'Create draft').onClick!()
      await settle()
      expect(addPostMock).toHaveBeenLastCalledWith({
        title: 'New title', excerpt: '', body: '', category: '.NET', cover: '', status: expected,
      })
    }
    expect(addPostMock).toHaveBeenCalledTimes(3)
    expect(publishReviewedPostMock).not.toHaveBeenCalled()
    expect(updatePostMock).not.toHaveBeenCalled()
  })
})
