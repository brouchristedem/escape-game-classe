import Image from "next/image";
import Link from "next/link";
import fs from "fs";
import path from "path";
import { WHATSAPP_NUMERO } from "@/app/components/TarifsCards";
import GameLogo from "@/app/components/GameLogo";
import Reveal from "@/app/components/gsap/Reveal";
import SplitReveal from "@/app/components/gsap/SplitReveal";
import Parallax from "@/app/components/gsap/Parallax";


// Photo facultative : dépose un fichier à public/team/christ-edem.jpg (ou .png)
// et il remplacera automatiquement l'avatar par défaut ci-dessous, sans
// toucher au code. Formats acceptés, dans cet ordre de préférence :
const PHOTO_CANDIDATS = ["christ-edem.jpg", "christ-edem.jpeg", "christ-edem.png", "christ-edem.webp"];

function trouverPhoto(): string | null {
  for (const nom of PHOTO_CANDIDATS) {
    if (fs.existsSync(path.join(process.cwd(), "public", "team", nom))) {
      return `/team/${nom}`;
    }
  }
  return null;
}

export default async function AProposDuDeveloppeur({
  searchParams,
}: {
  searchParams: Promise<{ jeu?: string }>;
}) {
  const photo = trouverPhoto();
  // Si on arrive depuis la page de jeu (lien avec ?jeu=<gameId>), le retour
  // doit ramener à l'accueil du jeu, jamais à l'espace organisateur : un
  // joueur ne doit pas voir/pouvoir accéder à cet espace depuis cette page.
  const { jeu } = await searchParams;
  const retourHref = jeu ? `/g/${jeu}` : "/organisateur";

  return (
    <main className={`relative min-h-screen bg-brume px-6 py-12 overflow-hidden`}>
      <Parallax speed={-60} className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-lueur/30 blur-3xl" />
      <Parallax speed={70} className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-lueur/25 blur-3xl" />

      <div className="relative z-10 max-w-2xl mx-auto">
        <Link href={retourHref} className="text-sm text-acier underline">
          ← Retour à l&apos;accueil
        </Link>

        <div className="mt-8 flex flex-col items-center text-center">
          <Reveal y={20}>
            <GameLogo className="w-16 h-auto mb-6 drop-shadow-[0_6px_16px_rgba(8,16,40,0.5)]" />
          </Reveal>

          <Reveal>
            {photo ? (
              <div className="relative w-44 sm:w-52 rounded-2xl overflow-hidden ring-4 ring-acier/30 shadow-[0_18px_40px_-14px_rgba(8,16,40,0.45)]">
                <Image
                  src={photo}
                  alt="Christ Edem BROU"
                  width={480}
                  height={720}
                  className="w-full h-auto"
                  priority
                />
              </div>
            ) : (
              <div className="w-32 h-32 rounded-full bg-brume-2 flex items-center justify-center ring-4 ring-acier/30">
                <span className="font-headline text-3xl font-extrabold text-acier">CE</span>
              </div>
            )}
          </Reveal>

          <SplitReveal
            as="h1"
            text="Christ Edem BROU"
            type="words"
            className="font-headline mt-5 text-2xl font-bold text-nuit"
          />
          <Reveal delay={0.2}>
            <p className="text-acier font-medium text-sm mt-1">
              Développeur web, applications &amp; plateformes SaaS · Entrepreneur
            </p>
          </Reveal>
        </div>

        <Reveal
          as="section"
          stagger
          staggerAmount={0.15}
          className="cadre mt-10 bg-dalle rounded-2xl ring-1 ring-acier/25 shadow-[0_18px_40px_-14px_rgba(8,16,40,0.45)] p-6 text-nuit/80 leading-relaxed space-y-4"
        >
          <p>
            Actuellement en Licence 3 Logistique, je poursuis un parcours à la croisée de deux mondes qui me
            passionnent : l&apos;informatique, notamment l&apos;intelligence artificielle, et la logistique
            digitale.
          </p>
          <p>
            Cette plateforme est née d&apos;une envie simple : favoriser des moments d&apos;intégration et de
            complicité, entre étudiants d&apos;abord, mais aussi entre amis. Elle s&apos;adresse à toute
            personne souhaitant développer sa culture générale et son esprit d&apos;analyse en bonne
            compagnie, ainsi qu&apos;à tout organisateur désireux de créer son propre jeu et d&apos;en faire
            profiter d&apos;autres.
          </p>
          <p>
            Vous souhaitez créer votre propre jeu sur cette plateforme ?{" "}
            <Link href="/tarifs" className="text-acier-deep underline font-semibold">
              Voir les tarifs
            </Link>
            .
          </p>
          <p>
            Je suis également le développeur de{" "}
            <a
              href="https://moncvproci.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-acier-deep underline font-semibold"
            >
              MON CV PRO CI
            </a>
            , une application web SaaS permettant de créer des CV professionnels (15 modèles) avec aperçu en
            temps réel, export PDF et paiement mobile (Wave), déployée en production et utilisée par des
            clients réels en Côte d&apos;Ivoire.
          </p>
        </Reveal>

        <Reveal as="section" className="mt-6 flex flex-wrap gap-3 justify-center">
          <a
            href={`https://wa.me/${WHATSAPP_NUMERO}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gradient-to-r from-lueur to-lueur-fonce text-nuit font-semibold text-sm px-5 py-2.5 rounded-full shadow-md shadow-acier/20 transition hover:-translate-y-0.5"
          >
            Me contacter
          </a>
        </Reveal>
      </div>
    </main>
  );
}
