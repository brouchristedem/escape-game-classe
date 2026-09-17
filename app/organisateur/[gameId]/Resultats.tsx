"use client";

// Résultats de la partie, visibles côté organisateur : durée, tentatives et
// classement final de chaque équipe, avec export CSV. S'appuie sur le même
// liveState que l'onglet "Classement" (voir Classement.tsx), complété des
// champs startedAt/finishedAt/totalTentatives publiés par la page de jeu.

import { useEffect, useState } from "react";
import { ecouterLiveState } from "@/lib/data";
import { Team, LiveState } from "@/lib/types";

function formaterDuree(ms: number): string {
  const totalSecondes = Math.max(0, Math.round(ms / 1000));
  const min = Math.floor(totalSecondes / 60);
  const sec = totalSecondes % 60;
  return `${min} min ${sec.toString().padStart(2, "0")} s`;
}

function formaterHeure(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function statutTexte(state: LiveState | null): string {
  if (!state) return "Pas commencé";
  if (state.phase === "termine") return "Terminé";
  return `En cours (énigme ${state.index + 1}/${state.totalQuestions})`;
}

function champCsv(valeur: string): string {
  return `"${valeur.replace(/"/g, '""')}"`;
}

export default function Resultats({ gameId, teams }: { gameId: string; teams: Team[] }) {
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

  function exporterCsv() {
    const entetes = ["Équipe", "Statut", "Démarré à", "Terminé à", "Durée", "Tentatives ratées"];
    const lignes = teams.map((team) => {
      const state = states[team.id] ?? null;
      const duree = state?.startedAt && state?.finishedAt ? formaterDuree(state.finishedAt - state.startedAt) : "";
      return [
        team.nom,
        statutTexte(state),
        state?.startedAt ? formaterHeure(state.startedAt) : "",
        state?.finishedAt ? formaterHeure(state.finishedAt) : "",
        duree,
        String(state?.totalTentatives ?? 0),
      ]
        .map(champCsv)
        .join(",");
    });
    const csv = "\uFEFF" + [entetes.map(champCsv).join(","), ...lignes].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resultats-escape-game.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (teams.length === 0) {
    return <p className="text-slate-500 text-sm">Aucune équipe pour l&apos;instant.</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">Mis à jour en direct pendant que les équipes jouent.</p>
        <button
          onClick={exporterCsv}
          className="bg-brand-blue hover:bg-brand-navy text-white text-sm font-semibold px-4 py-2 rounded-full transition"
        >
          Exporter en CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-200">
              <th className="py-2 pr-4">Équipe</th>
              <th className="py-2 pr-4">Statut</th>
              <th className="py-2 pr-4">Démarré à</th>
              <th className="py-2 pr-4">Terminé à</th>
              <th className="py-2 pr-4">Durée</th>
              <th className="py-2 pr-4">Tentatives ratées</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => {
              const state = states[team.id] ?? null;
              const termine = state?.phase === "termine";
              const duree =
                state?.startedAt && state?.finishedAt ? formaterDuree(state.finishedAt - state.startedAt) : "—";
              return (
                <tr key={team.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-medium text-brand-navy">{team.nom}</td>
                  <td className={`py-2 pr-4 ${termine ? "text-green-600 font-semibold" : "text-slate-500"}`}>
                    {statutTexte(state)}
                  </td>
                  <td className="py-2 pr-4 text-slate-500">{state?.startedAt ? formaterHeure(state.startedAt) : "—"}</td>
                  <td className="py-2 pr-4 text-slate-500">{state?.finishedAt ? formaterHeure(state.finishedAt) : "—"}</td>
                  <td className="py-2 pr-4 text-slate-500">{duree}</td>
                  <td className="py-2 pr-4 text-slate-500">{state?.totalTentatives ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
