import { readFile, readdir, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const require = createRequire(new URL('../../web/package.json', import.meta.url))
const matter = require('gray-matter')
const statuses = new Set(['Published', 'Draft', 'Archived'])

function requiredString(value, field, file) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${file}: ${field} is required`)
  return value
}

async function collection(contentRoot, name) {
  const files = (await readdir(join(contentRoot, name))).filter(file => file.endsWith('.mdx')).sort()
  return Promise.all(files.map(async file => {
    const slug = file.slice(0, -4)
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug === 'new') throw new Error(`${file}: invalid slug`)
    const { data, content } = matter(await readFile(join(contentRoot, name, file), 'utf8'))
    return { slug, data, body: content, file }
  }))
}

/** Parse data only. Article MDX is preserved as text and is never executed. */
export async function exportContent(contentRoot) {
  const [posts, projects, settingsJson] = await Promise.all([
    collection(contentRoot, 'posts'), collection(contentRoot, 'projects'), readFile(join(contentRoot, 'site.json'), 'utf8'),
  ])
  const settings = JSON.parse(settingsJson)
  requiredString(settings.displayName, 'displayName', 'site.json')
  return {
    formatVersion: 1,
    posts: posts.map(({ slug, data, body, file }) => {
      const status = data.status ?? 'Published'
      if (!statuses.has(status)) throw new Error(`${file}: invalid status ${status}`)
      const date = data.date instanceof Date ? data.date.toISOString().slice(0, 10) : data.date
      if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date) {
        throw new Error(`${file}: date must be a valid YYYY-MM-DD date`)
      }
      return {
        slug,
        title: requiredString(data.title, 'title', file),
        excerpt: requiredString(data.excerpt, 'excerpt', file),
        date,
        readingTime: requiredString(data.readingTime, 'readingTime', file),
        category: requiredString(data.category, 'category', file),
        cover: requiredString(data.cover, 'cover', file),
        featured: Boolean(data.featured), status,
        subtitle: data.subtitle, breadcrumb: data.breadcrumb, tags: data.tags ?? [], home: data.home,
        body,
      }
    }),
    projects: projects.map(({slug,data,body,file}) => ({
      slug, title: requiredString(data.title,'title',file), year:String(data.year),
      description: requiredString(data.description,'description',file), shortDescription:data.shortDescription,
      tech:data.tech ?? [], category:requiredString(data.category,'category',file),
      cover:requiredString(data.cover,'cover',file), links:data.links ?? {}, body,
    })),
    settings,
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [contentRoot = 'content', outputFile] = process.argv.slice(2)
  if (!outputFile) {
    console.error('Usage: node tools/ContentImport/export.mjs <content-directory> <output.json>')
    process.exitCode = 1
  } else {
    try {
      const data = await exportContent(resolve(contentRoot))
      await writeFile(resolve(outputFile), `${JSON.stringify(data, null, 2)}\n`)
      console.log(`Exported ${data.posts.length} posts, ${data.projects.length} projects and site settings to ${outputFile}`)
    } catch (error) {
      console.error(error.message)
      process.exitCode = 1
    }
  }
}
