import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const schemaFile = resolve(root, 'contracts/openapi.json')
const outputFile = resolve(root, 'web/lib/api/generated.ts')
const require = createRequire(new URL('../web/package.json', import.meta.url))
const { default: openapiTS, astToString } = await import(require.resolve('openapi-typescript'))
const args = new Set(process.argv.slice(2))

if (args.has('--fetch')) {
  const baseUrl = process.env.API_BASE_URL ?? 'http://localhost:5000'
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/openapi/v1.json`, {signal:AbortSignal.timeout(15000)})
  if (!response.ok) throw new Error(`OpenAPI export failed (${response.status})`)
  const schema = await response.json()
  await mkdir(resolve(root,'contracts'), {recursive:true})
  await writeFile(schemaFile, `${JSON.stringify(schema,null,2)}\n`)
}

const schema = JSON.parse(await readFile(schemaFile,'utf8'))
const generated = astToString(await openapiTS(schema))
if (args.has('--check')) {
  const existing = await readFile(outputFile,'utf8')
  if (existing !== generated) throw new Error('API client is stale. Run pnpm api:generate and commit the schema and generated client.')
  console.log('API client matches the committed OpenAPI schema.')
} else {
  await mkdir(resolve(root,'web/lib/api'), {recursive:true})
  await writeFile(outputFile, generated)
  console.log('Generated web/lib/api/generated.ts from contracts/openapi.json')
}
