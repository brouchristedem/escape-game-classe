"use client";

import { useEffect, useMemo, useState, use } from "react";
import Link from "next/link";
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
  viderScenario,
  importerScenario,
  demarrerTempsGeneral,
  arreterTempsGeneral,
  ajusterTempsGeneral,
  envoyerBroadcast,
} from "@/lib/data";
import {
  Question,
  Team,
  TypeEnigme,
  UniteTemps,
  versSecondes,
  depuisSecondes,
  GameTexts,
  GameStatus,
  DEFAULT_GAME_TEXTS,
  fusionnerTextes,
  TempsGeneral,
  SALLE_UNIQUE,
} from "@/lib/types";
import { SCENARIO_FORMAT_GUIDE, extraireTexteFichier, parseScenario } from "@/lib/scenarioParser";
import { useAuth } from "@/lib/auth";

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
  fragmentTexte: "",
};

const emptyTeamForm = {
  nom: "",
};

// Toutes les équipes partagent désormais un seul circuit d'énigmes en ligne :
// la notion de salle par équipe n'existe plus côté organisateur (elle reste
// seulement en interne, dans le modèle de données, pour ne pas casser les
// parties déjà enregistrées).

export default function Admin({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const { user, loading: authLoading } = useAuth();
  const [statut, setStatut] = useState<"verification" | "autorise" | "refuse">("verification");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setStatut("refuse");
      return;
    }
    let annule = false;
    getQuizConfig(gameId).then((config) => {
      if (annule) return;
      setStatut((config.organizers ?? []).includes(user.uid) ? "autorise" : "refuse");
    });
    return () => {
      annule = true;
    };
  }, [gameId, user, authLoading]);

  if (statut === "verification") {
    return <main className="min-h-screen bg-white" />;
  }

  if (statut === "refuse") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-white text-center">
        <h1 className="text-xl font-semibold mb-2 text-brand-navy">Accès refusé</h1>
        <p className="text-sm text-slate-500 mb-6">
          {user
            ? "Ce compte n'est pas organisateur de ce jeu."
            : "Vous devez être connecté pour administrer ce jeu."}
        </p>
        <Link href="/admin" className="text-sm font-semibold text-brand-blue">
          ← Retour à mes jeux
        </Link>
      </main>
    );
  }

  return <AdminPanel gameId={gameId} />;
}

type Tab = "circuit" | "equipes" | "scenario" | "histoire" | "textes";

function AdminPanel({ gameId }: { gameId: string }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("circuit");

  const [teamForm, setTeamForm] = useState({ ...emptyTeamForm });
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

  const [qForm, setQForm] = useState({ ...emptyQuestionForm });
  const [editingQId, setEditingQId] = useState<string | null>(null);
  const [savingStep, setSavingStep] = useState(false);

  const [histoire, setHistoire] = useState("");
  const [savingHistoire, setSavingHistoire] = useState(false);

  const [siteTexts, setSiteTexts] = useState<GameTexts>(fusionnerTextes());
  const [savingTexts, setSavingTexts] = useState(false);

  // Bouton pause d'urgence : bloque le circuit chez toutes les équipes en
  // même temps (voir PauseOverlay côté /jouer), sans toucher à leur
  // progression, pour pouvoir tout arrêter en cas de bug.
  const [gameStatus, setGameStatus] = useState<GameStatus>("actif");
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Chrono général affiché chez toutes les équipes, ajustable en temps réel.
  const [tempsGeneral, setTempsGeneral] = useState<TempsGeneral>({ finTimestamp: null });
  const [dureeDepart, setDureeDepart] = useState<string>("30");
  const [savingTemps, setSavingTemps] = useState(false);

  // Message ponctuel diffusé par-dessus l'écran de toutes les équipes.
  const [broadcastTexte, setBroadcastTexte] = useState("");
  const [broadcastDuree, setBroadcastDuree] = useState<string>("30");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [broadcastEnvoye, setBroadcastEnvoye] = useState(false);

  const [viding, setViding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setLoadError(null);
    try {
      const [ts, qs, config] = await Promise.all([getAllTeams(gameId), getAllQuestions(gameId), getQuizConfig(gameId)]);
      setTeams(ts);
      setQuestions(qs);
      setHistoire(config.histoire ?? "");
      setSiteTexts(fusionnerTextes(config.texts));
      setGameStatus(config.gameStatus ?? "actif");
      setTempsGeneral(config.tempsGeneral ?? { finTimestamp: null });
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
  // (conservé en interne pour la compatibilité des anciennes données ;
  // l'organisateur ne voit plus jamais ce concept).
  const sallesConnues = useMemo(() => {
    const s = new Set<string>();
    teams.forEach((t) => t.salle && s.add(t.salle));
    questions.forEach((q) => q.salle && s.add(q.salle));
    return Array.from(s).sort();
  }, [teams, questions]);
  // Toutes les étapes vivent désormais dans une seule salle interne : si
  // d'anciennes données utilisaient encore plusieurs salles, on les regroupe
  // simplement toutes dans le même circuit affiché.
  const salleActive = sallesConnues[0] ?? SALLE_UNIQUE;

  // ---------- Équipes ----------

  function resetTeamForm() {
    setTeamForm({ ...emptyTeamForm });
    setEditingTeamId(null);
  }

  async function submitTeamForm() {
    if (!teamForm.nom.trim()) {
      alert("Merci de donner un nom d'équipe.");
      return;
    }
    if (editingTeamId) {
      await updateTeam(gameId, editingTeamId, { nom: teamForm.nom.trim() });
    } else {
      // Toutes les équipes partagent le même circuit d'énigmes en ligne.
      await addTeam(gameId, { nom: teamForm.nom.trim(), salle: salleActive });
    }
    resetTeamForm();
    reload();
  }

  function editTeam(t: Team) {
    setTeamForm({ nom: t.nom });
    setEditingTeamId(t.id);
    setTab("equipes");
  }

  async function removeTeam(id: string) {
    if (!confirm("Supprimer cette équipe ?")) return;
    await deleteTeam(gameId, id);
    reload();
  }

  // ---------- Circuit du jeu (énigmes et pages code, dans l'ordre) ----------

  const etapesSalle = useMemo(
    () => questions.filter((q) => q.salle === salleActive).sort((a, b) => a.ordre - b.ordre),
    [questions, salleActive]
  );

  function resetQForm(type: TypeEnigme = "qcm") {
    setQForm({ ...emptyQuestionForm, salle: salleActive, type });
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
      fragmentTexte: q.fragmentTexte ?? "",
    });
    setEditingQId(q.id);
    setTab("circuit");
  }

  async function submitQForm() {
    if (!qForm.texte.trim()) {
      alert(qForm.type === "code" ? "Merci de remplir le texte de la page." : "Merci de remplir l'énigme.");
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
      qForm.type === "code" || qForm.type === "info" || qForm.tempsValeur === ""
        ? null
        : versSecondes(Number(qForm.tempsValeur), qForm.tempsUnite);

    const base = {
      salle: qForm.salle.trim(),
      type: qForm.type,
      texte: qForm.texte.trim(),
      feedbackCorrect: qForm.feedbackCorrect.trim(),
      feedbackIncorrect: qForm.feedbackIncorrect.trim(),
      tempsLimite,
      ...((qForm.type === "qcm" || qForm.type === "libre") ? { fragmentTexte: qForm.fragmentTexte.trim() } : {}),
    };

    setSavingStep(true);
    try {
      if (editingQId) {
        const payload =
          qForm.type === "qcm"
            ? { ...base, propositions: qForm.propositions.map((p) => p.trim()) as [string, string, string, string], correctIndex: qForm.correctIndex }
            : qForm.type === "info"
            ? base
            : { ...base, reponse: qForm.reponse.trim() };
        await updateQuestion(gameId, editingQId, payload);
        await reload();
        resetQForm();
      } else {
        // Nouvelle étape ajoutée à la fin du circuit de la salle.
        const ordre = (etapesSalle.at(-1)?.ordre ?? 0) + 1;
        const payload =
          qForm.type === "qcm"
            ? { ...base, ordre, propositions: qForm.propositions.map((p) => p.trim()) as [string, string, string, string], correctIndex: qForm.correctIndex }
            : qForm.type === "info"
            ? { ...base, ordre }
            : { ...base, ordre, reponse: qForm.reponse.trim() };
        await addQuestion(gameId, payload);
        await reload();
        resetQForm(qForm.type);
      }
    } finally {
      setSavingStep(false);
    }
  }

  async function removeQuestion(id: string) {
    if (!confirm("Supprimer cette étape du circuit ?")) return;
    await deleteQuestion(gameId, id);
    const restantes = etapesSalle.filter((q) => q.id !== id).sort((a, b) => a.ordre - b.ordre);
    await renumeroterEtapes(gameId, restantes.map((q) => q.id));
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
      await renumeroterEtapes(gameId, liste.map((x) => x.id));
      await reload();
    } finally {
      setSavingStep(false);
    }
  }

  // Insère une nouvelle étape (énigme, page code ou page vierge info) juste
  // après `apres` (ou en tête si apres === null), renumérote automatiquement
  // le circuit, puis ouvre l'étape créée dans le formulaire pour que
  // l'organisateur la remplisse tout de suite.
  async function inserer(apres: Question | null, type: TypeEnigme) {
    setSavingStep(true);
    try {
      const ordreProvisoire = apres ? apres.ordre + 0.5 : (etapesSalle[0]?.ordre ?? 1) - 0.5;
      const texteParDefaut =
        type === "code"
          ? "Nouvelle page : entrez le code pour continuer."
          : type === "info"
          ? "Nouvelle page vierge à rédiger."
          : "Nouvelle énigme à rédiger.";
      const base = {
        salle: salleActive,
        ordre: ordreProvisoire,
        type,
        texte: texteParDefaut,
        feedbackCorrect: "",
        feedbackIncorrect: "",
        tempsLimite: null,
        ...(type === "qcm"
          ? { propositions: ["", "", "", ""] as [string, string, string, string], correctIndex: 0 as 0 | 1 | 2 | 3 }
          : type === "info"
          ? {}
          : { reponse: "" }),
      };
      const newId = await addQuestion(gameId, base);
      const tousTries = [...etapesSalle, { ...base, id: newId } as Question].sort((a, b) => a.ordre - b.ordre);
      await renumeroterEtapes(gameId, tousTries.map((q) => q.id));
      const qs = await getAllQuestions(gameId);
      setQuestions(qs);
      const nouvelle = qs.find((q) => q.id === newId);
      if (nouvelle) editQuestion(nouvelle);
    } finally {
      setSavingStep(false);
    }
  }

  // ---------- Histoire ----------

  async function saveHistoire() {
    setSavingHistoire(true);
    await saveQuizConfig(gameId, { histoire });
    setSavingHistoire(false);
  }

  // ---------- Textes du site ----------

  function setSiteText<K extends keyof GameTexts>(key: K, value: GameTexts[K]) {
    setSiteTexts((prev) => ({ ...prev, [key]: value }));
  }

  async function saveSiteTexts() {
    setSavingTexts(true);
    await saveQuizConfig(gameId, { texts: siteTexts });
    setSavingTexts(false);
  }

  // ---------- Scénario : vider / importer depuis un fichier Word ou PDF ----------

  async function lancerVidage() {
    if (
      !confirm(
        "Ceci va SUPPRIMER toutes les énigmes du circuit ainsi que la phrase finale et le texte de l'histoire. Les équipes ne sont pas touchées. Continuer ?"
      )
    )
      return;
    setViding(true);
    try {
      await viderScenario(gameId);
      await reload();
      setImportMessage("Scénario vidé. Vous pouvez maintenant importer votre propre document.");
    } catch (e) {
      alert("Échec : " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setViding(false);
    }
  }

  async function togglerGameStatus() {
    const prochain: GameStatus = gameStatus === "pause" ? "actif" : "pause";
    if (prochain === "pause" && !confirm("Mettre le jeu en pause pour toutes les équipes, maintenant ?")) return;
    setTogglingStatus(true);
    try {
      await saveQuizConfig(gameId, { gameStatus: prochain });
      setGameStatus(prochain);
    } catch (e) {
      alert("Échec : " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setTogglingStatus(false);
    }
  }

  // ---------- Chrono général (commun à toutes les équipes) ----------

  async function lancerTempsGeneral() {
    const minutes = Number(dureeDepart);
    if (!minutes || minutes <= 0) {
      alert("Indiquez une durée en minutes.");
      return;
    }
    setSavingTemps(true);
    try {
      await demarrerTempsGeneral(gameId, minutes * 60);
      setTempsGeneral({ finTimestamp: Date.now() + minutes * 60 * 1000 });
    } finally {
      setSavingTemps(false);
    }
  }

  async function ajusterTemps(minutes: number) {
    setSavingTemps(true);
    try {
      await ajusterTempsGeneral(gameId, minutes * 60);
      setTempsGeneral((t) => (t.finTimestamp ? { finTimestamp: t.finTimestamp + minutes * 60 * 1000 } : t));
    } finally {
      setSavingTemps(false);
    }
  }

  async function stopperTempsGeneral() {
    setSavingTemps(true);
    try {
      await arreterTempsGeneral(gameId);
      setTempsGeneral({ finTimestamp: null });
    } finally {
      setSavingTemps(false);
    }
  }

  // ---------- Message ponctuel diffusé à toutes les équipes ----------

  async function diffuserMessage() {
    if (!broadcastTexte.trim()) {
      alert("Écrivez le message à afficher.");
      return;
    }
    const secondes = Number(broadcastDuree) || 30;
    setSendingBroadcast(true);
    try {
      await envoyerBroadcast(gameId, broadcastTexte.trim(), secondes);
      setBroadcastEnvoye(true);
      setTimeout(() => setBroadcastEnvoye(false), 3000);
    } finally {
      setSendingBroadcast(false);
    }
  }

  async function lancerImportFichier() {
    if (!importFile) {
      alert("Choisissez d'abord un fichier .docx ou .pdf.");
      return;
    }
    setImporting(true);
    setImportMessage(null);
    try {
      const texte = await extraireTexteFichier(importFile);
      const parsed = parseScenario(texte);
      if (parsed.questions.length === 0) {
        setImportMessage(
          "Aucune énigme reconnue dans ce document. Vérifiez qu'il respecte bien le format ci-dessous (mots-clés SALLE / ENIGME / TYPE / TEXTE...)."
        );
        return;
      }
      if (
        !confirm(
          `${parsed.questions.length} énigme(s)/page(s) détectée(s)${
            parsed.histoire ? ", et un texte d'histoire" : ""
          }. Ceci remplacera toutes les énigmes existantes du circuit. Continuer ?`
        )
      )
        return;
      const resultat = await importerScenario(gameId, parsed);
      await reload();
      setImportFile(null);
      setImportMessage(
        `Import réussi : ${resultat.enigmes} énigme(s)/page(s) importée(s)` +
          (resultat.equipesCreees > 0
            ? `, ${resultat.equipesCreees} équipe créée automatiquement.`
            : ".")
      );
    } catch (e) {
      setImportMessage("Échec de l'import : " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setImporting(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-brand-navy px-4 sm:px-8 py-8">
      <h1 className="text-2xl font-bold mb-1">Espace organisateur</h1>
      <p className="text-slate-500 text-sm mb-6">Escape Game</p>

      <div
        className={`mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4 ring-2 ${
          gameStatus === "pause" ? "bg-red-50 ring-red-300" : "bg-slate-50 ring-slate-200"
        }`}
      >
        <div>
          <p className={`font-semibold ${gameStatus === "pause" ? "text-red-600" : "text-brand-navy"}`}>
            {gameStatus === "pause" ? "⏸️ Jeu en pause — bloqué chez toutes les équipes" : "▶️ Jeu actif"}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            En cas de bug, met en pause le circuit chez tout le monde en même temps, sans perte de progression.
          </p>
        </div>
        <button
          onClick={togglerGameStatus}
          disabled={togglingStatus}
          className={`rounded-full px-6 py-2.5 font-semibold text-white shadow-md transition disabled:opacity-60 ${
            gameStatus === "pause" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
          }`}
        >
          {gameStatus === "pause" ? "Reprendre le jeu" : "Mettre en pause"}
        </button>
      </div>

      <div className="mb-6 grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl px-5 py-4 ring-2 ring-slate-200 bg-slate-50">
          <p className="font-semibold text-brand-navy mb-1">⏱️ Chrono général (toutes les équipes)</p>
          {tempsGeneral.finTimestamp ? (
            <>
              <p className="text-xs text-slate-500 mb-3">
                Affiché à l&apos;écran chez toutes les équipes. Ajustez en direct si besoin.
              </p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => ajusterTemps(10)} disabled={savingTemps} className="bg-brand-blue text-white text-sm font-semibold px-3 py-1.5 rounded-full disabled:opacity-50">+10 min</button>
                <button onClick={() => ajusterTemps(-10)} disabled={savingTemps} className="bg-brand-blue text-white text-sm font-semibold px-3 py-1.5 rounded-full disabled:opacity-50">-10 min</button>
                <button onClick={() => ajusterTemps(1)} disabled={savingTemps} className="bg-white ring-1 ring-slate-200 text-brand-navy text-sm px-3 py-1.5 rounded-full disabled:opacity-50">+1 min</button>
                <button onClick={() => ajusterTemps(-1)} disabled={savingTemps} className="bg-white ring-1 ring-slate-200 text-brand-navy text-sm px-3 py-1.5 rounded-full disabled:opacity-50">-1 min</button>
                <button onClick={stopperTempsGeneral} disabled={savingTemps} className="text-red-500 underline text-sm">Arrêter</button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={dureeDepart}
                onChange={(e) => setDureeDepart(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 w-20 text-sm"
              />
              <span className="text-sm text-slate-500">minutes</span>
              <button onClick={lancerTempsGeneral} disabled={savingTemps} className="bg-brand-blue hover:bg-brand-navy text-white text-sm font-semibold px-4 py-1.5 rounded-full transition disabled:opacity-50">
                Démarrer
              </button>
            </div>
          )}
        </div>

        <div className="rounded-2xl px-5 py-4 ring-2 ring-violet-200 bg-violet-50">
          <p className="font-semibold text-brand-navy mb-1">📢 Message ponctuel (toutes les équipes)</p>
          <p className="text-xs text-slate-500 mb-3">
            S&apos;affiche par-dessus l&apos;écran de toutes les équipes pendant la durée choisie, sans arrêter leur
            progression (ex. « Une personne de votre équipe est en prison »).
          </p>
          <textarea
            value={broadcastTexte}
            onChange={(e) => setBroadcastTexte(e.target.value)}
            rows={2}
            placeholder="Message à afficher..."
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 mb-2 w-full text-sm"
          />
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={broadcastDuree}
              onChange={(e) => setBroadcastDuree(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 w-20 text-sm"
            />
            <span className="text-sm text-slate-500">secondes</span>
            <button onClick={diffuserMessage} disabled={sendingBroadcast} className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-1.5 rounded-full transition disabled:opacity-50">
              {sendingBroadcast ? "Envoi..." : "Diffuser maintenant"}
            </button>
            {broadcastEnvoye && <span className="text-xs text-green-600 font-medium">Envoyé ✓</span>}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-3 flex-wrap">
        <TabButton active={tab === "circuit"} onClick={() => setTab("circuit")}>Circuit du jeu</TabButton>
        <TabButton active={tab === "equipes"} onClick={() => setTab("equipes")}>Équipes</TabButton>
        <TabButton active={tab === "scenario"} onClick={() => setTab("scenario")}>Scénario</TabButton>
        <TabButton active={tab === "histoire"} onClick={() => setTab("histoire")}>Histoire</TabButton>
        <TabButton active={tab === "textes"} onClick={() => setTab("textes")}>Textes du site</TabButton>
      </div>

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
              onKeyDown={(e) => e.key === "Enter" && submitTeamForm()}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 mb-4 w-full"
              placeholder="Ex. Les Lions, Team Bassam..."
            />
            {!editingTeamId && (
              <p className="text-slate-500 text-xs mb-4">
                Toutes les équipes partagent le même circuit d&apos;énigmes en ligne.
              </p>
            )}

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
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <div>
                      <p className="font-medium text-sm text-brand-navy">{t.nom}</p>
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
              {qForm.type === "code"
                ? "Texte affiché en haut de la page"
                : qForm.type === "info"
                ? "Texte affiché à l'écran"
                : "Énigme"}
            </label>
            <textarea
              value={qForm.texte}
              onChange={(e) => setQForm({ ...qForm, texte: e.target.value })}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 mb-1 w-full"
              rows={qForm.type === "code" || qForm.type === "info" ? 3 : 2}
            />
            {qForm.type === "info" && (
              <p className="text-slate-500 text-xs mb-3">
                Entourez un mot de **doubles étoiles** pour l&apos;afficher en gras (ex. « **URGENT** »). Aucun code
                n&apos;est demandé sur cette page, juste un bouton pour continuer.
              </p>
            )}

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

            {(qForm.type === "qcm" || qForm.type === "libre") && (
              <>
                <label className="block text-sm text-slate-500 mb-1">
                  Fragment affiché après une bonne réponse (facultatif)
                </label>
                <textarea
                  value={qForm.fragmentTexte}
                  onChange={(e) => setQForm({ ...qForm, fragmentTexte: e.target.value })}
                  className="bg-white border border-slate-200 rounded-lg px-3 py-2 mb-1 w-full"
                  rows={2}
                  placeholder="Ex. Le premier mot du code final est « TREMPLIN »."
                />
                <p className="text-slate-500 text-xs mb-3">
                  Laissez vide si cette énigme ne débloque aucun fragment. Ce texte n&apos;a aucun lien avec les
                  fragments des autres énigmes.
                </p>
              </>
            )}

            {qForm.type !== "code" && (
              <p className="text-slate-500 text-xs mb-3">
                Les messages de réussite/échec affichés après cette énigme se gèrent globalement dans l&apos;onglet
                « Textes du site ».
              </p>
            )}

            {qForm.type === "code" && (
              <>
                <label className="block text-sm text-slate-500 mb-1">Message affiché si le code est correct (facultatif)</label>
                <input
                  value={qForm.feedbackCorrect}
                  onChange={(e) => setQForm({ ...qForm, feedbackCorrect: e.target.value })}
                  className="bg-white border border-slate-200 rounded-lg px-3 py-2 mb-3 w-full"
                  placeholder="Bravo, c'est la bonne réponse !"
                />
                <label className="block text-sm text-slate-500 mb-1">Message affiché si le code est incorrect</label>
                <input
                  value={qForm.feedbackIncorrect}
                  onChange={(e) => setQForm({ ...qForm, feedbackIncorrect: e.target.value })}
                  className="bg-white border border-slate-200 rounded-lg px-3 py-2 mb-3 w-full"
                  placeholder="Ce n'est pas ça, réessayez !"
                />
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
            <div className="flex gap-2 mb-4 text-xs flex-wrap">
              <button onClick={() => inserer(null, "libre")} disabled={savingStep} className="text-brand-blue underline disabled:text-slate-400">
                + Énigme en tête de circuit
              </button>
              <button onClick={() => inserer(null, "code")} disabled={savingStep} className="text-brand-blue underline disabled:text-slate-400">
                + Page code en tête de circuit
              </button>
            </div>

            {etapesSalle.length === 0 && (
              <p className="text-slate-500 text-sm">Aucune étape pour l&apos;instant.</p>
            )}

            <div className="flex flex-col gap-3">
              {etapesSalle.map((q, i) => (
                <div key={q.id}>
                  <div
                    className={`rounded-xl p-4 ${
                      q.type === "code"
                        ? "bg-amber-50 ring-1 ring-amber-200"
                        : q.type === "info"
                        ? "bg-violet-50 ring-1 ring-violet-200"
                        : "bg-brand-blue-light"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-medium text-sm text-brand-navy">
                        <span className="text-[10px] uppercase tracking-wide font-semibold mr-2 px-1.5 py-0.5 rounded bg-white/70">
                          {q.type === "code" ? `Page code ${i + 1}` : q.type === "info" ? `Page vierge ${i + 1}` : `Énigme ${i + 1}`}
                        </span>
                        {q.texte}
                        {q.type === "qcm" && <span className="ml-2 text-[10px] uppercase tracking-wide text-brand-blue font-semibold">QCM</span>}
                        {q.type === "libre" && <span className="ml-2 text-[10px] uppercase tracking-wide text-brand-blue font-semibold">Libre</span>}
                        {q.fragmentTexte && (
                          <span className="ml-2 text-[10px] uppercase tracking-wide text-amber-600 font-semibold">🏆 Fragment</span>
                        )}
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
                    ) : q.type === "info" ? null : (
                      <p className="text-slate-500 text-xs mt-2">
                        {q.type === "code" ? "Code attendu : " : "Réponse attendue : "}
                        {q.reponse}
                      </p>
                    )}
                    {q.fragmentTexte && (
                      <p className="text-amber-700 text-xs mt-1">🏆 Fragment débloqué : {q.fragmentTexte}</p>
                    )}
                    {q.tempsLimite && (
                      <p className="text-slate-500 text-xs mt-1">Temps limite : {formatTemps(q.tempsLimite)}</p>
                    )}
                  </div>
                  <div className="flex gap-3 text-[11px] mt-1 mb-1 pl-1 flex-wrap">
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

      {!loading && tab === "scenario" && (
        <section className="max-w-2xl">
          <p className="text-slate-600 mb-2 text-sm">
            Le fragment affiché après une énigme se modifie directement dans le formulaire de cette énigme, dans
            l&apos;onglet &quot;Circuit&quot;.
          </p>

          <div className="bg-brand-blue-light rounded-2xl p-5 mb-6">
            <h2 className="font-semibold mb-2 text-brand-navy">Vider le scénario actuel</h2>
            <p className="text-slate-600 text-sm mb-3">
              Supprime toutes les énigmes du circuit et le texte de l&apos;histoire, pour repartir d&apos;une page
              blanche avant d&apos;importer votre propre scénario. Les équipes ne sont pas touchées.
            </p>
            <button
              onClick={lancerVidage}
              disabled={viding}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold px-5 py-2 rounded-full transition disabled:opacity-60"
            >
              {viding ? "Suppression..." : "Vider le scénario actuel"}
            </button>
          </div>

          <div className="bg-brand-blue-light rounded-2xl p-5 mb-6">
            <h2 className="font-semibold mb-2 text-brand-navy">Importer un scénario (Word ou PDF)</h2>
            <p className="text-slate-600 text-sm mb-3">
              Choisissez un fichier <code>.docx</code> ou <code>.pdf</code> rédigé selon le format ci-dessous.
              L&apos;import remplace toutes les énigmes existantes du circuit.
            </p>
            <input
              type="file"
              accept=".docx,.pdf"
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
              className="block mb-3 text-sm"
            />
            <button
              onClick={lancerImportFichier}
              disabled={importing || !importFile}
              className="bg-brand-blue hover:bg-brand-navy text-white font-semibold px-5 py-2 rounded-full transition disabled:opacity-60"
            >
              {importing ? "Import en cours..." : "Importer ce fichier"}
            </button>
            {importMessage && <p className="text-slate-600 text-sm mt-3">{importMessage}</p>}
          </div>

          <div className="bg-amber-50 ring-1 ring-amber-200 rounded-2xl p-5">
            <h2 className="font-semibold mb-2 text-brand-navy">Format attendu du document</h2>
            <pre className="whitespace-pre-wrap text-xs text-slate-700 leading-relaxed">{SCENARIO_FORMAT_GUIDE}</pre>
          </div>
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
            placeholder="Bienvenue, vous avez une mission..."
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
            <TextField label="Titre écran fragment débloqué" value={siteTexts.jeuTexteFragmentTitre} onChange={(v) => setSiteText("jeuTexteFragmentTitre", v)} />
            <TextField label="Placeholder réponse libre" value={siteTexts.jeuPlaceholderReponseLibre} onChange={(v) => setSiteText("jeuPlaceholderReponseLibre", v)} />
          </TextGroup>

          <TextGroup title="Pages code (verrou entre deux étapes)">
            <TextField label="Placeholder du champ code" value={siteTexts.codePagePlaceholder} onChange={(v) => setSiteText("codePagePlaceholder", v)} />
            <TextField label="Bouton" value={siteTexts.codePageBouton} onChange={(v) => setSiteText("codePageBouton", v)} />
          </TextGroup>

          <TextGroup title="Pages vierges / informatives">
            <TextField label="Bouton « Continuer »" value={siteTexts.infoPageBouton} onChange={(v) => setSiteText("infoPageBouton", v)} />
            <p className="text-slate-500 text-xs">
              Le texte de chaque page vierge se rédige directement dans le circuit (onglet « Circuit »), entourez un
              mot de **doubles étoiles** pour l&apos;afficher en gras.
            </p>
          </TextGroup>

          <TextGroup title="Écran final">
            <TextField label="Titre" value={siteTexts.finTitre} onChange={(v) => setSiteText("finTitre", v)} />
            <TextAreaField label="Sous-titre" value={siteTexts.finSousTitre} onChange={(v) => setSiteText("finSousTitre", v)} rows={2} />
          </TextGroup>

          <TextGroup title="Page « suivre » (lecture seule pour l'équipe)">
            <TextField label="Bannière" value={siteTexts.suivreBanniere} onChange={(v) => setSiteText("suivreBanniere", v)} />
            <TextAreaField label="Texte d'attente (chef pas encore démarré)" value={siteTexts.suivreAttente} onChange={(v) => setSiteText("suivreAttente", v)} rows={2} />
            <TextField label="Message de chargement" value={siteTexts.suivreChargementLabel} onChange={(v) => setSiteText("suivreChargementLabel", v)} />
            <TextField label="Placeholder réponse (lecture seule)" value={siteTexts.suivrePlaceholderReponse} onChange={(v) => setSiteText("suivrePlaceholderReponse", v)} />
            <TextField label="Titre fragment débloqué" value={siteTexts.suivreFragmentTitre} onChange={(v) => setSiteText("suivreFragmentTitre", v)} />
            <TextField label="Texte d'attente (chef continue quand il est prêt)" value={siteTexts.suivreAttenteContinuer} onChange={(v) => setSiteText("suivreAttenteContinuer", v)} />
          </TextGroup>

          <TextGroup title="Écran de pause d'urgence (bouton « Mettre en pause » ci-dessus)">
            <TextField label="Titre" value={siteTexts.pauseTitre} onChange={(v) => setSiteText("pauseTitre", v)} />
            <TextAreaField label="Message" value={siteTexts.pauseMessage} onChange={(v) => setSiteText("pauseMessage", v)} rows={3} />
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
