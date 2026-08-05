"use client"

import { useState } from "react"

const categories = [
  "Danseur de l'année",
  "Danseuse de l'année",
  "Meilleur groupe",
  "Meilleur chorégraphe",
  "Performance web",
]

const highlights = [
  ["01", "Découvrez", "Explorez les catégories et les artistes qui font vibrer la danse."],
  ["02", "Célébrez", "Partagez vos coups de cœur avec votre communauté."],
  ["03", "Rayonnez", "Une interface conçue pour mettre chaque talent au premier plan."],
]

export default function Page() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="NB Dance Awards accueil">
          <span className="brand-mark">NB</span>
          <span>Dance<br />Awards</span>
        </a>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen}>
          Menu
        </button>
        <nav className={menuOpen ? "nav open" : "nav"}>
          <a href="#categories">Catégories</a>
          <a href="#experience">L'expérience</a>
          <a href="#contact">Contact</a>
        </nav>
      </header>

      <section id="top" className="hero">
        <p className="eyebrow">Première édition · Cameroun</p>
        <h1>La scène mérite<br /><em>sa lumière.</em></h1>
        <p className="hero-copy">NB Dance Awards célèbre la créativité, l'énergie et les artistes qui font avancer la culture de la danse.</p>
        <a className="button" href="#categories">Explorer les catégories <span>↓</span></a>
        <div className="orb orb-one" /><div className="orb orb-two" />
      </section>

      <section id="categories" className="section categories">
        <div className="section-intro"><p className="eyebrow">Les distinctions</p><h2>Des talents,<br />plusieurs scènes.</h2></div>
        <div className="category-grid">
          {categories.map((category, index) => <article className="category-card" key={category}><span>0{index + 1}</span><h3>{category}</h3><p>Une place pour les artistes qui inspirent le mouvement.</p></article>)}
        </div>
      </section>

      <section id="experience" className="section experience">
        <p className="eyebrow">L'expérience NB</p>
        <div className="experience-grid"><h2>Simple, vivant,<br /><em>mémorable.</em></h2><p>Cette version est une vitrine légère, pensée pour présenter l’univers du concours avec une navigation fluide sur tous les écrans.</p></div>
        <div className="steps">{highlights.map(([number, title, text]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>

      <footer id="contact"><div className="brand"><span className="brand-mark">NB</span><span>Dance<br />Awards</span></div><p>La culture danse en avant.</p><a href="mailto:contact@nbdanceawards.com">contact@nbdanceawards.com</a></footer>
    </main>
  )
}
