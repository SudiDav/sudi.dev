import 'server-only'

import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

let sql: NeonQueryFunction<false, false> | undefined

export function getSql(): NeonQueryFunction<false, false> {
  if (sql) return sql

  const url = process.env.DATABASE_URL?.trim()
  if (!url) throw new Error('DATABASE_URL is not configured')

  sql = neon(url)
  return sql
}
