"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listerJeux, creerJeu, supprimerJeu } from "@/lib/data";
import { GameMeta } from "@/lib/types";
import { useAuth } from "@/lib/auth";

export default function EspaceOrganisateur() {
  const { user, loading } = useAuth();

  if (loading) return <main className="min-h-screen bg-white" />;
  if (!user) return <ConnexionOrganisateur />;
  return <ListeJeux uid={user.uid} email={user.email ?? ""} />;
}

function ConnexionOrganisateur() {
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function valider() {
    if (!email.trim() || !password) return;
    setSubmitting(true);
    setError("");
    const result = await signIn(email.trim(), password);
    setSubmitting(false);
    if (!result.ok) setError(result.error ?? "Une erreur est survenue.");
  }

  async function connexionGoogle() {
    setError("");
    const result = await signInWithGoogle();
    if (!result.ok && result.error) setError(result.error);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-white">
      <h1 className="text-xl font-semibold mb-1 text-brand-navy">Espace organisateur</h1>
      <p className="text-sm text-slate-400 mb-6">Connectez-vous à votre compte</p>

      <div className="flex flex-col gap-3 w-72">
        <button
          onClick={connexionGoogle}
          className="flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-50 rounded-lg px-4 py-2 text-sm font-medium text-brand-navy transition"
        >
          Se connecter avec Google
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-300 my-1">
          <div className="h-px flex-1 bg-slate-200" />
          ou
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-mail"
          className="bg-brand-blue-light border border-brand-blue-light focus:border-brand-blue outline-none rounded-lg px-4 py-2 text-brand-navy"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && valider()}
          placeholder="Mot de passe"
          className="bg-brand-blue-light border border-brand-blue-light focus:border-brand-blue outline-none rounded-lg px-4 py-2 text-brand-navy"
        />
        <button
          onClick={valider}
          disabled={submitting || !email.trim() || !password}
          className="bg-brand-blue hover:bg-brand-navy text-white font-semibold px-6 py-2 rounded-full transition disabled:opacity-40"
        >
          {submitting ? "..." : "Se connecter"}
        </button>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      </div>
    </main>
  );
}

function ListeJeux({ uid, email }: { uid: string; email: string }) {
  const { signOut } = useAuth();
  const [jeux, setJeux] = useState<GameMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [nouveauNom, setNouveauNom] = useState("");
  const [creating, setCreating] = useState(false);
  const [origin, setOrigin] = useState("");
  const [copieId, setCopieId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  async function copierLien(gameId: string) {
    const lien = `${origin}/g/${gameId}`;
    try {
      await navigator.clipboard.writeText(lien);
      setCopieId(gameId);
      setTimeout(() => setCopieId(null), 2000);
    } catch {
      // Best effort : si le presse-papier est indisponible, le lien reste
      // cliquable juste à côté.
    }
  }

  async function reload() {
    setLoading(true);
    try {
      setJeux(await listerJeux(uid));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  async function creer() {
    if (!nouveauNom.trim() || creating) return;
    setCreating(true);
    try {
      await creerJeu(nouveauNom, uid);
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
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-extrabold text-brand-navy">Mes jeux</h1>
        <button onClick={() => signOut()} className="text-xs text-slate-400 hover:text-slate-600">
          Déconnexion ({email})
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-8">
        Ce lien (racine du site) est votre espace organisateur, pas la page des joueurs. Chaque jeu créé ci-dessous a
        son propre lien joueur (ci-dessous, sous son nom) à partager avec les équipes — totalement indépendant des
        autres jeux.
      </p>

      <div className="flex gap-2 mb-8">
        <input
          value={nouveauNom}
          onChange={(e) => setNouveauNom(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && creer()}
          placeholder="Nom du nouveau jeu (ex. Semaine d'intégration)"
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
            <div key={j.id} className="flex items-center justify-between rounded-2xl ring-1 ring-black/5 px-5 py-4 gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-brand-navy">{j.nom}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <a
                    href={`/g/${j.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand-blue underline truncate"
                    title="Ouvrir le lien joueur dans un nouvel onglet"
                  >
                    {origin || ""}/g/{j.id}
                  </a>
                  <button
                    onClick={() => copierLien(j.id)}
                    className="text-xs text-slate-400 hover:text-brand-blue shrink-0"
                  >
                    {copieId === j.id ? "Copié ✓" : "Copier"}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
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
