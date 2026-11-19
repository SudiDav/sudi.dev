import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { collectSignals, moveRover, moveTowardSignal, type WorldPoint } from '@/lib/world-game'
import { cosmosIntro, yinYangImpulse } from '@/lib/world-motion'
import { WORLD_SECTORS, type SectorId } from './world-data'
import { buildWorld, HOME_CAMERA, SYMBOL_HEIGHT } from './world-model'

type Options = {
  /** Screen positions (0..1) of each planet, and of the base of the S for its "I am" label. */
  onProject?: (points: { id: SectorId; x: number; y: number }[], self: { x: number; y: number }) => void
  onHover?: (id: SectorId | null) => void
  onSelect: (id: SectorId) => void
  onCollect: (ids: string[]) => void
  onUnavailable: () => void
}

export type WorldEngine = ReturnType<typeof createWorldEngine>

/** The Blender-built cosmos (tools/blender/build_cosmos.py). */
export function loadCosmos() {
  return new GLTFLoader().loadAsync('/models/cosmos.glb')
}

export function createWorldEngine(canvas: HTMLCanvasElement, cosmos: GLTF, options: Options) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.9
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100)
  const home = HOME_CAMERA.clone()
  camera.position.copy(home)
  const controls = new OrbitControls(camera, canvas)
  controls.target.set(0, 0.3, 0)
  controls.enablePan = false
  controls.enableZoom = false
  controls.enableDamping = false
  controls.minPolarAngle = 0.45
  controls.maxPolarAngle = 1.18
  controls.rotateSpeed = 0.5
  controls.update()
  // Vertical touch gestures remain available for scrolling the page.
  canvas.style.touchAction = 'pan-y'

  scene.add(new THREE.AmbientLight(0xffffff, 0.8))
  const key = new THREE.DirectionalLight(0xfff6e8, 2.15)
  key.position.set(-5, 12, 8)
  scene.add(key)
  const rim = new THREE.DirectionalLight(0xa5bbeb, 2.25)
  rim.position.set(4, 6, -8)
  scene.add(rim)
  // Soft studio reflections give the metal and gloss from Blender something to mirror.
  const pmrem = new THREE.PMREMGenerator(renderer)
  // Keep the whole render target: disposing only its texture would leave its framebuffer behind.
  const studio = new RoomEnvironment()
  const environment = pmrem.fromScene(studio, 0.04)
  studio.dispose()
  scene.environment = environment.texture
  scene.environmentIntensity = 0.7
  const model = buildWorld(scene, cosmos)
  const mixer = new THREE.AnimationMixer(scene)
  for (const clip of cosmos.animations) mixer.clipAction(clip).play()
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const keys = new Set<string>()
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  let mode: 'explore' | 'play' = 'explore'
  let collected: string[] = []
  let destination: WorldPoint | null = null
  let selected: SectorId | null = null
  let paused = reducedMotion.matches
  let visible = true
  let disposed = false
  let frame = 0
  let previous = 0
  let elapsed = 0
  let down = { x: 0, y: 0 }
  let dragged = false
  const hover = { x: 0, y: 0 }
  let impulseStarted: number | null = null
  let impulseBase = 0
  let restTurn = 0
  let introStarted: number | null = reducedMotion.matches ? null : performance.now()
  let introScale = 1
  let introTurn = 0
  const planetScale = new Map<SectorId, number>()

  function applyIntro(pose: ReturnType<typeof cosmosIntro>) {
    introScale = pose.symbolScale
    introTurn = pose.symbolTurn
    model.logo.scale.setScalar(Math.max(pose.symbolScale, 0.0001))
    WORLD_SECTORS.forEach((sector, index) => planetScale.set(sector.id, Math.max(pose.planetScale(index), 0.0001)))
    model.setStars(pose.stars)
    updateBeacons()
  }

  function render() {
    if (disposed) return
    // The S always turns to face the viewer, however the universe is dragged.
    model.logo.rotation.y = Math.atan2(camera.position.x, camera.position.z)
    renderer.render(scene, camera)
    if (options.onProject) {
      const point = new THREE.Vector3()
      const toScreen = (vector: THREE.Vector3) => ({ x: (vector.x + 1) / 2, y: (1 - vector.y) / 2 })
      const self = toScreen(model.logo.localToWorld(point.copy(model.logoBase)).project(camera))
      options.onProject([...model.beacons].map(([id, beacon]) => ({ id, ...toScreen(beacon.getWorldPosition(point).project(camera)) })), self)
    }
  }

  function moving() {
    return mode === 'play' && (keys.size > 0 || destination !== null)
  }

  function animating() {
    return !paused || moving() || impulseStarted !== null || introStarted !== null
  }

  function schedule() {
    if (!disposed && !frame && visible && !document.hidden && animating()) {
      previous = 0
      frame = requestAnimationFrame(tick)
    }
  }

  function stopMovement() {
    keys.clear()
    destination = null
  }

  function tick(now: number) {
    frame = 0
    if (disposed || !visible || document.hidden) return
    const delta = previous ? Math.min((now - previous) / 1000, 0.1) : 0
    previous = now
    if (introStarted !== null) {
      const pose = cosmosIntro((now - introStarted) / 1000)
      applyIntro(pose)
      if (!pose.active) introStarted = null
    }
    if (!paused) {
      elapsed += delta
      mixer.update(delta)
      const follow = 1 - Math.exp(-5 * delta)
      model.processor.rotation.x += (-0.55 + hover.y * 0.22 - model.processor.rotation.x) * follow
      model.processor.rotation.y += (0.48 + hover.x * 0.28 - model.processor.rotation.y) * follow
      for (const [id, beacon] of model.beacons) {
        beacon.rotation.y = elapsed * 0.7
        beacon.position.y = 0.7 + Math.sin(elapsed * 1.5 + WORLD_SECTORS.findIndex(s => s.id === id)) * 0.1
      }
    }
    const impulse = impulseStarted === null ? null : yinYangImpulse((now - impulseStarted) / 1000)
    const bounce = impulse?.bounce ?? 0
    model.processor.position.y = SYMBOL_HEIGHT + Math.sin(elapsed * 1.3) * 0.22 + bounce
    model.processor.rotation.z = (impulse ? impulseBase + impulse.turn : restTurn + Math.sin(elapsed * 0.65) * 0.07) + introTurn
    model.processor.scale.set((1 - bounce * 0.08) * introScale, (1 + bounce * 0.12) * introScale, introScale)
    if (impulse && !impulse.active) impulseStarted = null
    if (mode === 'play') {
      let input = { x: 0, z: 0 }
      if (keys.size) {
        destination = null
        const horizontal = Number(keys.has('ArrowRight') || keys.has('d')) - Number(keys.has('ArrowLeft') || keys.has('a'))
        const vertical = Number(keys.has('ArrowDown') || keys.has('s')) - Number(keys.has('ArrowUp') || keys.has('w'))
        const angle = Math.atan2(camera.position.x, camera.position.z)
        input = {
          x: Math.cos(angle) * horizontal + Math.sin(angle) * vertical,
          z: -Math.sin(angle) * horizontal + Math.cos(angle) * vertical,
        }
      }
      const next = destination
        ? moveTowardSignal(model.rover.position, destination, delta)
        : moveRover(model.rover.position, input, delta)
      if (destination && next.x === destination.x && next.z === destination.z) destination = null
      model.rover.position.x = next.x
      model.rover.position.z = next.z
      model.shadow.position.set(next.x, -0.15, next.z)
      const signals = collectSignals(next, collected, WORLD_SECTORS)
      if (signals.length !== collected.length) {
        collected = signals
        updateBeacons()
        options.onCollect(collected)
        pulse()
        if (collected.length === WORLD_SECTORS.length) stopMovement()
      }
    }
    render()
    if (animating()) frame = requestAnimationFrame(tick)
  }

  function pulse() {
    impulseBase = model.processor.rotation.z
    restTurn = impulseBase + Math.PI * 2
    if (reducedMotion.matches && paused) {
      // A static change of pose honours reduced motion; Resume opts into motion.
      restTurn = impulseBase + Math.PI
      model.processor.rotation.z = restTurn
      render()
      return
    }
    impulseStarted = performance.now()
    schedule()
  }

  function updateBeacons() {
    for (const [id, beacon] of model.beacons) {
      beacon.visible = mode !== 'play' || !collected.includes(id)
      beacon.scale.setScalar((id === selected ? 1.5 : 1) * (planetScale.get(id) ?? 1))
    }
  }

  function select(id: SectorId) {
    selected = id
    options.onSelect(id)
    if (mode === 'play' && !collected.includes(id)) {
      const sector = WORLD_SECTORS.find(s => s.id === id)!
      destination = { x: sector.x, z: sector.z }
      schedule()
    }
    updateBeacons()
    if (mode === 'explore') pulse()
    render()
  }

  function resize() {
    const { width, height } = canvas.getBoundingClientRect()
    if (!width || !height) return
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    // Fit the landscape on narrow phones without clipping its corners.
    camera.fov = camera.aspect < 1 ? 48 : 36
    camera.updateProjectionMatrix()
    render()
  }

  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(canvas)
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    if (visible) schedule()
    else {
      keys.clear()
      cancelAnimationFrame(frame)
      frame = 0
    }
  })
  intersectionObserver.observe(canvas)
  const themeObserver = new MutationObserver(() => { model.setPalette(); render() })
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

  function visibilityChanged() {
    if (document.hidden) {
      keys.clear()
      cancelAnimationFrame(frame)
      frame = 0
    } else schedule()
  }

  /** Stop every automatic motion at its resting pose: the intro, a tap's bounce and the float. */
  function settle() {
    impulseStarted = null
    introStarted = null
    applyIntro(cosmosIntro(Infinity))
    model.processor.scale.setScalar(1)
    model.processor.position.y = SYMBOL_HEIGHT
  }

  function motionChanged() {
    paused = reducedMotion.matches
    if (paused) {
      settle()
      cancelAnimationFrame(frame)
      frame = 0
      render()
    }
    schedule()
  }

  function pointerDown(event: PointerEvent) {
    down = { x: event.clientX, y: event.clientY }
    dragged = false
    if (event.pointerType === 'mouse') canvas.focus({ preventScroll: true })
  }

  function pointerUp(event: PointerEvent) {
    if (dragged || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 6) return
    const rect = canvas.getBoundingClientRect()
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1)
    raycaster.setFromCamera(pointer, camera)
    if (raycaster.intersectObject(model.processor, true).length) {
      pulse()
      return
    }
    const hit = raycaster.intersectObjects(model.targets)[0]
    if (hit) select(hit.object.userData.sector as SectorId)
  }

  function pointerMove(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect()
    hover.x = (event.clientX - rect.left) / rect.width * 2 - 1
    hover.y = (event.clientY - rect.top) / rect.height * 2 - 1
    if (event.buttons && Math.hypot(event.clientX - down.x, event.clientY - down.y) > 6) dragged = true
    pointer.set(hover.x, -hover.y)
    raycaster.setFromCamera(pointer, camera)
    const symbolHit = raycaster.intersectObject(model.processor, true)[0]
    const targetHit = raycaster.intersectObjects(model.targets)[0]
    const worldHit = targetHit && (!symbolHit || targetHit.distance < symbolHit.distance) ? targetHit : null
    canvas.style.cursor = symbolHit || worldHit ? 'pointer' : 'grab'
    if (event.pointerType !== 'touch') options.onHover?.(!event.buttons && worldHit ? worldHit.object.userData.sector as SectorId : null)
  }

  function pointerLeave(event: PointerEvent) {
    hover.x = 0
    hover.y = 0
    if (event.pointerType !== 'touch') options.onHover?.(null)
  }

  function normalizeKey(key: string) { return key.length === 1 ? key.toLowerCase() : key }
  const movementKeys = ['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
  function keyDown(event: KeyboardEvent) {
    if (event.metaKey || event.ctrlKey || event.altKey) return
    const key = normalizeKey(event.key)
    if (key === ' ' || key === 'Enter') {
      event.preventDefault()
      if (!event.repeat) pulse()
      return
    }
    if (mode === 'play' && movementKeys.includes(key) && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault()
      keys.add(key)
      schedule()
    }
  }
  function keyUp(event: KeyboardEvent) { keys.delete(normalizeKey(event.key)) }
  function blur() { keys.clear() }
  function contextLost(event: Event) {
    event.preventDefault()
    options.onUnavailable()
  }

  controls.addEventListener('change', render)
  canvas.addEventListener('pointerdown', pointerDown)
  canvas.addEventListener('pointerup', pointerUp)
  canvas.addEventListener('pointermove', pointerMove)
  canvas.addEventListener('pointerleave', pointerLeave)
  canvas.addEventListener('keydown', keyDown)
  canvas.addEventListener('blur', blur)
  canvas.addEventListener('webglcontextlost', contextLost)
  window.addEventListener('keyup', keyUp)
  window.addEventListener('blur', blur)
  document.addEventListener('visibilitychange', visibilityChanged)
  reducedMotion.addEventListener('change', motionChanged)
  applyIntro(cosmosIntro(introStarted === null ? Infinity : 0))
  resize()
  schedule()

  return {
    select,
    pulse,
    setMode(next: 'explore' | 'play') {
      mode = next
      selected = null
      stopMovement()
      collected = []
      model.rover.position.set(-4.8, 0.75, 4.8)
      model.shadow.position.set(-4.8, -0.15, 4.8)
      model.rover.visible = model.shadow.visible = mode === 'play'
      updateBeacons()
      render()
      schedule()
    },
    setPaused(value: boolean) {
      paused = value
      // Pausing during the intro must stop it too, not let it play out.
      if (paused) settle()
      cancelAnimationFrame(frame)
      frame = 0
      render()
      schedule()
    },
    resetView() {
      camera.position.copy(home)
      controls.target.set(0, 0.3, 0)
      controls.update()
      render()
    },
    setDirection(key: string, pressed: boolean) {
      if (pressed) keys.add(key)
      else keys.delete(key)
      schedule()
    },
    dispose() {
      disposed = true
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      themeObserver.disconnect()
      controls.removeEventListener('change', render)
      controls.dispose()
      canvas.removeEventListener('pointerdown', pointerDown)
      canvas.removeEventListener('pointerup', pointerUp)
      canvas.removeEventListener('pointermove', pointerMove)
      canvas.removeEventListener('pointerleave', pointerLeave)
      canvas.removeEventListener('keydown', keyDown)
      canvas.removeEventListener('blur', blur)
      canvas.removeEventListener('webglcontextlost', contextLost)
      window.removeEventListener('keyup', keyUp)
      window.removeEventListener('blur', blur)
      document.removeEventListener('visibilitychange', visibilityChanged)
      reducedMotion.removeEventListener('change', motionChanged)
      const geometries = new Set<THREE.BufferGeometry>()
      const materials = new Set<THREE.Material>()
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points || object instanceof THREE.Sprite) {
          if ('geometry' in object) geometries.add(object.geometry)
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material)
        }
      })
      geometries.forEach(geometry => geometry.dispose())
      materials.forEach(material => material.dispose())
      mixer.stopAllAction()
      model.sprite.dispose()
      environment.dispose()
      pmrem.dispose()
      renderer.dispose()
    },
  }
}
