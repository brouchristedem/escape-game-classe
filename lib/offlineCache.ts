import { Question, QuizConfig, Team } from "./types";

// --- Mode hors-ligne ---
// Cache locale (localStorage) de tout ce qu'il faut pour jouer sans réseau :
// la config du jeu, la liste des équipes et les énigmes de chaque salle.
// Écrite automatiquement à chaque chargement réussi depuis Firestore ;
// relue uniquement quand une requête réseau échoue (voir lireCache()).
// Ce n'est pas une synchronisation : une équipe qui joue hors-ligne ne fait
// plus remonter sa progression en direct (suivi, pause, chrono général) tant
// qu'elle n'a pas retrouvé de connexion.
export interface CacheJeu {
  config: QuizConfig;
  teams: Team[];
  questionsParSalle: Record<string, Question[]>;
  cachedAt: number;
}

function cle(gameId: string): string {
  return `escape_offline_${gameId}`;
}

export function sauvegarderCache(gameId: string, data: Omit<CacheJeu, "cachedAt">): void {
  if (typeof window === "undefined") return;
  try {
    const payload: CacheJeu = { ...data, cachedAt: Date.now() };
    localStorage.setItem(cle(gameId), JSON.stringify(payload));
  } catch {
    // Best effort : un échec de cache ne doit jamais bloquer le jeu en ligne.
  }
}

export function lireCache(gameId: string): CacheJeu | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(cle(gameId));
    return raw ? (JSON.parse(raw) as CacheJeu) : null;
  } catch {
    return null;
  }
}

// Progression locale d'une équipe (index de l'énigme en cours), utilisée
// uniquement en mode hors-ligne (le mode en ligne utilise déjà Firestore
// liveState + sessionStorage, voir lib/session.ts).
function cleProgression(gameId: string, teamId: string): string {
  return `escape_offline_progress_${gameId}_${teamId}`;
}

export function sauvegarderProgressionHorsLigne(gameId: string, teamId: string, index: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(cleProgression(gameId, teamId), String(index));
  } catch {
    // best effort
  }
}

export function lireProgressionHorsLigne(gameId: string, teamId: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(cleProgression(gameId, teamId));
    return raw !== null ? Number(raw) : null;
  } catch {
    return null;
  }
}
