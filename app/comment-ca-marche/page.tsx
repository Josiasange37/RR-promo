"use client"

import {
  Crown,
  Smartphone,
  CheckCircle,
  ShieldCheck,
  Trophy,
  Gem,
  Zap,
  HelpCircle,
  ChevronDown,
  RefreshCw,
  Lock,
  Clock,
  Star,
} from "lucide-react"
import { useState, useRef } from "react"
import { motion } from "motion/react"
import { useScrollReveal } from "@/lib/use-scroll-reveal"

/* ─── FAQ Data ─── */
const FAQ = [
  {
    q: "Combien coûte un vote ?",
    a: "Chaque vote coûte 100 FCFA. Vous pouvez acheter autant de votes que vous le souhaitez pour un ou plusieurs candidats. Le montant total est débité en une seule transaction Mobile Money.",
  },
  {
    q: "Quels opérateurs Mobile Money sont acceptés ?",
    a: "Nous acceptons MTN Mobile Money (MoMo) et Orange Money. Assurez-vous que votre numéro est bien associé à l'un de ces deux opérateurs et que vous disposez du solde suffisant.",
  },
  {
    q: "Comment savoir si mon vote a bien été pris en compte ?",
    a: "Après avoir confirmé la transaction USSD sur votre téléphone, notre système valide le paiement automatiquement. Vous verrez un message de confirmation à l'écran et le compteur de votes du candidat sera mis à jour en temps réel.",
  },
  {
    q: "Puis-je voter plusieurs fois pour le même candidat ?",
    a: "Oui, absolument ! Il n'y a aucune limite. Vous pouvez voter autant de fois que vous le souhaitez et pour autant de candidats différents que vous le désirez. Chaque transaction de 100 FCFA = 1 vote.",
  },
  {
    q: "Puis-je voter pour plusieurs candidats différents ?",
    a: "Bien sûr ! Vous pouvez soutenir à la fois un candidat Roi et une candidate Reine, ou plusieurs candidats dans une même catégorie. Chaque session de vote est indépendante.",
  },
  {
    q: "Que se passe-t-il si la transaction échoue ?",
    a: "Si vous annulez le paiement USSD, ou si la transaction échoue pour une raison technique, aucun vote n'est enregistré et aucun montant n'est débité. Vous pouvez réessayer immédiatement sans problème.",
  },
  {
    q: "Jusqu'à quand peut-on voter ?",
    a: "Les votes sont ouverts jusqu'au jour de l'événement, le 9 août 2026. Le classement final sera annoncé lors de la Balle Maskee. Profitez-en pour voter avant la clôture !",
  },
  {
    q: "Mes données personnelles sont-elles sécurisées ?",
    a: "Votre numéro de téléphone est uniquement utilisé pour initier la transaction Mobile Money. Nous ne stockons aucune donnée bancaire. Les paiements sont traités par CamPay, une passerelle de paiement certifiée.",
  },
  {
    q: "Comment voir le classement actuel ?",
    a: "Consultez la page Classement accessible depuis le menu principal ou en cliquant sur le bouton « Voir tout le classement » sur la page d'accueil. Le classement est mis à jour toutes les 8 secondes en temps réel.",
  },
]

/* ─── Step card ─── */
function StepCard({
  number,
  title,
  description,
  Icon,
  color,
  delay,
}: {
  number: string
  title: string
  description: string
  Icon: React.ElementType
  color: string
  delay: number
}) {
  return (
    <motion.div
      data-reveal
      className="relative flex flex-col gap-5 p-7 rounded-2xl transition-all duration-300 hover:-translate-y-1"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.07)",
        animationDelay: `${delay}ms`,
      }}
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 240, damping: 18 }}
    >
      {/* Step number top-right */}
      <motion.span
        className="absolute top-5 right-5 font-black font-orbitron opacity-10 text-4xl leading-none select-none"
        style={{ color }}
        aria-hidden="true"
        animate={{ rotate: [0, 6, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        {number}
      </motion.span>

      {/* Icon */}
      <motion.div
        className="w-14 h-14 rounded-2xl flex items-center justify-center flex-none"
        style={{ background: `${color}18`, border: `1px solid ${color}35` }}
        whileHover={{ rotate: -8, scale: 1.06 }}
        transition={{ type: "spring", stiffness: 260, damping: 14 }}
      >
        <Icon className="size-7" style={{ color }} strokeWidth={1.5} />
      </motion.div>

      <div>
        <h3
          className="text-lg font-bold font-orbitron uppercase tracking-wide text-white m-0 mb-2"
          style={{ letterSpacing: "0.04em" }}
        >
          {title}
        </h3>
        <p className="text-sm leading-relaxed m-0" style={{ color: "rgba(255,255,255,0.5)" }}>
          {description}
        </p>
      </div>
    </motion.div>
  )
}

/* ─── FAQ item ─── */
function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className="border-b transition-colors duration-200"
      style={{ borderColor: open ? "rgba(232,194,106,0.2)" : "rgba(255,255,255,0.06)" }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start justify-between gap-4 py-5 text-left group"
        aria-expanded={open}
      >
        <div className="flex items-start gap-3">
          <span
            className="font-bold font-orbitron text-xs mt-0.5 flex-none"
            style={{ color: "#e8c26a", minWidth: "2rem" }}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <span
            className="text-sm font-semibold text-white group-hover:text-[#e8c26a] transition-colors duration-200 leading-snug"
            style={{ fontFamily: "var(--font-jakarta)" }}
          >
            {q}
          </span>
        </div>
        <motion.span
          className="flex-none mt-0.5"
          style={{ color: open ? "#e8c26a" : "rgba(255,255,255,0.3)" }}
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <ChevronDown className="size-5" />
        </motion.span>
      </button>

      <motion.div
        className="overflow-hidden"
        initial={false}
        animate={{ height: open ? "auto" : "0px", opacity: open ? 1 : 0 }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      >
        <p
          className="pb-5 pl-9 text-sm leading-relaxed"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          {a}
        </p>
      </motion.div>
    </div>
  )
}

/* ─── Main Page ─── */
export default function CommentCaMarchePage() {
  const rootRef = useRef<HTMLDivElement>(null)
  useScrollReveal(rootRef)
  return (
    <main className="min-h-screen text-white overflow-x-hidden" style={{ background: "#101014" }}>

      {/* HERO */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse 120% 60% at 50% 0%, rgba(232,194,106,0.1) 0%, transparent 65%), #101014",
        }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-12 pt-20 pb-16 text-center">
          {/* Icon cluster */}
          <motion.div
            className="flex items-center justify-center gap-3 mb-6"
            data-reveal
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
          >
            {[
              { bg: "rgba(232,194,106,0.1)", brd: "rgba(232,194,106,0.25)", Icon: Crown, c: "#e8c26a" },
              { bg: "rgba(92,45,134,0.1)", brd: "rgba(92,45,134,0.3)", Icon: HelpCircle, c: "#c084fc" },
              { bg: "rgba(208,74,88,0.1)", brd: "rgba(208,74,88,0.25)", Icon: Gem, c: "#d04a58" },
            ].map(({ bg, brd, Icon, c }) => (
              <motion.div
                key={c}
                variants={{ hidden: { scale: 0, rotate: -20 }, visible: { scale: 1, rotate: 0, transition: { type: "spring", stiffness: 260, damping: 15 } } }}
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: bg, border: `1px solid ${brd}` }}
                whileHover={{ y: -4 }}
              >
                <Icon className="size-6" style={{ color: c }} strokeWidth={1.5} />
              </motion.div>
            ))}
          </motion.div>

          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#e8c26a] mb-4" data-reveal>Guide complet</p>
          <h1
            className="text-white mb-5"
            data-reveal
            style={{
              fontFamily: "var(--font-orbitron), sans-serif",
              fontWeight: 800,
              fontSize: "clamp(2rem, 5.5vw, 4rem)",
              letterSpacing: "-0.02em",
              lineHeight: 1.04,
              textTransform: "uppercase",
            }}
          >
            Comment{" "}
            <em style={{ color: "#e8c26a", fontStyle: "normal" }}>ça marche ?</em>
          </h1>
          <p
            className="text-base max-w-2xl mx-auto leading-relaxed"
            data-reveal
            style={{ color: "rgba(255,255,255,0.48)" }}
          >
            Tout ce que vous devez savoir pour participer à l&apos;élection du Roi et de la Reine de la{" "}
            <strong style={{ color: "rgba(255,255,255,0.7)" }}>Balle Maskee 2026</strong>.
          </p>
        </div>
      </section>

      {/* ═══ SECTION 1 — Présentation ═══ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 md:px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#e8c26a] mb-4" data-reveal>Le concept</p>
            <h2
              className="text-white mb-4"
              data-reveal
              style={{
                fontFamily: "var(--font-orbitron), sans-serif",
                fontWeight: 700,
                fontSize: "clamp(1.4rem, 3vw, 2.2rem)",
                textTransform: "uppercase",
                lineHeight: 1.1,
              }}
            >
              Une élection festive <em style={{ color: "#e8c26a", fontStyle: "normal" }}>par le vote populaire.</em>
            </h2>
            <p className="text-sm leading-relaxed mb-4" data-reveal style={{ color: "rgba(255,255,255,0.5)" }}>
              Chaque année à la Balle Maskee, les participant·es et leurs proches élisent démocratiquement un <strong style={{ color: "#e8c26a" }}>Roi</strong> et une{" "}
              <strong style={{ color: "#d04a58" }}>Reine</strong> parmi les candidats de l&apos;édition 2026.
            </p>
            <p className="text-sm leading-relaxed" data-reveal style={{ color: "rgba(255,255,255,0.5)" }}>
              Le vote est <strong style={{ color: "rgba(255,255,255,0.75)" }}>payant</strong> : chaque vote coûte{" "}
              <strong style={{ color: "#e8c26a" }}>100 FCFA</strong>. Les fonds collectés contribuent directement au financement de la Balle Maskee.
            </p>
          </div>

          {/* Stats card */}
          <div
            className="p-6 rounded-2xl grid grid-cols-2 gap-4"
            data-reveal
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            {[
              { label: "Coût par vote", value: "100 FCFA", color: "#e8c26a", Icon: Zap },
              { label: "Opérateurs acceptés", value: "MTN & Orange", color: "#a3e635", Icon: Smartphone },
              { label: "Mise à jour", value: "Temps réel", color: "#38bdf8", Icon: RefreshCw },
              { label: "Paiement sécurisé", value: "CamPay", color: "#c084fc", Icon: Lock },
              { label: "Date limite", value: "9 août 2026", color: "#fb923c", Icon: Clock },
              { label: "Votes illimités", value: "Pas de limite", color: "#4ade80", Icon: CheckCircle },
            ].map(({ label, value, color, Icon }) => (
              <div
                key={label}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: `${color}0d`, border: `1px solid ${color}20` }}
              >
                <Icon className="size-4 flex-none" style={{ color }} strokeWidth={1.5} />
                <div>
                  <span className="block text-xs font-bold" style={{ color }}>
                    {value}
                  </span>
                  <span className="block text-[10px] text-white/35 leading-tight">{label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 2 — Steps ═══ */}
      <section
        className="py-20"
        style={{
          background:
            "radial-gradient(ellipse 120% 80% at 50% 50%, rgba(92,45,134,0.08) 0%, transparent 70%), rgba(255,255,255,0.01)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-12">
          <div className="text-center mb-14">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#e8c26a] mb-3" data-reveal>Processus en 4 étapes</p>
            <h2
              className="text-white"
              data-reveal
              style={{
                fontFamily: "var(--font-orbitron), sans-serif",
                fontWeight: 700,
                fontSize: "clamp(1.5rem, 3.5vw, 2.5rem)",
                textTransform: "uppercase",
              }}
            >
              Comment voter <em style={{ color: "#e8c26a", fontStyle: "normal" }}>pas à pas.</em>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StepCard
              number="01"
              title="Choisissez"
              description="Parcourez la galerie des candidats Roi et Reine sur la page Candidats. Cliquez sur le profil de la personne que vous souhaitez soutenir."
              Icon={Crown}
              color="#e8c26a"
              delay={0}
            />
            <StepCard
              number="02"
              title="Configurez"
              description="Dans la fenêtre de vote, choisissez le nombre de votes souhaités (1 vote = 100 FCFA), sélectionnez votre opérateur MTN ou Orange, et saisissez votre numéro de téléphone."
              Icon={Smartphone}
              color="#38bdf8"
              delay={100}
            />
            <StepCard
              number="03"
              title="Confirmez"
              description="Appuyez sur « Valider le vote ». Un prompt USSD apparaîtra sur votre téléphone. Saisissez votre code PIN secret pour autoriser le paiement Mobile Money."
              Icon={Lock}
              color="#c084fc"
              delay={200}
            />
            <StepCard
              number="04"
              title="C'est voté !"
              description="Dès que le paiement est validé, vos votes sont instantanément comptabilisés. Le classement se met à jour en temps réel — vous verrez la progression immédiatement."
              Icon={CheckCircle}
              color="#4ade80"
              delay={300}
            />
          </div>

          {/* Visual flow connector */}
          <div className="hidden lg:flex justify-center items-center mt-8 gap-0 max-w-3xl mx-auto">
            {["01", "02", "03", "04"].map((n, i) => (
              <div key={n} className="flex items-center">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs font-orbitron"
                  style={{ background: "#e8c26a20", border: "1px solid #e8c26a40", color: "#e8c26a" }}
                >
                  {n}
                </div>
                {i < 3 && (
                  <div className="h-px w-24" style={{ background: "linear-gradient(90deg, rgba(232,194,106,0.4), rgba(232,194,106,0.1))" }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 3 — Payment details ═══ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 md:px-12 py-20">
        <div className="text-center mb-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#e8c26a] mb-3" data-reveal>Tarification</p>
          <h2
            className="text-white"
            data-reveal
            style={{
              fontFamily: "var(--font-orbitron), sans-serif",
              fontWeight: 700,
              fontSize: "clamp(1.5rem, 3.5vw, 2.5rem)",
              textTransform: "uppercase",
            }}
          >
            Combien ça <em style={{ color: "#e8c26a", fontStyle: "normal" }}>coûte ?</em>
          </h2>
        </div>

        {/* Price table */}
        <div data-reveal className="overflow-hidden rounded-2xl border border-white/7">
          {/* Header */}
          <div className="grid grid-cols-3 text-center py-4 bg-white/4 border-b border-white/7">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Votes</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Montant</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Impact</span>
          </div>
          {[
            { votes: 1, fcfa: 100, note: "Un soutien symbolique" },
            { votes: 5, fcfa: 500, note: "Un vrai coup de pouce" },
            { votes: 10, fcfa: 1000, note: "Un soutien solide" },
            { votes: 20, fcfa: 2000, note: "Un engagement fort" },
            { votes: 50, fcfa: 5000, note: "Un soutien massif" },
            { votes: 100, fcfa: 10000, note: "Champion absolu !", highlight: true },
          ].map((row) => (
            <div
              key={row.votes}
              className="grid grid-cols-3 text-center py-4 border-b border-white/4 last:border-0 transition-colors"
              style={row.highlight ? { background: "rgba(232,194,106,0.05)", borderColor: "rgba(232,194,106,0.15)" } : {}}
            >
              <span className="font-bold font-orbitron" style={{ color: row.highlight ? "#e8c26a" : "rgba(255,255,255,0.8)" }}>
                {row.votes} vote{row.votes > 1 ? "s" : ""}
              </span>
              <span className="font-bold font-orbitron" style={{ color: row.highlight ? "#e8c26a" : "white" }}>
                {row.fcfa.toLocaleString("fr-FR")} FCFA
              </span>
              <span className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                {row.note}
              </span>
            </div>
          ))}
        </div>

        <p className="text-center text-xs mt-4" style={{ color: "rgba(255,255,255,0.3)" }}>
          Formule : nombre de votes × 100 FCFA = montant total débité
        </p>
      </section>

      {/* ═══ SECTION 4 — Security & trust ═══ */}
      <section
        className="py-20"
        style={{
          background:
            "radial-gradient(ellipse 100% 60% at 50% 100%, rgba(164,32,46,0.08) 0%, transparent 70%), rgba(255,255,255,0.01)",
        }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-12">
          <div className="text-center mb-12">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#e8c26a] mb-3" data-reveal>Sécurité &amp; confiance</p>
            <h2
              className="text-white"
              data-reveal
              style={{
                fontFamily: "var(--font-orbitron), sans-serif",
                fontWeight: 700,
                fontSize: "clamp(1.5rem, 3.5vw, 2.5rem)",
                textTransform: "uppercase",
              }}
            >
              Votre paiement est <em style={{ color: "#e8c26a", fontStyle: "normal" }}>100% sécurisé.</em>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                Icon: ShieldCheck,
                color: "#4ade80",
                title: "Aucune carte bancaire",
                desc: "Tous les paiements passent uniquement par Mobile Money. Pas de carte de crédit, pas de données bancaires sensibles à saisir.",
              },
              {
                Icon: Lock,
                color: "#38bdf8",
                title: "Paiement via CamPay",
                desc: "CamPay est une passerelle de paiement Mobile Money certifiée et reconnue au Cameroun, garantissant des transactions fiables.",
              },
              {
                Icon: RefreshCw,
                color: "#c084fc",
                title: "Votes vérifiés",
                desc: "Chaque vote n'est comptabilisé qu'après validation effective du paiement. Un paiement annulé = zéro vote ajouté.",
              },
            ].map(({ Icon, color, title, desc }) => (
              <motion.div
                key={title}
                data-reveal
                className="p-6 rounded-2xl flex flex-col gap-4"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}
                whileHover={{ y: -6 }}
                transition={{ type: "spring", stiffness: 240, damping: 18 }}
              >
                <motion.div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-none"
                  style={{ background: `${color}15`, border: `1px solid ${color}30` }}
                  whileHover={{ rotate: -10, scale: 1.08 }}
                  transition={{ type: "spring", stiffness: 300, damping: 12 }}
                >
                  <Icon className="size-6" style={{ color }} strokeWidth={1.5} />
                </motion.div>
                <div>
                  <h3 className="text-sm font-bold text-white font-orbitron uppercase tracking-wide mb-2">{title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 5 — Operators ═══ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 md:px-12 py-16">
        <div className="text-center mb-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#e8c26a] mb-3" data-reveal>Opérateurs acceptés</p>
          <h2
            className="text-white"
            data-reveal
            style={{
              fontFamily: "var(--font-orbitron), sans-serif",
              fontWeight: 700,
              fontSize: "clamp(1.4rem, 3vw, 2.2rem)",
              textTransform: "uppercase",
            }}
          >
            MTN MoMo <em style={{ color: "rgba(255,255,255,0.3)", fontStyle: "normal" }}>&amp;</em> Orange Money
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              name: "MTN Mobile Money",
              short: "MTN MoMo",
              color: "#f59e0b",
              prefix: ["67", "68", "650", "651", "652", "653", "654"],
              tip: "Assurez-vous d'avoir activé MoMo sur votre ligne MTN. USSD : *126#",
            },
            {
              name: "Orange Money",
              short: "Orange Money",
              color: "#f97316",
              prefix: ["69", "655", "656", "657", "658", "659"],
              tip: "Assurez-vous d'avoir activé Orange Money sur votre ligne Orange. USSD : #150*50#",
            },
          ].map(({ name, short, color, prefix, tip }) => (
            <motion.div
              key={name}
              data-reveal
              className="p-6 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${color}25` }}
              whileHover={{ y: -6 }}
              transition={{ type: "spring", stiffness: 240, damping: 18 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <motion.div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs"
                  style={{ background: `${color}20`, color, fontFamily: "var(--font-orbitron)" }}
                  animate={{ rotate: [0, -4, 0], scale: [1, 1.06, 1] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  {short.slice(0, 3).toUpperCase()}
                </motion.div>
                <div>
                  <h3 className="font-bold font-orbitron uppercase tracking-wide text-white text-sm m-0">{name}</h3>
                </div>
              </div>
              <div className="mb-4">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Préfixes reconnus
                </p>
                <div className="flex flex-wrap gap-2">
                  {prefix.map((p, idx) => (
                    <motion.span
                      key={p}
                      initial={{ opacity: 0, y: 6 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ delay: idx * 0.05, type: "spring", stiffness: 260, damping: 18 }}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono"
                      style={{ background: `${color}15`, color }}
                    >
                      {p}XXXXXXX
                    </motion.span>
                  ))}
                </div>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.38)" }}>
                {tip}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══ SECTION 6 — FAQ ═══ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 md:px-12 py-16 pb-24">
        <div className="text-center mb-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#e8c26a] mb-3" data-reveal>Questions fréquentes</p>
          <h2
            className="text-white"
            data-reveal
            style={{
              fontFamily: "var(--font-orbitron), sans-serif",
              fontWeight: 700,
              fontSize: "clamp(1.5rem, 3.5vw, 2.5rem)",
              textTransform: "uppercase",
            }}
          >
            Vous avez des <em style={{ color: "#e8c26a", fontStyle: "normal" }}>questions ?</em>
          </h2>
        </div>

        <div data-reveal>
          {FAQ.map((item, i) => (
            <FaqItem key={i} q={item.q} a={item.a} index={i} />
          ))}
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section
        className="py-20"
        style={{
          background:
            "radial-gradient(ellipse 120% 70% at 50% 50%, rgba(232,194,106,0.07) 0%, transparent 70%), rgba(255,255,255,0.01)",
        }}
      >
        <div className="max-w-2xl mx-auto px-4 text-center">
          <motion.div
            data-reveal
            className="inline-block"
            animate={{ scale: [1, 1.18, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <Star className="size-10 text-[#e8c26a]" strokeWidth={1.5} />
          </motion.div>
          <h2
            className="text-white mb-4"
            data-reveal
            style={{
              fontFamily: "var(--font-orbitron), sans-serif",
              fontWeight: 800,
              fontSize: "clamp(1.6rem, 4vw, 3rem)",
              textTransform: "uppercase",
              lineHeight: 1.1,
            }}
          >
            Prêt à voter ?
          </h2>
          <p className="text-base mb-10 leading-relaxed" data-reveal style={{ color: "rgba(255,255,255,0.45)" }}>
            Soutenez votre candidat favori maintenant. Chaque vote rapproche votre candidat du titre de{" "}
            <strong style={{ color: "#e8c26a" }}>Roi</strong> ou{" "}
            <strong style={{ color: "#d04a58" }}>Reine</strong> de la Balle Maskee 2026.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              href="/candidats"
              className="flex items-center justify-center gap-2.5 px-8 py-4 rounded-full font-bold uppercase tracking-widest text-sm transition-all duration-300 hover:opacity-90"
              style={{ background: "#e8c26a", color: "#101014" }}
            >
              <Crown className="size-4" />
              Voir les candidats
            </motion.a>
            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              href="/classement"
              className="flex items-center justify-center gap-2.5 px-8 py-4 rounded-full font-bold uppercase tracking-widest text-sm transition-all duration-300 hover:bg-white/8"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}
            >
              <Trophy className="size-4" />
              Voir le classement
            </motion.a>
          </div>
        </div>
      </section>
    </main>
  )
}
