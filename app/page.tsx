"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listerJeuxPublics, verifierCodeAcces } from "@/lib/data";
import { GameMeta } from "@/lib/types";
import GameLogo from "@/app/components/GameLogo";
import PortraitGardien from "@/app/components/PortraitGardien";
import Runes from "@/app/components/Runes";
import LoadingScreen from "@/app/components/LoadingScreen";
import Reveal from "@/app/components/gsap/Reveal";
import SplitReveal from "@/app/components/gsap/SplitReveal";
import Parallax from "@/app/components/gsap/Parallax";


const MAX_TENTATIVES = 3;
const BLOCAGE_MS = 60_000; // 1 minute de blocage après 3 essais ratés

interface EtatVerrou {
  tentatives: number;
  bloqueJusqua: number | null;
}

function cleVerrou(gameId: string): string {
  return `escape_verrou_${gameId}`;
}

function lireVerrou(gameId: string): EtatVerrou {
  if (typeof window === "undefined") return { tentatives: 0, bloqueJusqua: null };
  try {
    const brut = window.localStorage.getItem(cleVerrou(gameId));
    if (!brut) return { tentatives: 0, bloqueJusqua: null };
    return JSON.parse(brut) as EtatVerrou;
  } catch {
    return { tentatives: 0, bloqueJusqua: null };
  }
}

function ecrireVerrou(gameId: string, etat: EtatVerrou) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(cleVerrou(gameId), JSON.stringify(etat));
}

export default function Accueil() {
  const [jeux, setJeux] = useState<GameMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [jeuOuvert, setJeuOuvert] = useState<GameMeta | null>(null);

  useEffect(() => {
    listerJeuxPublics()
      .then(setJeux)
      .finally(() => setLoading(false));
  }, []);

  return (
    <main
      className={`relative min-h-screen flex flex-col items-center overflow-hidden px-6 py-16 bg-brume`}
    >
      <Parallax speed={-60} className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-lueur/30 blur-3xl" />
      <Parallax speed={70} className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-lueur/25 blur-3xl" />

      <div className="relative z-10 flex flex-col items-center max-w-md w-full">
        <Reveal y={20}>
          <PortraitGardien compact className="mb-4 mx-auto">
            <GameLogo className="w-20 sm:w-24 h-auto drop-shadow-[0_8px_22px_rgba(8,16,40,0.7)]" />
          </PortraitGardien>
        </Reveal>
        <SplitReveal
          as="h1"
          text="Escape Game"
          className="font-headline text-2xl sm:text-3xl font-bold mb-2 tracking-wide text-nuit text-center"
        />
        <Reveal delay={0.2}>
          <div className="filet-orne w-64 my-3">
            <Runes className="h-3.5 w-auto text-acier" />
          </div>
        </Reveal>
        <Reveal delay={0.3}>
          <p className="font-codemono text-xs sm:text-sm text-acier-deep mb-10 text-center">
            Choisissez votre jeu et entrez le code de votre organisateur
          </p>
        </Reveal>

        {loading ? (
          <p className="text-nuit/90 text-sm">Chargement...</p>
        ) : jeux.length === 0 ? (
          <p className="text-nuit/90 text-sm text-center">Aucun jeu disponible pour l&apos;instant.</p>
        ) : (
          <Reveal as="div" stagger staggerAmount={0.1} className="flex flex-col gap-3 w-full">
            {jeux.map((j) => (
              <button
                key={j.id}
                onClick={() => setJeuOuvert(j)}
                className="cadre relative flex items-center justify-center rounded-2xl bg-dalle/95 ring-1 ring-acier/15 px-5 py-4 text-center font-semibold text-nuit transition-all duration-200 hover:ring-acier/40 hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="px-8">{j.nom}</span>
                <span className="absolute right-4 text-acier-deep text-lg" aria-hidden>
                  🔒
                </span>
              </button>
            ))}
          </Reveal>
        )}
      </div>

      {jeuOuvert && <ModalCode jeu={jeuOuvert} onClose={() => setJeuOuvert(null)} />}
    </main>
  );
}

function ModalCode({ jeu, onClose }: { jeu: GameMeta; onClose: () => void }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [erreur, setErreur] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [bloqueJusqua, setBloqueJusqua] = useState<number | null>(() => {
    const etat = lireVerrou(jeu.id);
    return etat.bloqueJusqua;
  });
  const [maintenant, setMaintenant] = useState(() => Date.now());

  useEffect(() => {
    if (!bloqueJusqua) return;
    const id = setInterval(() => setMaintenant(Date.now()), 1000);
    return () => clearInterval(id);
  }, [bloqueJusqua]);

  const bloque = bloqueJusqua !== null && bloqueJusqua > maintenant;

  async function valider() {
    if (!code.trim() || verifying || bloque) return;
    setVerifying(true);
    setErreur("");
    try {
      const ok = await verifierCodeAcces(jeu.id, code);
      if (ok) {
        ecrireVerrou(jeu.id, { tentatives: 0, bloqueJusqua: null });
        setNavigating(true);
        router.push(`/g/${jeu.id}`);
        return;
      }
      const etat = lireVerrou(jeu.id);
      const tentatives = etat.tentatives + 1;
      if (tentatives >= MAX_TENTATIVES) {
        const jusqua = Date.now() + BLOCAGE_MS;
        ecrireVerrou(jeu.id, { tentatives: 0, bloqueJusqua: jusqua });
        setBloqueJusqua(jusqua);
        setErreur("Trop de tentatives. Réessayez dans une minute.");
      } else {
        ecrireVerrou(jeu.id, { tentatives, bloqueJusqua: null });
        setErreur("Code incorrect.");
      }
    } finally {
      setVerifying(false);
    }
  }

  if (navigating) return <LoadingScreen label="Ouverture de votre mission..." />;

  return (
    <div
      className={`fixed inset-0 bg-black/60 flex items-center justify-center px-6 z-50`}
      onClick={onClose}
    >
      <div
        className="cadre bg-dalle rounded-2xl px-6 py-6 w-full max-w-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-headline font-bold text-nuit mb-1">{jeu.nom}</h2>
        <p className="text-xs text-nuit/90 mb-4">Entrez le code donné par votre organisateur.</p>
        <input
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && valider()}
          disabled={bloque}
          placeholder="Code"
          className="w-full bg-brume border border-acier/20 focus:border-acier rounded-lg px-4 py-2.5 text-sm text-nuit outline-none mb-3 disabled:opacity-50"
        />
        {erreur && <p className="text-red-400 text-xs mb-3">{erreur}</p>}
        <div className="flex gap-2">
          <button
            onClick={valider}
            disabled={!code.trim() || verifying || bloque}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-lueur to-lueur-fonce px-4 py-2.5 font-semibold text-nuit transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-40 disabled:translate-y-0"
          >
            {verifying ? "..." : "Valider"}
          </button>
          <button onClick={onClose} className="text-sm text-nuit/90 hover:text-nuit px-3">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
