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
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-b from-indigo-950 via-indigo-900 to-slate-900 text-white">
      <h1 className="text-2xl font-bold mb-2 text-center">Quel est le numéro de votre équipe ?</h1>
      <p className="text-indigo-300 text-sm mb-8 text-center">Demandez au Pilote de sélectionner le numéro affiché sur la feuille de salle.</p>
      <div className="grid grid-cols-5 gap-3 mb-10">
        {equipes.map((n) => (
          <button
            key={n}
            onClick={() => setEquipe(n)}
            className={`w-14 h-14 rounded-xl text-lg font-semibold transition ${
              equipe === n
                ? "bg-amber-400 text-indigo-950"
                : "bg-indigo-800/60 hover:bg-indigo-700 text-white"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <button
        onClick={commencer}
        disabled={!equipe}
        className="bg-amber-400 disabled:bg-indigo-700 disabled:text-indigo-400 hover:bg-amber-300 text-indigo-950 font-semibold px-8 py-3 rounded-full text-lg transition disabled:cursor-not-allowed"
      >
        Lancer le quiz
      </button>
    </main>
  );
}
