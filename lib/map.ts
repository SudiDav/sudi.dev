import type { CircleMarkerOptions } from 'leaflet'
import { LIGHT_CLASS } from './theme'

/** Lubumbashi, 11.66°S 27.48°E. */
export const CENTRE: [number, number] = [-11.6647, 27.4794]

/**
 * CARTO's basemaps — OpenStreetMap data in a light and a dark style. Free for
 * this kind of use, and both require the attribution below.
 */
const TILES = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
}

export const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'

/** Matches whichever theme the page is currently showing. */
export function tileUrl() {
  const light =
    typeof document !== 'undefined' && document.documentElement.classList.contains(LIGHT_CLASS)
  return light ? TILES.light : TILES.dark
}

export const MARKER_STYLE: CircleMarkerOptions = {
  radius: 7,
  color: '#607EBC',
  weight: 3,
  fillColor: '#607EBC',
  fillOpacity: 0.35,
}
