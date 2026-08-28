// Nom de salle libre, choisi par l'organisateur (ex. "Amphi B", "TD1", "Salle 204").
export type Salle = string;

export type TypeEnigme = "qcm" | "libre";

export type UniteTemps = "secondes" | "minutes" | "heures";

export interface Team {
  id: string;
  nom: string; // nom de l'équipe (au lieu d'un numéro)
  salle: Salle; // salle attribuée par l'organisateur
  fragmentIndex: number | null; // index dans QuizConfig.fragments, null = pas encore attribué
}

export interface Question {
  id: string;
  salle: Salle;
  ordre: number;
  type: TypeEnigme;
  texte: string; // énoncé de l'énigme
  // Champs spécifiques QCM
  propositions?: [string, string, string, string];
  correctIndex?: 0 | 1 | 2 | 3;
  // Champ spécifique réponse libre
  reponse?: string; // réponse attendue (comparaison insensible à la casse/accents)
  feedbackCorrect: string;
  feedbackIncorrect: string;
  tempsLimite: number | null; // toujours stocké en secondes, null = pas de limite
}

export interface QuizConfig {
  fragments: string[]; // longueur = nombre de fragments choisi par l'organisateur
  histoire?: string; // texte affiché sur la page d'histoire, avant le choix de l'équipe
}

// Convertit une durée saisie dans une unité donnée en secondes (stockage interne).
export function versSecondes(valeur: number, unite: UniteTemps): number {
  if (unite === "minutes") return valeur * 60;
  if (unite === "heures") return valeur * 3600;
  return valeur;
}

// Reconvertit des secondes vers la meilleure unité d'affichage (secondes par défaut).
export function depuisSecondes(secondes: number, unite: UniteTemps): number {
  if (unite === "minutes") return secondes / 60;
  if (unite === "heures") return secondes / 3600;
  return secondes;
}

// Normalise une chaîne pour comparer les réponses libres (casse, accents, espaces).
export function normaliserReponse(texte: string): string {
  return texte
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}
