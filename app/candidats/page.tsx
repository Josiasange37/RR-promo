"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Crown,
  Gem,
  Trophy,
  Loader2,
  X,
  Phone,
  Smartphone,
  CheckCircle,
  XCircle,
  Search,
} from "lucide-react"
import Link from "next/link"
import { CornerFrame } from "@/components/ui/motifs"
import { CountUp } from "@/components/ui/count-up"
import { motion, AnimatePresence } from "motion/react"
import { useScrollReveal } from "@/lib/use-scroll-reveal"
import { safeJson } from "@/lib/safe-json"

export interface Candidate {
  id: string
  name: string
  class: string
  category: "Roi" | "Reine"
  votes: number
  imageUrl: string
}

function d(ms: number): React.CSSProperties {
  return { animationDelay: `${ms}ms` }
}



export default function CandidatsPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"Tous" | "Roi" | "Reine">("Tous")
  const [search, setSearch] = useState("")

  // Voting modal state
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [voteCount, setVoteCount] = useState(5)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [operator, setOperator] = useState<"MTN" | "ORANGE">("MTN")
  const [flowState, setFlowState] = useState<"idle" | "initiating" | "pending_ussd" | "success" | "failed">("idle")
  const [currentTxId, setCurrentTxId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState("")

  const rootRef = useRef<HTMLElement>(null)
  useScrollReveal(rootRef, [candidates, filter, search])

  const fetchCandidates = useCallback(async () => {
    try {
      const res = await fetch("/api/candidates")
      const data = await safeJson(res)
      if (data.success) setCandidates(data.candidates)
    } catch (err) {
      console.error("Failed to load candidates:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCandidates()
    const interval = setInterval(fetchCandidates, 10000)
    return () => clearInterval(interval)
  }, [fetchCandidates])

  // Poll transaction status
  useEffect(() => {
    if (flowState !== "pending_ussd" || !currentTxId) return
    let count = 0
    const id = setInterval(async () => {
      count++
      if (count > 30) {
        setFlowState("failed")
        setErrorMessage("Le paiement a expiré.")
        clearInterval(id)
        return
      }
      try {
        const res = await fetch(`/api/vote/status?id=${currentTxId}`)
        const data = await safeJson(res)
        if (data.success) {
          if (data.status === "SUCCESS") { setFlowState("success"); fetchCandidates(); clearInterval(id) }
          else if (data.status === "FAILED") { setFlowState("failed"); setErrorMessage("Transaction annulée ou échouée."); clearInterval(id) }
        }
      } catch { /* silent */ }
    }, 3000)
    return () => clearInterval(id)
  }, [flowState, currentTxId, fetchCandidates])

  const filtered = candidates.filter((c) => {
    const matchCategory = filter === "Tous" || c.category === filter
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.class.toLowerCase().includes(search.toLowerCase())
    return matchCategory && matchSearch
  })

  const handleVoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCandidate) return
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
        body: JSON.stringify({ candidateId: selectedCandidate.id, votes: voteCount, phoneNumber: cleanedPhone, operator }),
      })
      const data = await safeJson(res)
      if (data.success) { setCurrentTxId(data.transactionId); setFlowState("pending_ussd") }
      else { setFlowState("failed"); setErrorMessage(data.error || "Impossible d'initier le paiement.") }
    } catch {
      setFlowState("failed")
      setErrorMessage("Une erreur réseau est survenue.")
    }
  }

  const openVoteModal = (candidate: Candidate) => {
    setSelectedCandidate(candidate)
    setVoteCount(5)
    setFlowState("idle")
    setErrorMessage("")
    setPhoneNumber("")
  }

  return (
    <main ref={rootRef} className="min-h-screen bg-[#101014] text-white overflow-x-hidden">

      {/* ── PAGE HERO ── */}
      <section className="relative overflow-hidden" style={{ background: "radial-gradient(ellipse 100% 60% at 50% 0%, rgba(164,32,46,0.15) 0%, transparent 70%), #101014" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 pt-16 pb-12">
          <p className="eyebrow mb-4" data-reveal>Élection Roi &amp; Reine</p>
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
            Tous les <em style={{ color: "#e8c26a", fontStyle: "normal" }}>candidats.</em>
          </h1>
          <p className="text-base text-white/50 max-w-xl leading-relaxed mb-8" data-reveal>
            Découvrez l&apos;ensemble des candidats au titre de Roi et Reine du Bal Masqué 2026. Votez pour vos favoris — 100 FCFA par vote via Mobile Money.
          </p>

          {/* Stats bar */}
          <div className="flex flex-wrap gap-4" data-reveal>
            {[
              { label: "Candidats Roi", value: candidates.filter((c) => c.category === "Roi").length, color: "#e8c26a", Icon: Crown },
              { label: "Candidates Reine", value: candidates.filter((c) => c.category === "Reine").length, color: "#d04a58", Icon: Gem },
              { label: "Votes totaux", value: candidates.reduce((a, c) => a + c.votes, 0), color: "#ffffff", Icon: Trophy },
            ].map(({ label, value, color, Icon }) => (
              <div key={label} className="flex items-center gap-2.5 bg-white/5 border border-white/8 rounded-xl px-4 py-2.5">
                <Icon className="size-4 flex-none" style={{ color }} />
                <div>
                  <span className="block text-lg font-bold font-orbitron" style={{ color }}><CountUp to={value} duration={900} /></span>
                  <span className="block text-[10px] text-white/40 uppercase tracking-widest">{label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FILTERS ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-8">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between" data-reveal>
          {/* Category toggle */}
          <div className="flex gap-2 bg-white/5 p-1 rounded-full border border-white/8">
            {(["Tous", "Roi", "Reine"] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-5 py-2 rounded-full text-xs font-bold tracking-wider uppercase transition-all duration-250 flex items-center gap-1.5 ${
                  filter === cat
                    ? cat === "Roi"
                      ? "bg-[#e8c26a] text-black"
                      : cat === "Reine"
                        ? "bg-[#d04a58] text-white"
                        : "bg-white text-black"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {cat === "Roi" && <Crown className="size-3" />}
                {cat === "Reine" && <Gem className="size-3" />}
                {cat}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/30" />
            <input
              type="text"
              placeholder="Rechercher un candidat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-white/5 border border-white/10 rounded-full text-sm text-white placeholder:text-white/30 outline-none focus:border-white/25 transition-colors"
            />
          </div>
        </div>
      </section>

      {/* ── CANDIDATES GRID ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <Loader2 className="animate-spin text-[#e8c26a] size-10" />
            <p className="text-white/40 text-sm tracking-wider">Chargement des profils...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-white/30 text-lg">Aucun candidat trouvé.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" data-reveal>
            {filtered.map((candidate, i) => (
              <CornerFrame
                key={candidate.id}
                className="category-card relative overflow-hidden flex flex-col justify-between group animate-blur-fade-up"
                style={d(i * 50)}
              >
                {/* Photo */}
                <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-neutral-900 border border-white/5">
                  <img
                    src={candidate.imageUrl}
                    alt={candidate.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />
                  {/* Category badge */}
                  <span className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-semibold border border-white/10 flex items-center gap-1.5">
                    {candidate.category === "Roi" ? (
                      <Crown className="size-3.5 text-[#e8c26a]" />
                    ) : (
                      <Gem className="size-3.5 text-[#d04a58]" />
                    )}
                    {candidate.category}
                  </span>
                  {/* Rank badge */}
                  <span className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2.5 py-1.5 rounded-full text-xs font-bold border border-white/10 font-orbitron" style={{ color: candidate.category === "Roi" ? "#e8c26a" : "#d04a58" }}>
                    <CountUp to={candidate.votes} duration={800} /> voix
                  </span>
                  {/* Name overlay at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-base font-bold tracking-tight text-white m-0 uppercase font-orbitron leading-tight">{candidate.name}</h3>
                    <p className="text-xs text-white/50 mt-0.5">{candidate.class} · Bal Masqué 2026</p>
                  </div>
                </div>

                {/* Vote progress bar — relative to the category leader */}
                {(() => {
                  const categoryMax = Math.max(1, ...candidates.filter((c) => c.category === candidate.category).map((c) => c.votes))
                  const pct = Math.min(100, Math.round((candidate.votes / categoryMax) * 100))
                  const isLeader = candidate.votes > 0 && candidate.votes === categoryMax
                  return (
                    <div className="mt-4 px-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold text-white/35 uppercase tracking-widest">Popularité</span>
                        <span
                          className="text-[10px] font-bold font-orbitron flex items-center gap-1"
                          style={{ color: candidate.category === "Roi" ? "#e8c26a" : "#d04a58" }}
                        >
                          {isLeader && <Trophy className="size-3" />}
                          {candidate.votes > 0 && categoryMax > 1 ? `${pct}%` : "0%"}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${Math.max(candidate.votes > 0 ? 6 : 0, pct)}%`,
                            background: candidate.category === "Roi"
                              ? "linear-gradient(90deg, #b8922a, #e8c26a)"
                              : "linear-gradient(90deg, #a01830, #d04a58)",
                            boxShadow: candidate.category === "Roi"
                              ? "0 0 8px rgba(232,194,106,0.6)"
                              : "0 0 8px rgba(208,74,88,0.6)",
                          }}
                        />
                      </div>
                    </div>
                  )
                })()}

                {/* Vote button */}
                <button
                  onClick={() => openVoteModal(candidate)}
                  className={`w-full mt-4 py-3 rounded-full font-bold text-xs uppercase tracking-widest transition-all duration-300 ${
                    candidate.category === "Roi"
                      ? "bg-white text-black hover:bg-[#e8c26a]"
                      : "bg-[#d04a58] text-white hover:opacity-90"
                  }`}
                >
                  Soutenir {candidate.name.split(" ")[0]}
                </button>
              </CornerFrame>
            ))}
          </div>
        )}
      </section>

      {/* ── VOTING MODAL ── */}
      <AnimatePresence>
      {selectedCandidate && (
        <motion.div
          className="fixed inset-0 z-[999] overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (flowState !== "initiating" && flowState !== "pending_ussd") setSelectedCandidate(null)
            }}
          />
          <div className="relative z-10 min-h-full flex items-center justify-center p-4 sm:p-6">
          <motion.div
            className="relative w-full max-w-lg bg-[#14141c] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-10 flex flex-col"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: "spring", damping: 24, stiffness: 300, delay: 0.05 }}
          >
            <div className={`h-1.5 w-full ${selectedCandidate.category === "Roi" ? "bg-[#e8c26a]" : "bg-[#d04a58]"}`} />
            {flowState !== "initiating" && flowState !== "pending_ussd" && (
              <button onClick={() => setSelectedCandidate(null)} className="absolute top-4 right-4 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-all" aria-label="Fermer">
                <X size={18} />
              </button>
            )}
            <div className="p-5 sm:p-6 md:p-8 overflow-y-auto overflow-x-hidden max-h-[85vh]">
              {flowState === "idle" && (
                <form onSubmit={handleVoteSubmit}>
                  <div className="flex gap-4 items-center">
                    <img src={selectedCandidate.imageUrl} alt={selectedCandidate.name} className="w-16 h-16 object-cover rounded-xl border border-white/10 shadow-lg" />
                    <div>
                      <span className="text-xs text-neutral-400 uppercase tracking-widest block">Voter pour</span>
                      <h4 className="text-xl font-bold font-orbitron tracking-tight text-white uppercase m-0">{selectedCandidate.name}</h4>
                      <span className="text-xs text-neutral-400">{selectedCandidate.category} du Bal Masqué · {selectedCandidate.class}</span>
                    </div>
                  </div>
                  <div className="mt-8">
                    <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-3">Nombre de votes</label>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => setVoteCount(Math.max(1, voteCount - 1))} className="w-12 h-12 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl flex items-center justify-center font-bold text-lg select-none transition-all">-</button>
                      <input type="number" min="1" required value={voteCount} onChange={(e) => setVoteCount(Math.max(1, parseInt(e.target.value) || 1))} className="flex-1 h-12 bg-black/40 border border-white/10 rounded-xl text-center font-bold font-orbitron text-xl text-white outline-none focus:border-white/30" />
                      <button type="button" onClick={() => setVoteCount(voteCount + 1)} className="w-12 h-12 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl flex items-center justify-center font-bold text-lg select-none transition-all">+</button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[1, 5, 10, 20, 50, 100].map((preset) => (
                        <button key={preset} type="button" onClick={() => setVoteCount(preset)} className={`flex-1 min-w-[50px] py-2 rounded-lg text-xs font-bold font-orbitron transition-all ${voteCount === preset ? selectedCandidate.category === "Roi" ? "bg-[#e8c26a] text-black" : "bg-[#d04a58] text-white" : "bg-white/5 hover:bg-white/10 text-neutral-300"}`}>+{preset}</button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-6">
                    <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-3">Opérateur Mobile Money</label>
                    <div className="grid grid-cols-2 gap-4">
                      <label className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer select-none transition-all ${operator === "MTN" ? "bg-[#e8c26a]/10 border-[#e8c26a] text-white" : "bg-white/5 border-white/5 text-neutral-400 hover:bg-white/10"}`}>
                        <span className="font-bold text-sm tracking-wide">MTN MoMo</span>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${operator === "MTN" ? "border-[#e8c26a]" : "border-neutral-600"}`}>{operator === "MTN" && <div className="w-2.5 h-2.5 rounded-full bg-[#e8c26a]" />}</div>
                        <input type="radio" name="operator" checked={operator === "MTN"} onChange={() => setOperator("MTN")} className="hidden" />
                      </label>
                      <label className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer select-none transition-all ${operator === "ORANGE" ? "bg-[#d04a58]/10 border-[#d04a58] text-white" : "bg-white/5 border-white/5 text-neutral-400 hover:bg-white/10"}`}>
                        <span className="font-bold text-sm tracking-wide">Orange Money</span>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${operator === "ORANGE" ? "border-[#d04a58]" : "border-neutral-600"}`}>{operator === "ORANGE" && <div className="w-2.5 h-2.5 rounded-full bg-[#d04a58]" />}</div>
                        <input type="radio" name="operator" checked={operator === "ORANGE"} onChange={() => setOperator("ORANGE")} className="hidden" />
                      </label>
                    </div>
                  </div>
                  <div className="mt-6">
                    <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-3">Numéro de téléphone</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-3.5 text-neutral-500 size-5" />
                      <input type="tel" required placeholder="Ex: 699001122" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="w-full h-12 pl-12 pr-4 bg-black/40 border border-white/10 rounded-xl font-medium text-white outline-none focus:border-white/30" />
                    </div>
                  </div>
                  <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center">
                    <span className="text-sm text-neutral-400">Total à payer :</span>
                    <span className="text-2xl font-bold font-orbitron text-white">{voteCount * 100} FCFA</span>
                  </div>
                  <button type="submit" className={`w-full mt-6 py-4 rounded-xl font-bold uppercase tracking-wider transition-all duration-300 ${selectedCandidate.category === "Roi" ? "bg-[#e8c26a] text-black hover:opacity-90" : "bg-[#d04a58] text-white hover:opacity-90"}`}>Valider le vote</button>
                </form>
              )}
              {flowState === "initiating" && (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <Loader2 className="animate-spin text-[#e8c26a] size-12 mb-4" />
                  <h4 className="text-xl font-bold font-orbitron uppercase text-white mb-2">Initiation du paiement</h4>
                  <p className="text-neutral-400 max-w-sm text-sm">Connexion à l&apos;opérateur en cours...</p>
                </div>
              )}
              {flowState === "pending_ussd" && (
                <div className="py-8 flex flex-col items-center justify-center text-center">
                  <Smartphone className="animate-bounce text-[#e8c26a] size-16 mb-4" />
                  <h4 className="text-xl font-bold font-orbitron uppercase text-white mb-2">Confirmation requise</h4>
                  <p className="text-[#e8c26a] font-bold text-lg mb-4 font-orbitron animate-pulse">Vérifiez votre téléphone&nbsp;!</p>
                  <p className="text-neutral-300 max-w-sm text-sm leading-relaxed mb-6">Saisissez votre code PIN Mobile Money pour valider le paiement de <strong>{voteCount * 100} FCFA</strong>.</p>
                  <div className="flex items-center gap-2 text-xs text-neutral-500 bg-white/5 px-4 py-2 rounded-full border border-white/5">
                    <Loader2 className="animate-spin size-4" />
                    <span>En attente de la validation...</span>
                  </div>
                </div>
              )}
              {flowState === "success" && (
                <div className="py-8 flex flex-col items-center justify-center text-center">
                  <CheckCircle className="text-green-500 size-16 mb-4" />
                  <h4 className="text-2xl font-bold font-orbitron uppercase text-white mb-2">Vote enregistré&nbsp;!</h4>
                  <p className="text-neutral-300 max-w-sm text-sm leading-relaxed mb-6"><strong>{voteCount} votes</strong> attribués à <strong>{selectedCandidate.name}</strong>.</p>
                  <button onClick={() => setSelectedCandidate(null)} className="px-8 py-3 bg-white text-black hover:bg-neutral-200 rounded-full font-bold uppercase text-xs tracking-wider transition-all">Fermer</button>
                </div>
              )}
              {flowState === "failed" && (
                <div className="py-8 flex flex-col items-center justify-center text-center">
                  <XCircle className="text-red-500 size-16 mb-4" />
                  <h4 className="text-xl font-bold font-orbitron uppercase text-white mb-2">Le paiement a échoué</h4>
                  <p className="text-red-400 font-medium text-sm mb-6 max-w-sm">{errorMessage || "Une erreur est survenue."}</p>
                  <div className="flex gap-4">
                    <button onClick={() => setFlowState("idle")} className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold uppercase text-xs tracking-wider transition-all">Réessayer</button>
                    <button onClick={() => setSelectedCandidate(null)} className="px-6 py-3 bg-white text-black hover:bg-neutral-200 rounded-full font-bold uppercase text-xs tracking-wider transition-all">Fermer</button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </main>
  )
}
