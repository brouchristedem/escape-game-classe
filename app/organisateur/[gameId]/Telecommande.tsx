"use client";

// Mode télécommande : une version de l'admin pensée pour le téléphone, avec de
// gros boutons, pour piloter la partie en se déplaçant dans la salle
// (pause, chrono, message, événements surprise, équipes en direct, checklist).
// L'admin complète reste accessible : bouton "Admin complète" en haut.

import { useEffect, useState } from "react";
import {
  ajusterTempsGeneral,
  arreterTempsGeneral,
  demarrerTempsGeneral,
  ecouterGameStatus,
  ecouterLiveState,
  ecouterTempsEtBroadcast,
  envoyerBroadcast,
  saveQuizConfig,
  updatedAtEnMillis,
} from "@/lib/data";
import { classerEquipes, progression } from "@/lib/classement";
import { GameStatus, LiveState, Team } from "@/lib/types";
import Evenements from "./Evenements";
import ChecklistJourJ from "./ChecklistJourJ";
import LibererChefBouton from "./LibererChefBouton";

function formaterChrono(totalSecondes: number): string {
  const s = Math.max(0, Math.round(totalSecondes));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function ilYa(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `il y a ${s} s`;
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  return `il y a ${Math.floor(s / 3600)} h`;
}

const gros = "min-h-12 rounded-2xl px-4 text-base font-semibold disabled:opacity-50";

function Bloc({ titre, children, ouvert = false }: { titre: string; children: React.ReactNode; ouvert?: boolean }) {
  return (
    <details open={ouvert} className="rounded-2xl bg-admin-blue/5 ring-1 ring-admin-blue/20">
      <summary className="cursor-pointer select-none px-4 py-3.5 font-semibold text-ink">{titre}</summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

export default function Telecommande({
  gameId,
  teams,
  onQuitter,
}: {
  gameId: string;
  teams: Team[];
  onQuitter: () => void;
}) {
  const [statut, setStatut] = useState<GameStatus>("actif");
  const [finChrono, setFinChrono] = useState<number | null>(null);
  const [maintenant, setMaintenant] = useState(() => Date.now());
  const [states, setStates] = useState<Record<string, LiveState | null>>({});
  const [occupe, setOccupe] = useState(false);
  const [dureeDepart, setDureeDepart] = useState("60");
  const [texte, setTexte] = useState("");
  const [dureeMessage, setDureeMessage] = useState("10");
  const [messageEnvoye, setMessageEnvoye] = useState(false);

  useEffect(() => ecouterGameStatus(gameId, setStatut), [gameId]);
  useEffect(() => ecouterTempsEtBroadcast(gameId, (v) => setFinChrono(v.tempsGeneral.finTimestamp)), [gameId]);

  const cleEquipes = teams.map((t) => t.id).join(",");
  useEffect(() => {
    const unsubs = teams.map((t) => ecouterLiveState(gameId, t.id, (s) => setStates((prev) => ({ ...prev, [t.id]: s }))));
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, cleEquipes]);

  useEffect(() => {
    const id = setInterval(() => setMaintenant(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  async function agir(action: () => Promise<void>) {
    setOccupe(true);
    try {
      await action();
    } catch {
      window.alert("L'action a échoué. Vérifie ta connexion et réessaie.");
    } finally {
      setOccupe(false);
    }
  }

  function basculerPause() {
    const prochain: GameStatus = statut === "pause" ? "actif" : "pause";
    if (prochain === "pause" && !window.confirm("Mettre le jeu en pause pour toutes les équipes, maintenant ?")) return;
    agir(() => saveQuizConfig(gameId, { gameStatus: prochain }));
  }

  function demarrerChrono() {
    const minutes = Number(dureeDepart);
    if (!minutes || minutes <= 0) return;
    agir(() => demarrerTempsGeneral(gameId, minutes * 60));
  }

  function diffuser() {
    const t = texte.trim();
    const duree = Number(dureeMessage);
    if (!t || !duree || duree <= 0) return;
    agir(async () => {
      await envoyerBroadcast(gameId, t, duree);
      setMessageEnvoye(true);
      setTimeout(() => setMessageEnvoye(false), 3000);
    });
  }

  const enPause = statut === "pause";
  const secondesRestantes = finChrono ? (finChrono - maintenant) / 1000 : null;
  const classees = classerEquipes(teams, states);

  return (
    <div className="max-w-md mx-auto flex flex-col gap-4 pb-10">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-ink">📱 Télécommande</h1>
        <button onClick={onQuitter} className="rounded-full border border-admin-blue/30 px-4 py-2 text-sm text-ink">
          🖥️ Admin complète
        </button>
      </div>

      <div className={`rounded-2xl p-4 ring-2 ${enPause ? "bg-red-50 ring-red-300" : "bg-admin-blue/5 ring-admin-blue/20"}`}>
        <p className={`font-semibold mb-3 ${enPause ? "text-stamp-red" : "text-ink"}`}>
          {enPause ? "⏸️ Jeu en pause chez toutes les équipes" : "▶️ Jeu actif"}
        </p>
        <button
          onClick={basculerPause}
          disabled={occupe}
          className={`${gros} w-full text-white ${enPause ? "bg-green-600" : "bg-red-600"}`}
        >
          {enPause ? "Reprendre le jeu" : "Mettre en pause"}
        </button>
      </div>

      <div className="rounded-2xl p-4 ring-2 ring-admin-blue/20 bg-admin-blue/5">
        <p className="font-semibold text-ink mb-2">⏱️ Chrono général</p>
        {secondesRestantes !== null ? (
          <>
            <p className={`font-mono text-4xl font-semibold text-center mb-3 ${secondesRestantes <= 300 ? "text-stamp-red" : "text-ink"}`}>
              {secondesRestantes <= 0 ? "Temps écoulé" : formaterChrono(secondesRestantes)}
            </p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button onClick={() => agir(() => ajusterTempsGeneral(gameId, 600))} disabled={occupe} className={`${gros} bg-admin-blue text-ink`}>
                +10 min
              </button>
              <button onClick={() => agir(() => ajusterTempsGeneral(gameId, -600))} disabled={occupe} className={`${gros} bg-admin-blue text-ink`}>
                −10 min
              </button>
              <button onClick={() => agir(() => ajusterTempsGeneral(gameId, 60))} disabled={occupe} className={`${gros} bg-white ring-1 ring-admin-blue/30 text-ink`}>
                +1 min
              </button>
              <button onClick={() => agir(() => ajusterTempsGeneral(gameId, -60))} disabled={occupe} className={`${gros} bg-white ring-1 ring-admin-blue/30 text-ink`}>
                −1 min
              </button>
            </div>
            <button
              onClick={() => window.confirm("Arrêter le chrono général ? Il disparaîtra chez toutes les équipes.") && agir(() => arreterTempsGeneral(gameId))}
              disabled={occupe}
              className="w-full text-sm text-stamp-red underline py-2"
            >
              Arrêter le chrono
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={dureeDepart}
              onChange={(e) => setDureeDepart(e.target.value)}
              className="min-h-12 w-24 rounded-2xl border border-admin-blue/20 bg-white px-3 text-base"
            />
            <span className="text-ink/55">min</span>
            <button onClick={demarrerChrono} disabled={occupe} className={`${gros} flex-1 bg-admin-blue text-ink`}>
              Démarrer
            </button>
          </div>
        )}
      </div>

      <Bloc titre="📢 Message à toutes les équipes">
        <textarea
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          rows={3}
          placeholder="Message à afficher..."
          className="w-full rounded-2xl border border-admin-blue/20 bg-white px-3 py-2 text-base mb-2"
        />
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={dureeMessage}
            onChange={(e) => setDureeMessage(e.target.value)}
            className="min-h-12 w-20 rounded-2xl border border-admin-blue/20 bg-white px-3 text-base"
          />
          <span className="text-ink/55">secondes</span>
          <button onClick={diffuser} disabled={occupe || !texte.trim()} className={`${gros} flex-1 bg-violet-600 text-white`}>
            Diffuser
          </button>
        </div>
        {messageEnvoye && <p className="text-sm text-green-600 mt-2">Envoyé ✓</p>}
      </Bloc>

      <Bloc titre="⚡ Événements surprise">
        <Evenements gameId={gameId} teams={teams} />
      </Bloc>

      <Bloc titre={`👥 Équipes en direct (${teams.length})`} ouvert>
        {teams.length === 0 ? (
          <p className="text-sm text-ink/55">Aucune équipe pour l&apos;instant.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {classees.map((team, i) => {
              const state = states[team.id] ?? null;
              const termine = state?.phase === "termine";
              const pct = termine ? 100 : Math.round(progression(state) * 100);
              const activite = state?.updatedAt ? updatedAtEnMillis(state.updatedAt) : 0;
              return (
                <li key={team.id} className="rounded-xl bg-white ring-1 ring-admin-blue/20 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm text-ink truncate">
                      {i + 1}. {team.nom}
                    </p>
                    <span className={`text-xs font-semibold shrink-0 ${termine ? "text-green-600" : "text-ink/55"}`}>
                      {!state ? "Pas commencé" : termine ? "Terminé 🏁" : `Énigme ${state.index + 1} / ${state.totalQuestions}`}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-admin-blue/10 overflow-hidden my-1.5">
                    <div className={`h-full rounded-full ${termine ? "bg-green-500" : "bg-admin-blue"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs text-ink/55">
                    <span>{state && activite > 0 ? `Dernière activité ${ilYa(maintenant - activite)}` : "—"}</span>
                    <LibererChefBouton gameId={gameId} team={team} state={state} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Bloc>

      <Bloc titre="✅ Checklist jour J">
        <ChecklistJourJ gameId={gameId} teams={teams} />
      </Bloc>
    </div>
  );
}
