'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { SiteLocale } from '@/lib/locale'
import './portrait-relief.css'

type PortraitReliefProps = {
  src: string
  alt: string
  expectedSourceSha256: string
  sizes?: string
  priority?: boolean
  locale?: SiteLocale
}

type View = { yaw: number; pitch: number }

const MODEL_URL = '/models/sudi-portrait-relief.glb'

function limit(value: number) {
  return Math.max(-0.18, Math.min(0.18, value))
}

export function PortraitRelief({
  src, alt, expectedSourceSha256, sizes = '(max-width: 1024px) 100vw, 360px', priority = true, locale = 'en',
}: PortraitReliefProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const target = useRef<View>({ yaw: 0, pitch: 0 })
  const requestRender = useRef<() => void>(() => {})
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null)
  const [engaged, setEngaged] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const copy = locale === 'fr' ? {
    canvas: `${alt}. Utilisez les flèches pour changer la vue du portrait.`,
    help: 'Utilisez les boutons fléchés, les touches fléchées ou faites glisser le portrait pour changer de vue. Appuyez sur Origine pour réinitialiser.',
    controls: 'Commandes de vue du portrait',
    up: 'Incliner le portrait vers le haut', left: 'Incliner le portrait vers la gauche',
    reset: 'Réinitialiser la vue du portrait', right: 'Incliner le portrait vers la droite',
    down: 'Incliner le portrait vers le bas',
    still: 'Le portrait reste visible sous forme d’image fixe.', active: 'La vue en relief du portrait est active.', loading: 'Chargement du relief du portrait.',
  } : {
    canvas: `${alt}. Use arrow keys to change the portrait view.`,
    help: 'Use the arrow buttons, arrow keys, or drag the portrait to change the view. Press Home to reset.',
    controls: 'Portrait view controls',
    up: 'Tilt portrait up', left: 'Tilt portrait left', reset: 'Reset portrait view',
    right: 'Tilt portrait right', down: 'Tilt portrait down',
    still: 'The portrait remains visible as a still image.', active: 'Portrait depth view active.', loading: 'Loading portrait depth.',
  }

  const moveTo = useCallback((yaw: number, pitch: number) => {
    target.current = { yaw: limit(yaw), pitch: limit(pitch) }
    setEngaged(true)
    requestRender.current()
  }, [])

  useEffect(() => {
    if (!engaged || failed) return

    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!canvas || !stage) return

    let disposed = false
    let renderer: import('three').WebGLRenderer | undefined
    let model: import('three').Object3D | undefined
    let THREE: typeof import('three') | undefined
    let animationFrame = 0
    let current = { yaw: 0, pitch: 0 }
    let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let resizeObserver: ResizeObserver | undefined

    const draw = () => {
      animationFrame = 0
      if (!renderer || !model) return
      const difference = Math.abs(target.current.yaw - current.yaw) + Math.abs(target.current.pitch - current.pitch)
      const factor = reducedMotion ? 1 : 0.24
      current.yaw += (target.current.yaw - current.yaw) * factor
      current.pitch += (target.current.pitch - current.pitch) * factor
      model.rotation.y = current.yaw
      model.rotation.x = current.pitch
      renderer.render(scene, camera)
      if (!reducedMotion && difference > 0.001) animationFrame = requestAnimationFrame(draw)
    }

    const schedule = () => {
      if (!renderer || !model || animationFrame) return
      if (reducedMotion) {
        current = { ...target.current }
        model.rotation.y = current.yaw
        model.rotation.x = current.pitch
        renderer.render(scene, camera)
        return
      }
      animationFrame = requestAnimationFrame(draw)
    }
    requestRender.current = schedule

    let scene: import('three').Scene
    let camera: import('three').OrthographicCamera

    const resize = () => {
      if (!renderer) return
      const { width, height } = canvas.getBoundingClientRect()
      if (!width || !height) return
      const halfHeight = Math.min(0.676, 0.5 / (width / height))
      const aspect = width / height
      camera.left = -halfHeight * aspect
      camera.right = halfHeight * aspect
      camera.top = halfHeight
      camera.bottom = -halfHeight
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
      schedule()
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return
      drag.current = {
        x: event.clientX,
        y: event.clientY,
        yaw: target.current.yaw,
        pitch: target.current.pitch,
      }
      canvas.setPointerCapture(event.pointerId)
      setEngaged(true)
    }

    const onPointerMove = (event: PointerEvent) => {
      const rect = stage.getBoundingClientRect()
      if (event.pointerType === 'mouse') {
        if (reducedMotion) return
        moveTo(((event.clientX - rect.left) / rect.width - 0.5) * 0.32, -((event.clientY - rect.top) / rect.height - 0.5) * 0.24)
        return
      }
      if (!drag.current) return
      moveTo(
        drag.current.yaw + ((event.clientX - drag.current.x) / rect.width) * 0.48,
        drag.current.pitch - ((event.clientY - drag.current.y) / rect.height) * 0.36,
      )
    }

    const onPointerUp = () => { drag.current = null }
    const onMotionPreferenceChange = (event: MediaQueryListEvent) => { reducedMotion = event.matches }
    const onContextLost = (event: Event) => {
      event.preventDefault()
      setLoaded(false)
      setFailed(true)
    }
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
    motionPreference.addEventListener('change', onMotionPreferenceChange)
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerUp)
    canvas.addEventListener('webglcontextlost', onContextLost)

    const start = async () => {
      try {
        const expected = await fetch(src, { cache: 'force-cache' })
        if (!expected.ok) throw new Error('Could not verify the current portrait image')
        const bytes = await expected.arrayBuffer()
        const digest = await crypto.subtle.digest('SHA-256', bytes)
        const fingerprint = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
        if (fingerprint !== expectedSourceSha256) {
          setFailed(true)
          return
        }

        THREE = await import('three')
        const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js')
        if (disposed) return

        scene = new THREE.Scene()
        camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.676, -0.676, 0.1, 20)
        camera.position.set(0, 0, 4)
        camera.lookAt(0, 0, 0)
        scene.add(new THREE.HemisphereLight(0xf4f7ff, 0x725b47, 1.7))
        const key = new THREE.DirectionalLight(0xffe0bd, 2.1)
        key.position.set(-1.2, 1.6, 3)
        scene.add(key)
        const fill = new THREE.DirectionalLight(0xc9d9ff, 0.9)
        fill.position.set(1.4, -0.6, 2.5)
        scene.add(fill)

        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' })
        renderer.outputColorSpace = THREE.SRGBColorSpace
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
        renderer.setClearColor(0x000000, 0)
        resizeObserver = new ResizeObserver(resize)
        resizeObserver.observe(stage)
        resize()

        new GLTFLoader().load(
          MODEL_URL,
          (gltf) => {
            if (disposed) return
            model = gltf.scene
            scene.add(model)
            model.traverse((node) => {
              if (node instanceof THREE!.Mesh) {
                node.frustumCulled = false
                const material = node.material as import('three').Material & { side?: number }
                material.side = THREE!.DoubleSide
                material.needsUpdate = true
              }
            })
            setLoaded(true)
            schedule()
          },
          undefined,
          () => setFailed(true),
        )
      } catch {
        setFailed(true)
      }
    }

    void start()

    return () => {
      disposed = true
      motionPreference.removeEventListener('change', onMotionPreferenceChange)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerUp)
      canvas.removeEventListener('webglcontextlost', onContextLost)
      resizeObserver?.disconnect()
      if (animationFrame) cancelAnimationFrame(animationFrame)
      model?.traverse((node) => {
        if (!(THREE && node instanceof THREE.Mesh)) return
        node.geometry.dispose()
        const materials = Array.isArray(node.material) ? node.material : [node.material]
        for (const material of materials) {
          for (const value of Object.values(material)) {
            if (THREE && value instanceof THREE.Texture) value.dispose()
          }
          material.dispose()
        }
      })
      renderer?.dispose()
      requestRender.current = () => {}
    }
  }, [engaged, failed, moveTo, src, expectedSourceSha256])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    const step = event.shiftKey ? 0.12 : 0.07
    if (event.key === 'ArrowLeft') moveTo(target.current.yaw - step, target.current.pitch)
    else if (event.key === 'ArrowRight') moveTo(target.current.yaw + step, target.current.pitch)
    else if (event.key === 'ArrowUp') moveTo(target.current.yaw, target.current.pitch + step)
    else if (event.key === 'ArrowDown') moveTo(target.current.yaw, target.current.pitch - step)
    else if (event.key === 'Home') moveTo(0, 0)
    else return
    event.preventDefault()
  }

  return (
    <div className={`portrait-relief${loaded ? ' portrait-relief--loaded' : ''}`} ref={stageRef} data-portrait-relief>
      <Image
        src={src}
        alt={loaded ? '' : alt}
        fill
        sizes={sizes}
        className="portrait-relief__fallback"
        priority={priority}
      />
      <canvas
        ref={canvasRef}
        className="portrait-relief__canvas"
        tabIndex={failed ? -1 : 0}
        role="img"
        aria-hidden={failed || undefined}
        aria-label={copy.canvas}
        aria-describedby="portrait-relief-help"
        onFocus={() => setEngaged(true)}
        onKeyDown={handleKeyDown}
        onPointerEnter={() => setEngaged(true)}
      />
      <span id="portrait-relief-help" className="sr-only">{copy.help}</span>
      <div className="portrait-relief__controls" aria-label={copy.controls}>
        <button type="button" aria-label={copy.up} onClick={() => moveTo(target.current.yaw, target.current.pitch + 0.1)} disabled={failed}>↑</button>
        <button type="button" aria-label={copy.left} onClick={() => moveTo(target.current.yaw - 0.12, target.current.pitch)} disabled={failed}>←</button>
        <button type="button" aria-label={copy.reset} onClick={() => moveTo(0, 0)} disabled={failed}>•</button>
        <button type="button" aria-label={copy.right} onClick={() => moveTo(target.current.yaw + 0.12, target.current.pitch)} disabled={failed}>→</button>
        <button type="button" aria-label={copy.down} onClick={() => moveTo(target.current.yaw, target.current.pitch - 0.1)} disabled={failed}>↓</button>
      </div>
      <span className="sr-only" aria-live="polite">
        {failed ? copy.still : loaded ? copy.active : engaged ? copy.loading : ''}
      </span>
    </div>
  )
}
