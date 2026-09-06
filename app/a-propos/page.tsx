import Image from "next/image";
import Link from "next/link";
import fs from "fs";
import path from "path";

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

export default function AProposDuDeveloppeur() {
  const photo = trouverPhoto();

  return (
    <main className="min-h-screen bg-white px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <Link href="/admin" className="text-sm text-brand-blue underline">
          ← Retour à l&apos;espace organisateur
        </Link>

        <div className="mt-8 flex flex-col items-center text-center">
          {photo ? (
            <div className="relative w-32 h-32 rounded-full overflow-hidden ring-4 ring-brand-blue-light">
              <Image src={photo} alt="Christ Edem" fill className="object-cover" sizes="128px" />
            </div>
          ) : (
            <div className="w-32 h-32 rounded-full bg-brand-blue-light flex items-center justify-center ring-4 ring-brand-blue-light">
              <span className="text-3xl font-extrabold text-brand-navy">CE</span>
            </div>
          )}

          <h1 className="mt-5 text-2xl font-extrabold text-brand-navy">Christ Edem</h1>
          <p className="text-brand-blue font-medium text-sm mt-1">
            Développeur indépendant — Côte d&apos;Ivoire
          </p>
        </div>

        <section className="mt-10 bg-brand-blue-light rounded-2xl p-6 text-slate-700 leading-relaxed space-y-4">
          {/*
            TODO (Christ) : remplace ce texte par ta propre présentation —
            ton parcours, ta motivation, ce que tu proposes. Écris-le comme
            tu le sentirais à l'oral, pas de style corporate obligatoire.
          */}
          <p>
            Bonjour, je m&apos;appelle Christ Edem. Je développe des outils web pour le marché ivoirien et
            ouest-africain, comme cet escape game digital et{" "}
            <a
              href="https://moncvpro-ci.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-blue underline"
            >
              MON CV PRO CI
            </a>
            .
          </p>
          <p>
            [Remplace ce paragraphe par ton propre texte de présentation : ton parcours, ce qui t&apos;a donné
            envie de créer cette plateforme, ce que tu proposes à ceux qui souhaitent l&apos;utiliser pour leur
            propre événement.]
          </p>
        </section>

        <section className="mt-6 flex flex-wrap gap-3 justify-center">
          {/*
            TODO (Christ) : ajoute ici tes vrais liens de contact (WhatsApp,
            e-mail, LinkedIn, Instagram...). Exemple ci-dessous, à adapter ou
            supprimer.
          */}
          <a
            href="mailto:brouchristedem@gmail.com"
            className="bg-brand-blue hover:bg-brand-navy text-white font-semibold text-sm px-5 py-2.5 rounded-full transition"
          >
            Me contacter
          </a>
        </section>
      </div>
    </main>
  );
}
