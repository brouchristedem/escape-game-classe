export type Salle = 1 | 2 | 3;

export interface Question {
  id: string;
  salle: Salle;
  ordre: number;
  texte: string;
  propositions: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  feedbackCorrect: string;
  feedbackIncorrect: string;
  tempsLimite: number | null; // secondes, null = pas de limite
}

export interface QuizConfig {
  fragments: string[]; // index 0 = équipe 1, ... index 9 = équipe 10
}

export function salleForEquipe(equipe: number): Salle {
  if (equipe >= 1 && equipe <= 3) return 1;
  if (equipe >= 4 && equipe <= 7) return 2;
  return 3;
}
