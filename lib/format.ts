/**
 * The design displays dates as "Jul 15, 2026". Content stores them as ISO
 * strings so they sort correctly, so the display form is derived here.
 *
 * Parsed as UTC deliberately: `new Date('2026-07-15')` is midnight UTC, and
 * formatting that in a timezone behind UTC would render the previous day.
 */
export function formatPostDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
