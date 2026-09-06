import Link from "next/link";
import { Bitter, IBM_Plex_Mono } from "next/font/google";
import TarifsCards, { WHATSAPP_NUMERO } from "@/app/components/TarifsCards";
import GameLogo from "@/app/components/GameLogo";

const bitter = Bitter({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-bitter", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-plexmono", display: "swap" });

export default async function Tarifs({
  searchParams,
}: {
  searchParams: Promise<{ jeu?: string }>;
}) {
  const { jeu } = await searchParams;
  const retourHref = jeu ? `/g/${jeu}` : "/admin";

  return (
    <main className={`${bitter.variable} ${plexMono.variable} relative min-h-screen bg-ink px-6 py-12 overflow-hidden`}>
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-brass/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-ink-2 blur-3xl" />

      <div className="relative z-10 max-w-3xl mx-auto">
        <Link href={retourHref} className="text-sm text-brass-light underline">
          ← Retour à l&apos;accueil
        </Link>

        <div className="mt-8 text-center flex flex-col items-center">
          <GameLogo className="w-16 h-auto mb-6 opacity-90" />
          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-parchment">Créer votre propre jeu</h1>
          <p className="text-parchment/60 mt-2 max-w-md mx-auto">
            Un prix unique par événement, sans abonnement : vous payez une fois, votre jeu est prêt à jouer.
          </p>
        </div>

        <div className="mt-10">
          <TarifsCards />
        </div>

        <p className="text-xs text-parchment/40 text-center mt-6">
          Paiement par mobile money (Wave). Besoin d&apos;un format sur-mesure ou de plusieurs jeux à la suite ?
          Contactez-moi pour en discuter.
        </p>

        <div className="mt-6 flex justify-center">
          <a
            href={`https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent("Bonjour, je souhaite créer mon propre jeu sur la plateforme.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gradient-to-r from-brass to-brass-dark text-ink font-semibold text-sm px-6 py-3 rounded-full shadow-md shadow-brass/20 transition hover:-translate-y-0.5"
          >
            Créer mon jeu
          </a>
        </div>
      </div>
    </main>
  );
}
