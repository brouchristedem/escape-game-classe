"use client";

// Bouton "Libérer le chef" d'une équipe : retire le verrou du chef sans
// effacer la progression, pour qu'un coéquipier reprenne depuis son
// téléphone (voir libererChef dans lib/data.ts). N'apparaît que si l'équipe a
// un chef enregistré et n'a pas terminé.

import { useState } from "react";
import { libererChef } from "@/lib/data";
import { LiveState, Team } from "@/lib/types";

export default function LibererChefBouton({
  gameId,
  team,
  state,
  className = "",
}: {
  gameId: string;
  team: Team;
  state: LiveState | null;
  className?: string;
}) {
  const [occupe, setOccupe] = useState(false);

  if (!state?.chefSessionId || state.phase === "termine") return null;

  async function liberer() {
    if (
      !window.confirm(
        `Libérer le chef de l'équipe « ${team.nom} » ?\n\nÀ faire seulement si son téléphone est éteint, perdu ou planté. Un coéquipier pourra ouvrir le jeu sur son téléphone et reprendre à l'énigme où l'équipe en était.`
      )
    ) {
      return;
    }
    setOccupe(true);
    try {
      await libererChef(gameId, team.id);
    } catch {
      window.alert("Impossible de libérer le chef. Vérifie ta connexion et réessaie.");
    } finally {
      setOccupe(false);
    }
  }

  return (
    <button
      onClick={liberer}
      disabled={occupe}
      className={`shrink-0 text-xs underline text-admin-blue-dark disabled:opacity-50 ${className}`}
    >
      {occupe ? "..." : "Libérer le chef"}
    </button>
  );
}
