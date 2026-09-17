"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { listerJeuxPublics, verifierCodeAcces } from "@/lib/data";
import { GameMeta } from "@/lib/types";

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
    <main className="min-h-screen px-6 py-12 bg-white max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-extrabold text-brand-navy mb-1">Escape Game</h1>
      <p className="text-sm text-slate-500 mb-8">
        Choisissez votre jeu et entrez le code donné par votre organisateur pour y accéder.
      </p>

      {loading ? (
        <p className="text-slate-400 text-sm">Chargement...</p>
      ) : jeux.length === 0 ? (
        <p className="text-slate-400 text-sm">Aucun jeu disponible pour l&apos;instant.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {jeux.map((j) => (
            <button
              key={j.id}
              onClick={() => setJeuOuvert(j)}
              className="flex items-center justify-between rounded-2xl ring-1 ring-black/5 px-5 py-4 text-left hover:ring-brand-blue transition"
            >
              <span className="font-semibold text-brand-navy">{j.nom}</span>
              <span className="text-slate-300 text-lg" aria-hidden>
                🔒
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-10 text-center">
        <Link href="/organisateur" className="text-xs text-slate-400 hover:text-brand-blue underline">
          Espace organisateur
        </Link>
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

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-6 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl px-6 py-6 w-full max-w-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-semibold text-brand-navy mb-1">{jeu.nom}</h2>
        <p className="text-xs text-slate-400 mb-4">Entrez le code donné par votre organisateur.</p>
        <input
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && valider()}
          disabled={bloque}
          placeholder="Code"
          className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-brand-blue mb-3 disabled:opacity-50"
        />
        {erreur && <p className="text-red-500 text-xs mb-3">{erreur}</p>}
        <div className="flex gap-2">
          <button
            onClick={valider}
            disabled={!code.trim() || verifying || bloque}
            className="flex-1 bg-brand-blue hover:bg-brand-navy text-white font-semibold px-4 py-2.5 rounded-lg transition disabled:opacity-40"
          >
            {verifying ? "..." : "Valider"}
          </button>
          <button onClick={onClose} className="text-sm text-slate-400 hover:text-slate-600 px-3">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
