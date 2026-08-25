'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

const CODE_GLYPHS = ['01', '1010', '0011', '1101', '{ }', '</>', 'const', 'return', '// life']
const CODE_SNIPPET = [
  'const dev = {',
  '  name: "Sudi",',
  '  loves: "clean code",',
  '  coffee: true,',
  '};',
]

type PointerState = {
  x: number
  y: number
  targetX: number
  targetY: number
  active: boolean
}

function glyphTexture(label: string, color: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 96
  const context = canvas.getContext('2d')
  if (!context) return null

  context.clearRect(0, 0, canvas.width, canvas.height)
  context.font = '600 34px ui-monospace, SFMono-Regular, Menlo, monospace'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.shadowBlur = 18
  context.shadowColor = color
  context.fillStyle = color
  context.globalAlpha = 0.88
  context.fillText(label, canvas.width / 2, canvas.height / 2)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  return texture
}

function codeSnippetTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 520
  canvas.height = 220
  const context = canvas.getContext('2d')
  if (!context) return null

  context.font = '500 20px ui-monospace, SFMono-Regular, Menlo, monospace'
  context.textBaseline = 'top'
  context.shadowBlur = 12
  context.shadowColor = '#607EBC'
  CODE_SNIPPET.forEach((line, index) => {
    context.fillStyle = index === 1 || index === 2 || index === 3 ? '#8DA8E2' : '#DCE7FF'
    context.globalAlpha = index === 0 || index === 4 ? 0.52 : 0.68
    context.fillText(line, 10, 14 + index * 34)
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  return texture
}

function glowTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext('2d')
  if (!context) return null

  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64)
  gradient.addColorStop(0, 'rgba(160, 191, 255, 0.65)')
  gradient.addColorStop(0.35, 'rgba(96, 126, 188, 0.25)')
  gradient.addColorStop(1, 'rgba(96, 126, 188, 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 128, 128)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  return texture
}

function yinYangTexture(color: string, dotColor: string, flipped = false) {
  const canvas = document.createElement('canvas')
  canvas.width = 160
  canvas.height = 160
  const context = canvas.getContext('2d')
  if (!context) return null

  const center = 80
  const radius = 66
  const drawHalf = () => {
    const path = new Path2D(
      `M ${center} ${center - radius} A ${radius} ${radius} 0 1 1 ${center} ${center + radius} A ${radius / 2} ${radius / 2} 0 1 0 ${center} ${center} A ${radius / 2} ${radius / 2} 0 1 1 ${center} ${center - radius} Z`,
    )
    context.fillStyle = color
    context.globalAlpha = 0.78
    context.fill(path)

    context.beginPath()
    context.arc(center, center + radius / 2, radius / 4.6, 0, Math.PI * 2)
    context.fillStyle = dotColor
    context.globalAlpha = 0.85
    context.fill()
  }

  if (flipped) {
    context.translate(center, center)
    context.rotate(Math.PI)
    context.translate(-center, -center)
  }
  drawHalf()

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  return texture
}

/** A borderless, liquid Three.js universe made from stars and code glyphs. */
export function HeroConstellation() {
  const [pulsing, setPulsing] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointer = useRef<PointerState>({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    active: false,
  })
  const pulseStarted = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const host = canvas?.parentElement
    if (!canvas || !host) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 20)
    camera.position.z = 4.6

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      })
    } catch {
      return
    }

    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))

    const universe = new THREE.Group()
    universe.scale.set(1.3, 1.15, 1.23)
    scene.add(universe)

    const yinTexture = yinYangTexture('#DCE7FF', '#607EBC')
    const yangTexture = yinYangTexture('#385083', '#E8F0FF', true)
    const yinYangGroup = new THREE.Group()
    yinYangGroup.position.set(0.08, 0, -0.58)
    yinYangGroup.renderOrder = 0
    const yinYangSprites: THREE.Sprite[] = []
    for (const texture of [yinTexture, yangTexture]) {
      if (!texture) continue
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.22,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
      const sprite = new THREE.Sprite(material)
      sprite.scale.set(1.42, 1.42, 1)
      sprite.renderOrder = 0
      yinYangGroup.add(sprite)
      yinYangSprites.push(sprite)
    }
    universe.add(yinYangGroup)

    const snippetMap = codeSnippetTexture()
    const snippetMaterial = snippetMap
      ? new THREE.SpriteMaterial({
          map: snippetMap,
          transparent: true,
          opacity: 0.48,
          depthTest: false,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      : null
    const snippet = snippetMaterial ? new THREE.Sprite(snippetMaterial) : null
    if (snippet) {
      snippet.position.set(-1.02, 0.52, 0.18)
      snippet.scale.set(1.62, 0.7, 1)
      snippet.renderOrder = 1
      universe.add(snippet)
    }

    const particleCount = 560
    const basePositions = new Float32Array(particleCount * 3)
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    const accent = new THREE.Color('#607EBC')
    const bright = new THREE.Color('#DCE7FF')

    for (let index = 0; index < particleCount; index += 1) {
      const progress = index / particleCount
      const strand = index % 2
      const angle = progress * Math.PI * 15 + strand * Math.PI
      const radius = 0.28 + Math.sin(progress * Math.PI) * 0.55 + Math.random() * 0.18
      const offset = index * 3

      basePositions[offset] = Math.cos(angle) * radius + (Math.random() - 0.5) * 0.16
      basePositions[offset + 1] = (progress - 0.5) * 2.65 + (Math.random() - 0.5) * 0.12
      basePositions[offset + 2] = Math.sin(angle) * radius * 0.68 + (Math.random() - 0.5) * 0.2
      positions[offset] = basePositions[offset]
      positions[offset + 1] = basePositions[offset + 1]
      positions[offset + 2] = basePositions[offset + 2]

      const tint = Math.random() > 0.84 ? bright : accent
      colors[offset] = tint.r
      colors[offset + 1] = tint.g
      colors[offset + 2] = tint.b
    }

    const particleGeometry = new THREE.BufferGeometry()
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.042,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.82,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const particles = new THREE.Points(particleGeometry, particleMaterial)
    universe.add(particles)

    const glowMap = glowTexture()
    const glowMaterial = glowMap
      ? new THREE.SpriteMaterial({
          map: glowMap,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      : null
    const cursorGlow = glowMaterial ? new THREE.Sprite(glowMaterial) : null
    if (cursorGlow) {
      cursorGlow.scale.set(1.15, 1.15, 1)
      cursorGlow.position.z = 0.65
      universe.add(cursorGlow)
    }

    const filamentPoints = Array.from({ length: 90 }, (_, index) => {
      const progress = index / 89
      const angle = progress * Math.PI * 15
      const radius = 0.28 + Math.sin(progress * Math.PI) * 0.55
      return new THREE.Vector3(
        Math.cos(angle) * radius,
        (progress - 0.5) * 2.65,
        Math.sin(angle) * radius * 0.68,
      )
    })
    const filamentGeometry = new THREE.BufferGeometry().setFromPoints(filamentPoints)
    const filamentMaterial = new THREE.LineBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.13,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    universe.add(new THREE.Line(filamentGeometry, filamentMaterial))

    const glyphSprites: Array<{ sprite: THREE.Sprite; base: THREE.Vector3; phase: number }> = []
    for (let index = 0; index < 12; index += 1) {
      const texture = glyphTexture(CODE_GLYPHS[index % CODE_GLYPHS.length], '#9EB9F6')
      if (!texture) continue
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.62,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
      const sprite = new THREE.Sprite(material)
      const progress = (index + 1) / 13
      const angle = progress * Math.PI * 6.5 + index
      const base = new THREE.Vector3(
        Math.cos(angle) * (0.72 + (index % 3) * 0.11),
        (progress - 0.5) * 2.65,
        Math.sin(angle) * 0.45,
      )
      sprite.position.copy(base)
      sprite.scale.set(index % 5 === 3 ? 0.9 : 0.62, 0.19, 1)
      universe.add(sprite)
      glyphSprites.push({ sprite, base, phase: index * 0.8 })
    }

    const resize = () => {
      const bounds = host.getBoundingClientRect()
      const width = Math.max(bounds.width, 1)
      const height = Math.max(bounds.height, 1)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    }

    let frame = 0
    let lastTime = 0
    const draw = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000 || 0.016, 0.05)
      lastTime = time
      const state = pointer.current
      state.x += (state.targetX - state.x) * (reducedMotion ? 1 : 0.12)
      state.y += (state.targetY - state.y) * (reducedMotion ? 1 : 0.12)
      const pulseAge = pulseStarted.current === null ? -1 : time - pulseStarted.current
      const pulseRadius = pulseAge * 0.0027
      const yinHover = state.active && Math.hypot(state.x - 0.08, state.y) < 1.05
      const targetSeparation = yinHover ? 0.58 : 0
      const currentSeparation = yinYangGroup.userData.separation ?? 0
      const separation = currentSeparation + (targetSeparation - currentSeparation) * 0.14
      yinYangGroup.userData.separation = separation
      if (yinYangSprites.length === 2) {
        yinYangSprites[0].position.x = -separation / 2
        yinYangSprites[1].position.x = separation / 2
        yinYangSprites[0].position.y = separation * 0.08
        yinYangSprites[1].position.y = -separation * 0.08
        yinYangGroup.rotation.z = Math.sin(time * 0.0004) * 0.025
      }

      if (!reducedMotion) {
        universe.rotation.y += delta * 0.12
        universe.rotation.z = Math.sin(time * 0.00035) * 0.035
      }

      for (let index = 0; index < particleCount; index += 1) {
        const offset = index * 3
        const baseX = basePositions[offset]
        const baseY = basePositions[offset + 1]
        const baseZ = basePositions[offset + 2]
        const distanceX = baseX - state.x
        const distanceY = baseY - state.y
        const distance = Math.hypot(distanceX, distanceY)
        const influence = state.active ? Math.max(0, 1 - distance / 1.5) ** 2 : 0
        const directionX = distance === 0 ? 0 : distanceX / distance
        const directionY = distance === 0 ? 0 : distanceY / distance
        const wave =
          pulseAge >= 0 && pulseAge < 1500
          ? Math.exp(-((distance - pulseRadius) ** 2) / 0.07) * 0.55
            : 0
        const breathing = reducedMotion ? 0 : Math.sin(time * 0.0012 + index * 0.17) * 0.018

        positions[offset] = baseX + directionX * (influence * 0.78 + wave) + breathing
        positions[offset + 1] = baseY + directionY * (influence * 0.78 + wave) + breathing
        positions[offset + 2] = baseZ + influence * 0.34 + wave * 0.45
      }
      particleGeometry.attributes.position.needsUpdate = true
      particleMaterial.opacity = state.active ? 1 : 0.82
      filamentMaterial.opacity = state.active ? 0.38 : 0.2
      if (cursorGlow && glowMaterial) {
        cursorGlow.position.x = state.x
        cursorGlow.position.y = state.y
        glowMaterial.opacity += ((state.active ? 0.75 : 0) - glowMaterial.opacity) * 0.18
        cursorGlow.scale.setScalar(state.active ? 1.45 : 1.15)
      }
      if (snippet && snippetMaterial) {
        snippet.position.x += ((-1.02 + state.x * 0.07) - snippet.position.x) * 0.1
        snippet.position.y += ((0.52 + state.y * 0.05) - snippet.position.y) * 0.1
        snippetMaterial.opacity += ((state.active ? 0.7 : 0.48) - snippetMaterial.opacity) * 0.1
      }

      for (const { sprite, base, phase } of glyphSprites) {
        const distanceX = base.x - state.x
        const distanceY = base.y - state.y
        const distance = Math.hypot(distanceX, distanceY)
        const influence = state.active ? Math.max(0, 1 - distance / 1.75) ** 2 : 0
        const directionX = distance === 0 ? 0 : distanceX / distance
        const directionY = distance === 0 ? 0 : distanceY / distance
        sprite.position.set(
          base.x + directionX * influence * 0.92,
          base.y + directionY * influence * 0.92,
          base.z + influence * 0.24,
        )
        if (!reducedMotion) sprite.position.y += Math.sin(time * 0.001 + phase) * 0.035
        ;(sprite.material as THREE.SpriteMaterial).opacity = state.active ? 1 : 0.8
      }

      renderer.render(scene, camera)
      frame = requestAnimationFrame(draw)
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    frame = requestAnimationFrame(draw)

    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
      particleGeometry.dispose()
      particleMaterial.dispose()
      filamentGeometry.dispose()
      filamentMaterial.dispose()
      glowMap?.dispose()
      glowMaterial?.dispose()
      snippetMap?.dispose()
      snippetMaterial?.dispose()
      glyphSprites.forEach(({ sprite }) => {
        const material = sprite.material as THREE.SpriteMaterial
        material.map?.dispose()
        material.dispose()
      })
      yinTexture?.dispose()
      yangTexture?.dispose()
      renderer.dispose()
    }
  }, [])

  const pulse = () => {
    if (timer.current) clearTimeout(timer.current)
    pulseStarted.current = performance.now()
    setPulsing(true)
    timer.current = setTimeout(() => {
      setPulsing(false)
      pulseStarted.current = null
    }, 1050)
  }

  return (
    <div
      className={`hero-genome ${pulsing ? 'hero-genome--pulse' : ''}`}
      role="button"
      tabIndex={0}
      aria-label="Living code universe. Activate to send a liquid pulse through the system."
      onClick={pulse}
      onPointerEnter={(event) => {
        pointer.current.active = true
        event.currentTarget.dataset.pointerActive = 'true'
      }}
      onPointerLeave={(event) => {
        pointer.current.active = false
        pointer.current.targetX = 0
        pointer.current.targetY = 0
        event.currentTarget.dataset.pointerActive = 'false'
      }}
      onPointerMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect()
        pointer.current.targetX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 3.6
        pointer.current.targetY = (0.5 - (event.clientY - bounds.top) / bounds.height) * 2.7
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          pulse()
        }
      }}
    >
      <span className="sr-only">
        Interactive liquid universe showing code particles in a living system.
      </span>
      <canvas ref={canvasRef} className="hero-genome__three" aria-hidden="true" />
      <span className="hero-genome__core" aria-hidden="true">
        <span className="hero-genome__core-mark">{pulsing ? '0101' : '</>'}</span>
        <span className="hero-genome__core-label">CODE FLOW</span>
      </span>
    </div>
  )
}
