"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ecouterLiveState, getTeam, getQuizConfig, saveQuizConfig, ecouterTempsEtBroadcast } from "@/lib/data";
import { LiveState, Team, fusionnerTextes, GameTexts, TempsGeneral, TempsGeneralAjustement, BroadcastMessage } from "@/lib/types";
import LoadingScreen from "@/app/components/LoadingScreen";
import EditableText from "@/app/components/EditableText";
import RichText from "@/app/components/RichText";
import GlobalOverlays from "@/app/components/GlobalOverlays";

export default function SuivreEquipe() {
  const params = useParams();
  const gameId = Array.isArray(params.gameId) ? params.gameId[0] : params.gameId;
  const teamId = Array.isArray(params.teamId) ? params.teamId[0] : params.teamId;

  const [team, setTeam] = useState<Team | null>(null);
  const [state, setState] = useState<LiveState | null>(null);
  const [texts, setTexts] = useState<GameTexts>(fusionnerTextes());
  const [loading, setLoading] = useState(true);
  const [tempsGeneral, setTempsGeneral] = useState<TempsGeneral>({ finTimestamp: null });
  const [tempsGeneralAjustement, setTempsGeneralAjustement] = useState<TempsGeneralAjustement | null>(null);
  const [broadcast, setBroadcast] = useState<BroadcastMessage | null>(null);

  useEffect(() => {
    if (!teamId || !gameId) return;
    getTeam(gameId, teamId).then(setTeam);
    getQuizConfig(gameId).then((config) => setTexts(fusionnerTextes(config.texts)));
    const unsubscribe = ecouterLiveState(gameId, teamId, (s) => {
      setState(s);
      setLoading(false);
    });
    const unsubTemps = ecouterTempsEtBroadcast(gameId, (v) => {
      setTempsGeneral(v.tempsGeneral);
      setTempsGeneralAjustement(v.tempsGeneralAjustement);
      setBroadcast(v.broadcast);
    });
    return () => {
      unsubscribe();
      unsubTemps();
    };
  }, [gameId, teamId]);

  async function saveText<K extends keyof GameTexts>(key: K, value: GameTexts[K]) {
    const next = { ...texts, [key]: value };
    setTexts(next);
    if (gameId) await saveQuizConfig(gameId, { texts: next });
  }

  if (loading) return <LoadingScreen label={texts.suivreChargementLabel} />;

  // state peut exister mais être incomplet : claimerChef crée le document
  // liveState avec seulement { chefSessionId, updatedAt } au moment où le
  // chef prend la main, avant que l'état complet de la partie (phase,
  // index, questionTexte...) ne soit publié. Sans ce garde-fou, cet écran
  // affichait "Énigme NaN /" pendant cette fenêtre. On attend un state
  // avec une vraie phase avant d'afficher quoi que ce soit.
  if (!state || !state.phase) {
    return (
      <main className="relative min-h-screen flex items-center justify-center overflow-hidden px-6 text-center bg-ink text-parchment">
        <EditableText as="p" multiline value={texts.suivreAttente} onSave={(v) => saveText("suivreAttente", v)} className="max-w-sm text-parchment/60" />
      </main>
    );
  }

  const banner = (
    <EditableText
      as="div"
      value={texts.suivreBanniere}
      onSave={(v) => saveText("suivreBanniere", v)}
      className="mb-4 rounded-full bg-parchment/90 px-4 py-2 text-center text-xs font-medium text-ink"
    />
  );

  if (state.phase === "termine") {
    return (
      <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6 py-16 bg-ink text-center">
        <div className="relative z-10 flex flex-col items-center max-w-md w-full">
          {banner}
          <p className="text-brass-light font-semibold mb-2">{team?.nom}</p>
          <h1 className="font-headline text-2xl font-bold mb-4 text-parchment">{texts.finTitre}</h1>
          <p className="text-parchment/60 max-w-sm">{texts.finSousTitre}</p>
        </div>
      </main>
    );
  }

  const progress = ((state.index + (state.feedbackOk ? 1 : 0)) / state.totalQuestions) * 100;

  return (
    <main className="min-h-screen bg-ink">
      <div className="max-w-xl mx-auto w-full flex flex-col px-6 py-8">
      <GlobalOverlays tempsGeneral={tempsGeneral} tempsGeneralAjustement={tempsGeneralAjustement} broadcast={broadcast} />
      {banner}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-parchment/60 mb-2">
          <span className="font-medium text-parchment">{team?.nom}</span>
          <span>Énigme {state.index + 1} / {state.totalQuestions}</span>
          {state.timeLeft !== null && (
            <span
              className={`font-codemono font-semibold rounded-full px-2.5 py-0.5 transition-colors ${
                state.timeLeft <= 5 ? "bg-stamp-red text-parchment animate-timer-critical" : "bg-parchment text-ink"
              }`}
            >
              {state.timeLeft}s
            </span>
          )}
        </div>
        <div className="h-1.5 w-full rounded-full bg-ink-2 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brass to-brass-dark transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="rounded-3xl bg-parchment ring-1 ring-brass/15 shadow-[0_10px_30px_rgba(0,0,0,0.35)] p-6 sm:p-7 mb-6">
        {state.questionType === "info" ? (
          <RichText text={state.questionTexte} className="text-xl font-semibold leading-snug text-ink" />
        ) : (
          <h1 className="text-xl font-semibold leading-snug text-ink">{state.questionTexte}</h1>
        )}
      </div>

      {state.questionType === "info" ? null : state.questionType === "qcm" ? (
        <div className="flex flex-col gap-3">
          {(state.propositions ?? []).map((prop, i) => {
            const isDisabled = state.disabledOptions.includes(i);
            const isSelected = state.selected === i;

            let style = "bg-parchment/90 ring-1 ring-brass/10 text-ink";
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
                : "bg-parchment/90 border-transparent text-ink"
            }`}
          />
        </div>
      )}

      {state.feedbackOk && state.fragmentTexte && (
        <div className="mt-6 rounded-2xl bg-gradient-to-r from-brass/15 to-parchment ring-2 ring-brass/40 px-5 py-4 text-center shadow-sm">
          <p className="text-2xl mb-1">🏆</p>
          <p className="font-semibold text-ink">{texts.suivreFragmentTitre}</p>
          <p className="my-2 text-lg font-bold text-brass-dark">{state.fragmentTexte}</p>
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

      {state.questionType !== "info" && state.attempts === 1 && !state.feedbackText && (
        <p className="mt-6 text-center text-brass-light text-sm font-medium">{texts.jeuTexteDerniereTentative}</p>
      )}

      {state.awaitingContinue && (
        <p className="mt-6 text-center text-parchment/40 text-sm">{texts.suivreAttenteContinuer}</p>
      )}
      </div>
    </main>
  );
}
