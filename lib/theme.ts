// Personnalisation d'un jeu : conversion des deux couleurs choisies par
// l'organisateur en variables CSS de l'identité "Grimoire" (voir
// app/globals.css), et contrôles de lisibilité.
//
// Le texte du jeu est sombre (encre) : le fond doit donc rester clair ou
// moyen. L'accent sert de remplissage aux boutons, avec du texte sombre
// dessus : il doit être assez clair pour rester lisible.

import type { CSSProperties } from "react";
import { Personnalisation } from "@/lib/types";

export const FOND_PAR_DEFAUT = "#e9dfc4";
export const ACCENT_PAR_DEFAUT = "#c9a04a";
const TEXTE_SOMBRE = "#2a1c12"; // --encre, couleur du texte sur le fond

const HEX = /^#[0-9a-f]{6}$/i;

function versRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function versHex([r, g, b]: [number, number, number]): string {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

// Mélange `hex` avec `cible` ; part = proportion de `cible` (0 à 1).
function melanger(hex: string, cible: string, part: number): string {
  const a = versRgb(hex);
  const b = versRgb(cible);
  return versHex([a[0] + (b[0] - a[0]) * part, a[1] + (b[1] - a[1]) * part, a[2] + (b[2] - a[2]) * part]);
}

function luminance(hex: string): number {
  const [r, g, b] = versRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Rapport de contraste WCAG entre deux couleurs (1 à 21).
export function contraste(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const CONTRASTE_FOND_MIN = 7;
const CONTRASTE_ACCENT_MIN = 4.5;

// Renvoie un message d'erreur si les couleurs rendraient le jeu illisible,
// sinon null.
export function verifierCouleurs(fond: string, accent: string): string | null {
  if (!HEX.test(fond) || !HEX.test(accent)) return "Couleur invalide.";
  if (contraste(fond, TEXTE_SOMBRE) < CONTRASTE_FOND_MIN) {
    return "La couleur de fond est trop sombre : le texte du jeu est sombre, choisis une couleur plus claire.";
  }
  if (contraste(accent, TEXTE_SOMBRE) < CONTRASTE_ACCENT_MIN) {
    return "La couleur d'accent est trop sombre : le texte des boutons est sombre, choisis-en une plus claire ou plus vive.";
  }
  return null;
}

// Variables CSS à poser sur un conteneur ; vide si aucune couleur valide
// n'est définie (le thème par défaut de globals.css s'applique alors).
// Les anciennes personnalisations sombres (thème précédent) sont ignorées :
// avec le texte sombre actuel, elles rendraient le jeu illisible.
export function variablesTheme(p: Personnalisation | null | undefined): CSSProperties {
  const fond =
    p?.couleurFond && HEX.test(p.couleurFond) && contraste(p.couleurFond, TEXTE_SOMBRE) >= CONTRASTE_FOND_MIN
      ? p.couleurFond
      : null;
  const accent =
    p?.couleurAccent && HEX.test(p.couleurAccent) && contraste(p.couleurAccent, TEXTE_SOMBRE) >= CONTRASTE_ACCENT_MIN
      ? p.couleurAccent
      : null;
  const vars: Record<string, string> = {};
  if (fond) {
    vars["--parchemin"] = fond;
    vars["--parchemin-2"] = melanger(fond, TEXTE_SOMBRE, 0.07);
    vars["--velin"] = melanger(fond, "#ffffff", 0.75);
  }
  if (accent) {
    vars["--or"] = accent;
    vars["--or-clair"] = melanger(accent, "#ffffff", 0.4);
    vars["--or-fonce"] = melanger(accent, "#000000", 0.2);
  }
  return vars as CSSProperties;
}
