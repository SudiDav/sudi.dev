import { forSpeech } from './speech-text'

export type SpokenSentence = {
  /** What the synthesiser says — markup gone, emoji gone. */
  text: string
  /** Where it sits in the rendered article, for highlighting. */
  range: Range
}

/** Blocks worth reading. Code, figures and the like are skipped entirely. */
const READABLE = 'p, li, blockquote, h2, h3, h4'

/**
 * Read sentences out of the rendered article rather than out of the source.
 *
 * Both the audio and the highlight then come from the same place, so they
 * cannot drift apart — which is exactly what happens if you speak the raw MDX
 * and try to match it back against the DOM afterwards, where the markup, the
 * link URLs and the emoji have all changed the character offsets.
 */
export function collectSentences(container: HTMLElement): SpokenSentence[] {
  const sentences: SpokenSentence[] = []

  for (const block of container.querySelectorAll<HTMLElement>(READABLE)) {
    // Nested blocks (a <p> inside a <blockquote>) would otherwise be read twice.
    if (block.parentElement?.closest(READABLE) && block.matches('p')) continue
    if (block.closest('pre')) continue

    sentences.push(...splitBlock(block))
  }

  return sentences
}

/** Every text node under a block, with its start offset in the block's text. */
function textNodes(block: HTMLElement) {
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, {
    // Skip anything inside a code sample.
    acceptNode: (node) =>
      node.parentElement?.closest('pre, code')
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT,
  })

  const nodes: { node: Text; start: number }[] = []
  let offset = 0
  let current = walker.nextNode() as Text | null
  while (current) {
    nodes.push({ node: current, start: offset })
    offset += current.data.length
    current = walker.nextNode() as Text | null
  }
  return { nodes, total: offset }
}

/** Resolve an offset in the block's concatenated text to a node and position. */
function locate(nodes: { node: Text; start: number }[], offset: number) {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const entry = nodes[i]
    if (offset >= entry.start) {
      return { node: entry.node, offset: Math.min(offset - entry.start, entry.node.data.length) }
    }
  }
  return null
}

function splitBlock(block: HTMLElement): SpokenSentence[] {
  const { nodes, total } = textNodes(block)
  if (!nodes.length || total === 0) return []

  const full = nodes.map((n) => n.node.data).join('')
  const out: SpokenSentence[] = []

  // Sentence ends: after . ! ? followed by whitespace, plus the block's end.
  const boundaries: number[] = []
  const matcher = /[.!?]["')\]]?\s+/g
  let match: RegExpExecArray | null
  while ((match = matcher.exec(full))) boundaries.push(match.index + match[0].length)
  boundaries.push(full.length)

  let start = 0
  for (const end of boundaries) {
    const raw = full.slice(start, end)
    if (raw.trim()) {
      // Trim whitespace off the ends so the highlight hugs the words.
      const leading = raw.length - raw.trimStart().length
      const trailing = raw.length - raw.trimEnd().length
      const from = locate(nodes, start + leading)
      const to = locate(nodes, end - trailing)

      const text = forSpeech(raw)
      if (from && to && text) {
        const range = document.createRange()
        range.setStart(from.node, from.offset)
        range.setEnd(to.node, to.offset)
        out.push({ text, range })
      }
    }
    start = end
  }

  return merge(out)
}

/**
 * Fold very short sentences into the one before them.
 *
 * "No." on its own makes the voice stutter and the highlight flicker; joined to
 * what follows it reads as speech.
 */
function merge(sentences: SpokenSentence[]): SpokenSentence[] {
  const merged: SpokenSentence[] = []
  for (const sentence of sentences) {
    const previous = merged[merged.length - 1]
    if (previous && previous.text.length < 40) {
      const range = document.createRange()
      range.setStart(previous.range.startContainer, previous.range.startOffset)
      range.setEnd(sentence.range.endContainer, sentence.range.endOffset)
      merged[merged.length - 1] = { text: `${previous.text} ${sentence.text}`, range }
    } else {
      merged.push(sentence)
    }
  }
  return merged
}
