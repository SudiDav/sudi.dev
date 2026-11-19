import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

const REST = { x: 0.16, y: -0.37, z: 0.035 }
const VERTICAL_RANGE = 1.48

/** The header S mark, enhanced only on pointer devices with motion enabled. */
export async function createLogo3d(
  canvas: HTMLCanvasElement,
  stage: HTMLElement,
  isCurrent: () => boolean,
  onLost: () => void,
  onFrameReady: () => void,
) {
  const gltf = await new GLTFLoader().loadAsync('/models/logo.glb')
  if (!isCurrent()) return null

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.8

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const environment = pmrem.fromScene(room, 0.04)
  room.dispose()
  scene.environment = environment.texture
  scene.environmentIntensity = 0.5
  const key = new THREE.DirectionalLight(0xffffff, 1.3)
  key.position.set(-2, 3, 4)
  const fill = new THREE.DirectionalLight(0xffffff, 0.4)
  fill.position.set(3, 0.5, 2)
  scene.add(key, fill, new THREE.AmbientLight(0xffffff, 0.3))

  const halfRange = VERTICAL_RANGE / 2
  const camera = new THREE.OrthographicCamera(-halfRange, halfRange, halfRange, -halfRange, 0.1, 30)
  camera.position.set(0, 1.23, 8)
  camera.lookAt(0, 0, 0)

  const mark = gltf.scene.getObjectByName('LogoMark') ?? gltf.scene
  scene.add(mark)
  mark.updateWorldMatrix(true, true)
  const bounds = new THREE.Box3().setFromObject(mark)
  mark.position.sub(bounds.getCenter(new THREE.Vector3()))
  mark.rotation.order = 'YZX'
  mark.rotation.set(REST.x, REST.y, REST.z, 'YZX')

  const materials = new Set<THREE.Material>()
  mark.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    let partName = object.name
    for (let parent = object.parent; parent; parent = parent.parent) {
      if (parent.name === 'MarkTop' || parent.name === 'MarkBottom') {
        partName = parent.name
        break
      }
    }
    const material = new THREE.MeshPhysicalMaterial({
      color: partName === 'MarkBottom' ? '#364F82' : '#E8E5DC',
      metalness: partName === 'MarkBottom' ? 0.48 : 0.02,
      roughness: partName === 'MarkBottom' ? 0.34 : 0.29,
      clearcoat: partName === 'MarkBottom' ? 0.1 : 0.23,
      clearcoatRoughness: 0.24,
    })
    materials.add(material)
    if (Array.isArray(object.material)) {
      object.material.forEach(previous => previous.dispose())
    } else {
      object.material.dispose()
    }
    object.material = material
  })

  const pose = { x: REST.x, y: REST.y, targetX: REST.x, targetY: REST.y }
  let frame = 0
  let previous = 0
  let disposed = false
  let frameDrawn = false

  function render(now: number) {
    const delta = previous ? Math.min((now - previous) / 1000, 0.1) : 1
    previous = now
    const follow = 1 - Math.exp(-7 * delta)
    pose.x += (pose.targetX - pose.x) * follow
    pose.y += (pose.targetY - pose.y) * follow
    mark.rotation.set(pose.x, pose.y, REST.z, 'YZX')
    renderer.render(scene, camera)
    if (!frameDrawn) {
      frameDrawn = true
      onFrameReady()
    }
    return Math.abs(pose.targetX - pose.x) > 0.001 || Math.abs(pose.targetY - pose.y) > 0.001
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
    if (event.pointerType !== 'mouse') return
    const rect = stage.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2
    pose.targetY = REST.y + Math.max(-0.12, Math.min(0.12, x * 0.12))
    pose.targetX = REST.x + Math.max(-0.09, Math.min(0.09, y * 0.09))
    wake()
  }

  function pointerLeave() {
    pose.targetX = REST.x
    pose.targetY = REST.y
    wake()
  }

  function resize() {
    const { width, height } = canvas.getBoundingClientRect()
    if (disposed || !width || !height) return
    renderer.setSize(width, height, false)
    camera.left = -(VERTICAL_RANGE * width / height) / 2
    camera.right = (VERTICAL_RANGE * width / height) / 2
    camera.top = halfRange
    camera.bottom = -halfRange
    camera.updateProjectionMatrix()
    render(performance.now())
  }

  function contextLost(event: Event) {
    event.preventDefault()
    dispose()
    onLost()
  }

  const sizer = new ResizeObserver(resize)
  sizer.observe(canvas)
  stage.addEventListener('pointermove', pointerMove, { passive: true })
  stage.addEventListener('pointerleave', pointerLeave)
  document.addEventListener('visibilitychange', wake)
  canvas.addEventListener('webglcontextlost', contextLost)

  function dispose() {
    if (disposed) return
    disposed = true
    cancelAnimationFrame(frame)
    sizer.disconnect()
    stage.removeEventListener('pointermove', pointerMove)
    stage.removeEventListener('pointerleave', pointerLeave)
    document.removeEventListener('visibilitychange', wake)
    canvas.removeEventListener('webglcontextlost', contextLost)
    mark.traverse(object => {
      if (object instanceof THREE.Mesh) object.geometry.dispose()
    })
    materials.forEach(material => material.dispose())
    environment.dispose()
    pmrem.dispose()
    renderer.dispose()
  }

  resize()
  return { dispose }
}
