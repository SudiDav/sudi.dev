import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '@/lib/site'

const { hooks, updateSettingsMock, editProjectMock, latestSettingsMock, latestProjectMock } = vi.hoisted(() => ({
  hooks: { values: [] as unknown[], cursor: 0, transitions: [] as Promise<unknown>[] },
  updateSettingsMock: vi.fn(), editProjectMock: vi.fn(), latestSettingsMock: vi.fn(), latestProjectMock: vi.fn(),
}))

// Match the existing editor wiring harness: exercise the real form handlers,
// keeping hook state across renders without simulating the child components.
vi.mock('react', async (original) => ({
  ...await original<typeof import('react')>(),
  useState<T>(initial: T | (() => T)) {
    const index = hooks.cursor++
    if (!(index in hooks.values)) hooks.values[index] = typeof initial === 'function' ? (initial as () => T)() : initial
    return [hooks.values[index], (value: T | ((previous: T) => T)) => {
      hooks.values[index] = typeof value === 'function' ? (value as (previous: T) => T)(hooks.values[index] as T) : value
    }]
  },
  useTransition: () => [false, (callback: () => unknown) => { hooks.transitions.push(Promise.resolve(callback())) }],
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), notFound: () => { throw new Error('not found') } }))
vi.mock('@/app/admin/actions', () => ({ updateSettings: updateSettingsMock, editProject: editProjectMock, addProject: vi.fn() }))
vi.mock('@/components/admin/cover-upload', () => ({ CoverUpload: () => null }))
vi.mock('@/components/theme-picker', () => ({ ThemePicker: () => null }))
vi.mock('@/components/admin/deployment-status', () => ({ DeploymentStatus: () => null }))
vi.mock('./(shell)/settings/actions', () => ({ signOutAction: vi.fn() }))
vi.mock('@/lib/publish', () => ({
  getLatestSettingsSnapshot: latestSettingsMock, getLatestProjectSnapshot: latestProjectMock, isPublishingConfigured: () => true,
}))
vi.mock('@/lib/content', () => ({ getProject: async () => ({ slug: 'sample', title: 'Old deployed title' }) }))

import { SettingsForm } from './(shell)/settings/settings-form'
import { ProjectForm } from './(shell)/projects/new/project-form'
import SettingsPage from './(shell)/settings/page'
import ProjectPage from './(shell)/projects/[slug]/edit/page'

type Props = { children?: ReactNode; onClick?: () => void; label?: string; value?: string }
function elements(node: ReactNode): ReactElement<Props>[] {
  if (Array.isArray(node)) return node.flatMap(elements)
  return isValidElement<Props>(node) ? [node, ...elements(node.props.children)] : []
}
function text(node: ReactNode): string {
  if (typeof node === 'string') return node
  if (Array.isArray(node)) return node.map(text).join('')
  return isValidElement<Props>(node) ? text(node.props.children) : ''
}
function click(tree: ReactNode, label: string) {
  const button = elements(tree).find(element => element.type === 'button' && text(element.props.children) === label)
  if (!button?.props.onClick) throw new Error(`Missing ${label} button`)
  button.props.onClick()
}
function renderSettings(initialVersion: string) {
  hooks.cursor = 0
  return SettingsForm({ settings: DEFAULT_SETTINGS, canPublish: true, initialVersion })
}
const project = { slug: 'sample', title: 'Current title', year: '2026', description: 'Description', tech: [], category: 'Fintech', cover: '/image.png', links: {}, body: 'Case study' }

describe('versioned content editors', () => {
  beforeEach(() => {
    hooks.values = []; hooks.cursor = 0; hooks.transitions = []
    vi.clearAllMocks()
  })
  afterEach(() => vi.restoreAllMocks())

  it('loads remote settings and their reviewed version instead of the deployed copy', async () => {
    latestSettingsMock.mockResolvedValue({ settings: { ...DEFAULT_SETTINGS, displayName: 'New remote name' }, version: 'remote-version' })
    const result = await SettingsPage()
    expect(result.props.settings.displayName).toBe('New remote name')
    expect(result.props.initialVersion).toBe('remote-version')
  })

  it('loads a fresh project and its source version before editing', async () => {
    latestProjectMock.mockResolvedValue({ project, version: 'project-version' })
    const result = await ProjectPage({ params: Promise.resolve({ slug: 'sample' }) })
    expect(result.props.project).toEqual(project)
    expect(result.props.initialVersion).toBe('project-version')
  })

  it('advances the settings version only after saving its own fields successfully', async () => {
    updateSettingsMock.mockResolvedValueOnce({ ok: true, publish: { target: 'github', contentVersion: 'saved-version' } })
    click(renderSettings('opened-version'), 'Save changes')
    await Promise.all(hooks.transitions)
    expect(updateSettingsMock).toHaveBeenLastCalledWith(DEFAULT_SETTINGS, 'opened-version')
    updateSettingsMock.mockResolvedValueOnce({ ok: true })
    click(renderSettings('unreviewed-prop-refresh'), 'Save changes')
    await Promise.all(hooks.transitions)
    expect(updateSettingsMock).toHaveBeenLastCalledWith(DEFAULT_SETTINGS, 'saved-version')
  })

  it('does not advance the settings version on a rejected save', async () => {
    updateSettingsMock.mockResolvedValue({ ok: false, error: 'Content changed. Reload.' })
    click(renderSettings('opened-version'), 'Save changes')
    await Promise.all(hooks.transitions)
    click(renderSettings('unreviewed-prop-refresh'), 'Save changes')
    await Promise.all(hooks.transitions)
    expect(updateSettingsMock).toHaveBeenLastCalledWith(DEFAULT_SETTINGS, 'opened-version')
  })

  it('submits the project version belonging to its fields despite newer props', async () => {
    editProjectMock.mockResolvedValue({ ok: true, publish: { target: 'github', contentVersion: 'saved-project' } })
    ProjectForm({ project, canPublish: true, initialVersion: 'opened-project' })
    hooks.cursor = 0
    const tree = ProjectForm({ project: { ...project, title: 'Unreviewed title' }, canPublish: true, initialVersion: 'unreviewed-version' })
    click(tree, 'Save Changes')
    await Promise.all(hooks.transitions)
    expect(editProjectMock).toHaveBeenCalledWith('sample', expect.objectContaining({ name: 'Current title', body: 'Case study' }), 'opened-project')
  })
})
