"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Crown, Menu, X, Trophy, HelpCircle, Users } from "lucide-react"

/* ─── Nav link config ─── */
interface NavLink {
  href: string
  label: string
  Icon: React.ElementType
  /** hash-link only: jump within home page */
  hash?: boolean
}

const NAV_LINKS: NavLink[] = [
  { href: "/#vote",              label: "Voter",              Icon: Crown,         hash: true  },
  { href: "/candidats",          label: "Candidats",          Icon: Users,                     },
  { href: "/classement",         label: "Classement",         Icon: Trophy,                    },
  { href: "/comment-ca-marche",  label: "Comment ça marche",  Icon: HelpCircle,                },
]

/* ─── Helpers ─── */
function isActive(pathname: string, href: string): boolean {
  if (href.startsWith("/#")) return pathname === "/"
  return pathname === href || pathname.startsWith(href + "/")
}

/* ─── Component ─── */
export function SiteNavbar() {
  const pathname  = usePathname()
  const isHome    = pathname === "/"

  const [menuOpen,   setMenuOpen]   = useState(false)
  const [scrolled,   setScrolled]   = useState(false)
  const [mounted,    setMounted]    = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  /* mount guard for SSR */
  useEffect(() => { setMounted(true) }, [])

  /* scroll-aware opacity */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  /* close menu on route change */
  useEffect(() => { setMenuOpen(false) }, [pathname])

  /* close on outside click */
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [menuOpen])

  /* lock body scroll when mobile menu open */
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [menuOpen])

  /* ─── glass pill opacity driven by scroll ─── */
  const bgOpacity   = scrolled ? 0.88 : isHome ? 0.0 : 0.72
  const borderAlpha = scrolled ? 0.12 : isHome ? 0.0 : 0.09
  const shadowAlpha = scrolled ? 0.55 : 0.0

  // The secret admin panel is self-contained — never render the public site
  // chrome on /admin/* so no admin surface leaks to visitors.
  if (pathname.startsWith("/admin")) return null

  return (
    <>
      {/* ══ FLOATING NAV BAR ══ */}
      <header
        ref={menuRef}
        role="banner"
        className="fixed left-0 right-0 z-[100] transition-all duration-500"
        style={{ top: 0 }}
      >
        {/* Pill wrapper — transitions from transparent (hero) to glassy (scrolled) */}
        <div
          className="mx-auto transition-all duration-500"
          style={{
            maxWidth: "1280px",
            padding: scrolled ? "8px 16px" : "16px 16px",
          }}
        >
          <div
            className="flex items-center justify-between rounded-2xl px-4 sm:px-6 transition-all duration-500"
            style={{
              height: "58px",
              background: `rgba(12, 12, 18, ${bgOpacity})`,
              border: `1px solid rgba(255, 255, 255, ${borderAlpha})`,
              boxShadow: `0 8px 32px -8px rgba(0,0,0,${shadowAlpha}), inset 0 1px 0 rgba(255,255,255,${borderAlpha * 0.8})`,
              backdropFilter: mounted && (scrolled || !isHome) ? "blur(20px) saturate(160%)" : "none",
              WebkitBackdropFilter: mounted && (scrolled || !isHome) ? "blur(20px) saturate(160%)" : "none",
            }}
          >
            {/* ── LOGO ── */}
            <Link
              href="/"
              aria-label="Vote Roi & Reine — retour à l'accueil"
              className="flex items-center gap-2.5 flex-none group cursor-pointer"
              onClick={() => setMenuOpen(false)}
            >
              {/* Word mark */}
              <div className="leading-none">
                <div
                  className="font-black tracking-[0.12em] text-white uppercase leading-none"
                  style={{ fontFamily: "var(--font-orbitron)", fontSize: "0.95rem" }}
                >
                  VOTE<em className="text-[#e8c26a] not-italic text-[0.6rem] align-super">˚</em>
                </div>
                <div
                  className="text-white/40 font-medium uppercase tracking-[0.22em] leading-tight"
                  style={{ fontSize: "0.52rem" }}
                >
                  Roi &amp; Reine
                </div>
              </div>
            </Link>

            {/* ── DESKTOP NAV LINKS ── */}
            <nav
              className="hidden lg:flex items-center gap-1"
              aria-label="Navigation principale"
            >
              {NAV_LINKS.map((link) => {
                const active = isActive(pathname, link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[0.72rem] font-semibold uppercase tracking-[0.14em] transition-all duration-200 cursor-pointer group"
                    style={{
                      color: active ? "#e8c26a" : "rgba(255,255,255,0.62)",
                      background: active ? "rgba(232,194,106,0.1)" : "transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.color = "rgba(255,255,255,0.9)"
                        e.currentTarget.style.background = "rgba(255,255,255,0.06)"
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.color = "rgba(255,255,255,0.62)"
                        e.currentTarget.style.background = "transparent"
                      }
                    }}
                    aria-current={active ? "page" : undefined}
                  >
                    <link.Icon
                      className="size-3.5 flex-none"
                      strokeWidth={active ? 2 : 1.5}
                      aria-hidden="true"
                    />
                    {link.label}
                    {/* Active underline dot */}
                    {active && (
                      <span
                        className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#e8c26a]"
                        aria-hidden="true"
                      />
                    )}
                  </Link>
                )
              })}
            </nav>

            {/* ── RIGHT ACTIONS ── */}
            <div className="flex items-center gap-2 flex-none">

              {/* Gold CTA — vote button */}
              <Link
                href="/candidats"
                className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[0.72rem] uppercase tracking-[0.14em] cursor-pointer transition-all duration-250 group"
                style={{
                  background: "linear-gradient(135deg, #e8c26a, #c9a84c)",
                  color: "#101014",
                  boxShadow: "0 2px 12px rgba(232,194,106,0.35)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 20px rgba(232,194,106,0.55)"
                  e.currentTarget.style.transform = "translateY(-1px)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 2px 12px rgba(232,194,106,0.35)"
                  e.currentTarget.style.transform = "translateY(0)"
                }}
              >
                <Crown className="size-3.5 transition-transform duration-200 group-hover:rotate-12" strokeWidth={2.5} aria-hidden="true" />
                Voter
              </Link>

              {/* Hamburger — mobile only */}
              <button
                type="button"
                className="flex lg:hidden w-11 h-11 rounded-xl items-center justify-center cursor-pointer transition-all duration-200 relative"
                style={{ background: menuOpen ? "rgba(232,194,106,0.12)" : "rgba(255,255,255,0.05)", border: menuOpen ? "1px solid rgba(232,194,106,0.3)" : "1px solid rgba(255,255,255,0.08)" }}
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-controls="mobile-menu"
                aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              >
                {/* Animated X / hamburger */}
                <span
                  className="absolute transition-all duration-350 ease-out"
                  style={{ opacity: menuOpen ? 1 : 0, transform: menuOpen ? "rotate(0deg) scale(1)" : "rotate(-90deg) scale(0.5)" }}
                  aria-hidden="true"
                >
                  <X size={17} strokeWidth={2} style={{ color: "#e8c26a" }} />
                </span>
                <span
                  className="absolute transition-all duration-350 ease-out"
                  style={{ opacity: menuOpen ? 0 : 1, transform: menuOpen ? "rotate(90deg) scale(0.5)" : "rotate(0deg) scale(1)" }}
                  aria-hidden="true"
                >
                  <Menu size={17} strokeWidth={1.75} className="text-white" />
                </span>
              </button>
            </div>
          </div>

          {/* ══ MOBILE DROPDOWN ══ */}
          <div
            id="mobile-menu"
            role="navigation"
            aria-label="Navigation mobile"
            className="lg:hidden overflow-hidden transition-all duration-400 ease-out"
            style={{
              maxHeight: menuOpen ? "480px" : "0px",
              opacity: menuOpen ? 1 : 0,
              transform: menuOpen ? "translateY(0)" : "translateY(-8px)",
            }}
          >
            <div
              className="mt-2 rounded-2xl overflow-hidden"
              style={{
                background: "rgba(10,10,18,0.96)",
                border: "1px solid rgba(255,255,255,0.09)",
                backdropFilter: "blur(24px)",
                boxShadow: "0 24px 48px -12px rgba(0,0,0,0.9)",
              }}
            >
              {/* Nav links list */}
              <nav className="py-2 px-2">
                {NAV_LINKS.map((link, i) => {
                  const active = isActive(pathname, link.href)
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl cursor-pointer transition-all duration-200"
                      style={{
                        transitionDelay: menuOpen ? `${i * 40}ms` : "0ms",
                        transform: menuOpen ? "translateX(0)" : "translateX(-12px)",
                        opacity: menuOpen ? 1 : 0,
                        background: active ? "rgba(232,194,106,0.08)" : "transparent",
                        color: active ? "#e8c26a" : "rgba(255,255,255,0.72)",
                        borderLeft: active ? "2px solid rgba(232,194,106,0.5)" : "2px solid transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (!active) {
                          e.currentTarget.style.background = "rgba(255,255,255,0.05)"
                          e.currentTarget.style.color = "#fff"
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          e.currentTarget.style.background = "transparent"
                          e.currentTarget.style.color = "rgba(255,255,255,0.72)"
                        }
                      }}
                      aria-current={active ? "page" : undefined}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-none"
                        style={{ background: active ? "rgba(232,194,106,0.15)" : "rgba(255,255,255,0.05)" }}
                      >
                        <link.Icon
                          className="size-4"
                          strokeWidth={active ? 2 : 1.5}
                          style={{ color: active ? "#e8c26a" : "rgba(255,255,255,0.5)" }}
                          aria-hidden="true"
                        />
                      </div>
                      <span
                        className="text-sm font-semibold uppercase tracking-[0.12em]"
                      >
                        {link.label}
                      </span>
                      {active && (
                        <span className="ml-auto">
                          <span
                            className="inline-block w-1.5 h-1.5 rounded-full bg-[#e8c26a]"
                            aria-hidden="true"
                          />
                        </span>
                      )}
                    </Link>
                  )
                })}
              </nav>

              {/* Divider */}
              <div className="h-px mx-4" style={{ background: "rgba(255,255,255,0.06)" }} />
              {/* Bottom actions */}
              <div className="p-3">
                <Link
                  href="/candidats"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all duration-200"
                  style={{
                    background: "linear-gradient(135deg, #e8c26a, #c9a84c)",
                    color: "#101014",
                    boxShadow: "0 2px 10px rgba(232,194,106,0.3)",
                  }}
                >
                  <Crown className="size-4" strokeWidth={2.5} aria-hidden="true" />
                  Voter maintenant
                </Link>
              </div>

            </div>
          </div>
        </div>

        {/* ── Backdrop for mobile (blocks interaction with page while menu open) ── */}
        <div
          className="fixed inset-0 lg:hidden -z-10 transition-opacity duration-400"
          style={{ background: "rgba(0,0,0,0.5)", opacity: menuOpen ? 1 : 0, pointerEvents: menuOpen ? "auto" : "none" }}
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      </header>

      {/* ── SPACER: pushes page content below the fixed navbar on non-hero pages ── */}
      {!isHome && <div style={{ height: "90px" }} aria-hidden="true" />}
    </>
  )
}
