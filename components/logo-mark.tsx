'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import './logo-mark.css'

export function LogoMark() {
  const stage = useRef<HTMLSpanElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const hover = window.matchMedia('(hover: hover) and (pointer: fine)')
    let disposed = false
    let generation = 0
    let engine: { dispose(): void } | null = null
    function syncRenderer() {
      const current = ++generation
      engine?.dispose()
      engine = null
      setReady(false)
      if (disposed || motion.matches || !hover.matches || !stage.current || !canvas.current) return

      import('./logo-3d')
        .then(({ createLogo3d }) => {
          if (disposed || current !== generation || !canvas.current || !stage.current) return null
          return createLogo3d(canvas.current, stage.current, () => !disposed && current === generation, () => {
            if (!disposed && current === generation) setReady(false)
          }, () => {
            if (!disposed && current === generation) setReady(true)
          })
        })
        .then(created => {
          if (!created) return
          if (disposed || current !== generation) created.dispose()
          else engine = created
        })
        .catch(() => { /* Keep the static WebP when WebGL or the model is unavailable. */ })
    }

    motion.addEventListener('change', syncRenderer)
    hover.addEventListener('change', syncRenderer)
    syncRenderer()

    return () => {
      disposed = true
      generation++
      motion.removeEventListener('change', syncRenderer)
      hover.removeEventListener('change', syncRenderer)
      engine?.dispose()
    }
  }, [])

  return (
    <span ref={stage} className="logo-mark" data-ready={ready}>
      <Image
        src="/images/sudi-logo.png"
        alt="Sudi David"
        width={80}
        height={33}
        loading="eager"
        className="logo-mark-wordmark"
      />
      <span className="logo-mark-sculpture" aria-hidden="true">
        <Image
          src="/images/sudi-logo-sculpture.webp"
          alt=""
          width={900}
          height={720}
          sizes="64px"
          loading="eager"
          className="logo-mark-still"
        />
        <canvas ref={canvas} className="logo-mark-canvas" />
      </span>
    </span>
  )
}
