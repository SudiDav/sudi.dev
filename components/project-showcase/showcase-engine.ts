import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { starSprite } from '@/components/world/world-model'
import { crownYaw, fitDistance, SHOWCASE_SLOTS } from '@/lib/project-showcase'

/** Half the size of everything worth framing, in model units, around TARGET. */
const FRAME = { halfWidth: 5.1, halfHeight: 3.35 }
const TARGET = new THREE.Vector3(0, 2.95, -0.4)
const FOV = 32
/** Where a reduced-motion still is taken: everything apart and readable. */
const STILL_SECONDS = 9

type Options = {
  covers: (string | undefined)[]
  onHover(index: number | null): void
  onSelect(index: number): void
  onUnavailable(): void
}

export function loadShowcase() {
  return new GLTFLoader().loadAsync('/models/showcase.glb')
}

/**
 * The homepage's featured projects as three monoliths, modelled and animated in
 * Blender (tools/blender/build_showcase.py). The loop plays as exported; code
 * only places the camera, puts each project's cover on its screen, and lifts
 * whichever monolith is highlighted while the 3D S above turns to face it.
 */
export function createShowcaseEngine(
  canvas: HTMLCanvasElement,
  gltf: Awaited<ReturnType<typeof loadShowcase>>,
  { covers, onHover, onSelect, onUnavailable }: Options,
) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = environment
  scene.environmentIntensity = 0.6
  const key = new THREE.DirectionalLight(0xffffff, 2)
  key.position.set(-4, 8, 6)
  const rim = new THREE.DirectionalLight(0x9db4f0, 2.4)
  rim.position.set(5, 3, -6)
  scene.add(key, rim, new THREE.AmbientLight(0xffffff, 0.35))
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 80)

  const model = gltf.scene
  scene.add(model)
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#607EBC'
  const sprite = starSprite()
  const loader = new THREE.TextureLoader()
  const textures: THREE.Texture[] = []

  model.traverse(object => {
    if (object instanceof THREE.Points) {
      object.material = new THREE.PointsMaterial({
        size: 0.075, map: sprite, color: 0xb9cbf2, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      })
    } else if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial) {
      const material = object.material
      if (['Frame', 'Energy', 'Logo'].includes(material.name)) {
        material.color.set(accent)
        material.emissive.set(accent)
      }
      if (material.name === 'Beam') {
        material.depthWrite = false
        material.blending = THREE.AdditiveBlending
      }
    }
  })

  const monoliths = Array.from({ length: SHOWCASE_SLOTS }, (_, index) => {
    const root = model.getObjectByName(`Monolith_${index}`)!
    const used = index < covers.length
    root.visible = used
    // Each monolith gets its own glow materials so one can brighten alone.
    const glows = ['EnergyRing', 'Beam'].map(name => {
      const mesh = root.getObjectByName(`${name}_${index}`) as THREE.Mesh
      mesh.material = (mesh.material as THREE.MeshStandardMaterial).clone()
      const material = mesh.material as THREE.MeshStandardMaterial
      return { material, rest: material.emissiveIntensity }
    })
    const screen = root.getObjectByName(`Screen_${index}`) as THREE.Mesh
    const cover = covers[index]
    if (cover) {
      // A standby glow until the cover arrives, then the cover itself.
      const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(accent).multiplyScalar(0.35), toneMapped: false })
      screen.material = material
      const texture = loader.load(cover, () => {
        material.map = texture
        material.color.set(0xffffff)
        material.needsUpdate = true
        if (!running) draw()
      })
      texture.flipY = false // glTF UVs run top-down
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = 4
      textures.push(texture)
    }
    return { root, used, glows, restY: root.position.y, lift: 0 }
  })
  const crown = model.getObjectByName('Crown')!
  const restYaw = crown.rotation.y

  const mixer = new THREE.AnimationMixer(model)
  for (const clip of gltf.animations) mixer.clipAction(clip).play()

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 }
  const raycaster = new THREE.Raycaster()
  let highlighted: number | null = null
  let hovered: number | null = null
  let visible = false
  let running = false
  let disposed = false
  let frame = 0
  let previous = 0
  let lost = false

  function place() {
    const distance = fitDistance(FRAME.halfWidth, FRAME.halfHeight, FOV, camera.aspect)
    const yaw = pointer.x * 0.22
    const pitch = 0.1 + pointer.y * 0.08
    camera.position.set(
      TARGET.x + Math.sin(yaw) * Math.cos(pitch) * distance,
      TARGET.y + Math.sin(pitch) * distance,
      TARGET.z + Math.cos(yaw) * Math.cos(pitch) * distance,
    )
    camera.lookAt(TARGET)
  }

  /** Ease the lift, glow and crown toward the highlighted monolith; true while still moving. */
  function settle(delta: number) {
    const follow = reduce.matches ? 1 : 1 - Math.exp(-6 * delta)
    let moving = false
    monoliths.forEach((monolith, index) => {
      const target = highlighted === index ? 1 : 0
      monolith.lift += (target - monolith.lift) * follow
      if (Math.abs(target - monolith.lift) > 0.002) moving = true
      monolith.root.position.y = monolith.restY + monolith.lift * 0.35
      monolith.root.scale.setScalar(1 + monolith.lift * 0.06)
      for (const glow of monolith.glows) glow.material.emissiveIntensity = glow.rest * (1 + monolith.lift * 1.6)
    })
    const yaw = restYaw + crownYaw(highlighted)
    crown.rotation.y += (yaw - crown.rotation.y) * follow
    if (Math.abs(yaw - crown.rotation.y) > 0.002) moving = true
    pointer.x += (pointer.targetX - pointer.x) * follow
    pointer.y += (pointer.targetY - pointer.y) * follow
    if (Math.abs(pointer.targetX - pointer.x) > 0.002 || Math.abs(pointer.targetY - pointer.y) > 0.002) moving = true
    return moving
  }

  function draw(delta = 0) {
    if (disposed || lost) return false
    const moving = settle(delta)
    place()
    renderer.render(scene, camera)
    return moving
  }

  function tick(now: number) {
    frame = 0
    if (!running) return
    const delta = previous ? Math.min((now - previous) / 1000, 0.1) : 0
    previous = now
    mixer.update(delta)
    draw(delta)
    frame = requestAnimationFrame(tick)
  }

  /** Reduced motion: no loop, but the highlight still lands, in one frame. */
  function still() {
    mixer.setTime(STILL_SECONDS)
    draw()
  }

  function sync() {
    const shouldRun = visible && !document.hidden && !reduce.matches && !disposed && !lost
    if (shouldRun && !running) {
      running = true
      previous = 0
      frame = requestAnimationFrame(tick)
    } else if (!shouldRun && running) {
      running = false
      cancelAnimationFrame(frame)
      frame = 0
    }
    if (reduce.matches) still()
  }

  function resize() {
    const { width, height } = canvas.getBoundingClientRect()
    if (!width || !height) return
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    if (!running) draw()
  }

  function pick(event: MouseEvent) {
    const rect = canvas.getBoundingClientRect()
    const ndc = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    )
    raycaster.setFromCamera(ndc, camera)
    const hit = raycaster.intersectObjects(monoliths.filter(m => m.used).map(m => m.root), true)[0]
    if (!hit) return null
    return monoliths.findIndex(monolith => {
      let node: THREE.Object3D | null = hit.object
      while (node && node !== monolith.root) node = node.parent
      return node === monolith.root
    })
  }

  function pointerMove(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect()
    if (event.pointerType === 'mouse' && !reduce.matches) {
      pointer.targetX = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.targetY = ((event.clientY - rect.top) / rect.height) * 2 - 1
    }
    const index = pick(event)
    const next = index === -1 ? null : index
    if (next !== hovered) {
      hovered = next
      canvas.style.cursor = next === null ? '' : 'pointer'
      onHover(next)
    }
    if (!running) draw()
  }

  function pointerLeave() {
    pointer.targetX = pointer.targetY = 0
    if (hovered !== null) { hovered = null; canvas.style.cursor = ''; onHover(null) }
    if (!running) draw()
  }

  function click(event: MouseEvent) {
    const index = pick(event)
    if (index !== null && index >= 0) onSelect(index)
  }

  function contextLost(event: Event) {
    event.preventDefault()
    lost = true
    sync()
    onUnavailable()
  }

  const sizer = new ResizeObserver(resize)
  sizer.observe(canvas)
  canvas.addEventListener('pointermove', pointerMove)
  canvas.addEventListener('pointerleave', pointerLeave)
  canvas.addEventListener('click', click)
  canvas.addEventListener('webglcontextlost', contextLost)
  document.addEventListener('visibilitychange', sync)
  reduce.addEventListener('change', sync)
  resize()
  sync()

  return {
    setVisible(next: boolean) { visible = next; sync() },
    highlight(index: number | null) {
      highlighted = index
      if (reduce.matches) still()
    },
    dispose() {
      disposed = true
      running = false
      cancelAnimationFrame(frame)
      sizer.disconnect()
      canvas.removeEventListener('pointermove', pointerMove)
      canvas.removeEventListener('pointerleave', pointerLeave)
      canvas.removeEventListener('click', click)
      canvas.removeEventListener('webglcontextlost', contextLost)
      document.removeEventListener('visibilitychange', sync)
      reduce.removeEventListener('change', sync)
      mixer.stopAllAction()
      model.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          object.geometry.dispose()
          ;(object.material as THREE.Material).dispose()
        }
      })
      for (const texture of textures) texture.dispose()
      sprite.dispose()
      environment.dispose()
      pmrem.dispose()
      // No forceContextLoss: React may remount onto this same canvas.
      renderer.dispose()
    },
  }
}
