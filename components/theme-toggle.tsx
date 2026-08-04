'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const [isLight, setIsLight] = useState(false)

  useEffect(() => setIsLight(document.documentElement.classList.contains('light')), [])

  const toggle = () => {
    const next = !isLight
    document.documentElement.classList.toggle('light', next)
    localStorage.setItem('theme', next ? 'light' : 'dark')
    setIsLight(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle colour theme"
      aria-pressed={isLight}
      className="flex items-center gap-1.5 rounded-full border border-border bg-bg-card
                 px-2 py-1.5 transition-colors hover:border-border-hover
                 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <Sun size={14} className={isLight ? 'text-accent' : 'text-text-tertiary'} />
      <Moon size={14} className={isLight ? 'text-text-tertiary' : 'text-accent'} />
    </button>
  )
}
