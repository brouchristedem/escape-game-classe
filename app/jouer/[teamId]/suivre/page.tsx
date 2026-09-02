"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ecouterLiveState, getTeam, getQuizConfig } from "@/lib/data";
import { LiveState, Team, fusionnerTextes, GameTexts } from "@/lib/types";
import LoadingScreen from "@/app/components/LoadingScreen";

export default function SuivreEquipe() {
  const params = useParams();
  const teamId = Array.isArray(params.teamId) ? params.teamId[0] : params.teamId;

  const [team, setTeam] = useState<Team | null>(null);
  const [state, setState] = useState<LiveState | null>(null);
  const [texts, setTexts] = useState<GameTexts>(fusionnerTextes());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) return;
    getTeam(teamId).then(setTeam);
    getQuizConfig().then((config) => setTexts(fusionnerTextes(config.texts)));
    const unsubscribe = ecouterLiveState(teamId, (s) => {
      setState(s);
      setLoading(false);
    });
    return unsubscribe;
  }, [teamId]);

  if (loading) return <LoadingScreen label={texts.suivreChargementLabel} />;

  // state peut exister mais être incomplet : claimerChef crée le document
  // liveState avec seulement { chefSessionId, updatedAt } au moment où le
  // chef prend la main, avant que l'état complet de la partie (phase,
  // index, questionTexte...) ne soit publié. Sans ce garde-fou, cet écran
  // affichait "Énigme NaN /" pendant cette fenêtre. On attend un state
  // avec une vraie phase avant d'afficher quoi que ce soit.
  if (!state || !state.phase) {
    return (
      <main className="relative min-h-screen flex items-center justify-center overflow-hidden px-6 text-center bg-white text-brand-navy">
        <p className="max-w-sm text-slate-500">{texts.suivreAttente}</p>
      </main>
    );
  }

  const banner = (
    <div className="mb-4 rounded-full bg-brand-blue-light/70 px-4 py-2 text-center text-xs font-medium text-brand-navy">
      {texts.suivreBanniere}
    </div>
  );

  if (state.phase === "termine") {
    return (
      <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6 py-16 bg-white text-center">
        <div className="relative z-10 flex flex-col items-center max-w-md w-full">
          {banner}
          <p className="text-brand-blue font-semibold mb-2">{team?.nom}</p>
          <h1 className="text-2xl font-extrabold mb-6 text-brand-navy">{texts.finTitre}</h1>

          {state.resultatFragment === "attente" && (
            <>
              <p className="text-slate-600 mb-3">{texts.finTexteReconstituer}</p>
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {state.lettresMelangees.map((l, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center justify-center h-11 w-11 rounded-xl bg-brand-blue-light ring-1 ring-brand-blue/30 text-brand-navy font-bold text-lg"
                  >
                    {l}
                  </span>
                ))}
              </div>
              <input
                value={state.saisieFragment}
                readOnly
                disabled
                placeholder={texts.suivrePlaceholderSaisie}
                className="w-full px-5 py-4 rounded-2xl border-2 border-transparent bg-brand-blue-light/70 outline-none text-brand-navy text-center font-medium"
              />
            </>
          )}

          {(state.resultatFragment === "trouve" || state.resultatFragment === "revele") && (
            <>
              <p className="text-2xl mb-2">{state.resultatFragment === "trouve" ? "🎉" : ""}</p>
              <p className="text-slate-600 mb-3">Votre fragment de la phrase finale :</p>
              <div className="bg-gradient-to-r from-brand-blue-light to-white ring-1 ring-brand-blue/30 text-brand-navy font-bold text-2xl px-8 py-5 rounded-2xl mb-8 shadow-sm">
                {state.fragment}
              </div>
            </>
          )}
        </div>
      </main>
    );
  }

  const progress = ((state.index + (state.feedbackOk ? 1 : 0)) / state.totalQuestions) * 100;

  return (
    <main className="min-h-screen flex flex-col px-6 py-8 bg-white max-w-xl mx-auto w-full">
      {banner}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
          <span className="font-medium text-brand-navy">{team?.nom}</span>
          <span>Énigme {state.index + 1} / {state.totalQuestions}</span>
          {state.timeLeft !== null && (
            <span
              className={`font-semibold rounded-full px-2.5 py-0.5 transition-colors ${
                state.timeLeft <= 5 ? "bg-red-50 text-red-500" : "bg-brand-blue-light text-brand-blue"
              }`}
            >
              {state.timeLeft}s
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
        <h1 className="text-xl font-semibold leading-snug text-brand-navy">{state.questionTexte}</h1>
      </div>

      {state.questionType === "qcm" ? (
        <div className="flex flex-col gap-3">
          {(state.propositions ?? []).map((prop, i) => {
            const isDisabled = state.disabledOptions.includes(i);
            const isSelected = state.selected === i;

            let style = "bg-brand-blue-light/70 ring-1 ring-black/5 text-brand-navy";
            if (state.feedbackText && isSelected) {
              style = state.feedbackOk
                ? "bg-green-500 text-white ring-1 ring-green-500 shadow-md shadow-green-500/20"
                : "bg-red-500 text-white ring-1 ring-red-500 shadow-md shadow-red-500/20";
            } else if (isDisabled) {
              style = "bg-slate-100 text-slate-400 line-through ring-1 ring-black/5";
            }

            return (
              <div key={i} className={`text-left px-5 py-4 rounded-2xl ${style}`}>
                {prop}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <input
            value={state.reponseLibre}
            readOnly
            disabled
            placeholder={texts.suivrePlaceholderReponse}
            className={`px-5 py-4 rounded-2xl border-2 outline-none ${
              state.feedbackText
                ? state.feedbackOk
                  ? "bg-green-500 border-green-500 text-white"
                  : "bg-red-500 border-red-500 text-white"
                : "bg-brand-blue-light/70 border-transparent text-brand-navy"
            }`}
          />
        </div>
      )}

      {state.feedbackOk && state.dernieresLettres && (
        <div className="mt-6 rounded-2xl bg-gradient-to-r from-brand-blue-light to-white ring-2 ring-brand-blue/40 px-5 py-4 text-center shadow-sm">
          <p className="text-2xl mb-1">🏆</p>
          <p className="font-semibold text-brand-navy">{texts.suivreLettreTitre}</p>
          <p className="my-2 text-2xl font-extrabold tracking-widest text-brand-blue">{state.dernieresLettres}</p>
        </div>
      )}

      {state.feedbackText && (
        <div
          className={`mt-6 rounded-2xl px-5 py-3.5 text-center font-medium ${
            state.feedbackOk ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
          }`}
        >
          {state.feedbackText}
        </div>
      )}

      {state.attempts === 1 && !state.feedbackText && (
        <p className="mt-6 text-center text-brand-blue text-sm font-medium">{texts.jeuTexteDerniereTentative}</p>
      )}

      {state.awaitingContinue && (
        <p className="mt-6 text-center text-slate-400 text-sm">{texts.suivreAttenteContinuer}</p>
      )}
    </main>
  );
}
