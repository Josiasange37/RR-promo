"use client"

import { useEffect, type RefObject, type DependencyList } from "react"
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap"

/**
 * Scroll-triggered reveal for every child carrying `[data-reveal]` inside the
 * given root. Elements fade + rise in once, staggered by group, when they hit
 * `top 85%`. Powered by GSAP ScrollTrigger, synced with Lenis.
 *
 * Pass `deps` to (re-)discover targets after async content mounts (e.g. once
 * candidate cards arrive from an API).
 *
 * Usage:
 *   const ref = useRef<HTMLElement>(null)
 *   useScrollReveal(ref, [candidates])
 *   return <main ref={ref}> <div data-reveal>…</div> … </main>
 */
export function useScrollReveal<T extends HTMLElement>(
  ref: RefObject<T | null>,
  deps: DependencyList = [],
) {
  useEffect(() => {
    const root = ref.current
    if (!root) return
    if (prefersReducedMotion()) return

    const els = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"))
    if (els.length === 0) return

    // Prime every reveal target to its hidden state.
    gsap.set(els, { autoAlpha: 0, y: 34 })

    const ctx = gsap.context(() => {
      ScrollTrigger.batch(els, {
        start: "top 85%",
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, {
            autoAlpha: 1,
            y: 0,
            duration: 0.9,
            ease: "power3.out",
            stagger: 0.1,
          }),
      })
    }, root)

    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, ...deps])
}