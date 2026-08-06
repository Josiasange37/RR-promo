"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

interface ImageRevealBackgroundProps {
  /** Second image, revealed inside the cursor spotlight. */
  src: string
  /** Spotlight radius clamp as [min, viewport-fraction, max] in px. */
  radius?: [number, number, number]
  /** Grid cell clamp as [min, viewport-fraction, max] in px. */
  cell?: [number, number, number]
  /** Grid overlay opacity (0–1). */
  gridOpacity?: number
  /** Grid stroke color. */
  gridStroke?: string
  /** Reveal-layer opacity inside the spotlight (0–1). */
  revealOpacity?: number
  className?: string
}

/**
 * Dual-image hero reveal. The base layer is the sibling `.hero-image`; this
 * component stacks a second image on top, clipped by a soft radial mask that
 * eases toward the cursor, plus a parallax blueprint grid. Desktop only —
 * pass `hidden lg:block` through className, below lg the base image stands.
 *
 * Spotlight: eased toward mouse at 0.1/frame, radius clamp(160, 16vw, 420).
 * Grid: eased offset toward cursor × 16 at 0.06/frame.
 */
export function ImageRevealBackground({
  src,
  radius = [160, 0.16, 420],
  cell = [36, 0.028, 64],
  gridOpacity = 0.08,
  gridStroke = "#e8c26a",
  revealOpacity = 0.5,
  className,
}: ImageRevealBackgroundProps) {
  const patternId = React.useId()
  const rootRef = React.useRef<HTMLDivElement>(null)
  const revealRef = React.useRef<HTMLDivElement>(null)
  const patternRef = React.useRef<SVGPatternElement>(null)
  const pathRef = React.useRef<SVGPathElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)

  const mouseRef = React.useRef({ x: 0, y: 0 })
  const smoothRef = React.useRef({ x: 0, y: 0 })
  const gridEaseRef = React.useRef({ x: 0, y: 0 })
  const lastAppliedRef = React.useRef({ x: -1, y: -1 })
  const radiusRef = React.useRef(0)
  const cellRef = React.useRef(48)
  const rafRef = React.useRef<number | null>(null)

  const [rMin, rFrac, rMax] = radius
  const [cMin, cFrac, cMax] = cell

  const draw = React.useCallback(() => {
    const root = rootRef.current
    const reveal = revealRef.current
    if (!root || !reveal) return

    // Hidden below lg: stop the loop, the base image stands alone.
    if (root.offsetWidth === 0) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      return
    }

    const mouse = mouseRef.current
    const smooth = smoothRef.current
    smooth.x += (mouse.x - smooth.x) * 0.1
    smooth.y += (mouse.y - smooth.y) * 0.1

    const settledSpotlight =
      Math.abs(mouse.x - smooth.x) < 0.5 && Math.abs(mouse.y - smooth.y) < 0.5
    const moved = Math.abs(smooth.x - lastAppliedRef.current.x) + Math.abs(smooth.y - lastAppliedRef.current.y) > 0.3
    const settledGrid = Math.abs(gridEaseRef.current.x) < 0.1 && Math.abs(gridEaseRef.current.y) < 0.1

    if (moved || !settledGrid) {
      const rect = root.getBoundingClientRect()
      const maskX = smooth.x - rect.left
      const maskY = smooth.y - rect.top

      if (!canvasRef.current) canvasRef.current = document.createElement("canvas")
      const canvas = canvasRef.current
      const r = radiusRef.current
      const size = r * 2
      if (canvas.width !== size) {
        canvas.width = size
        canvas.height = size
      }
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.clearRect(0, 0, size, size)
        const grad = ctx.createRadialGradient(r, r, 0, r, r, r)
        grad.addColorStop(0, "rgba(255,255,255,1)")
        grad.addColorStop(0.4, "rgba(255,255,255,1)")
        grad.addColorStop(0.6, "rgba(255,255,255,0.75)")
        grad.addColorStop(0.75, "rgba(255,255,255,0.4)")
        grad.addColorStop(0.88, "rgba(255,255,255,0.12)")
        grad.addColorStop(1, "rgba(255,255,255,0)")
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, size, size)
      }

      const dataUrl = canvas.toDataURL()
      reveal.style.opacity = String(revealOpacity)
      reveal.style.maskImage = `url(${dataUrl})`
      reveal.style.webkitMaskImage = `url(${dataUrl})`
      reveal.style.maskSize = `${size}px ${size}px`
      reveal.style.webkitMaskSize = `${size}px ${size}px`
      reveal.style.maskPosition = `${maskX - r}px ${maskY - r}px`
      reveal.style.webkitMaskPosition = `${maskX - r}px ${maskY - r}px`
      reveal.style.maskRepeat = "no-repeat"
      reveal.style.webkitMaskRepeat = "no-repeat"
      lastAppliedRef.current = { x: smooth.x, y: smooth.y }

      const pattern = patternRef.current
      if (pattern) {
        const cx = maskX / rect.width
        const cy = maskY / rect.height
        const targetX = (cx - 0.5) * 16
        const targetY = (cy - 0.5) * 16
        const ease = gridEaseRef.current
        ease.x += (targetX - ease.x) * 0.06
        ease.y += (targetY - ease.y) * 0.06
        pattern.setAttribute("x", String(ease.x))
        pattern.setAttribute("y", String(ease.y))
      }
    }

    if (settledSpotlight && settledGrid && !moved) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      return
    }
    rafRef.current = requestAnimationFrame(draw)
  }, [revealOpacity])

  React.useEffect(() => {
    const w = window
    mouseRef.current = { x: w.innerWidth / 2, y: w.innerHeight / 2 }
    smoothRef.current = { x: w.innerWidth / 2, y: w.innerHeight / 2 }

    const updateMetrics = () => {
      radiusRef.current = Math.round(Math.min(rMax, Math.max(rMin, w.innerWidth * rFrac)))
      cellRef.current = Math.round(Math.min(cMax, Math.max(cMin, w.innerWidth * cFrac)))
      const pattern = patternRef.current
      const path = pathRef.current
      if (pattern) {
        pattern.setAttribute("width", String(cellRef.current))
        pattern.setAttribute("height", String(cellRef.current))
      }
      if (path) {
        path.setAttribute("d", `M ${cellRef.current} 0 L 0 0 0 ${cellRef.current}`)
      }
      if (rafRef.current === null) rafRef.current = requestAnimationFrame(draw)
    }
    updateMetrics()

    const onMove = (event: MouseEvent) => {
      mouseRef.current.x = event.clientX
      mouseRef.current.y = event.clientY
      if (rafRef.current === null) rafRef.current = requestAnimationFrame(draw)
    }

    w.addEventListener("mousemove", onMove, { passive: true })
    w.addEventListener("resize", updateMetrics)
    return () => {
      w.removeEventListener("mousemove", onMove)
      w.removeEventListener("resize", updateMetrics)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [draw, rMax, rMin, rFrac, cMax, cMin, cFrac])

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className={cn(
        "hero-reveal pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      <div
        ref={revealRef}
        className="absolute inset-0 opacity-0"
        style={{
          backgroundImage: `url(${src})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <pattern
            ref={patternRef}
            id={patternId}
            width={cellRef.current}
            height={cellRef.current}
            patternUnits="userSpaceOnUse"
          >
            <path
              ref={pathRef}
              d={`M ${cellRef.current} 0 L 0 0 0 ${cellRef.current}`}
              fill="none"
              stroke={gridStroke}
              strokeWidth={0.6}
            />
          </pattern>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill={`url(#${patternId})`}
          fillOpacity={gridOpacity}
        />
      </svg>
    </div>
  )
}
