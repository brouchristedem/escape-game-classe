import Image from "next/image";
import Link from "next/link";
import fs from "fs";
import path from "path";
import { WHATSAPP_NUMERO } from "@/app/components/TarifsCards";

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
  const retourHref = jeu ? `/g/${jeu}` : "/admin";

  return (
    <main className="min-h-screen bg-white px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <Link href={retourHref} className="text-sm text-brand-blue underline">
          ← Retour à l&apos;accueil
        </Link>

        <div className="mt-8 flex flex-col items-center text-center">
          {photo ? (
            <div className="relative w-44 sm:w-52 rounded-2xl overflow-hidden ring-4 ring-brand-blue-light shadow-md">
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
            <div className="w-32 h-32 rounded-full bg-brand-blue-light flex items-center justify-center ring-4 ring-brand-blue-light">
              <span className="text-3xl font-extrabold text-brand-navy">CE</span>
            </div>
          )}

          <h1 className="mt-5 text-2xl font-extrabold text-brand-navy">Christ Edem BROU</h1>
          <p className="text-brand-blue font-medium text-sm mt-1">
            Développeur web, applications &amp; plateformes SaaS · Entrepreneur
          </p>
        </div>

        <section className="mt-10 bg-brand-blue-light rounded-2xl p-6 text-slate-700 leading-relaxed space-y-4">
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
            <Link href="/tarifs" className="text-brand-blue underline">
              Voir les tarifs
            </Link>
            .
          </p>
          <p>
            Je suis également le développeur de{" "}
            <a
              href="https://moncvpro-ci.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-blue underline"
            >
              MON CV PRO CI
            </a>
            , une application web SaaS permettant de créer des CV professionnels (15 modèles) avec aperçu en
            temps réel, export PDF et paiement mobile (Wave), déployée en production et utilisée par des
            clients réels en Côte d&apos;Ivoire.
          </p>
        </section>

        <section className="mt-6 flex flex-wrap gap-3 justify-center">
          <a
            href={`https://wa.me/${WHATSAPP_NUMERO}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-brand-blue hover:bg-brand-navy text-white font-semibold text-sm px-5 py-2.5 rounded-full transition"
          >
            Me contacter
          </a>
        </section>
      </div>
    </main>
  );
}
