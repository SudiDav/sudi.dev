import { describe, expect, it } from 'vitest'
import { WARP_LEAD, activeStop, stepStop, stopVisibility, swipeStep } from './project-warp'

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

  it('steps to the next or previous stop, staying inside the collection', () => {
    expect(stepStop(2, 1, 7)).toBe(3)
    expect(stepStop(2, -1, 7)).toBe(1)
    expect(stepStop(0, -1, 7)).toBe(0)
    expect(stepStop(6, 1, 7)).toBe(6)
  })

  it('reads a clear horizontal swipe as a step, and anything else as none', () => {
    expect(swipeStep(-80, 10)).toBe(1)
    expect(swipeStep(80, -10)).toBe(-1)
    expect(swipeStep(-30, 0)).toBe(0)
    expect(swipeStep(-80, 70)).toBe(0)
    // The edges count: exactly 50px, and exactly one and a half times the vertical movement.
    expect(swipeStep(-50, 0)).toBe(1)
    expect(swipeStep(-75, 50)).toBe(1)
    expect(swipeStep(-49, 0)).toBe(0)
    expect(swipeStep(-74, 50)).toBe(0)
  })
})
