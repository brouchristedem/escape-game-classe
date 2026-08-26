"use client";

import { useEffect, useState } from "react";
import {
  getAllQuestions,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  getQuizConfig,
  saveQuizConfig,
} from "@/lib/data";
import { Question, Salle } from "@/lib/types";

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "integration2026";

const emptyForm = {
  salle: 1 as Salle,
  ordre: 1,
  texte: "",
  propositions: ["", "", "", ""] as [string, string, string, string],
  correctIndex: 0 as 0 | 1 | 2 | 3,
  feedbackCorrect: "",
  feedbackIncorrect: "",
  tempsLimite: "" as string | number,
};

export default function Admin() {
  const [unlocked, setUnlocked] = useState(false);
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (sessionStorage.getItem("admin_ok") === "1") setUnlocked(true);
  }, []);

  function tryUnlock() {
    if (pwd === ADMIN_PASSWORD) {
      sessionStorage.setItem("admin_ok", "1");
      setUnlocked(true);
    } else {
      setError("Mot de passe incorrect.");
    }
  }

  if (!unlocked) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-slate-950 text-white">
        <h1 className="text-xl font-semibold mb-4">Espace organisateur</h1>
        <input
          type="password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && tryUnlock()}
          placeholder="Mot de passe"
          className="bg-slate-800 rounded-lg px-4 py-2 mb-3 w-64 text-center"
        />
        <button onClick={tryUnlock} className="bg-amber-400 text-slate-950 font-semibold px-6 py-2 rounded-full">
          Entrer
        </button>
        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
      </main>
    );
  }

  return <AdminPanel />;
}

function AdminPanel() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [salleFiltre, setSalleFiltre] = useState<Salle>(1);
  const [fragments, setFragments] = useState<string[]>(Array(10).fill(""));
  const [savingFragments, setSavingFragments] = useState(false);
  const [tab, setTab] = useState<"questions" | "phrase">("questions");

  async function reload() {
    setLoading(true);
    const [qs, config] = await Promise.all([getAllQuestions(), getQuizConfig()]);
    setQuestions(qs);
    setFragments(config.fragments.length === 10 ? config.fragments : Array(10).fill(""));
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, []);

  function resetForm() {
    setForm({ ...emptyForm, salle: salleFiltre });
    setEditingId(null);
  }

  async function submitForm() {
    if (!form.texte.trim() || form.propositions.some((p) => !p.trim())) {
      alert("Merci de remplir la question et les 4 propositions.");
      return;
    }
    const payload = {
      salle: form.salle,
      ordre: Number(form.ordre) || 1,
      texte: form.texte.trim(),
      propositions: form.propositions.map((p) => p.trim()) as [string, string, string, string],
      correctIndex: form.correctIndex,
      feedbackCorrect: form.feedbackCorrect.trim(),
      feedbackIncorrect: form.feedbackIncorrect.trim(),
      tempsLimite: form.tempsLimite === "" ? null : Number(form.tempsLimite),
    };
    if (editingId) {
      await updateQuestion(editingId, payload);
    } else {
      await addQuestion(payload);
    }
    resetForm();
    reload();
  }

  function editQuestion(q: Question) {
    setForm({
      salle: q.salle,
      ordre: q.ordre,
      texte: q.texte,
      propositions: q.propositions,
      correctIndex: q.correctIndex,
      feedbackCorrect: q.feedbackCorrect,
      feedbackIncorrect: q.feedbackIncorrect,
      tempsLimite: q.tempsLimite ?? "",
    });
    setEditingId(q.id);
    setTab("questions");
  }

  async function removeQuestion(id: string) {
    if (!confirm("Supprimer cette question ?")) return;
    await deleteQuestion(id);
    reload();
  }

  async function saveFragments() {
    setSavingFragments(true);
    await saveQuizConfig({ fragments });
    setSavingFragments(false);
  }

  const questionsFiltrees = questions.filter((q) => q.salle === salleFiltre);

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 sm:px-8 py-8">
      <h1 className="text-2xl font-bold mb-1">Espace organisateur</h1>
      <p className="text-slate-400 text-sm mb-6">Quiz Semaine d&apos;Intégration</p>

      <div className="flex gap-2 mb-6">
        <TabButton active={tab === "questions"} onClick={() => setTab("questions")}>Questions</TabButton>
        <TabButton active={tab === "phrase"} onClick={() => setTab("phrase")}>Phrase finale</TabButton>
      </div>

      {tab === "phrase" && (
        <section className="max-w-xl">
          <p className="text-slate-300 mb-4 text-sm">
            Un fragment par équipe (1 à 10). Assemblés dans l&apos;ordre dans l&apos;amphi, ils forment la phrase finale.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {fragments.map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-slate-500 w-16 shrink-0 text-sm">Équipe {i + 1}</span>
                <input
                  value={f}
                  onChange={(e) => {
                    const next = [...fragments];
                    next[i] = e.target.value;
                    setFragments(next);
                  }}
                  className="bg-slate-800 rounded-lg px-3 py-2 flex-1"
                  placeholder={`Fragment ${i + 1}`}
                />
              </div>
            ))}
          </div>
          <button
            onClick={saveFragments}
            disabled={savingFragments}
            className="bg-amber-400 text-slate-950 font-semibold px-6 py-2 rounded-full"
          >
            {savingFragments ? "Enregistrement..." : "Enregistrer la phrase"}
          </button>
          <p className="text-slate-500 text-xs mt-4">
            Aperçu : {fragments.filter(Boolean).join(" ") || "(rien pour l'instant)"}
          </p>
        </section>
      )}

      {tab === "questions" && (
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Formulaire */}
          <section className="bg-slate-900 rounded-2xl p-5">
            <h2 className="font-semibold mb-4">{editingId ? "Modifier la question" : "Ajouter une question"}</h2>

            <label className="block text-sm text-slate-400 mb-1">Salle de TD</label>
            <select
              value={form.salle}
              onChange={(e) => setForm({ ...form, salle: Number(e.target.value) as Salle })}
              className="bg-slate-800 rounded-lg px-3 py-2 mb-3 w-full"
            >
              <option value={1}>TD1 (équipes 1-3)</option>
              <option value={2}>TD2 (équipes 4-7)</option>
              <option value={3}>TD3 (équipes 8-10)</option>
            </select>

            <label className="block text-sm text-slate-400 mb-1">Ordre d&apos;affichage</label>
            <input
              type="number"
              min={1}
              value={form.ordre}
              onChange={(e) => setForm({ ...form, ordre: Number(e.target.value) })}
              className="bg-slate-800 rounded-lg px-3 py-2 mb-3 w-full"
            />

            <label className="block text-sm text-slate-400 mb-1">Question</label>
            <textarea
              value={form.texte}
              onChange={(e) => setForm({ ...form, texte: e.target.value })}
              className="bg-slate-800 rounded-lg px-3 py-2 mb-3 w-full"
              rows={2}
            />

            <label className="block text-sm text-slate-400 mb-1">Propositions (cochez la bonne réponse)</label>
            {form.propositions.map((p, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <input
                  type="radio"
                  name="correct"
                  checked={form.correctIndex === i}
                  onChange={() => setForm({ ...form, correctIndex: i as 0 | 1 | 2 | 3 })}
                />
                <input
                  value={p}
                  onChange={(e) => {
                    const next = [...form.propositions] as [string, string, string, string];
                    next[i] = e.target.value;
                    setForm({ ...form, propositions: next });
                  }}
                  className="bg-slate-800 rounded-lg px-3 py-2 flex-1"
                  placeholder={`Proposition ${i + 1}`}
                />
              </div>
            ))}

            <label className="block text-sm text-slate-400 mb-1 mt-2">Texte affiché si bonne réponse</label>
            <input
              value={form.feedbackCorrect}
              onChange={(e) => setForm({ ...form, feedbackCorrect: e.target.value })}
              className="bg-slate-800 rounded-lg px-3 py-2 mb-3 w-full"
              placeholder="Bravo, c'est la bonne réponse !"
            />

            <label className="block text-sm text-slate-400 mb-1">Texte affiché si mauvaise réponse</label>
            <input
              value={form.feedbackIncorrect}
              onChange={(e) => setForm({ ...form, feedbackIncorrect: e.target.value })}
              className="bg-slate-800 rounded-lg px-3 py-2 mb-3 w-full"
              placeholder="Ce n'est pas ça, réessayez !"
            />

            <label className="block text-sm text-slate-400 mb-1">Temps limite (secondes, laisser vide = aucun)</label>
            <input
              type="number"
              min={5}
              value={form.tempsLimite}
              onChange={(e) => setForm({ ...form, tempsLimite: e.target.value })}
              className="bg-slate-800 rounded-lg px-3 py-2 mb-4 w-full"
              placeholder="Ex. 30"
            />

            <p className="text-slate-500 text-xs mb-4">
              Règle fixe du jeu : 2 tentatives par question, puis passage automatique à la question suivante.
            </p>

            <div className="flex gap-3">
              <button onClick={submitForm} className="bg-amber-400 text-slate-950 font-semibold px-6 py-2 rounded-full">
                {editingId ? "Enregistrer les modifications" : "Ajouter la question"}
              </button>
              {editingId && (
                <button onClick={resetForm} className="text-slate-400 underline text-sm">
                  Annuler
                </button>
              )}
            </div>
          </section>

          {/* Liste */}
          <section>
            <div className="flex gap-2 mb-4">
              {[1, 2, 3].map((s) => (
                <button
                  key={s}
                  onClick={() => setSalleFiltre(s as Salle)}
                  className={`px-4 py-1.5 rounded-full text-sm ${
                    salleFiltre === s ? "bg-amber-400 text-slate-950" : "bg-slate-800 text-slate-300"
                  }`}
                >
                  TD{s}
                </button>
              ))}
            </div>

            {loading && <p className="text-slate-400">Chargement...</p>}
            {!loading && questionsFiltrees.length === 0 && (
              <p className="text-slate-500 text-sm">Aucune question pour cette salle pour l&apos;instant.</p>
            )}

            <div className="flex flex-col gap-3">
              {questionsFiltrees.map((q) => (
                <div key={q.id} className="bg-slate-900 rounded-xl p-4">
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-medium text-sm">
                      #{q.ordre} — {q.texte}
                    </p>
                    <div className="flex gap-2 shrink-0 text-xs">
                      <button onClick={() => editQuestion(q)} className="text-amber-300 underline">
                        Modifier
                      </button>
                      <button onClick={() => removeQuestion(q.id)} className="text-red-400 underline">
                        Supprimer
                      </button>
                    </div>
                  </div>
                  <ul className="text-slate-400 text-xs mt-2 space-y-0.5">
                    {q.propositions.map((p, i) => (
                      <li key={i} className={i === q.correctIndex ? "text-green-400" : ""}>
                        {i === q.correctIndex ? "✓ " : "· "}
                        {p}
                      </li>
                    ))}
                  </ul>
                  {q.tempsLimite && (
                    <p className="text-slate-500 text-xs mt-1">Temps limite : {q.tempsLimite}s</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium ${
        active ? "bg-amber-400 text-slate-950" : "bg-slate-800 text-slate-300"
      }`}
    >
      {children}
    </button>
  );
}
