import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const args = process.argv.slice(2)
const option = (name, fallback) => {const i=args.indexOf(name); return i < 0 ? fallback : args[i+1]}
const api = option('--api', 'http://localhost:5000').replace(/\/$/,'')
const web = option('--web', 'http://localhost:3000').replace(/\/$/,'')
const manifestFile = option('--manifest', 'artifacts/content.json')
const manifest = JSON.parse(await readFile(manifestFile,'utf8'))

async function get(path) {
  const response = await fetch(`${api}${path}`,{signal:AbortSignal.timeout(15000)})
  assert.equal(response.status,200,`API ${path}`)
  return response.json()
}
function sameFields(expected, actual, label) {
  for(const [key,value] of Object.entries(expected)) {
    if(value === null || value === undefined) continue
    if(value && typeof value === 'object' && !Array.isArray(value)) {
      assert.ok(actual[key],`${label}.${key} missing`)
      sameFields(value,actual[key],`${label}.${key}`)
    } else assert.deepEqual(actual[key],value,`${label}.${key} changed during import`)
  }
}
const publicPosts = manifest.posts.filter(post => (post.status ?? 'Published') === 'Published')
const posts = await get('/api/posts')
assert.deepEqual(posts.map(p=>p.slug).sort(),publicPosts.map(p=>p.slug).sort(),'Published post set differs')
const projects = await get('/api/projects')
assert.deepEqual(projects.map(p=>p.slug).sort(),manifest.projects.map(p=>p.slug).sort(),'Project set differs')
for(const expected of publicPosts) {
  const actual = await get(`/api/posts/${expected.slug}`)
  sameFields(expected,actual,`post:${expected.slug}`)
  const page = await fetch(`${web}/blog/${expected.slug}`,{signal:AbortSignal.timeout(15000)})
  assert.equal(page.status,200,`Article ${expected.slug} does not render`)
  const html = await page.text()
  assert.ok(html.includes(`/blog/${expected.slug}`),`Article canonical missing: ${expected.slug}`)
  const legacy = await fetch(`${web}/${expected.slug}`,{redirect:'manual',signal:AbortSignal.timeout(15000)})
  assert.ok([301,308].includes(legacy.status),`Legacy redirect missing: ${expected.slug}`)
  assert.equal(new URL(legacy.headers.get('location'),web).pathname,`/blog/${expected.slug}`)
}
for(const hidden of manifest.posts.filter(post => post.status && post.status !== 'Published')) {
  const response=await fetch(`${api}/api/posts/${hidden.slug}`)
  assert.equal(response.status,404,`Non-public post exposed: ${hidden.slug}`)
}
for(const expected of manifest.projects) sameFields(expected,projects.find(p=>p.slug===expected.slug),`project:${expected.slug}`)
sameFields(manifest.settings,await get('/api/settings'),'settings')
for(const path of ['/', '/blog','/work','/about','/rss.xml','/sitemap.xml']) {
  const response = await fetch(`${web}${path}`,{signal:AbortSignal.timeout(15000)})
  assert.equal(response.status,200,`Website ${path}`)
  if(path.endsWith('.xml')) {
    const xml=await response.text()
    for(const post of publicPosts) assert.ok(xml.includes(`/blog/${post.slug}`),`${path} omits ${post.slug}`)
    for(const hidden of manifest.posts.filter(p=>p.status && p.status!=='Published')) assert.ok(!xml.includes(`/blog/${hidden.slug}`),`${path} exposes draft ${hidden.slug}`)
  }
}
console.log(`Verified ${publicPosts.length} published articles, ${projects.length} projects, settings, legacy redirects, website pages, RSS and sitemap against ${manifestFile}.`)
