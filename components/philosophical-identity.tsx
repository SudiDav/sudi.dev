import { TerminalIntro } from './terminal-intro'
import './philosophical-identity.css'

export function PhilosophicalIdentity({ name }: { name: string }) {
  return (
    <div className="philosophical-identity">
      <TerminalIntro name={name} />
    </div>
  )
}
