"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listerJeux, creerJeu, supprimerJeu } from "@/lib/data";
import { GameMeta } from "@/lib/types";

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "integration2026";

export default function EspaceOrganisateur() {
  const [unlocked, setUnlocked] = useState(false);
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (sessionStorage.getItem("admin_ok") === "1") setUnlocked(true);
  }, []);

  function tryUnlock() {
    if (pwd === ADMIN_PASSWORD) {
      sessionStorage.setItem("admin_ok", "1");
      setUnlocked(true);
    } else {
      setError("Mot de passe incorrect.");
    }
  }

  if (!unlocked) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-white">
        <h1 className="text-xl font-semibold mb-4 text-brand-navy">Espace organisateur</h1>
        <input
          type="password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && tryUnlock()}
          placeholder="Mot de passe"
          className="bg-brand-blue-light border border-brand-blue-light focus:border-brand-blue outline-none rounded-lg px-4 py-2 mb-3 w-64 text-center text-brand-navy"
        />
        <button onClick={tryUnlock} className="bg-brand-blue hover:bg-brand-navy text-white font-semibold px-6 py-2 rounded-full transition">
          Entrer
        </button>
        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
      </main>
    );
  }

  return <ListeJeux />;
}

function ListeJeux() {
  const [jeux, setJeux] = useState<GameMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [nouveauNom, setNouveauNom] = useState("");
  const [creating, setCreating] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      setJeux(await listerJeux());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  async function creer() {
    if (!nouveauNom.trim() || creating) return;
    setCreating(true);
    try {
      await creerJeu(nouveauNom);
      setNouveauNom("");
      await reload();
    } finally {
      setCreating(false);
    }
  }

  async function supprimer(id: string, nom: string) {
    if (!confirm(`Supprimer définitivement "${nom}" (énigmes, équipes, circuit) ? Cette action est irréversible.`)) return;
    await supprimerJeu(id);
    await reload();
  }

  return (
    <main className="min-h-screen px-6 py-12 bg-white max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-extrabold mb-1 text-brand-navy">Mes jeux</h1>
      <p className="text-sm text-slate-500 mb-8">
        Chaque jeu a son propre circuit, ses équipes et son propre lien à partager — totalement indépendant des autres.
      </p>

      <div className="flex gap-2 mb-8">
        <input
          value={nouveauNom}
          onChange={(e) => setNouveauNom(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && creer()}
          placeholder="Nom du nouveau jeu (ex. Semaine d'intégration Classe X)"
          className="flex-1 border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-brand-blue"
        />
        <button
          onClick={creer}
          disabled={!nouveauNom.trim() || creating}
          className="bg-brand-blue hover:bg-brand-navy text-white font-semibold px-5 py-2.5 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {creating ? "Création..." : "+ Créer un jeu"}
        </button>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Chargement...</p>
      ) : jeux.length === 0 ? (
        <p className="text-slate-400 text-sm">Aucun jeu pour l&apos;instant. Créez-en un ci-dessus.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {jeux.map((j) => (
            <div key={j.id} className="flex items-center justify-between rounded-2xl ring-1 ring-black/5 px-5 py-4">
              <div>
                <p className="font-semibold text-brand-navy">{j.nom}</p>
                <p className="text-xs text-slate-400">Lien joueur : /g/{j.id}</p>
              </div>
              <div className="flex items-center gap-4">
                <Link href={`/admin/${j.id}`} className="text-sm font-semibold text-brand-blue">
                  Administrer →
                </Link>
                <button onClick={() => supprimer(j.id, j.nom)} className="text-xs text-red-400 hover:text-red-500">
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
