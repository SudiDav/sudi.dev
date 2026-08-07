'use client'

import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import {
  applyPreference,
  THEME_STORAGE_KEY,
  watchSystemTheme,
  type ThemePreference,
} from '@/lib/theme'

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
]

/**
 * The stored preference is external state, so it is read through
 * `useSyncExternalStore` rather than mirrored into React state in an effect —
 * which would both trip the set-state-in-effect rule and risk a hydration
 * mismatch, since the bootstrap script has already applied a theme before React
 * runs.
 *
 * Two sources are watched: the class on <html> (so this control stays in step
 * with the public site's toggle) and the `storage` event (so a second tab
 * agrees).
 */
const subscribe = (onStoreChange: () => void) => {
  const observer = new MutationObserver(onStoreChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  window.addEventListener('storage', onStoreChange)
  return () => {
    observer.disconnect()
    window.removeEventListener('storage', onStoreChange)
  }
}

const getSnapshot = (): ThemePreference => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  } catch {
    return 'system'
  }
}

// The server cannot know the preference; rendering "system" and correcting on
// hydration is the only honest option.
const getServerSnapshot = (): ThemePreference => 'system'

/**
 * A three-way Light / Dark / System control.
 *
 * The admin has no theme control in the design — it only has light frames — so
 * this is added UI rather than a replicated one. It is styled from the admin
 * tokens so it belongs to that surface.
 */
export function ThemePicker() {
  const preference = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  // While following the OS, re-resolve when the OS flips.
  useEffect(() => {
    if (preference !== 'system') return
    return watchSystemTheme(() => applyPreference('system'))
  }, [preference])

  const choose = useCallback((next: ThemePreference) => applyPreference(next), [])

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="flex w-fit items-center gap-1 rounded-lg border border-admin-border bg-admin-subtle p-1"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const selected = preference === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => choose(value)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              selected
                ? 'bg-admin-card text-admin-text shadow-[0_1px_2px_#0000000f]'
                : 'text-admin-text-secondary hover:text-admin-text'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        )
      })}
    </div>
  )
}
