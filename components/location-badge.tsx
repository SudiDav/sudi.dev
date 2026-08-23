'use client'

import { useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { LocationMap } from './location-map'
import { MapPreview } from './map-preview'

/**
 * The location badge from the design, made to answer the question it raises.
 *
 * "Lubumbashi, DRC" means nothing to most readers. Hovering shows where that
 * is; clicking opens a map you can actually explore.
 *
 * The close is delayed a little so the pointer can travel from the badge to the
 * preview without it vanishing on the way.
 */
export function LocationBadge({ location }: { location: string }) {
  const [hovered, setHovered] = useState(false)
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = () => {
    if (timer.current) clearTimeout(timer.current)
    setHovered(true)
  }
  const hide = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setHovered(false), 140)
  }

  return (
    <span className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        onFocus={show}
        onBlur={hide}
        aria-haspopup="dialog"
        title={`Show ${location} on a map`}
        className="inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-2 text-xs text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <MapPin size={14} className="text-text-tertiary" />
        {location}
      </button>

      {hovered && !open ? (
        <span
          className="absolute bottom-full left-1/2 z-30 mb-3 -translate-x-1/2"
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          <MapPreview location={location} onExpand={() => setOpen(true)} />
        </span>
      ) : null}

      {open ? <LocationMap location={location} onClose={() => setOpen(false)} /> : null}
    </span>
  )
}
