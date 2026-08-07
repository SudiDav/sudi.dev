'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { Sun, Moon } from 'lucide-react'
import { applyPreference, LIGHT_CLASS } from '@/lib/theme'

/**
 * The theme lives on `<html>`, applied by the inline bootstrap script in the
 * root layout before first paint. The DOM is therefore the source of truth, not
 * React — so this subscribes to it rather than mirroring it into state.
 *
 * `useSyncExternalStore` is the right primitive: it renders the server snapshot
 * during hydration, then re-reads the real DOM and re-renders if they differ.
 * Syncing with an effect instead both trips React's set-state-in-effect rule
 * and risks a hydration mismatch, since the script has already applied the
 * user's stored preference by the time React runs.
 */
const subscribe = (onStoreChange: () => void) => {
  const observer = new MutationObserver(onStoreChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}

const getSnapshot = () => document.documentElement.classList.contains(LIGHT_CLASS)
const getServerSnapshot = () => false

/**
 * Design: "Theme Toggle" — padding [6,8], gap 6, fill $bg-card, 1px $border,
 * cornerRadius 9999. A segmented pill holding BOTH icons at 14px: in dark the
 * moon is $accent and the sun is $text-tertiary; light inverts that.
 *
 * The design draws two states, so this stays a two-state control and sets an
 * explicit preference. The third option — following the OS — lives in the
 * admin's Appearance settings, where there is room to name it.
 */
export function ThemeToggle() {
  const isLight = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const toggle = useCallback(() => {
    applyPreference(document.documentElement.classList.contains(LIGHT_CLASS) ? 'dark' : 'light')
  }, [])

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle colour theme"
      aria-pressed={isLight}
      className="flex items-center gap-1.5 rounded-full border border-border bg-bg-card px-2 py-1.5 transition-colors hover:border-border-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <Sun size={14} className={isLight ? 'text-accent' : 'text-text-tertiary'} />
      <Moon size={14} className={isLight ? 'text-text-tertiary' : 'text-accent'} />
    </button>
  )
}
