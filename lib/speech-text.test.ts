import { describe, it, expect } from 'vitest'
import { toSpeech } from './speech-text'

const spoken = (mdx: string) => toSpeech(mdx).join(' ')

describe('toSpeech', () => {
  it('drops emoji rather than reading their names aloud', () => {
    const text = spoken('We laughed about it 😂 and moved on.')
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u)
    expect(text).toContain('We laughed about it')
  })

  it('keeps the words inside emphasis but not the markers', () => {
    expect(spoken('It is **time** and _presence_.')).toBe('It is time and presence.')
  })

  it('reads link text without the URL', () => {
    expect(spoken('See [the docs](https://example.com/a/b?c=d) for more.')).toBe(
      'See the docs for more.',
    )
  })

  it('skips code blocks entirely', () => {
    const text = spoken('Before.\n\n```ts\nconst x: number = 1\n```\n\nAfter.')
    expect(text).not.toContain('const')
    expect(text).toContain('Before.')
    expect(text).toContain('After.')
  })

  it('drops images but keeps surrounding prose', () => {
    expect(spoken('Look ![a diagram](/img.png) here.')).toBe('Look here.')
  })

  it('strips heading and blockquote markers, keeping the text', () => {
    const text = spoken('## A Heading\n\n> A quoted line.')
    expect(text).toContain('A Heading')
    expect(text).toContain('A quoted line.')
    expect(text).not.toContain('#')
    expect(text).not.toContain('>')
  })

  it('removes MDX comments', () => {
    expect(spoken('Kept.\n\n<!-- TODO: not spoken -->\n\nAlso kept.')).not.toContain('TODO')
  })

  it('turns an em dash into a pause rather than a word', () => {
    expect(spoken('Love is not just being there — it is being there.')).toContain(
      'being there, it is being there',
    )
  })

  it('splits into sentences so playback can be chunked', () => {
    // Chrome stops on long single utterances, so chunking is required.
    const chunks = toSpeech(
      'The first sentence is long enough to stand entirely on its own here. ' +
        'The second one is also comfortably past the merge threshold in length.',
    )
    expect(chunks).toHaveLength(2)
  })

  it('merges very short fragments into their neighbour', () => {
    // "No." alone would stutter; it should ride along with what follows.
    const chunks = toSpeech('No. That is not what I meant when I said it.')
    expect(chunks).toHaveLength(1)
  })

  it('returns nothing for content with no prose', () => {
    expect(toSpeech('```\ncode only\n```')).toEqual([])
  })
})
