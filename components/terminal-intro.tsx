'use client'

import { useEffect, useState } from 'react'

const COMMAND = 'whoami'

/** Introduce the name once; repeat only the terminal command after a reading pause. */
export function TerminalIntro({ name }: { name: string }) {
  const [frame, setFrame] = useState({ command: COMMAND, name, phase: 'pending' })

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const letters = Array.from(name)
    let nameRevealed = false

    function complete() {
      nameRevealed = true
      setFrame({ command: COMMAND, name, phase: 'complete' })
    }

    function cycle() {
      let count = 0
      setFrame({ command: '', name: nameRevealed ? name : '', phase: 'command' })
      function typeName() {
        count += 1
        setFrame({ command: COMMAND, name: letters.slice(0, count).join(''), phase: 'name' })
        if (count < letters.length) timer = setTimeout(typeName, 105)
        else {
          complete()
          timer = setTimeout(cycle, 7000)
        }
      }
      function typeCommand() {
        count += 1
        setFrame({ command: COMMAND.slice(0, count), name: nameRevealed ? name : '', phase: 'command' })
        if (count < COMMAND.length) timer = setTimeout(typeCommand, 130)
        else if (nameRevealed) {
          complete()
          timer = setTimeout(cycle, 7000)
        } else {
          count = 0
          timer = setTimeout(typeName, 350)
        }
      }
      timer = setTimeout(typeCommand, 300)
    }

    function restart() {
      clearTimeout(timer)
      if (motion.matches || document.hidden) complete()
      else cycle()
    }

    // Defer the initial state update until after hydration.
    timer = setTimeout(restart, 0)
    motion.addEventListener('change', restart)
    document.addEventListener('visibilitychange', restart)
    return () => {
      clearTimeout(timer)
      motion.removeEventListener('change', restart)
      document.removeEventListener('visibilitychange', restart)
    }
  }, [name])

  return (
    <div className="identity-sequence" data-phase={frame.phase}>
      <p className="identity-terminal">
        <span className="sr-only">Terminal command: whoami</span>
        <span className="identity-prompt" aria-hidden="true">~$</span>
        <span className="identity-command" aria-hidden="true">
          <span className="identity-command-text">{frame.command}</span>
          {frame.phase === 'command' && <span className="identity-caret" />}
        </span>
      </p>
      <h1 className="identity-name">
        <span className="sr-only">Hi, I&apos;m {name}</span>
        <span aria-hidden="true">Hi, I&apos;m</span>
        <span className="identity-name-line" aria-hidden="true">
          <span className="identity-name-reserve">&lt;{name} /&gt;</span>
          <span className="identity-name-text"><span className="identity-tag">&lt;</span>{frame.name}{frame.phase === 'name' && <span className="identity-name-caret" />}<span className="identity-tag"> /&gt;</span></span>
        </span>
      </h1>
      <noscript><style>{'.identity-sequence[data-phase="pending"] .identity-command-text, .identity-sequence[data-phase="pending"] .identity-name-text { visibility: visible; }'}</style></noscript>
    </div>
  )
}
