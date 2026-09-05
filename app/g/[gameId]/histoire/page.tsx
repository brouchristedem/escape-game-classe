"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, use } from "react";
import { getQuizConfig, saveQuizConfig } from "@/lib/data";
import { fusionnerTextes, GameTexts } from "@/lib/types";
import LoadingScreen from "@/app/components/LoadingScreen";
import EditableText from "@/app/components/EditableText";

const HISTOIRE_PAR_DEFAUT = `Mr X est quelque part parmi nous, mais son identité reste un mystère.

Il a laissé derrière lui des indices, des traces et quelques énigmes à résoudre. Chaque découverte vous rapprochera de lui… ou vous conduira sur une fausse piste.

Ne vous fiez à personne et observez chaque détail. Le temps presse, et Mr X ne restera pas caché éternellement.

Saurez-vous découvrir qui il est avant qu'il ne soit trop tard ?`;

export default function Histoire({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const router = useRouter();
  const [texte, setTexte] = useState(HISTOIRE_PAR_DEFAUT);
  const [texts, setTexts] = useState<GameTexts>(fusionnerTextes());
  const [loading, setLoading] = useState(true);
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    getQuizConfig(gameId)
      .then((config) => {
        if (config.histoire && config.histoire.trim()) setTexte(config.histoire);
        setTexts(fusionnerTextes(config.texts));
      })
      .finally(() => setLoading(false));
  }, [gameId]);

  function continuer() {
    setNavigating(true);
    setTimeout(() => router.push(`/g/${gameId}/jouer`), 550);
  }

  async function saveHistoire(v: string) {
    setTexte(v);
    await saveQuizConfig(gameId, { histoire: v });
  }

  async function saveText<K extends keyof GameTexts>(key: K, value: GameTexts[K]) {
    const next = { ...texts, [key]: value };
    setTexts(next);
    await saveQuizConfig(gameId, { texts: next });
  }

  if (loading) return <LoadingScreen label={texts.histoireChargementLabel} />;
  if (navigating) return <LoadingScreen label={texts.histoireNavigationLabel} />;

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6 py-16 bg-white text-center">
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-brand-blue/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-brand-navy/10 blur-3xl" />

      <div className="relative z-10 flex flex-col items-center max-w-lg w-full">
        <Image
          src="/logos/logo-iua-x-classe.png"
          alt="Logo du jeu"
          width={536}
          height={285}
          className="mb-8 w-40 sm:w-48 h-auto"
          priority
        />

        <EditableText
          as="div"
          multiline
          value={texte}
          onSave={saveHistoire}
          className="mb-10 max-w-md rounded-3xl bg-brand-blue-light/70 ring-1 ring-brand-blue/15 px-6 sm:px-8 py-7 text-slate-700 leading-relaxed whitespace-pre-line text-left sm:text-center shadow-sm"
        />

        <button
          onClick={continuer}
          className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-blue to-brand-navy px-10 py-3.5 text-lg font-semibold text-white shadow-lg shadow-brand-blue/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-blue/40 active:translate-y-0"
        >
          <EditableText as="span" value={texts.histoireBouton} onSave={(v) => saveText("histoireBouton", v)} className="text-white" />
          <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
        </button>
      </div>
    </main>
  );
}
