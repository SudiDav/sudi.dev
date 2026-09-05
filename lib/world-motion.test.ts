import { describe, expect, it } from 'vitest'
import { yinYangImpulse } from './world-motion'

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
