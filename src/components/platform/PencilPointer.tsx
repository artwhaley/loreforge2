'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import styles from './PlatformShell.module.scss'

type Point = { x: number; y: number }
type Stroke = { from: Point; to: Point; time: number; weight: number; intensity: number }

export function PencilPointer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pathname = usePathname()

  useEffect(() => {
    const canvas = canvasRef.current
    const surface = canvas?.parentElement
    const context = canvas?.getContext('2d')
    if (!canvas || !surface || !context) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const mouse = window.matchMedia('(hover: hover) and (pointer: fine)')
    let strokes: Stroke[] = []
    let previous: Point | null = null
    let cursor: Point | null = null
    let scribbleStart: number | null = null
    let scribblePoint: Point | null = null
    let frame = 0
    let idle: ReturnType<typeof setTimeout> | undefined
    const lifetime = 850
    const enabled = () => !reduced.matches && mouse.matches && !document.hidden

    const reset = () => {
      clearTimeout(idle)
      cancelAnimationFrame(frame)
      frame = 0
      strokes = []
      previous = cursor = scribblePoint = null
      scribbleStart = null
      context.clearRect(0, 0, window.innerWidth, window.innerHeight)
    }
    const resize = () => {
      reset()
      const scale = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(window.innerWidth * scale)
      canvas.height = Math.round(window.innerHeight * scale)
      context.setTransform(scale, 0, 0, scale, 0, 0)
    }
    const draw = (now: number) => {
      frame = 0
      if (!enabled()) { reset(); return }
      if (scribbleStart !== null && cursor) {
        const progress = Math.min((now - scribbleStart) / 680, 1)
        // Short, imperfect wrist strokes: one pen test for each pause.
        const point = {
          x: cursor.x + 12 + Math.sin(progress * Math.PI * 9) * (11 - progress * 3),
          y: cursor.y + 9 + progress * 19 + Math.sin(progress * Math.PI * 18) * 1.3,
        }
        if (scribblePoint) strokes.push({ from: scribblePoint, to: point, time: now, weight: .75 + Math.sin(progress * Math.PI) * .5, intensity: 1 })
        scribblePoint = point
        if (progress === 1) scribbleStart = null
      }
      strokes = strokes.filter((stroke) => now - stroke.time < lifetime)
      context.clearRect(0, 0, window.innerWidth, window.innerHeight)
      context.lineCap = 'round'
      context.lineJoin = 'round'
      for (const stroke of strokes) {
        const opacity = Math.pow(1 - (now - stroke.time) / lifetime, 1.6)
        context.strokeStyle = `rgba(245, 240, 227, ${opacity * .62 * stroke.intensity})`
        context.lineWidth = stroke.weight
        context.beginPath()
        context.moveTo(stroke.from.x, stroke.from.y)
        context.lineTo(stroke.to.x, stroke.to.y)
        context.stroke()
        // A finer offset strand gives the line a dry graphite edge.
        context.strokeStyle = `rgba(245, 240, 227, ${opacity * .18 * stroke.intensity})`
        context.lineWidth = .45
        context.beginPath()
        context.moveTo(stroke.from.x + .9, stroke.from.y - .6)
        context.lineTo(stroke.to.x + .6, stroke.to.y - .9)
        context.stroke()
      }
      if (strokes.length || scribbleStart !== null) frame = requestAnimationFrame(draw)
    }
    const wake = () => { if (!frame) frame = requestAnimationFrame(draw) }
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || !enabled() || event.buttons !== 0) { reset(); return }
      const target = event.target as Element
      // Leave text entry and selection visually quiet.
      if (target.closest('input, textarea, select, [contenteditable="true"]')) { reset(); return }
      const point = { x: event.clientX + 2, y: event.clientY + 3 }
      if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) < .75) return
      if (previous) strokes.push({ from: previous, to: point, time: performance.now(), weight: 1.05, intensity: .3 })
      previous = cursor = point
      scribbleStart = null
      scribblePoint = null
      clearTimeout(idle)
      idle = setTimeout(() => {
        if (!enabled() || !cursor) return
        scribbleStart = performance.now()
        scribblePoint = null
        wake()
      }, 2400)
      wake()
    }
    resize()
    surface.addEventListener('pointermove', move)
    surface.addEventListener('pointerleave', reset)
    surface.addEventListener('pointerdown', reset)
    window.addEventListener('resize', resize)
    window.addEventListener('scroll', reset, { passive: true })
    window.addEventListener('blur', reset)
    document.addEventListener('visibilitychange', reset)
    reduced.addEventListener('change', reset)
    mouse.addEventListener('change', reset)
    return () => {
      reset()
      surface.removeEventListener('pointermove', move)
      surface.removeEventListener('pointerleave', reset)
      surface.removeEventListener('pointerdown', reset)
      window.removeEventListener('resize', resize)
      window.removeEventListener('scroll', reset)
      window.removeEventListener('blur', reset)
      document.removeEventListener('visibilitychange', reset)
      reduced.removeEventListener('change', reset)
      mouse.removeEventListener('change', reset)
    }
  }, [pathname])

  return <canvas ref={canvasRef} className={styles.pencilPointer} aria-hidden="true" />
}
