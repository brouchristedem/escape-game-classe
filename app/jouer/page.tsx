"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getAllTeams } from "@/lib/data";
import { Team } from "@/lib/types";
import LoadingScreen from "@/app/components/LoadingScreen";

export default function ChoixEquipe() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);
  const continueRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    getAllTeams()
      .then(setTeams)
      .finally(() => setLoading(false));
  }, []);

  function selectionner(id: string) {
    setSelected(id);
    // Laisse le bouton de suite apparaître dans le DOM avant de défiler vers lui.
    requestAnimationFrame(() => {
      continueRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function commencer() {
    if (!selected) return;
    setNavigating(true);
    setTimeout(() => router.push(`/jouer/${selected}`), 500);
  }

  if (loading) return <LoadingScreen label="Chargement des équipes..." />;
  if (navigating) return <LoadingScreen label="Préparation de votre mission..." />;

  return (
    <main className="relative min-h-screen flex flex-col items-center overflow-hidden px-6 py-14 bg-white">
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-brand-blue/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-brand-navy/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        <h1 className="text-2xl font-extrabold mb-2 text-center text-brand-navy">Quelle est votre équipe ?</h1>
        <p className="text-sm text-slate-500 mb-8 text-center">Sélectionnez votre équipe pour démarrer l&apos;escape game.</p>

        {!loading && teams.length === 0 && (
          <p className="text-slate-500 mb-8 text-center max-w-sm">
            Aucune équipe n&apos;est encore configurée. Demandez à l&apos;organisateur de les créer dans l&apos;espace organisateur.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10 w-full">
          {teams.map((t) => {
            const isSelected = selected === t.id;
            return (
              <button
                key={t.id}
                onClick={() => selectionner(t.id)}
                className={`rounded-2xl px-4 py-3.5 text-left font-semibold transition-all duration-200 ring-1 ${
                  isSelected
                    ? "bg-gradient-to-r from-brand-blue to-brand-navy text-white shadow-lg shadow-brand-blue/30 ring-transparent scale-[1.02]"
                    : "bg-brand-blue-light/70 text-brand-navy ring-black/5 hover:ring-brand-blue/40 hover:-translate-y-0.5 hover:shadow-md"
                }`}
              >
                {t.nom}
                <span className={`block text-xs font-normal mt-0.5 ${isSelected ? "text-white/80" : "text-slate-500"}`}>
                  Salle : {t.salle}
                </span>
              </button>
            );
          })}
        </div>

        <button
          ref={continueRef}
          onClick={commencer}
          disabled={!selected}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-blue to-brand-navy px-8 py-3.5 text-lg font-semibold text-white shadow-lg shadow-brand-blue/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl disabled:translate-y-0 disabled:bg-none disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed"
        >
          Lancer l&apos;escape game
        </button>
      </div>
    </main>
  );
}
