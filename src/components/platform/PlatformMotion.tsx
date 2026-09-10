'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, type ReactNode } from 'react'

/** Progressive motion: the server-rendered page is always readable without JS. */
export function PlatformMotion({ children, className }: { children: ReactNode; className: string }) {
  const root = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  useEffect(() => {
    const element = root.current
    if (!element) return
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const animations = new Set<Animation>()
    let observer: IntersectionObserver | undefined
    const play = (target: Element, frames: Keyframe[], options: KeyframeAnimationOptions) => {
      const animation = target.animate(frames, options)
      animations.add(animation)
      void animation.finished.then(() => animations.delete(animation), () => animations.delete(animation))
    }
    const setup = () => {
      observer?.disconnect()
      animations.forEach((animation) => animation.cancel())
      element.querySelectorAll<HTMLElement>('[data-blueprint]').forEach((art) => {
        art.style.removeProperty('--hatch-shift')
      })
      element.querySelectorAll<HTMLAnchorElement>('nav a').forEach((link) => {
        if (link.pathname === pathname) link.setAttribute('aria-current', 'page')
        else link.removeAttribute('aria-current')
      })
      if (preference.matches) return
      const veil = element.querySelector('[data-route-smoke]')
      if (veil) play(veil, [
        { opacity: .8, transform: 'translate3d(-12%, 8%, 0) scale(1.1)' },
        { opacity: .35, offset: .4 },
        { opacity: 0, transform: 'translate3d(18%, -12%, 0) scale(1.4)' },
      ], { duration: 850, easing: 'cubic-bezier(.16,1,.3,1)' })
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          observer?.unobserve(entry.target)
          const delay = Number(entry.target.getAttribute('data-reveal-delay') ?? 0)
          play(entry.target, [
            { opacity: 0, transform: 'translateY(32px) scale(.985)', filter: 'blur(12px)' },
            { opacity: .9, filter: 'blur(1px)', offset: .55 },
            { opacity: 1, transform: 'none', filter: 'blur(0px)' },
          ], { duration: 750, delay, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' })
          entry.target.setAttribute('data-entered', 'true')
        })
      }, { threshold: 0.08 })
      element.querySelectorAll('[data-reveal]').forEach((target) => observer?.observe(target))
    }
    setup()
    preference.addEventListener('change', setup)
    const move = (event: PointerEvent) => {
      if (preference.matches || event.pointerType !== 'mouse') return
      const art = (event.target as Element).closest<HTMLElement>('[data-blueprint]')
      if (!art) return
      const rect = art.getBoundingClientRect()
      art.style.setProperty('--hatch-shift', `${((event.clientX - rect.left) / rect.width - 0.5) * 14}px`)
    }
    const leave = (event: PointerEvent) => {
      const art = (event.target as Element).closest<HTMLElement>('[data-blueprint]')
      if (art && !art.contains(event.relatedTarget as Node | null)) {
        art.style.setProperty('--hatch-shift', '0px')
      }
    }
    element.addEventListener('pointermove', move)
    element.addEventListener('pointerout', leave)
    return () => {
      observer?.disconnect()
      animations.forEach((animation) => animation.cancel())
      preference.removeEventListener('change', setup)
      element.removeEventListener('pointermove', move)
      element.removeEventListener('pointerout', leave)
    }
  }, [pathname])

  return <div className={className} ref={root}>{children}</div>
}
