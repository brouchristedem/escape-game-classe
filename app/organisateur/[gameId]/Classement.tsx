"use client";

// Classement en direct des équipes, visible côté organisateur. S'abonne au
// liveState de chaque équipe (déjà utilisé par l'écran /suivre côté joueur)
// et met le classement à jour en temps réel, sans rechargement.
//
// Ordre d'affichage : équipes ayant terminé (la plus rapide en tête, via
// updatedAt le plus ancien), puis équipes en cours (la plus avancée en
// tête), puis équipes n'ayant pas encore commencé.

import { useEffect, useState } from "react";
import { ecouterLiveState } from "@/lib/data";
import { classerEquipes, progression } from "@/lib/classement";
import { Team, LiveState } from "@/lib/types";
import LibererChefBouton from "./LibererChefBouton";

export default function Classement({ gameId, teams }: { gameId: string; teams: Team[] }) {
  const [states, setStates] = useState<Record<string, LiveState | null>>({});

  useEffect(() => {
    const unsubs = teams.map((t) =>
      ecouterLiveState(gameId, t.id, (s) => {
        setStates((prev) => ({ ...prev, [t.id]: s }));
      })
    );
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, teams.map((t) => t.id).join(",")]);

  const classees = classerEquipes(teams, states);

  if (teams.length === 0) {
    return <p className="text-slate-500 text-sm">Aucune équipe pour l&apos;instant.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <a
        href={`/g/${gameId}/projection`}
        target="_blank"
        rel="noopener noreferrer"
        className="self-end text-sm font-semibold text-brand-navy underline underline-offset-2"
      >
        Ouvrir l&apos;écran de projection
      </a>
      {classees.map((team, i) => {
        const state = states[team.id] ?? null;
        const termine = state?.phase === "termine";
        const commence = !!state;
        const pct = termine ? 100 : Math.round(progression(state) * 100);

        return (
          <div key={team.id} className="bg-brand-blue-light rounded-xl p-4 flex items-center gap-4">
            <div
              className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${
                termine && i === 0 ? "bg-amber-400 text-white" : "bg-white text-brand-navy"
              }`}
            >
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <p className="font-medium text-sm text-brand-navy truncate">{team.nom}</p>
                <span
                  className={`text-xs font-semibold shrink-0 ${
                    termine ? "text-green-600" : commence ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  {!commence
                    ? "Pas commencé"
                    : termine
                      ? "Terminé 🏁"
                      : `Énigme ${state!.index + 1} / ${state!.totalQuestions}`}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${termine ? "bg-green-500" : "bg-brand-blue"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <LibererChefBouton gameId={gameId} team={team} state={state} />
          </div>
        );
      })}
    </div>
  );
}
