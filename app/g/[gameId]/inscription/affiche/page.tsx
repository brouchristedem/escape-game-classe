"use client";

// Affiche du QR code d'inscription, à projeter ou à imprimer (ouverte depuis
// l'onglet "Formation des équipes" de l'admin). Affiche aussi, en direct, le
// nombre de personnes déjà inscrites (masqué à l'impression).

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import { ecouterInscriptions, getQuizConfig } from "@/lib/data";
import GameLogo from "@/app/components/GameLogo";

export default function AfficheInscription() {
  const params = useParams();
  const gameId = Array.isArray(params.gameId) ? params.gameId[0] : params.gameId;

  const [nomJeu, setNomJeu] = useState("");
  const [ouvertes, setOuvertes] = useState(true);
  const [nbInscrits, setNbInscrits] = useState(0);
  const [qr, setQr] = useState<string | null>(null);
  const [lien, setLien] = useState("");
  const [plein, setPlein] = useState(false);

  useEffect(() => {
    if (!gameId) return;
    const url = `${window.location.origin}/g/${gameId}/inscription`;
    QRCode.toDataURL(url, { width: 720, margin: 2, color: { dark: "#1a1240", light: "#ffffff" } })
      .then((dataUrl) => {
        setQr(dataUrl);
        setLien(url);
      })
      .catch(() => {});
    getQuizConfig(gameId)
      .then((c) => {
        setNomJeu(c.nom ?? "");
        setOuvertes(!!c.inscriptionsOuvertes);
      })
      .catch(() => {});
    return ecouterInscriptions(gameId, (liste) => setNbInscrits(liste.length));
  }, [gameId]);

  useEffect(() => {
    const maj = () => setPlein(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", maj);
    return () => document.removeEventListener("fullscreenchange", maj);
  }, []);

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-[3vh] bg-brume px-6 py-8 text-center text-nuit print:bg-white print:text-black">
      <GameLogo className="h-[10vh] w-auto" />
      {nomJeu && <h1 className="font-headline font-extrabold text-[min(5vh,6vw)] leading-tight">{nomJeu}</h1>}
      <p className="font-headline font-bold text-[min(6vh,7vw)] text-acier print:text-black">
        Scanne pour t&apos;inscrire
      </p>

      <div className="rounded-3xl bg-white p-[2vh] shadow-[0_18px_40px_-14px_rgba(8,16,40,0.45)]">
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="QR code d'inscription" className="h-[min(48vh,80vw)] w-[min(48vh,80vw)]" />
        ) : (
          <div className="h-[min(48vh,80vw)] w-[min(48vh,80vw)] animate-pulse bg-slate-100" />
        )}
      </div>

      {lien && <p className="text-[min(2.4vh,4vw)] text-nuit/90 break-all print:text-black">{lien}</p>}

      <div className="print:hidden flex flex-col items-center gap-3">
        {!ouvertes && (
          <p className="rounded-full border border-alerte px-5 py-2 text-alerte">
            Les inscriptions sont fermées pour l&apos;instant
          </p>
        )}
        <p className="font-codemono text-[min(4vh,6vw)] text-acier">
          {nbInscrits} inscrit{nbInscrits > 1 ? "s" : ""}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="rounded-lg border border-acier/40 px-4 py-2 text-sm text-acier hover:bg-lueur/10"
          >
            Imprimer
          </button>
          {!plein && (
            <button
              onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}
              className="rounded-lg border border-acier/40 px-4 py-2 text-sm text-acier hover:bg-lueur/10"
            >
              Plein écran
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
