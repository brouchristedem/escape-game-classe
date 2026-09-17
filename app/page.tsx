"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bitter, IBM_Plex_Mono } from "next/font/google";
import { listerJeuxPublics, verifierCodeAcces } from "@/lib/data";
import { GameMeta } from "@/lib/types";
import GameLogo from "@/app/components/GameLogo";
import LoadingScreen from "@/app/components/LoadingScreen";

const bitter = Bitter({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-bitter", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-plexmono", display: "swap" });

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
      className={`${bitter.variable} ${plexMono.variable} relative min-h-screen flex flex-col items-center overflow-hidden px-6 py-16 bg-ink`}
    >
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-brass/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-ink-2 blur-3xl" />

      <div className="relative z-10 flex flex-col items-center max-w-md w-full">
        <GameLogo className="w-24 sm:w-28 h-auto mb-6 drop-shadow-[0_0_20px_rgba(201,162,77,0.25)]" />
        <h1 className="font-headline text-2xl sm:text-3xl font-bold mb-2 tracking-wide text-parchment text-center">
          Escape Game
        </h1>
        <p className="font-codemono text-xs sm:text-sm text-brass-light mb-10 text-center">
          Choisissez votre jeu et entrez le code de votre organisateur
        </p>

        {loading ? (
          <p className="text-parchment/50 text-sm">Chargement...</p>
        ) : jeux.length === 0 ? (
          <p className="text-parchment/50 text-sm text-center">Aucun jeu disponible pour l&apos;instant.</p>
        ) : (
          <div className="flex flex-col gap-3 w-full">
            {jeux.map((j) => (
              <button
                key={j.id}
                onClick={() => setJeuOuvert(j)}
                className="flex items-center justify-between rounded-2xl bg-parchment/95 ring-1 ring-brass/15 px-5 py-4 text-left font-semibold text-ink transition-all duration-200 hover:ring-brass/40 hover:-translate-y-0.5 hover:shadow-md"
              >
                <span>{j.nom}</span>
                <span className="text-brass-dark text-lg" aria-hidden>
                  🔒
                </span>
              </button>
            ))}
          </div>
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
      className={`${bitter.variable} ${plexMono.variable} fixed inset-0 bg-black/60 flex items-center justify-center px-6 z-50`}
      onClick={onClose}
    >
      <div
        className="bg-ink-2 ring-1 ring-brass/20 rounded-2xl px-6 py-6 w-full max-w-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-headline font-bold text-parchment mb-1">{jeu.nom}</h2>
        <p className="text-xs text-parchment/50 mb-4">Entrez le code donné par votre organisateur.</p>
        <input
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && valider()}
          disabled={bloque}
          placeholder="Code"
          className="w-full bg-ink border border-brass/20 focus:border-brass rounded-lg px-4 py-2.5 text-sm text-parchment outline-none mb-3 disabled:opacity-50"
        />
        {erreur && <p className="text-red-400 text-xs mb-3">{erreur}</p>}
        <div className="flex gap-2">
          <button
            onClick={valider}
            disabled={!code.trim() || verifying || bloque}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brass to-brass-dark px-4 py-2.5 font-semibold text-ink transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-40 disabled:translate-y-0"
          >
            {verifying ? "..." : "Valider"}
          </button>
          <button onClick={onClose} className="text-sm text-parchment/50 hover:text-parchment px-3">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
