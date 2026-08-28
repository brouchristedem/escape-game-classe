"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { getQuestionsForSalle, getQuizConfig, getTeam } from "@/lib/data";
import { Question, Team, normaliserReponse } from "@/lib/types";
import LoadingScreen from "@/app/components/LoadingScreen";

type Phase = "loading" | "error" | "playing" | "termine";

export default function JouerEquipe() {
  const params = useParams();
  const teamId = Array.isArray(params.teamId) ? params.teamId[0] : params.teamId;

  const [phase, setPhase] = useState<Phase>("loading");
  const [team, setTeam] = useState<Team | null>(null);
  const [erreurDetail, setErreurDetail] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState(0); // tentatives utilisées sur la question en cours
  const [selected, setSelected] = useState<number | null>(null);
  const [disabledOptions, setDisabledOptions] = useState<number[]>([]);
  const [reponseLibre, setReponseLibre] = useState("");
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);
  const [awaitingContinue, setAwaitingContinue] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [fragment, setFragment] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!teamId) {
      setPhase("error");
      return;
    }
    getTeam(teamId)
      .then((t) => {
        if (!t) {
          setPhase("error");
          return;
        }
        setTeam(t);
        return getQuestionsForSalle(t.salle).then((qs) => {
          if (qs.length === 0) {
            setErreurDetail(`Aucune énigme trouvée pour la salle "${t.salle}".`);
            setPhase("error");
            return;
          }
          setQuestions(qs);
          setPhase("playing");
        });
      })
      .catch((e) => {
        setErreurDetail(e instanceof Error ? e.message : String(e));
        setPhase("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const question = questions[index];

  // Timer par question
  useEffect(() => {
    if (phase !== "playing" || !question) return;
    if (timerRef.current) clearInterval(timerRef.current);
    if (!question.tempsLimite) {
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
  }, [index, phase]);

  function goNextQuestion() {
    setFeedback(null);
    setAwaitingContinue(false);
    setSelected(null);
    setDisabledOptions([]);
    setReponseLibre("");
    setAttempts(0);
    if (index + 1 >= questions.length) {
      finishQuiz();
    } else {
      setIndex((i) => i + 1);
    }
  }

  async function finishQuiz() {
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      const config = await getQuizConfig();
      const idx = team?.fragmentIndex;
      setFragment(idx !== null && idx !== undefined ? config.fragments[idx] || "(fragment non configuré)" : "(fragment non attribué)");
    } catch {
      setFragment("(erreur de chargement du fragment)");
    }
    setPhase("termine");
  }

  function handleTimeout() {
    if (!question) return;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    if (nextAttempts >= 2) {
      setFeedback({ text: "Temps écoulé ! Vous n'avez pas trouvé.", ok: false });
      setAwaitingContinue(true);
    } else {
      setFeedback({ text: "Temps écoulé !", ok: false });
      setTimeout(() => {
        setFeedback(null);
        setSelected(null);
        setReponseLibre("");
      }, 1400);
    }
  }

  function traiterReponse(correct: boolean) {
    if (!question) return;
    if (timerRef.current) clearInterval(timerRef.current);

    if (correct) {
      setFeedback({ text: question.feedbackCorrect || "Bonne réponse !", ok: true });
      setAwaitingContinue(true);
    } else {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      if (nextAttempts >= 2) {
        setFeedback({ text: question.feedbackIncorrect || "Ce n'est pas la bonne réponse.", ok: false });
        setAwaitingContinue(true);
      } else {
        setFeedback({ text: question.feedbackIncorrect || "Mauvaise réponse, retentez votre chance.", ok: false });
        setTimeout(() => {
          setFeedback(null);
          setSelected(null);
          setReponseLibre("");
        }, 1400);
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
    return <LoadingScreen label="Chargement de l'escape game..." />;
  }

  if (phase === "error") {
    return (
      <Centered>
        {team
          ? "Aucune énigme n'est encore configurée pour cette salle. Demandez à l'organisateur de les ajouter dans l'espace organisateur."
          : "Équipe introuvable."}
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
        <div className="relative z-10 flex flex-col items-center max-w-md">
          <p className="text-brand-blue font-semibold mb-2">{team?.nom}</p>
          <h1 className="text-2xl font-extrabold mb-6 text-brand-navy">Bravo, votre escape game est terminé !</h1>
          <p className="text-slate-600 mb-3">Votre fragment de la phrase finale :</p>
          <div className="bg-gradient-to-r from-brand-blue-light to-white ring-1 ring-brand-blue/30 text-brand-navy font-bold text-2xl px-8 py-5 rounded-2xl mb-8 shadow-sm">
            {fragment}
          </div>
          <p className="text-slate-500 max-w-sm">
            Direction l&apos;amphi, épreuve finale ! Le Porte-parole garde ce fragment affiché jusqu&apos;à ce qu&apos;il soit posé au tableau.
          </p>
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
          <span>Énigme {index + 1} / {questions.length}</span>
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

      {question.type === "qcm" ? (
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
            placeholder="Votre réponse..."
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
              Valider
            </button>
          )}
          {awaitingContinue && feedback && !feedback.ok && question.reponse && (
            <div className="rounded-2xl bg-green-50 ring-2 ring-green-500 text-green-700 px-5 py-3 text-sm">
              <span className="font-semibold uppercase tracking-wide text-xs">Bonne réponse : </span>
              {question.reponse}
            </div>
          )}
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

      {attempts === 1 && !feedback && (
        <p className="mt-6 text-center text-brand-blue text-sm font-medium">Dernière tentative pour cette énigme.</p>
      )}

      {awaitingContinue && (
        <button
          onClick={goNextQuestion}
          className="group mt-6 inline-flex items-center justify-center gap-2 self-center rounded-full bg-gradient-to-r from-brand-blue to-brand-navy px-8 py-3.5 font-semibold text-white shadow-lg shadow-brand-blue/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
        >
          {isLastQuestion ? "Voir le résultat" : "Énigme suivante"}
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
