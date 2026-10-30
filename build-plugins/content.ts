import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

/** Keep Node/Vercel filesystem loading intact; embed content only for Workers. */
export function bundledContent(root: string): Plugin {
  const virtualId = 'virtual:sudi-content-fs'
  const resolvedId = `\0${virtualId}`
  const consumers = new Set(['lib/content.ts', 'lib/site.ts'].map((path) => resolve(root, path)))
  return {
    name: 'sudi-bundled-content',
    enforce: 'pre',
    resolveId(id) {
      if (id === virtualId) return resolvedId
    },
    load(id) {
      if (id !== resolvedId) return
      const files: Record<string, string> = {}
      for (const collection of ['posts', 'projects']) {
        const directory = resolve(root, 'content', collection)
        for (const name of readdirSync(directory).filter((file) => file.endsWith('.mdx'))) {
          const path = resolve(directory, name)
          this.addWatchFile(path)
          files[`${collection}/${name}`] = readFileSync(path, 'utf8')
        }
      }
      const settings = resolve(root, 'content/site.json')
      this.addWatchFile(settings)
      files['site.json'] = readFileSync(settings, 'utf8')
      return `import 'server-only';
import { createContentReader } from ${JSON.stringify(resolve(root, 'lib/bundled-content.ts'))};
export const { readFile, readdir } = createContentReader(${JSON.stringify(files)});`
    },
    transform(code, id) {
      if (!consumers.has(id.split('?')[0])) return
      return { code: code.replaceAll("from 'node:fs/promises'", `from '${virtualId}'`), map: null }
    },
  }
}
