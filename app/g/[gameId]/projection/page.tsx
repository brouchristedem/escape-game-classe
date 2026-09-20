"use client";

// Écran de projection : classement en direct plein écran, pensé pour être
// lu de loin (vidéoprojecteur, amphi). Même source de données que l'onglet
// "Classement" de l'admin (liveState de chaque équipe), mêmes règles de tri.
// Le seul moment fort de l'écran : les lignes glissent à leur nouvelle place
// quand le classement change.

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ecouterLiveState, ecouterTempsEtBroadcast, getAllTeams, getQuizConfig } from "@/lib/data";
import { classerEquipes, progression } from "@/lib/classement";
import { LiveState, Team } from "@/lib/types";
import GameLogo from "@/app/components/GameLogo";
import LoadingScreen from "@/app/components/LoadingScreen";

function formaterDuree(totalSecondes: number): string {
  const s = Math.max(0, Math.round(totalSecondes));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function EcranProjection() {
  const params = useParams();
  const gameId = Array.isArray(params.gameId) ? params.gameId[0] : params.gameId;

  const [teams, setTeams] = useState<Team[] | null>(null);
  const [states, setStates] = useState<Record<string, LiveState | null>>({});
  const [nomJeu, setNomJeu] = useState("");
  const [finChrono, setFinChrono] = useState<number | null>(null);
  const [maintenant, setMaintenant] = useState(() => Date.now());
  const [plein, setPlein] = useState(false);

  // Équipes : chargées au départ puis rafraîchies de temps en temps, au cas
  // où l'organisateur en ajoute ou en renomme pendant la partie.
  useEffect(() => {
    if (!gameId) return;
    const charger = () => getAllTeams(gameId).then(setTeams).catch(() => {});
    charger();
    const id = setInterval(charger, 20_000);
    getQuizConfig(gameId).then((c) => setNomJeu(c.nom ?? "")).catch(() => {});
    const unsubTemps = ecouterTempsEtBroadcast(gameId, (v) => setFinChrono(v.tempsGeneral.finTimestamp));
    return () => {
      clearInterval(id);
      unsubTemps();
    };
  }, [gameId]);

  const idsEquipes = (teams ?? []).map((t) => t.id).join(",");
  useEffect(() => {
    if (!gameId || !teams) return;
    const unsubs = teams.map((t) =>
      ecouterLiveState(gameId, t.id, (s) => setStates((prev) => ({ ...prev, [t.id]: s })))
    );
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, idsEquipes]);

  // Horloge locale, lue une fois par seconde pour le décompte du chrono général.
  useEffect(() => {
    const id = setInterval(() => setMaintenant(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const secondesRestantes = finChrono ? Math.max(0, Math.round((finChrono - maintenant) / 1000)) : null;

  useEffect(() => {
    const maj = () => setPlein(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", maj);
    return () => document.removeEventListener("fullscreenchange", maj);
  }, []);

  if (!teams) return <LoadingScreen label="Chargement du classement..." />;

  const classees = classerEquipes(teams, states);
  const n = Math.max(classees.length, 1);
  const critique = secondesRestantes !== null && secondesRestantes > 0 && secondesRestantes <= 300;

  return (
    <main className="h-dvh flex flex-col bg-ink text-parchment overflow-hidden px-[3vw] py-[2.5vh]">
      <header className="flex items-center justify-between gap-6 pb-[2vh]">
        <div className="flex items-center gap-4 min-w-0">
          <GameLogo className="h-[9vh] w-auto shrink-0" />
          <h1 className="font-headline font-extrabold text-[min(5vh,4vw)] leading-tight truncate">
            {nomJeu || "Escape Game"}
          </h1>
        </div>
        {secondesRestantes !== null && (
          <div
            className={`font-codemono font-semibold text-[min(8vh,7vw)] leading-none rounded-xl px-[1.5vw] py-[1vh] border ${
              secondesRestantes === 0
                ? "border-stamp-red text-stamp-red"
                : critique
                  ? "border-stamp-red text-parchment animate-timer-critical"
                  : "border-brass/40 text-brass-light"
            }`}
            aria-label="Temps restant"
          >
            {secondesRestantes === 0 ? "Temps écoulé" : formaterDuree(secondesRestantes)}
          </div>
        )}
      </header>

      {classees.length === 0 ? (
        <p className="m-auto text-[min(4vh,3vw)] text-parchment/60">Aucune équipe pour l&apos;instant.</p>
      ) : (
        <ol
          className="relative flex-1 min-h-0"
          style={{ ["--n" as string]: n, ["--row" as string]: "min(calc(100% / var(--n)), 13vh)" }}
        >
          {classees.map((team, i) => {
            const state = states[team.id] ?? null;
            const termine = state?.phase === "termine";
            const commence = !!state;
            const pct = termine ? 100 : Math.round(progression(state) * 100);
            const duree =
              termine && state?.startedAt && state?.finishedAt
                ? formaterDuree((state.finishedAt - state.startedAt) / 1000)
                : null;

            return (
              <li
                key={team.id}
                className={`absolute left-0 right-0 flex items-center gap-[2vw] transition-[top] duration-700 ease-in-out motion-reduce:transition-none ${
                  commence ? "" : "opacity-50"
                }`}
                style={{ top: `calc(${i} * var(--row))`, height: "var(--row)" }}
              >
                <span
                  className={`font-headline font-extrabold w-[6vw] text-center text-[min(6vh,5vw)] ${
                    termine ? "text-brass" : "text-parchment/70"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-4 mb-[0.8vh]">
                    <p className="font-headline font-bold text-[min(4vh,3vw)] leading-tight truncate">{team.nom}</p>
                    <span className="font-codemono font-medium text-[min(2.8vh,2.2vw)] shrink-0 text-parchment/80">
                      {!commence
                        ? "En attente"
                        : termine
                          ? `Terminé${duree ? ` en ${duree}` : ""}`
                          : `Énigme ${state!.index + 1} / ${state!.totalQuestions}`}
                    </span>
                  </div>
                  <div className="h-[1.4vh] w-full rounded-full bg-ink-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-[width] duration-700 motion-reduce:transition-none ${
                        termine ? "bg-brass-light" : "bg-brass"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {!plein && (
        <button
          onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}
          className="fixed bottom-3 right-3 rounded-lg border border-brass/40 px-3 py-1.5 text-xs text-brass-light opacity-40 hover:opacity-100 focus-visible:opacity-100 transition-opacity"
        >
          Plein écran
        </button>
      )}
    </main>
  );
}
