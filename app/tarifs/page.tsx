import Link from "next/link";
import TarifsCards, { WHATSAPP_NUMERO } from "@/app/components/TarifsCards";
import GameLogo from "@/app/components/GameLogo";
import Reveal from "@/app/components/gsap/Reveal";
import SplitReveal from "@/app/components/gsap/SplitReveal";
import Parallax from "@/app/components/gsap/Parallax";


export default async function Tarifs({
  searchParams,
}: {
  searchParams: Promise<{ jeu?: string }>;
}) {
  const { jeu } = await searchParams;
  const retourHref = jeu ? `/g/${jeu}` : "/organisateur";

  return (
    <main className={`relative min-h-screen bg-fog px-6 py-12 overflow-hidden`}>
      <Parallax speed={-60} className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-signal/30 blur-3xl" />
      <Parallax speed={70} className="pointer-events-none absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-violet/20 blur-3xl" />

      <div className="relative z-10 max-w-3xl mx-auto">
        <Link href={retourHref} className="text-sm text-violet underline">
          ← Retour à l&apos;accueil
        </Link>

        <div className="mt-8 text-center flex flex-col items-center">
          <Reveal y={20}>
            <GameLogo className="w-16 h-auto mb-6 opacity-90" />
          </Reveal>
          <SplitReveal
            as="h1"
            text="Créer votre propre jeu"
            type="words"
            className="font-headline text-2xl sm:text-3xl font-bold text-nuit"
          />
          <Reveal delay={0.2}>
            <p className="text-nuit/70 mt-2 max-w-md mx-auto">
              Un prix unique par événement, sans abonnement : vous payez une fois, votre jeu est prêt à jouer.
            </p>
          </Reveal>
        </div>

        <div className="mt-10">
          <TarifsCards />
        </div>

        <Reveal>
          <p className="text-xs text-nuit/70 text-center mt-6">
            Paiement par mobile money (Wave). Besoin d&apos;un format sur-mesure ou de plusieurs jeux à la suite ?
            Contactez-moi pour en discuter.
          </p>
        </Reveal>

        <Reveal as="div" className="mt-6 flex justify-center">
          <a
            href={`https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent("Bonjour, je souhaite créer mon propre jeu sur la plateforme.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gradient-to-r from-signal to-signal-dark text-nuit font-semibold text-sm px-6 py-3 rounded-full shadow-md shadow-violet/20 transition hover:-translate-y-0.5"
          >
            Créer mon jeu
          </a>
        </Reveal>
      </div>
    </main>
  );
}
