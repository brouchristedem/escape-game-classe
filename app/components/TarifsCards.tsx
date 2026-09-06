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

export const WHATSAPP_NUMERO = "2250545177571";

export default function TarifsCards() {
  return (
    <div className="grid sm:grid-cols-3 gap-5">
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
          <h3 className={`font-bold text-lg ${p.recommande ? "text-white" : "text-brand-navy"}`}>{p.nom}</h3>
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
  );
}
