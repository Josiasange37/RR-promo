"use client"

import { useEffect, useState, useCallback } from "react"
import {
  ShieldCheck,
  ShieldOff,
  UserCog,
  KeyRound,
  Loader2,
  CheckCircle,
  QrCode,
  Copy,
  Crown,
  Smartphone,
  UserPlus,
} from "lucide-react"
import { CornerFrame } from "@/components/ui/motifs"

interface AdminUser {
  id: string
  username: string
  label: string | null
  isOwner: boolean
  totpEnrolled: boolean
}

interface EnrollResult {
  adminId: string
  account: string
  secret: string
  otpauthUri: string
  qrDataUrl: string
}

type Modal =
  | { type: "qr"; admin: AdminUser; data: EnrollResult | null; code: string; busy: boolean; error: string | null }
  | { type: "password"; name: string; newPassword: string | null; busy: boolean; error: string | null }
  | { type: "create"; username: string; label: string; created: { username: string; password: string } | null; busy: boolean; error: string | null }
  | null

export default function AccessPanel() {
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<Modal>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/access")
      const data = await res.json()
      if (data.success) setAdmins(data.admins ?? [])
      else setError(data.error || "Impossible de charger les accès.")
    } catch {
      setError("Erreur réseau.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const startEnroll = async (admin: AdminUser) => {
    setModal({ type: "qr", admin, data: null, code: "", busy: true, error: null })
    try {
      const res = await fetch("/api/admin/access/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: admin.id }),
      })
      const data = await res.json()
      if (data.success) {
        setModal((m) => (m?.type === "qr" ? { ...m, data, busy: false } : m))
      } else {
        setModal((m) => (m?.type === "qr" ? { ...m, busy: false, error: data.error ?? "Échec de l'enrôlement." } : m))
      }
    } catch {
      setModal((m) => (m?.type === "qr" ? { ...m, busy: false, error: "Erreur réseau." } : m))
    }
  }

  const confirmEnroll = async () => {
    if (!modal || modal.type !== "qr" || !modal.data) return
    setModal({ ...modal, busy: true, error: null })
    try {
      const res = await fetch("/api/admin/access/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: modal.admin.id, code: modal.code.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setModal(null)
        load()
      } else {
        setModal({ ...modal, busy: false, error: data.error ?? "Échec de la confirmation." })
      }
    } catch {
      setModal({ ...modal, busy: false, error: "Erreur réseau." })
    }
  }

  const revoke = async (admin: AdminUser) => {
    if (!confirm(`Désactiver l'authentificateur de « ${admin.username} » ? Il repassera au mot de passe.`)) return
    try {
      const res = await fetch("/api/admin/access/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: admin.id }),
      })
      const data = await res.json()
      alert(data.success ? "Authentificateur désactivé." : (data.error ?? "Échec."))
      if (data.success) load()
    } catch {
      alert("Erreur réseau.")
    }
  }

  const resetPassword = (admin: AdminUser) => {
    if (!confirm(`Réinitialiser le mot de passe de « ${admin.username} » ? Le nouveau mot de passe ne sera affiché qu'une fois.`)) return
    setModal({ type: "password", name: admin.username, newPassword: null, busy: true, error: null })
    ;(async () => {
      try {
        const res = await fetch("/api/admin/access/password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adminId: admin.id }),
        })
        const data = await res.json()
        if (data.success) {
          setModal({ type: "password", name: admin.username, newPassword: data.newPassword, busy: false, error: null })
        } else {
          setModal({ type: "password", name: admin.username, newPassword: null, busy: false, error: data.error ?? "Échec." })
        }
      } catch {
        setModal({ type: "password", name: admin.username, newPassword: null, busy: false, error: "Erreur réseau." })
      }
    })()
  }

  const createAdmin = async () => {
    if (!modal || modal.type !== "create" || !modal.username.trim()) return
    setModal({ ...modal, busy: true, error: null })
    try {
      const res = await fetch("/api/admin/access/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: modal.username.trim(), label: modal.label.trim() || null }),
      })
      const data = await res.json()
      if (data.success) {
        setModal({ ...modal, busy: false, created: { username: data.admin.username, password: data.password } })
        load()
      } else {
        setModal({ ...modal, busy: false, error: data.error ?? "Échec de la création." })
      }
    } catch {
      setModal({ ...modal, busy: false, error: "Erreur réseau." })
    }
  }

  const copySecret = (secret: string) => {
    try {
      navigator.clipboard?.writeText(secret)
      alert("Secret copié.")
    } catch {
      alert(secret)
    }
  }

  return (
    <>
      <CornerFrame className="admin-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h3 className="text-lg font-bold font-orbitron text-[#e8c26a] uppercase m-0 flex items-center gap-2">
              <ShieldCheck className="size-5" /> Sécurité — Accès
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              Assignez un authentificateur (Google Authenticator, Authy…) à chaque administrateur. Une fois activé, le mot de passe n&apos;est plus utilisé (sauf récupération propriétaire).
            </p>
          </div>
          <span className="trx-badge">{admins.length} compte{admins.length > 1 ? "s" : ""}</span>
        </div>

        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setModal({ type: "create", username: "", label: "", created: null, busy: false, error: null })}
            className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all bg-[#e8c26a] text-black hover:opacity-90 flex items-center gap-1.5"
          >
            <UserPlus className="size-3" /> Nouveau compte
          </button>
        </div>

        {error && (
          <p className="text-red-400 text-xs font-medium bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 mb-4">{error}</p>
        )}

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[#e8c26a] size-8" /></div>
        ) : (
          <div className="space-y-3">
            {admins.map((admin) => (
              <div key={admin.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${admin.isOwner ? "bg-[#e8c26a]/10 border-[#e8c26a]/30 text-[#e8c26a]" : "bg-white/5 border-white/10 text-neutral-400"}`}>
                    {admin.isOwner ? <Crown className="size-5" /> : <UserCog className="size-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white font-mono">{admin.username}</span>
                      {admin.isOwner && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#e8c26a]/15 text-[#e8c26a] border border-[#e8c26a]/30">PROPRIÉTAIRE</span>
                      )}
                    </div>
                    {admin.label && <span className="text-xs text-neutral-400">{admin.label}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${admin.totpEnrolled ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                    {admin.totpEnrolled ? <Smartphone className="size-3" /> : <ShieldOff className="size-3" />}
                    {admin.totpEnrolled ? "Authentificateur actif" : "Non configuré"}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEnroll(admin)}
                      disabled={admin.totpEnrolled}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: admin.totpEnrolled ? "rgba(255,255,255,0.06)" : "#e8c26a", color: admin.totpEnrolled ? "#7a7a7a" : "#101014" }}
                    >
                      <QrCode className="size-3" /> {admin.totpEnrolled ? "Actif" : "Assigner"}
                    </button>
                    {admin.totpEnrolled && (
                      <button
                        onClick={() => revoke(admin)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 flex items-center gap-1.5"
                      >
                        <ShieldOff className="size-3" /> Révoquer
                      </button>
                    )}
                    <button
                      onClick={() => resetPassword(admin)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all bg-white/5 text-neutral-300 border border-white/10 hover:bg-white/10 flex items-center gap-1.5"
                    >
                      <KeyRound className="size-3" /> Mot de passe
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CornerFrame>

      {modal && modal.type === "qr" && (
        <ModalOverlay onClose={() => setModal(null)}>
          <div className="p-6 md:p-8">
            <div className="h-1.5 w-full bg-[#e8c26a] absolute top-0 left-0 rounded-t-2xl" />
            <h3 className="text-xl font-bold font-orbitron uppercase text-white m-0 flex items-center gap-2">
              <Smartphone className="size-5 text-[#e8c26a]" /> Authentificateur — {modal.admin.username}
            </h3>
            <p className="text-xs text-neutral-400 mt-2 max-w-md">
              Scannez ce QR code avec l&apos;application de l&apos;administrateur (Google Authenticator, Authy, 1Password…).
            </p>

            {modal.busy ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Loader2 className="animate-spin text-[#e8c26a] size-8" />
                <p className="text-neutral-400 text-sm">Génération du secret…</p>
              </div>
            ) : modal.error ? (
              <p className="text-red-400 text-sm text-center py-6 font-medium">{modal.error}</p>
            ) : modal.data ? (
              <>
                <div className="mt-6 flex justify-center">
                  <img src={modal.data.qrDataUrl} alt="QR code d'enrôlement" className="w-56 h-56 rounded-xl border border-white/10 bg-white p-2" />
                </div>

                <div className="mt-4 text-center text-xs text-neutral-400">
                  Ou saisissez manuellement la clé dans l&apos;application :
                </div>
                <div className="mt-2 flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-4 py-3">
                  <code className="flex-1 text-xs text-[#e8c26a] font-mono break-all select-all">{modal.data.secret}</code>
                  <button onClick={() => modal.data && copySecret(modal.data.secret)} className="flex-none text-neutral-400 hover:text-white transition-colors" aria-label="Copier le secret">
                    <Copy className="size-4" />
                  </button>
                </div>

                <div className="mt-6">
                  <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-2">
                    Code de validation (6 chiffres)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="123456"
                      value={modal.code}
                      onChange={(e) => setModal({ ...modal, code: e.target.value.replace(/[^0-9]/g, "").slice(0, 6) })}
                      className="flex-1 h-12 px-4 bg-black/40 border border-white/10 rounded-xl font-mono text-center tracking-[0.5em] text-lg text-white outline-none focus:border-[#e8c26a]/40"
                    />
                    <button
                      onClick={confirmEnroll}
                      disabled={modal.busy || modal.code.trim().length !== 6}
                      className="px-6 h-12 rounded-xl bg-[#e8c26a] text-black font-bold uppercase tracking-wider text-sm transition-all hover:opacity-90 disabled:opacity-40 flex items-center gap-2"
                    >
                      {modal.busy ? <Loader2 className="animate-spin size-4" /> : <CheckCircle className="size-4" />}
                      Activer
                    </button>
                  </div>
                  {modal.error && <p className="text-red-400 text-xs mt-2 font-medium">{modal.error}</p>}
                </div>
              </>
            ) : null}
          </div>
        </ModalOverlay>
      )}

      {modal && modal.type === "password" && (
        <ModalOverlay onClose={() => setModal(null)}>
          <div className="p-6 md:p-8">
            <div className="h-1.5 w-full bg-[#e8c26a] absolute top-0 left-0 rounded-t-2xl" />
            {modal.busy ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Loader2 className="animate-spin text-[#e8c26a] size-8" />
                <p className="text-neutral-400 text-sm">Génération du mot de passe…</p>
              </div>
            ) : modal.error ? (
              <p className="text-red-400 text-center font-medium py-4">{modal.error}</p>
            ) : modal.newPassword ? (
              <>
                <h3 className="text-xl font-bold font-orbitron uppercase text-white m-0">
                  Nouveau mot de passe — {modal.name}
                </h3>
                <p className="text-xs text-neutral-400 mt-2">
                  Communiquez ce mot de passe à l&apos;administrateur. Il ne sera plus jamais affiché.
                </p>
                <div className="mt-5 flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-4 py-3">
                  <code className="flex-1 text-sm font-mono font-bold text-[#e8c26a] select-all">{modal.newPassword}</code>
                  <button onClick={() => copySecret(modal.newPassword!)} className="text-neutral-400 hover:text-white" aria-label="Copier">
                    <Copy className="size-4" />
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </ModalOverlay>
      )}

      {modal && modal.type === "create" && (
        <ModalOverlay onClose={() => setModal(null)}>
          <div className="p-6 md:p-8">
            <div className="h-1.5 w-full bg-[#e8c26a] absolute top-0 left-0 rounded-t-2xl" />
            {modal.created ? (
              <>
                <h3 className="text-xl font-bold font-orbitron uppercase text-white m-0 flex items-center gap-2">
                  <CheckCircle className="size-5 text-[#e8c26a]" /> Compte créé — {modal.created.username}
                </h3>
                <p className="text-xs text-neutral-400 mt-2">
                  Communiquez ces identifiants à l&apos;administrateur. Le mot de passe ne sera plus jamais affiché.
                </p>
                <div className="mt-5">
                  <div className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Identifiant</div>
                  <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-4 py-3">
                    <code className="flex-1 text-sm font-mono font-bold text-white select-all">{modal.created.username}</code>
                    <button onClick={() => copySecret(modal.created!.username)} className="text-neutral-400 hover:text-white" aria-label="Copier">
                      <Copy className="size-4" />
                    </button>
                  </div>
                  <div className="text-xs text-neutral-500 uppercase tracking-wider mb-1 mt-4">Mot de passe</div>
                  <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-4 py-3">
                    <code className="flex-1 text-sm font-mono font-bold text-[#e8c26a] select-all">{modal.created.password}</code>
                    <button onClick={() => copySecret(modal.created!.password)} className="text-neutral-400 hover:text-white" aria-label="Copier">
                      <Copy className="size-4" />
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setModal(null)}
                  className="mt-6 w-full h-12 rounded-xl bg-[#e8c26a] text-black font-bold uppercase tracking-wider text-sm transition-all hover:opacity-90"
                >
                  Terminé
                </button>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold font-orbitron uppercase text-white m-0 flex items-center gap-2">
                  <UserPlus className="size-5 text-[#e8c26a]" /> Nouveau compte administrateur
                </h3>
                <p className="text-xs text-neutral-400 mt-2">
                  Le compte pourra accéder au panneau de modération. Un mot de passe sécurisé sera généré et affiché une seule fois.
                </p>
                <div className="mt-5 space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-2">Identifiant</label>
                    <input
                      type="text"
                      value={modal.username}
                      onChange={(e) => setModal({ ...modal, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") })}
                      placeholder="ex. admin_vote"
                      className="w-full h-12 px-4 bg-black/40 border border-white/10 rounded-xl font-mono text-white outline-none focus:border-[#e8c26a]/40"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-2">Libellé (optionnel)</label>
                    <input
                      type="text"
                      value={modal.label}
                      onChange={(e) => setModal({ ...modal, label: e.target.value.slice(0, 80) })}
                      placeholder="ex. Équipe du soir"
                      className="w-full h-12 px-4 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-[#e8c26a]/40"
                    />
                  </div>
                  {modal.error && <p className="text-red-400 text-xs font-medium">{modal.error}</p>}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setModal(null)}
                      className="flex-1 h-12 rounded-xl bg-white/5 text-neutral-300 font-bold uppercase tracking-wider text-sm border border-white/10 transition-all hover:bg-white/10"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={createAdmin}
                      disabled={modal.busy || !modal.username.trim()}
                      className="flex-1 h-12 rounded-xl bg-[#e8c26a] text-black font-bold uppercase tracking-wider text-sm transition-all hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      {modal.busy ? <Loader2 className="animate-spin size-4" /> : <UserPlus className="size-4" />}
                      Créer
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </ModalOverlay>
      )}
    </>
  )
}

/* ── tiny helpers used above ── */

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#14141c] border border-white/10 rounded-2xl shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  )
}