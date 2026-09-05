/** Analytic spring motion remains stable even when frames are slow or skipped. */
export function yinYangImpulse(seconds: number) {
  const time = Math.max(0, seconds)
  if (time >= 1.6) return { bounce: 0, turn: Math.PI * 2, active: false }
  const progress = Math.min(time / 0.95, 1)
  return {
    bounce: Math.sin(time * 10) * Math.exp(-time * 3) * 1.1,
    turn: Math.PI * 2 * (1 - (1 - progress) ** 3),
    active: true,
  }
}
