import * as THREE from 'three'

const COUNT = 7
const POINTS = 1600

/**
 * Small spiral galaxies scattered along the warp's path, off to the sides so
 * they drift past the portals. Each is a two-armed point cloud with a warm core
 * fading to accent-blue arms, tilted at its own angle and turning slowly.
 */
export function createGalaxies(length: number, restDistance: number, sprite: THREE.Texture, accent: string) {
  const random = (seed: number) => { const x = Math.sin(seed * 7919.3) * 43758.55; return x - Math.floor(x) }
  const core = new THREE.Color('#ffe6c4')
  const arm = new THREE.Color(accent).lerp(new THREE.Color('#9db4f0'), 0.5)
  const material = new THREE.PointsMaterial({
    size: 0.16, map: sprite, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  })
  const geometries: THREE.BufferGeometry[] = []
  const galaxies = Array.from({ length: COUNT }, (_, index) => {
    const positions = new Float32Array(POINTS * 3)
    const colors = new Float32Array(POINTS * 3)
    const colour = new THREE.Color()
    for (let i = 0; i < POINTS; i++) {
      const seed = index * 10_000 + i
      const t = random(seed) ** 0.7
      const radius = 0.2 + t * 5
      const angle = t * 4.2 + (i % 2) * Math.PI + (random(seed + 0.5) - 0.5) * (0.5 + t * 0.6)
      positions.set([Math.cos(angle) * radius, (random(seed + 0.7) - 0.5) * 0.3 * (1 - t), Math.sin(angle) * radius], i * 3)
      colour.copy(core).lerp(arm, Math.min(1, t * 1.6))
      colors.set([colour.r, colour.g, colour.b], i * 3)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometries.push(geometry)
    // A tilted holder, so each galaxy can turn about its own axis inside it.
    const holder = new THREE.Group()
    const side = index % 2 === 0 ? 1 : -1
    holder.position.set(side * (14 + random(index + 3) * 10), (random(index + 5) - 0.4) * 14, restDistance - 20 - (index / (COUNT - 1)) * (length + 40))
    holder.rotation.set(0.5 + random(index + 9) * 0.9, random(index + 11) * Math.PI, (random(index + 13) - 0.5) * 0.8)
    holder.scale.setScalar(0.8 + random(index + 17) * 0.9)
    holder.add(new THREE.Points(geometry, material))
    return holder
  })
  return {
    galaxies,
    material,
    /** Turn each galaxy slowly about its own axis. */
    spin(clock: number) {
      galaxies.forEach((holder, index) => { holder.children[0].rotation.y = clock * (0.05 + index * 0.008) })
    },
    /** Additive light glows on dark pages; on white it would vanish, so draw darker dots there. */
    setLight(light: boolean) {
      material.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending
      material.color.set(light ? '#34416a' : '#ffffff')
      material.needsUpdate = true
    },
    dispose() {
      geometries.forEach(geometry => geometry.dispose())
      material.dispose()
    },
  }
}
