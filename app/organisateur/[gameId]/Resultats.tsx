"use client";

// Résultats de la partie, visibles côté organisateur : durée, tentatives et
// classement final de chaque équipe, avec export CSV. S'appuie sur le même
// liveState que l'onglet "Classement" (voir Classement.tsx), complété des
// champs startedAt/finishedAt/totalTentatives publiés par la page de jeu.

import { useEffect, useState } from "react";
import { ecouterLiveState, reinitialiserStatistiques } from "@/lib/data";
import { Team, LiveState, normaliserReponse } from "@/lib/types";

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
  const [confirmation, setConfirmation] = useState(false);
  const [motConfirmation, setMotConfirmation] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);

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

  async function reinitialiser(teamId?: string, nomEquipe?: string) {
    setEnCours(true);
    setMessage(null);
    try {
      await reinitialiserStatistiques(gameId, teamId);
      setMessage({
        ok: true,
        texte: teamId ? `Statistiques de l'équipe ${nomEquipe} réinitialisées.` : "Statistiques de toute la partie réinitialisées.",
      });
      setConfirmation(false);
      setMotConfirmation("");
    } catch {
      setMessage({ ok: false, texte: "Échec de la réinitialisation. Vérifie ta connexion et tes droits sur ce jeu, puis réessaie." });
    } finally {
      setEnCours(false);
    }
  }

  function reinitialiserEquipe(team: Team) {
    if (
      window.confirm(
        `Réinitialiser les statistiques de l'équipe « ${team.nom} » ? Sa progression, sa durée et ses tentatives seront effacées. Cette action est irréversible.`
      )
    ) {
      reinitialiser(team.id, team.nom);
    }
  }

  if (teams.length === 0) {
    return <p className="text-ink/55 text-sm">Aucune équipe pour l&apos;instant.</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-ink/55">Mis à jour en direct pendant que les équipes jouent.</p>
        <button
          onClick={exporterCsv}
          className="bg-admin-blue hover:bg-admin-blue-dark text-ink text-sm font-semibold px-4 py-2 rounded-full transition"
        >
          Exporter en CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ink/45 border-b border-admin-blue/20">
              <th className="py-2 pr-4">Équipe</th>
              <th className="py-2 pr-4">Statut</th>
              <th className="py-2 pr-4">Démarré à</th>
              <th className="py-2 pr-4">Terminé à</th>
              <th className="py-2 pr-4">Durée</th>
              <th className="py-2 pr-4">Tentatives ratées</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => {
              const state = states[team.id] ?? null;
              const termine = state?.phase === "termine";
              const duree =
                state?.startedAt && state?.finishedAt ? formaterDuree(state.finishedAt - state.startedAt) : "—";
              return (
                <tr key={team.id} className="border-b border-admin-blue/10">
                  <td className="py-2 pr-4 font-medium text-ink">{team.nom}</td>
                  <td className={`py-2 pr-4 ${termine ? "text-green-600 font-semibold" : "text-ink/55"}`}>
                    {statutTexte(state)}
                  </td>
                  <td className="py-2 pr-4 text-ink/55">{state?.startedAt ? formaterHeure(state.startedAt) : "—"}</td>
                  <td className="py-2 pr-4 text-ink/55">{state?.finishedAt ? formaterHeure(state.finishedAt) : "—"}</td>
                  <td className="py-2 pr-4 text-ink/55">{duree}</td>
                  <td className="py-2 pr-4 text-ink/55">{state?.totalTentatives ?? 0}</td>
                  <td className="py-2 pr-4">
                    {state && (
                      <button
                        onClick={() => reinitialiserEquipe(team)}
                        disabled={enCours}
                        className="text-admin-blue-dark underline text-xs disabled:opacity-50"
                      >
                        Réinitialiser
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4">
        <p className="font-semibold text-stamp-red mb-1">Réinitialiser les statistiques</p>
        {!confirmation ? (
          <>
            <p className="text-sm text-ink/65 mb-3">
              Efface la progression, la durée et les tentatives de toutes les équipes, et retire l&apos;énigme
              surprise et les effets en cours. Les équipes, les circuits et les énigmes ne sont pas touchés.
            </p>
            <button
              onClick={() => {
                setMessage(null);
                setConfirmation(true);
              }}
              className="rounded-full border border-red-400 px-5 py-2 text-sm font-semibold text-stamp-red"
            >
              Réinitialiser toute la partie…
            </button>
          </>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink/75">
              Cette action est <strong>irréversible</strong>. Exporte d&apos;abord les résultats si tu veux les
              garder, et vérifie qu&apos;aucune équipe n&apos;est en train de jouer : une page de jeu encore ouverte
              republierait son ancien état.
            </p>
            <button onClick={exporterCsv} className="self-start text-sm underline text-admin-blue-dark">
              Exporter en CSV d&apos;abord
            </button>
            <label className="text-sm text-ink/75">
              Tape <strong>REINITIALISER</strong> pour confirmer :
              <input
                value={motConfirmation}
                onChange={(e) => setMotConfirmation(e.target.value)}
                className="mt-1 block w-full max-w-xs rounded-lg border border-admin-blue/30 bg-white px-3 py-2"
              />
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => reinitialiser()}
                disabled={enCours || normaliserReponse(motConfirmation) !== "reinitialiser"}
                className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {enCours ? "Réinitialisation..." : "Tout réinitialiser"}
              </button>
              <button
                onClick={() => {
                  setConfirmation(false);
                  setMotConfirmation("");
                }}
                disabled={enCours}
                className="rounded-full border border-admin-blue/30 px-5 py-2 text-sm text-ink/65"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
        {message && <p className={`mt-3 text-sm ${message.ok ? "text-green-600" : "text-stamp-red"}`}>{message.texte}</p>}
      </div>
    </div>
  );
}
