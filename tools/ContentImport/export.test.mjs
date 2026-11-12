import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { exportContent } from './export.mjs'

async function fixture(t, frontmatter = '') {
  const root = await mkdtemp(join(tmpdir(), 'sudi-import-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(join(root, 'posts'))
  await mkdir(join(root, 'projects'))
  await writeFile(join(root, 'site.json'), JSON.stringify({displayName:'Sudi',avatar:'/images/me.png', email:'hello@example.com', bio:'Bio',location:'Lubumbashi',website:'sudi.dev',social:{github:'SudiDav',twitter:'@sudi',linkedin:'sudi'},seo:{title:'Sudi',description:'Blog'}}))
  await writeFile(join(root, 'posts', 'hello-world.mdx'), `---\ntitle: Hello\nexcerpt: A post\ndate: 2026-09-15\nreadingTime: 2 min read\ncategory: .NET\ncover: /images/cover.png\n${frontmatter}---\n\n# Hello\n\n\`\`\`csharp\npublic int Id { get; set; }\n\`\`\`\n`)
  return root
}

test('exports implicit Published status, dates and exact article body without evaluating MDX', async t => {
  const root = await fixture(t)
  const result = await exportContent(root)
  assert.equal(result.formatVersion, 1)
  assert.equal(result.posts[0].slug, 'hello-world')
  assert.equal(result.posts[0].status, 'Published')
  assert.equal(result.posts[0].date, '2026-09-15')
  assert.equal(result.posts[0].body, '\n# Hello\n\n```csharp\npublic int Id { get; set; }\n```\n')
  assert.equal(result.settings.displayName, 'Sudi')
})

test('preserves draft state, home overrides, tags and subtitle', async t => {
  const root = await fixture(t, 'status: Draft\nsubtitle: Details\ntags: [dotnet, csharp]\nhome:\n  title: Short title\n  excerpt: Short excerpt\n')
  const result = await exportContent(root)
  assert.equal(result.posts[0].status, 'Draft')
  assert.equal(result.posts[0].subtitle, 'Details')
  assert.deepEqual(result.posts[0].tags, ['dotnet','csharp'])
  assert.deepEqual(result.posts[0].home, {title:'Short title',excerpt:'Short excerpt'})
})

test('invalid editorial status stops the import instead of making an article public', async t => {
  const root = await fixture(t, 'status: scheduled\n')
  await assert.rejects(exportContent(root), /status/)
})

test('projects preserve string years, links and body', async t => {
  const root = await fixture(t)
  await writeFile(join(root,'projects','example.mdx'), '---\ntitle: Project\nyear: 2025\ndescription: A project\nshortDescription: Short\ncategory: Web Apps\ntech: [C#, React]\ncover: /images/project.png\nlinks:\n  github: https://github.com/example/project\n---\n\nProject body\n')
  const result = await exportContent(root)
  assert.equal(result.projects[0].year,'2025')
  assert.equal(result.projects[0].shortDescription,'Short')
  assert.equal(result.projects[0].links.github,'https://github.com/example/project')
  assert.equal(result.projects[0].body,'\nProject body\n')
})

test('rejects filenames which could escape or collide with application routes', async t => {
  const root = await fixture(t)
  await writeFile(join(root,'posts','new.mdx'),'---\ntitle: Reserved\n---\ntext')
  await assert.rejects(exportContent(root), /slug/)
})
