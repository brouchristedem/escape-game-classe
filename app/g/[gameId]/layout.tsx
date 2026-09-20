import GameTheme from "@/app/components/GameTheme";

// Applique l'apparence propre à ce jeu (voir onglet "Apparence" de l'admin).
export default function JeuLayout({ children }: { children: React.ReactNode }) {
  return <GameTheme>{children}</GameTheme>;
}
