"use client";

// Page ouverte quand un joueur scanne un QR code caché dans un lieu réel
// (voir Question.qrTexte). Elle n'affiche que le message prévu pour ce QR
// code (indice, code à saisir...) : jamais la réponse de l'étape. Le joueur
// note le message puis retourne sur l'écran de son équipe.

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getQuestion } from "@/lib/data";
import GameLogo from "@/app/components/GameLogo";
import LoadingScreen from "@/app/components/LoadingScreen";
import RichText from "@/app/components/RichText";

export default function ScanQr() {
  const params = useParams();
  const gameId = Array.isArray(params.gameId) ? params.gameId[0] : params.gameId;
  const etapeId = Array.isArray(params.etapeId) ? params.etapeId[0] : params.etapeId;

  // undefined = chargement, null = QR code invalide ou sans message
  const [message, setMessage] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!gameId || !etapeId) return;
    getQuestion(gameId, etapeId)
      .then((q) => setMessage(q?.qrTexte?.trim() ? q.qrTexte : null))
      .catch(() => setMessage(null));
  }, [gameId, etapeId]);

  if (message === undefined) return <LoadingScreen label="Lecture du QR code..." />;

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6 py-16 bg-ink text-center">
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-brass/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-ink-2 blur-3xl" />

      <div className="relative z-10 flex flex-col items-center max-w-lg w-full">
        <GameLogo className="w-24 sm:w-28 h-auto mb-8" />

        {message ? (
          <>
            <h1 className="font-headline font-extrabold text-2xl text-parchment mb-6">Tu as trouvé un QR code</h1>
            <div className="mb-8 max-w-md w-full rounded-2xl bg-parchment ring-1 ring-brass/30 px-6 sm:px-8 py-7 text-ink/90 text-lg leading-relaxed text-left sm:text-center shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
              <RichText text={message} />
            </div>
            <p className="text-sm text-parchment/70 max-w-xs">
              Note ce message, puis retourne sur l&apos;écran de ton équipe.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-headline font-extrabold text-2xl text-parchment mb-3">QR code non valide</h1>
            <p className="text-sm text-parchment/70 max-w-xs">
              Ce QR code ne contient aucun message. Préviens un organisateur.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
