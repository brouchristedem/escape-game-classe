"use client";

// Événements surprise vus par une équipe (voir EnigmeSurprise / EffetEquipe) :
// - énigme surprise lancée par l'organisateur (le chef d'équipe répond ; la
//   première équipe à répondre juste est départagée par l'heure serveur) ;
// - "prison" : bandeau qui prévient qu'un membre quitte le jeu, sans rien
//   bloquer ;
// - "blocage" : écran bloqué avec compte à rebours, le chrono général continue.
// Sur l'écran de suivi (peutRepondre = false), l'énigme est visible mais on ne
// peut pas y répondre : c'est le rôle du chef d'équipe.

import { useEffect, useState } from "react";
import {
  ecouterBonnesReponsesSurprise,
  ecouterEvenementsJeu,
  signalerBonneReponseSurprise,
} from "@/lib/data";
import { EffetEquipe, EnigmeSurprise, normaliserReponse } from "@/lib/types";
import RichText from "@/app/components/RichText";

function formaterCompteARebours(totalSecondes: number): string {
  const s = Math.max(0, Math.ceil(totalSecondes));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function EvenementsOverlay({
  gameId,
  teamId,
  nomEquipe,
  peutRepondre,
  test = false,
}: {
  gameId: string;
  teamId: string;
  nomEquipe: string;
  peutRepondre: boolean;
  test?: boolean; // mode test organisateur : rien n'est enregistré
}) {
  const [enigme, setEnigme] = useState<EnigmeSurprise | null>(null);
  const [effet, setEffet] = useState<EffetEquipe | null>(null);
  const [dejaRepondu, setDejaRepondu] = useState(false);
  const [reponse, setReponse] = useState("");
  const [erreur, setErreur] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [confirmeId, setConfirmeId] = useState<string | null>(null); // id de l'énigme à laquelle on vient de répondre juste
  const [ferme, setFerme] = useState<string | null>(null); // id de l'énigme fermée à la main
  const [maintenant, setMaintenant] = useState(() => Date.now());

  useEffect(() => {
    return ecouterEvenementsJeu(gameId, (v) => {
      setEnigme(v.enigmeSurprise);
      setEffet(v.effets[teamId] ?? null);
    });
  }, [gameId, teamId]);

  // Notre équipe a-t-elle déjà répondu juste (y compris depuis un autre
  // appareil ou avant un rechargement de la page) ?
  const enigmeId = enigme?.id ?? null;
  useEffect(() => {
    if (!enigmeId) return;
    return ecouterBonnesReponsesSurprise(gameId, enigmeId, (bonnes) => {
      setDejaRepondu(bonnes.some((b) => b.teamId === teamId));
    });
  }, [gameId, enigmeId, teamId]);

  // Horloge locale pour le compte à rebours du blocage.
  useEffect(() => {
    const id = setInterval(() => setMaintenant(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  async function valider() {
    if (!enigme || envoi || !reponse.trim()) return;
    if (normaliserReponse(reponse) !== normaliserReponse(enigme.reponse)) {
      setErreur(true);
      return;
    }
    setErreur(false);
    setEnvoi(true);
    if (!test) {
      // Un envoi refusé (déjà enregistré) n'est pas une erreur pour le joueur.
      await signalerBonneReponseSurprise(gameId, enigme.id, teamId, nomEquipe).catch(() => {});
    }
    setConfirmeId(enigme.id);
    setReponse("");
    setEnvoi(false);
  }

  const blocageActif = effet?.type === "blocage" && !!effet.finTimestamp && effet.finTimestamp > maintenant;
  const enigmeVisible = !!enigme && !dejaRepondu && ferme !== enigme.id;
  const afficherConfirmation = !!enigme && confirmeId === enigme.id && ferme !== enigme.id;

  return (
    <>
      {blocageActif && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden bg-ink px-6 text-center">
          <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-stamp-red/20 blur-3xl" />
          <div className="relative z-10 flex flex-col items-center max-w-sm">
            <p className="text-5xl mb-5">🔒</p>
            <h1 className="font-headline text-2xl font-bold text-parchment mb-3">Écran bloqué</h1>
            <p className="text-sm text-parchment/70 mb-6">
              Votre équipe est bloquée pendant un moment. Le chrono général continue.
            </p>
            <p className="font-codemono text-5xl font-semibold text-brass-light">
              {formaterCompteARebours(((effet?.finTimestamp ?? 0) - maintenant) / 1000)}
            </p>
          </div>
        </div>
      )}

      {effet?.type === "prison" && (
        <div className="fixed bottom-0 inset-x-0 z-40 flex justify-center px-4 pb-3 pointer-events-none">
          <p className="pointer-events-auto max-w-md w-full rounded-xl bg-stamp-red text-parchment text-sm font-medium px-4 py-3 shadow-lg text-center">
            🔒 {effet.personne ? `${effet.personne} est` : "Un membre est"} en prison et quitte le jeu. Votre équipe
            continue avec un membre en moins.
          </p>
        </div>
      )}

      {enigme && peutRepondre && (enigmeVisible || afficherConfirmation) && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-ink/97 backdrop-blur-sm px-6 py-10 text-center">
          <div className="flex flex-col items-center max-w-md w-full">
            <p className="text-5xl mb-4">⚡</p>
            <h1 className="font-headline text-2xl font-extrabold text-parchment mb-5">Événement surprise !</h1>

            {afficherConfirmation ? (
              <>
                <p className="text-parchment mb-2 text-lg font-semibold">Bonne réponse ✅</p>
                <p className="text-sm text-parchment/70 mb-6">Attendez l&apos;annonce de l&apos;organisateur.</p>
                <button
                  onClick={() => setFerme(enigme.id)}
                  className="rounded-full bg-gradient-to-r from-brass to-brass-dark px-8 py-3 font-semibold text-ink"
                >
                  Continuer le jeu
                </button>
              </>
            ) : (
              <>
                <div className="mb-6 w-full rounded-2xl bg-parchment ring-1 ring-brass/30 px-6 py-6 text-ink/90 text-lg leading-relaxed text-left shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
                  <RichText text={enigme.enonce} />
                </div>
                <input
                  value={reponse}
                  onChange={(e) => {
                    setReponse(e.target.value);
                    setErreur(false);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && valider()}
                  placeholder="Votre réponse"
                  className="w-full rounded-xl bg-ink-2 border border-brass/40 px-4 py-3 text-parchment placeholder:text-parchment/40 mb-2"
                />
                {erreur && <p className="text-sm text-stamp-red mb-2">Ce n&apos;est pas ça, réessayez.</p>}
                <button
                  onClick={valider}
                  disabled={envoi || !reponse.trim()}
                  className="mt-2 rounded-full bg-gradient-to-r from-brass to-brass-dark px-8 py-3 font-semibold text-ink disabled:opacity-50"
                >
                  Valider
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {enigme && !peutRepondre && !dejaRepondu && (
        <div className="fixed bottom-0 inset-x-0 z-40 flex justify-center px-4 pb-3 pointer-events-none">
          <div className="pointer-events-auto max-w-md w-full rounded-xl bg-parchment ring-1 ring-brass/40 text-ink/90 text-sm px-4 py-3 shadow-lg">
            <p className="font-semibold mb-1">⚡ Événement surprise : le chef d&apos;équipe doit répondre</p>
            <RichText text={enigme.enonce} />
          </div>
        </div>
      )}
    </>
  );
}
