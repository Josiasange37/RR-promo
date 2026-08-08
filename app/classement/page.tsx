"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Crown, Gem, Trophy, Medal, ArrowLeft, Loader2, RefreshCw } from "lucide-react"
import Link from "next/link"
import { CountUp } from "@/components/ui/count-up"
import { motion, AnimatePresence } from "motion/react"
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap"
import { useScrollReveal } from "@/lib/use-scroll-reveal"

export interface Candidate {
  id: string
  name: string
  class: string
  category: "Roi" | "Reine"
  votes: number
  imageUrl: string
}

const MEDALS = [
  { icon: Trophy, color: "#FFD700", bg: "rgba(255,215,0,0.12)", label: "Or" },
  { icon: Medal, color: "#C0C0C0", bg: "rgba(192,192,192,0.10)", label: "Argent" },
  { icon: Medal, color: "#CD7F32", bg: "rgba(205,127,50,0.10)", label: "Bronze" },
]

function getRankSuffix(i: number) {
  if (i === 0) return "er"
  return "ème"
}

function RankingTable({
  title,
  color,
  Icon,
  candidates,
  onVote,
}: {
  title: string
  color: string
  Icon: React.ElementType
  candidates: Candidate[]
  onVote: (c: Candidate) => void
}) {
  const total = candidates.reduce((a, c) => a + c.votes, 0)
  const tableRef = useRef<HTMLDivElement>(null)

  // Animate each candidate's share-of-votes bar up to its percentage with GSAP.
  useEffect(() => {
    const root = tableRef.current
    if (!root || prefersReducedMotion()) return

    const bars = Array.from(root.querySelectorAll<HTMLElement>("[data-bar-pct]"))
    if (bars.length === 0) return

    const ctx = gsap.context(() => {
      gsap.set(bars, { width: "0%" })
      gsap.to(bars, {
        width: (i) => `${Math.min(100, Number(bars[i].dataset.barPct ?? 0))}%`,
        duration: 1.1,
        ease: "power3.out",
        stagger: 0.07,
        scrollTrigger: { trigger: root, start: "top 85%", once: true },
      })
    }, root)

    return () => ctx.revert()
  }, [candidates, total])

  return (
    <div ref={tableRef} className="flex flex-col" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1.25rem", overflow: "hidden" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/6" data-reveal style={{ background: `linear-gradient(135deg, ${color}12, transparent)` }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
          <Icon className="size-5" style={{ color }} />
        </div>
        <div>
          <h2 className="text-lg font-bold font-orbitron uppercase m-0" style={{ color }}>{title}</h2>
          <p className="text-xs text-white/40 mt-0.5">{total} votes au total · {candidates.length} candidat{candidates.length > 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-white/4">
        {candidates.length === 0 ? (
          <div className="py-12 text-center text-white/30 text-sm">Aucun candidat</div>
        ) : (
          candidates.map((c, i) => {
            const medalConfig = MEDALS[i] ?? null
            const pct = total > 0 ? Math.round((c.votes / total) * 100) : 0
            return (
              <div
                key={c.id}
                data-reveal
                className="group flex items-center gap-4 px-5 py-4 transition-colors duration-200 hover:bg-white/3"
              >
                {/* Rank */}
                <div className="w-10 flex-none text-center">
                  {medalConfig ? (
                    <div className="w-8 h-8 mx-auto rounded-full flex items-center justify-center" style={{ background: medalConfig.bg, border: `1px solid ${medalConfig.color}40` }}>
                      <medalConfig.icon className="size-4" style={{ color: medalConfig.color }} />
                    </div>
                  ) : (
                    <span className="text-sm font-bold font-orbitron text-white/30">{i + 1}{getRankSuffix(i)}</span>
                  )}
                </div>

                {/* Photo */}
                <img src={c.imageUrl} alt={c.name} className="w-11 h-11 rounded-full object-cover border border-white/10 flex-none" loading="lazy" />

                {/* Info + progress */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-sm text-white truncate uppercase font-orbitron tracking-wide">{c.name}</span>
                    <span className="text-xs font-bold flex-none font-orbitron" style={{ color }}><CountUp to={c.votes} duration={800} /> voix</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-white/6 overflow-hidden">
                      <div
                        data-bar-pct={pct}
                        className="h-full rounded-full"
                        style={{
                          width: "0%",
                          background: `linear-gradient(90deg, ${color}80, ${color})`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-white/30 font-mono w-8 text-right flex-none">{pct}%</span>
                  </div>
                  <p className="text-[11px] text-white/35 mt-0.5">{c.class}</p>
                </div>

                {/* Vote button (visible on hover) */}
                <button
                  onClick={() => onVote(c)}
                  className="hidden sm:flex opacity-0 group-hover:opacity-100 transition-opacity duration-200 items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider flex-none"
                  style={{
                    background: `${color}20`,
                    border: `1px solid ${color}50`,
                    color,
                  }}
                >
                  <Crown className="size-3" />
                  Voter
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default function ClassementPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)

  const rootRef = useRef<HTMLElement>(null)
  useScrollReveal(rootRef, [candidates])

  const fetchCandidates = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    try {
      const res = await fetch("/api/candidates")
      const data = await res.json()
      if (data.success) {
        setCandidates(data.candidates)
        setLastUpdated(new Date())
      }
    } catch (err) {
      console.error("Failed to load candidates:", err)
    } finally {
      setLoading(false)
      if (showRefresh) setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchCandidates()
    const interval = setInterval(() => fetchCandidates(), 8000)
    return () => clearInterval(interval)
  }, [fetchCandidates])

  const roiRankings = [...candidates].filter((c) => c.category === "Roi").sort((a, b) => b.votes - a.votes)
  const reineRankings = [...candidates].filter((c) => c.category === "Reine").sort((a, b) => b.votes - a.votes)

  const totalVotes = candidates.reduce((a, c) => a + c.votes, 0)
  const totalRevenue = totalVotes * 100

  const openVoteModal = (candidate: Candidate) => {
    setSelectedCandidate(candidate)
  }

  return (
    <main ref={rootRef} className="min-h-screen text-white overflow-x-hidden" style={{ background: "#101014" }}>
      {/* ── PAGE HERO ── */}
      <section className="relative overflow-hidden" style={{ background: "radial-gradient(ellipse 100% 50% at 50% 0%, rgba(232,194,106,0.12) 0%, transparent 70%), #101014" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 pt-14 pb-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3" data-reveal>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#e8c26a] m-0">Suivi en direct</p>
            <div className="flex items-center gap-3">
              {lastUpdated && (
                <span className="text-xs text-white/25">
                  Mis à jour {lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
              <button
                onClick={() => fetchCandidates(true)}
                disabled={refreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/60 hover:text-white hover:bg-white/8 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
                <span>Actualiser</span>
              </button>
            </div>
          </div>
          <h1
            className="text-white mb-4" data-reveal
            style={{
              fontFamily: "var(--font-orbitron), sans-serif",
              fontWeight: 800,
              fontSize: "clamp(2rem, 5vw, 3.8rem)",
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
              textTransform: "uppercase",
            }}
          >
            Classement <em style={{ color: "#e8c26a", fontStyle: "normal" }}>général.</em>
          </h1>
          <p className="text-base text-white/45 max-w-xl leading-relaxed mb-8" data-reveal>
            Suivez l&apos;évolution des votes en temps réel. Le classement est mis à jour automatiquement toutes les 8 secondes.
          </p>

          {/* Global stats */}
          <div className="flex flex-wrap gap-4 mb-2" data-reveal>
            {[
              { label: "Votes totaux", value: totalVotes, color: "#e8c26a", Icon: Trophy, suffix: null },
              { label: "Revenus générés", value: totalRevenue, color: "#a3e635", Icon: null, suffix: " FCFA" },
              { label: "Candidats Roi", value: roiRankings.length, color: "#e8c26a", Icon: Crown, suffix: null },
              { label: "Candidates Reine", value: reineRankings.length, color: "#d04a58", Icon: Gem, suffix: null },
            ].map(({ label, value, color, Icon, suffix }) => (
              <div key={label} className="flex items-center gap-2.5 bg-white/4 border border-white/7 rounded-xl px-4 py-2.5">
                {Icon && <Icon className="size-4 flex-none" style={{ color }} />}
                <div>
                  <span className="block text-base font-bold font-orbitron leading-tight" style={{ color }}>
                    <CountUp to={value} duration={900} suffix={suffix ? <>{suffix}</> : undefined} />
                  </span>
                  <span className="block text-[10px] text-white/35 uppercase tracking-widest">{label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RANKINGS ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-10 pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <Loader2 className="animate-spin text-[#e8c26a] size-10" />
            <p className="text-white/40 text-sm tracking-wider">Chargement du classement...</p>
          </div>
        ) : (
          <>
            {/* Leaders spotlight */}
            {(roiRankings[0] || reineRankings[0]) && (
              <div className="mb-12">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 mb-5" data-reveal>En tête du classement</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[roiRankings[0], reineRankings[0]].filter(Boolean).map((leader) => (
                    <motion.div
                      key={leader.id}
                      data-reveal
                      className="relative overflow-hidden rounded-2xl flex items-center gap-5 p-5"
                      style={{
                        background: `linear-gradient(135deg, ${leader.category === "Roi" ? "rgba(232,194,106,0.12)" : "rgba(208,74,88,0.12)"}, rgba(255,255,255,0.02))`,
                        border: `1px solid ${leader.category === "Roi" ? "rgba(232,194,106,0.25)" : "rgba(208,74,88,0.25)"}`,
                      }}
                      whileHover={{ y: -4 }}
                      transition={{ type: "spring", stiffness: 260, damping: 22 }}
                    >
                      {/* Glow */}
                      <motion.div
                        className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none"
                        style={{ background: leader.category === "Roi" ? "#e8c26a" : "#d04a58", transform: "translate(30%, -30%)" }}
                        animate={{ opacity: [0.2, 0.38, 0.2], scale: [1, 1.15, 1] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      />
                      <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-white/15 flex-none">
                        <img src={leader.imageUrl} alt={leader.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {leader.category === "Roi" ? <Crown className="size-4 text-[#e8c26a]" /> : <Gem className="size-4 text-[#d04a58]" />}
                          <span className="text-xs text-white/40 font-medium uppercase tracking-widest">Leader {leader.category}</span>
                        </div>
                        <h3 className="text-xl font-bold font-orbitron uppercase tracking-tight text-white m-0 leading-tight">{leader.name}</h3>
                        <p className="text-xs text-white/40 mt-1">{leader.class} · Balle Maskee 2026</p>
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-2xl font-black font-orbitron" style={{ color: leader.category === "Roi" ? "#e8c26a" : "#d04a58" }}><CountUp to={leader.votes} duration={1000} /></span>
                          <span className="text-xs text-white/35 font-medium">voix</span>
                        </div>
                      </div>
                      <motion.button
                        onClick={() => openVoteModal(leader)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.97 }}
                        className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider flex-none transition-all duration-300"
                        style={{
                          background: leader.category === "Roi" ? "#e8c26a" : "#d04a58",
                          color: leader.category === "Roi" ? "#101014" : "#ffffff",
                        }}
                      >
                        <Crown className="size-3.5" />
                        Voter
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Full ranking tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <RankingTable title="Roi de la Balle" color="#e8c26a" Icon={Crown} candidates={roiRankings} onVote={openVoteModal} />
              <RankingTable title="Reine de la Balle" color="#d04a58" Icon={Gem} candidates={reineRankings} onVote={openVoteModal} />
            </div>

            {/* Call to vote */}
            <div className="mt-16 text-center">
              <div data-reveal className="inline-flex flex-col items-center gap-4 p-8 rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
                  <Trophy className="size-10 text-[#e8c26a]" />
                </motion.div>
                <h3 className="text-xl font-bold font-orbitron uppercase text-white m-0">Influencer le résultat</h3>
                <p className="text-sm text-white/50 max-w-md leading-relaxed">Chaque vote compte ! Soutenez votre candidat favori en votant maintenant — 100 FCFA par vote via Mobile Money.</p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <Link href="/candidats" className="px-6 py-3 rounded-full font-bold text-sm bg-[#e8c26a] text-black hover:opacity-90 transition-opacity uppercase tracking-wider">
                    Voter maintenant
                  </Link>
                  <Link href="/comment-ca-marche" className="px-6 py-3 rounded-full font-bold text-sm bg-white/8 text-white hover:bg-white/12 transition-colors uppercase tracking-wider border border-white/10">
                    Comment ça marche ?
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Minimal redirect modal for voting */}
      <AnimatePresence>
      {selectedCandidate && (
        <motion.div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div className="absolute inset-0 bg-black/80 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedCandidate(null)} />
          <motion.div
            className="relative w-full max-w-sm bg-[#14141c] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-10 p-8 flex flex-col items-center text-center gap-4"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.97 }}
            transition={{ type: "spring", damping: 24, stiffness: 320, delay: 0.05 }}
          >
            <motion.img
              src={selectedCandidate.imageUrl}
              alt={selectedCandidate.name}
              className="w-20 h-20 object-cover rounded-full border-2 mx-auto"
              style={{ borderColor: selectedCandidate.category === "Roi" ? "#e8c26a" : "#d04a58" }}
              initial={{ scale: 0.6, y: 14 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
            />
            <div>
              <h4 className="text-xl font-bold font-orbitron uppercase text-white m-0">{selectedCandidate.name}</h4>
              <p className="text-xs text-white/40 mt-1">{selectedCandidate.category} de la Balle Maskee · {selectedCandidate.class}</p>
            </div>
            <p className="text-sm text-white/50 leading-relaxed">Pour voter, accédez à la page des candidats où vous pourrez choisir votre nombre de votes et votre opérateur Mobile Money.</p>
            <div className="flex gap-3 w-full">
              <motion.button whileTap={{ scale: 0.96 }} onClick={() => setSelectedCandidate(null)} className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 text-sm font-bold hover:bg-white/5 transition-colors">Annuler</motion.button>
              <motion.a whileTap={{ scale: 0.96 }} href={`/candidats`} onClick={() => setSelectedCandidate(null)} className="flex-1 py-3 rounded-xl font-bold text-sm text-center uppercase tracking-wider" style={{ background: selectedCandidate.category === "Roi" ? "#e8c26a" : "#d04a58", color: selectedCandidate.category === "Roi" ? "#101014" : "#ffffff" }}>
                Voter
              </motion.a>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </main>
  )
}
