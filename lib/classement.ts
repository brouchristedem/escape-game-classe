// Logique de classement partagée entre l'onglet "Classement" de l'admin et
// l'écran de projection. Ordre : équipes ayant terminé (la plus rapide en
// tête, via updatedAt le plus ancien), puis équipes en cours (la plus
// avancée en tête), puis équipes n'ayant pas encore commencé.

import { updatedAtEnMillis } from "@/lib/data";
import { LiveState, Team } from "@/lib/types";

function rang(state: LiveState | null): number {
  if (!state) return 2;
  if (state.phase === "termine") return 0;
  return 1;
}

export function progression(state: LiveState | null): number {
  if (!state || !state.totalQuestions) return 0;
  return state.index / state.totalQuestions;
}

export function classerEquipes(teams: Team[], states: Record<string, LiveState | null>): Team[] {
  return [...teams].sort((a, b) => {
    const stateA = states[a.id] ?? null;
    const stateB = states[b.id] ?? null;
    const rangA = rang(stateA);
    const rangB = rang(stateB);
    if (rangA !== rangB) return rangA - rangB;
    if (rangA === 0) return updatedAtEnMillis(stateA?.updatedAt) - updatedAtEnMillis(stateB?.updatedAt);
    if (rangA === 1) return progression(stateB) - progression(stateA);
    return a.nom.localeCompare(b.nom);
  });
}
