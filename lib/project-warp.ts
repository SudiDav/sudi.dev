/**
 * Timeline for the Work page's project warp: stop i sits at "warp time" i, and
 * the flight path runs a short lead-in before the first and lead-out after the
 * last.
 */
export const WARP_LEAD = 0.45

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/** 1 when the camera rests at the stop, falling to 0 a little under halfway to its neighbours. */
export function stopVisibility(time: number, index: number) {
  return clamp01(1 - Math.abs(time - index) * 2.2)
}

export function activeStop(time: number, count: number) {
  return Math.min(count - 1, Math.max(0, Math.round(time)))
}
