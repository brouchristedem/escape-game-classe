"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getAllQuestions,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  getQuizConfig,
  saveQuizConfig,
  getAllTeams,
  addTeam,
  updateTeam,
  deleteTeam,
} from "@/lib/data";
import { Question, Team, TypeEnigme, UniteTemps, versSecondes, depuisSecondes } from "@/lib/types";

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "integration2026";

const emptyQuestionForm = {
  salle: "",
  ordre: 1,
  type: "qcm" as TypeEnigme,
  texte: "",
  propositions: ["", "", "", ""] as [string, string, string, string],
  correctIndex: 0 as 0 | 1 | 2 | 3,
  reponse: "",
  feedbackCorrect: "",
  feedbackIncorrect: "",
  tempsValeur: "" as string | number,
  tempsUnite: "secondes" as UniteTemps,
};

const emptyTeamForm = {
  nom: "",
  salle: "",
  fragmentIndex: "" as string | number,
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
      <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-white">
        <h1 className="text-xl font-semibold mb-4 text-brand-navy">Espace organisateur</h1>
        <input
          type="password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && tryUnlock()}
          placeholder="Mot de passe"
          className="bg-brand-blue-light border border-brand-blue-light focus:border-brand-blue outline-none rounded-lg px-4 py-2 mb-3 w-64 text-center text-brand-navy"
        />
        <button onClick={tryUnlock} className="bg-brand-blue hover:bg-brand-navy text-white font-semibold px-6 py-2 rounded-full transition">
          Entrer
        </button>
        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
      </main>
    );
  }

  return <AdminPanel />;
}

function AdminPanel() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [fragments, setFragments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"equipes" | "questions" | "phrase">("equipes");

  const [teamForm, setTeamForm] = useState({ ...emptyTeamForm });
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

  const [qForm, setQForm] = useState({ ...emptyQuestionForm });
  const [editingQId, setEditingQId] = useState<string | null>(null);
  const [salleFiltre, setSalleFiltre] = useState<string>("");

  const [savingFragments, setSavingFragments] = useState(false);

  async function reload() {
    setLoading(true);
    const [ts, qs, config] = await Promise.all([getAllTeams(), getAllQuestions(), getQuizConfig()]);
    setTeams(ts);
    setQuestions(qs);
    setFragments(config.fragments);
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, []);

  // Salles connues = union des salles des équipes et des énigmes existantes
  const sallesConnues = useMemo(() => {
    const s = new Set<string>();
    teams.forEach((t) => t.salle && s.add(t.salle));
    questions.forEach((q) => q.salle && s.add(q.salle));
    return Array.from(s).sort();
  }, [teams, questions]);

  useEffect(() => {
    if (!salleFiltre && sallesConnues.length > 0) setSalleFiltre(sallesConnues[0]);
  }, [sallesConnues, salleFiltre]);

  // ---------- Équipes ----------

  function resetTeamForm() {
    setTeamForm({ ...emptyTeamForm });
    setEditingTeamId(null);
  }

  async function submitTeamForm() {
    if (!teamForm.nom.trim() || !teamForm.salle.trim()) {
      alert("Merci de donner un nom d'équipe et une salle.");
      return;
    }
    const payload = {
      nom: teamForm.nom.trim(),
      salle: teamForm.salle.trim(),
      fragmentIndex: teamForm.fragmentIndex === "" ? null : Number(teamForm.fragmentIndex),
    };
    if (editingTeamId) {
      await updateTeam(editingTeamId, payload);
    } else {
      await addTeam(payload);
    }
    resetTeamForm();
    reload();
  }

  function editTeam(t: Team) {
    setTeamForm({
      nom: t.nom,
      salle: t.salle,
      fragmentIndex: t.fragmentIndex ?? "",
    });
    setEditingTeamId(t.id);
    setTab("equipes");
  }

  async function removeTeam(id: string) {
    if (!confirm("Supprimer cette équipe ?")) return;
    await deleteTeam(id);
    reload();
  }

  // ---------- Énigmes ----------

  function resetQForm() {
    setQForm({ ...emptyQuestionForm, salle: salleFiltre });
    setEditingQId(null);
  }

  async function submitQForm() {
    if (!qForm.salle.trim() || !qForm.texte.trim()) {
      alert("Merci de remplir la salle et l'énigme.");
      return;
    }
    if (qForm.type === "qcm" && qForm.propositions.some((p) => !p.trim())) {
      alert("Merci de remplir les 4 propositions.");
      return;
    }
    if (qForm.type === "libre" && !qForm.reponse.trim()) {
      alert("Merci d'indiquer la réponse attendue.");
      return;
    }
    const tempsLimite =
      qForm.tempsValeur === "" ? null : versSecondes(Number(qForm.tempsValeur), qForm.tempsUnite);

    const base = {
      salle: qForm.salle.trim(),
      ordre: Number(qForm.ordre) || 1,
      type: qForm.type,
      texte: qForm.texte.trim(),
      feedbackCorrect: qForm.feedbackCorrect.trim(),
      feedbackIncorrect: qForm.feedbackIncorrect.trim(),
      tempsLimite,
    };
    const payload =
      qForm.type === "qcm"
        ? {
            ...base,
            propositions: qForm.propositions.map((p) => p.trim()) as [string, string, string, string],
            correctIndex: qForm.correctIndex,
          }
        : {
            ...base,
            reponse: qForm.reponse.trim(),
          };

    if (editingQId) {
      await updateQuestion(editingQId, payload);
    } else {
      await addQuestion(payload);
    }
    resetQForm();
    reload();
  }

  function editQuestion(q: Question) {
    setQForm({
      salle: q.salle,
      ordre: q.ordre,
      type: q.type,
      texte: q.texte,
      propositions: q.propositions ?? ["", "", "", ""],
      correctIndex: q.correctIndex ?? 0,
      reponse: q.reponse ?? "",
      feedbackCorrect: q.feedbackCorrect,
      feedbackIncorrect: q.feedbackIncorrect,
      tempsValeur: q.tempsLimite ?? "",
      tempsUnite: "secondes",
    });
    setEditingQId(q.id);
    setSalleFiltre(q.salle);
    setTab("questions");
  }

  async function removeQuestion(id: string) {
    if (!confirm("Supprimer cette énigme ?")) return;
    await deleteQuestion(id);
    reload();
  }

  // ---------- Phrase finale / fragments ----------

  function setNombreFragments(n: number) {
    const nb = Math.max(0, n);
    setFragments((prev) => {
      const next = [...prev];
      if (nb > next.length) {
        while (next.length < nb) next.push("");
      } else {
        next.length = nb;
      }
      return next;
    });
  }

  async function saveFragments() {
    setSavingFragments(true);
    await saveQuizConfig({ fragments });
    setSavingFragments(false);
  }

  const questionsFiltrees = questions.filter((q) => q.salle === salleFiltre);

  return (
    <main className="min-h-screen bg-white text-brand-navy px-4 sm:px-8 py-8">
      <h1 className="text-2xl font-bold mb-1">Espace organisateur</h1>
      <p className="text-slate-500 text-sm mb-6">Escape Game IUA Classe X</p>

      <div className="flex gap-2 mb-6 flex-wrap">
        <TabButton active={tab === "equipes"} onClick={() => setTab("equipes")}>Équipes &amp; salles</TabButton>
        <TabButton active={tab === "questions"} onClick={() => setTab("questions")}>Énigmes</TabButton>
        <TabButton active={tab === "phrase"} onClick={() => setTab("phrase")}>Phrase finale</TabButton>
      </div>

      {loading && <p className="text-slate-500">Chargement...</p>}

      {!loading && tab === "equipes" && (
        <div className="grid lg:grid-cols-2 gap-8">
          <section className="bg-brand-blue-light rounded-2xl p-5">
            <h2 className="font-semibold mb-4 text-brand-navy">{editingTeamId ? "Modifier l'équipe" : "Ajouter une équipe"}</h2>

            <label className="block text-sm text-slate-500 mb-1">Nom de l&apos;équipe</label>
            <input
              value={teamForm.nom}
              onChange={(e) => setTeamForm({ ...teamForm, nom: e.target.value })}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 mb-3 w-full"
              placeholder="Ex. Les Lions, Team Bassam..."
            />

            <label className="block text-sm text-slate-500 mb-1">Salle attribuée</label>
            <input
              value={teamForm.salle}
              onChange={(e) => setTeamForm({ ...teamForm, salle: e.target.value })}
              list="salles-existantes"
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 mb-3 w-full"
              placeholder="Ex. Amphi B, Salle 204, TD1..."
            />
            <datalist id="salles-existantes">
              {sallesConnues.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>

            <label className="block text-sm text-slate-500 mb-1">Fragment attribué (facultatif)</label>
            <select
              value={teamForm.fragmentIndex}
              onChange={(e) => setTeamForm({ ...teamForm, fragmentIndex: e.target.value })}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 mb-4 w-full"
            >
              <option value="">Aucun / pas encore attribué</option>
              {fragments.map((_, i) => (
                <option key={i} value={i}>
                  Fragment {i + 1}
                </option>
              ))}
            </select>

            <div className="flex gap-3">
              <button onClick={submitTeamForm} className="bg-brand-blue hover:bg-brand-navy text-white font-semibold px-6 py-2 rounded-full transition">
                {editingTeamId ? "Enregistrer les modifications" : "Ajouter l'équipe"}
              </button>
              {editingTeamId && (
                <button onClick={resetTeamForm} className="text-slate-500 underline text-sm">
                  Annuler
                </button>
              )}
            </div>
          </section>

          <section>
            {teams.length === 0 && <p className="text-slate-500 text-sm">Aucune équipe pour l&apos;instant.</p>}
            <div className="flex flex-col gap-3">
              {teams.map((t) => (
                <div key={t.id} className="bg-brand-blue-light rounded-xl p-4">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-medium text-sm text-brand-navy">{t.nom}</p>
                      <p className="text-slate-500 text-xs mt-1">Salle : {t.salle}</p>
                      <p className="text-slate-500 text-xs">
                        Fragment : {t.fragmentIndex !== null && t.fragmentIndex !== undefined ? `#${t.fragmentIndex + 1}` : "non attribué"}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0 text-xs">
                      <button onClick={() => editTeam(t)} className="text-brand-blue underline">
                        Modifier
                      </button>
                      <button onClick={() => removeTeam(t.id)} className="text-red-500 underline">
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {!loading && tab === "questions" && (
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Formulaire */}
          <section className="bg-brand-blue-light rounded-2xl p-5">
            <h2 className="font-semibold mb-4 text-brand-navy">{editingQId ? "Modifier l'énigme" : "Ajouter une énigme"}</h2>

            <label className="block text-sm text-slate-500 mb-1">Salle</label>
            <input
              value={qForm.salle}
              onChange={(e) => setQForm({ ...qForm, salle: e.target.value })}
              list="salles-existantes-q"
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 mb-3 w-full"
              placeholder="Ex. Amphi B, Salle 204, TD1..."
            />
            <datalist id="salles-existantes-q">
              {sallesConnues.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>

            <label className="block text-sm text-slate-500 mb-1">Ordre d&apos;affichage</label>
            <input
              type="number"
              min={1}
              value={qForm.ordre}
              onChange={(e) => setQForm({ ...qForm, ordre: Number(e.target.value) })}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 mb-3 w-full"
            />

            <label className="block text-sm text-slate-500 mb-1">Type d&apos;énigme</label>
            <div className="flex gap-2 mb-3">
              <TypeButton active={qForm.type === "qcm"} onClick={() => setQForm({ ...qForm, type: "qcm" })}>
                QCM
              </TypeButton>
              <TypeButton active={qForm.type === "libre"} onClick={() => setQForm({ ...qForm, type: "libre" })}>
                Réponse libre
              </TypeButton>
            </div>

            <label className="block text-sm text-slate-500 mb-1">Énigme</label>
            <textarea
              value={qForm.texte}
              onChange={(e) => setQForm({ ...qForm, texte: e.target.value })}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 mb-3 w-full"
              rows={2}
            />

            {qForm.type === "qcm" ? (
              <>
                <label className="block text-sm text-slate-500 mb-1">Propositions (cochez la bonne réponse)</label>
                {qForm.propositions.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <input
                      type="radio"
                      name="correct"
                      checked={qForm.correctIndex === i}
                      onChange={() => setQForm({ ...qForm, correctIndex: i as 0 | 1 | 2 | 3 })}
                      className="accent-brand-blue"
                    />
                    <input
                      value={p}
                      onChange={(e) => {
                        const next = [...qForm.propositions] as [string, string, string, string];
                        next[i] = e.target.value;
                        setQForm({ ...qForm, propositions: next });
                      }}
                      className="bg-white border border-slate-200 rounded-lg px-3 py-2 flex-1"
                      placeholder={`Proposition ${i + 1}`}
                    />
                  </div>
                ))}
              </>
            ) : (
              <>
                <label className="block text-sm text-slate-500 mb-1">Réponse attendue</label>
                <input
                  value={qForm.reponse}
                  onChange={(e) => setQForm({ ...qForm, reponse: e.target.value })}
                  className="bg-white border border-slate-200 rounded-lg px-3 py-2 mb-3 w-full"
                  placeholder="Réponse exacte attendue"
                />
                <p className="text-slate-500 text-xs mb-3">
                  La comparaison ignore majuscules/minuscules, accents et espaces superflus.
                </p>
              </>
            )}

            <label className="block text-sm text-slate-500 mb-1 mt-2">Texte affiché si bonne réponse</label>
            <input
              value={qForm.feedbackCorrect}
              onChange={(e) => setQForm({ ...qForm, feedbackCorrect: e.target.value })}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 mb-3 w-full"
              placeholder="Bravo, c'est la bonne réponse !"
            />

            <label className="block text-sm text-slate-500 mb-1">Texte affiché si mauvaise réponse</label>
            <input
              value={qForm.feedbackIncorrect}
              onChange={(e) => setQForm({ ...qForm, feedbackIncorrect: e.target.value })}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 mb-3 w-full"
              placeholder="Ce n'est pas ça, réessayez !"
            />

            <label className="block text-sm text-slate-500 mb-1">Temps limite (laisser vide = aucun)</label>
            <div className="flex gap-2 mb-4">
              <input
                type="number"
                min={1}
                value={qForm.tempsValeur}
                onChange={(e) => setQForm({ ...qForm, tempsValeur: e.target.value })}
                className="bg-white border border-slate-200 rounded-lg px-3 py-2 flex-1"
                placeholder="Ex. 30"
              />
              <select
                value={qForm.tempsUnite}
                onChange={(e) => setQForm({ ...qForm, tempsUnite: e.target.value as UniteTemps })}
                className="bg-white border border-slate-200 rounded-lg px-3 py-2"
              >
                <option value="secondes">secondes</option>
                <option value="minutes">minutes</option>
                <option value="heures">heures</option>
              </select>
            </div>

            <p className="text-slate-500 text-xs mb-4">
              Règle fixe du jeu : 2 tentatives par énigme, puis passage automatique à l&apos;énigme suivante.
            </p>

            <div className="flex gap-3">
              <button onClick={submitQForm} className="bg-brand-blue hover:bg-brand-navy text-white font-semibold px-6 py-2 rounded-full transition">
                {editingQId ? "Enregistrer les modifications" : "Ajouter l'énigme"}
              </button>
              {editingQId && (
                <button onClick={resetQForm} className="text-slate-500 underline text-sm">
                  Annuler
                </button>
              )}
            </div>
          </section>

          {/* Liste */}
          <section>
            {sallesConnues.length === 0 && (
              <p className="text-slate-500 text-sm mb-4">
                Aucune salle pour l&apos;instant — créez une équipe ou tapez un nom de salle dans le formulaire.
              </p>
            )}
            <div className="flex gap-2 mb-4 flex-wrap">
              {sallesConnues.map((s) => (
                <button
                  key={s}
                  onClick={() => setSalleFiltre(s)}
                  className={`px-4 py-1.5 rounded-full text-sm transition ${
                    salleFiltre === s ? "bg-brand-blue text-white" : "bg-brand-blue-light text-brand-navy"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {salleFiltre && questionsFiltrees.length === 0 && (
              <p className="text-slate-500 text-sm">Aucune énigme pour cette salle pour l&apos;instant.</p>
            )}

            <div className="flex flex-col gap-3">
              {questionsFiltrees.map((q) => (
                <div key={q.id} className="bg-brand-blue-light rounded-xl p-4">
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-medium text-sm text-brand-navy">
                      #{q.ordre} — {q.texte}
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-brand-blue font-semibold">
                        {q.type === "qcm" ? "QCM" : "Libre"}
                      </span>
                    </p>
                    <div className="flex gap-2 shrink-0 text-xs">
                      <button onClick={() => editQuestion(q)} className="text-brand-blue underline">
                        Modifier
                      </button>
                      <button onClick={() => removeQuestion(q.id)} className="text-red-500 underline">
                        Supprimer
                      </button>
                    </div>
                  </div>
                  {q.type === "qcm" ? (
                    <ul className="text-slate-500 text-xs mt-2 space-y-0.5">
                      {(q.propositions ?? []).map((p, i) => (
                        <li key={i} className={i === q.correctIndex ? "text-green-600 font-medium" : ""}>
                          {i === q.correctIndex ? "✓ " : "· "}
                          {p}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500 text-xs mt-2">Réponse attendue : {q.reponse}</p>
                  )}
                  {q.tempsLimite && (
                    <p className="text-slate-500 text-xs mt-1">Temps limite : {formatTemps(q.tempsLimite)}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {!loading && tab === "phrase" && (
        <section className="max-w-xl">
          <p className="text-slate-600 mb-4 text-sm">
            Choisissez le nombre de fragments de la phrase finale, rédigez chaque fragment, puis attribuez-en un à
            chaque équipe dans l&apos;onglet &quot;Équipes &amp; salles&quot;.
          </p>

          <label className="block text-sm text-slate-500 mb-1">Nombre de fragments</label>
          <input
            type="number"
            min={0}
            value={fragments.length}
            onChange={(e) => setNombreFragments(Number(e.target.value) || 0)}
            className="bg-brand-blue-light border border-brand-blue-light focus:border-brand-blue outline-none rounded-lg px-3 py-2 mb-4 w-32"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {fragments.map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-slate-500 w-20 shrink-0 text-sm">Fragment {i + 1}</span>
                <input
                  value={f}
                  onChange={(e) => {
                    const next = [...fragments];
                    next[i] = e.target.value;
                    setFragments(next);
                  }}
                  className="bg-brand-blue-light border border-brand-blue-light focus:border-brand-blue outline-none rounded-lg px-3 py-2 flex-1"
                  placeholder={`Fragment ${i + 1}`}
                />
              </div>
            ))}
          </div>
          <button
            onClick={saveFragments}
            disabled={savingFragments}
            className="bg-brand-blue hover:bg-brand-navy text-white font-semibold px-6 py-2 rounded-full transition"
          >
            {savingFragments ? "Enregistrement..." : "Enregistrer la phrase"}
          </button>
          <p className="text-slate-500 text-xs mt-4">
            Aperçu : {fragments.filter(Boolean).join(" ") || "(rien pour l'instant)"}
          </p>
        </section>
      )}
    </main>
  );
}

function formatTemps(secondes: number): string {
  if (secondes % 3600 === 0 && secondes >= 3600) return `${depuisSecondes(secondes, "heures")} h`;
  if (secondes % 60 === 0 && secondes >= 60) return `${depuisSecondes(secondes, "minutes")} min`;
  return `${secondes} s`;
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium transition ${
        active ? "bg-brand-blue text-white" : "bg-brand-blue-light text-brand-navy"
      }`}
    >
      {children}
    </button>
  );
}

function TypeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-sm transition ${
        active ? "bg-brand-blue text-white" : "bg-white border border-slate-200 text-brand-navy"
      }`}
    >
      {children}
    </button>
  );
}
