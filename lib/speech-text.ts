/**
 * Turn a post's MDX into something worth listening to.
 *
 * Reading raw markdown aloud is unbearable: the synthesiser announces every
 * asterisk, reads URLs character by character, and — for a post like the essay
 * — says "face with tears of joy" out loud, repeatedly. So the markup comes out
 * and the prose stays.
 */

/** Split into sentences so playback can be chunked and tracked. */
export function toSpeech(mdx: string): string[] {
  const prose = stripMarkdown(mdx)
  return chunk(prose)
}

/**
 * Clean a single run of already-rendered text for the synthesiser.
 *
 * Text taken from the DOM has no markup left, but it still carries emoji and
 * typography that the voice handles badly.
 */
export function forSpeech(text: string): string {
  let out = stripEmoji(text)
  out = out.replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
  out = out.replace(/\s*—\s*/g, ', ')
  return out.replace(/\s+/g, ' ').trim()
}

function stripMarkdown(input: string): string {
  let text = input

  // Fenced code, then inline code. Nobody wants a stack trace read to them.
  text = text.replace(/```[\s\S]*?```/g, ' ')
  text = text.replace(/`([^`]+)`/g, '$1')

  // Images before links — an image's alt text is not part of the prose.
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')

  // HTML and MDX comments, then any remaining tags.
  text = text.replace(/<!--[\s\S]*?-->/g, ' ')
  text = text.replace(/<[^>]+>/g, ' ')

  // Headings, blockquote markers and list bullets lose their punctuation but
  // keep their words; a heading gets a full stop so the voice pauses on it.
  text = text.replace(/^\s{0,3}#{1,6}\s+(.*)$/gm, '$1.')
  text = text.replace(/^\s{0,3}>\s?/gm, '')
  text = text.replace(/^\s{0,3}[-*+]\s+/gm, '')
  text = text.replace(/^\s{0,3}\d+\.\s+/gm, '')

  // Emphasis markers, kept as plain words.
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1')
  text = text.replace(/\*([^*]+)\*/g, '$1')
  text = text.replace(/__([^_]+)__/g, '$1')
  text = text.replace(/_([^_]+)_/g, '$1')

  // Horizontal rules.
  text = text.replace(/^\s{0,3}([-*_])\s*(?:\1\s*){2,}$/gm, ' ')

  text = stripEmoji(text)

  // Typographic characters the synthesiser handles badly.
  text = text.replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
  // An em dash reads better as a pause than as the word "dash".
  text = text.replace(/\s*—\s*/g, ', ')

  return text.replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n\n').trim()
}

/**
 * Remove emoji and their modifiers.
 *
 * Without this the voice reads each one by its Unicode name, which is
 * absurd in prose that uses them as tone rather than content.
 */
function stripEmoji(text: string): string {
  return text
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/[\u{1F3FB}-\u{1F3FF}\u{FE0F}\u{200D}\u{20E3}]/gu, '')
}

/**
 * Break prose into utterance-sized pieces.
 *
 * Chrome stops speaking after roughly fifteen seconds on a single long
 * utterance, so long text has to be queued in pieces regardless of preference.
 * Sentences are the natural unit, and they also give playback something to
 * report progress against.
 */
function chunk(text: string): string[] {
  const sentences = text
    .split(/(?<=[.!?])\s+|\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean)

  // Merge very short fragments into their neighbour so playback does not
  // stutter over "No." or "Listen."
  const merged: string[] = []
  for (const sentence of sentences) {
    const previous = merged[merged.length - 1]
    if (previous && previous.length < 40 && (previous + ' ' + sentence).length < 240) {
      merged[merged.length - 1] = `${previous} ${sentence}`
    } else {
      merged.push(sentence)
    }
  }
  return merged
}
