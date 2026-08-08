"use client"

import { useState, useEffect, useRef } from "react"
import {
  Star,
  Clock,
  Calendar,
  Crown,
  Sparkles,
  Trophy,
  Smartphone,
  CheckCircle,
  X,
  XCircle,
  ChevronRight,
  Loader2,
  Phone,
  Gem,
} from "lucide-react"

import { CoverflowCarousel, type CoverflowSlide } from "@/components/ui/coverflow-carousel"
import { CornerFrame } from "@/components/ui/motifs"
import { CountUp } from "@/components/ui/count-up"
import { motion, AnimatePresence } from "motion/react"
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap"
import { useScrollReveal } from "@/lib/use-scroll-reveal"
import { safeJson } from "@/lib/safe-json"
import Link from "next/link"

/* ─────────────────────────────────────────────────────────────────
   Image helpers
───────────────────────────────────────────────────────────────── */
const UNSPLASH = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=640&h=640&fit=crop&q=70&auto=format`

/* ─────────────────────────────────────────────────────────────────
   Data / Constants
───────────────────────────────────────────────────────────────── */

const HOW_IT_WORKS: [string, string, string][] = [
  ["01", "Choisis", "Parcours la liste des candidats Roi ou Reine et clique sur celui ou celle de ton choix."],
  ["02", "Paye", "Saisis ton numéro Mobile Money et le nombre de votes. 100 FCFA par vote."],
  ["03", "Valide", "Confirme la transaction sur ton téléphone (prompt USSD) pour valider tes votes."],
]

const VIDEO_SRC = "/hero-bal-masque.mp4"


function d(ms: number): React.CSSProperties {
  return { animationDelay: `${ms}ms` }
}

export interface Candidate {
  id: string
  name: string
  class: string
  category: "Roi" | "Reine"
  votes: number
  imageUrl: string
}

/* ═══════════════════════════════════════════════════════════════════
   Page Component
═══════════════════════════════════════════════════════════════════ */
export default function Page() {
  // Candidate Data & Live Polling
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loadingCandidates, setLoadingCandidates] = useState(true)

  // Active Category Selection ("Roi" | "Reine")
  const [activeCategory, setActiveCategory] = useState<"Roi" | "Reine">("Roi")
  const [showAllCandidates, setShowAllCandidates] = useState<boolean>(false)
  const [carouselIndex, setCarouselIndex] = useState<number>(0)

  // Interactive Voting Modal State
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [voteCount, setVoteCount] = useState<number>(5)
  const [phoneNumber, setPhoneNumber] = useState<string>("")
  const [operator, setOperator] = useState<"MTN" | "ORANGE">("MTN")

  // Payment/Voting Flow States
  // "idle" | "initiating" | "pending_ussd" | "success" | "failed"
  const [flowState, setFlowState] = useState<"idle" | "initiating" | "pending_ussd" | "success" | "failed">("idle")
  const [currentTxId, setCurrentTxId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>("")

  // ── Animation refs ────────────────────────────────────────────────────
  const rootRef = useRef<HTMLElement>(null) // page root (full-page reveal scope)
  const heroRef = useRef<HTMLDivElement>(null) // cinematic hero (parallax scope)
  useScrollReveal(rootRef, [candidates, activeCategory, showAllCandidates])

  // Fetch candidates from API
  const fetchCandidates = async () => {
    try {
      const res = await fetch("/api/candidates")
      const data = await safeJson(res)
      if (data.success) {
        setCandidates(data.candidates)
      }
    } catch (err) {
      console.error("Failed to load candidates:", err)
    } finally {
      setLoadingCandidates(false)
    }
  }

  useEffect(() => {
    fetchCandidates()
    // Poll every 8 seconds for real-time live ranking
    const interval = setInterval(fetchCandidates, 8000)
    return () => clearInterval(interval)
  }, [])

  // Cinematic hero: parallax drift + content soft-fade as you scroll away.
  useEffect(() => {
    const hero = heroRef.current
    if (!hero || prefersReducedMotion()) return

    const ctx = gsap.context(() => {
      const video = hero.querySelector("video")
      const bg = hero.querySelector(".hero-bg")
      const content = hero.querySelector(".hero-content")

      if (video) {
        gsap.fromTo(video, { yPercent: 0 }, { yPercent: 14, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } })
      }
      if (bg) {
        gsap.fromTo(bg, { scale: 1 }, { scale: 1.12, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } })
      }
      if (content) {
        gsap.fromTo(content, { opacity: 1, y: 0 }, { opacity: 0, y: -60, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom 20%", scrub: true } })
      }
    }, hero)

    return () => ctx.revert()
  }, [])

  // Poll specific transaction status during USSD confirmation phase
  useEffect(() => {
    if (flowState !== "pending_ussd" || !currentTxId) return

    let statusPollCount = 0
    const maxPolls = 30 // Stop checking after 90 seconds (30 * 3s)

    const pollInterval = setInterval(async () => {
      statusPollCount++
      if (statusPollCount > maxPolls) {
        setFlowState("failed")
        setErrorMessage("Le paiement a expiré ou a pris trop de temps à être validé.")
        clearInterval(pollInterval)
        return
      }

      try {
        const res = await fetch(`/api/vote/status?id=${currentTxId}`)
        const data = await safeJson(res)
        if (data.success) {
          if (data.status === "SUCCESS") {
            setFlowState("success")
            fetchCandidates() // update votes on the main UI immediately
            clearInterval(pollInterval)
          } else if (data.status === "FAILED") {
            setFlowState("failed")
            setErrorMessage("La transaction a été annulée ou a échoué.")
            clearInterval(pollInterval)
          }
        }
      } catch (err) {
        console.error("Error polling transaction status:", err)
      }
    }, 3000)

    return () => clearInterval(pollInterval)
  }, [flowState, currentTxId])

  // Filter candidates by selection
  const filteredCandidates = showAllCandidates
    ? candidates
    : candidates.filter((c) => c.category === activeCategory)

  // Rankings
  const roiRankings = [...candidates]
    .filter((c) => c.category === "Roi")
    .sort((a, b) => b.votes - a.votes)

  const reineRankings = [...candidates]
    .filter((c) => c.category === "Reine")
    .sort((a, b) => b.votes - a.votes)

  // Progress bar helper — relative to the category leader
  const maxVotesByCategory = {
    Roi: Math.max(1, ...candidates.filter((c) => c.category === "Roi").map((c) => c.votes)),
    Reine: Math.max(1, ...candidates.filter((c) => c.category === "Reine").map((c) => c.votes)),
  }

  // Initialize vote collection
  const handleVoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCandidate) return

    // Simple phone validation (basic format)
    const cleanedPhone = phoneNumber.trim().replace(/\s+/g, "")
    if (!cleanedPhone || cleanedPhone.length < 9) {
      setErrorMessage("Veuillez saisir un numéro de téléphone valide.")
      setFlowState("failed")
      return
    }

    setFlowState("initiating")
    setErrorMessage("")

    try {
      const res = await fetch("/api/vote/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: selectedCandidate.id,
          votes: voteCount,
          phoneNumber: cleanedPhone,
          operator,
        }),
      })

      const data = await safeJson(res)
      if (data.success) {
        setCurrentTxId(data.transactionId)
        setFlowState("pending_ussd")
      } else {
        setFlowState("failed")
        setErrorMessage(data.error || "Impossible d'initier le paiement.")
      }
    } catch (err) {
      console.error("Voting error:", err)
      setFlowState("failed")
      setErrorMessage("Une erreur réseau est survenue. Veuillez réessayer.")
    }
  }

  // Pre-fill sliders for Coverflow
  const carouselSlides: CoverflowSlide[] = candidates.map((c) => ({
    src: c.imageUrl,
    alt: `Candidat ${c.name}`,
    title: c.name,
    subtitle: `${c.category} du Bal Masqué · ${c.class}`,
    accentColor: c.category === "Roi" ? "#e8c26a" : "#d04a58",
    accentText: c.category === "Roi" ? "#101014" : "#ffffff",
    meta: [
      { label: "Votes cumulés", value: `${c.votes} voix` },
      { label: "Bal Masqué", value: "2026" },
    ],
  }))

  return (
    <main ref={rootRef} className="min-h-screen bg-[#101014] text-white overflow-x-hidden">
      {/* ══════════════════════════════════════════════════════════════
          CINEMATIC HERO
         ══════════════════════════════════════════════════════════════ */}
      <div id="top" ref={heroRef} className="cinematic-hero">
        {/* Themed gradient base — always renders, even before/without the video */}
        <div
          className="hero-bg absolute inset-0"
          style={{
            zIndex: 0,
            background:
              "radial-gradient(ellipse 90% 70% at 15% 0%, rgba(232,194,106,0.16) 0%, transparent 60%), " +
              "radial-gradient(ellipse 70% 50% at 85% 105%, rgba(164,32,46,0.28) 0%, transparent 55%), " +
              "radial-gradient(ellipse 55% 45% at 70% 0%, rgba(92,45,134,0.22) 0%, transparent 55%), " +
              "#0c0c12",
          }}
          aria-hidden="true"
        />

        <video
          className="absolute inset-0 w-full h-full object-cover"
          style={{ zIndex: 1 }}
          src={VIDEO_SRC}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        />

        <div className="bottom-blur-overlay absolute inset-0 pointer-events-none" style={{ zIndex: 2 }} aria-hidden="true" />

        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 3,
            background:
              "radial-gradient(ellipse 80% 50% at 20% 110%, rgba(164,32,46,0.18) 0%, transparent 60%), " +
              "radial-gradient(ellipse 60% 40% at 80% 110%, rgba(92,45,134,0.16) 0%, transparent 55%), " +
              "radial-gradient(ellipse 45% 35% at 50% 20%, rgba(232,194,106,0.10) 0%, transparent 60%)",
          }}
          aria-hidden="true"
        />



        {/* HERO CONTENT */}
        <div className="hero-content relative flex-1 flex flex-col justify-end px-4 sm:px-6 md:px-12 pb-8 md:pb-16" style={{ zIndex: 10 }}>
          <div className="flex flex-col md:flex-row md:items-end gap-8">
            <div className="flex-1 min-w-0">
              <div className="animate-blur-fade-up flex flex-wrap items-center gap-3 sm:gap-6 mb-6 md:mb-8 text-xs sm:text-sm" style={d(300)}>
                <span className="flex items-center gap-1.5">
                  <Star size={16} strokeWidth={1.5} className="sm:w-5 sm:h-5 flex-none" style={{ fill: "#e8c26a", color: "#e8c26a" }} aria-hidden="true" />
                  <span className="font-semibold" style={{ color: "#e8c26a" }}>
                    Bal Masqué 2026
                  </span>
                </span>
                <span className="flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.55)" }}>
                  <Clock size={16} strokeWidth={1.5} className="sm:w-5 sm:h-5 flex-none" aria-hidden="true" />
                  Soirée de gala
                </span>
                <span className="flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.55)" }}>
                  <Calendar size={16} strokeWidth={1.5} className="sm:w-5 sm:h-5 flex-none" aria-hidden="true" />
                  9 août 2026
                </span>
              </div>

              <h1
                className="animate-blur-fade-up text-white mb-4 md:mb-6"
                style={{
                  ...d(400),
                  fontSize: "clamp(2.1rem, 6.5vw, 5.25rem)",
                  fontFamily: "var(--font-orbitron), sans-serif",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.04,
                  textTransform: "uppercase",
                }}
              >
                Élis ton <em style={{ color: "#e8c26a", fontStyle: "normal" }}>Roi &amp; ta Reine</em> du Bal Masqué.
              </h1>

              <p className="animate-blur-fade-up text-base sm:text-lg md:text-xl mb-6 md:mb-12 max-w-2xl leading-relaxed" style={{ ...d(500), color: "rgba(255,255,255,0.52)" }}>
                Le grand Bal Masqué 2026 approche. Vote pour tes candidats préférés — 100 FCFA par vote via Mobile Money. Chaque paiement validé est comptabilisé instantanément.
              </p>

              <div className="flex flex-wrap gap-3 sm:gap-4">
                <a
                  href="#vote"
                  className="animate-blur-fade-up cta-primary relative flex items-center gap-2.5 rounded-full bg-white text-black font-semibold px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base cursor-pointer transition-colors duration-250 overflow-hidden"
                  style={d(600)}
                >
                  <Crown size={17} strokeWidth={2} />
                  Voter maintenant
                </a>

                <a
                  href="#classement"
                  className="animate-blur-fade-up liquid-glass flex items-center gap-2 rounded-full font-semibold px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base text-white cursor-pointer hover:opacity-75 transition-opacity duration-200"
                  style={d(700)}
                >
                  <Trophy size={17} strokeWidth={1.5} />
                  Voir le classement
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          VOTE SECTION — Interactive Gallery Grid
         ══════════════════════════════════════════════════════════════ */}
      <section id="vote" className="section relative">
        <div className="section-intro" data-reveal>
          <p className="eyebrow">Exprime ton choix</p>
          <h2>
            Galerie des
            <br />
            <em>candidats.</em>
          </h2>
        </div>

        {/* Category Tabs */}
        <div className="mt-8 flex justify-center gap-4" data-reveal>
          <button
            onClick={() => {
              setActiveCategory("Roi")
              setShowAllCandidates(false)
            }}
            className={`px-8 py-3 rounded-full font-semibold text-sm sm:text-base tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2 ${
              !showAllCandidates && activeCategory === "Roi"
                ? "bg-[#e8c26a] text-black shadow-lg shadow-[#e8c26a]/20 scale-105"
                : "bg-white/5 text-white hover:bg-white/10"
            }`}
          >
            <Crown className="size-5" />
            Candidats Roi
          </button>
          <button
            onClick={() => {
              setActiveCategory("Reine")
              setShowAllCandidates(false)
            }}
            className={`px-8 py-3 rounded-full font-semibold text-sm sm:text-base tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2 ${
              !showAllCandidates && activeCategory === "Reine"
                ? "bg-[#d04a58] text-white shadow-lg shadow-[#d04a58]/20 scale-105"
                : "bg-white/5 text-white hover:bg-white/10"
            }`}
          >
            <Gem className="size-5" />
            Candidates Reine
          </button>
        </div>

        {/* Candidates Grid */}
        {loadingCandidates ? (
          <div className="mt-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-[#e8c26a] size-10" />
            <p className="text-muted">Chargement des profils...</p>
          </div>
        ) : (
          <div>
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8" data-reveal>
              {filteredCandidates.map((candidate) => (
                <CornerFrame key={candidate.id} className="category-card relative overflow-hidden flex flex-col justify-between group">
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-neutral-900 border border-white/5">
                    <img
                      src={candidate.imageUrl}
                      alt={candidate.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                    <span className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-semibold border border-white/10 flex items-center gap-1.5">
                      {candidate.category === "Roi" ? (
                        <Crown className="size-3.5 text-[#e8c26a]" />
                      ) : (
                        <Gem className="size-3.5 text-[#d04a58]" />
                      )}
                      {candidate.class}
                    </span>
                  </div>

                  <div className="mt-4 flex justify-between items-end">
                    <div>
                      <h3 className="text-xl font-bold tracking-tight text-white m-0 uppercase font-orbitron">{candidate.name}</h3>
                      <p className="text-xs text-neutral-400 mt-1">Bal Masqué · Édition 2026</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-neutral-400 block uppercase">Votes</span>
                      <span className="text-lg font-bold font-orbitron text-[#e8c26a]">
                        <CountUp to={candidate.votes} duration={900} /> voix
                      </span>
                    </div>
                  </div>

                  {/* ── Vote progress bar relative to category leader ── */}
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest">Popularité</span>
                      <span
                        className="text-[10px] font-bold font-orbitron"
                        style={{ color: candidate.category === "Roi" ? "#e8c26a" : "#d04a58" }}
                      >
                        {maxVotesByCategory[candidate.category] > 1
                          ? `${Math.round((candidate.votes / maxVotesByCategory[candidate.category]) * 100)}%`
                          : "0%"}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: `${Math.max(4, (candidate.votes / maxVotesByCategory[candidate.category]) * 100)}%`,
                          background:
                            candidate.category === "Roi"
                              ? "linear-gradient(90deg, #e8c26a, #c9a84c)"
                              : "linear-gradient(90deg, #d04a58, #a8323f)",
                          boxShadow:
                            candidate.category === "Roi"
                              ? "0 0 8px rgba(232,194,106,0.6)"
                              : "0 0 8px rgba(208,74,88,0.6)",
                        }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedCandidate(candidate)
                      setVoteCount(5)
                      setFlowState("idle")
                      setErrorMessage("")
                    }}
                    className={`w-full mt-6 py-3 rounded-full font-semibold text-sm text-center uppercase tracking-wider transition-all duration-300 ${
                      candidate.category === "Roi"
                        ? "bg-white text-black hover:bg-[#e8c26a]"
                        : "bg-[#d04a58] text-white hover:opacity-90"
                    }`}
                  >
                    Soutenir {candidate.name}
                  </button>
                </CornerFrame>
              ))}
            </div>

            {/* "Voir tous les candidats" Link Button */}
            <div className="mt-12 flex justify-center">
              <Link
                href="/candidats"
                className="px-8 py-3.5 rounded-full border border-white/10 hover:border-[#e8c26a] text-white hover:text-[#e8c26a] font-semibold text-xs tracking-wider uppercase transition-all duration-350 cursor-pointer"
              >
                Voir tous les candidats
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════
          CANDIDATES CAROUSEL (Coverflow Carousel)
         ══════════════════════════════════════════════════════════════ */}
      {candidates.length > 0 && (
        <section id="candidats" className="section awards-carousel">
          <div className="section-intro" data-reveal>
            <p className="eyebrow">À la une</p>
            <h2>
              Roi &amp; Reine
              <br />
              <em>du Bal Masqué.</em>
            </h2>
          </div>
          <div className="mt-14" data-reveal>
            <CoverflowCarousel
              slides={carouselSlides}
              showCaption
              showNavigation
              showPagination
              loop
              autoPlay={3500}
              label="Candidats au trône du Bal Masqué"
              onVote={(index) => {
                const candidate = candidates[index]
                if (candidate) {
                  setSelectedCandidate(candidate)
                  setVoteCount(5)
                  setFlowState("idle")
                  setErrorMessage("")
                }
              }}
            />
          </div>
          {/* See all candidates link */}
          <div className="mt-10 flex justify-center pb-6">
            <Link
              href="/candidats"
              className="px-8 py-3.5 rounded-full border border-white/10 hover:border-[#e8c26a] text-white hover:text-[#e8c26a] font-semibold text-xs tracking-wider uppercase transition-all duration-350 cursor-pointer"
            >
              Voir tous les candidats
            </Link>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════
          CLASSEMENT LIVE
         ══════════════════════════════════════════════════════════════ */}
      <section id="classement" className="section relative">
        <div className="section-intro" data-reveal>
          <p className="eyebrow">Suivi en direct</p>
          <h2>
            Classement
            <br />
            <em>en temps réel.</em>
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Roi list */}
          <CornerFrame data-reveal className="category-card p-6 sm:p-8">
            <div className="flex items-center gap-2.5 mb-6">
              <Crown className="text-[#e8c26a] size-6" />
              <h3 className="text-xl font-orbitron font-bold text-[#e8c26a] m-0">Roi du Bal Masqué</h3>
            </div>
            <div className="space-y-4">
              {loadingCandidates ? (
                <div className="flex py-6 justify-center"><Loader2 className="animate-spin text-[#e8c26a] size-6" /></div>
              ) : (
                roiRankings.map((c, i) => (
                  <div key={c.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="font-orbitron font-bold text-neutral-500 w-6 flex items-center justify-center">
                        {i === 0 ? (
                          <Trophy className="text-[#e8c26a] size-4.5" />
                        ) : (
                          `#${i + 1}`
                        )}
                      </span>
                      <img src={c.imageUrl} alt={c.name} className="w-10 h-10 object-cover rounded-full border border-white/10" />
                      <div>
                        <span className="font-bold text-white block text-sm sm:text-base">{c.name}</span>
                        <span className="text-xs text-neutral-400">{c.class}</span>
                      </div>
                    </div>
                    <span className="font-orbitron text-lg font-bold text-[#e8c26a]"><CountUp to={c.votes} duration={800} /> voix</span>
                  </div>
                ))
              )}
            </div>
          </CornerFrame>

          {/* Reine list */}
          <CornerFrame data-reveal className="category-card p-6 sm:p-8">
            <div className="flex items-center gap-2.5 mb-6">
              <Gem className="text-[#d04a58] size-6" />
              <h3 className="text-xl font-orbitron font-bold text-[#d04a58] m-0">Reine du Bal Masqué</h3>
            </div>
            <div className="space-y-4">
              {loadingCandidates ? (
                <div className="flex py-6 justify-center"><Loader2 className="animate-spin text-[#d04a58] size-6" /></div>
              ) : (
                reineRankings.map((c, i) => (
                  <div key={c.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="font-orbitron font-bold text-neutral-500 w-6 flex items-center justify-center">
                        {i === 0 ? (
                          <Trophy className="text-[#d04a58] size-4.5" />
                        ) : (
                          `#${i + 1}`
                        )}
                      </span>
                      <img src={c.imageUrl} alt={c.name} className="w-10 h-10 object-cover rounded-full border border-white/10" />
                      <div>
                        <span className="font-bold text-white block text-sm sm:text-base">{c.name}</span>
                        <span className="text-xs text-neutral-400">{c.class}</span>
                      </div>
                    </div>
                    <span className="font-orbitron text-lg font-bold text-[#d04a58]"><CountUp to={c.votes} duration={800} /> voix</span>
                  </div>
                ))
              )}
            </div>
          </CornerFrame>
        </div>

        {/* Voir tout le classement button */}
        <div className="mt-10 flex justify-center">
          <Link
            href="/classement"
            className="px-8 py-3.5 rounded-full border border-white/10 hover:border-[#e8c26a] text-white hover:text-[#e8c26a] font-semibold text-xs tracking-wider uppercase transition-all duration-350 cursor-pointer flex items-center gap-2"
          >
            <Trophy className="size-4" />
            Voir tout le classement
          </Link>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          HOW IT WORKS
         ══════════════════════════════════════════════════════════════ */}
      <section id="comment" className="section experience">
        <p className="eyebrow" data-reveal>Règles et Fonctionnement</p>
        <div className="experience-grid" data-reveal>
          <h2>
            Paiement mobile
            <br />
            <em>100% sécurisé.</em>
          </h2>
          <p>
            Chaque vote coûte 100 FCFA. Tu peux voter autant de fois que tu le souhaites pour le même candidat ou pour différents candidats. Les votes ne sont enregistrés qu&apos;une fois le paiement validé.
          </p>
        </div>
        <div className="steps">
          {HOW_IT_WORKS.map(([number, title, text]) => (
            <article key={number} data-reveal>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          VOTING MODAL / DIALOG (Pixel-Perfect UI/UX PRO MAX)
         ══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
      {selectedCandidate && (
        <motion.div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Backdrop Blur */}
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (flowState !== "initiating" && flowState !== "pending_ussd") {
                setSelectedCandidate(null)
              }
            }}
          />

          {/* Modal Card */}
          <motion.div
            className="relative w-full max-w-lg bg-[#14141c] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-10 transition-all duration-300 transform scale-100 flex flex-col"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: "spring", damping: 24, stiffness: 300, delay: 0.05 }}
          >
            {/* Header banner color */}
            <div className={`h-2 w-full ${selectedCandidate.category === "Roi" ? "bg-[#e8c26a]" : "bg-[#d04a58]"}`} />

            {/* Close Button */}
            {flowState !== "initiating" && flowState !== "pending_ussd" && (
              <button
                onClick={() => setSelectedCandidate(null)}
                className="absolute top-4 right-4 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-all"
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
            )}

            {/* Modal Content container */}
            <div className="p-6 md:p-8 overflow-y-auto max-h-[85vh]">
              {/* IDLE / INPUT STATE */}
              {flowState === "idle" && (
                <form onSubmit={handleVoteSubmit}>
                  {/* Candidate summary */}
                  <div className="flex gap-4 items-center">
                    <img
                      src={selectedCandidate.imageUrl}
                      alt={selectedCandidate.name}
                      className="w-16 h-16 object-cover rounded-xl border border-white/10 shadow-lg"
                    />
                    <div>
                      <span className="text-xs text-neutral-400 uppercase tracking-widest block">Voter pour</span>
                      <h4 className="text-xl font-bold font-orbitron tracking-tight text-white uppercase m-0">{selectedCandidate.name}</h4>
                      <span className="text-xs text-neutral-400">
                        {selectedCandidate.category === "Roi" ? "Roi" : "Reine"} du Bal Masqué · {selectedCandidate.class}
                      </span>
                    </div>
                  </div>

                  {/* Quantity selector */}
                  <div className="mt-8">
                    <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-3">
                      Nombre de votes
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setVoteCount(Math.max(1, voteCount - 1))}
                        className="w-12 h-12 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl flex items-center justify-center font-bold text-lg select-none transition-all"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        required
                        value={voteCount}
                        onChange={(e) => setVoteCount(Math.max(1, parseInt(e.target.value) || 1))}
                        className="flex-1 h-12 bg-black/40 border border-white/10 rounded-xl text-center font-bold font-orbitron text-xl text-white outline-none focus:border-white/30"
                      />
                      <button
                        type="button"
                        onClick={() => setVoteCount(voteCount + 1)}
                        className="w-12 h-12 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl flex items-center justify-center font-bold text-lg select-none transition-all"
                      >
                        +
                      </button>
                    </div>

                    {/* Presets */}
                    <div className="mt-3 flex flex-wrap gap-2 justify-between">
                      {[1, 5, 10, 20, 50, 100].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setVoteCount(preset)}
                          className={`flex-1 min-w-[50px] py-2 rounded-lg text-xs font-bold font-orbitron transition-all ${
                            voteCount === preset
                              ? selectedCandidate.category === "Roi"
                                ? "bg-[#e8c26a] text-black"
                                : "bg-[#d04a58] text-white"
                              : "bg-white/5 hover:bg-white/10 text-neutral-300"
                          }`}
                        >
                          +{preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mobile Money settings */}
                  <div className="mt-6">
                    <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-3">
                      Opérateur Mobile Money
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      {/* MTN Option */}
                      <label
                        className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer select-none transition-all ${
                          operator === "MTN"
                            ? "bg-[#e8c26a]/10 border-[#e8c26a] text-white"
                            : "bg-white/5 border-white/5 text-neutral-400 hover:bg-white/10"
                        }`}
                      >
                        <span className="font-bold text-sm tracking-wide">MTN MoMo</span>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            operator === "MTN" ? "border-[#e8c26a]" : "border-neutral-600"
                          }`}
                        >
                          {operator === "MTN" && <div className="w-2.5 h-2.5 rounded-full bg-[#e8c26a]" />}
                        </div>
                        <input type="radio" name="operator" checked={operator === "MTN"} onChange={() => setOperator("MTN")} className="hidden" />
                      </label>

                      {/* ORANGE Option */}
                      <label
                        className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer select-none transition-all ${
                          operator === "ORANGE"
                            ? "bg-[#d04a58]/10 border-[#d04a58] text-white"
                            : "bg-white/5 border-white/5 text-neutral-400 hover:bg-white/10"
                        }`}
                      >
                        <span className="font-bold text-sm tracking-wide">Orange Money</span>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            operator === "ORANGE" ? "border-[#d04a58]" : "border-neutral-600"
                          }`}
                        >
                          {operator === "ORANGE" && <div className="w-2.5 h-2.5 rounded-full bg-[#d04a58]" />}
                        </div>
                        <input type="radio" name="operator" checked={operator === "ORANGE"} onChange={() => setOperator("ORANGE")} className="hidden" />
                      </label>
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-3">
                      Numéro de téléphone
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-3.5 text-neutral-500 size-5" />
                      <input
                        type="tel"
                        required
                        placeholder="Ex: 699001122 ou 677889900"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full h-12 pl-12 pr-4 bg-black/40 border border-white/10 rounded-xl font-medium text-white outline-none focus:border-white/30"
                      />
                    </div>
                    <span className="text-[10px] text-neutral-500 block mt-2">
                      Saisissez votre numéro camerounais sans l&apos;indicateur pays (+237).
                    </span>
                  </div>

                  {/* Summary amount */}
                  <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center">
                    <span className="text-sm text-neutral-400">Total à payer :</span>
                    <span className="text-2xl font-bold font-orbitron text-white">
                      {voteCount * 100} FCFA
                    </span>
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    className={`w-full mt-6 py-4 rounded-xl font-bold uppercase tracking-wider transition-all duration-300 ${
                      selectedCandidate.category === "Roi"
                        ? "bg-[#e8c26a] text-black hover:opacity-90"
                        : "bg-[#d04a58] text-white hover:opacity-90"
                    }`}
                  >
                    Valider le vote
                  </button>
                </form>
              )}

              {/* INITIATING STATE */}
              {flowState === "initiating" && (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <Loader2 className="animate-spin text-[#e8c26a] size-12 mb-4" />
                  <h4 className="text-xl font-bold font-orbitron uppercase text-white mb-2">Initiation du paiement</h4>
                  <p className="text-neutral-400 max-w-sm text-sm">
                    Nous établissons la connexion avec l&apos;opérateur de paiement Mobile Money. Merci de patienter...
                  </p>
                </div>
              )}

              {/* PENDING USSD STATE */}
              {flowState === "pending_ussd" && (
                <div className="py-8 flex flex-col items-center justify-center text-center">
                  <Smartphone className="animate-bounce text-[#e8c26a] size-16 mb-4" />
                  <h4 className="text-xl font-bold font-orbitron uppercase text-white mb-2">Confirmation requise</h4>
                  <p className="text-[#e8c26a] font-bold text-lg mb-4 font-orbitron animate-pulse">
                    Vérifiez votre téléphone&nbsp;!
                  </p>
                  <p className="text-neutral-300 max-w-sm text-sm leading-relaxed mb-6">
                    Une invite de paiement (USSD Push) a été envoyée au <strong>{phoneNumber}</strong>.
                    Saisissez votre code PIN secret sur votre téléphone pour valider le paiement de {voteCount * 100} FCFA.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-neutral-500 bg-white/5 px-4 py-2 rounded-full border border-white/5">
                    <Loader2 className="animate-spin size-4" />
                    <span>En attente de la validation bancaire...</span>
                  </div>
                </div>
              )}

              {/* SUCCESS STATE */}
              {flowState === "success" && (
                <div className="py-8 flex flex-col items-center justify-center text-center">
                  <CheckCircle className="text-green-500 size-16 mb-4" />
                  <h4 className="text-2xl font-bold font-orbitron uppercase text-white mb-2">Vote enregistré&nbsp;!</h4>
                  <p className="text-neutral-300 max-w-sm text-sm leading-relaxed mb-6">
                    Félicitations&nbsp;! Le paiement a été validé avec succès.
                    <strong> {voteCount} votes</strong> ont été attribués à <strong>{selectedCandidate.name}</strong>.
                  </p>
                  <button
                    onClick={() => setSelectedCandidate(null)}
                    className="px-8 py-3 bg-white text-black hover:bg-neutral-200 rounded-full font-bold uppercase text-xs tracking-wider transition-all"
                  >
                    Fermer la fenêtre
                  </button>
                </div>
              )}

              {/* FAILED STATE */}
              {flowState === "failed" && (
                <div className="py-8 flex flex-col items-center justify-center text-center">
                  <XCircle className="text-red-500 size-16 mb-4" />
                  <h4 className="text-xl font-bold font-orbitron uppercase text-white mb-2">Le paiement a échoué</h4>
                  <p className="text-red-400 font-medium text-sm mb-6 max-w-sm">
                    {errorMessage || "Une erreur est survenue lors de la validation."}
                  </p>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setFlowState("idle")}
                      className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold uppercase text-xs tracking-wider transition-all"
                    >
                      Réessayer
                    </button>
                    <button
                      onClick={() => setSelectedCandidate(null)}
                      className="px-6 py-3 bg-white text-black hover:bg-neutral-200 rounded-full font-bold uppercase text-xs tracking-wider transition-all"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </main>
  )
}
