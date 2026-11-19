import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import manifest from '@/components/portrait-relief-manifest.json'

const assets = new URL('../public/', import.meta.url)
function asset(path: string) {
  return readFileSync(new URL(path.slice(1), assets))
}

describe('the studio portrait relief', () => {
  it('binds the relief to the photograph used to create its texture', () => {
    const digest = createHash('sha256').update(asset(manifest.source)).digest('hex')
    expect(digest).toBe(manifest.sourceSha256)
  })

  it('exports one textured surface facing the camera with real depth', () => {
    const glb = asset(manifest.model)
    const gltf = JSON.parse(glb.toString('utf8', 20, 20 + glb.readUInt32LE(12)))
    expect(gltf.meshes).toHaveLength(1)
    const primitive = gltf.meshes[0].primitives[0]
    const bounds = gltf.accessors[primitive.attributes.POSITION]
    const width = bounds.max[0] - bounds.min[0]
    const depth = bounds.max[2] - bounds.min[2]
    expect(depth).toBeGreaterThan(0)
    expect(depth).toBeLessThan(width)
    expect(gltf.materials[primitive.material].pbrMetallicRoughness.baseColorTexture).toBeDefined()
  })
})
