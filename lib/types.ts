// Nom de salle libre, choisi par l'organisateur (ex. "Amphi B", "TD1", "Salle 204").
export type Salle = string;

// "code" = page intercalaire ajoutée librement dans le circuit par
// l'organisateur : un texte affiché en haut + un code à saisir pour débloquer
// la suite (pas de tentatives limitées, pas de temps limite).
// "info" = page vierge purement informative : un texte libre (avec **gras**
// possible) affiché à l'écran, avec un simple bouton pour continuer (pas de
// code à saisir, pas de temps limite).
export type TypeEnigme = "qcm" | "libre" | "code" | "info";

export type UniteTemps = "secondes" | "minutes" | "heures";

// État global du jeu, contrôlé par l'organisateur depuis l'admin (bouton
// pause d'urgence). "pause" bloque le circuit normal chez toutes les
// équipes en même temps (un écran de blocage s'affiche par-dessus l'énigme
// en cours) sans faire perdre leur progression : dès le retour à "actif",
// chaque équipe reprend exactement là où elle en était.
export type GameStatus = "actif" | "pause";

export interface Team {
  id: string;
  nom: string; // nom de l'équipe (au lieu d'un numéro)
  salle: Salle; // salle attribuée par l'organisateur
}

export interface Question {
  id: string;
  salle: Salle;
  ordre: number;
  type: TypeEnigme;
  texte: string; // énoncé de l'énigme, texte en haut d'une page "code", ou texte d'une page "info" (accepte **gras**)
  // Champs spécifiques QCM
  propositions?: [string, string, string, string];
  correctIndex?: 0 | 1 | 2 | 3;
  // Champ spécifique réponse libre ET page "code" (le code attendu est stocké ici) ; ignoré pour "info"
  reponse?: string; // réponse/code attendu (comparaison insensible à la casse/accents)
  feedbackCorrect: string;
  feedbackIncorrect: string;
  tempsLimite: number | null; // toujours stocké en secondes, null = pas de limite ; ignoré pour "code" et "info"
  // Fragment libre (texte choisi par l'organisateur, sans lien avec les
  // autres) affiché juste après une bonne réponse à CETTE énigme précise,
  // avec le même design que l'ancien écran "lettre débloquée". Vide/absent =
  // aucun fragment sur cette étape. Uniquement pertinent pour "qcm"/"libre".
  fragmentTexte?: string;
}

export interface QuizConfig {
  nom?: string; // nom du jeu, affiché dans la liste des jeux de l'organisateur
  createdAt?: number; // date de création (Date.now()), pour trier la liste des jeux
  histoire?: string; // texte affiché sur la page d'histoire, avant le choix de l'équipe
  texts?: Partial<GameTexts>; // tous les autres textes du site, éditables depuis l'admin
  gameStatus?: GameStatus; // absent = "actif" (rétrocompatible avec les parties déjà en cours)
}

// Résumé d'un jeu affiché dans la liste des jeux de l'organisateur
// (espace organisateur racine, avant de choisir un jeu à administrer).
export interface GameMeta {
  id: string;
  nom: string;
  createdAt: number;
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
  jeuTexteFragmentTitre: string;
  jeuPlaceholderReponseLibre: string;

  codePagePlaceholder: string;
  codePageBouton: string;

  infoPageBouton: string;

  finTitre: string;
  finSousTitre: string;

  suivreBanniere: string;
  suivreAttente: string;
  suivreChargementLabel: string;
  suivrePlaceholderReponse: string;
  suivreFragmentTitre: string;
  suivreAttenteContinuer: string;

  pauseTitre: string;
  pauseMessage: string;

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
  jeuTexteFragmentTitre: "Bravo, vous avez débloqué un fragment !",
  jeuPlaceholderReponseLibre: "Votre réponse...",

  codePagePlaceholder: "Entrez le code...",
  codePageBouton: "Valider le code",

  infoPageBouton: "Continuer",

  finTitre: "Bravo, votre escape game est terminé !",
  finSousTitre: "Merci d'avoir joué. Direction l'amphi pour la suite !",

  suivreBanniere: "👀 Vous suivez l'écran du chef d'équipe en direct — lecture seule",
  suivreAttente:
    "Le chef d'équipe n'a pas encore démarré l'escape game. Cet écran se mettra à jour automatiquement dès qu'il commencera.",
  suivreChargementLabel: "Connexion à l'écran du chef d'équipe...",
  suivrePlaceholderReponse: "Le chef d'équipe répond ici...",
  suivreFragmentTitre: "Un fragment vient d'être débloqué !",
  suivreAttenteContinuer: "Le chef d'équipe passe à la suite quand il est prêt.",

  pauseTitre: "Jeu en pause",
  pauseMessage:
    "L'organisateur a temporairement mis le jeu en pause. Ne quittez pas cette page, ça va reprendre très vite — votre progression est conservée.",

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
  // Fragment libre débloqué par la dernière bonne réponse (voir
  // Question.fragmentTexte), null si cette étape n'en débloque aucun.
  fragmentTexte: string | null;
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
