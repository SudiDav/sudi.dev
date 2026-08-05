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

// Order matters for readability: layout first, then box, then paint, then type.
// `layout` is the flex direction and is ABSENT on horizontal frames — a frame with
// no `layout` is a ROW. Only `layout: "vertical"` makes a column. Dropping this
// property silently turns every column in the design into a row.
const PROPS = [
  'layout', 'layoutPosition', 'x', 'y', 'width', 'height', 'padding', 'gap',
  'alignItems', 'justifyContent', 'clip',
  'fill', 'stroke', 'strokeWidth', 'strokeAlignment', 'cornerRadius', 'opacity', 'effect',
  'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textAlign',
  'fontStyle', 'textGrowth',
  'icon', 'library', 'theme',
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

/** Frames are rows unless they opt into `layout: "vertical"`. Make that explicit. */
const flow = (node) =>
  node.type === 'frame' ? (node.layout === 'vertical' ? 'COLUMN' : 'ROW') : null

/**
 * A `ref` node instantiates a reusable component and overrides properties on
 * its descendants.
 *
 * Override keys are BARE descendant ids at any depth ("B4dAvr"), and nest only
 * at ref boundaries: a Tech Badge instance `uaCfz` inside this component has
 * its label overridden as "uaCfz/beLmj". So the path accumulates when we
 * recurse into a nested ref, and not for ordinary frames — prefixing every
 * frame makes nested keys never match, and the instance silently renders the
 * component's default content instead of its own.
 */
const resolveRef = (refNode, outerOverrides = {}, prefix = '') => {
  const source = byId.get(refNode.ref)
  if (!source) return { ...refNode, __unresolved: refNode.ref }

  // This instance's own overrides, plus any inherited entries scoped under our prefix.
  const overrides = { ...(refNode.descendants ?? {}) }
  if (prefix) {
    for (const [key, value] of Object.entries(outerOverrides)) {
      if (key.startsWith(`${prefix}/`)) overrides[key.slice(prefix.length + 1)] = value
    }
  }

  const walk = (node) => {
    if (node.type === 'ref') return resolveRef(node, overrides, node.id)
    const merged = { ...node, ...(overrides[node.id] ?? {}) }
    if (merged.children) merged.children = merged.children.map(walk)
    return merged
  }

  const instance = { ...source, ...(overrides[source.id] ?? {}) }
  instance.children = (source.children ?? []).map(walk)
  return { ...instance, name: refNode.name ?? instance.name, width: refNode.width ?? instance.width }
}

const print = (node, depth, maxDepth) => {
  if (depth > maxDepth) return
  const resolved = node.type === 'ref' ? resolveRef(node) : node
  const pairs = PROPS.filter((p) => resolved[p] !== undefined && resolved[p] !== null)
    .map((p) => `${p}=${fmt(resolved[p])}`)
  const label = `${resolved.type === 'ref' ? 'ref' : resolved.type}` +
    (resolved.name ? ` "${resolved.name}"` : '') +
    (flow(resolved) ? ` [${flow(resolved)}]` : '')
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
