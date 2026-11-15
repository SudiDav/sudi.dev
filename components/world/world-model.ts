import * as THREE from 'three'
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js'
import { WORLD_SECTORS, type SectorId } from './world-data'

const STAR_TINTS = ['#FFFFFF', '#DCE6FF', '#9DB4F0', '#F2A541', '#E86A92', '#8B6CEF']

/** A soft round dot, so point-cloud stars read as light rather than squares. */
export function starSprite() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const context = canvas.getContext('2d')!
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.55)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(canvas)
}

/** Replace a glTF point cloud's 1px default material with tinted, round, sized stars. */
function stars(points: THREE.Points, size: number, sprite: THREE.Texture) {
  const count = points.geometry.getAttribute('position').count
  const colours = new Float32Array(count * 3)
  const colour = new THREE.Color()
  for (let i = 0; i < count; i++) {
    // Mostly white-blue, with a deterministic sprinkle of the planets' hues.
    const pick = (i * 2654435761) >>> 0
    colour.set(STAR_TINTS[pick % 23 < 3 ? 3 + (pick % 3) : pick % 3])
    colours.set([colour.r, colour.g, colour.b], i * 3)
  }
  points.geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3))
  const material = new THREE.PointsMaterial({ size, map: sprite, vertexColors: true, transparent: true, depthWrite: false })
  ;(points.material as THREE.Material).dispose()
  points.material = material
  return material
}

/**
 * The homepage cosmos. The sculpted pieces and their looping motion come from
 * Blender (tools/blender/build_cosmos.py); this places them on the five
 * reflections and adds the parts that respond to the page.
 */
export function buildWorld(scene: THREE.Scene, cosmos: GLTF) {
  // Index everything before pieces are moved out of the loaded scene.
  const nodes = new Map<string, THREE.Object3D>()
  const materials = new Map<string, THREE.MeshStandardMaterial>()
  cosmos.scene.traverse(object => {
    nodes.set(object.name, object)
    if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial) materials.set(object.material.name, object.material)
  })
  const node = (name: string) => {
    const found = nodes.get(name)
    if (!found) throw new Error(`cosmos.glb is missing ${name}`)
    return found
  }
  const material = (name: string) => materials.get(name) ?? new THREE.MeshStandardMaterial()
  const accent = material('Accent')
  const logoMaterial = material('Logo')
  const glow = material('Glow')
  const yang = material('Yang')
  const line = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.26 })
  const world = new THREE.Group()
  scene.add(world)

  function ring(parent: THREE.Object3D, radius: number, y: number, ringMaterial: THREE.Material = accent, thickness = 0.015) {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, thickness, 8, 128), ringMaterial)
    mesh.rotation.x = Math.PI / 2
    mesh.position.y = y
    parent.add(mesh)
    return mesh
  }

  // The taijitu and its gyroscope of rings float above the landscape.
  const processor = new THREE.Group()
  processor.position.y = 2.3
  processor.rotation.set(-0.55, 0.48, 0)
  processor.add(node('YinYang'))
  world.add(processor)

  // The logo orbits the symbol on its own tilted path.
  const logo = node('Logo')
  logo.position.set(0, 2.6, 0)
  world.add(logo)
  const logoHalves = ['LogoTop', 'LogoBottom'].map(name => {
    const half = node(name)
    return { half, rest: half.position.clone(), restTurn: half.rotation.z, turn: name === 'LogoTop' ? 1 : -1, from: new THREE.Vector3(name === 'LogoTop' ? -2.6 : 2.6, name === 'LogoTop' ? 1.8 : -1.8, 1.2) }
  })

  ring(world, 4.95, -0.2)
  ring(world, 5.08, -0.2, accent, 0.006)

  // Concentric wave contours connect the symbol to the five reflections.
  for (let row = 0; row < 7; row++) {
    const points = []
    for (let i = 0; i <= 160; i++) {
      const angle = i / 160 * Math.PI * 2
      const r = 1.2 + row * 0.48 + Math.sin(angle * 3 + row * 0.5) * 0.14
      points.push(new THREE.Vector3(Math.cos(angle) * r, -0.28, Math.sin(angle) * r))
    }
    world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), line))
  }

  // Each reflection is a planet with its own moon.
  const beacons = new Map<SectorId, THREE.Object3D>()
  const targets: THREE.Object3D[] = []
  for (const sector of WORLD_SECTORS) {
    const planet = node(`Planet_${sector.id}`)
    planet.position.set(sector.x, 0.7, sector.z)
    world.add(planet)
    beacons.set(sector.id, planet)
    const hit = new THREE.Mesh(new THREE.SphereGeometry(0.7), new THREE.MeshBasicMaterial({ visible: false }))
    hit.position.set(sector.x, 0.7, sector.z)
    hit.userData.sector = sector.id
    world.add(hit)
    targets.push(hit)
  }

  // A spiral galaxy turns beneath everything, inside a sky of distant stars.
  const sprite = starSprite()
  const galaxy = node('Galaxy') as THREE.Points
  const starfield = node('Starfield') as THREE.Points
  scene.add(galaxy, starfield)
  const starMaterials = [stars(galaxy, 0.16, sprite), stars(starfield, 0.55, sprite)]

  // A small spark is the player, carrying attention between reflections.
  const rover = new THREE.Group()
  rover.add(new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 16), yang))
  ring(rover, 0.23, 0, glow)
  const sparkOrbit = ring(rover, 0.21, 0, accent)
  sparkOrbit.rotation.x = 0.4
  rover.position.set(-4.8, 0.75, 4.8)
  rover.visible = false
  world.add(rover)
  const shadow = new THREE.Mesh(new THREE.RingGeometry(0.14, 0.18, 32), glow)
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = -0.15
  shadow.visible = false
  world.add(shadow)

  let starOpacity = 1
  let light = false
  function setStars(opacity: number) {
    starOpacity = opacity
    for (const starMaterial of starMaterials) starMaterial.opacity = opacity * (light ? 0.55 : 0.9)
  }

  function setPalette() {
    const css = getComputedStyle(document.documentElement)
    const colour = css.getPropertyValue('--accent').trim()
    light = document.documentElement.classList.contains('light')
    accent.color.set(colour)
    accent.emissive.set(colour)
    logoMaterial.color.set(colour)
    logoMaterial.emissive.set(colour)
    glow.color.set(light ? colour : '#B9CBF2')
    glow.emissive.set(light ? colour : '#B9CBF2')
    line.color.set(colour)
    // Additive light glows on the dark theme but vanishes on white, so the
    // light theme draws ordinary accent-tinted dots instead.
    for (const starMaterial of starMaterials) {
      starMaterial.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending
      starMaterial.color.set(light ? colour : '#FFFFFF')
      starMaterial.needsUpdate = true
    }
    setStars(starOpacity)
  }
  setPalette()
  return { world, processor, logo, logoHalves, rover, shadow, beacons, targets, setPalette, setStars, sprite }
}
