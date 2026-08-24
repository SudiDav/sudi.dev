'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Play, Pause, RotateCcw, Headphones } from 'lucide-react'
import { collectSentences, type SpokenSentence } from '@/lib/speech-dom'
import { loadVoices } from '@/lib/speech-voice'

const SPEEDS = [1, 1.25, 1.5, 0.75] as const

/** The name the stylesheet targets with ::highlight(). */
const HIGHLIGHT = 'reading'

/**
 * Whether the browser can speak. Read through `useSyncExternalStore` because
 * the server cannot know, and the answer never changes afterwards.
 */
const subscribeSupport = () => () => {}
const getSupport = () => 'speechSynthesis' in window
const getServerSupport = () => false

/**
 * Read the post aloud, following along in the text.
 *
 * The browser's own synthesiser rather than a hosted voice: no API key, no cost
 * per play, works offline, and the text goes nowhere. The trade is voice
 * quality, which is very good on Apple devices and adequate elsewhere.
 *
 * Sentences are taken from the rendered article, not the MDX source, so the
 * spoken audio and the highlighted range are the same object and cannot drift.
 */
export function ListenButton({ targetId }: { targetId: string }) {
  const supported = useSyncExternalStore(subscribeSupport, getSupport, getServerSupport)
  const [speaking, setSpeaking] = useState(false)
  const [paused, setPaused] = useState(false)
  const [index, setIndex] = useState(0)
  const [total, setTotal] = useState(0)
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1)

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [voiceName, setVoiceName] = useState('')

  const sentences = useRef<SpokenSentence[]>([])
  const cursor = useRef(0)

  // The best available voice wins by default; the reader can override it.
  useEffect(() => {
    if (!supported) return
    return loadVoices((ranked) => {
      setVoices(ranked)
      setVoiceName((current) => current || ranked[0]?.name || '')
    })
  }, [supported])

  /**
   * Paint the current sentence using the CSS Custom Highlight API, which marks
   * arbitrary ranges without touching the DOM — no wrapper elements injected
   * into the article, nothing for React to disagree with. Browsers without it
   * simply get audio and no highlight.
   */
  const highlight = useCallback((sentence?: SpokenSentence) => {
    if (!('highlights' in CSS)) return
    if (!sentence) return CSS.highlights.delete(HIGHLIGHT)
    CSS.highlights.set(HIGHLIGHT, new Highlight(sentence.range))
  }, [])

  const stop = useCallback(() => {
    window.speechSynthesis.cancel()
    highlight(undefined)
    setSpeaking(false)
    setPaused(false)
    setIndex(0)
    cursor.current = 0
  }, [highlight])

  // A voice still talking after the reader has left the page is the worst
  // possible outcome, so tear everything down on unmount.
  useEffect(() => {
    if (!supported) return
    return () => {
      window.speechSynthesis.cancel()
      if ('highlights' in CSS) CSS.highlights.delete(HIGHLIGHT)
    }
  }, [supported])

  const speakFrom = useCallback(
    (from: number) => {
      const synth = window.speechSynthesis
      synth.cancel()

      const list = sentences.current
      list.slice(from).forEach((sentence, offset) => {
        const position = from + offset
        const utterance = new SpeechSynthesisUtterance(sentence.text)
        utterance.rate = speed
        utterance.lang = 'en-GB'

        const voice = voices.find((v) => v.name === voiceName)
        if (voice) {
          utterance.voice = voice
          // Setting lang to match avoids some engines overriding the choice.
          utterance.lang = voice.lang
        }
        // A touch below default reads as speech rather than announcement.
        utterance.pitch = 0.95

        utterance.onstart = () => {
          cursor.current = position
          setIndex(position)
          highlight(sentence)
          keepInView(sentence.range)
        }

        if (position === list.length - 1) {
          utterance.onend = () => {
            highlight(undefined)
            setSpeaking(false)
            setPaused(false)
            setIndex(0)
            cursor.current = 0
          }
        }

        utterance.onerror = (event) => {
          // These two are what a deliberate stop looks like, not a failure.
          if (event.error !== 'interrupted' && event.error !== 'canceled') {
            setSpeaking(false)
            setPaused(false)
          }
        }

        synth.speak(utterance)
      })

      setSpeaking(true)
      setPaused(false)
    },
    [speed, highlight, voices, voiceName],
  )

  const toggle = useCallback(() => {
    const synth = window.speechSynthesis

    if (!speaking) {
      // Collected on first play: the article is rendered by then, and a reader
      // who never presses play pays nothing for this.
      if (!sentences.current.length) {
        const container = document.getElementById(targetId)
        if (!container) return
        sentences.current = collectSentences(container)
        setTotal(sentences.current.length)
      }
      if (!sentences.current.length) return
      return speakFrom(cursor.current)
    }

    if (paused) {
      synth.resume()
      setPaused(false)
    } else {
      synth.pause()
      setPaused(true)
    }
  }, [speaking, paused, speakFrom, targetId])

  const cycleSpeed = useCallback(() => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]
    setSpeed(next)
    // Rate is fixed once an utterance is queued, so changing it mid-playback
    // means re-queueing from the current sentence.
    if (speaking) requestAnimationFrame(() => speakFrom(cursor.current))
  }, [speed, speaking, speakFrom])

  if (!supported) return null

  const progress = speaking && total ? Math.round(((index + 1) / total) * 100) : 0

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-bg-card px-4 py-3">
      <button
        type="button"
        onClick={toggle}
        aria-label={!speaking ? 'Listen to this article' : paused ? 'Resume' : 'Pause'}
        className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
      >
        {!speaking || paused ? <Play size={14} /> : <Pause size={14} />}
        {!speaking ? 'Listen' : paused ? 'Resume' : 'Pause'}
      </button>

      {speaking ? (
        <>
          <button
            type="button"
            onClick={stop}
            aria-label="Stop and start over"
            className="rounded-lg border border-border p-2 text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary"
          >
            <RotateCcw size={13} />
          </button>

          <div className="flex min-w-[90px] flex-1 items-center gap-2">
            <div
              className="h-1 flex-1 overflow-hidden rounded-full bg-bg-secondary"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Listening progress"
            >
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="font-mono text-[11px] text-text-tertiary">{progress}%</span>
          </div>
        </>
      ) : (
        <span className="flex items-center gap-1.5 text-[12px] text-text-tertiary">
          <Headphones size={13} />
          Read aloud by your browser
        </span>
      )}

      <button
        type="button"
        onClick={cycleSpeed}
        aria-label={`Playback speed: ${speed} times. Click to change.`}
        className="rounded-lg border border-border px-2.5 py-1.5 font-mono text-[11px] text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary"
      >
        {speed}×
      </button>

      {/*
        Voice quality varies enormously by device, and the best one installed is
        rarely the default. The list is ranked, so the first entry is already the
        most human available — this is for readers who want a different one.
      */}
      {voices.length > 1 ? (
        <select
          value={voiceName}
          onChange={(event) => {
            setVoiceName(event.target.value)
            if (speaking) requestAnimationFrame(() => speakFrom(cursor.current))
          }}
          aria-label="Voice"
          className="max-w-[150px] rounded-lg border border-border bg-bg-card px-2 py-1.5 text-[11px] text-text-secondary transition-colors hover:border-border-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {voices.map((voice) => (
            <option key={voice.name} value={voice.name}>
              {voice.name.replace(/^(Microsoft|Google)\s+/, '')}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  )
}

/**
 * Scroll the current sentence into view, but only when it has actually left the
 * screen — yanking the page on every sentence would make it unreadable for
 * anyone following along with their eyes.
 */
function keepInView(range: Range) {
  const rect = range.getBoundingClientRect()
  if (rect.height === 0) return

  const margin = 120
  const above = rect.top < margin
  const below = rect.bottom > window.innerHeight - margin
  if (!above && !below) return

  window.scrollBy({
    top: rect.top - window.innerHeight / 2 + rect.height / 2,
    behavior: 'smooth',
  })
}
