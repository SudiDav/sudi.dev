'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import './logo-mark.css'

/**
 * Design: "Logo Mark" — 80×33, images/sudi-logo.png, fit.
 *
 * The PNG paints first and stays as the fallback. Once the Blender-built 3D
 * mark is ready it takes the place of the flat S, and the wordmark remains.
 */
export function LogoMark() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let disposed = false
    let engine: { dispose(): void } | null = null
    import('./logo-3d')
      .then(({ createLogo3d }) => (canvas.current ? createLogo3d(canvas.current, () => setReady(false)) : null))
      .then(created => {
        if (!created) return
        if (disposed) created.dispose()
        else { engine = created; setReady(true) }
      })
      .catch(() => { /* Keep the flat logo. */ })
    return () => { disposed = true; engine?.dispose() }
  }, [])

  return (
    <span className="logo-mark" data-ready={ready}>
      <Image
        src="/images/sudi-logo.png"
        alt="Sudi David"
        width={80}
        height={33}
        priority
        className="logo-mark-image h-[33px] w-20 object-contain"
      />
      <canvas ref={canvas} className="logo-mark-canvas" aria-hidden="true" />
    </span>
  )
}
