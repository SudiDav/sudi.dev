/** Read-only server content embedded by the Vite build, never a public asset. */
export function createContentReader(files: Record<string, string>) {
  function relative(path: string) {
    const value = path.replaceAll('\\', '/').split('/content/')[1]
    if (!value || value.split('/').some((part) => part === '..' || part === '.')) return undefined
    return value
  }

  function missing(path: string): never {
    throw Object.assign(new Error(`Content file not found: ${path}`), { code: 'ENOENT' })
  }

  return {
    async readFile(path: string, encoding: string): Promise<string> {
      const key = relative(path)
      if (!key || !Object.hasOwn(files, key)) return missing(path)
      if (encoding !== 'utf8' && encoding !== 'utf-8') throw new Error('Content must be read as UTF-8.')
      return files[key]
    },
    async readdir(path: string): Promise<string[]> {
      const key = relative(`${path}/`)
      if (!key || !['posts/', 'projects/'].includes(key)) return missing(path)
      return Object.keys(files).filter((file) => file.startsWith(key)).map((file) => file.slice(key.length)).sort()
    },
  }
}
