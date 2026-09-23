"use client";

// Page ouverte par un participant qui scanne le QR code d'inscription
// (affiché ou imprimé depuis l'onglet "Formation des équipes" de l'admin).
// Il saisit son prénom et son niveau d'étude, puis attend que l'organisateur
// forme les équipes : son équipe s'affiche alors ici, sans recharger la
// page. Le niveau d'étude sert uniquement à répartir les niveaux
// équitablement entre équipes (voir formerEquipes dans lib/data.ts).
// L'identifiant de son inscription est gardé sur son téléphone pour qu'il
// retrouve son équipe s'il rouvre la page.

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ecouterInscription, getQuizConfig, inscrire } from "@/lib/data";
import { Inscription } from "@/lib/types";
import GameLogo from "@/app/components/GameLogo";
import LoadingScreen from "@/app/components/LoadingScreen";

function cleStockage(gameId: string) {
  return `inscription:${gameId}`;
}

function lireIdInscription(gameId: string | undefined): string | null {
  if (typeof window === "undefined" || !gameId) return null;
  try {
    return window.localStorage.getItem(cleStockage(gameId));
  } catch {
    return null;
  }
}

export default function InscriptionParticipant() {
  const params = useParams();
  const gameId = Array.isArray(params.gameId) ? params.gameId[0] : params.gameId;

  const [charge, setCharge] = useState(false);
  const [nomJeu, setNomJeu] = useState("");
  const [ouvertes, setOuvertes] = useState(false);
  const [idInscription, setIdInscription] = useState<string | null>(() => lireIdInscription(gameId));
  const [inscription, setInscription] = useState<Inscription | null>(null);
  const [inscriptionLue, setInscriptionLue] = useState(false);
  const [prenom, setPrenom] = useState("");
  const [niveau, setNiveau] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) return;
    getQuizConfig(gameId)
      .then((c) => {
        setNomJeu(c.nom ?? "");
        setOuvertes(!!c.inscriptionsOuvertes);
      })
      .catch(() => {})
      .finally(() => setCharge(true));
  }, [gameId]);

  useEffect(() => {
    if (!gameId || !idInscription) return;
    return ecouterInscription(gameId, idInscription, (i) => {
      setInscription(i);
      setInscriptionLue(true);
      // Inscription supprimée par l'organisateur : on repart d'un formulaire vierge.
      if (!i) {
        try {
          window.localStorage.removeItem(cleStockage(gameId));
        } catch {}
        setIdInscription(null);
        setInscriptionLue(false);
      }
    });
  }, [gameId, idInscription]);

  async function envoyer() {
    if (!gameId || envoi) return;
    const p = prenom.trim();
    const n = niveau.trim();
    if (!p || !n) {
      setErreur("Merci d'indiquer ton prénom et ton niveau d'étude.");
      return;
    }
    setEnvoi(true);
    setErreur(null);
    try {
      const id = await inscrire(gameId, p.slice(0, 30), n.slice(0, 40));
      try {
        window.localStorage.setItem(cleStockage(gameId), id);
      } catch {}
      setIdInscription(id);
    } catch {
      setErreur("Inscription impossible : les inscriptions viennent peut-être de fermer. Préviens un organisateur.");
    } finally {
      setEnvoi(false);
    }
  }

  if (!charge || (idInscription && !inscriptionLue)) return <LoadingScreen label="Chargement..." />;

  const champ =
    "w-full rounded-xl bg-ink-2 border border-brass/40 px-4 py-3 text-parchment placeholder:text-parchment/40";

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6 py-16 bg-ink text-center">
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-brass/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-ink-2 blur-3xl" />

      <div className="relative z-10 flex flex-col items-center max-w-md w-full">
        <GameLogo className="w-24 sm:w-28 h-auto mb-6" />
        {nomJeu && <p className="text-sm text-parchment/60 mb-2">{nomJeu}</p>}

        {inscription?.equipeId ? (
          <>
            <p className="text-sm text-parchment/70 mb-2">{inscription.nom}, ton équipe est :</p>
            <h1 className="font-headline font-extrabold text-4xl text-brass-light mb-6">{inscription.equipeNom}</h1>
            <p className="text-sm text-parchment/70 mb-6">
              Retrouvez-vous et choisissez ensemble un chef d&apos;équipe : c&apos;est lui qui joue sur son téléphone,
              les autres suivent la progression.
            </p>
            <div className="flex flex-col gap-3 w-full">
              <a
                href={`/g/${gameId}/jouer/${inscription.equipeId}/suivre`}
                className="rounded-full bg-gradient-to-r from-brass to-brass-dark px-8 py-3 font-semibold text-ink"
              >
                Suivre mon équipe
              </a>
              <a
                href={`/g/${gameId}/jouer`}
                className="rounded-full border border-brass/50 px-8 py-3 font-semibold text-parchment"
              >
                Je suis le chef d&apos;équipe
              </a>
            </div>
          </>
        ) : inscription ? (
          <>
            <h1 className="font-headline font-extrabold text-2xl text-parchment mb-3">Tu es inscrit(e) ✅</h1>
            <p className="text-parchment mb-2">{inscription.nom}</p>
            <p className="text-sm text-parchment/70 mb-6">
              Les équipes seront annoncées bientôt. Garde cette page ouverte : ton équipe s&apos;affichera ici.
            </p>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-brass animate-bounce [animation-delay:-0.3s]" />
              <span className="h-2.5 w-2.5 rounded-full bg-brass animate-bounce [animation-delay:-0.15s]" />
              <span className="h-2.5 w-2.5 rounded-full bg-brass animate-bounce" />
            </div>
          </>
        ) : !ouvertes ? (
          <>
            <h1 className="font-headline font-extrabold text-2xl text-parchment mb-3">Inscriptions fermées</h1>
            <p className="text-sm text-parchment/70">Si tu n&apos;as pas d&apos;équipe, préviens un organisateur.</p>
          </>
        ) : (
          <>
            <h1 className="font-headline font-extrabold text-2xl text-parchment mb-6">Inscris-toi</h1>
            <div className="flex flex-col gap-3 w-full text-left">
              <input
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                maxLength={30}
                placeholder="Ton prénom"
                autoComplete="given-name"
                className={champ}
              />
              <input
                value={niveau}
                onChange={(e) => setNiveau(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && envoyer()}
                maxLength={40}
                placeholder="Ton niveau d'étude (ex. Licence 2)"
                className={champ}
              />
            </div>
            {erreur && <p className="text-sm text-stamp-red mt-3">{erreur}</p>}
            <button
              onClick={envoyer}
              disabled={envoi}
              className="mt-5 rounded-full bg-gradient-to-r from-brass to-brass-dark px-10 py-3 font-semibold text-ink disabled:opacity-50"
            >
              {envoi ? "Inscription..." : "Je m'inscris"}
            </button>
            <p className="text-xs text-parchment/50 mt-4">
              Seuls ton prénom et ton niveau d&apos;étude sont enregistrés.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
