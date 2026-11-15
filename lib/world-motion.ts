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

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const easeOut = (value: number) => 1 - (1 - value) ** 3
/** Overshoots slightly past 1 before settling: a pop rather than a fade. */
const pop = (value: number) => value <= 0 ? 0 : value >= 1 ? 1 : 1 + 2.70158 * (value - 1) ** 3 + 1.70158 * (value - 1) ** 2

export const COSMOS_INTRO_SECONDS = 2.6

/**
 * The opening of the homepage cosmos, as a pure function of time: the symbol
 * spins up out of nothing, the two halves of the logo fly in and lock, the
 * planets pop in one after another, and the stars fade up.
 */
export function cosmosIntro(seconds: number) {
  const time = Math.max(0, seconds)
  const symbol = clamp01(time / 1.3)
  return {
    symbolScale: pop(symbol),
    symbolTurn: (easeOut(clamp01(time / 1.7)) - 1) * Math.PI * 2,
    logoScale: easeOut(clamp01((time - 0.2) / 0.8)),
    logoApart: 1 - easeOut(clamp01((time - 0.3) / 1.6)),
    planetScale: (index: number) => pop(clamp01((time - 0.7 - index * 0.16) / 0.6)),
    stars: easeOut(clamp01(time / 2.2)),
    active: time < COSMOS_INTRO_SECONDS,
  }
}
