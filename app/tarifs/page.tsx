import Link from "next/link";
import TarifsCards, { WHATSAPP_NUMERO } from "@/app/components/TarifsCards";

export default function Tarifs() {
  return (
    <main className="min-h-screen bg-white px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <Link href="/a-propos" className="text-sm text-brand-blue underline">
          ← À propos du développeur
        </Link>

        <div className="mt-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy">Créer votre propre jeu</h1>
          <p className="text-slate-500 mt-2 max-w-md mx-auto">
            Un prix unique par événement, sans abonnement : vous payez une fois, votre jeu est prêt à jouer.
          </p>
        </div>

        <div className="mt-10">
          <TarifsCards />
        </div>

        <p className="text-xs text-slate-400 text-center mt-6">
          Paiement par mobile money (Wave). Besoin d&apos;un format sur-mesure ou de plusieurs jeux à la suite ?
          Contactez-moi pour en discuter.
        </p>

        <div className="mt-6 flex justify-center">
          <a
            href={`https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent("Bonjour, je souhaite créer mon propre jeu sur la plateforme.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-brand-blue hover:bg-brand-navy text-white font-semibold text-sm px-6 py-3 rounded-full transition"
          >
            Créer mon jeu
          </a>
        </div>
      </div>
    </main>
  );
}
