import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { generateCompletion } from './ai-provider'

const API_KEY = 'sk-test-secret-that-must-not-leak'

describe('generateCompletion', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubEnv('AI_API_KEY', API_KEY)
    vi.stubEnv('AI_MODEL', 'small-writer')
    vi.stubEnv('AI_BASE_URL', '')
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('requires an API key and model', async () => {
    vi.stubEnv('AI_API_KEY', '')
    await expect(generateCompletion({ system: 'system', user: 'user' })).rejects.toThrow(/AI_API_KEY/)

    vi.stubEnv('AI_API_KEY', API_KEY)
    vi.stubEnv('AI_MODEL', '')
    await expect(generateCompletion({ system: 'system', user: 'user' })).rejects.toThrow(/AI_MODEL/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('uses the compatible chat completion request with the default endpoint', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ choices: [{ message: { content: 'Generated text' } }] }))

    await expect(generateCompletion({ system: 'Be useful', user: 'Write an article' })).resolves.toBe('Generated text')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'small-writer',
          messages: [
            { role: 'system', content: 'Be useful' },
            { role: 'user', content: 'Write an article' },
          ],
          max_tokens: 3_500,
        }),
        signal: expect.any(AbortSignal),
      }),
    )
  })

  it('uses a custom base URL and output token limit', async () => {
    vi.stubEnv('AI_BASE_URL', 'https://models.example/v1///')
    fetchMock.mockResolvedValueOnce(Response.json({ choices: [{ message: { content: 'Text' } }] }))

    await generateCompletion({ system: 's', user: 'u', maxOutputTokens: 500 })

    expect(fetchMock.mock.calls[0][0]).toBe('https://models.example/v1/chat/completions')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ max_tokens: 500 })
  })

  it('returns a bounded error without exposing a key when the provider rejects the request', async () => {
    fetchMock.mockResolvedValueOnce(new Response(API_KEY, { status: 429 }))

    const error = await generateCompletion({ system: 's', user: 'u' }).catch((caught: Error) => caught)

    expect(error).toBeInstanceOf(Error)
    expect(error.message).toMatch(/429/)
    expect(error.message).not.toContain(API_KEY)
  })

  it('rejects empty or non-text responses', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ choices: [{ message: { content: '' } }] }))
    await expect(generateCompletion({ system: 's', user: 'u' })).rejects.toThrow(/empty/i)

    fetchMock.mockResolvedValueOnce(Response.json({ choices: [{ message: { content: ['not text'] } }] }))
    await expect(generateCompletion({ system: 's', user: 'u' })).rejects.toThrow(/empty/i)
  })

  it('converts a request timeout into a sanitized error', async () => {
    fetchMock.mockRejectedValueOnce(new DOMException(API_KEY, 'TimeoutError'))

    const error = await generateCompletion({ system: 's', user: 'u' }).catch((caught: Error) => caught)

    expect(error).toBeInstanceOf(Error)
    expect(error.message).toMatch(/timed out/i)
    expect(error.message).not.toContain(API_KEY)
  })
})
