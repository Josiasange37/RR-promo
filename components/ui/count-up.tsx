"use client"

import { useEffect, useRef } from "react"
import { animate } from "animejs"

type Format = (value: number) => string

/** Default French number formatter with thousands separators. */
const toFr = (v: number) => v.toLocaleString("fr-FR")

interface CountUpProps {
  to: number
  /** Optional formatter applied to each rendered frame. */
  format?: Format
  /** Animation duration in ms. Defaults to 1200. */
  duration?: number
  className?: string
  style?: React.CSSProperties
  /** Static prefix/suffix rendered around the number (e.g. "%" or "FCFA"). */
  suffix?: React.ReactNode
}

/**
 * Animated number counter (anime.js). Counts from 0 / the previous value up
 * to `to`, formatting every frame. Falls back to a static render when the OS
 * requests reduced motion.
 */
export function CountUp({ to, format = toFr, duration = 1200, className, style, suffix }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const formatRef = useRef(format)
  formatRef.current = format

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const fmt = formatRef.current

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = fmt(to)
      return
    }

    const proxy = { val: 0 }
    const anim = animate(
      proxy,
      {
        val: to,
        duration,
        ease: "outExpo",
        onUpdate: () => {
          el.textContent = fmt(Math.round(proxy.val))
        },
      } as Parameters<typeof animate>[1],
    )

    return () => {
      if (anim && typeof (anim as { cancel?: () => void }).cancel === "function") {
        (anim as { cancel: () => void }).cancel()
      }
    }
  }, [to, duration])

  return (
    <span ref={ref} className={className} style={style} aria-live="off">
      {format(to)}
      {suffix ? <>{suffix}</> : null}
    </span>
  )
}