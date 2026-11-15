/**
 * Timeline for the homepage project warp. Scroll progress through the section
 * (0..1) becomes "warp time": stop i is centred at time i, with a short lead-in
 * before the first and lead-out after the last.
 */
export const WARP_LEAD = 0.45

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

export function warpTime(progress: number, count: number) {
  return -WARP_LEAD + clamp01(progress) * (count - 1 + 2 * WARP_LEAD)
}

/** Scroll progress at which stop `index` sits centred. */
export function progressForStop(index: number, count: number) {
  return (index + WARP_LEAD) / (count - 1 + 2 * WARP_LEAD)
}

/** 1 when the camera rests at the stop, falling to 0 a little under halfway to its neighbours. */
export function stopVisibility(time: number, index: number) {
  return clamp01(1 - Math.abs(time - index) * 2.2)
}

export function activeStop(time: number, count: number) {
  return Math.min(count - 1, Math.max(0, Math.round(time)))
}
