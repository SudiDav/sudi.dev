'use client'

import { useEffect, useRef } from 'react'
import './career-stepper.css'

export type CareerStep = { role: string; period: string; company: string; description: string }

/**
 * The About page's career, newest first, as a stepper: the current role is
 * marked "Now", and as the reader scrolls back through the years the line fills
 * and each role's dot lights up when the reading line reaches it.
 */
export function CareerStepper({ steps }: { steps: CareerStep[] }) {
  const listRef = useRef<HTMLOListElement>(null)

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const dots = [...list.querySelectorAll<HTMLElement>('.career-stepper-dot')]
    let frame = 0
    function update() {
      frame = 0
      // The reading line sits a little below the middle of the screen.
      const line = window.innerHeight * 0.6
      const top = list!.getBoundingClientRect().top
      const height = list!.offsetHeight
      const reached = Math.min(height, Math.max(0, line - top))
      const centres = dots.map(dot => dot.getBoundingClientRect().top + dot.offsetHeight / 2 - top)
      // The track runs from the first dot to the last; the fill stops at the reading line.
      const first = centres[0] ?? 0
      const last = centres[centres.length - 1] ?? 0
      list!.style.setProperty('--career-start', `${first}px`)
      list!.style.setProperty('--career-length', `${last - first}px`)
      list!.style.setProperty('--career-fill', `${Math.min(last, Math.max(first, reached)) - first}px`)
      dots.forEach((dot, index) => dot.closest('li')?.toggleAttribute('data-reached', index === 0 || centres[index] <= reached))
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    // Re-measure when the list reflows (web fonts arriving, a wider window).
    const sizer = new ResizeObserver(onScroll)
    sizer.observe(list)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      sizer.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <ol ref={listRef} className="career-stepper">
      {steps.map((step, index) => (
        <li key={`${step.company}-${step.period}`} className="career-stepper-step" data-reached={index === 0 ? '' : undefined}>
          <span className="career-stepper-dot" aria-hidden="true" />
          <div className="career-stepper-body">
            <div className="career-stepper-heading">
              <h3>
                {step.role}
                {index === 0 && <span className="career-stepper-now">Now</span>}
              </h3>
              <span className="career-stepper-period">{step.period}</span>
            </div>
            <p className="career-stepper-company">{step.company}</p>
            <p className="career-stepper-description">{step.description}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
