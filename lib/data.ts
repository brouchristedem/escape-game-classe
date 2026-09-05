import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  onSnapshot,
  query,
  where,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  Question,
  Salle,
  QuizConfig,
  Team,
  LiveState,
  CHEF_LOCK_TIMEOUT_MS,
  GameStatus,
  GameMeta,
  TempsGeneral,
  TempsGeneralAjustement,
  BroadcastMessage,
} from "./types";

// --- Structure multi-tenant ---
// Chaque jeu vit sous games/{gameId}. Le document games/{gameId} lui-même
// porte la config (nom, histoire, texts, gameStatus) ; les questions,
// équipes et l'état en direct sont des sous-collections scopées à ce même
// gameId. Ça isole complètement les données d'un organisateur à l'autre :
// deux jeux ne se voient jamais l'un l'autre.
const GAMES_COL = "games";

function gameDoc(gameId: string) {
  return doc(db, GAMES_COL, gameId);
}
function questionsCol(gameId: string) {
  return collection(db, GAMES_COL, gameId, "questions");
}
function questionDoc(gameId: string, questionId: string) {
  return doc(db, GAMES_COL, gameId, "questions", questionId);
}
function teamsCol(gameId: string) {
  return collection(db, GAMES_COL, gameId, "teams");
}
function teamDoc(gameId: string, teamId: string) {
  return doc(db, GAMES_COL, gameId, "teams", teamId);
}
function liveStateDoc(gameId: string, teamId: string) {
  return doc(db, GAMES_COL, gameId, "liveState", teamId);
}

// --- Gestion des jeux (espace organisateur, vue d'ensemble) ---
// Un organisateur ne voit et ne peut créer que ses propres jeux (voir champ
// organizers sur le document games/{gameId}, vérifié aussi côté règles
// Firestore — voir firestore.rules).

export async function listerJeux(uid: string): Promise<GameMeta[]> {
  const snap = await getDocs(
    query(collection(db, GAMES_COL), where("organizers", "array-contains", uid))
  );
  return snap.docs
    .map((d) => {
      const data = d.data() as Partial<QuizConfig>;
      return {
        id: d.id,
        nom: data.nom ?? "Jeu sans nom",
        createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function creerJeu(nom: string, uid: string): Promise<string> {
  const ref = await addDoc(collection(db, GAMES_COL), {
    nom: nom.trim() || "Jeu sans nom",
    organizers: [uid],
    histoire: "",
    texts: {},
    gameStatus: "actif" as GameStatus,
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function supprimerJeu(gameId: string): Promise<void> {
  const [questions, teams] = await Promise.all([getAllQuestions(gameId), getAllTeams(gameId)]);
  await Promise.all([
    ...questions.map((q) => deleteQuestion(gameId, q.id)),
    ...teams.map((t) => deleteTeam(gameId, t.id)),
    deleteDoc(gameDoc(gameId)),
  ]);
}

// Pas de orderBy() côté Firestore ici : combiner where + orderBy sur des
// champs différents nécessite un index composite à créer manuellement dans
// la console Firebase. On trie donc côté application pour que ça marche
// sans configuration supplémentaire.
export async function getQuestionsForSalle(gameId: string, salle: Salle): Promise<Question[]> {
  const q = query(questionsCol(gameId), where("salle", "==", salle));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => {
      const data = d.data() as Omit<Question, "id">;
      return { id: d.id, ...data, salle: String(data.salle) };
    })
    .sort((a, b) => a.ordre - b.ordre);
}

export async function getAllQuestions(gameId: string): Promise<Question[]> {
  const snap = await getDocs(questionsCol(gameId));
  return snap.docs
    .map((d) => {
      const data = d.data() as Omit<Question, "id">;
      return { id: d.id, ...data, salle: String(data.salle) };
    })
    .sort((a, b) => a.salle.localeCompare(b.salle) || a.ordre - b.ordre);
}

export async function addQuestion(gameId: string, q: Omit<Question, "id">): Promise<string> {
  const ref = await addDoc(questionsCol(gameId), q);
  return ref.id;
}

export async function updateQuestion(gameId: string, id: string, q: Partial<Question>): Promise<void> {
  await updateDoc(questionDoc(gameId, id), q);
}

export async function deleteQuestion(gameId: string, id: string): Promise<void> {
  await deleteDoc(questionDoc(gameId, id));
}

// Renumérote automatiquement le "ordre" de toutes les étapes d'une salle
// (énigmes + pages code) selon l'ordre du tableau fourni (position = ordre).
// Utilisé par l'admin "Circuit du jeu" après un ajout, une suppression ou un
// déplacement, pour que la numérotation reste toujours 1, 2, 3... sans trou.
export async function renumeroterEtapes(gameId: string, orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map((id, i) => updateDoc(questionDoc(gameId, id), { ordre: i + 1 }))
  );
}

export async function getQuizConfig(gameId: string): Promise<QuizConfig> {
  const snap = await getDoc(gameDoc(gameId));
  if (!snap.exists()) {
    return { histoire: "", texts: {}, gameStatus: "actif" };
  }
  const data = snap.data() as QuizConfig;
  return {
    nom: data.nom,
    organizers: data.organizers ?? [],
    histoire: data.histoire ?? "",
    texts: data.texts ?? {},
    gameStatus: data.gameStatus ?? "actif",
    tempsGeneral: data.tempsGeneral ?? { finTimestamp: null },
    tempsGeneralAjustement: data.tempsGeneralAjustement ?? null,
    broadcast: data.broadcast ?? null,
  };
}

// merge: true pour ne jamais écraser un champ (ex. l'histoire) quand on ne
// sauvegarde que les fragments, ou l'inverse.
export async function saveQuizConfig(gameId: string, config: Partial<QuizConfig>): Promise<void> {
  await setDoc(gameDoc(gameId), config, { merge: true });
}

// Abonnement en temps réel à gameStatus (pause d'urgence de l'organisateur).
// Contrairement à getQuizConfig() (lecture ponctuelle), ceci permet de
// bloquer immédiatement une équipe déjà en train de jouer dès que
// l'organisateur appuie sur pause, sans attendre un rechargement de page.
// Retourne la fonction de désabonnement.
export function ecouterGameStatus(gameId: string, callback: (status: GameStatus) => void): () => void {
  return onSnapshot(gameDoc(gameId), (snap) => {
    const data = snap.exists() ? (snap.data() as QuizConfig) : null;
    callback(data?.gameStatus ?? "actif");
  });
}

// --- Chrono général (commun à toutes les équipes) et messages ponctuels ---
// Un seul abonnement pour les deux, pour éviter de multiplier les lectures
// Firestore en temps réel sur les pages de jeu.
export function ecouterTempsEtBroadcast(
  gameId: string,
  callback: (v: { tempsGeneral: TempsGeneral; tempsGeneralAjustement: TempsGeneralAjustement | null; broadcast: BroadcastMessage | null }) => void
): () => void {
  return onSnapshot(gameDoc(gameId), (snap) => {
    const data = snap.exists() ? (snap.data() as QuizConfig) : null;
    callback({
      tempsGeneral: data?.tempsGeneral ?? { finTimestamp: null },
      tempsGeneralAjustement: data?.tempsGeneralAjustement ?? null,
      broadcast: data?.broadcast ?? null,
    });
  });
}

// Démarre (ou remplace) le chrono général pour toutes les équipes.
export async function demarrerTempsGeneral(gameId: string, dureeSecondes: number): Promise<void> {
  await saveQuizConfig(gameId, { tempsGeneral: { finTimestamp: Date.now() + dureeSecondes * 1000 } });
}

// Arrête le chrono général (masqué chez toutes les équipes).
export async function arreterTempsGeneral(gameId: string): Promise<void> {
  await saveQuizConfig(gameId, { tempsGeneral: { finTimestamp: null } });
}

// Ajoute (ou retranche, avec un delta négatif) du temps au chrono général en
// cours, et publie une notification ("+10 min ajoutées") vue par toutes les
// équipes. Si aucun chrono n'est actif, ne fait rien.
export async function ajusterTempsGeneral(gameId: string, deltaSecondes: number): Promise<void> {
  const config = await getQuizConfig(gameId);
  const finActuelle = config.tempsGeneral?.finTimestamp;
  if (!finActuelle) return;
  await saveQuizConfig(gameId, {
    tempsGeneral: { finTimestamp: finActuelle + deltaSecondes * 1000 },
    tempsGeneralAjustement: { deltaSecondes, at: Date.now() },
  });
}

// Diffuse un message ponctuel par-dessus l'écran de toutes les équipes,
// pendant la durée indiquée, sans toucher à leur progression dans le
// circuit.
export async function envoyerBroadcast(gameId: string, texte: string, dureeSecondes: number): Promise<void> {
  await saveQuizConfig(gameId, {
    broadcast: { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, texte, dureeSecondes, envoyeAt: Date.now() },
  });
}

// --- Vider le scénario actuel ---
// Supprime toutes les énigmes/pages du circuit et remet à zéro le texte de
// l'histoire, pour repartir d'une page blanche avant d'importer son propre
// scénario. Les équipes ne sont pas touchées (gérées séparément dans
// l'onglet "Équipes & salles").
export async function viderScenario(gameId: string): Promise<void> {
  const existingQuestions = await getAllQuestions(gameId);
  await Promise.all(existingQuestions.map((q) => deleteQuestion(gameId, q.id)));
  await saveQuizConfig(gameId, { histoire: "" });
}

// --- Import d'un scénario personnalisé (texte extrait d'un Word ou PDF) ---
// Remplace toutes les énigmes existantes par celles du document fourni.
// L'histoire n'est écrasée que si le document en contient une (sinon la
// valeur déjà enregistrée est conservée).
// Crée aussi automatiquement une équipe par salle du document qui n'a pas
// encore d'équipe (les équipes existantes ne sont jamais touchées).
export async function importerScenario(
  gameId: string,
  parsed: {
    histoire: string | null;
    questions: Omit<Question, "id">[];
  }
): Promise<{ enigmes: number; equipesCreees: number }> {
  const existingQuestions = await getAllQuestions(gameId);
  await Promise.all(existingQuestions.map((q) => deleteQuestion(gameId, q.id)));
  await Promise.all(parsed.questions.map((q) => addQuestion(gameId, q)));

  if (parsed.histoire !== null) await saveQuizConfig(gameId, { histoire: parsed.histoire });

  // Une équipe par salle du document, seulement pour les salles qui n'ont
  // pas déjà une équipe (on ne duplique jamais, on ne touche pas à
  // l'existant).
  const sallesDuDocument = [...new Set(parsed.questions.map((q) => q.salle).filter(Boolean))];
  const equipesExistantes = await getAllTeams(gameId);
  const sallesDejaAttribuees = new Set(equipesExistantes.map((t) => t.salle));
  const nouvellesSalles = sallesDuDocument.filter((s) => !sallesDejaAttribuees.has(s));
  await Promise.all(nouvellesSalles.map((salle) => addTeam(gameId, { nom: salle, salle })));

  const questionsApres = await getAllQuestions(gameId);
  return { enigmes: questionsApres.length, equipesCreees: nouvellesSalles.length };
}

// --- Équipes ---

export async function getAllTeams(gameId: string): Promise<Team[]> {
  const snap = await getDocs(teamsCol(gameId));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Team, "id">) }))
    .sort((a, b) => a.nom.localeCompare(b.nom));
}

export async function getTeam(gameId: string, id: string): Promise<Team | null> {
  const snap = await getDoc(teamDoc(gameId, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Team, "id">) };
}

export async function addTeam(gameId: string, t: Omit<Team, "id">): Promise<string> {
  const ref = await addDoc(teamsCol(gameId), t);
  return ref.id;
}

export async function updateTeam(gameId: string, id: string, t: Partial<Team>): Promise<void> {
  await updateDoc(teamDoc(gameId, id), t);
}

export async function deleteTeam(gameId: string, id: string): Promise<void> {
  await deleteDoc(teamDoc(gameId, id));
}

// --- Suivi en direct (lecture seule) de l'écran du chef d'équipe ---

// Convertit le champ updatedAt (Timestamp Firestore serveur, ou nombre pour
// d'anciens documents écrits avant ce correctif) en millisecondes epoch.
function updatedAtEnMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === "number") return value;
  return 0;
}

// Écrit par le meneur à chaque changement d'état ; jamais rejeté (best effort,
// ça ne doit jamais bloquer le jeu du meneur si ça échoue). updatedAt est
// toujours réécrit avec l'horloge du serveur Firestore (pas celle de
// l'appareil) : deux téléphones peuvent avoir une horloge locale décalée,
// ce qui faussait la comparaison de fraîcheur utilisée par claimerChef.
export async function publierLiveState(gameId: string, teamId: string, state: LiveState): Promise<void> {
  try {
    await setDoc(liveStateDoc(gameId, teamId), { ...state, updatedAt: serverTimestamp() });
  } catch (e) {
    // best effort : le suivi en direct n'est pas critique pour le jeu du meneur,
    // mais on log pour pouvoir diagnostiquer (ex. règles Firestore non publiées).
    console.error("publierLiveState a échoué (suivi en direct désactivé pour cette mise à jour) :", e);
  }
}

// Tente de prendre la main en tant que chef d'équipe pour cette équipe.
// Refuse si un autre appareil a déjà la main et a donné signe de vie
// récemment (< CHEF_LOCK_TIMEOUT_MS) ; sinon prend (ou reprend) la main.
// Utilise une transaction pour éviter que deux appareils ne prennent la main
// en même temps.
//
// Important : la fraîcheur du verrou est comparée en utilisant l'horloge du
// serveur Firestore (updatedAt écrit via serverTimestamp()), jamais celle
// d'un autre appareil. Avant ce correctif, un téléphone A écrivait
// Date.now() avec SA propre horloge locale, et un téléphone B comparait
// cette valeur à SA propre horloge locale : si les deux horloges étaient
// décalées (fréquent sur des téléphones d'étudiants), le verrou pouvait
// sembler expiré alors qu'il ne l'était pas (ou l'inverse), permettant à
// deux chefs de se connecter par intermittence.
// Relit le dernier état publié pour une équipe (ex. après un rechargement de
// page) afin de reprendre le jeu là où il en était plutôt que de repartir de
// la première énigme.
export async function getLiveState(gameId: string, teamId: string): Promise<LiveState | null> {
  const snap = await getDoc(liveStateDoc(gameId, teamId));
  if (!snap.exists()) return null;
  return snap.data() as LiveState;
}

export async function claimerChef(
  gameId: string,
  teamId: string,
  sessionId: string
): Promise<{ ok: boolean }> {
  const ref = liveStateDoc(gameId, teamId);
  try {
    return await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists()) {
        const data = snap.data() as Partial<LiveState>;
        const dejaPrisParAutrui =
          !!data.chefSessionId &&
          data.chefSessionId !== sessionId &&
          Date.now() - updatedAtEnMillis(data.updatedAt) < CHEF_LOCK_TIMEOUT_MS;
        if (dejaPrisParAutrui) return { ok: false };
      }
      tx.set(ref, { chefSessionId: sessionId, updatedAt: serverTimestamp() }, { merge: true });
      return { ok: true };
    });
  } catch (e) {
    // Fail closed : si la transaction échoue (permissions, règles non
    // republiées, réseau...), on NE laisse PAS passer la revendication.
    // Un faux "ok: true" ici annulerait complètement le verrou et
    // permettrait à deux appareils de devenir chef en même temps.
    console.error("claimerChef a échoué, revendication refusée par sécurité :", e);
    return { ok: false };
  }
}

// Abonnement en lecture seule pour les membres de l'équipe qui suivent le
// meneur. Retourne la fonction de désabonnement.
export function ecouterLiveState(
  gameId: string,
  teamId: string,
  callback: (state: LiveState | null) => void
): () => void {
  return onSnapshot(liveStateDoc(gameId, teamId), (snap) => {
    callback(snap.exists() ? (snap.data() as LiveState) : null);
  });
}
