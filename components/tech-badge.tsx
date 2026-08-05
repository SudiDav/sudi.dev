/**
 * Design: "Tech Badge" — padding [6,12], fill $accent-dim, cornerRadius 9999,
 * label Geist Mono 12/500 in $accent.
 */
export function TechBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-accent-dim px-3 py-1.5 font-mono text-xs font-medium text-accent">
      {label}
    </span>
  )
}
