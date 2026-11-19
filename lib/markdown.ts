import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { toJsxRuntime, type Components } from 'hast-util-to-jsx-runtime'
import { Fragment, jsx, jsxs } from 'react/jsx-runtime'

const processor = unified().use(remarkParse).use(remarkRehype)

export function parseMarkdown(source: string) {
  return processor.runSync(processor.parse(source))
}

/** Plain Markdown becomes React elements, without eval or generated functions. */
export function Markdown({ source, components }: { source: string; components: Partial<Components> }) {
  return toJsxRuntime(parseMarkdown(source), { Fragment, jsx, jsxs, components })
}
