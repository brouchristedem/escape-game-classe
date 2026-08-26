"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { getQuestionsForSalle, getQuizConfig } from "@/lib/data";
import { Question, salleForEquipe } from "@/lib/types";

type Phase = "loading" | "error" | "playing" | "revealed" | "termine";

export default function JouerEquipe() {
  const params = useParams();
  const equipeRaw = Array.isArray(params.equipe) ? params.equipe[0] : params.equipe;
  const equipe = Number(equipeRaw);

  const [phase, setPhase] = useState<Phase>("loading");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState(0); // tentatives utilisées sur la question en cours
  const [selected, setSelected] = useState<number | null>(null);
  const [disabledOptions, setDisabledOptions] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [fragment, setFragment] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const equipeValide = Number.isInteger(equipe) && equipe >= 1 && equipe <= 10;

  useEffect(() => {
    if (!equipeValide) {
      setPhase("error");
      return;
    }
    const salle = salleForEquipe(equipe);
    getQuestionsForSalle(salle)
      .then((qs) => {
        if (qs.length === 0) {
          setPhase("error");
          return;
        }
        setQuestions(qs);
        setPhase("playing");
      })
      .catch(() => setPhase("error"));
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
    setSelected(null);
    setDisabledOptions([]);
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
      setFragment(config.fragments[equipe - 1] || "(fragment non configuré)");
    } catch {
      setFragment("(erreur de chargement du fragment)");
    }
    setPhase("termine");
  }

  function handleTimeout() {
    if (!question) return;
    setFeedback({ text: "Temps écoulé !", ok: false });
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setTimeout(() => {
      if (nextAttempts >= 2) {
        goNextQuestion();
      } else {
        setFeedback(null);
        setSelected(null);
      }
    }, 1500);
  }

  function handleAnswer(optionIndex: number) {
    if (!question || feedback) return; // déjà en train de traiter une réponse
    setSelected(optionIndex);
    const correct = optionIndex === question.correctIndex;
    if (timerRef.current) clearInterval(timerRef.current);

    if (correct) {
      setFeedback({ text: question.feedbackCorrect || "Bonne réponse !", ok: true });
      setTimeout(() => goNextQuestion(), 1600);
    } else {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      setDisabledOptions((d) => [...d, optionIndex]);
      setFeedback({ text: question.feedbackIncorrect || "Mauvaise réponse.", ok: false });
      setTimeout(() => {
        if (nextAttempts >= 2) {
          goNextQuestion();
        } else {
          setFeedback(null);
          setSelected(null);
        }
      }, 1500);
    }
  }

  if (phase === "loading") {
    return <Centered>Chargement de l&apos;escape game...</Centered>;
  }

  if (phase === "error") {
    return (
      <Centered>
        {equipeValide
          ? "Aucune énigme n'est encore configurée pour cette salle. Demandez à l'organisateur de les ajouter dans l'espace organisateur."
          : "Numéro d'équipe invalide."}
      </Centered>
    );
  }

  if (phase === "termine") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 bg-white text-center">
        <p className="text-brand-blue mb-2">Équipe {equipe}</p>
        <h1 className="text-2xl font-bold mb-6 text-brand-navy">Bravo, votre escape game est terminé !</h1>
        <p className="text-slate-600 mb-3">Votre fragment de la phrase finale :</p>
        <div className="bg-brand-blue-light border-2 border-brand-blue text-brand-navy font-bold text-2xl px-8 py-4 rounded-xl mb-8">
          {fragment}
        </div>
        <p className="text-slate-500 max-w-sm">
          Direction l&apos;amphi, épreuve finale ! Le Porte-parole garde ce fragment affiché jusqu&apos;à ce qu&apos;il soit posé au tableau.
        </p>
      </main>
    );
  }

  if (!question) return <Centered>Chargement...</Centered>;

  return (
    <main className="min-h-screen flex flex-col px-6 py-8 bg-white">
      <div className="flex items-center justify-between mb-6 text-sm text-slate-500">
        <span>Équipe {equipe}</span>
        <span>Énigme {index + 1} / {questions.length}</span>
        {timeLeft !== null && (
          <span className={`font-semibold ${timeLeft <= 5 ? "text-red-500" : "text-brand-blue"}`}>
            {timeLeft}s
          </span>
        )}
      </div>

      <h1 className="text-xl font-semibold mb-8 leading-snug text-brand-navy">{question.texte}</h1>

      <div className="flex flex-col gap-3">
        {question.propositions.map((prop, i) => {
          const isDisabled = disabledOptions.includes(i);
          const isSelected = selected === i;
          let style = "bg-brand-blue-light border border-brand-blue-light hover:border-brand-blue text-brand-navy";
          if (feedback && isSelected) {
            style = feedback.ok ? "bg-green-500 text-white" : "bg-red-500 text-white";
          } else if (isDisabled) {
            style = "bg-slate-100 text-slate-400 line-through";
          }
          return (
            <button
              key={i}
              disabled={isDisabled || !!feedback}
              onClick={() => handleAnswer(i)}
              className={`text-left px-5 py-4 rounded-xl transition ${style} disabled:cursor-not-allowed`}
            >
              {prop}
            </button>
          );
        })}
      </div>

      {feedback && (
        <div className={`mt-6 text-center font-medium ${feedback.ok ? "text-green-600" : "text-red-600"}`}>
          {feedback.text}
        </div>
      )}

      {attempts === 1 && !feedback && (
        <p className="mt-6 text-center text-brand-blue text-sm">Dernière tentative pour cette énigme.</p>
      )}
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 text-center bg-white text-brand-navy">
      <p>{children}</p>
    </main>
  );
}
