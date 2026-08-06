import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export type Subscriber = { email: string; subscribedAt: string }

/** Newsletter sign-ups, stored alongside the content. */
export async function getSubscribers(): Promise<Subscriber[]> {
  try {
    const raw = await readFile(join(process.cwd(), 'content', 'subscribers.json'), 'utf8')
    const parsed = JSON.parse(raw) as Subscriber[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
