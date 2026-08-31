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

// --- Suivi en direct (lecture seule) de l'écran du chef d'équipe ---
// Le meneur (celui qui répond) écrit son état à chaque changement ; les
// autres membres de l'équipe s'y abonnent en lecture seule depuis /suivre.
export interface LiveState {
  phase: "playing" | "termine";
  index: number;
  totalQuestions: number;
  questionTexte: string;
  questionType: TypeEnigme;
  propositions?: [string, string, string, string];
  selected: number | null;
  disabledOptions: number[];
  reponseLibre: string;
  feedbackText: string | null;
  feedbackOk: boolean | null;
  awaitingContinue: boolean;
  attempts: number;
  timeLeft: number | null;
  dernieresLettres: string | null;
  lettresMelangees: string[];
  saisieFragment: string;
  resultatFragment: "attente" | "trouve" | "revele";
  fragment: string;
  // Écrit côté serveur (voir serverTimestamp() dans lib/data.ts) pour éviter
  // toute dépendance à l'horloge locale d'un appareil ; peut apparaître
  // brièvement comme un objet Timestamp Firestore une fois lu depuis la base.
  updatedAt: number;
  // Identifiant de l'appareil qui a actuellement la main en tant que chef
  // d'équipe (voir claimerChef dans lib/data.ts). Sert à empêcher qu'un autre
  // appareil prenne le rôle de chef pendant qu'une partie est en cours.
  chefSessionId: string;
}

// Durée sans nouvelle activité du chef d'équipe (ms) au-delà de laquelle sa
// place est considérée libre (déconnexion, tab fermé...) et peut être reprise
// par un autre appareil.
export const CHEF_LOCK_TIMEOUT_MS = 45_000;

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

// Normalise une chaîne pour comparer les réponses libres (casse, accents, espaces,
// article initial). Les réponses attendues sont saisies avec article ("l'autorité",
// "la vision", "le contrat"...) mais une équipe répond souvent sans : les deux formes
// doivent être acceptées.
export function normaliserReponse(texte: string): string {
  return texte
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^(l'|le |la |les |un |une |des )/, "");
}

// Normalise un fragment de phrase (contrairement à normaliserReponse, ne
// retire pas l'article initial : on compare la phrase entière telle quelle,
// juste insensible à la casse, aux accents et aux espaces superflus).
export function normaliserFragment(texte: string): string {
  return texte
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

// --- Mécanique de déblocage progressif du fragment ---
// À chaque bonne réponse, l'équipe débloque une ou plusieurs lettres de son
// fragment (dans le désordre). Certaines énigmes ne débloquent rien. Le plan
// de déblocage est calculé de façon déterministe à partir de l'identifiant de
// l'équipe, pour rester stable même si la page est rechargée en cours de jeu.

function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Caractères "révélables" d'un fragment (lettres et chiffres, sans espaces ni
// ponctuation, qui restent visibles tels quels dans le résultat final).
export function extraireLettres(fragment: string): string[] {
  return Array.from(fragment).filter((c) => /[A-Za-zÀ-ÖØ-öø-ÿ0-9]/.test(c));
}

// Toutes les lettres du fragment, mélangées de façon déterministe (même
// mélange que le plan de déblocage). Utilisé pour afficher la totalité des
// lettres sur la page de reconstitution, même celles qui n'ont pas été
// débloquées pendant le jeu.
export function toutesLesLettresMelangees(fragment: string, seedKey: string): string[] {
  const rng = mulberry32(hashSeed(seedKey));
  return seededShuffle(extraireLettres(fragment), rng);
}

// --- Messages alternés selon la position de l'énigme (0-based) ---
const MESSAGES_ECHEC = ["ÈCHOUWEY", "RED FLAG"];
const MESSAGES_REUSSITE = ["GREEN FLAG", "C'EST TCHÔ", "JOLIIIIIE"];

export function messagePourEnigme(index: number, correct: boolean): string {
  return correct
    ? MESSAGES_REUSSITE[index % MESSAGES_REUSSITE.length]
    : MESSAGES_ECHEC[index % MESSAGES_ECHEC.length];
}

export interface PlanDeblocage {
  // Pour chaque énigme (même index que le tableau de questions), les lettres
  // débloquées si l'équipe répond correctement, ou null si rien n'est débloqué.
  parQuestion: (string | null)[];
}

export function calculerPlanDeblocage(
  fragment: string,
  nbQuestions: number,
  seedKey: string
): PlanDeblocage {
  const parQuestion: (string | null)[] = new Array(nbQuestions).fill(null);
  if (nbQuestions === 0) return { parQuestion };

  const rng = mulberry32(hashSeed(seedKey));
  const lettresMelangees = seededShuffle(extraireLettres(fragment), rng);
  const n = lettresMelangees.length;
  if (n === 0) return { parQuestion };

  if (n <= nbQuestions) {
    // On choisit n énigmes (sur nbQuestions) qui débloqueront une lettre
    // chacune ; les autres ne débloquent rien.
    const indicesChoisis = seededShuffle(
      Array.from({ length: nbQuestions }, (_, i) => i),
      rng
    )
      .slice(0, n)
      .sort((a, b) => a - b);
    indicesChoisis.forEach((qIdx, li) => {
      parQuestion[qIdx] = lettresMelangees[li];
    });
  } else {
    // Plus de lettres que d'énigmes : on répartit plusieurs lettres par
    // énigme, aussi équitablement que possible ; ici, aucune énigme ne
    // débloque "rien" puisqu'il faut caser toutes les lettres.
    let li = 0;
    for (let q = 0; q < nbQuestions; q++) {
      const restQuestions = nbQuestions - q;
      const restLettres = n - li;
      const count = Math.ceil(restLettres / restQuestions);
      parQuestion[q] = lettresMelangees.slice(li, li + count).join("");
      li += count;
    }
  }

  return { parQuestion };
}
