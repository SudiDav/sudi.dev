/**
 * Choosing a voice, rather than accepting whatever the system hands over.
 *
 * Left alone, `SpeechSynthesisUtterance` uses the platform default, which on
 * most machines is the oldest and most robotic voice installed. Every modern
 * platform also ships neural voices that sound close to human — they are simply
 * not the default. Picking deliberately is the single biggest quality win
 * available without sending text to a paid service.
 */

/**
 * Ranked by how human they actually sound, best first.
 *
 * - Microsoft "Natural" voices (Edge) are neural and the best of the free set.
 * - Apple "Premium" and "Enhanced" download on demand and are excellent.
 * - Google's Chrome voices are cloud-backed and clearly better than local ones.
 * - The named Apple voices are the decent built-ins.
 */
const PREFERENCES: { test: RegExp; score: number }[] = [
  { test: /Natural/i, score: 100 },
  { test: /Premium/i, score: 90 },
  { test: /Enhanced/i, score: 80 },
  { test: /^Google\s+UK English/i, score: 70 },
  { test: /^Google\s+US English/i, score: 68 },
  { test: /^Google/i, score: 60 },
  { test: /\b(Ava|Serena|Allison|Samantha|Daniel|Kate|Stephanie|Matilda)\b/i, score: 50 },
  { test: /Siri/i, score: 45 },
]

/** Voices that read English, most human first. */
export function rankVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return voices
    .filter((voice) => voice.lang.toLowerCase().startsWith('en'))
    .map((voice) => ({ voice, score: scoreOf(voice) }))
    .sort((a, b) => b.score - a.score || a.voice.name.localeCompare(b.voice.name))
    .map((entry) => entry.voice)
}

function scoreOf(voice: SpeechSynthesisVoice): number {
  let score = PREFERENCES.find((p) => p.test.test(voice.name))?.score ?? 0

  // A slight nudge towards en-GB, which suits the writing here, and away from
  // the compact fallback voices some systems expose.
  if (/^en-GB/i.test(voice.lang)) score += 4
  if (/compact|eloquence/i.test(voice.name)) score -= 40

  return score
}

/**
 * Voices load asynchronously in Chrome — `getVoices()` returns an empty array
 * on first call and fills in later, which is why so many implementations of
 * this silently use the default voice forever.
 */
export function loadVoices(onReady: (voices: SpeechSynthesisVoice[]) => void): () => void {
  const synth = window.speechSynthesis

  const emit = () => {
    const voices = rankVoices(synth.getVoices())
    if (voices.length) onReady(voices)
  }

  emit()
  synth.addEventListener('voiceschanged', emit)
  return () => synth.removeEventListener('voiceschanged', emit)
}
