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
