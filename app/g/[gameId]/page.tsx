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
import PortraitGardien from "@/app/components/PortraitGardien";
import Runes from "@/app/components/Runes";
import { oublierToutesLesSessions } from "@/lib/session";

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

  // Revenir sur l'accueil (que ce soit après avoir quitté et rouvert le
  // lien, ou en y retournant volontairement dans le même onglet) doit
  // toujours effacer toute reprise possible : la prochaine partie repart de
  // la première énigme, jamais de l'endroit où le joueur s'était arrêté.
  useEffect(() => {
    oublierToutesLesSessions();
  }, []);

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
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6 py-16 bg-brume text-center">
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-lueur/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-lueur/25 blur-3xl" />

      <div className="relative z-10 flex flex-col items-center max-w-md w-full">
        <PortraitGardien className="mt-2 mb-6">
          <GameLogo className="w-24 sm:w-28 h-auto drop-shadow-[0_8px_22px_rgba(8,16,40,0.7)]" />
        </PortraitGardien>

        <EditableText
          as="h1"
          value={texts.accueilTitre}
          onSave={(v) => saveText("accueilTitre", v)}
          className="font-headline text-3xl sm:text-4xl font-bold mb-3 tracking-wide text-nuit"
        />
        <div className="filet-orne w-64 mb-4">
          <Runes className="h-3.5 w-auto text-acier" />
        </div>
        <EditableText
          as="p"
          value={texts.accueilSousTitre}
          onSave={(v) => saveText("accueilSousTitre", v)}
          className="font-codemono text-xs sm:text-sm text-acier mb-8"
        />
        <EditableText
          as="p"
          multiline
          value={texts.accueilDescription}
          onSave={(v) => saveText("accueilDescription", v)}
          className="text-nuit/75 max-w-sm mb-10 leading-relaxed whitespace-pre-line"
        />

        <button
          onClick={commencer}
          className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-lueur to-lueur-fonce px-10 py-3.5 text-lg font-semibold text-nuit shadow-lg shadow-acier/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-acier/30 active:translate-y-0"
        >
          <EditableText as="span" value={texts.accueilBouton} onSave={(v) => saveText("accueilBouton", v)} className="text-nuit" />
          <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
        </button>

        <Link
          href={`/a-propos?jeu=${gameId}`}
          className="mt-10 text-xs text-nuit/75 hover:text-acier underline"
        >
          À propos du développeur
        </Link>
        <Link
          href={`/tarifs?jeu=${gameId}`}
          className="mt-2 text-xs text-nuit/75 hover:text-acier underline"
        >
          Tarifs
        </Link>
      </div>
    </main>
  );
}
