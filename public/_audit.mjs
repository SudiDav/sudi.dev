/**
 * Fidelity auditor — development tool, not part of the site.
 *
 * Locates each design text node in the live DOM by its exact copy, then
 * compares the browser's computed font-size, weight, family and colour against
 * the values `scripts/fidelity-spec.mjs` read out of the .pen file.
 *
 *   const m = await import('/_audit.mjs'); await m.run('/_audit-home.json')
 */
const toHex = (rgb) => {
  const parts = rgb.match(/\d+/g)
  if (!parts) return rgb
  return `#${parts
    .slice(0, 3)
    .map((n) => Number(n).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`
}

const normalise = (value) =>
  value
    .replace(/\s+/g, ' ')
    .replace(/’/g, "'")
    .replace(/ /g, ' ')
    .trim()

/**
 * Deepest element whose own text equals the target, so ancestors don't match.
 *
 * Two wrinkles the design forces:
 * - Placeholders ("Search articles...") are attributes, not text nodes.
 * - Some copy is stored Title Case and uppercased in CSS, so the design's
 *   "DEVELOPMENT" is "Development" in the DOM. Comparing case-insensitively
 *   when the element carries `text-transform: uppercase` keeps that honest
 *   without hiding a genuine casing bug elsewhere.
 */
const findElement = (text) => {
  const wanted = normalise(text)
  const isUpper = wanted === wanted.toUpperCase()

  const byPlaceholder = [...document.querySelectorAll('[placeholder]')].find(
    (el) => normalise(el.getAttribute('placeholder') || '') === wanted,
  )
  // Styling lives on ::placeholder, not the input itself.
  if (byPlaceholder) return { el: byPlaceholder, pseudo: '::placeholder' }

  // Form fields render their content as `value`, which is not textContent.
  const byValue = [...document.querySelectorAll('input, textarea')].find(
    (el) => normalise(el.value || '') === wanted,
  )
  if (byValue) return { el: byValue }

  const all = [...document.querySelectorAll('body *')]
  const exact = all.filter((el) => normalise(el.textContent || '') === wanted)
  if (exact.length) {
    // A Title Case string can match both its own element and a CSS-uppercased
    // one rendering the same value (e.g. the "Development" filter pill and the
    // "DEVELOPMENT" badge). Prefer the untransformed element for the Title Case
    // spec entry so each design node maps to the element it actually describes.
    const untransformed = exact.filter(
      (el) => getComputedStyle(el).textTransform !== 'uppercase',
    )
    const pool = !isUpper && untransformed.length ? untransformed : exact
    return { el: pool[pool.length - 1] }
  }

  const uppercased = all.filter(
    (el) =>
      normalise(el.textContent || '').toUpperCase() === wanted.toUpperCase() &&
      getComputedStyle(el).textTransform === 'uppercase',
  )
  return uppercased.length ? { el: uppercased[uppercased.length - 1] } : null
}

export async function run(specUrl) {
  const spec = await fetch(specUrl).then((r) => r.json())
  const report = { frame: spec.frame, checked: 0, ok: 0, missing: [], mismatches: [] }

  for (const node of spec.nodes) {
    report.checked++
    const found = findElement(node.text)
    if (!found) {
      report.missing.push(node.text.slice(0, 48))
      continue
    }

    const style = getComputedStyle(found.el, found.pseudo)
    const diffs = []

    const size = Math.round(parseFloat(style.fontSize))
    if (size !== node.fontSize) diffs.push(`size ${size}≠${node.fontSize}`)

    const weight = String(style.fontWeight)
    if (weight !== node.fontWeight) diffs.push(`weight ${weight}≠${node.fontWeight}`)

    if (!style.fontFamily.toLowerCase().includes(node.fontFamily.toLowerCase())) {
      diffs.push(`font ${style.fontFamily.split(',')[0]}≠${node.fontFamily}`)
    }

    const want = (node.color || '').slice(0, 7).toUpperCase()
    const got = toHex(style.color)
    if (want && got !== want) diffs.push(`color ${got}≠${want}`)

    if (diffs.length) report.mismatches.push({ text: node.text.slice(0, 40), diffs })
    else report.ok++
  }

  return report
}
