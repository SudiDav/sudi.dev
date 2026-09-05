import { describe, expect, it } from 'vitest'
import { moveRover, moveTowardSignal, collectSignals } from './world-game'

describe('rover movement', () => {
  it('keeps diagonal movement at the same speed as straight movement', () => {
    const straight = moveRover({ x: 0, z: 0 }, { x: 1, z: 0 }, 0.1)
    const diagonal = moveRover({ x: 0, z: 0 }, { x: 1, z: 1 }, 0.1)
    expect(Math.hypot(diagonal.x, diagonal.z)).toBeCloseTo(Math.hypot(straight.x, straight.z))
    expect(straight.x).toBeGreaterThan(0)
  })

  it('keeps the rover on the platform and limits jumps after a suspended frame', () => {
    const edge = moveRover({ x: 5.3, z: -5.3 }, { x: 1, z: -1 }, 0.1)
    expect(edge.x).toBeLessThanOrEqual(5.3)
    expect(edge.z).toBeGreaterThanOrEqual(-5.3)
    expect(moveRover({ x: 0, z: 0 }, { x: 1, z: 0 }, 30).x).toBeLessThanOrEqual(0.4)
  })

  it('does not move without input', () => {
    expect(moveRover({ x: 2, z: -1 }, { x: 0, z: 0 }, 0.1)).toEqual({ x: 2, z: -1 })
  })
})

describe('autopilot arrival', () => {
  it('stops exactly at each destination at low frame rates instead of oscillating', () => {
    let position = { x: 0, z: 4.6 }
    for (const target of [{ x: -3, z: -2.7 }, { x: 3, z: 2.7 }]) {
      for (let frame = 0; frame < 100; frame++) position = moveTowardSignal(position, target, 0.1)
      expect(position).toEqual(target)
    }
  })

  it('does not overshoot a nearby destination after a suspended frame', () => {
    expect(moveTowardSignal({ x: 2.95, z: 2.65 }, { x: 3, z: 2.7 }, 30)).toEqual({ x: 3, z: 2.7 })
  })
})

describe('signal collection', () => {
  const signals = [{ id: 'bank', x: 2, z: 2 }, { id: 'farm', x: -2, z: -2 }]

  it('collects only nearby signals and never awards one twice', () => {
    expect(collectSignals({ x: 2.1, z: 2 }, [], signals)).toEqual(['bank'])
    expect(collectSignals({ x: 2, z: 2 }, ['bank'], signals)).toEqual(['bank'])
    expect(collectSignals({ x: 0, z: 0 }, [], signals)).toEqual([])
  })

  it('retains earlier signals when the final destination is reached', () => {
    expect(collectSignals({ x: -2, z: -2 }, ['bank'], signals)).toEqual(['bank', 'farm'])
  })
})
