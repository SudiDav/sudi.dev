import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { WORLD_SECTORS } from '@/components/world/world-data'
import { SHOWCASE_SLOTS } from './project-showcase'

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

describe('Blender cosmos model', () => {
  const glb = readGlb()
  const names = glb.nodes.map(node => node.name)

  it('has every node the homepage world places and animates', () => {
    expect(names).toEqual(expect.arrayContaining(['YinYang', 'Logo', 'LogoTop', 'LogoBottom', 'Galaxy', 'Starfield']))
    for (const sector of WORLD_SECTORS) expect(names).toContain(`Planet_${sector.id}`)
    expect(glb.materials.map(material => material.name)).toEqual(expect.arrayContaining(['Yin', 'Yang', 'Accent', 'Glow', 'Logo']))
  })

  it('exports the galaxy and starfield as point clouds', () => {
    for (const name of ['Galaxy', 'Starfield']) {
      expect(glb.meshes.find(mesh => mesh.name === name)?.primitives[0].mode).toBe(0)
    }
  })

  it('keys one seamless loop on every frame for the spinning parts', () => {
    expect(glb.animations).toHaveLength(1)
    const [loop] = glb.animations!
    const animated = new Set(loop.channels.map(channel => names[channel.target.node]))
    for (const name of ['YinYangSpin', 'LogoOrbit', 'LogoSpin', 'Galaxy']) expect(animated).toContain(name)
    // Full turns sampled sparsely collapse to no motion; every frame must be keyed.
    for (const sampler of loop.samplers) expect(glb.accessors[sampler.input].count).toBeGreaterThan(500)
    // The code-driven parts must stay free of keyframes.
    for (const name of ['YinYang', 'Logo', 'LogoTop', 'LogoBottom', ...WORLD_SECTORS.map(s => `Planet_${s.id}`)]) {
      expect(animated).not.toContain(name)
    }
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

describe('featured projects showcase model', () => {
  const glb = readGlb('showcase.glb')
  const names = glb.nodes.map(node => node.name)

  it('holds a monolith with a cover screen for every slot, and the 3D S crowning them', () => {
    for (let index = 0; index < SHOWCASE_SLOTS; index++) {
      expect(names).toEqual(expect.arrayContaining([`Monolith_${index}`, `Screen_${index}`, `EnergyRing_${index}`, `Beam_${index}`]))
      expect(glb.materials.map(material => material.name)).toContain(`Screen_${index}`)
    }
    expect(names).toEqual(expect.arrayContaining(['Crown', 'CrownTop', 'CrownBottom']))
  })

  it('animates in one loop, leaving the code-driven parts unkeyed', () => {
    expect(glb.animations).toHaveLength(1)
    const animated = new Set(glb.animations![0].channels.map(channel => names[channel.target.node]))
    for (const name of ['CrownSpin', 'CrownTop', 'Hover_0', 'Crystal_2']) expect(animated).toContain(name)
    for (const name of ['Crown', ...Array.from({ length: SHOWCASE_SLOTS }, (_, index) => `Monolith_${index}`)]) {
      expect(animated).not.toContain(name)
    }
  })
})
