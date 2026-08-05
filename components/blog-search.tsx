'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'

/**
 * Design: Blog Page → "Search Box" — ROW, width 280, padding [10,16], gap 10,
 * fill $bg-card, 1px $border, cornerRadius 8. Icon 16px in $text-tertiary,
 * placeholder "Search articles..." in Inter 13.
 *
 * The query lives in the `q` search param so a search result is shareable.
 * The header's search icon links here with `?focus=search`, which focuses the
 * input on arrival.
 */
export function BlogSearch({ query }: { query: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)
  const shouldFocus = searchParams.get('focus') === 'search'

  useEffect(() => {
    if (shouldFocus) inputRef.current?.focus()
  }, [shouldFocus])

  const update = (value: string) => {
    const params = new URLSearchParams(searchParams)
    params.delete('focus')
    if (value) params.set('q', value)
    else params.delete('q')
    const next = params.toString()
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false })
  }

  return (
    <div className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-bg-card px-4 py-2.5 focus-within:border-border-hover sm:w-[280px]">
      <Search size={16} className="shrink-0 text-text-tertiary" />
      <input
        ref={inputRef}
        type="search"
        aria-label="Search articles"
        placeholder="Search articles..."
        defaultValue={query}
        onChange={(event) => update(event.target.value)}
        className="w-full bg-transparent text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none"
      />
    </div>
  )
}
