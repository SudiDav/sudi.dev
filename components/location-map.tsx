'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin, X } from 'lucide-react'
import { CENTRE, tileUrl, ATTRIBUTION, MARKER_STYLE } from '@/lib/map'
import 'leaflet/dist/leaflet.css'

const START_ZOOM = 5

export function LocationMap({ location, onClose }: { location: string; onClose: () => void }) {
  const holder = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => closeRef.current?.focus(), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  useEffect(() => {
    let map: import('leaflet').Map | undefined
    let cancelled = false

    // Imported lazily: Leaflet reaches for `window` on load, and this keeps it
    // out of the bundle for everyone who never opens the map.
    import('leaflet')
      .then((L) => {
        if (cancelled || !holder.current) return

        map = L.map(holder.current, {
          center: CENTRE,
          zoom: START_ZOOM,
          scrollWheelZoom: true,
          attributionControl: true,
        })

        L.tileLayer(tileUrl(), {
          attribution: ATTRIBUTION,
          maxZoom: 18,
        }).addTo(map)

        L.circleMarker(CENTRE, MARKER_STYLE)
          .addTo(map)
          .bindTooltip(location, { permanent: true, direction: 'right', offset: [10, 0] })
      })
      .catch(() => !cancelled && setFailed(true))

    return () => {
      cancelled = true
      map?.remove()
    }
  }, [location])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000cc] p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Map showing ${location}`}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[640px] flex-col gap-3 rounded-2xl border border-border bg-bg-card p-4 shadow-[0_24px_64px_#00000060]"
      >
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-text-primary">
            <MapPin size={15} className="text-accent" />
            {location}
          </span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close map"
            className="rounded-lg p-1.5 text-text-tertiary transition-colors hover:bg-bg-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <X size={16} />
          </button>
        </div>

        {failed ? (
          <p className="rounded-xl bg-bg-secondary p-8 text-center text-sm text-text-secondary">
            The map could not be loaded. {location} sits at 11.66°S, 27.48°E.
          </p>
        ) : (
          <div
            ref={holder}
            className="h-[420px] w-full overflow-hidden rounded-xl bg-bg-secondary"
          />
        )}

        <p className="text-[11px] leading-[1.5] text-text-tertiary">
          Drag to pan, scroll to zoom.
        </p>
      </div>
    </div>
  )
}
