import Link from "next/link";

const PALIERS = [
  {
    nom: "Petit événement",
    cible: "Entre amis, petit groupe",
    prix: "10 000 FCFA",
    details: ["Jusqu'à 5 équipes", "Jeu actif 14 jours", "Circuit d'énigmes personnalisé", "Import de votre propre scénario"],
  },
  {
    nom: "Événement moyen",
    cible: "École, classe, université",
    prix: "20 000 FCFA",
    details: ["Jusqu'à 15 équipes", "Jeu actif 14 jours", "Circuit d'énigmes personnalisé", "Import de votre propre scénario"],
    recommande: true,
  },
  {
    nom: "Grand événement",
    cible: "Entreprise, team building",
    prix: "50 000 FCFA",
    details: ["Équipes illimitées", "Jeu actif 14 jours", "Circuit d'énigmes personnalisé", "Accompagnement à la mise en place"],
  },
];

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

        <div className="mt-10 grid sm:grid-cols-3 gap-5">
          {PALIERS.map((p) => (
            <div
              key={p.nom}
              className={`rounded-2xl p-6 flex flex-col ${
                p.recommande
                  ? "bg-brand-navy text-white ring-2 ring-brand-blue shadow-lg scale-[1.03]"
                  : "bg-brand-blue-light/60 ring-1 ring-black/5"
              }`}
            >
              {p.recommande && (
                <span className="self-start text-[10px] font-bold uppercase tracking-wide bg-brand-blue text-white rounded-full px-2.5 py-1 mb-3">
                  Le plus choisi
                </span>
              )}
              <h2 className={`font-bold text-lg ${p.recommande ? "text-white" : "text-brand-navy"}`}>{p.nom}</h2>
              <p className={`text-xs mb-4 ${p.recommande ? "text-white/70" : "text-slate-500"}`}>{p.cible}</p>
              <p className={`text-3xl font-extrabold mb-5 ${p.recommande ? "text-white" : "text-brand-navy"}`}>{p.prix}</p>
              <ul className={`space-y-2 text-sm flex-1 ${p.recommande ? "text-white/90" : "text-slate-600"}`}>
                {p.details.map((d) => (
                  <li key={d} className="flex items-start gap-2">
                    <span className={p.recommande ? "text-brand-blue-light" : "text-brand-blue"}>✓</span>
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-400 text-center mt-6">
          Paiement par mobile money (Wave). Besoin d&apos;un format sur-mesure ou de plusieurs jeux à la suite ?
          Contactez-moi pour en discuter.
        </p>

        <div className="mt-6 flex justify-center">
          <a
            href="mailto:brouchristedem@gmail.com?subject=Créer mon propre jeu"
            className="bg-brand-blue hover:bg-brand-navy text-white font-semibold text-sm px-6 py-3 rounded-full transition"
          >
            Me contacter pour créer mon jeu
          </a>
        </div>
      </div>
    </main>
  );
}
