'use client'

import { useId } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

/**
 * Design: "Filters" (Work) and "Category Filters" (Blog). Both are pills of
 * cornerRadius 9999 where the active one has a blue fill with white text
 * and the rest are $bg-card with a 1px $border and $text-secondary text — but
 * the two surfaces size them differently:
 *
 *   Work — padding [8,16], Inter 13/500
 *   Blog — padding [8,14], Inter 12/500
 *
 * Selection is held in the `category` search param so a filtered view is
 * shareable and survives a reload.
 */
const SIZES = {
  work: 'px-4 py-2 text-[13px]',
  blog: 'px-3.5 py-2 text-xs',
} as const

export function FilterBar({
  options,
  active,
  label,
  size,
}: {
  options: readonly string[]
  active: string
  label: string
  size: keyof typeof SIZES
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const groupName = useId()
  const selectedBackground = size === 'work' ? 'bg-[#4e6ca8]' : 'bg-accent'

  const select = (option: string) => {
    const params = new URLSearchParams(searchParams)
    if (option === 'All') params.delete('category')
    else params.set('category', option)
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = option === active
        return (
          <label key={option} className="relative">
            <input
              type="radio"
              name={groupName}
              value={option}
              checked={selected}
              onChange={() => select(option)}
              className="peer sr-only"
            />
            <span
              className={`block cursor-pointer rounded-full font-medium transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ${SIZES[size]} ${
                selected
                  ? `${selectedBackground} text-white`
                  : 'border border-border bg-bg-card text-text-secondary hover:border-border-hover hover:text-text-primary'
              }`}
            >
              {option}
            </span>
          </label>
        )
      })}
    </div>
  )
}
