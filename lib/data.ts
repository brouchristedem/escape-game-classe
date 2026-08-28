import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import { Question, Salle, QuizConfig, Team } from "./types";

const QUESTIONS_COL = "questions";
const TEAMS_COL = "teams";
const CONFIG_DOC = "config/quiz";

export async function getQuestionsForSalle(salle: Salle): Promise<Question[]> {
  const q = query(
    collection(db, QUESTIONS_COL),
    where("salle", "==", salle),
    orderBy("ordre", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as Omit<Question, "id">;
    return { id: d.id, ...data, salle: String(data.salle) };
  });
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

export async function getQuizConfig(): Promise<QuizConfig> {
  const snap = await getDoc(doc(db, CONFIG_DOC));
  if (!snap.exists()) {
    return { fragments: [], histoire: "" };
  }
  const data = snap.data() as QuizConfig;
  return { fragments: data.fragments ?? [], histoire: data.histoire ?? "" };
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
export async function importerScenarioParDefaut(): Promise<void> {
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

  // 3. Créer ou mettre à jour les équipes (par nom)
  const existingTeams = await getAllTeams();
  await Promise.all(
    TEAMS_SEED.map((t) => {
      const existing = existingTeams.find((e) => e.nom === t.nom);
      const payload = { nom: t.nom, salle: t.salle, fragmentIndex: t.fragmentIndex };
      return existing ? updateTeam(existing.id, payload) : addTeam(payload);
    })
  );

  // 4. Phrase finale + histoire
  await saveQuizConfig({ fragments: FRAGMENTS_SEED, histoire: HISTOIRE_TEXTE });
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
