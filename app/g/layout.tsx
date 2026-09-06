import { Bitter, IBM_Plex_Mono } from "next/font/google";

// Polices de l'identité "Escape Game", réservées aux pages de jeu
// (/g/[gameId]/...) : l'espace organisateur (/admin) n'est pas concerné et
// garde sa police système habituelle.
const bitter = Bitter({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-bitter",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-plexmono",
  display: "swap",
});

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${bitter.variable} ${plexMono.variable}`}>{children}</div>;
}
