import { describe, expect, it } from 'vitest'
import { WARP_LEAD, activeStop, stopVisibility } from './project-warp'

describe('project warp timeline', () => {
  it('shows a stop only while the camera is near it', () => {
    expect(stopVisibility(3, 3)).toBe(1)
    expect(stopVisibility(3.2, 3)).toBeGreaterThan(0.5)
    expect(stopVisibility(3.5, 3)).toBe(0)
    expect(stopVisibility(2, 3)).toBe(0)
  })

  it('reports the nearest stop, clamped to the collection', () => {
    expect(activeStop(-WARP_LEAD, 7)).toBe(0)
    expect(activeStop(2.6, 7)).toBe(3)
    expect(activeStop(6 + WARP_LEAD, 7)).toBe(6)
  })
})
