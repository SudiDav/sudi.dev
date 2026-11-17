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

/** The stop one step from `current` (delta -1 or 1), staying on the first or last at the ends. */
export function stepStop(current: number, delta: number, count: number) {
  return Math.min(count - 1, Math.max(0, current + delta))
}

/** A clear horizontal swipe is a step: left (negative dx) goes on, right goes back. */
export function swipeStep(dx: number, dy: number) {
  if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return 0
  return dx < 0 ? 1 : -1
}
