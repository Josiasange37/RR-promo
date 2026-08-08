"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  Trophy,
  LogOut,
  Lock,
  ChevronLeft,
  Loader2,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Crown,
  Gem,
  User,
  KeyRound,
  Eye,
  EyeOff,
  Wallet,
  ArrowDownUp,
} from "lucide-react"

import { CornerFrame } from "@/components/ui/motifs"

interface CandidateRank {
  id: string
  name: string
  class: string
  category: "Roi" | "Reine"
  votes: number
  imageUrl: string
}

interface TransactionItem {
  id: string
  candidateId: string
  votes: number
  amount: number
  phoneNumber: string
  operator: "MTN" | "ORANGE"
  status: "PENDING" | "SUCCESS" | "FAILED"
  createdAt: string
}

interface DashboardStats {
  totalCollected: number
  totalVotes: number
  successCount: number
  failedCount: number
  pendingCount: number
  totalTransactions: number
}

interface WithdrawalItem {
  id: string
  amount: number
  phoneNumber: string
  operator: "MTN" | "ORANGE"
  reference: string
  status: "PENDING" | "SUCCESS" | "FAILED"
  createdAt: string
}

export default function AdminPanel() {
  const [username, setUsername] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false)
  const [loginError, setLoginError] = useState<string>("")
  const [loginLoading, setLoginLoading] = useState<boolean>(false)

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [roiRankings, setRoiRankings] = useState<CandidateRank[]>([])
  const [reineRankings, setReineRankings] = useState<CandidateRank[]>([])
  const [transactions, setTransactions] = useState<TransactionItem[]>([])
  const [totalTransactions, setTotalTransactions] = useState<number>(0)
  const [hasMore, setHasMore] = useState<boolean>(false)
  const [loadingMore, setLoadingMore] = useState<boolean>(false)
  const transactionsRef = useRef<TransactionItem[]>([])

  // ── Withdrawal state ──
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([])
  const [wdAmount, setWdAmount] = useState<string>("")
  const [wdPhone, setWdPhone] = useState<string>("")
  const [wdOperator, setWdOperator] = useState<"MTN" | "ORANGE">("MTN")
  const [wdLoading, setWdLoading] = useState<boolean>(false)
  const [wdMessage, setWdMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Restore session on mount — the auth token lives in an HttpOnly cookie, so we
  // simply ask the server; if the cookie is valid we are logged in.
  const loadDashboard = useCallback(async (fresh = true) => {
    try {
      const res = await fetch("/api/admin/dashboard")
      const data = await res.json()
      if (data.success) {
        setIsLoggedIn(true)
        setStats(data.stats)
        setRoiRankings(data.roiRankings)
        setReineRankings(data.reineRankings)
        setTotalTransactions(data.pagination?.total ?? data.transactions.length)
        setHasMore(data.pagination?.hasMore ?? false)
        if (fresh) {
          transactionsRef.current = data.recentTransactions ?? []
        }
        setTransactions([...transactionsRef.current])

        // Load payout history
        fetch("/api/admin/withdraw")
          .then((r) => r.json())
          .then((wd) => {
            if (wd.success) setWithdrawals(wd.withdrawals ?? [])
          })
          .catch((e) => console.error("Withdraw load error:", e))
      } else {
        setIsLoggedIn(false)
      }
    } catch (err) {
      console.error("Dashboard load error:", err)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  // Live polling while authenticated — refresh stats silently (keeps loaded history)
  useEffect(() => {
    if (!isLoggedIn) return
    const interval = setInterval(() => loadDashboard(false), 8000)
    return () => clearInterval(interval)
  }, [isLoggedIn, loadDashboard])

  // Load the next page of the full transaction history
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/admin/dashboard?offset=${transactions.length}`)
      const data = await res.json()
      if (data.success) {
        const more = data.recentTransactions ?? []
        transactionsRef.current = [...transactionsRef.current, ...more]
        setTransactions([...transactionsRef.current])
        setHasMore(data.pagination?.hasMore ?? false)
        setTotalTransactions(data.pagination?.total ?? totalTransactions)
      }
    } catch (err) {
      console.error("Load more error:", err)
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, hasMore, transactions.length, totalTransactions])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) return
    setLoginLoading(true)
    setLoginError("")

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      })
      const data = await res.json()
      if (data.success) {
        await loadDashboard()
        setPassword("")
      } else {
        setLoginError(data.error || "Identifiants incorrects.")
      }
    } catch (err) {
      setLoginError("Impossible de contacter le serveur.")
    } finally {
      setLoginLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" })
    } catch {
      // ignore network errors — still wipe local state
    }
    setIsLoggedIn(false)
    setUsername("")
    setPassword("")
    setStats(null)
  }

  const handleResetDB = async () => {
    if (!confirm("ATTENTION : Réinitialiser TOUS les votes et transactions ? Cette action est irréversible.")) return
    try {
      const res = await fetch("/api/admin/reset", { method: "POST" })
      const data = await res.json()
      if (data.success) {
        alert("Base de données réinitialisée avec succès.")
        loadDashboard()
      } else {
        alert(`Échec : ${data.error}`)
      }
    } catch {
      alert("Erreur lors de la réinitialisation.")
    }
  }

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseInt(wdAmount, 10)
    if (!amount || amount < 100) {
      setWdMessage({ type: "error", text: "Saisissez un montant valide (minimum 100 FCFA)." })
      return
    }
    const phone = wdPhone.trim().replace(/\s+/g, "")
    if (!/^(\+?237)?[0-9]{9}$/.test(phone)) {
      setWdMessage({ type: "error", text: "Numéro de téléphone invalide." })
      return
    }
    if (!confirm(`Confirmer le retrait de ${amount.toLocaleString("fr-FR")} FCFA vers ${phone} (${wdOperator}) ?`)) return

    setWdLoading(true)
    setWdMessage(null)
    try {
      const res = await fetch("/api/admin/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, phoneNumber: phone, operator: wdOperator }),
      })
      const data = await res.json()
      if (data.success) {
        setWdMessage({ type: "success", text: `Retrait de ${amount.toLocaleString("fr-FR")} FCFA initié avec succès (${data.reference}).` })
        setWdAmount("")
        setWdPhone("")
        // refresh payout history
        fetch("/api/admin/withdraw")
          .then((r) => r.json())
          .then((wd) => { if (wd.success) setWithdrawals(wd.withdrawals ?? []) })
          .catch(() => {})
      } else {
        setWdMessage({ type: "error", text: data.error || "Échec du retrait." })
      }
    } catch {
      setWdMessage({ type: "error", text: "Erreur réseau lors du retrait." })
    } finally {
      setWdLoading(false)
    }
  }

  const successPercentage = stats
    ? stats.totalTransactions > 0
      ? Math.round((stats.successCount / stats.totalTransactions) * 100)
      : 0
    : 0

  const allCandidates = [...roiRankings, ...reineRankings]
  const getCandidateName = (id: string) => allCandidates.find((c) => c.id === id)?.name ?? id

  /* ─── Login Screen ─── */
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#101014] text-white flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_40%,rgba(164,32,46,0.12)_0%,transparent_70%)] pointer-events-none" />

        <div className="w-full max-w-md bg-[#14141c] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10">
          <div className="h-1.5 w-full bg-[#e8c26a] absolute top-0 left-0 rounded-t-2xl" />

          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-4 text-[#e8c26a]">
              <Lock size={26} />
            </div>
            <h1 className="text-2xl font-bold font-orbitron tracking-tight uppercase">Administration</h1>
            <p className="text-xs text-neutral-400 mt-2">Balle Maskee · Édition 2026</p>
          </div>

          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <div>
              <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-2">
                Identifiant
              </label>
              <div className="relative">
                <User className="absolute left-4 top-3.5 text-neutral-500 size-4" />
                <input
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="admin_..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full h-12 pl-11 pr-4 bg-black/40 border border-white/10 rounded-xl font-medium text-white outline-none focus:border-[#e8c26a]/40 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-3.5 text-neutral-500 size-4" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 pl-11 pr-12 bg-black/40 border border-white/10 rounded-xl font-medium text-white outline-none focus:border-[#e8c26a]/40 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  aria-pressed={showPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
            </div>

            {loginError && (
              <p className="text-red-400 text-xs font-medium text-center bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full h-12 bg-white text-black font-bold uppercase tracking-wider rounded-xl hover:bg-[#e8c26a] transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loginLoading ? <Loader2 className="animate-spin size-5" /> : "Connexion sécurisée"}
            </button>
          </form>

          <div className="mt-8 text-center">
            <a href="/" className="text-xs text-neutral-500 hover:text-neutral-300 inline-flex items-center gap-1">
              <ChevronLeft size={14} /> Retour au site
            </a>
          </div>
        </div>
      </div>
    )
  }

  /* ─── Dashboard ─── */
  return (
    <div className="min-h-screen bg-[#101014] text-white p-4 sm:p-8 md:p-12">
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-8 border-b border-white/10">
        <div>
          <span className="text-xs font-bold text-[#e8c26a] tracking-widest uppercase block mb-1">Espace XYBERCLAN</span>
          <h1 className="text-3xl font-bold font-orbitron tracking-tight uppercase m-0">Tableau de Bord</h1>
          <p className="text-xs text-neutral-400 mt-1">Balle Maskee · Édition 2026</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleResetDB}
            className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
          >
            <Trash2 size={15} /> Réinitialiser
          </button>
          <button
            onClick={handleLogout}
            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
          >
            <LogOut size={15} /> Déconnexion
          </button>
        </div>
      </header>

      {stats ? (
        <div className="max-w-7xl mx-auto mt-10 space-y-10">
          {/* Stats Cards — title + bold number, statistician-ready */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            <CornerFrame className="admin-card stat-card p-6">
              <span className="stat-label">Fonds collectés</span>
              <span className="stat-value">{stats.totalCollected.toLocaleString("fr-FR")}</span>
              <span className="stat-sub">FCFA</span>
            </CornerFrame>

            <CornerFrame className="admin-card stat-card p-6">
              <span className="stat-label">Total des voix</span>
              <span className="stat-value" style={{ color: "#e8c26a" }}>{stats.totalVotes.toLocaleString()}</span>
              <span className="stat-sub">votes validés</span>
            </CornerFrame>

            <CornerFrame className="admin-card stat-card p-6">
              <span className="stat-label">Taux de réussite</span>
              <span className="stat-value" style={{ color: "#4ade80" }}>{successPercentage}<small className="stat-pct">%</small></span>
              <span className="stat-sub">{stats.successCount} paiements validés</span>
            </CornerFrame>

            <CornerFrame className="admin-card stat-card p-6">
              <span className="stat-label">Paiements initiés</span>
              <span className="stat-value">{stats.totalTransactions.toLocaleString()}</span>
              <span className="stat-sub">{stats.pendingCount} en cours · {stats.failedCount} échoués</span>
            </CornerFrame>
          </div>

          {/* Retrait Mobile Money (payouts) */}
          <CornerFrame className="admin-card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <div>
                <h3 className="text-lg font-bold font-orbitron text-[#e8c26a] uppercase m-0 flex items-center gap-2">
                  <Wallet className="size-5" /> Retrait Mobile Money
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Retirer les fonds collectés vers MTN MoMo ou Orange Money (via CamPay).
                </p>
              </div>
              {withdrawals.length > 0 && (
                <span className="trx-badge">{withdrawals.length} retrait{withdrawals.length > 1 ? "s" : ""}</span>
              )}
            </div>

            <form onSubmit={handleWithdraw} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-2">Montant (FCFA)</label>
                <input
                  type="number"
                  min="100"
                  step="100"
                  required
                  value={wdAmount}
                  onChange={(e) => setWdAmount(e.target.value)}
                  placeholder="5000"
                  className="w-full h-12 px-4 bg-black/40 border border-white/10 rounded-xl font-medium text-white outline-none focus:border-[#e8c26a]/40 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-2">Numéro bénéficiaire</label>
                <input
                  type="tel"
                  required
                  value={wdPhone}
                  onChange={(e) => setWdPhone(e.target.value)}
                  placeholder="699001122"
                  className="w-full h-12 px-4 bg-black/40 border border-white/10 rounded-xl font-medium text-white outline-none focus:border-[#e8c26a]/40 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-2">Réseau</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWdOperator("MTN")}
                    className={`h-12 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                      wdOperator === "MTN"
                        ? "bg-[#e8c26a]/15 border-[#e8c26a] text-[#e8c26a]"
                        : "bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10"
                    }`}
                  >
                    MTN
                  </button>
                  <button
                    type="button"
                    onClick={() => setWdOperator("ORANGE")}
                    className={`h-12 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                      wdOperator === "ORANGE"
                        ? "bg-[#d04a58]/15 border-[#d04a58] text-[#d04a58]"
                        : "bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10"
                    }`}
                  >
                    OM
                  </button>
                </div>
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={wdLoading}
                  className="w-full h-12 rounded-xl bg-[#e8c26a] text-black font-bold uppercase tracking-wider text-sm transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {wdLoading ? <Loader2 className="animate-spin size-4" /> : <ArrowDownUp className="size-4" />}
                  Retirer
                </button>
              </div>
            </form>

            {wdMessage && (
              <p
                className={`mt-4 text-xs font-medium rounded-lg px-4 py-2 border ${
                  wdMessage.type === "success"
                    ? "text-green-400 bg-green-500/10 border-green-500/20"
                    : "text-red-400 bg-red-500/10 border-red-500/20"
                }`}
              >
                {wdMessage.text}
              </p>
            )}

            {withdrawals.length > 0 && (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm trx-table">
                  <thead>
                    <tr>
                      <th>Référence</th>
                      <th>Téléphone</th>
                      <th>Réseau</th>
                      <th className="text-right">Montant</th>
                      <th>Statut</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {withdrawals.map((w) => (
                      <tr key={w.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 font-mono text-xs text-white/60">{w.reference}</td>
                        <td className="py-3 px-4 font-mono text-white/80">{w.phoneNumber}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            w.operator === "MTN" ? "bg-yellow-500/20 text-yellow-400" : "bg-orange-500/20 text-orange-400"
                          }`}>
                            {w.operator}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-white">{w.amount.toLocaleString("fr-FR")} FCFA</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            w.status === "SUCCESS"
                              ? "bg-green-500/10 text-green-400"
                              : w.status === "FAILED"
                              ? "bg-red-500/10 text-red-400"
                              : "bg-yellow-500/10 text-yellow-400"
                          }`}>
                            {w.status === "SUCCESS" && <CheckCircle size={12} />}
                            {w.status === "FAILED" && <XCircle size={12} />}
                            {w.status === "PENDING" && <Clock size={12} className="animate-pulse" />}
                            {w.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-white/70 whitespace-nowrap">
                          {new Date(w.createdAt).toLocaleString("fr-FR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CornerFrame>

          {/* Rankings progress grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <CornerFrame className="category-card p-6">
              <div className="flex items-center gap-2 mb-6">
                <Crown className="text-[#e8c26a] size-5" />
                <h3 className="text-lg font-bold font-orbitron text-[#e8c26a] uppercase m-0">Candidats Roi</h3>
              </div>
              <div className="space-y-6">
                {roiRankings.map((c, i) => {
                  const maxVotes = roiRankings[0]?.votes || 1
                  const progress = Math.max(5, (c.votes / maxVotes) * 100)
                  return (
                    <div key={c.id} className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-bold flex items-center gap-2">
                          <span className="text-neutral-500">{i === 0 ? <Trophy className="text-[#e8c26a] size-4" /> : `#${i + 1}`}</span>
                          {c.name} <span className="text-xs text-neutral-400 font-normal">({c.class})</span>
                        </span>
                        <span className="font-orbitron font-bold text-[#e8c26a]">{c.votes} voix</span>
                      </div>
                      <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div
                          className="h-full bg-gradient-to-r from-[#e8c26a] to-yellow-500 rounded-full transition-all duration-1000"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CornerFrame>

            <CornerFrame className="category-card p-6">
              <div className="flex items-center gap-2 mb-6">
                <Gem className="text-[#d04a58] size-5" />
                <h3 className="text-lg font-bold font-orbitron text-[#d04a58] uppercase m-0">Candidates Reine</h3>
              </div>
              <div className="space-y-6">
                {reineRankings.map((c, i) => {
                  const maxVotes = reineRankings[0]?.votes || 1
                  const progress = Math.max(5, (c.votes / maxVotes) * 100)
                  return (
                    <div key={c.id} className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-bold flex items-center gap-2">
                          <span className="text-neutral-500">{i === 0 ? <Trophy className="text-[#d04a58] size-4" /> : `#${i + 1}`}</span>
                          {c.name} <span className="text-xs text-neutral-400 font-normal">({c.class})</span>
                        </span>
                        <span className="font-orbitron font-bold text-[#d04a58]">{c.votes} voix</span>
                      </div>
                      <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div
                          className="h-full bg-gradient-to-r from-[#d04a58] to-red-500 rounded-full transition-all duration-1000"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CornerFrame>
          </div>

          {/* Transactions Table — full history with pagination */}
          <CornerFrame className="admin-card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <div>
                <h3 className="text-lg font-bold font-orbitron text-white uppercase m-0">Journal des Transactions</h3>
                <p className="text-xs text-neutral-400 mt-1">
                  {totalTransactions.toLocaleString("fr-FR")} transaction{totalTransactions > 1 ? "s" : ""} au total ·{" "}
                  {transactions.length.toLocaleString("fr-FR")} affichée{transactions.length > 1 ? "s" : ""}
                </p>
              </div>
              <span className="trx-badge">Historique complet</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm trx-table">
                <thead>
                  <tr>
                    <th>ID Transaction</th>
                    <th>Candidat</th>
                    <th>Téléphone</th>
                    <th>Réseau</th>
                    <th className="text-right">Montant</th>
                    <th className="text-right">Votes</th>
                    <th>Statut</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-neutral-500">Aucune transaction enregistrée.</td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 font-mono text-xs text-white/60">{tx.id}</td>
                        <td className="py-3 px-4 font-bold text-white">{getCandidateName(tx.candidateId)}</td>
                        <td className="py-3 px-4 font-mono text-white/80">{tx.phoneNumber}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            tx.operator === "MTN" ? "bg-yellow-500/20 text-yellow-400" : "bg-orange-500/20 text-orange-400"
                          }`}>
                            {tx.operator}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-white">{tx.amount.toLocaleString("fr-FR")} FCFA</td>
                        <td className="py-3 px-4 text-right font-orbitron font-bold text-white">{tx.votes}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            tx.status === "SUCCESS"
                              ? "bg-green-500/10 text-green-400"
                              : tx.status === "FAILED"
                              ? "bg-red-500/10 text-red-400"
                              : "bg-yellow-500/10 text-yellow-400"
                          }`}>
                            {tx.status === "SUCCESS" && <CheckCircle size={12} />}
                            {tx.status === "FAILED" && <XCircle size={12} />}
                            {tx.status === "PENDING" && <Clock size={12} className="animate-pulse" />}
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-white/70 whitespace-nowrap">
                          {new Date(tx.createdAt).toLocaleString("fr-FR")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {transactions.length > 0 && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
                <span className="text-sm text-white/50">
                  {transactions.length.toLocaleString("fr-FR")} / {totalTransactions.toLocaleString("fr-FR")} enregistrements
                </span>
                {hasMore && (
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#e8c26a] text-black font-bold uppercase tracking-wider text-sm transition-all hover:opacity-90 disabled:opacity-50"
                  >
                    {loadingMore ? <Loader2 className="animate-spin size-4" /> : "Charger la suite"}
                  </button>
                )}
              </div>
            )}
          </CornerFrame>
        </div>
      ) : (
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="animate-spin text-[#e8c26a] size-12" />
        </div>
      )}
    </div>
  )
}