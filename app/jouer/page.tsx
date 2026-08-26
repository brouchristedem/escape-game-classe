"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ChoixEquipe() {
  const router = useRouter();
  const [equipe, setEquipe] = useState<number | null>(null);

  const equipes = Array.from({ length: 10 }, (_, i) => i + 1);

  const commencer = () => {
    if (equipe) router.push(`/jouer/${equipe}`);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-white">
      <h1 className="text-2xl font-bold mb-2 text-center text-brand-navy">Quel est le numéro de votre équipe ?</h1>
      <p className="text-slate-500 text-sm mb-8 text-center">Demandez au Pilote de sélectionner le numéro affiché sur la feuille de salle.</p>
      <div className="grid grid-cols-5 gap-3 mb-10">
        {equipes.map((n) => (
          <button
            key={n}
            onClick={() => setEquipe(n)}
            className={`w-14 h-14 rounded-xl text-lg font-semibold transition border ${
              equipe === n
                ? "bg-brand-blue border-brand-blue text-white"
                : "bg-brand-blue-light border-brand-blue-light hover:border-brand-blue text-brand-navy"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <button
        onClick={commencer}
        disabled={!equipe}
        className="bg-brand-blue disabled:bg-slate-200 disabled:text-slate-400 hover:bg-brand-navy text-white font-semibold px-8 py-3 rounded-full text-lg transition disabled:cursor-not-allowed"
      >
        Lancer l&apos;escape game
      </button>
    </main>
  );
}
