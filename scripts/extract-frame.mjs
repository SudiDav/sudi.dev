#!/usr/bin/env node
/**
 * Dump the exact design spec for a frame in the Pencil source file.
 *
 * The design file is the specification: every measurement in a component must
 * come from here, not from eyeballing a screenshot.
 *
 *   node scripts/extract-frame.mjs "Portfolio Homepage"
 *   node scripts/extract-frame.mjs IwfbA --depth 4
 *   node scripts/extract-frame.mjs --list
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DESIGN = join(ROOT, 'design', 'Sudi David.pen')

const PROPS = [
  'width', 'height', 'padding', 'gap', 'direction', 'alignItems', 'justifyContent',
  'fill', 'stroke', 'strokeWidth', 'cornerRadius', 'opacity',
  'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing',
  'icon', 'library',
]

const doc = JSON.parse(readFileSync(DESIGN, 'utf8'))

/** Every node in the document, by id — used to resolve `ref` nodes. */
const byId = new Map()
;(function index(node) {
  if (Array.isArray(node)) return node.forEach(index)
  if (node && typeof node === 'object') {
    if (typeof node.id === 'string') byId.set(node.id, node)
    Object.values(node).forEach(index)
  }
})(doc)

const fmt = (value) => {
  if (value && typeof value === 'object' && value.type === 'image') return `image(${value.url})`
  if (Array.isArray(value) || (value && typeof value === 'object')) return JSON.stringify(value)
  return String(value)
}

/**
 * A `ref` node instantiates a reusable component and overrides properties on
 * its descendants, keyed by descendant id (or a `parentId/childId` path for
 * nested instances). Merge those overrides in so the caller sees real values.
 */
const resolveRef = (node) => {
  const source = byId.get(node.ref)
  if (!source) return { ...node, __unresolved: node.ref }
  const overrides = node.descendants ?? {}
  const apply = (n, path) => {
    const key = path ? `${path}/${n.id}` : n.id
    const merged = { ...n, ...(overrides[key] ?? overrides[n.id] ?? {}) }
    if (merged.children) merged.children = merged.children.map((c) => apply(c, key))
    return merged
  }
  const instance = apply(source, '')
  return { ...instance, name: node.name ?? instance.name, width: node.width ?? instance.width }
}

const print = (node, depth, maxDepth) => {
  if (depth > maxDepth) return
  const resolved = node.type === 'ref' ? resolveRef(node) : node
  const pairs = PROPS.filter((p) => resolved[p] !== undefined && resolved[p] !== null)
    .map((p) => `${p}=${fmt(resolved[p])}`)
  const label = `${resolved.type === 'ref' ? 'ref' : resolved.type}` +
    (resolved.name ? ` "${resolved.name}"` : '')
  const text = resolved.content !== undefined ? `  content=${JSON.stringify(resolved.content)}` : ''
  console.log(`${'  '.repeat(depth)}${label}${pairs.length ? '  ' + pairs.join(' ') : ''}${text}`)
  for (const child of resolved.children ?? []) print(child, depth + 1, maxDepth)
}

const args = process.argv.slice(2)

if (args.includes('--list') || args.length === 0) {
  console.log('Top-level frames:\n')
  for (const child of doc.children) {
    const kind = child.reusable ? 'component' : 'screen'
    console.log(`  ${child.id.padEnd(8)} ${String(child.name).padEnd(24)} ${kind}`)
  }
  console.log('\nTokens:\n')
  for (const [name, def] of Object.entries(doc.variables)) {
    const values = Array.isArray(def.value)
      ? def.value.map((v) => `${v.theme?.mode ?? '*'}=${v.value}`).join('  ')
      : def.value
    console.log(`  ${name.padEnd(26)} ${values}`)
  }
  process.exit(0)
}

const depthFlag = args.indexOf('--depth')
const maxDepth = depthFlag === -1 ? 6 : Number(args[depthFlag + 1])
const target = args[0]

const node = byId.get(target) ?? doc.children.find((c) => c.name === target)
if (!node) {
  console.error(`No frame with id or name "${target}". Run with --list to see all frames.`)
  process.exit(1)
}
print(node, 0, maxDepth)
