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
}
