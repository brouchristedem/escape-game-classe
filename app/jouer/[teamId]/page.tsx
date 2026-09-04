"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  getQuestionsForSalle,
  getQuizConfig,
  saveQuizConfig,
  getTeam,
  publierLiveState,
  claimerChef,
  updateQuestion,
  addQuestion,
  deleteQuestion,
  renumeroterEtapes,
} from "@/lib/data";
import {
  Question,
  Team,
  normaliserReponse,
  messagePourEnigme,
  LiveState,
  fusionnerTextes,
  GameTexts,
} from "@/lib/types";
import { getSessionId } from "@/lib/session";
import LoadingScreen from "@/app/components/LoadingScreen";
import EditableText from "@/app/components/EditableText";
import RichText from "@/app/components/RichText";
import { useAdminMode } from "@/lib/adminMode";

type Phase = "loading" | "error" | "playing" | "termine";

export default function JouerEquipe() {
  const params = useParams();
  const teamId = Array.isArray(params.teamId) ? params.teamId[0] : params.teamId;
  const { editMode } = useAdminMode();

  const [phase, setPhase] = useState<Phase>("loading");
  const [team, setTeam] = useState<Team | null>(null);
  const [erreurDetail, setErreurDetail] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [texts, setTexts] = useState<GameTexts>(fusionnerTextes());
  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState(0); // tentatives utilisées sur la question en cours
  const [selected, setSelected] = useState<number | null>(null);
  const [disabledOptions, setDisabledOptions] = useState<number[]>([]);
  const [reponseLibre, setReponseLibre] = useState("");
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);
  const [awaitingContinue, setAwaitingContinue] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  // Fragment libre (Question.fragmentTexte) débloqué par la dernière bonne
  // réponse ; affiché avec le design "trophée" juste après la réponse.
  const [fragmentTexte, setFragmentTexte] = useState<string | null>(null);
  const [needsRetryClick, setNeedsRetryClick] = useState(false);
  const [essaiKey, setEssaiKey] = useState(0);
  const [chefRefuse, setChefRefuse] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!teamId) {
      setPhase("error");
      return;
    }
    (async () => {
      try {
        // Reprend/confirme la main en tant que chef d'équipe (couvre le cas
        // d'un accès direct par URL ou d'un rechargement de page, en plus du
        // clic depuis la page de sélection d'équipe). Si un autre appareil a
        // déjà la main, on s'arrête là sans démarrer la partie.
        // Exception : l'organisateur en mode édition ne prend jamais la main
        // (lecture directe de sessionStorage ici pour éviter tout décalage
        // avec le contexte React au tout premier rendu).
        const previewOrganisateur =
          typeof window !== "undefined" &&
          sessionStorage.getItem("admin_ok") === "1" &&
          sessionStorage.getItem("admin_edit_mode") === "1";
        if (!previewOrganisateur) {
          const { ok } = await claimerChef(teamId, getSessionId());
          if (!ok) {
            setChefRefuse(true);
            setPhase("error");
            return;
          }
        }

        const t = await getTeam(teamId);
        if (!t) {
          setPhase("error");
          return;
        }
        setTeam(t);
        const [qs, config] = await Promise.all([getQuestionsForSalle(t.salle), getQuizConfig()]);
        setTexts(fusionnerTextes(config.texts));
        if (qs.length === 0) {
          setErreurDetail(`Aucune énigme trouvée pour la salle "${t.salle}".`);
          setPhase("error");
          return;
        }
        setQuestions(qs);
        setPhase("playing");
      } catch (e) {
        setErreurDetail(e instanceof Error ? e.message : String(e));
        setPhase("error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const question = questions[index];
  const isCodePage = question?.type === "code";
  const isInfoPage = question?.type === "info";

  // Timer par question (jamais pour une page "code" ou "info")
  useEffect(() => {
    if (phase !== "playing" || !question) return;
    if (timerRef.current) clearInterval(timerRef.current);
    if (isCodePage || isInfoPage || !question.tempsLimite) {
      setTimeLeft(null);
      return;
    }
    setTimeLeft(question.tempsLimite);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t === null) return null;
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, phase, essaiKey]);

  // Diffuse en direct l'état de l'écran pour les membres de l'équipe qui
  // suivent le chef d'équipe depuis /suivre (lecture seule).
  useEffect(() => {
    if (!teamId) return;
    if (phase !== "playing" && phase !== "termine") return;
    // En mode édition, l'organisateur navigue sans publier son état : on ne
    // veut pas écraser l'écran en direct d'une vraie équipe qui joue.
    if (editMode) return;
    const state: LiveState = {
      phase,
      index,
      totalQuestions: questions.length,
      questionTexte: question?.texte ?? "",
      questionType: question?.type === "code" ? "libre" : question?.type ?? "libre",
      propositions: question?.propositions,
      selected,
      disabledOptions,
      reponseLibre,
      feedbackText: feedback?.text ?? null,
      feedbackOk: feedback?.ok ?? null,
      awaitingContinue,
      attempts,
      timeLeft,
      fragmentTexte,
      updatedAt: Date.now(),
      chefSessionId: getSessionId(),
    };
    publierLiveState(teamId, state);

    // Battement de coeur : même sans changement d'état (le chef d'équipe lit
    // une énigme sans agir), on republie régulièrement pour que sa place ne
    // soit pas considérée libre et reprise par un autre appareil.
    const heartbeat = setInterval(() => {
      publierLiveState(teamId, { ...state, updatedAt: Date.now() });
    }, 20_000);
    return () => clearInterval(heartbeat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    teamId,
    phase,
    index,
    questions.length,
    question,
    selected,
    disabledOptions,
    reponseLibre,
    feedback,
    awaitingContinue,
    attempts,
    timeLeft,
    fragmentTexte,
  ]);

  function goNextQuestion() {
    setFeedback(null);
    setAwaitingContinue(false);
    setSelected(null);
    setDisabledOptions([]);
    setReponseLibre("");
    setAttempts(0);
    setFragmentTexte(null);
    setNeedsRetryClick(false);
    setEssaiKey(0);
    if (index + 1 >= questions.length) {
      finishQuiz();
    } else {
      setIndex((i) => i + 1);
    }
  }

  function handleRetry() {
    setFeedback(null);
    setSelected(null);
    setReponseLibre("");
    setNeedsRetryClick(false);
    setEssaiKey((k) => k + 1);
  }

  function finishQuiz() {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("termine");
  }

  // ---------- Édition en direct (organisateur uniquement) ----------

  function allerAEtape(cible: number) {
    if (cible < 0 || cible >= questions.length) return;
    setFeedback(null);
    setAwaitingContinue(false);
    setSelected(null);
    setDisabledOptions([]);
    setReponseLibre("");
    setAttempts(0);
    setFragmentTexte(null);
    setNeedsRetryClick(false);
    setEssaiKey(0);
    setIndex(cible);
  }

  async function saveQuestionField<K extends keyof Question>(key: K, value: Question[K]) {
    if (!question) return;
    await updateQuestion(question.id, { [key]: value } as Partial<Question>);
    setQuestions((qs) => qs.map((q) => (q.id === question.id ? { ...q, [key]: value } : q)));
  }

  async function saveGlobalText<K extends keyof GameTexts>(key: K, value: GameTexts[K]) {
    const next = { ...texts, [key]: value };
    setTexts(next);
    await saveQuizConfig({ texts: next });
  }

  // Modifie le fragment libre affiché après une bonne réponse à CETTE
  // énigme précise, directement depuis le circuit en mode édition.
  async function saveFragmentText(value: string) {
    await saveQuestionField("fragmentTexte", value);
  }

  // Insère une nouvelle étape (énigme libre, page code ou page vierge
  // info) juste après l'étape actuellement affichée, renumérote le
  // circuit, puis affiche directement la nouvelle étape pour que
  // l'organisateur la remplisse — sans jamais passer par /admin.
  async function inserer(type: "libre" | "code" | "info") {
    if (!team || !question) return;
    const ordreProvisoire = question.ordre + 0.5;
    const texteParDefaut =
      type === "code"
        ? "Nouvelle page : entrez le code pour continuer."
        : type === "info"
        ? "Nouvelle page vierge à rédiger."
        : "Nouvelle énigme à rédiger.";
    const nouvelle = {
      salle: team.salle,
      ordre: ordreProvisoire,
      type,
      texte: texteParDefaut,
      ...(type === "info" ? {} : { reponse: "" }),
      feedbackCorrect: "",
      feedbackIncorrect: "",
      tempsLimite: null as number | null,
    };
    const newId = await addQuestion(nouvelle);
    const tousTries = [...questions, { ...nouvelle, id: newId } as Question].sort((a, b) => a.ordre - b.ordre);
    await renumeroterEtapes(tousTries.map((q) => q.id));
    const qs = await getQuestionsForSalle(team.salle);
    setQuestions(qs);
    const nouvelIndex = qs.findIndex((q) => q.id === newId);
    if (nouvelIndex !== -1) {
      setFeedback(null);
      setAwaitingContinue(false);
      setSelected(null);
      setDisabledOptions([]);
      setReponseLibre("");
      setAttempts(0);
      setIndex(nouvelIndex);
    }
  }

  async function supprimerEtapeActuelle() {
    if (!team || !question) return;
    if (!confirm("Supprimer cette étape du circuit ?")) return;
    await deleteQuestion(question.id);
    const restantes = questions.filter((q) => q.id !== question.id).sort((a, b) => a.ordre - b.ordre);
    await renumeroterEtapes(restantes.map((q) => q.id));
    const qs = await getQuestionsForSalle(team.salle);
    setQuestions(qs);
    setFeedback(null);
    setAwaitingContinue(false);
    setIndex((i) => Math.min(i, Math.max(qs.length - 1, 0)));
  }

  function handleTimeout() {
    if (!question || isCodePage || isInfoPage) return;
    setAttempts((a) => a + 1);
    // Temps écoulé : on ne fait jamais avancer automatiquement, l'équipe réessaie
    // jusqu'à trouver la bonne réponse.
    setFeedback({ text: texts.jeuTexteTempsEcoule, ok: false });
    setNeedsRetryClick(true);
  }

  // Page "info" : aucune réponse à donner, on passe directement à la suite.
  function continuerPageInfo() {
    goNextQuestion();
  }

  function traiterReponse(correct: boolean) {
    if (!question) return;
    if (timerRef.current) clearInterval(timerRef.current);

    if (correct) {
      setFragmentTexte(question.fragmentTexte?.trim() ? question.fragmentTexte : null);
      setFeedback({
        text: isCodePage
          ? question.feedbackCorrect || messagePourEnigme(index, true, texts.messagesReussite, texts.messagesEchec)
          : messagePourEnigme(index, true, texts.messagesReussite, texts.messagesEchec),
        ok: true,
      });
      setAwaitingContinue(true);
    } else if (isCodePage) {
      // Page "code" : pas de limite de tentatives, on laisse réessayer directement.
      setFeedback({ text: question.feedbackIncorrect || texts.jeuTexteMauvaiseReponse, ok: false });
      setNeedsRetryClick(true);
    } else {
      setAttempts((a) => a + 1);
      // Mauvaise réponse : jamais de passage automatique, l'équipe réessaie
      // jusqu'à trouver la bonne énigme.
      setFeedback({ text: texts.jeuTexteMauvaiseReponse, ok: false });
      setNeedsRetryClick(true);
    }
  }

  function handleAnswerQcm(optionIndex: number) {
    if (!question || feedback) return; // déjà en train de traiter une réponse
    setSelected(optionIndex);
    const correct = optionIndex === question.correctIndex;
    if (!correct) setDisabledOptions((d) => [...d, optionIndex]);
    traiterReponse(correct);
  }

  function handleAnswerLibre() {
    if (!question || feedback || !reponseLibre.trim()) return;
    const correct = normaliserReponse(reponseLibre) === normaliserReponse(question.reponse ?? "");
    traiterReponse(correct);
  }

  if (phase === "loading") {
    return <LoadingScreen label={texts.jeuChargementLabel} />;
  }

  if (phase === "error") {
    return (
      <Centered>
        {chefRefuse
          ? texts.jeuErreurChefRefuse
          : team
          ? texts.jeuErreurAucuneEnigme
          : texts.jeuErreurEquipeIntrouvable}
        {erreurDetail && (
          <span className="block text-xs text-slate-400 mt-3">{erreurDetail}</span>
        )}
      </Centered>
    );
  }

  if (phase === "termine") {
    return (
      <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6 py-16 bg-white text-center">
        <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-brand-blue/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-brand-navy/10 blur-3xl" />
        <div className="relative z-10 flex flex-col items-center max-w-md w-full">
          <p className="text-brand-blue font-semibold mb-2">{team?.nom}</p>
          {editMode && (
            <button
              onClick={() => {
                setPhase("playing");
                setIndex(Math.max(questions.length - 1, 0));
              }}
              className="text-xs text-brand-blue underline mb-4"
            >
              ← Revenir au circuit
            </button>
          )}
          <EditableText as="h1" value={texts.finTitre} onSave={(v) => saveGlobalText("finTitre", v)} className="text-2xl font-extrabold mb-4 text-brand-navy" />
          <EditableText as="p" multiline value={texts.finSousTitre} onSave={(v) => saveGlobalText("finSousTitre", v)} className="text-slate-500 max-w-sm" />
        </div>
      </main>
    );
  }

  if (!question) return <LoadingScreen />;

  const isLastQuestion = index + 1 >= questions.length;
  const progress = ((index + (feedback?.ok ? 1 : 0)) / questions.length) * 100;

  return (
    <main className="min-h-screen flex flex-col px-6 py-8 bg-white max-w-xl mx-auto w-full">
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
          <span className="font-medium text-brand-navy">{team?.nom}</span>
          <span>{isCodePage || isInfoPage ? "Page suivante" : `Énigme ${index + 1} / ${questions.length}`}</span>
          {timeLeft !== null && (
            <span
              className={`font-semibold rounded-full px-2.5 py-0.5 transition-colors ${
                timeLeft <= 5 ? "bg-red-50 text-red-500" : "bg-brand-blue-light text-brand-blue"
              }`}
            >
              {timeLeft}s
            </span>
          )}
        </div>
        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-blue to-brand-navy transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="rounded-3xl bg-white ring-1 ring-black/5 shadow-[0_4px_24px_rgba(20,163,221,0.08)] p-6 sm:p-7 mb-6">
        {isInfoPage && !editMode ? (
          <RichText text={question.texte} className="text-xl font-semibold leading-snug text-brand-navy" />
        ) : (
          <EditableText
            as="h1"
            multiline
            value={question.texte}
            onSave={(v) => saveQuestionField("texte", v)}
            className="text-xl font-semibold leading-snug text-brand-navy"
          />
        )}
      </div>

      {isInfoPage ? (
        <div className="flex flex-col gap-4">
          {!editMode && (
            <button
              onClick={continuerPageInfo}
              className="group self-center rounded-full bg-gradient-to-r from-brand-blue to-brand-navy px-8 py-3.5 font-semibold text-white shadow-lg shadow-brand-blue/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
            >
              <EditableText as="span" value={texts.infoPageBouton} onSave={(v) => saveGlobalText("infoPageBouton", v)} className="text-white" />
              <span className="ml-2 transition-transform duration-200 inline-block group-hover:translate-x-1">→</span>
            </button>
          )}
          {editMode && (
            <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-4 flex flex-col gap-2">
              <label className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                Texte du bouton
              </label>
              <EditableText as="p" value={texts.infoPageBouton} onSave={(v) => saveGlobalText("infoPageBouton", v)} className="text-sm text-slate-700" />
              <p className="text-[11px] text-amber-700/70 mt-1">
                Entourez un mot de **doubles étoiles** dans le texte ci-dessus pour l&apos;afficher en gras.
              </p>
            </div>
          )}
        </div>
      ) : isCodePage ? (
        <div className="flex flex-col gap-3">
          <input
            value={reponseLibre}
            onChange={(e) => setReponseLibre(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAnswerLibre()}
            disabled={!!feedback || editMode}
            placeholder={texts.codePagePlaceholder}
            className={`px-5 py-4 rounded-2xl border-2 outline-none transition-all duration-200 text-center font-medium tracking-wide ${
              feedback
                ? feedback.ok
                  ? "bg-green-500 border-green-500 text-white"
                  : "bg-red-500 border-red-500 text-white"
                : "bg-brand-blue-light/70 border-transparent focus:border-brand-blue text-brand-navy"
            }`}
          />
          {!feedback && !editMode && (
            <button
              onClick={handleAnswerLibre}
              disabled={!reponseLibre.trim()}
              className="self-start rounded-full bg-gradient-to-r from-brand-blue to-brand-navy px-6 py-3 font-semibold text-white shadow-md shadow-brand-blue/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:translate-y-0 disabled:bg-none disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed"
            >
              {texts.codePageBouton}
            </button>
          )}
          {editMode && (
            <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-4 flex flex-col gap-2">
              <label className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Texte du bouton</label>
              <EditableText as="p" value={texts.codePageBouton} onSave={(v) => saveGlobalText("codePageBouton", v)} className="text-sm text-slate-700" />
              <label className="text-xs font-semibold text-amber-700 uppercase tracking-wide mt-1">Code attendu (visible uniquement par vous)</label>
              <EditableText
                as="p"
                value={question.reponse ?? ""}
                onSave={(v) => saveQuestionField("reponse", v)}
                placeholder="Ex. IUA2026"
                className="font-mono text-brand-navy"
              />
              <label className="text-xs font-semibold text-amber-700 uppercase tracking-wide mt-2">Message si code correct</label>
              <EditableText
                as="p"
                value={question.feedbackCorrect}
                onSave={(v) => saveQuestionField("feedbackCorrect", v)}
                placeholder="(message par défaut)"
                className="text-sm text-slate-700"
              />
              <label className="text-xs font-semibold text-amber-700 uppercase tracking-wide mt-2">Message si code incorrect</label>
              <EditableText
                as="p"
                value={question.feedbackIncorrect}
                onSave={(v) => saveQuestionField("feedbackIncorrect", v)}
                placeholder="(message par défaut)"
                className="text-sm text-slate-700"
              />
            </div>
          )}
        </div>
      ) : question.type === "qcm" ? (
        <div className="flex flex-col gap-3">
          {(question.propositions ?? []).map((prop, i) => {
            const isDisabled = disabledOptions.includes(i);
            const isSelected = selected === i;
            const isCorrectOption = i === question.correctIndex;
            const revealCorrect = awaitingContinue && feedback && !feedback.ok && isCorrectOption && !isSelected;

            let style = "bg-brand-blue-light/70 ring-1 ring-black/5 hover:ring-brand-blue/40 hover:-translate-y-0.5 hover:shadow-md text-brand-navy";
            if (feedback && isSelected) {
              style = feedback.ok
                ? "bg-green-500 text-white ring-1 ring-green-500 shadow-md shadow-green-500/20"
                : "bg-red-500 text-white ring-1 ring-red-500 shadow-md shadow-red-500/20";
            } else if (revealCorrect) {
              style = "bg-green-50 text-green-700 ring-2 ring-green-500";
            } else if (isDisabled) {
              style = "bg-slate-100 text-slate-400 line-through ring-1 ring-black/5";
            }
            if (editMode && isCorrectOption) style += " ring-2 ring-green-500";

            return editMode ? (
              <div key={i} className={`flex items-center gap-2 px-5 py-3 rounded-2xl ${style}`}>
                <button
                  onClick={() => saveQuestionField("correctIndex", i as 0 | 1 | 2 | 3)}
                  title="Marquer comme la bonne réponse"
                  className={`shrink-0 h-5 w-5 rounded-full border-2 ${
                    isCorrectOption ? "bg-green-500 border-green-500" : "border-slate-300"
                  }`}
                />
                <EditableText
                  as="span"
                  value={prop}
                  onSave={(v) => {
                    const next = [...(question.propositions ?? ["", "", "", ""])] as [string, string, string, string];
                    next[i] = v;
                    saveQuestionField("propositions", next);
                  }}
                  className="flex-1 text-left"
                />
              </div>
            ) : (
              <button
                key={i}
                disabled={isDisabled || !!feedback}
                onClick={() => handleAnswerQcm(i)}
                className={`text-left px-5 py-4 rounded-2xl transition-all duration-200 ${style} disabled:cursor-not-allowed`}
              >
                {prop}
                {revealCorrect && <span className="ml-2 text-xs font-semibold uppercase tracking-wide">Bonne réponse</span>}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <input
            value={reponseLibre}
            onChange={(e) => setReponseLibre(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAnswerLibre()}
            disabled={!!feedback || editMode}
            placeholder={texts.jeuPlaceholderReponseLibre}
            className={`px-5 py-4 rounded-2xl border-2 outline-none transition-all duration-200 ${
              feedback
                ? feedback.ok
                  ? "bg-green-500 border-green-500 text-white"
                  : "bg-red-500 border-red-500 text-white"
                : "bg-brand-blue-light/70 border-transparent focus:border-brand-blue text-brand-navy"
            }`}
          />
          {!feedback && !editMode && (
            <button
              onClick={handleAnswerLibre}
              disabled={!reponseLibre.trim()}
              className="self-start rounded-full bg-gradient-to-r from-brand-blue to-brand-navy px-6 py-3 font-semibold text-white shadow-md shadow-brand-blue/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:translate-y-0 disabled:bg-none disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed"
            >
              {texts.jeuLabelValider}
            </button>
          )}
          {editMode && (
            <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-4 flex flex-col gap-2">
              <label className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Texte du bouton</label>
              <EditableText as="p" value={texts.jeuLabelValider} onSave={(v) => saveGlobalText("jeuLabelValider", v)} className="text-sm text-slate-700" />
              <label className="text-xs font-semibold text-amber-700 uppercase tracking-wide mt-1">Réponse attendue (visible uniquement par vous)</label>
              <EditableText
                as="p"
                value={question.reponse ?? ""}
                onSave={(v) => saveQuestionField("reponse", v)}
                className="font-mono text-brand-navy"
              />
            </div>
          )}
          {awaitingContinue && feedback && !feedback.ok && question.reponse && (
            <div className="rounded-2xl bg-green-50 ring-2 ring-green-500 text-green-700 px-5 py-3 text-sm">
              <span className="font-semibold uppercase tracking-wide text-xs">{texts.jeuTexteBonneReponseLabel} </span>
              {question.reponse}
            </div>
          )}
        </div>
      )}

      {editMode && (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <button onClick={() => inserer("libre")} className="text-brand-blue underline">
            + Insérer une énigme après cette étape
          </button>
          <button onClick={() => inserer("code")} className="text-brand-blue underline">
            + Insérer une page code après cette étape
          </button>
          <button onClick={() => inserer("info")} className="text-brand-blue underline">
            + Insérer une page vierge après cette étape
          </button>
          <button onClick={supprimerEtapeActuelle} className="text-red-500 underline">
            Supprimer cette étape
          </button>
        </div>
      )}

      {!isCodePage && !isInfoPage && (editMode || (feedback && feedback.ok && fragmentTexte)) && (
        <div className="mt-6 rounded-2xl bg-gradient-to-r from-brand-blue-light to-white ring-2 ring-brand-blue/40 px-5 py-4 text-center shadow-sm">
          <p className="text-2xl mb-1">🏆</p>
          <EditableText
            as="p"
            value={texts.jeuTexteFragmentTitre}
            onSave={(v) => saveGlobalText("jeuTexteFragmentTitre", v)}
            className="font-semibold text-brand-navy"
          />
          <p className="my-2 text-lg font-bold text-brand-blue">
            {fragmentTexte || (editMode ? "" : "")}
          </p>
          <div className={editMode ? "mt-3 pt-3 border-t border-brand-blue/20 text-left" : ""}>
            {editMode && (
              <p className="text-[10px] font-semibold text-brand-navy/60 uppercase tracking-wide mb-1">
                Fragment affiché après cette énigme (texte libre, facultatif)
              </p>
            )}
            <EditableText
              as="p"
              value={question.fragmentTexte ?? ""}
              onSave={saveFragmentText}
              placeholder="Écrire le fragment à afficher après cette énigme..."
              className="font-bold text-brand-blue"
            />
          </div>
        </div>
      )}

      {feedback && (
        <div
          className={`mt-6 rounded-2xl px-5 py-3.5 text-center font-medium ${
            feedback.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {!isInfoPage && (needsRetryClick || editMode) && (
        <button
          onClick={handleRetry}
          className="group mt-6 inline-flex items-center justify-center gap-2 self-center rounded-full bg-gradient-to-r from-brand-blue to-brand-navy px-8 py-3.5 font-semibold text-white shadow-lg shadow-brand-blue/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
        >
          <EditableText as="span" value={texts.jeuLabelReessayer} onSave={(v) => saveGlobalText("jeuLabelReessayer", v)} className="text-white" />
        </button>
      )}

      {!isInfoPage && awaitingContinue && !editMode && (
        <button
          onClick={goNextQuestion}
          className="group mt-6 inline-flex items-center justify-center gap-2 self-center rounded-full bg-gradient-to-r from-brand-blue to-brand-navy px-8 py-3.5 font-semibold text-white shadow-lg shadow-brand-blue/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
        >
          {isLastQuestion ? texts.jeuLabelVoirResultat : texts.jeuLabelEnigmeSuivante}
          <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
        </button>
      )}

      {editMode && (
        <div className="mt-8 flex items-center justify-between gap-3 sticky bottom-4 bg-white/90 backdrop-blur rounded-2xl ring-1 ring-black/10 px-4 py-3 shadow-lg">
          <button
            onClick={() => allerAEtape(index - 1)}
            disabled={index === 0}
            className="text-sm font-semibold text-brand-navy disabled:text-slate-300"
          >
            ← Étape précédente
          </button>
          <span className="text-xs text-slate-400">Vous parcourez le circuit en mode édition</span>
          {isLastQuestion ? (
            <button onClick={finishQuiz} className="text-sm font-semibold text-brand-blue">
              Voir l&apos;écran final →
            </button>
          ) : (
            <button
              onClick={() => allerAEtape(index + 1)}
              className="text-sm font-semibold text-brand-navy disabled:text-slate-300"
            >
              Étape suivante →
            </button>
          )}
        </div>
      )}
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden px-6 text-center bg-white text-brand-navy">
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-brand-blue/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-brand-navy/10 blur-3xl" />
      <p className="relative z-10 max-w-sm">{children}</p>
    </main>
  );
}
