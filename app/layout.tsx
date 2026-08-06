import type { Metadata } from "next"
import { Orbitron, Plus_Jakarta_Sans } from "next/font/google"

import "../styles/globals.css"
import { SiteNavbar } from "@/components/ui/site-navbar"
import { AnimationProvider } from "@/components/providers/animation-provider"

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  variable: "--font-orbitron",
  display: "swap",
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Vote — Roi & Reine de Promo | Fête des Lauréats",
  description:
    "Votez pour élire le Roi et la Reine de promotion de la Fête des Lauréats du Collège Adventiste. 100 FCFA par vote — Mobile Money.",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${orbitron.variable} ${jakarta.variable}`}>
      <body className="antialiased">
        <SiteNavbar />
        <AnimationProvider>{children}</AnimationProvider>
      </body>
    </html>
  )
}
