'use client'

import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { TerminalIntro } from './terminal-intro'
import './philosophical-identity.css'

export function PhilosophicalIdentity({ name }: { name: string }) {
  const [perspective, setPerspective] = useState<'logic' | 'intuition'>('logic')

  return (
    <div className="philosophical-identity" data-perspective={perspective}>
      <TerminalIntro />
      <h1 className="identity-name">Hi, I&apos;m<span>{name}</span></h1>
      <div className="identity-perspectives" role="group" aria-label="Explore two sides of my personality">
        <button type="button" aria-pressed={perspective === 'logic'} onClick={() => setPerspective('logic')}>Logic</button>
        <span className="identity-balance" aria-hidden="true"><i /><i /></span>
        <button type="button" aria-pressed={perspective === 'intuition'} onClick={() => setPerspective('intuition')}>Intuition</button>
        <span className="identity-invitation">two sides, one mind <ArrowUpRight size={12} aria-hidden="true" /></span>
      </div>
      <p className="identity-thought" aria-live="polite" aria-atomic="true">
        {perspective === 'logic' ? <>I turn complex questions into <strong>working systems.</strong></> : <>I follow the questions that have <strong>no simple answer.</strong></>}
      </p>
    </div>
  )
}
