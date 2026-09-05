export type WorldPoint = { x: number; z: number }
export type Signal = WorldPoint & { id: string }

/** Frame-rate independent movement; capped delta avoids jumps when a tab resumes. */
export function moveRover(position: WorldPoint, input: WorldPoint, delta: number): WorldPoint {
  const length = Math.hypot(input.x, input.z)
  if (!length) return position
  const step = 3.6 * Math.min(Math.max(delta, 0), 0.1) / Math.max(length, 1)
  return {
    x: Math.max(-5.3, Math.min(5.3, position.x + input.x * step)),
    z: Math.max(-5.3, Math.min(5.3, position.z + input.z * step)),
  }
}

export function moveTowardSignal(position: WorldPoint, target: WorldPoint, delta: number): WorldPoint {
  const distance = Math.hypot(target.x - position.x, target.z - position.z)
  if (!distance) return position
  const next = moveRover(position, { x: (target.x - position.x) / distance, z: (target.z - position.z) / distance }, delta)
  // A slow frame must stop at the signal rather than stepping past it forever.
  return Math.hypot(next.x - position.x, next.z - position.z) >= distance ? { ...target } : next
}

export function collectSignals(position: WorldPoint, collected: readonly string[], signals: readonly Signal[]) {
  const next = [...collected]
  for (const signal of signals) {
    if (!next.includes(signal.id) && Math.hypot(position.x - signal.x, position.z - signal.z) < 0.7) {
      next.push(signal.id)
    }
  }
  return next
}
