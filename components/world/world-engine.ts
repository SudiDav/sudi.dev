import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { collectSignals, moveRover, moveTowardSignal, type WorldPoint } from '@/lib/world-game'
import { yinYangImpulse } from '@/lib/world-motion'
import { WORLD_SECTORS, type SectorId } from './world-data'
import { buildWorld } from './world-model'

type Options = {
  onProject?: (points: { id: SectorId; x: number; y: number }[]) => void
  onHover?: (id: SectorId | null) => void
  onSelect: (id: SectorId) => void
  onCollect: (ids: string[]) => void
  onUnavailable: () => void
}

export type WorldEngine = ReturnType<typeof createWorldEngine>

export function createWorldEngine(canvas: HTMLCanvasElement, options: Options) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100)
  const home = new THREE.Vector3(10, 10, 12)
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

  scene.add(new THREE.AmbientLight(0xffffff, 1.9))
  const key = new THREE.DirectionalLight(0xffffff, 3.5)
  key.position.set(-5, 12, 8)
  scene.add(key)
  const rim = new THREE.DirectionalLight(0x607ebc, 4)
  rim.position.set(4, 6, -8)
  scene.add(rim)
  const model = buildWorld(scene)
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

  function render() {
    if (disposed) return
    renderer.render(scene, camera)
    if (options.onProject) {
      const point = new THREE.Vector3()
      options.onProject([...model.beacons].map(([id, beacon]) => {
        beacon.getWorldPosition(point).project(camera)
        return { id, x: (point.x + 1) / 2, y: (1 - point.y) / 2 }
      }))
    }
  }

  function moving() {
    return mode === 'play' && (keys.size > 0 || destination !== null)
  }

  function schedule() {
    if (!disposed && !frame && visible && !document.hidden && (!paused || moving() || impulseStarted !== null)) {
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
    if (!paused) {
      elapsed += delta
      model.orbit.rotation.z = -0.35 + Math.sin(elapsed * 0.35) * 0.16
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
    model.processor.position.y = 2.3 + Math.sin(elapsed * 1.3) * 0.22 + bounce
    model.processor.rotation.z = impulse ? impulseBase + impulse.turn : restTurn + Math.sin(elapsed * 0.65) * 0.07
    model.processor.scale.set(1 - bounce * 0.08, 1 + bounce * 0.12, 1)
    model.orbit.scale.setScalar(1 + Math.abs(bounce) * 0.16)
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
    if (!paused || moving() || impulseStarted !== null) frame = requestAnimationFrame(tick)
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
      beacon.scale.setScalar(id === selected ? 1.5 : 1)
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

  function motionChanged() {
    paused = reducedMotion.matches
    if (paused) {
      impulseStarted = null
      model.processor.scale.setScalar(1)
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
      renderer.dispose()
    },
  }
}
