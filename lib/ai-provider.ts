import 'server-only'

type CompletionInput = {
  system: string
  user: string
  maxOutputTokens?: number
}

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: unknown } }>
}

const DEFAULT_BASE_URL = 'https://api.openai.com/v1'
const REQUEST_TIMEOUT_MS = 30_000

export async function generateCompletion({
  system,
  user,
  maxOutputTokens = 3_500,
}: CompletionInput): Promise<string> {
  const apiKey = process.env.AI_API_KEY?.trim()
  const model = process.env.AI_MODEL?.trim()
  if (!apiKey) throw new Error('AI_API_KEY is required to generate article content.')
  if (!model) throw new Error('AI_MODEL is required to generate article content.')

  const baseUrl = (process.env.AI_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, '')
  let response: Response
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        max_tokens: maxOutputTokens,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (error) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new Error('AI provider request timed out.')
    }
    throw new Error('AI provider request failed before receiving a response.')
  }

  if (!response.ok) throw new Error(`AI provider request failed (HTTP ${response.status}).`)

  let payload: ChatCompletionResponse
  try {
    payload = (await response.json()) as ChatCompletionResponse
  } catch {
    throw new Error('AI provider returned an invalid response.')
  }

  const content = payload.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('AI provider returned empty text content.')
  }
  return content
}
