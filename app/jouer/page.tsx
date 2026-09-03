"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getAllTeams, claimerChef, getQuizConfig, saveQuizConfig } from "@/lib/data";
import { Team, fusionnerTextes, GameTexts } from "@/lib/types";
import { getSessionId } from "@/lib/session";
import LoadingScreen from "@/app/components/LoadingScreen";
import EditableText from "@/app/components/EditableText";
import { useAdminMode } from "@/lib/adminMode";

export default function ChoixEquipe() {
  const router = useRouter();
  const { editMode } = useAdminMode();
  const [teams, setTeams] = useState<Team[]>([]);
  const [texts, setTexts] = useState<GameTexts>(fusionnerTextes());
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);
  const [erreurChef, setErreurChef] = useState(false);
  const continueRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([getAllTeams(), getQuizConfig()])
      .then(([ts, config]) => {
        setTeams(ts);
        setTexts(fusionnerTextes(config.texts));
      })
      .finally(() => setLoading(false));
  }, []);

  function selectionner(id: string) {
    setSelected(id);
    // Laisse le bouton de suite apparaître dans le DOM avant de défiler vers lui.
    requestAnimationFrame(() => {
      continueRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  async function commencerMeneur() {
    if (!selected) return;
    setErreurChef(false);
    setNavigating(true);
    // En mode édition, l'organisateur parcourt le circuit pour le modifier :
    // on ne prend pas la main de chef d'équipe (ça ne doit jamais bloquer
    // ni déloger une vraie équipe en train de jouer).
    if (!editMode) {
      const { ok } = await claimerChef(selected, getSessionId());
      if (!ok) {
        setNavigating(false);
        setErreurChef(true);
        return;
      }
    }
    setTimeout(() => router.push(`/jouer/${selected}`), 500);
  }

  async function saveText<K extends keyof GameTexts>(key: K, value: GameTexts[K]) {
    const next = { ...texts, [key]: value };
    setTexts(next);
    await saveQuizConfig({ texts: next });
  }

  function commencerSuiveur() {
    if (!selected) return;
    setNavigating(true);
    setTimeout(() => router.push(`/jouer/${selected}/suivre`), 500);
  }

  if (loading) return <LoadingScreen label={texts.equipeChargementLabel} />;
  if (navigating) return <LoadingScreen label={texts.equipeNavigationLabel} />;

  return (
    <main className="relative min-h-screen flex flex-col items-center overflow-hidden px-6 py-14 bg-white">
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-brand-blue/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-brand-navy/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        <EditableText
          as="h1"
          value={texts.equipeTitre}
          onSave={(v) => saveText("equipeTitre", v)}
          className="text-2xl font-extrabold mb-2 text-center text-brand-navy"
        />
        <EditableText
          as="p"
          value={texts.equipeSousTitre}
          onSave={(v) => saveText("equipeSousTitre", v)}
          className="text-sm text-slate-500 mb-8 text-center"
        />

        {!loading && teams.length === 0 && (
          <EditableText
            as="p"
            multiline
            value={texts.equipeAucuneEquipe}
            onSave={(v) => saveText("equipeAucuneEquipe", v)}
            className="text-slate-500 mb-8 text-center max-w-sm"
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10 w-full">
          {teams.map((t) => {
            const isSelected = selected === t.id;
            return (
              <button
                key={t.id}
                onClick={() => selectionner(t.id)}
                className={`rounded-2xl px-4 py-3.5 text-left font-semibold transition-all duration-200 ring-1 ${
                  isSelected
                    ? "bg-gradient-to-r from-brand-blue to-brand-navy text-white shadow-lg shadow-brand-blue/30 ring-transparent scale-[1.02]"
                    : "bg-brand-blue-light/70 text-brand-navy ring-black/5 hover:ring-brand-blue/40 hover:-translate-y-0.5 hover:shadow-md"
                }`}
              >
                {t.nom}
                <span className={`block text-xs font-normal mt-0.5 ${isSelected ? "text-white/80" : "text-slate-500"}`}>
                  Salle : {t.salle}
                </span>
              </button>
            );
          })}
        </div>

        <div ref={continueRef} className="flex flex-col items-center gap-3">
          <button
            onClick={commencerMeneur}
            disabled={!selected && !editMode}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-blue to-brand-navy px-8 py-3.5 text-lg font-semibold text-white shadow-lg shadow-brand-blue/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl disabled:translate-y-0 disabled:bg-none disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed"
          >
            <EditableText as="span" value={texts.equipeBoutonChef} onSave={(v) => saveText("equipeBoutonChef", v)} className="text-white" />
          </button>
          <button
            onClick={commencerSuiveur}
            disabled={!selected && !editMode}
            className="inline-flex items-center gap-2 rounded-full bg-brand-blue-light/70 ring-1 ring-black/5 px-8 py-3 font-medium text-brand-navy transition-all duration-200 hover:ring-brand-blue/40 hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <EditableText as="span" value={texts.equipeBoutonSuiveur} onSave={(v) => saveText("equipeBoutonSuiveur", v)} />
          </button>
          {erreurChef && (
            <EditableText
              as="p"
              multiline
              value={texts.equipeErreurChef}
              onSave={(v) => saveText("equipeErreurChef", v)}
              className="text-sm text-red-500 text-center max-w-sm"
            />
          )}
        </div>
      </div>
    </main>
  );
}
