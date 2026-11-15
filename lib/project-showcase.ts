/** How many monoliths the Blender showcase (public/models/showcase.glb) holds. */
export const SHOWCASE_SLOTS = 3

/**
 * How far back a camera with this vertical field of view must stand so a box of
 * half-size (halfWidth, halfHeight) fits the frame, whichever side is tighter.
 */
export function fitDistance(halfWidth: number, halfHeight: number, fovDegrees: number, aspect: number) {
  const tan = Math.tan((fovDegrees * Math.PI) / 360)
  return Math.max(halfHeight / tan, halfWidth / (tan * aspect))
}

/**
 * The crown (the 3D S) turns toward the highlighted monolith; slots sit left to
 * right, so the middle one is straight ahead.
 */
export function crownYaw(index: number | null) {
  return index === null ? 0 : (index - (SHOWCASE_SLOTS - 1) / 2) * 0.42
}
