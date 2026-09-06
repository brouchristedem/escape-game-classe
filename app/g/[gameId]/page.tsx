"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { use } from "react";
import { getQuizConfig, saveQuizConfig } from "@/lib/data";
import { fusionnerTextes, GameTexts } from "@/lib/types";
import LoadingScreen from "@/app/components/LoadingScreen";
import EditableText from "@/app/components/EditableText";
import GameLogo from "@/app/components/GameLogo";

export default function Home({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);
  const [texts, setTexts] = useState<GameTexts>(fusionnerTextes());

  useEffect(() => {
    getQuizConfig(gameId)
      .then((config) => setTexts(fusionnerTextes(config.texts)))
      .catch(() => {});
  }, [gameId]);

  async function saveText<K extends keyof GameTexts>(key: K, value: GameTexts[K]) {
    const next = { ...texts, [key]: value };
    setTexts(next);
    await saveQuizConfig(gameId, { texts: next });
  }

  function commencer() {
    setNavigating(true);
    setTimeout(() => router.push(`/g/${gameId}/histoire`), 650);
  }

  if (navigating) {
    return <LoadingScreen label={texts.accueilChargementLabel} />;
  }

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6 py-16 bg-ink text-center">
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-brass/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-ink-2 blur-3xl" />

      <div className="relative z-10 flex flex-col items-center max-w-md w-full">
        <GameLogo className="w-32 sm:w-36 h-auto mb-8 drop-shadow-[0_0_20px_rgba(201,162,77,0.25)]" />

        <EditableText
          as="h1"
          value={texts.accueilTitre}
          onSave={(v) => saveText("accueilTitre", v)}
          className="font-headline text-3xl sm:text-4xl font-bold mb-3 tracking-wide text-parchment"
        />
        <EditableText
          as="p"
          value={texts.accueilSousTitre}
          onSave={(v) => saveText("accueilSousTitre", v)}
          className="font-codemono text-xs sm:text-sm text-brass-light mb-8"
        />
        <EditableText
          as="p"
          multiline
          value={texts.accueilDescription}
          onSave={(v) => saveText("accueilDescription", v)}
          className="text-parchment/70 max-w-sm mb-10 leading-relaxed whitespace-pre-line"
        />

        <button
          onClick={commencer}
          className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brass to-brass-dark px-10 py-3.5 text-lg font-semibold text-ink shadow-lg shadow-brass/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brass/30 active:translate-y-0"
        >
          <EditableText as="span" value={texts.accueilBouton} onSave={(v) => saveText("accueilBouton", v)} className="text-ink" />
          <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
        </button>

        <Link
          href={`/a-propos?jeu=${gameId}`}
          className="mt-10 text-xs text-parchment/40 hover:text-brass-light underline"
        >
          À propos du développeur
        </Link>
        <Link
          href={`/tarifs?jeu=${gameId}`}
          className="mt-2 text-xs text-parchment/40 hover:text-brass-light underline"
        >
          Tarifs
        </Link>
      </div>
    </main>
  );
}
