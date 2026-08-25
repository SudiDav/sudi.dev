import { describe, expect, it } from 'vitest'
import nextConfig from '../next.config'

describe('server action upload configuration', () => {
  it('allows the cover upload component to accept its 5MB file limit', () => {
    expect(nextConfig.experimental?.serverActions?.bodySizeLimit).toBe('6mb')
  })
})
