'use client'

import { useEffect, useRef, useState } from 'react'
import { Maximize2 } from 'lucide-react'
import { CENTRE, tileUrl, ATTRIBUTION, MARKER_STYLE } from '@/lib/map'
import 'leaflet/dist/leaflet.css'

/**
 * The small map shown on hover.
 *
 * Deliberately inert — no dragging, no scroll zoom — so hovering never hijacks
 * the page scroll. Exploring is what the full map is for, and this offers a way
 * through to it.
 */
export function MapPreview({ location, onExpand }: { location: string; onExpand: () => void }) {
  const holder = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let map: import('leaflet').Map | undefined
    let cancelled = false

    import('leaflet')
      .then((L) => {
        if (cancelled || !holder.current) return
        map = L.map(holder.current, {
          center: CENTRE,
          zoom: 5,
          zoomControl: false,
          attributionControl: false,
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          boxZoom: false,
          keyboard: false,
          touchZoom: false,
        })
        L.tileLayer(tileUrl(), { attribution: ATTRIBUTION, maxZoom: 18 }).addTo(map)
        L.circleMarker(CENTRE, MARKER_STYLE).addTo(map)
      })
      .catch(() => !cancelled && setFailed(true))

    return () => {
      cancelled = true
      map?.remove()
    }
  }, [])

  return (
    <span className="flex w-[260px] flex-col gap-2 rounded-xl border border-border bg-bg-card p-2 shadow-[0_12px_40px_#00000050]">
      {failed ? (
        <span className="px-2 py-6 text-center text-[11px] text-text-secondary">
          11.66°S 27.48°E
        </span>
      ) : (
        <span
          ref={holder}
          aria-hidden
          className="block h-[150px] w-full overflow-hidden rounded-lg bg-bg-secondary"
        />
      )}
      <button
        type="button"
        onClick={onExpand}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-1 text-[11px] text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
      >
        <Maximize2 size={11} />
        Explore {location}
      </button>
    </span>
  )
}
