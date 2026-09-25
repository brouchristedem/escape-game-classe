"use client";

// Événements surprise vus par une équipe (voir EnigmeSurprise / EffetEquipe) :
// - énigme surprise lancée par l'organisateur (le chef d'équipe répond ; la
//   première équipe à répondre juste est départagée par l'heure serveur) ;
// - "prison" : bandeau qui prévient qu'un membre quitte le jeu, sans rien
//   bloquer ;
// - "blocage" : écran bloqué avec compte à rebours, le chrono général continue.
// Sur l'écran de suivi (peutRepondre = false), l'énigme est visible mais on ne
// peut pas y répondre : c'est le rôle du chef d'équipe.

import { useEffect, useRef, useState } from "react";
import {
  ecouterBonnesReponsesSurprise,
  ecouterEvenementsJeu,
  retirerEffetEquipe,
  signalerBonneReponseSurprise,
} from "@/lib/data";
import { EffetEquipe, EnigmeSurprise, GameTexts, fusionnerTextes, normaliserReponse } from "@/lib/types";
import RichText from "@/app/components/RichText";

function formaterCompteARebours(totalSecondes: number): string {
  const s = Math.max(0, Math.ceil(totalSecondes));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Durées par défaut (ms) si l'organisateur n'en choisit pas dans l'admin.
// "fausse fin" : dureeSecondes de l'effet règle la durée de l'écran de
// victoire leurre ; la révélation qui suit a une durée fixe, courte.
const FAUSSE_FIN_VICTOIRE_MS_DEFAUT = 3500;
const FAUSSE_FIN_LEURRE_MS = 3000;
const GLITCH_DUREE_MS_DEFAUT = 4000;

export default function EvenementsOverlay({
  gameId,
  teamId,
  nomEquipe,
  peutRepondre,
  test = false,
  texts,
}: {
  gameId: string;
  teamId: string;
  nomEquipe: string;
  peutRepondre: boolean;
  test?: boolean; // mode test organisateur : rien n'est enregistré
  texts?: GameTexts; // pour les textes de l'écran de victoire leurre (fausse fin)
}) {
  const t = texts ?? fusionnerTextes();
  const [enigme, setEnigme] = useState<EnigmeSurprise | null>(null);
  const [effet, setEffet] = useState<EffetEquipe | null>(null);
  const [dejaRepondu, setDejaRepondu] = useState(false);
  const [reponse, setReponse] = useState("");
  const [erreur, setErreur] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [confirmeId, setConfirmeId] = useState<string | null>(null); // id de l'énigme à laquelle on vient de répondre juste
  const [ferme, setFerme] = useState<string | null>(null); // id de l'énigme fermée à la main
  const [maintenant, setMaintenant] = useState(() => Date.now());

  // "fausse fin" : séquence en deux temps (victoire, puis révélation),
  // rejouée une seule fois par id d'effet, avec des minuteurs locaux fixes.
  const [fausseFinPhase, setFausseFinPhase] = useState<"victoire" | "leurre" | null>(null);
  const dernierFausseFinVu = useRef<string | null>(null);

  // "glitch" : overlay affiché une seule fois par id d'effet, durée fixe.
  const [glitchVisible, setGlitchVisible] = useState(false);
  const dernierGlitchVu = useRef<string | null>(null);

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

  // "fausse fin" : à chaque nouvel id d'effet de ce type, joue la séquence
  // victoire -> leurre -> retour au jeu, une seule fois, puis nettoie l'effet
  // côté Firestore (sauf en mode test, où rien n'est jamais écrit).
  useEffect(() => {
    if (!effet || effet.type !== "fausseFin") return;
    if (dernierFausseFinVu.current === effet.id) return;
    dernierFausseFinVu.current = effet.id;
    const dureeVictoireMs = effet.dureeSecondes ? effet.dureeSecondes * 1000 : FAUSSE_FIN_VICTOIRE_MS_DEFAUT;
    const dureeTotaleMs = dureeVictoireMs + FAUSSE_FIN_LEURRE_MS;
    // Si l'effet a été déclenché alors qu'aucun appareil n'était connecté
    // pour le nettoyer à temps (organisateur qui teste sans joueur en face,
    // page fermée...), il reste en base au-delà de sa durée prévue. On ne le
    // rejoue pas en entier des heures après : on compare à l'heure réelle.
    const ecouleMs = Date.now() - effet.at;
    if (ecouleMs >= dureeTotaleMs) {
      if (!test) retirerEffetEquipe(gameId, teamId).catch(() => {});
      return;
    }
    let versLeurre: ReturnType<typeof setTimeout> | undefined;
    if (ecouleMs >= dureeVictoireMs) {
      setFausseFinPhase("leurre");
    } else {
      setFausseFinPhase("victoire");
      versLeurre = setTimeout(() => setFausseFinPhase("leurre"), dureeVictoireMs - ecouleMs);
    }
    const versFin = setTimeout(() => {
      setFausseFinPhase(null);
      if (!test) retirerEffetEquipe(gameId, teamId).catch(() => {});
    }, dureeTotaleMs - ecouleMs);
    return () => {
      if (versLeurre) clearTimeout(versLeurre);
      clearTimeout(versFin);
    };
  }, [effet, gameId, teamId, test]);

  // "glitch" : affiche l'overlay de piratage pendant la durée choisie par
  // l'organisateur (ou une durée par défaut), une seule fois par id d'effet,
  // avec vibration de l'appareil si demandé et supporté, puis nettoie
  // l'effet côté Firestore.
  useEffect(() => {
    if (!effet || effet.type !== "glitch") return;
    if (dernierGlitchVu.current === effet.id) return;
    dernierGlitchVu.current = effet.id;
    const dureeMs = effet.dureeSecondes ? effet.dureeSecondes * 1000 : GLITCH_DUREE_MS_DEFAUT;
    // Même logique que "fausse fin" ci-dessus : ne pas rejouer un glitch déjà
    // périmé (personne n'était là pour le nettoyer au bon moment).
    const restantMs = effet.at + dureeMs - Date.now();
    if (restantMs <= 0) {
      if (!test) retirerEffetEquipe(gameId, teamId).catch(() => {});
      return;
    }
    setGlitchVisible(true);
    if (effet.vibrer && typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(restantMs);
      } catch {}
    }
    const id = setTimeout(() => {
      setGlitchVisible(false);
      if (!test) retirerEffetEquipe(gameId, teamId).catch(() => {});
    }, restantMs);
    return () => clearTimeout(id);
  }, [effet, gameId, teamId, test]);

  const [erreurEnvoi, setErreurEnvoi] = useState(false);
  const enAttenteConfirmation = useRef(false);

  // La confirmation affichée au joueur ne doit reposer que sur ce que
  // Firestore confirme réellement (via le listener dejaRepondu), pas sur le
  // simple fait que la promesse d'écriture se soit résolue : sinon, si les
  // règles Firestore bloquent l'écriture (ex. règles non déployées), le
  // joueur voit "Bonne réponse" alors que rien n'est enregistré côté admin.
  useEffect(() => {
    if (dejaRepondu && enAttenteConfirmation.current && enigme) {
      enAttenteConfirmation.current = false;
      setConfirmeId(enigme.id);
      setEnvoi(false);
    }
  }, [dejaRepondu, enigme]);

  async function valider() {
    if (!enigme || envoi || !reponse.trim()) return;
    if (normaliserReponse(reponse) !== normaliserReponse(enigme.reponse)) {
      setErreur(true);
      return;
    }
    setErreur(false);
    setErreurEnvoi(false);
    setEnvoi(true);
    if (test) {
      setConfirmeId(enigme.id);
      setReponse("");
      setEnvoi(false);
      return;
    }
    enAttenteConfirmation.current = true;
    // Un envoi refusé parce que l'équipe a déjà répondu n'est pas une erreur
    // pour le joueur : le listener dejaRepondu confirmera quand même.
    signalerBonneReponseSurprise(gameId, enigme.id, teamId, nomEquipe).catch(() => {});
    setTimeout(() => {
      if (!enAttenteConfirmation.current) return;
      enAttenteConfirmation.current = false;
      setEnvoi(false);
      setErreurEnvoi(true);
    }, 6000);
    setReponse("");
  }

  const blocageActif = effet?.type === "blocage" && !!effet.finTimestamp && effet.finTimestamp > maintenant;
  // Prison : bandeau affiché jusqu'à ce que l'organisateur libère la personne,
  // sauf si une durée a été choisie (finTimestamp alors défini), auquel cas
  // le bandeau disparaît tout seul une fois ce délai passé.
  const prisonActive = effet?.type === "prison" && (!effet.finTimestamp || effet.finTimestamp > maintenant);
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

      {fausseFinPhase && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center overflow-hidden bg-ink px-6 py-16 text-center">
          <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-brass/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-ink-2 blur-3xl" />
          <div className="relative z-10 flex flex-col items-center max-w-md w-full">
            {fausseFinPhase === "victoire" ? (
              <>
                <p className="text-brass-light font-semibold mb-2">{nomEquipe}</p>
                <h1 className="font-headline text-2xl font-bold mb-4 text-parchment">{t.finTitre}</h1>
                <p className="text-parchment/60 max-w-sm">{t.finSousTitre}</p>
              </>
            ) : (
              <>
                <p className="text-5xl mb-5">🎭</p>
                <p className="font-headline text-xl font-bold text-parchment whitespace-pre-line">{t.fausseFinLeurre}</p>
              </>
            )}
          </div>
        </div>
      )}

      {glitchVisible && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center overflow-hidden bg-ink px-6 py-16 text-center">
          <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(178,58,46,0.06)_0px,rgba(178,58,46,0.06)_1px,transparent_1px,transparent_3px)]" />
          <div className="relative z-10 flex flex-col items-center max-w-md w-full animate-glitch-flicker">
            <p className="font-codemono text-xs uppercase tracking-widest text-stamp-red mb-4 animate-glitch-shift">
              ⚠ ERREUR SYSTÈME ⚠
            </p>
            <p className="font-headline text-xl font-bold text-parchment whitespace-pre-line animate-glitch-shift">
              {effet?.type === "glitch" ? effet.texte : ""}
            </p>
          </div>
        </div>
      )}

      {prisonActive && (
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
                {erreurEnvoi && (
                  <p className="text-sm text-stamp-red mb-2">
                    Votre réponse n&apos;a pas pu être enregistrée. Vérifiez votre connexion et réessayez.
                  </p>
                )}
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
