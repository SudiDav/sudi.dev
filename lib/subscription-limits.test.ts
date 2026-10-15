import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

describe('reserveSubscription', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-15T00:00:00.000Z'))
    vi.resetModules()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  async function reserveSubscription() {
    return (await import('./subscription-limits')).reserveSubscription
  }

  it('admits only one request per normalized address in ten minutes', async () => {
    const reserve = await reserveSubscription()

    expect(reserve(' Reader@Example.com ')).toBe(true)
    expect(reserve('reader@example.com')).toBe(false)
    expect(reserve('other@example.com')).toBe(true)
  })

  it('caps accepted requests at twenty per rolling minute and resets the budget', async () => {
    const reserve = await reserveSubscription()

    for (let index = 0; index < 20; index++) {
      expect(reserve(`reader-${index}@example.com`)).toBe(true)
    }
    expect(reserve('reader-20@example.com')).toBe(false)

    vi.advanceTimersByTime(60_000)
    expect(reserve('reader-20@example.com')).toBe(true)
  })

  it('expires per-address entries after ten minutes and keeps the map bounded', async () => {
    const reserve = await reserveSubscription()

    for (let minute = 0; minute < 10; minute++) {
      for (let index = 0; index < 20; index++) {
        expect(reserve(`reader-${minute}-${index}@example.com`)).toBe(true)
      }
      if (minute < 9) vi.advanceTimersByTime(60_000)
    }

    vi.advanceTimersByTime(60_000)
    expect(reserve('reader-0-0@example.com')).toBe(true)
  })

  it('admits concurrent callers synchronously against one shared budget', async () => {
    const reserve = await reserveSubscription()

    const results = Array.from({ length: 30 }, (_, index) => reserve(`parallel-${index}@example.com`))

    expect(results.filter(Boolean)).toHaveLength(20)
    expect(results.filter((allowed) => !allowed)).toHaveLength(10)
  })
})
