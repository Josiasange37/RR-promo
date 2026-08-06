"use client"

import { useEffect, useRef } from "react"
import Lenis from "lenis"
import { usePathname } from "next/navigation"
import { Crown } from "lucide-react"
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap"

/**
 * Global animation shell:
 *  - Lenis smooth scrolling, synced to the GSAP ticker + ScrollTrigger.
 *  - A "page transition" curtain swept over each route change (the same
 *    leave/enter feel Barba provides for MPAs, adapted to Next's App Router
 *    where Barba's DOM swapping would fight React).
 * This runs once per route-mount; children (per-page components) add their
 * own ScrollTriggers via useScrollReveal().
 */
export function AnimationProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const prevPath = useRef<string | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // ── Lenis + ScrollTrigger sync ───────────────────────────────────────
  useEffect(() => {
    if (prefersReducedMotion()) return

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.4,
    })

    lenis.on("scroll", ScrollTrigger.update)

    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
    }
  }, [])

  // ── Route-change curtain transition ─────────────────────────────────
  useEffect(() => {
    const overlay = overlayRef.current

    if (prevPath.current === null) {
      prevPath.current = pathname
      return
    }
    if (prevPath.current === pathname) return

    prevPath.current = pathname

    if (overlay && !prefersReducedMotion()) {
      gsap.killTweensOf(overlay)
      gsap
        .timeline({ onComplete: () => ScrollTrigger.refresh() })
        .fromTo(overlay, { yPercent: 100 }, { yPercent: 0, duration: 0.42, ease: "power3.inOut" })
        .fromTo(overlay, { yPercent: 0 }, { yPercent: -200, duration: 0.55, ease: "power4.inOut" }, "+=0.06")
    } else {
      ScrollTrigger.refresh()
    }
  }, [pathname])

  return (
    <>
      {children}

      {/* Page-transition curtain (kept off-screen until a route change) */}
      <div
        ref={overlayRef}
        className="fixed inset-x-0 top-0 bottom-0 z-[1200] pointer-events-none flex items-center justify-center"
        style={{
          transform: "translateY(100%)",
          background:
            "radial-gradient(120% 80% at 50% 20%, rgba(232,194,106,0.16) 0%, transparent 55%), rgba(10,10,18,0.96)",
        }}
        aria-hidden="true"
      >
        <div
          className="flex flex-col items-center gap-4"
          style={{ color: "#e8c26a" }}
        >
          <Crown className="size-10" strokeWidth={1.5} />
          <span className="font-orbitron font-black uppercase tracking-[0.3em] text-sm">Vote</span>
        </div>
      </div>
    </>
  )
}