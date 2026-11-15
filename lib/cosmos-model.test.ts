import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { WORLD_SECTORS } from '@/components/world/world-data'

/** The JSON chunk of a model in public/models, built by the scripts in tools/blender. */
function readGlb(name = 'cosmos.glb') {
  const file = readFileSync(new URL(`../public/models/${name}`, import.meta.url))
  expect(file.toString('ascii', 0, 4)).toBe('glTF')
  const length = file.readUInt32LE(12)
  return JSON.parse(file.toString('utf8', 20, 20 + length)) as {
    nodes: { name: string }[]
    meshes: { name: string; primitives: { mode?: number }[] }[]
    materials: { name: string }[]
    accessors: { count: number }[]
    animations?: { channels: { target: { node: number } }[]; samplers: { input: number }[] }[]
  }
}

/** Names in the model matching any of these patterns, which a minimal scene must not contain. */
function decoration(names: string[], patterns: RegExp[]) {
  return names.filter(name => patterns.some(pattern => pattern.test(name)))
}

describe('Blender cosmos model', () => {
  const glb = readGlb()
  const names = glb.nodes.map(node => node.name)

  it('holds the yin-yang, the centred S, the five planets, the galaxy and a starfield', () => {
    expect(names).toEqual(expect.arrayContaining(['YinYang', 'YinYangRim', 'Logo', 'LogoTop', 'LogoBottom', 'Galaxy', 'Starfield', 'FarGalaxies']))
    for (const sector of WORLD_SECTORS) expect(names).toContain(`Planet_${sector.id}`)
    expect(glb.materials.map(material => material.name)).toEqual(expect.arrayContaining(['Yin', 'Yang', 'Accent', 'Logo']))
    for (const name of ['Galaxy', 'Starfield', 'FarGalaxies']) expect(glb.meshes.find(mesh => mesh.name === name)?.primitives[0].mode).toBe(0)
  })

  it('stays minimal: no orbit for the S, no gyroscope, moons or planet rings', () => {
    expect(decoration(names, [/^LogoOrbit/, /^Gyro/, /_Moon/, /_Ring$/])).toEqual([])
  })

  it('keys one seamless loop on every frame, leaving the code-driven parts unkeyed', () => {
    expect(glb.animations).toHaveLength(1)
    const [loop] = glb.animations!
    const animated = new Set(loop.channels.map(channel => names[channel.target.node]))
    for (const name of ['YinYangSpin', 'LogoSpin', 'Galaxy']) expect(animated).toContain(name)
    // Full turns sampled sparsely collapse to no motion; every frame must be keyed.
    for (const sampler of loop.samplers) expect(glb.accessors[sampler.input].count).toBeGreaterThan(500)
    for (const name of ['YinYang', 'Logo', ...WORLD_SECTORS.map(s => `Planet_${s.id}`)]) expect(animated).not.toContain(name)
  })
})

describe('menu bar logo model', () => {
  it('holds only the two halves of the mark, unanimated', () => {
    const glb = readGlb('logo.glb')
    expect(glb.nodes.map(node => node.name).sort()).toEqual(['LogoMark', 'MarkBottom', 'MarkTop'])
    expect(glb.animations ?? []).toHaveLength(0)
    expect(glb.materials.map(material => material.name)).toEqual(['Logo'])
  })
})

