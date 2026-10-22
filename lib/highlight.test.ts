import { describe, expect, it } from 'vitest'
import { highlight } from './highlight'

const colorOf = (lines: ReturnType<typeof highlight>, text: string) =>
  lines.flat().find((token) => token.content === text)?.color

describe('highlight', () => {
  it('colours C# keywords, types and strings with the site code palette', () => {
    const lines = highlight('public sealed class Order { string Name = "a"; }', 'csharp')

    expect(colorOf(lines, 'public')).toBe('var(--code-token-keyword)')
    expect(colorOf(lines, 'Order')).toBe('var(--code-token-function)')
    expect(colorOf(lines, '"a"')).toBe('var(--code-token-string-expression)')
  })

  it('keeps every line, including blank ones', () => {
    const lines = highlight('db.Orders.Add(order);\n\nawait db.SaveChangesAsync();', 'csharp')

    expect(lines).toHaveLength(3)
    expect(lines.map((line) => line.map((token) => token.content).join(''))).toEqual([
      'db.Orders.Add(order);',
      '',
      'await db.SaveChangesAsync();',
    ])
  })

  it('returns plain text for a language it does not know', () => {
    const lines = highlight('Published 3 outbox message(s)', 'text')

    expect(lines).toEqual([[{ content: 'Published 3 outbox message(s)' }]])
  })
})
