import type { Metadata } from "next"
import "../styles/globals.css"

export const metadata: Metadata = {
  title: "NB Dance Awards",
  description: "Une vitrine dédiée aux talents de la danse.",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body>{children}</body></html>
}
