import { describe, expect, it } from 'vitest'
import { WARP_LEAD, activeStop, progressForStop, stopVisibility, warpTime } from './project-warp'

describe('project warp timeline', () => {
  it('maps scroll progress onto stops with a lead-in and lead-out', () => {
    expect(warpTime(0, 7)).toBeCloseTo(-WARP_LEAD)
    expect(warpTime(1, 7)).toBeCloseTo(6 + WARP_LEAD)
    expect(warpTime(-1, 7)).toBeCloseTo(-WARP_LEAD)
    expect(warpTime(2, 7)).toBeCloseTo(6 + WARP_LEAD)
  })

  it('scrolls to the exact progress where each stop is centred', () => {
    for (let index = 0; index < 7; index++) expect(warpTime(progressForStop(index, 7), 7)).toBeCloseTo(index)
  })

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
