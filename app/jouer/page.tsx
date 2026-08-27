"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAllTeams } from "@/lib/data";
import { Team } from "@/lib/types";

export default function ChoixEquipe() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    getAllTeams()
      .then(setTeams)
      .finally(() => setLoading(false));
  }, []);

  const commencer = () => {
    if (selected) router.push(`/jouer/${selected}`);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-white">
      <h1 className="text-2xl font-bold mb-8 text-center text-brand-navy">Quelle est votre équipe ?</h1>

      {loading && <p className="text-slate-500 mb-8">Chargement des équipes...</p>}

      {!loading && teams.length === 0 && (
        <p className="text-slate-500 mb-8 text-center max-w-sm">
          Aucune équipe n&apos;est encore configurée. Demandez à l&apos;organisateur de les créer dans l&apos;espace organisateur.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10 w-full max-w-md">
        {teams.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelected(t.id)}
            className={`px-4 py-3 rounded-xl text-base font-semibold transition border text-left ${
              selected === t.id
                ? "bg-brand-blue border-brand-blue text-white"
                : "bg-brand-blue-light border-brand-blue-light hover:border-brand-blue text-brand-navy"
            }`}
          >
            {t.nom}
            <span className={`block text-xs font-normal mt-0.5 ${selected === t.id ? "text-white/80" : "text-slate-500"}`}>
              Salle : {t.salle}
            </span>
          </button>
        ))}
      </div>

      <button
        onClick={commencer}
        disabled={!selected}
        className="bg-brand-blue disabled:bg-slate-200 disabled:text-slate-400 hover:bg-brand-navy text-white font-semibold px-8 py-3 rounded-full text-lg transition disabled:cursor-not-allowed"
      >
        Lancer l&apos;escape game
      </button>
    </main>
  );
}
