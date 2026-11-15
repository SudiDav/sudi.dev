import { describe, expect, it } from 'vitest'
import { cosmosIntro, yinYangImpulse } from './world-motion'

describe('yin and yang impulse', () => {
  it('starts at rest, bounces upward, and settles after one turn', () => {
    expect(yinYangImpulse(0)).toEqual({ bounce: 0, turn: 0, active: true })
    expect(yinYangImpulse(0.15).bounce).toBeGreaterThan(0.4)
    expect(yinYangImpulse(2)).toEqual({ bounce: 0, turn: Math.PI * 2, active: false })
  })

  it('settles safely when a hidden tab resumes long after a tap', () => {
    expect(yinYangImpulse(60)).toEqual({ bounce: 0, turn: Math.PI * 2, active: false })
  })
})

describe('cosmos intro', () => {
  it('starts with everything gathered at the core and the logo apart', () => {
    const start = cosmosIntro(0)
    expect(start.symbolScale).toBe(0)
    expect(start.logoScale).toBe(0)
    expect(start.logoApart).toBe(1)
    expect(start.planetScale(0)).toBe(0)
    expect(start.stars).toBe(0)
    expect(start.active).toBe(true)
  })

  it('locks the logo halves together and reveals planets one after another', () => {
    const middle = cosmosIntro(1.1)
    expect(middle.logoApart).toBeGreaterThan(0)
    expect(middle.logoApart).toBeLessThan(1)
    expect(middle.planetScale(0)).toBeGreaterThan(middle.planetScale(4))
  })

  it('rests at the final pose, including when a hidden tab resumes late', () => {
    for (const seconds of [3, 60]) {
      const end = cosmosIntro(seconds)
      expect(end).toMatchObject({ symbolScale: 1, symbolTurn: 0, logoScale: 1, logoApart: 0, stars: 1, active: false })
      expect(end.planetScale(4)).toBe(1)
    }
  })
})
