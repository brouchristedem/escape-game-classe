// Nom de salle libre, choisi par l'organisateur (ex. "Amphi B", "TD1", "Salle 204").
export type Salle = string;

// "code" = page intercalaire ajoutée librement dans le circuit par
// l'organisateur : un texte affiché en haut + un code à saisir pour débloquer
// la suite (pas de tentatives limitées, pas de temps limite, pas de lettre de
// fragment débloquée).
export type TypeEnigme = "qcm" | "libre" | "code";

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
  texte: string; // énoncé de l'énigme, ou texte affiché en haut d'une page "code"
  // Champs spécifiques QCM
  propositions?: [string, string, string, string];
  correctIndex?: 0 | 1 | 2 | 3;
  // Champ spécifique réponse libre ET page "code" (le code attendu est stocké ici)
  reponse?: string; // réponse/code attendu (comparaison insensible à la casse/accents)
  feedbackCorrect: string;
  feedbackIncorrect: string;
  tempsLimite: number | null; // toujours stocké en secondes, null = pas de limite ; ignoré pour type "code"
}

export interface QuizConfig {
  fragments: string[]; // longueur = nombre de fragments choisi par l'organisateur
  histoire?: string; // texte affiché sur la page d'histoire, avant le choix de l'équipe
  texts?: Partial<GameTexts>; // tous les autres textes du site, éditables depuis l'admin
}

// --- Tous les textes affichés sur les pages joueur (hors énoncés d'énigmes,
// qui restent gérés individuellement dans Question). Chaque champ a une
// valeur par défaut dans DEFAULT_GAME_TEXTS : tant que rien n'est modifié
// depuis l'admin, l'affichage est strictement identique à avant.
export interface GameTexts {
  accueilTitre: string;
  accueilSousTitre: string;
  accueilDescription: string;
  accueilBouton: string;
  accueilChargementLabel: string;

  histoireBouton: string;
  histoireChargementLabel: string;
  histoireNavigationLabel: string;

  equipeTitre: string;
  equipeSousTitre: string;
  equipeAucuneEquipe: string;
  equipeBoutonChef: string;
  equipeBoutonSuiveur: string;
  equipeErreurChef: string;
  equipeChargementLabel: string;
  equipeNavigationLabel: string;

  jeuChargementLabel: string;
  jeuErreurChefRefuse: string;
  jeuErreurAucuneEnigme: string;
  jeuErreurEquipeIntrouvable: string;
  jeuLabelValider: string;
  jeuLabelReessayer: string;
  jeuLabelEnigmeSuivante: string;
  jeuLabelVoirResultat: string;
  jeuTexteTempsEcoule: string;
  jeuTexteMauvaiseReponse: string;
  jeuTexteDerniereTentative: string;
  jeuTexteBonneReponseLabel: string;
  jeuTexteLettreDebloqueeTitre: string;
  jeuTexteLettreDebloqueeNote: string;
  jeuPlaceholderReponseLibre: string;

  codePagePlaceholder: string;
  codePageBouton: string;

  finTitre: string;
  finTexteReconstituer: string;
  finAucuneLettre: string;
  finPlaceholderSaisie: string;
  finLabelValiderFragment: string;
  finTexteDerniereTentative: string;
  finTexteTrouve: string;
  finTexteRevele: string;
  finTexteDirectionAmphi: string;

  suivreBanniere: string;
  suivreAttente: string;
  suivreChargementLabel: string;
  suivrePlaceholderReponse: string;
  suivrePlaceholderSaisie: string;
  suivreLettreTitre: string;
  suivreAttenteContinuer: string;

  messagesReussite: string[];
  messagesEchec: string[];
}

export const DEFAULT_GAME_TEXTS: GameTexts = {
  accueilTitre: "ESCAPE GAME DE L'IUA CLASSE X",
  accueilSousTitre: "Le jeu commence maintenant",
  accueilDescription:
    "Vous avez reçu une mission.\nVous ne connaissez pas encore la suite.\nÀ vous de la découvrir.",
  accueilBouton: "Commencer",
  accueilChargementLabel: "Ouverture de votre mission...",

  histoireBouton: "C'est parti",
  histoireChargementLabel: "Chargement de la mission...",
  histoireNavigationLabel: "Direction votre équipe...",

  equipeTitre: "Quelle est votre équipe ?",
  equipeSousTitre: "Sélectionnez votre équipe pour démarrer l'escape game.",
  equipeAucuneEquipe:
    "Aucune équipe n'est encore configurée. Demandez à l'organisateur de les créer dans l'espace organisateur.",
  equipeBoutonChef: "Je suis le chef d'équipe (je réponds)",
  equipeBoutonSuiveur: "Je suis dans l'équipe (je suis en direct)",
  equipeErreurChef:
    "Un chef d'équipe est déjà connecté pour cette équipe. Une seule personne peut répondre à la fois — choisissez plutôt « Je suis dans l'équipe ».",
  equipeChargementLabel: "Chargement des équipes...",
  equipeNavigationLabel: "Préparation de votre mission...",

  jeuChargementLabel: "Chargement de l'escape game...",
  jeuErreurChefRefuse:
    "Un autre appareil est déjà connecté en tant que chef d'équipe pour cette équipe. Une seule personne peut répondre à la fois.",
  jeuErreurAucuneEnigme:
    "Aucune énigme n'est encore configurée pour cette salle. Demandez à l'organisateur de les ajouter dans l'espace organisateur.",
  jeuErreurEquipeIntrouvable: "Équipe introuvable.",
  jeuLabelValider: "Valider",
  jeuLabelReessayer: "Réessayer",
  jeuLabelEnigmeSuivante: "Énigme suivante",
  jeuLabelVoirResultat: "Voir le résultat",
  jeuTexteTempsEcoule: "Temps écoulé !",
  jeuTexteMauvaiseReponse: "Mauvaise réponse.",
  jeuTexteDerniereTentative: "Dernière tentative pour cette énigme.",
  jeuTexteBonneReponseLabel: "Bonne réponse :",
  jeuTexteLettreDebloqueeTitre: "Bravo, vous avez débloqué une partie de votre fragment !",
  jeuTexteLettreDebloqueeNote: "Notez-la bien, elle vous servira à la fin.",
  jeuPlaceholderReponseLibre: "Votre réponse...",

  codePagePlaceholder: "Entrez le code...",
  codePageBouton: "Valider le code",

  finTitre: "Bravo, votre escape game est terminé !",
  finTexteReconstituer: "Voici toutes les lettres de votre fragment, mélangées. À vous de le reconstituer :",
  finAucuneLettre: "Aucune lettre à afficher.",
  finPlaceholderSaisie: "Reconstituez votre fragment...",
  finLabelValiderFragment: "Valider",
  finTexteDerniereTentative: "Dernière tentative !",
  finTexteTrouve: "Trouvé ! Votre fragment de la phrase finale :",
  finTexteRevele: "Pas trouvé cette fois, mais voici votre fragment de la phrase finale :",
  finTexteDirectionAmphi:
    "Direction l'amphi, épreuve finale ! Le Porte-parole garde ce fragment affiché jusqu'à ce qu'il soit posé au tableau.",

  suivreBanniere: "👀 Vous suivez l'écran du chef d'équipe en direct — lecture seule",
  suivreAttente:
    "Le chef d'équipe n'a pas encore démarré l'escape game. Cet écran se mettra à jour automatiquement dès qu'il commencera.",
  suivreChargementLabel: "Connexion à l'écran du chef d'équipe...",
  suivrePlaceholderReponse: "Le chef d'équipe répond ici...",
  suivrePlaceholderSaisie: "Le chef d'équipe saisit ici...",
  suivreLettreTitre: "Une partie du fragment vient d'être débloquée !",
  suivreAttenteContinuer: "Le chef d'équipe passe à la suite quand il est prêt.",

  messagesReussite: ["GREEN FLAG", "C'EST TCHÔ", "JOLIIIIIE"],
  messagesEchec: ["ÈCHOUWEY", "RED FLAG"],
};

// Fusionne les textes enregistrés (éventuellement partiels/absents) avec les
// valeurs par défaut, pour que la page joueur ait toujours une valeur affichable.
export function fusionnerTextes(partiel?: Partial<GameTexts> | null): GameTexts {
  return { ...DEFAULT_GAME_TEXTS, ...(partiel ?? {}) };
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
// Les listes sont éditables depuis l'admin (GameTexts.messagesReussite /
// messagesEchec) ; on retombe sur les valeurs par défaut si la liste
// enregistrée est vide.
export function messagePourEnigme(
  index: number,
  correct: boolean,
  messagesReussite: string[] = DEFAULT_GAME_TEXTS.messagesReussite,
  messagesEchec: string[] = DEFAULT_GAME_TEXTS.messagesEchec
): string {
  const listeReussite = messagesReussite.length ? messagesReussite : DEFAULT_GAME_TEXTS.messagesReussite;
  const listeEchec = messagesEchec.length ? messagesEchec : DEFAULT_GAME_TEXTS.messagesEchec;
  return correct ? listeReussite[index % listeReussite.length] : listeEchec[index % listeEchec.length];
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
