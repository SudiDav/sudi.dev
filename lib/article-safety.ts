import { createProcessor } from '@mdx-js/mdx'

const markdownNodes = new Set([
  'root', 'text', 'paragraph', 'heading', 'blockquote', 'list', 'listItem', 'strong', 'emphasis',
  'thematicBreak', 'break', 'code', 'inlineCode', 'link', 'image',
  'linkReference', 'imageReference', 'definition',
])

type MarkdownNode = {
  type: string
  children?: MarkdownNode[]
  url?: string
  identifier?: string
}

function validateDestination(destination: string, image = false): void {
  // Markdown parsing already resolves character references. Also inspect percent
  // escapes without changing the source, so encoded controls or schemes cannot
  // evade the policy. Repeated decoding is bounded by the shrinking string.
  let decoded = destination
  // Replace invalid UTF-8 bytes while retaining all decoded ASCII controls and
  // Unicode formatting characters. Keep a decoded BOM as text for inspection.
  // A literal percent path such as 100%25data must not fail when the next pass
  // encounters %da; that byte is harmless, but adjacent %09 still must reject.
  const decoder = new TextDecoder('utf-8', { ignoreBOM: true })
  while (/%[\da-f]{2}/i.test(decoded)) {
    decoded = decoded.replace(/(?:%[\da-f]{2})+/gi, (escapes) => {
      const bytes = escapes.match(/%[\da-f]{2}/gi)!.map((escape) => Number.parseInt(escape.slice(1), 16))
      return decoder.decode(new Uint8Array(bytes))
    })
  }

  if (/[\p{Cc}\p{Cf}\\]/u.test(decoded) || decoded !== decoded.trim() || decoded.startsWith('//')) {
    throw new Error('Article body contains an unsafe URL.')
  }

  // An explicit scheme must be approved. Otherwise permit local paths, query
  // strings, and fragments. URL parsing also catches invalid absolute URLs.
  const scheme = /^([^/?#]*):/.exec(decoded)?.[1]?.toLowerCase()
  if (scheme !== undefined && !['http', 'https', ...(image ? [] : ['mailto'])].includes(scheme)) {
    throw new Error('Article body contains an unsafe URL protocol.')
  }
  try {
    const url = new URL(decoded, 'https://article.invalid/')
    if (!['http:', 'https:', ...(image ? [] : ['mailto:'])].includes(url.protocol)) {
      throw new Error('Unsafe URL protocol')
    }
  } catch {
    throw new Error('Article body contains an invalid URL.')
  }
}

/**
 * Validate the same MDX grammar used by ArticleBody, without compiling or
 * executing it. Only ordinary Markdown is accepted; JSX, raw HTML, imports,
 * exports, and expressions are rejected. Literal code remains ordinary text.
 * The original source is never transformed or silently stripped.
 */
export function validateArticleBody(body: string): void {
  let tree: MarkdownNode
  try {
    tree = createProcessor().parse(body)
  } catch {
    throw new Error('Article body must be valid Markdown.')
  }

  const definitions = new Map<string, string>()
  const imageReferences: string[] = []

  function visit(node: MarkdownNode): void {
    if (!markdownNodes.has(node.type)) {
      throw new Error('Article body must contain only safe Markdown; HTML and executable MDX are not allowed.')
    }

    if (node.type === 'link' || node.type === 'image' || node.type === 'definition') {
      validateDestination(node.url!, node.type === 'image')
      if (node.type === 'definition') {
        // CommonMark uses the first definition for each case-insensitive label.
        const identifier = node.identifier!.toLowerCase()
        if (!definitions.has(identifier)) definitions.set(identifier, node.url!)
      }
    }
    if (node.type === 'imageReference') imageReferences.push(node.identifier!.toLowerCase())
    for (const child of node.children ?? []) visit(child)
  }

  visit(tree)
  for (const identifier of imageReferences) {
    const destination = definitions.get(identifier)
    if (destination !== undefined) validateDestination(destination, true)
  }
}
