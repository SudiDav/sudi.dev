import * as THREE from 'three'
import { starSprite } from '@/components/world/world-model'
import { WARP_LEAD, stopVisibility } from '@/lib/project-warp'
import { createGalaxies } from './warp-galaxies'

const SPACING = 26
const REST_DISTANCE = 9
const IMAGE = { width: 4, height: 2.25 }
const MARGIN = 0.45

/** sRGB components as written in CSS; the portal shader outputs them unconverted. */
function rgb(hex: string) {
  const value = parseInt(hex.replace('#', ''), 16)
  return new THREE.Vector3((value >> 16 & 255) / 255, (value >> 8 & 255) / 255, (value & 255) / 255)
}

const portalShader = {
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D map;
    uniform float hasMap;
    uniform float show;
    uniform float warp;
    uniform float fade;
    uniform float time;
    uniform vec3 accent;
    uniform vec2 size;
    uniform vec2 image;
    varying vec2 vUv;

    float box(vec2 p, vec2 b, float r) {
      vec2 q = abs(p) - b + r;
      return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
    }

    void main() {
      vec2 p = (vUv - 0.5) * size;
      float d = box(p, image * 0.5, 0.14);
      // Neon frame: a crisp edge and a soft glow that brightens on arrival.
      float glow = exp(-max(d, 0.0) * 8.0) * (0.25 + 0.75 * show);
      float edge = smoothstep(0.03, 0.0, abs(d)) * (0.5 + 0.5 * show);
      if (d > 0.0) {
        float alpha = (glow * 0.55 + edge) * fade;
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(accent * (1.2 + edge), alpha);
        return;
      }
      vec2 uv = p / image + 0.5;
      // Chromatic split while travelling, settling as the portal arrives.
      float split = warp * 0.018;
      vec3 picture = hasMap > 0.5
        ? vec3(texture2D(map, uv + vec2(split, 0.0)).r, texture2D(map, uv).g, texture2D(map, uv - vec2(split, 0.0)).b)
        : mix(accent * 0.35, accent, uv.y);
      picture *= 0.93 + 0.07 * sin(uv.y * 520.0 - time * 6.0);
      // The picture materialises block by block, like a hologram assembling.
      vec2 cell = floor(uv * vec2(40.0, 22.0));
      float noise = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
      float level = show * 1.15;
      float reveal = smoothstep(noise - 0.08, noise, level);
      float seam = reveal - smoothstep(noise, noise + 0.08, level);
      vec3 colour = mix(accent * 0.18, picture, reveal) + accent * seam * 1.6 + accent * edge;
      gl_FragColor = vec4(colour, mix(0.4, 1.0, reveal) * fade);
    }`,
}

export type WarpStop = { cover?: string }

/**
 * A flight through space with one holographic portal per project, drawn on a
 * transparent canvas so it sits on the page's own background in either theme.
 * The page picks a stop with setTime; the camera eases there, stretching the
 * stars with its speed, reports each frame's time through onTime (so the story
 * can fade in step with the flight), and renders only while on screen.
 */
export function createWarpEngine(
  canvas: HTMLCanvasElement,
  stops: WarpStop[],
  accentHex: string,
  onUnavailable: () => void,
  onTime: (time: number) => void,
) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  renderer.setClearColor(0x000000, 0)
  const scene = new THREE.Scene()
  // Distant things fade into the page colour (set in setPalette).
  const fog = new THREE.FogExp2(0x0b0b11, 0.02)
  scene.fog = fog
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 160)
  const accent = rgb(accentHex)
  const length = (stops.length - 1) * SPACING
  const disposables: { dispose(): void }[] = []
  const track = <T extends { dispose(): void }>(item: T) => { disposables.push(item); return item }

  // Stars fill a long cylinder around the path; each has a head and a tail.
  const STARS = 1800
  const heads = new Float32Array(STARS * 3)
  const segments = new Float32Array(STARS * 6)
  const random = (seed: number) => { const x = Math.sin(seed * 9301.17) * 49297.31; return x - Math.floor(x) }
  for (let i = 0; i < STARS; i++) {
    const angle = random(i + 1) * Math.PI * 2
    const radius = 2.5 + random(i + 7) ** 0.6 * 16
    heads.set([Math.cos(angle) * radius, Math.sin(angle) * radius, REST_DISTANCE + 30 - random(i + 13) * (length + 110)], i * 3)
  }
  const starGeometry = track(new THREE.BufferGeometry())
  starGeometry.setAttribute('position', new THREE.BufferAttribute(heads, 3))
  const sprite = track(starSprite())
  const starMaterial = track(new THREE.PointsMaterial({ size: 0.12, map: sprite, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xdce6ff }))
  scene.add(new THREE.Points(starGeometry, starMaterial))
  const streakGeometry = track(new THREE.BufferGeometry())
  const streakPositions = new THREE.BufferAttribute(segments, 3)
  streakPositions.setUsage(THREE.DynamicDrawUsage)
  streakGeometry.setAttribute('position', streakPositions)
  const streakMaterial = track(new THREE.LineBasicMaterial({ color: 0x9db4f0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }))
  scene.add(new THREE.LineSegments(streakGeometry, streakMaterial))

  const galaxies = track(createGalaxies(length, REST_DISTANCE, sprite, accentHex))
  scene.add(...galaxies.galaxies)

  /** Follow the page's theme: glowing light on dark, darker dots on white. */
  function setPalette() {
    const css = getComputedStyle(document.documentElement)
    const light = document.documentElement.classList.contains('light')
    fog.color.set(css.getPropertyValue('--bg-primary').trim() || '#0B0B11')
    for (const material of [starMaterial, streakMaterial]) {
      material.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending
      material.needsUpdate = true
    }
    starMaterial.color.set(light ? '#3a4050' : '#dce6ff')
    streakMaterial.color.set(light ? accentHex : '#9db4f0')
    galaxies.setLight(light)
  }
  setPalette()
  const themeObserver = new MutationObserver(() => { setPalette(); if (!frame) render(0) })
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

  // One portal per project: a holographic picture in a neon frame.
  const loader = new THREE.TextureLoader()
  const planeGeometry = track(new THREE.PlaneGeometry(IMAGE.width + MARGIN * 2, IMAGE.height + MARGIN * 2))
  const portals = stops.map((stop, index) => {
    const material = track(new THREE.ShaderMaterial({
      ...portalShader,
      transparent: true,
      depthWrite: false,
      uniforms: {
        map: { value: null },
        hasMap: { value: 0 },
        show: { value: 0 },
        warp: { value: 0 },
        fade: { value: 1 },
        time: { value: 0 },
        accent: { value: accent },
        size: { value: new THREE.Vector2(IMAGE.width + MARGIN * 2, IMAGE.height + MARGIN * 2) },
        image: { value: new THREE.Vector2(IMAGE.width, IMAGE.height) },
      },
    }))
    if (stop.cover) {
      loader.load(stop.cover, texture => {
        if (disposed) { texture.dispose(); return }
        track(texture)
        material.uniforms.map.value = texture
        material.uniforms.hasMap.value = 1
      })
    }
    const group = new THREE.Group()
    group.position.z = -index * SPACING
    group.add(new THREE.Mesh(planeGeometry, material))
    scene.add(group)
    return { group, material, side: index % 2 === 0 ? 1 : -1 }
  })

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 }
  let target = -WARP_LEAD
  let time = target
  let speed = 0
  let clock = 0
  let narrow = false
  let frame = 0
  let previous = 0
  let visible = false
  let disposed = false

  function layout() {
    for (const portal of portals) {
      // Wide screens put the picture beside the story; narrow ones above it.
      portal.group.position.x = narrow ? 0 : portal.side * 2.2
      portal.group.position.y = narrow ? 1.25 : 0.25
      portal.group.scale.setScalar(narrow ? 0.62 : 0.72)
    }
  }

  function render(delta: number) {
    clock += delta
    const before = time
    time += (target - time) * (1 - Math.exp(-5 * delta))
    if (Math.abs(target - time) < 0.0005) time = target
    onTime(time)
    const velocity = delta ? (time - before) / delta : 0
    speed += (Math.abs(velocity) - speed) * (1 - Math.exp(-8 * delta))
    const warp = Math.min(speed / 1.6, 1)

    pointer.x += (pointer.tx - pointer.x) * (1 - Math.exp(-4 * delta))
    pointer.y += (pointer.ty - pointer.y) * (1 - Math.exp(-4 * delta))
    camera.position.set(pointer.x * 0.7, -pointer.y * 0.45, REST_DISTANCE - time * SPACING)
    camera.lookAt(pointer.x * 0.25, -pointer.y * 0.15, camera.position.z - 12)
    camera.rotation.z += Math.sin(clock * 0.35) * 0.012 + (target - time) * 0.02
    camera.fov = 55 + warp * 22
    camera.updateProjectionMatrix()

    // Streaks trail behind each star, longer the faster we travel.
    const tail = 0.05 + warp * 7
    for (let i = 0; i < STARS; i++) {
      const x = heads[i * 3], y = heads[i * 3 + 1], z = heads[i * 3 + 2]
      segments.set([x, y, z, x, y, z - tail * Math.sign(velocity || 1)], i * 6)
    }
    streakPositions.needsUpdate = true
    streakMaterial.opacity = warp * 0.75

    portals.forEach((portal, index) => {
      const show = stopVisibility(time, index)
      const distance = camera.position.z - portal.group.position.z
      const uniforms = portal.material.uniforms
      uniforms.show.value = show
      uniforms.warp.value = warp
      uniforms.time.value = clock
      // Fade in from the depths, and out as the camera passes through.
      uniforms.fade.value = Math.min(1, Math.max(0, (70 - distance) / 40)) * Math.min(1, Math.max(0, (distance - 1.5) / 3))
      portal.group.rotation.y = -portal.group.position.x * 0.09 + Math.sin(clock * 0.6 + index) * 0.04
      portal.group.rotation.x = Math.sin(clock * 0.5 + index * 2) * 0.03
    })
    galaxies.spin(clock)
    renderer.render(scene, camera)
  }

  function tick(now: number) {
    frame = 0
    const delta = previous ? Math.min((now - previous) / 1000, 0.1) : 0
    previous = now
    render(delta)
    schedule()
  }

  function schedule() {
    if (disposed || frame || !visible || document.hidden) return
    frame = requestAnimationFrame(tick)
  }

  function resize() {
    const { width, height } = canvas.getBoundingClientRect()
    if (!width || !height) return
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    // The same test as the CSS, so the portal and the story always agree on the layout.
    narrow = narrowQuery.matches
    layout()
    render(0)
  }

  function pointerMove(event: PointerEvent) {
    if (event.pointerType !== 'mouse') return
    const rect = canvas.getBoundingClientRect()
    pointer.tx = (event.clientX - rect.left) / rect.width * 2 - 1
    pointer.ty = (event.clientY - rect.top) / rect.height * 2 - 1
  }

  function wake() {
    previous = 0
    schedule()
  }

  function contextLost(event: Event) {
    event.preventDefault()
    onUnavailable()
  }

  const narrowQuery = window.matchMedia('(max-width: 900px), (max-aspect-ratio: 19/20)')
  narrowQuery.addEventListener('change', resize)
  const sizer = new ResizeObserver(resize)
  sizer.observe(canvas)
  window.addEventListener('pointermove', pointerMove)
  document.addEventListener('visibilitychange', wake)
  canvas.addEventListener('webglcontextlost', contextLost)
  resize()

  return {
    setTime(next: number) { target = next },
    /** Jump without travelling, e.g. on first paint. */
    jump(next: number) { target = time = next },
    setVisible(next: boolean) {
      visible = next
      if (visible) wake()
      else { cancelAnimationFrame(frame); frame = 0 }
    },
    dispose() {
      disposed = true
      cancelAnimationFrame(frame)
      sizer.disconnect()
      narrowQuery.removeEventListener('change', resize)
      window.removeEventListener('pointermove', pointerMove)
      document.removeEventListener('visibilitychange', wake)
      canvas.removeEventListener('webglcontextlost', contextLost)
      themeObserver.disconnect()
      disposables.forEach(item => item.dispose())
      renderer.dispose()
    },
  }
}
