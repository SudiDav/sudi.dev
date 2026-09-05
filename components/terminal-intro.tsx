'use client'

import { useEffect, useState } from 'react'

const COMMAND = 'whoami'
const SEEN_KEY = 'sudi:whoami-seen:v1'

/** Type the command once per browser; returning visitors see it immediately. */
export function TerminalIntro() {
  const [text, setText] = useState(COMMAND)
  const [phase, setPhase] = useState<'pending' | 'typing' | 'complete'>('pending')

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')

    function finish() {
      clearTimeout(timer)
      setText(COMMAND)
      setPhase('complete')
      try { localStorage.setItem(SEEN_KEY, '1') } catch { /* Storage may be unavailable. */ }
    }

    const frame = requestAnimationFrame(() => {
      let seen = false
      try { seen = localStorage.getItem(SEEN_KEY) === '1' } catch { /* Still allow the intro. */ }
      if (seen || motion.matches) { finish(); return }
      setText('')
      setPhase('typing')
      let count = 0
      const type = () => {
        count += 1
        setText(COMMAND.slice(0, count))
        if (count === COMMAND.length) timer = setTimeout(finish, 250)
        else timer = setTimeout(type, 130)
      }
      timer = setTimeout(type, 350)
    })

    const motionChanged = () => { if (motion.matches) finish() }
    motion.addEventListener('change', motionChanged)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timer)
      motion.removeEventListener('change', motionChanged)
    }
  }, [])

  return (
    <p className="identity-terminal" data-phase={phase}>
      <span className="sr-only">Terminal command: whoami</span>
      <span className="identity-prompt" aria-hidden="true">~$</span>
      <span className="identity-command" aria-hidden="true">
        <span className="identity-command-text">{text}</span>
        {phase === 'typing' && <span className="identity-caret" />}
      </span>
      <noscript><style>{'.identity-terminal[data-phase="pending"] .identity-command-text { visibility: visible; }'}</style></noscript>
    </p>
  )
}
