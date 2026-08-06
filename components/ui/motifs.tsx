import * as React from "react"

import { cn } from "@/lib/utils"

type CornerPos = "tl" | "tr" | "bl" | "br"

const CORNER_PATHS: Record<CornerPos, string> = {
  tl: "M0 11.5V0.5H11.5",
  tr: "M0.5 0.5H11.5V11.5",
  bl: "M0 0.5V11.5H11.5",
  br: "M0.5 11.5H11.5V0.5",
}

interface CornerProps extends React.SVGProps<SVGSVGElement> {
  pos: CornerPos
}

/** 12×12 L-shaped bracket. Inherits `currentColor`. */
export function Corner({ pos, className, ...props }: CornerProps) {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className={cn(`corner-${pos}`, className)}
      aria-hidden="true"
      {...props}
    >
      <path d={CORNER_PATHS[pos]} />
    </svg>
  )
}

interface CornerFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Which corners to render. */
  corners?: CornerPos[]
  className?: string
  children?: React.ReactNode
  style?: React.CSSProperties
  id?: string
}

/** Framed box — four corner brackets, no filled background. */
export function CornerFrame({ corners = ["tl", "tr", "bl", "br"], className, children, style, id, ...rest }: CornerFrameProps) {
  return (
    <div className={cn("corner-frame", className)} style={style} id={id} {...rest}>
      {corners.map((pos) => (
        <Corner key={pos} pos={pos} />
      ))}
      {children}
    </div>
  )
}

const CHECKER_ROWS = [
  { y: 0, shift: 0 },
  { y: 6.15, shift: 2.25 },
  { y: 12.3, shift: 0 },
  { y: 18.45, shift: 2.25 },
]
const CHECKER_COLS = [0, 4.5, 9, 13.5, 18, 22.5, 27, 31.5]

/** 36×18 checkerboard grid, squares filled with `currentColor`. */
export function Checker({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 36 18" className={className} aria-hidden="true" {...props}>
      {CHECKER_ROWS.map((row, i) =>
        CHECKER_COLS.map((x, j) => (
          <rect key={`${i}-${j}`} x={x + row.shift} y={row.y} width={3.8} height={3.8} fill="currentColor" />
        )),
      )}
    </svg>
  )
}

/** 64×64 wireframe globe. Inherits `currentColor`, stroke 1.2. */
export function Globe({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth={1.2} className={className} aria-hidden="true" {...props}>
      <circle cx="32" cy="32" r="28" />
      <line x1="4" y1="32" x2="60" y2="32" />
      <ellipse cx="32" cy="32" rx="28" ry="10" />
      <ellipse cx="32" cy="32" rx="28" ry="18" />
      <line x1="32" y1="4" x2="32" y2="60" />
      <ellipse cx="32" cy="32" rx="10" ry="28" />
      <ellipse cx="32" cy="32" rx="18" ry="28" />
    </svg>
  )
}
