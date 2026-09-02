"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { getQuestionsForSalle, getQuizConfig, getTeam, publierLiveState, claimerChef } from "@/lib/data";
import {
  Question,
  Team,
  normaliserReponse,
  normaliserFragment,
  calculerPlanDeblocage,
  PlanDeblocage,
  toutesLesLettresMelangees,
  messagePourEnigme,
  LiveState,
  fusionnerTextes,
  GameTexts,
} from "@/lib/types";
import { getSessionId } from "@/lib/session";
import LoadingScreen from "@/app/components/LoadingScreen";

type Phase = "loading" | "error" | "playing" | "termine";

export default function JouerEquipe() {
  const params = useParams();
  const teamId = Array.isArray(params.teamId) ? params.teamId[0] : params.teamId;

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
  const [fragment, setFragment] = useState("");
  const [plan, setPlan] = useState<PlanDeblocage | null>(null);
  const [toutesLettres, setToutesLettres] = useState<string[]>([]);
  const [lettresCollectees, setLettresCollectees] = useState<string[]>([]);
  const [dernieresLettres, setDernieresLettres] = useState<string | null>(null);
  const [saisieFragment, setSaisieFragment] = useState("");
  const [tentativesFragment, setTentativesFragment] = useState(0);
  const [resultatFragment, setResultatFragment] = useState<"attente" | "trouve" | "revele">("attente");
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
        const { ok } = await claimerChef(teamId, getSessionId());
        if (!ok) {
          setChefRefuse(true);
          setPhase("error");
          return;
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
        const idx = t.fragmentIndex;
        const fragmentTexte = idx !== null && idx !== undefined ? config.fragments[idx] || "" : "";
        setFragment(fragmentTexte);
        // Seules les vraies énigmes (pas les pages "code") débloquent des
        // lettres du fragment ; on construit le plan uniquement sur ces
        // positions puis on le reprojette sur l'index complet des étapes.
        const indicesEnigmes = qs
          .map((q, i) => (q.type === "code" ? -1 : i))
          .filter((i) => i !== -1);
        const planReduit = calculerPlanDeblocage(fragmentTexte, indicesEnigmes.length, t.id);
        const parQuestionComplet: (string | null)[] = new Array(qs.length).fill(null);
        indicesEnigmes.forEach((qIdx, k) => {
          parQuestionComplet[qIdx] = planReduit.parQuestion[k];
        });
        setPlan({ parQuestion: parQuestionComplet });
        setToutesLettres(toutesLesLettresMelangees(fragmentTexte, t.id));
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

  // Timer par question (jamais pour une page "code")
  useEffect(() => {
    if (phase !== "playing" || !question) return;
    if (timerRef.current) clearInterval(timerRef.current);
    if (isCodePage || !question.tempsLimite) {
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
      dernieresLettres,
      lettresMelangees: toutesLettres,
      saisieFragment,
      resultatFragment,
      fragment,
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
    dernieresLettres,
    toutesLettres,
    saisieFragment,
    resultatFragment,
    fragment,
  ]);

  function goNextQuestion() {
    setFeedback(null);
    setAwaitingContinue(false);
    setSelected(null);
    setDisabledOptions([]);
    setReponseLibre("");
    setAttempts(0);
    setDernieresLettres(null);
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
  function validerFragment() {
    if (!saisieFragment.trim()) return;
    const correct = normaliserFragment(saisieFragment) === normaliserFragment(fragment);
    if (correct) {
      setResultatFragment("trouve");
      return;
    }
    const nextTentatives = tentativesFragment + 1;
    setTentativesFragment(nextTentatives);
    if (nextTentatives >= 2) {
      setResultatFragment("revele");
    } else {
      setSaisieFragment("");
    }
  }

  function handleTimeout() {
    if (!question || isCodePage) return;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    if (nextAttempts >= 2) {
      setFeedback({ text: messagePourEnigme(index, false, texts.messagesReussite, texts.messagesEchec), ok: false });
      setAwaitingContinue(true);
    } else {
      setFeedback({ text: texts.jeuTexteTempsEcoule, ok: false });
      setNeedsRetryClick(true);
    }
  }

  function traiterReponse(correct: boolean) {
    if (!question) return;
    if (timerRef.current) clearInterval(timerRef.current);

    if (correct) {
      const lettresDebloquees = plan?.parQuestion[index] ?? null;
      if (lettresDebloquees) {
        setLettresCollectees((l) => [...l, lettresDebloquees]);
        setDernieresLettres(lettresDebloquees);
      } else {
        setDernieresLettres(null);
      }
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
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      if (nextAttempts >= 2) {
        setFeedback({ text: messagePourEnigme(index, false, texts.messagesReussite, texts.messagesEchec), ok: false });
        setAwaitingContinue(true);
      } else {
        setFeedback({ text: texts.jeuTexteMauvaiseReponse, ok: false });
        setNeedsRetryClick(true);
      }
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
          <h1 className="text-2xl font-extrabold mb-6 text-brand-navy">{texts.finTitre}</h1>

          {resultatFragment === "attente" && (
            <>
              <p className="text-slate-600 mb-3">{texts.finTexteReconstituer}</p>
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {toutesLettres.length > 0 ? (
                  toutesLettres.map((l, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center justify-center h-11 w-11 rounded-xl bg-brand-blue-light ring-1 ring-brand-blue/30 text-brand-navy font-bold text-lg"
                    >
                      {l}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-400">{texts.finAucuneLettre}</span>
                )}
              </div>
              <div className="w-full flex flex-col gap-3">
                <input
                  value={saisieFragment}
                  onChange={(e) => setSaisieFragment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && validerFragment()}
                  placeholder={texts.finPlaceholderSaisie}
                  className="px-5 py-4 rounded-2xl border-2 border-transparent bg-brand-blue-light/70 focus:border-brand-blue outline-none text-brand-navy text-center font-medium transition-all duration-200"
                />
                <button
                  onClick={validerFragment}
                  disabled={!saisieFragment.trim()}
                  className="self-center rounded-full bg-gradient-to-r from-brand-blue to-brand-navy px-8 py-3.5 font-semibold text-white shadow-md shadow-brand-blue/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:translate-y-0 disabled:bg-none disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed"
                >
                  {texts.finLabelValiderFragment}
                </button>
                {tentativesFragment === 1 && (
                  <p className="text-sm text-brand-blue font-medium">{texts.finTexteDerniereTentative}</p>
                )}
              </div>
            </>
          )}

          {resultatFragment === "trouve" && (
            <>
              <p className="text-2xl mb-2">🎉</p>
              <p className="text-slate-600 mb-3">{texts.finTexteTrouve}</p>
              <div className="bg-gradient-to-r from-brand-blue-light to-white ring-1 ring-brand-blue/30 text-brand-navy font-bold text-2xl px-8 py-5 rounded-2xl mb-8 shadow-sm">
                {fragment}
              </div>
            </>
          )}

          {resultatFragment === "revele" && (
            <>
              <p className="text-slate-600 mb-3">{texts.finTexteRevele}</p>
              <div className="bg-gradient-to-r from-brand-blue-light to-white ring-1 ring-brand-blue/30 text-brand-navy font-bold text-2xl px-8 py-5 rounded-2xl mb-8 shadow-sm">
                {fragment}
              </div>
            </>
          )}

          {resultatFragment !== "attente" && (
            <p className="text-slate-500 max-w-sm">{texts.finTexteDirectionAmphi}</p>
          )}
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
          <span>{isCodePage ? "Page suivante" : `Énigme ${index + 1} / ${questions.length}`}</span>
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
        <h1 className="text-xl font-semibold leading-snug text-brand-navy">{question.texte}</h1>
      </div>

      {isCodePage ? (
        <div className="flex flex-col gap-3">
          <input
            value={reponseLibre}
            onChange={(e) => setReponseLibre(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAnswerLibre()}
            disabled={!!feedback}
            placeholder={texts.codePagePlaceholder}
            className={`px-5 py-4 rounded-2xl border-2 outline-none transition-all duration-200 text-center font-medium tracking-wide ${
              feedback
                ? feedback.ok
                  ? "bg-green-500 border-green-500 text-white"
                  : "bg-red-500 border-red-500 text-white"
                : "bg-brand-blue-light/70 border-transparent focus:border-brand-blue text-brand-navy"
            }`}
          />
          {!feedback && (
            <button
              onClick={handleAnswerLibre}
              disabled={!reponseLibre.trim()}
              className="self-start rounded-full bg-gradient-to-r from-brand-blue to-brand-navy px-6 py-3 font-semibold text-white shadow-md shadow-brand-blue/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:translate-y-0 disabled:bg-none disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed"
            >
              {texts.codePageBouton}
            </button>
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

            return (
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
            disabled={!!feedback}
            placeholder={texts.jeuPlaceholderReponseLibre}
            className={`px-5 py-4 rounded-2xl border-2 outline-none transition-all duration-200 ${
              feedback
                ? feedback.ok
                  ? "bg-green-500 border-green-500 text-white"
                  : "bg-red-500 border-red-500 text-white"
                : "bg-brand-blue-light/70 border-transparent focus:border-brand-blue text-brand-navy"
            }`}
          />
          {!feedback && (
            <button
              onClick={handleAnswerLibre}
              disabled={!reponseLibre.trim()}
              className="self-start rounded-full bg-gradient-to-r from-brand-blue to-brand-navy px-6 py-3 font-semibold text-white shadow-md shadow-brand-blue/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:translate-y-0 disabled:bg-none disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed"
            >
              {texts.jeuLabelValider}
            </button>
          )}
          {awaitingContinue && feedback && !feedback.ok && question.reponse && (
            <div className="rounded-2xl bg-green-50 ring-2 ring-green-500 text-green-700 px-5 py-3 text-sm">
              <span className="font-semibold uppercase tracking-wide text-xs">{texts.jeuTexteBonneReponseLabel} </span>
              {question.reponse}
            </div>
          )}
        </div>
      )}

      {feedback && feedback.ok && dernieresLettres && (
        <div className="mt-6 rounded-2xl bg-gradient-to-r from-brand-blue-light to-white ring-2 ring-brand-blue/40 px-5 py-4 text-center shadow-sm">
          <p className="text-2xl mb-1">🏆</p>
          <p className="font-semibold text-brand-navy">{texts.jeuTexteLettreDebloqueeTitre}</p>
          <p className="my-2 text-2xl font-extrabold tracking-widest text-brand-blue">
            {dernieresLettres}
          </p>
          <p className="text-sm text-slate-500">{texts.jeuTexteLettreDebloqueeNote}</p>
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

      {attempts === 1 && !feedback && !isCodePage && (
        <p className="mt-6 text-center text-brand-blue text-sm font-medium">{texts.jeuTexteDerniereTentative}</p>
      )}

      {needsRetryClick && (
        <button
          onClick={handleRetry}
          className="group mt-6 inline-flex items-center justify-center gap-2 self-center rounded-full bg-gradient-to-r from-brand-blue to-brand-navy px-8 py-3.5 font-semibold text-white shadow-lg shadow-brand-blue/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
        >
          {texts.jeuLabelReessayer}
        </button>
      )}

      {awaitingContinue && (
        <button
          onClick={goNextQuestion}
          className="group mt-6 inline-flex items-center justify-center gap-2 self-center rounded-full bg-gradient-to-r from-brand-blue to-brand-navy px-8 py-3.5 font-semibold text-white shadow-lg shadow-brand-blue/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
        >
          {isLastQuestion ? texts.jeuLabelVoirResultat : texts.jeuLabelEnigmeSuivante}
          <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
        </button>
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
