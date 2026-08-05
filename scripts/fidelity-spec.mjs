#!/usr/bin/env node
/**
 * Emit the expected typography and colour for every text node in a design
 * frame, keyed by its exact text content.
 *
 * Pairing with `scripts/audit-fidelity.js` (run in the browser) turns "looks
 * about right" into a measured comparison: each string is located in the DOM
 * and its computed font-size / weight / family / colour is checked against the
 * design's own values.
 *
 *   node scripts/fidelity-spec.mjs "Portfolio Homepage" > /tmp/spec.json
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const doc = JSON.parse(readFileSync(join(ROOT, 'design', 'Sudi David.pen'), 'utf8'))

const byId = new Map()
;(function index(node) {
  if (Array.isArray(node)) return node.forEach(index)
  if (node && typeof node === 'object') {
    if (typeof node.id === 'string') byId.set(node.id, node)
    Object.values(node).forEach(index)
  }
})(doc)

/** Resolve a `$token` reference to its hex for the given theme mode. */
const resolveColor = (value, mode) => {
  if (typeof value !== 'string' || !value.startsWith('$')) return value
  const variable = doc.variables[value.slice(1)]
  if (!variable) return value
  const entries = Array.isArray(variable.value) ? variable.value : [{ value: variable.value }]
  const match = entries.find((entry) => !entry.theme || entry.theme.mode === mode) ?? entries[0]
  return match.value
}

// Same override semantics as extract-frame.mjs: bare descendant ids, nesting
// only at ref boundaries.
const resolveRef = (refNode, outerOverrides = {}, prefix = '') => {
  const source = byId.get(refNode.ref)
  if (!source) return null
  const overrides = { ...(refNode.descendants ?? {}) }
  if (prefix) {
    for (const [key, value] of Object.entries(outerOverrides)) {
      if (key.startsWith(`${prefix}/`)) overrides[key.slice(prefix.length + 1)] = value
    }
  }
  const walk = (node) => {
    if (node.type === 'ref') return resolveRef(node, overrides, node.id)
    const merged = { ...node, ...(overrides[node.id] ?? {}) }
    if (merged.children) merged.children = merged.children.map(walk).filter(Boolean)
    return merged
  }
  const instance = { ...source, ...(overrides[source.id] ?? {}) }
  instance.children = (source.children ?? []).map(walk).filter(Boolean)
  return instance
}

const target = process.argv[2]
const frame = byId.get(target) ?? doc.children.find((child) => child.name === target)
if (!frame) {
  console.error(`No frame named "${target}"`)
  process.exit(1)
}

const mode = frame.theme?.mode ?? 'dark'
const specs = new Map()

const collect = (node) => {
  const resolved = node.type === 'ref' ? resolveRef(node) : node
  if (!resolved) return
  if (resolved.type === 'text' && resolved.content) {
    const text = resolved.content.trim()
    // Whitespace-only nodes (e.g. the blank line inside a code block) carry no
    // visual information and cannot be located unambiguously in the DOM.
    if (!text) return
    // Strings that appear more than once cannot be matched unambiguously.
    if (specs.has(text)) specs.set(text, null)
    else
      specs.set(text, {
        text,
        fontFamily: resolved.fontFamily,
        fontSize: resolved.fontSize,
        fontWeight: resolved.fontWeight === 'normal' ? '400' : String(resolved.fontWeight),
        color: resolveColor(resolved.fill, mode),
        letterSpacing: resolved.letterSpacing,
        lineHeight: resolved.lineHeight,
      })
  }
  for (const child of resolved.children ?? []) collect(child)
}

collect(frame)

console.log(
  JSON.stringify(
    { frame: frame.name, mode, nodes: [...specs.values()].filter(Boolean) },
    null,
    2,
  ),
)
