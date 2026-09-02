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
import { Question, Salle, QuizConfig, Team, LiveState, CHEF_LOCK_TIMEOUT_MS } from "./types";

const QUESTIONS_COL = "questions";
const TEAMS_COL = "teams";
const CONFIG_DOC = "config/quiz";
const LIVE_STATE_COL = "liveState";

// Pas de orderBy() côté Firestore ici : combiner where + orderBy sur des
// champs différents nécessite un index composite à créer manuellement dans
// la console Firebase. On trie donc côté application pour que ça marche
// sans configuration supplémentaire.
export async function getQuestionsForSalle(salle: Salle): Promise<Question[]> {
  const q = query(collection(db, QUESTIONS_COL), where("salle", "==", salle));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => {
      const data = d.data() as Omit<Question, "id">;
      return { id: d.id, ...data, salle: String(data.salle) };
    })
    .sort((a, b) => a.ordre - b.ordre);
}

export async function getAllQuestions(): Promise<Question[]> {
  const snap = await getDocs(collection(db, QUESTIONS_COL));
  return snap.docs
    .map((d) => {
      const data = d.data() as Omit<Question, "id">;
      return { id: d.id, ...data, salle: String(data.salle) };
    })
    .sort((a, b) => a.salle.localeCompare(b.salle) || a.ordre - b.ordre);
}

export async function addQuestion(q: Omit<Question, "id">): Promise<string> {
  const ref = await addDoc(collection(db, QUESTIONS_COL), q);
  return ref.id;
}

export async function updateQuestion(id: string, q: Partial<Question>): Promise<void> {
  await updateDoc(doc(db, QUESTIONS_COL, id), q);
}

export async function deleteQuestion(id: string): Promise<void> {
  await deleteDoc(doc(db, QUESTIONS_COL, id));
}

// Renumérote automatiquement le "ordre" de toutes les étapes d'une salle
// (énigmes + pages code) selon l'ordre du tableau fourni (position = ordre).
// Utilisé par l'admin "Circuit du jeu" après un ajout, une suppression ou un
// déplacement, pour que la numérotation reste toujours 1, 2, 3... sans trou.
export async function renumeroterEtapes(orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map((id, i) => updateDoc(doc(db, QUESTIONS_COL, id), { ordre: i + 1 }))
  );
}

export async function getQuizConfig(): Promise<QuizConfig> {
  const snap = await getDoc(doc(db, CONFIG_DOC));
  if (!snap.exists()) {
    return { fragments: [], histoire: "", texts: {} };
  }
  const data = snap.data() as QuizConfig;
  return { fragments: data.fragments ?? [], histoire: data.histoire ?? "", texts: data.texts ?? {} };
}

// merge: true pour ne jamais écraser un champ (ex. l'histoire) quand on ne
// sauvegarde que les fragments, ou l'inverse.
export async function saveQuizConfig(config: Partial<QuizConfig>): Promise<void> {
  await setDoc(doc(db, CONFIG_DOC), config, { merge: true });
}

// --- Import du scénario par défaut ("Le Dossier Perdu") ---
// Remplace toutes les énigmes existantes, crée/actualise les 10 équipes
// (par nom), et enregistre la phrase finale + le texte de l'histoire.
// Tout reste ensuite modifiable normalement depuis l'espace organisateur.
export async function importerScenarioParDefaut(): Promise<{ equipes: number; enigmes: number }> {
  const { TEAMS_SEED, QUESTIONS_SEED, FRAGMENTS_SEED, HISTOIRE_TEXTE } = await import("./seed-data");

  // 1. Supprimer toutes les énigmes existantes
  const existingQuestions = await getAllQuestions();
  await Promise.all(existingQuestions.map((q) => deleteQuestion(q.id)));

  // 2. Ajouter les nouvelles énigmes (toutes en réponse libre)
  await Promise.all(
    QUESTIONS_SEED.map((q) =>
      addQuestion({
        salle: q.salle,
        ordre: q.ordre,
        type: "libre",
        texte: q.texte,
        reponse: q.reponse,
        feedbackCorrect: q.feedbackCorrect,
        feedbackIncorrect: q.feedbackIncorrect,
        tempsLimite: null,
      })
    )
  );

  // 3. Supprimer toutes les équipes existantes (évite les doublons dus à des
  //    noms qui ne correspondent pas exactement, ex. casse différente) puis
  //    recréer les 10 équipes du scénario.
  const existingTeams = await getAllTeams();
  await Promise.all(existingTeams.map((t) => deleteTeam(t.id)));
  await Promise.all(
    TEAMS_SEED.map((t) => addTeam({ nom: t.nom, salle: t.salle, fragmentIndex: t.fragmentIndex }))
  );

  // 4. Phrase finale + histoire
  await saveQuizConfig({ fragments: FRAGMENTS_SEED, histoire: HISTOIRE_TEXTE });

  // Vérification : relit ce qui a réellement été écrit, pour confirmation fiable.
  const [teamsApres, questionsApres] = await Promise.all([getAllTeams(), getAllQuestions()]);
  return { equipes: teamsApres.length, enigmes: questionsApres.length };
}

// --- Équipes ---

export async function getAllTeams(): Promise<Team[]> {
  const snap = await getDocs(collection(db, TEAMS_COL));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Team, "id">) }))
    .sort((a, b) => a.nom.localeCompare(b.nom));
}

export async function getTeam(id: string): Promise<Team | null> {
  const snap = await getDoc(doc(db, TEAMS_COL, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Team, "id">) };
}

export async function addTeam(t: Omit<Team, "id">): Promise<string> {
  const ref = await addDoc(collection(db, TEAMS_COL), t);
  return ref.id;
}

export async function updateTeam(id: string, t: Partial<Team>): Promise<void> {
  await updateDoc(doc(db, TEAMS_COL, id), t);
}

export async function deleteTeam(id: string): Promise<void> {
  await deleteDoc(doc(db, TEAMS_COL, id));
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
export async function publierLiveState(teamId: string, state: LiveState): Promise<void> {
  try {
    await setDoc(doc(db, LIVE_STATE_COL, teamId), { ...state, updatedAt: serverTimestamp() });
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
export async function claimerChef(
  teamId: string,
  sessionId: string
): Promise<{ ok: boolean }> {
  const ref = doc(db, LIVE_STATE_COL, teamId);
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
  teamId: string,
  callback: (state: LiveState | null) => void
): () => void {
  return onSnapshot(doc(db, LIVE_STATE_COL, teamId), (snap) => {
    callback(snap.exists() ? (snap.data() as LiveState) : null);
  });
}
