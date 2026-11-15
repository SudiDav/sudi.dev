import { describe, expect, it } from 'vitest'
import { crownYaw, fitDistance } from './project-showcase'

describe('fitDistance', () => {
  it('backs off for the height on a wide frame', () => {
    const tan = Math.tan(Math.PI / 6)
    expect(fitDistance(1, 2, 60, 3)).toBeCloseTo(2 / tan)
  })

  it('backs off further for the width on a narrow frame', () => {
    const wide = fitDistance(5, 3, 32, 2)
    const narrow = fitDistance(5, 3, 32, 0.8)
    expect(narrow).toBeGreaterThan(wide)
    expect(narrow).toBeCloseTo(5 / (Math.tan((32 * Math.PI) / 360) * 0.8))
  })
})

describe('crownYaw', () => {
  it('faces forward at rest and for the middle monolith, and turns toward the sides', () => {
    expect(crownYaw(null)).toBe(0)
    expect(crownYaw(1)).toBe(0)
    expect(crownYaw(0)).toBeLessThan(0)
    expect(crownYaw(2)).toBe(-crownYaw(0))
  })
})
