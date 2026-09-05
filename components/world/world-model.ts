import * as THREE from 'three'
import { WORLD_SECTORS, type SectorId } from './world-data'

/** A sculptural taijitu and five reflections, made entirely from geometry. */
export function buildWorld(scene: THREE.Scene) {
  const yin = new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.35 })
  const yang = new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.15 })
  const accent = new THREE.MeshStandardMaterial({ roughness: 0.25, metalness: 0.5 })
  const glow = new THREE.MeshBasicMaterial()
  const line = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.26 })
  const world = new THREE.Group()
  scene.add(world)

  function ring(parent: THREE.Object3D, radius: number, y: number, material: THREE.Material = accent, thickness = 0.015) {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, thickness, 8, 128), material)
    mesh.rotation.x = Math.PI / 2
    mesh.position.y = y
    parent.add(mesh)
    return mesh
  }

  // Two complementary S-shaped solids; each carries a seed of its opposite.
  const radius = 2.15
  const half = new THREE.Shape()
  half.moveTo(0, radius)
  half.absarc(0, 0, radius, Math.PI / 2, -Math.PI / 2, true)
  half.absarc(0, -radius / 2, radius / 2, -Math.PI / 2, Math.PI / 2, true)
  half.absarc(0, radius / 2, radius / 2, -Math.PI / 2, Math.PI / 2, false)
  half.closePath()
  const geometry = new THREE.ExtrudeGeometry(half, {
    depth: 0.24, bevelEnabled: true, bevelThickness: 0.055, bevelSize: 0.035,
    bevelSegments: 4, steps: 1, curveSegments: 64,
  })
  const processor = new THREE.Group()
  processor.position.y = 2.3
  processor.rotation.set(-0.55, 0.48, 0)
  const lightHalf = new THREE.Mesh(geometry, yang)
  const darkHalf = new THREE.Mesh(geometry, yin)
  darkHalf.rotation.z = Math.PI
  processor.add(lightHalf, darkHalf)
  for (const side of [-1, 1]) {
    const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.028, 48), side > 0 ? yang : yin)
    dot.rotation.x = Math.PI / 2
    dot.position.set(0, side * radius / 2, 0.315)
    processor.add(dot)
  }
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius + 0.075, 0.025, 12, 128), accent)
  rim.position.z = 0.11
  processor.add(rim)
  world.add(processor)

  const orbit = ring(world, 3.05, 2.1, accent, 0.012)
  orbit.rotation.set(0.9, 0.3, -0.35)
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

  const beacons = new Map<SectorId, THREE.Group>()
  const targets: THREE.Object3D[] = []
  for (const sector of WORLD_SECTORS) {
    const beacon = new THREE.Group()
    beacon.position.set(sector.x, 0.7, sector.z)
    beacon.add(new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 16), glow))
    ring(beacon, 0.26, 0, accent, 0.018)
    ring(beacon, 0.42, -0.55, accent, 0.008)
    const arc = ring(beacon, 0.2, 0, accent, 0.009)
    arc.rotation.set(0, 0, Math.PI / 3)
    world.add(beacon)
    beacons.set(sector.id, beacon)
    const hit = new THREE.Mesh(new THREE.SphereGeometry(0.7), new THREE.MeshBasicMaterial({ visible: false }))
    hit.position.set(sector.x, 0.7, sector.z)
    hit.userData.sector = sector.id
    world.add(hit)
    targets.push(hit)
  }

  const stars = new Float32Array(120 * 3)
  for (let i = 0; i < 120; i++) {
    const angle = i * 2.399963
    const distance = 4.7 + (i % 11) * 0.25
    stars[i * 3] = Math.cos(angle) * distance
    stars[i * 3 + 1] = (i % 13) * 0.31 - 0.5
    stars[i * 3 + 2] = Math.sin(angle) * distance
  }
  const starGeometry = new THREE.BufferGeometry()
  starGeometry.setAttribute('position', new THREE.BufferAttribute(stars, 3))
  const starMaterial = new THREE.PointsMaterial({ size: 0.035, transparent: true, opacity: 0.45 })
  world.add(new THREE.Points(starGeometry, starMaterial))

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

  function setPalette() {
    const css = getComputedStyle(document.documentElement)
    const color = (name: string) => css.getPropertyValue(name).trim()
    // The symbol always retains its dark/light contrast in either page theme.
    yin.color.set('#13131B')
    yang.color.set('#EDEDF0')
    accent.color.set(color('--accent'))
    accent.emissive.set(color('--accent'))
    accent.emissiveIntensity = 0.15
    glow.color.set(color('--accent'))
    line.color.set(color('--accent'))
    starMaterial.color.set(color('--accent'))
  }
  setPalette()
  return { world, processor, orbit, rover, shadow, beacons, targets, setPalette }
}
