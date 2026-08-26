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
import { Question, Salle, QuizConfig } from "./types";

const QUESTIONS_COL = "questions";
const CONFIG_DOC = "config/quiz";

export async function getQuestionsForSalle(salle: Salle): Promise<Question[]> {
  const q = query(
    collection(db, QUESTIONS_COL),
    where("salle", "==", salle),
    orderBy("ordre", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Question, "id">) }));
}

export async function getAllQuestions(): Promise<Question[]> {
  const snap = await getDocs(collection(db, QUESTIONS_COL));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Question, "id">) }))
    .sort((a, b) => a.salle - b.salle || a.ordre - b.ordre);
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
    return { fragments: Array(10).fill("") };
  }
  const data = snap.data() as QuizConfig;
  return { fragments: data.fragments ?? Array(10).fill("") };
}

export async function saveQuizConfig(config: QuizConfig): Promise<void> {
  await setDoc(doc(db, CONFIG_DOC), config);
}
