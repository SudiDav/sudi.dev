import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { chromeMaterial } from './chrome-material'

const REST = { yaw: -0.28, pitch: 0.1 }
const SPIN_SECONDS = 1.1
const INTRO_KEY = 'logo-3d-intro'

const easeOutBack = (t: number) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2

/**
 * The menu bar's S-mark as a real 3D object (public/models/logo.glb, built in
 * Blender). It renders only while something moves: it leans toward the
 * pointer, and spins with its halves splitting apart when the link is hovered
 * or focused. Reduced motion draws one still frame. `onLost` fires if the GPU
 * context goes, so the flat PNG can take over again.
 */
export async function createLogo3d(canvas: HTMLCanvasElement, onLost: () => void) {
  const gltf = await new GLTFLoader().loadAsync('/models/logo.glb')
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)
  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  // Keep the whole render target: disposing only its texture would leave its framebuffer behind.
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04)
  scene.environment = environment.texture
  scene.environmentIntensity = 0.8
  const key = new THREE.DirectionalLight(0xffffff, 2.2)
  key.position.set(-2, 3, 4)
  scene.add(key, new THREE.AmbientLight(0xffffff, 0.6))
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20)
  camera.position.set(0, 0, 3.25)

  const mark = gltf.scene.getObjectByName('LogoMark') ?? gltf.scene
  scene.add(mark)
  const halves = ['MarkTop', 'MarkBottom'].map((name, index) => {
    const half = mark.getObjectByName(name)!
    return { half, rest: half.position.clone(), away: new THREE.Vector3(index ? 0.22 : -0.22, index ? -0.16 : 0.16, index ? -0.12 : 0.12) }
  })
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#607EBC'
  const chrome = chromeMaterial(accent)
  mark.traverse(object => {
    if (object instanceof THREE.Mesh) {
      ;(object.material as THREE.Material).dispose()
      object.material = chrome
    }
  })

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
  const link = canvas.closest('a')
  const pose = { yaw: REST.yaw, pitch: REST.pitch, targetYaw: REST.yaw, targetPitch: REST.pitch }
  let spinStarted: number | null = null
  let introStarted: number | null = null
  let frame = 0
  let previous = 0
  let disposed = false

  try {
    if (!reduce.matches && !sessionStorage.getItem(INTRO_KEY)) {
      introStarted = performance.now()
      sessionStorage.setItem(INTRO_KEY, '1')
    }
  } catch { /* Storage can be unavailable; the intro is only a flourish. */ }

  function render(now: number) {
    const delta = previous ? Math.min((now - previous) / 1000, 0.1) : 1
    previous = now
    const follow = 1 - Math.exp(-7 * delta)
    pose.yaw += (pose.targetYaw - pose.yaw) * follow
    pose.pitch += (pose.targetPitch - pose.pitch) * follow
    let spin = 0
    let apart = 0
    if (spinStarted !== null) {
      const t = Math.min((now - spinStarted) / 1000 / SPIN_SECONDS, 1)
      spin = Math.PI * 2 * easeOutBack(t)
      apart = Math.sin(Math.PI * Math.min(t * 1.6, 1))
      if (t >= 1) { spinStarted = null; spin = 0 }
    }
    if (introStarted !== null) {
      const t = Math.min((now - introStarted) / 900, 1)
      apart = Math.max(apart, (1 - t) ** 3 * 6)
      if (t >= 1) introStarted = null
    }
    mark.rotation.set(pose.pitch, pose.yaw + spin, 0)
    for (const { half, rest, away } of halves) half.position.copy(rest).addScaledVector(away, apart)
    renderer.render(scene, camera)
    const settled = Math.abs(pose.targetYaw - pose.yaw) < 0.001 && Math.abs(pose.targetPitch - pose.pitch) < 0.001
    return !settled || spinStarted !== null || introStarted !== null
  }

  function tick(now: number) {
    frame = 0
    if (disposed) return
    if (render(now)) frame = requestAnimationFrame(tick)
    else previous = 0
  }

  function wake() {
    if (!frame && !disposed && !document.hidden) frame = requestAnimationFrame(tick)
  }

  function pointerMove(event: PointerEvent) {
    if (reduce.matches || event.pointerType !== 'mouse') return
    const rect = canvas.getBoundingClientRect()
    const x = (event.clientX - (rect.left + rect.width / 2)) / window.innerWidth
    const y = (event.clientY - (rect.top + rect.height / 2)) / window.innerHeight
    // A gentle lean: past about 20 degrees the S stops reading as an S.
    pose.targetYaw = REST.yaw + Math.max(-0.32, Math.min(0.32, x * 0.8))
    pose.targetPitch = REST.pitch + Math.max(-0.25, Math.min(0.25, y * 0.6))
    wake()
  }

  function spin() {
    if (reduce.matches || spinStarted !== null) return
    spinStarted = performance.now()
    wake()
  }

  function resize() {
    const { width, height } = canvas.getBoundingClientRect()
    if (disposed || !width || !height) return
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    // setSize clears the canvas; draw now, even in a background tab, so the
    // PNG's S is never hidden behind an empty canvas.
    render(performance.now())
    wake()
  }

  function contextLost() {
    disposed = true
    cancelAnimationFrame(frame)
    onLost()
  }

  const sizer = new ResizeObserver(resize)
  sizer.observe(canvas)
  window.addEventListener('pointermove', pointerMove, { passive: true })
  link?.addEventListener('pointerenter', spin)
  link?.addEventListener('focus', spin)
  document.addEventListener('visibilitychange', wake)
  canvas.addEventListener('webglcontextlost', contextLost)
  resize()

  return {
    dispose() {
      disposed = true
      cancelAnimationFrame(frame)
      sizer.disconnect()
      window.removeEventListener('pointermove', pointerMove)
      link?.removeEventListener('pointerenter', spin)
      link?.removeEventListener('focus', spin)
      document.removeEventListener('visibilitychange', wake)
      canvas.removeEventListener('webglcontextlost', contextLost)
      mark.traverse(object => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose()
          ;(object.material as THREE.Material).dispose()
        }
      })
      environment.dispose()
      pmrem.dispose()
      // No forceContextLoss: React may remount onto this same canvas, which
      // would then inherit a dead context.
      renderer.dispose()
    },
  }
}
