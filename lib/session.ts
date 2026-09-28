// Identifiant de session persistant par appareil/navigateur. Sert à savoir si
// "cet" appareil est déjà le chef d'équipe en cours (pour reprendre sa place
// sans être bloqué, par ex. après un rechargement de page).
const KEY = "escape-game-session-id";

export function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(KEY, id);
  }
  return id;
}

// Marque, pour l'onglet en cours uniquement (sessionStorage), qu'une équipe a
// déjà démarré sa partie sur cet appareil. Sert à ne reprendre la
// progression (dernier état publié dans Firestore) qu'en cas de vrai
// rechargement de page dans le même onglet — et non lors d'une nouvelle
// visite (onglet fermé puis rouvert, ou lien réouvert plus tard), qui doit
// repartir de la première énigme.
function cleStartee(teamId: string): string {
  return `escape-game-started-${teamId}`;
}

export function aDejaDemarreCetteSession(teamId: string): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(cleStartee(teamId)) === "1";
}

export function marquerSessionDemarree(teamId: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(cleStartee(teamId), "1");
}

// Efface tous les repères "partie démarrée" de cet onglet. À appeler dès
// qu'un joueur revient sur l'accueil du jeu : la progression ne doit jamais
// être reprise automatiquement après un retour à l'accueil, même sans
// fermer l'onglet — seul un vrai rechargement de la page de jeu (F5) doit
// pouvoir reprendre la dernière énigme en cours.
export function oublierToutesLesSessions(): void {
  if (typeof window === "undefined") return;
  const clesAOublier: string[] = [];
  for (let i = 0; i < window.sessionStorage.length; i++) {
    const cle = window.sessionStorage.key(i);
    if (cle && cle.startsWith("escape-game-started-")) {
      clesAOublier.push(cle);
    }
  }
  clesAOublier.forEach((cle) => window.sessionStorage.removeItem(cle));
  // Progression hors-ligne (localStorage) : jamais conservée après un retour à l'accueil.
  const progressions: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const cle = window.localStorage.key(i);
    if (cle && cle.startsWith("escape_offline_progress_")) progressions.push(cle);
  }
  progressions.forEach((cle) => window.localStorage.removeItem(cle));
}

// Oublie le repère "partie démarrée" d'une seule équipe (appelé quand le
// joueur quitte la page de jeu : retour arrière, navigation ailleurs...).
export function oublierSession(teamId: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(cleStartee(teamId));
}

// Vrai uniquement si la page vient d'être rechargée (F5 / bouton actualiser).
// Toute autre arrivée (lien rouvert, retour arrière, onglet rouvert) est une
// nouvelle visite : la partie doit alors repartir du début, automatiquement.
export function estRechargementPage(): boolean {
  if (typeof window === "undefined" || typeof performance === "undefined") return false;
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return nav?.type === "reload";
}
