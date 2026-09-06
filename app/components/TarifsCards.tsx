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
              ? "bg-gradient-to-b from-brass/25 to-parchment ring-2 ring-brass shadow-lg shadow-brass/10 scale-[1.03]"
              : "bg-parchment/95 ring-1 ring-brass/15"
          }`}
        >
          {p.recommande && (
            <span className="self-start text-[10px] font-bold uppercase tracking-wide bg-brass text-ink rounded-full px-2.5 py-1 mb-3">
              Le plus choisi
            </span>
          )}
          <h3 className="font-headline font-bold text-lg text-ink">{p.nom}</h3>
          <p className="text-xs mb-4 text-ink/60">{p.cible}</p>
          <p className="text-3xl font-extrabold mb-5 text-brass-dark">{p.prix}</p>
          <ul className="space-y-2 text-sm flex-1 text-ink/80">
            {p.details.map((d) => (
              <li key={d} className="flex items-start gap-2">
                <span className="text-brass-dark">✓</span>
                {d}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
