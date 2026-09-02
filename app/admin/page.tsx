"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getAllQuestions,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  renumeroterEtapes,
  getQuizConfig,
  saveQuizConfig,
  getAllTeams,
  addTeam,
  updateTeam,
  deleteTeam,
  importerScenarioParDefaut,
} from "@/lib/data";
import {
  Question,
  Team,
  TypeEnigme,
  UniteTemps,
  versSecondes,
  depuisSecondes,
  GameTexts,
  DEFAULT_GAME_TEXTS,
  fusionnerTextes,
} from "@/lib/types";

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "integration2026";

const emptyQuestionForm = {
  salle: "",
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

type Tab = "circuit" | "equipes" | "phrase" | "histoire" | "textes";

function AdminPanel() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [fragments, setFragments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("circuit");

  const [teamForm, setTeamForm] = useState({ ...emptyTeamForm });
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

  const [qForm, setQForm] = useState({ ...emptyQuestionForm });
  const [editingQId, setEditingQId] = useState<string | null>(null);
  const [salleFiltre, setSalleFiltre] = useState<string>("");
  const [savingStep, setSavingStep] = useState(false);

  const [savingFragments, setSavingFragments] = useState(false);

  const [histoire, setHistoire] = useState("");
  const [savingHistoire, setSavingHistoire] = useState(false);

  const [siteTexts, setSiteTexts] = useState<GameTexts>(fusionnerTextes());
  const [savingTexts, setSavingTexts] = useState(false);

  const [importing, setImporting] = useState(false);

  async function reload() {
    setLoading(true);
    setLoadError(null);
    try {
      const [ts, qs, config] = await Promise.all([getAllTeams(), getAllQuestions(), getQuizConfig()]);
      setTeams(ts);
      setQuestions(qs);
      setFragments(config.fragments);
      setHistoire(config.histoire ?? "");
      setSiteTexts(fusionnerTextes(config.texts));
    } catch (e) {
      console.error(e);
      const detail = e instanceof Error ? e.message : String(e);
      setLoadError(`Impossible de charger les données. Vérifiez la connexion et réessayez. (${detail})`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  // Salles connues = union des salles des équipes et des étapes existantes
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

  // ---------- Circuit du jeu (énigmes + pages code, dans l'ordre) ----------

  const etapesSalle = useMemo(
    () => questions.filter((q) => q.salle === salleFiltre).sort((a, b) => a.ordre - b.ordre),
    [questions, salleFiltre]
  );

  function resetQForm(type: TypeEnigme = "qcm") {
    setQForm({ ...emptyQuestionForm, salle: salleFiltre, type });
    setEditingQId(null);
  }

  function editQuestion(q: Question) {
    setQForm({
      salle: q.salle,
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
    setTab("circuit");
  }

  async function submitQForm() {
    if (!qForm.salle.trim() || !qForm.texte.trim()) {
      alert(qForm.type === "code" ? "Merci de remplir la salle et le texte de la page." : "Merci de remplir la salle et l'énigme.");
      return;
    }
    if (qForm.type === "qcm" && qForm.propositions.some((p) => !p.trim())) {
      alert("Merci de remplir les 4 propositions.");
      return;
    }
    if ((qForm.type === "libre" || qForm.type === "code") && !qForm.reponse.trim()) {
      alert(qForm.type === "code" ? "Merci d'indiquer le code attendu." : "Merci d'indiquer la réponse attendue.");
      return;
    }
    const tempsLimite =
      qForm.type === "code" || qForm.tempsValeur === ""
        ? null
        : versSecondes(Number(qForm.tempsValeur), qForm.tempsUnite);

    const base = {
      salle: qForm.salle.trim(),
      type: qForm.type,
      texte: qForm.texte.trim(),
      feedbackCorrect: qForm.feedbackCorrect.trim(),
      feedbackIncorrect: qForm.feedbackIncorrect.trim(),
      tempsLimite,
    };

    setSavingStep(true);
    try {
      if (editingQId) {
        const payload =
          qForm.type === "qcm"
            ? { ...base, propositions: qForm.propositions.map((p) => p.trim()) as [string, string, string, string], correctIndex: qForm.correctIndex }
            : { ...base, reponse: qForm.reponse.trim() };
        await updateQuestion(editingQId, payload);
        await reload();
        resetQForm();
      } else {
        // Nouvelle étape ajoutée à la fin du circuit de la salle.
        const ordre = (etapesSalle.at(-1)?.ordre ?? 0) + 1;
        const payload =
          qForm.type === "qcm"
            ? { ...base, ordre, propositions: qForm.propositions.map((p) => p.trim()) as [string, string, string, string], correctIndex: qForm.correctIndex }
            : { ...base, ordre, reponse: qForm.reponse.trim() };
        await addQuestion(payload);
        await reload();
        resetQForm(qForm.type);
      }
    } finally {
      setSavingStep(false);
    }
  }

  async function removeQuestion(id: string) {
    if (!confirm("Supprimer cette étape du circuit ?")) return;
    await deleteQuestion(id);
    const restantes = etapesSalle.filter((q) => q.id !== id).sort((a, b) => a.ordre - b.ordre);
    await renumeroterEtapes(restantes.map((q) => q.id));
    await reload();
  }

  async function deplacerEtape(q: Question, direction: -1 | 1) {
    const liste = [...etapesSalle];
    const idx = liste.findIndex((x) => x.id === q.id);
    const cible = idx + direction;
    if (idx === -1 || cible < 0 || cible >= liste.length) return;
    [liste[idx], liste[cible]] = [liste[cible], liste[idx]];
    setSavingStep(true);
    try {
      await renumeroterEtapes(liste.map((x) => x.id));
      await reload();
    } finally {
      setSavingStep(false);
    }
  }

  // Insère une nouvelle étape (énigme ou page code) juste après `apres`
  // (ou en tête si apres === null), renumérote automatiquement le circuit,
  // puis ouvre l'étape créée dans le formulaire pour que l'organisateur la
  // remplisse tout de suite.
  async function inserer(apres: Question | null, type: TypeEnigme) {
    setSavingStep(true);
    try {
      const ordreProvisoire = apres ? apres.ordre + 0.5 : (etapesSalle[0]?.ordre ?? 1) - 0.5;
      const base = {
        salle: salleFiltre,
        ordre: ordreProvisoire,
        type,
        texte: type === "code" ? "Nouvelle page : entrez le code pour continuer." : "Nouvelle énigme à rédiger.",
        feedbackCorrect: "",
        feedbackIncorrect: "",
        tempsLimite: null,
        ...(type === "qcm"
          ? { propositions: ["", "", "", ""] as [string, string, string, string], correctIndex: 0 as 0 | 1 | 2 | 3 }
          : { reponse: "" }),
      };
      const newId = await addQuestion(base);
      const tousTries = [...etapesSalle, { ...base, id: newId } as Question].sort((a, b) => a.ordre - b.ordre);
      await renumeroterEtapes(tousTries.map((q) => q.id));
      const qs = await getAllQuestions();
      setQuestions(qs);
      const nouvelle = qs.find((q) => q.id === newId);
      if (nouvelle) editQuestion(nouvelle);
    } finally {
      setSavingStep(false);
    }
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

  // ---------- Histoire ----------

  async function saveHistoire() {
    setSavingHistoire(true);
    await saveQuizConfig({ histoire });
    setSavingHistoire(false);
  }

  // ---------- Textes du site ----------

  function setSiteText<K extends keyof GameTexts>(key: K, value: GameTexts[K]) {
    setSiteTexts((prev) => ({ ...prev, [key]: value }));
  }

  async function saveSiteTexts() {
    setSavingTexts(true);
    await saveQuizConfig({ texts: siteTexts });
    setSavingTexts(false);
  }

  // ---------- Import du scénario par défaut ----------

  async function lancerImport() {
    if (
      !confirm(
        "Ceci va SUPPRIMER toutes les équipes et énigmes existantes, puis recréer les 10 équipes et 100 énigmes du scénario \"Le Dossier Perdu\", la phrase finale et le texte de l'histoire. Continuer ?"
      )
    )
      return;
    setImporting(true);
    try {
      const resultat = await importerScenarioParDefaut();
      await reload();
      alert(
        `Import terminé : ${resultat.equipes} équipes et ${resultat.enigmes} énigmes sont maintenant dans la base. Rechargez la page /jouer si vous ne les voyez pas tout de suite.`
      );
    } catch (e) {
      alert("Échec de l'import : " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setImporting(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-brand-navy px-4 sm:px-8 py-8">
      <h1 className="text-2xl font-bold mb-1">Espace organisateur</h1>
      <p className="text-slate-500 text-sm mb-6">Escape Game IUA Classe X</p>

      <div className="flex gap-2 mb-3 flex-wrap">
        <TabButton active={tab === "circuit"} onClick={() => setTab("circuit")}>Circuit du jeu</TabButton>
        <TabButton active={tab === "equipes"} onClick={() => setTab("equipes")}>Équipes &amp; salles</TabButton>
        <TabButton active={tab === "phrase"} onClick={() => setTab("phrase")}>Phrase finale</TabButton>
        <TabButton active={tab === "histoire"} onClick={() => setTab("histoire")}>Histoire</TabButton>
        <TabButton active={tab === "textes"} onClick={() => setTab("textes")}>Textes du site</TabButton>
      </div>

      <button
        onClick={lancerImport}
        disabled={importing}
        className="text-xs text-brand-blue underline mb-6 disabled:text-slate-400"
      >
        {importing ? "Import en cours..." : "Importer le scénario par défaut (\"Le Dossier Perdu\")"}
      </button>

      {loading && <p className="text-slate-500">Chargement...</p>}

      {loadError && (
        <div className="mb-6 flex items-center gap-3">
          <p className="text-red-500 text-sm">{loadError}</p>
          <button onClick={reload} className="text-brand-blue underline text-sm">
            Réessayer
          </button>
        </div>
      )}

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

      {!loading && tab === "circuit" && (
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Formulaire */}
          <section className="bg-brand-blue-light rounded-2xl p-5">
            <h2 className="font-semibold mb-4 text-brand-navy">
              {editingQId ? "Modifier cette étape" : "Ajouter une étape à la fin"}
            </h2>

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

            <label className="block text-sm text-slate-500 mb-1">Type d&apos;étape</label>
            <div className="flex gap-2 mb-3 flex-wrap">
              <TypeButton active={qForm.type === "qcm"} onClick={() => setQForm({ ...qForm, type: "qcm" })}>
                Énigme QCM
              </TypeButton>
              <TypeButton active={qForm.type === "libre"} onClick={() => setQForm({ ...qForm, type: "libre" })}>
                Énigme réponse libre
              </TypeButton>
              <TypeButton active={qForm.type === "code"} onClick={() => setQForm({ ...qForm, type: "code" })}>
                Page code (verrou)
              </TypeButton>
            </div>

            <label className="block text-sm text-slate-500 mb-1">
              {qForm.type === "code" ? "Texte affiché en haut de la page" : "Énigme"}
            </label>
            <textarea
              value={qForm.texte}
              onChange={(e) => setQForm({ ...qForm, texte: e.target.value })}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 mb-3 w-full"
              rows={qForm.type === "code" ? 3 : 2}
            />

            {qForm.type === "qcm" && (
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
            )}

            {qForm.type === "libre" && (
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

            {qForm.type === "code" && (
              <>
                <label className="block text-sm text-slate-500 mb-1">Code attendu (choisi par vous)</label>
                <input
                  value={qForm.reponse}
                  onChange={(e) => setQForm({ ...qForm, reponse: e.target.value })}
                  className="bg-white border border-slate-200 rounded-lg px-3 py-2 mb-3 w-full"
                  placeholder="Ex. IUA2026"
                />
                <p className="text-slate-500 text-xs mb-3">
                  La comparaison ignore majuscules/minuscules, accents et espaces superflus. Aucune limite de tentatives sur cette page.
                </p>
              </>
            )}

            <label className="block text-sm text-slate-500 mb-1">
              {qForm.type === "code" ? "Message affiché si le code est correct (facultatif)" : "Texte affiché si bonne réponse"}
            </label>
            <input
              value={qForm.feedbackCorrect}
              onChange={(e) => setQForm({ ...qForm, feedbackCorrect: e.target.value })}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 mb-3 w-full"
              placeholder="Bravo, c'est la bonne réponse !"
            />

            <label className="block text-sm text-slate-500 mb-1">
              {qForm.type === "code" ? "Message affiché si le code est incorrect" : "Texte affiché si mauvaise réponse"}
            </label>
            <input
              value={qForm.feedbackIncorrect}
              onChange={(e) => setQForm({ ...qForm, feedbackIncorrect: e.target.value })}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 mb-3 w-full"
              placeholder="Ce n'est pas ça, réessayez !"
            />

            {qForm.type !== "code" && (
              <>
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
              </>
            )}

            <div className="flex gap-3 mt-4">
              <button
                onClick={submitQForm}
                disabled={savingStep}
                className="bg-brand-blue hover:bg-brand-navy text-white font-semibold px-6 py-2 rounded-full transition disabled:opacity-50"
              >
                {editingQId ? "Enregistrer les modifications" : "Ajouter à la fin du circuit"}
              </button>
              {editingQId && (
                <button onClick={() => resetQForm()} className="text-slate-500 underline text-sm">
                  Annuler
                </button>
              )}
            </div>
          </section>

          {/* Circuit ordonné */}
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

            {salleFiltre && (
              <div className="flex gap-2 mb-4 text-xs">
                <button onClick={() => inserer(null, "libre")} disabled={savingStep} className="text-brand-blue underline disabled:text-slate-400">
                  + Énigme en tête de circuit
                </button>
                <button onClick={() => inserer(null, "code")} disabled={savingStep} className="text-brand-blue underline disabled:text-slate-400">
                  + Page code en tête de circuit
                </button>
              </div>
            )}

            {salleFiltre && etapesSalle.length === 0 && (
              <p className="text-slate-500 text-sm">Aucune étape pour cette salle pour l&apos;instant.</p>
            )}

            <div className="flex flex-col gap-3">
              {etapesSalle.map((q, i) => (
                <div key={q.id}>
                  <div className={`rounded-xl p-4 ${q.type === "code" ? "bg-amber-50 ring-1 ring-amber-200" : "bg-brand-blue-light"}`}>
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-medium text-sm text-brand-navy">
                        <span className="text-[10px] uppercase tracking-wide font-semibold mr-2 px-1.5 py-0.5 rounded bg-white/70">
                          {q.type === "code" ? `Page code ${i + 1}` : `Énigme ${i + 1}`}
                        </span>
                        {q.texte}
                        {q.type === "qcm" && <span className="ml-2 text-[10px] uppercase tracking-wide text-brand-blue font-semibold">QCM</span>}
                        {q.type === "libre" && <span className="ml-2 text-[10px] uppercase tracking-wide text-brand-blue font-semibold">Libre</span>}
                      </p>
                      <div className="flex gap-2 shrink-0 text-xs items-center">
                        <button onClick={() => deplacerEtape(q, -1)} disabled={i === 0 || savingStep} className="text-brand-navy disabled:text-slate-300" title="Monter">
                          ↑
                        </button>
                        <button onClick={() => deplacerEtape(q, 1)} disabled={i === etapesSalle.length - 1 || savingStep} className="text-brand-navy disabled:text-slate-300" title="Descendre">
                          ↓
                        </button>
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
                        {(q.propositions ?? []).map((p, pi) => (
                          <li key={pi} className={pi === q.correctIndex ? "text-green-600 font-medium" : ""}>
                            {pi === q.correctIndex ? "✓ " : "· "}
                            {p}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-slate-500 text-xs mt-2">
                        {q.type === "code" ? "Code attendu : " : "Réponse attendue : "}
                        {q.reponse}
                      </p>
                    )}
                    {q.tempsLimite && (
                      <p className="text-slate-500 text-xs mt-1">Temps limite : {formatTemps(q.tempsLimite)}</p>
                    )}
                  </div>
                  <div className="flex gap-3 text-[11px] mt-1 mb-1 pl-1">
                    <button onClick={() => inserer(q, "libre")} disabled={savingStep} className="text-brand-blue underline disabled:text-slate-400">
                      + Insérer une énigme après
                    </button>
                    <button onClick={() => inserer(q, "code")} disabled={savingStep} className="text-brand-blue underline disabled:text-slate-400">
                      + Insérer une page code après
                    </button>
                  </div>
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

      {!loading && tab === "histoire" && (
        <section className="max-w-xl">
          <p className="text-slate-600 mb-4 text-sm">
            Ce texte s&apos;affiche sur la page d&apos;histoire, juste après l&apos;accueil et avant le choix de
            l&apos;équipe (logo seul, sans titre, au-dessus du texte).
          </p>

          <label className="block text-sm text-slate-500 mb-1">Texte de l&apos;histoire</label>
          <textarea
            value={histoire}
            onChange={(e) => setHistoire(e.target.value)}
            rows={10}
            className="bg-brand-blue-light border border-brand-blue-light focus:border-brand-blue outline-none rounded-lg px-3 py-2 mb-4 w-full"
            placeholder="Bienvenue à l'IUA, Classe X..."
          />

          <button
            onClick={saveHistoire}
            disabled={savingHistoire}
            className="bg-brand-blue hover:bg-brand-navy text-white font-semibold px-6 py-2 rounded-full transition"
          >
            {savingHistoire ? "Enregistrement..." : "Enregistrer l'histoire"}
          </button>
        </section>
      )}

      {!loading && tab === "textes" && (
        <section className="max-w-2xl">
          <p className="text-slate-600 mb-6 text-sm">
            Tous les autres textes affichés sur le site (hors énoncés d&apos;énigmes, gérés dans l&apos;onglet
            &quot;Circuit du jeu&quot;, et hors histoire, gérée dans son propre onglet). Le design ne change pas :
            seul le texte est modifié. Les changements s&apos;appliquent automatiquement sur le site dès
            l&apos;enregistrement.
          </p>

          <TextGroup title="Page d'accueil">
            <TextField label="Titre" value={siteTexts.accueilTitre} onChange={(v) => setSiteText("accueilTitre", v)} />
            <TextField label="Sous-titre" value={siteTexts.accueilSousTitre} onChange={(v) => setSiteText("accueilSousTitre", v)} />
            <TextAreaField label="Description" value={siteTexts.accueilDescription} onChange={(v) => setSiteText("accueilDescription", v)} rows={3} />
            <TextField label="Bouton" value={siteTexts.accueilBouton} onChange={(v) => setSiteText("accueilBouton", v)} />
            <TextField label="Message de chargement" value={siteTexts.accueilChargementLabel} onChange={(v) => setSiteText("accueilChargementLabel", v)} />
          </TextGroup>

          <TextGroup title="Page histoire">
            <TextField label="Bouton" value={siteTexts.histoireBouton} onChange={(v) => setSiteText("histoireBouton", v)} />
            <TextField label="Message de chargement" value={siteTexts.histoireChargementLabel} onChange={(v) => setSiteText("histoireChargementLabel", v)} />
            <TextField label="Message pendant la navigation" value={siteTexts.histoireNavigationLabel} onChange={(v) => setSiteText("histoireNavigationLabel", v)} />
          </TextGroup>

          <TextGroup title="Page de sélection d'équipe">
            <TextField label="Titre" value={siteTexts.equipeTitre} onChange={(v) => setSiteText("equipeTitre", v)} />
            <TextField label="Sous-titre" value={siteTexts.equipeSousTitre} onChange={(v) => setSiteText("equipeSousTitre", v)} />
            <TextAreaField label="Message si aucune équipe" value={siteTexts.equipeAucuneEquipe} onChange={(v) => setSiteText("equipeAucuneEquipe", v)} rows={2} />
            <TextField label="Bouton « chef d'équipe »" value={siteTexts.equipeBoutonChef} onChange={(v) => setSiteText("equipeBoutonChef", v)} />
            <TextField label="Bouton « suiveur »" value={siteTexts.equipeBoutonSuiveur} onChange={(v) => setSiteText("equipeBoutonSuiveur", v)} />
            <TextAreaField label="Message d'erreur (chef déjà connecté)" value={siteTexts.equipeErreurChef} onChange={(v) => setSiteText("equipeErreurChef", v)} rows={2} />
            <TextField label="Message de chargement" value={siteTexts.equipeChargementLabel} onChange={(v) => setSiteText("equipeChargementLabel", v)} />
            <TextField label="Message pendant la navigation" value={siteTexts.equipeNavigationLabel} onChange={(v) => setSiteText("equipeNavigationLabel", v)} />
          </TextGroup>

          <TextGroup title="Pendant le jeu (énigmes et pages code)">
            <TextField label="Message de chargement" value={siteTexts.jeuChargementLabel} onChange={(v) => setSiteText("jeuChargementLabel", v)} />
            <TextAreaField label="Erreur : chef déjà connecté ailleurs" value={siteTexts.jeuErreurChefRefuse} onChange={(v) => setSiteText("jeuErreurChefRefuse", v)} rows={2} />
            <TextAreaField label="Erreur : aucune énigme configurée" value={siteTexts.jeuErreurAucuneEnigme} onChange={(v) => setSiteText("jeuErreurAucuneEnigme", v)} rows={2} />
            <TextField label="Erreur : équipe introuvable" value={siteTexts.jeuErreurEquipeIntrouvable} onChange={(v) => setSiteText("jeuErreurEquipeIntrouvable", v)} />
            <TextField label="Bouton « Valider »" value={siteTexts.jeuLabelValider} onChange={(v) => setSiteText("jeuLabelValider", v)} />
            <TextField label="Bouton « Réessayer »" value={siteTexts.jeuLabelReessayer} onChange={(v) => setSiteText("jeuLabelReessayer", v)} />
            <TextField label="Bouton « Énigme suivante »" value={siteTexts.jeuLabelEnigmeSuivante} onChange={(v) => setSiteText("jeuLabelEnigmeSuivante", v)} />
            <TextField label="Bouton « Voir le résultat »" value={siteTexts.jeuLabelVoirResultat} onChange={(v) => setSiteText("jeuLabelVoirResultat", v)} />
            <TextField label="Texte « Temps écoulé »" value={siteTexts.jeuTexteTempsEcoule} onChange={(v) => setSiteText("jeuTexteTempsEcoule", v)} />
            <TextField label="Texte « Mauvaise réponse »" value={siteTexts.jeuTexteMauvaiseReponse} onChange={(v) => setSiteText("jeuTexteMauvaiseReponse", v)} />
            <TextField label="Texte « Dernière tentative »" value={siteTexts.jeuTexteDerniereTentative} onChange={(v) => setSiteText("jeuTexteDerniereTentative", v)} />
            <TextField label="Étiquette « Bonne réponse : »" value={siteTexts.jeuTexteBonneReponseLabel} onChange={(v) => setSiteText("jeuTexteBonneReponseLabel", v)} />
            <TextField label="Titre écran lettre débloquée" value={siteTexts.jeuTexteLettreDebloqueeTitre} onChange={(v) => setSiteText("jeuTexteLettreDebloqueeTitre", v)} />
            <TextField label="Note écran lettre débloquée" value={siteTexts.jeuTexteLettreDebloqueeNote} onChange={(v) => setSiteText("jeuTexteLettreDebloqueeNote", v)} />
            <TextField label="Placeholder réponse libre" value={siteTexts.jeuPlaceholderReponseLibre} onChange={(v) => setSiteText("jeuPlaceholderReponseLibre", v)} />
          </TextGroup>

          <TextGroup title="Pages code (verrou entre deux étapes)">
            <TextField label="Placeholder du champ code" value={siteTexts.codePagePlaceholder} onChange={(v) => setSiteText("codePagePlaceholder", v)} />
            <TextField label="Bouton" value={siteTexts.codePageBouton} onChange={(v) => setSiteText("codePageBouton", v)} />
          </TextGroup>

          <TextGroup title="Écran final (reconstitution du fragment)">
            <TextField label="Titre" value={siteTexts.finTitre} onChange={(v) => setSiteText("finTitre", v)} />
            <TextAreaField label="Texte « reconstituez votre fragment »" value={siteTexts.finTexteReconstituer} onChange={(v) => setSiteText("finTexteReconstituer", v)} rows={2} />
            <TextField label="Texte si aucune lettre" value={siteTexts.finAucuneLettre} onChange={(v) => setSiteText("finAucuneLettre", v)} />
            <TextField label="Placeholder de saisie" value={siteTexts.finPlaceholderSaisie} onChange={(v) => setSiteText("finPlaceholderSaisie", v)} />
            <TextField label="Bouton « Valider »" value={siteTexts.finLabelValiderFragment} onChange={(v) => setSiteText("finLabelValiderFragment", v)} />
            <TextField label="Texte « dernière tentative »" value={siteTexts.finTexteDerniereTentative} onChange={(v) => setSiteText("finTexteDerniereTentative", v)} />
            <TextField label="Texte « fragment trouvé »" value={siteTexts.finTexteTrouve} onChange={(v) => setSiteText("finTexteTrouve", v)} />
            <TextAreaField label="Texte « fragment révélé »" value={siteTexts.finTexteRevele} onChange={(v) => setSiteText("finTexteRevele", v)} rows={2} />
            <TextAreaField label="Texte « direction l'amphi »" value={siteTexts.finTexteDirectionAmphi} onChange={(v) => setSiteText("finTexteDirectionAmphi", v)} rows={2} />
          </TextGroup>

          <TextGroup title="Page « suivre » (lecture seule pour l'équipe)">
            <TextField label="Bannière" value={siteTexts.suivreBanniere} onChange={(v) => setSiteText("suivreBanniere", v)} />
            <TextAreaField label="Texte d'attente (chef pas encore démarré)" value={siteTexts.suivreAttente} onChange={(v) => setSiteText("suivreAttente", v)} rows={2} />
            <TextField label="Message de chargement" value={siteTexts.suivreChargementLabel} onChange={(v) => setSiteText("suivreChargementLabel", v)} />
            <TextField label="Placeholder réponse (lecture seule)" value={siteTexts.suivrePlaceholderReponse} onChange={(v) => setSiteText("suivrePlaceholderReponse", v)} />
            <TextField label="Placeholder saisie fragment (lecture seule)" value={siteTexts.suivrePlaceholderSaisie} onChange={(v) => setSiteText("suivrePlaceholderSaisie", v)} />
            <TextField label="Titre lettre débloquée" value={siteTexts.suivreLettreTitre} onChange={(v) => setSiteText("suivreLettreTitre", v)} />
            <TextField label="Texte d'attente (chef continue quand il est prêt)" value={siteTexts.suivreAttenteContinuer} onChange={(v) => setSiteText("suivreAttenteContinuer", v)} />
          </TextGroup>

          <TextGroup title="Messages aléatoires après chaque énigme">
            <p className="text-slate-500 text-xs mb-2">Un message par ligne. Un message est tiré au sort (en alternance) à chaque bonne ou mauvaise réponse.</p>
            <label className="block text-sm text-slate-500 mb-1">Messages de réussite</label>
            <textarea
              value={siteTexts.messagesReussite.join("\n")}
              onChange={(e) => setSiteText("messagesReussite", e.target.value.split("\n"))}
              rows={3}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 mb-3 w-full"
            />
            <label className="block text-sm text-slate-500 mb-1">Messages d&apos;échec</label>
            <textarea
              value={siteTexts.messagesEchec.join("\n")}
              onChange={(e) => setSiteText("messagesEchec", e.target.value.split("\n"))}
              rows={3}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 mb-1 w-full"
            />
          </TextGroup>

          <div className="flex items-center gap-3 mt-6 sticky bottom-4">
            <button
              onClick={saveSiteTexts}
              disabled={savingTexts}
              className="bg-brand-blue hover:bg-brand-navy text-white font-semibold px-6 py-2 rounded-full transition shadow-lg"
            >
              {savingTexts ? "Enregistrement..." : "Enregistrer tous ces textes"}
            </button>
            <button
              onClick={() => setSiteTexts(DEFAULT_GAME_TEXTS)}
              className="text-slate-500 underline text-sm"
            >
              Réinitialiser aux textes par défaut
            </button>
          </div>
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

function TextGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-brand-blue-light/60 rounded-2xl p-5 mb-5">
      <h3 className="font-semibold mb-3 text-brand-navy text-sm">{title}</h3>
      {children}
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mb-3">
      <label className="block text-sm text-slate-500 mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white border border-slate-200 rounded-lg px-3 py-2 w-full"
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 2,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div className="mb-3">
      <label className="block text-sm text-slate-500 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="bg-white border border-slate-200 rounded-lg px-3 py-2 w-full"
      />
    </div>
  );
}
