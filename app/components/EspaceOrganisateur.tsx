"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listerJeux, creerJeu, supprimerJeu, changerCodeAcces } from "@/lib/data";
import { GameMeta } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import GameLogo from "@/app/components/GameLogo";

// Composant partagé entre /organisateur (ouvert à tout organisateur) et
// /admin (réservé au propriétaire de la plateforme, via restrictedEmail).
// Le comportement et l'affichage sont strictement identiques, seule la
// restriction d'accès et le titre changent.
export default function EspaceOrganisateur({
  titre = "Espace organisateur",
  restrictedEmail,
}: {
  titre?: string;
  restrictedEmail?: string;
}) {
  const { user, loading, signOut } = useAuth();

  if (loading) return <main className="min-h-screen bg-white" />;
  if (!user) return <ConnexionOrganisateur titre={titre} />;

  if (restrictedEmail && user.email !== restrictedEmail) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-white text-center">
        <p className="text-ink font-semibold mb-2">Accès réservé.</p>
        <p className="text-sm text-ink/45 mb-6">
          Ce compte ({user.email}) n&apos;est pas autorisé sur cette page.
        </p>
        <button
          onClick={() => signOut()}
          className="text-sm font-semibold text-brass-dark hover:text-ink"
        >
          Se déconnecter
        </button>
      </main>
    );
  }

  return <ListeJeux uid={user.uid} email={user.email ?? ""} titre={titre} />;
}

function ConnexionOrganisateur({ titre }: { titre: string }) {
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
      <GameLogo className="h-14 w-14 mb-4" />
      <h1 className="font-headline text-xl font-semibold mb-1 text-ink">{titre}</h1>
      <p className="text-sm text-ink/45 mb-6">Connectez-vous à votre compte</p>

      <div className="flex flex-col gap-3 w-72">
        <button
          onClick={connexionGoogle}
          className="flex items-center justify-center gap-2 border border-brass/20 hover:bg-brass/5 rounded-lg px-4 py-2 text-sm font-medium text-ink transition"
        >
          Se connecter avec Google
        </button>

        <div className="flex items-center gap-2 text-xs text-ink/30 my-1">
          <div className="h-px flex-1 bg-brass/15" />
          ou
          <div className="h-px flex-1 bg-brass/15" />
        </div>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-mail"
          className="bg-brass-light border border-brass-light focus:border-brass outline-none rounded-lg px-4 py-2 text-ink"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && valider()}
          placeholder="Mot de passe"
          className="bg-brass-light border border-brass-light focus:border-brass outline-none rounded-lg px-4 py-2 text-ink"
        />
        <button
          onClick={valider}
          disabled={submitting || !email.trim() || !password}
          className="bg-brass hover:bg-brass-dark text-ink font-semibold px-6 py-2 rounded-full transition disabled:opacity-40"
        >
          {submitting ? "..." : "Se connecter"}
        </button>
        {error && <p className="text-stamp-red text-sm text-center">{error}</p>}
      </div>

      <Link href="/a-propos" className="mt-10 text-xs text-ink/45 hover:text-brass-dark underline">
        À propos du développeur
      </Link>
    </main>
  );
}

function ListeJeux({ uid, email, titre }: { uid: string; email: string; titre: string }) {
  const { signOut } = useAuth();
  const [jeux, setJeux] = useState<GameMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [nouveauNom, setNouveauNom] = useState("");
  const [creating, setCreating] = useState(false);
  const [editCodeId, setEditCodeId] = useState<string | null>(null);
  const [codeBrouillon, setCodeBrouillon] = useState("");
  const [savingCode, setSavingCode] = useState(false);

  async function enregistrerCode(gameId: string) {
    if (!codeBrouillon.trim() || savingCode) return;
    setSavingCode(true);
    try {
      await changerCodeAcces(gameId, codeBrouillon);
      setEditCodeId(null);
      await reload();
    } finally {
      setSavingCode(false);
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
        <div className="flex items-center gap-3">
          <GameLogo className="h-10 w-10 shrink-0" />
          <h1 className="font-headline text-2xl font-extrabold text-ink">{titre}</h1>
        </div>
        <button onClick={() => signOut()} className="text-xs text-ink/45 hover:text-ink/65">
          Déconnexion ({email})
        </button>
      </div>
      <p className="text-sm text-ink/55 mb-8">
        La racine du site liste désormais tous les jeux publiquement, chacun verrouillé par un code. Donnez le code
        affiché ci-dessous à vos joueurs — vous pouvez le changer à tout moment. Le lien direct par jeu reste
        disponible ci-dessous si vous préférez le partager tel quel.
      </p>

      <div className="flex gap-2 mb-8">
        <input
          value={nouveauNom}
          onChange={(e) => setNouveauNom(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && creer()}
          placeholder="Nom du nouveau jeu (ex. Semaine d'intégration)"
          className="flex-1 border border-brass/20 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-brass"
        />
        <button
          onClick={creer}
          disabled={!nouveauNom.trim() || creating}
          className="bg-brass hover:bg-brass-dark text-ink font-semibold px-5 py-2.5 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {creating ? "Création..." : "+ Créer un jeu"}
        </button>
      </div>

      {loading ? (
        <p className="text-ink/45 text-sm">Chargement...</p>
      ) : jeux.length === 0 ? (
        <p className="text-ink/45 text-sm">Aucun jeu pour l&apos;instant. Créez-en un ci-dessus.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {jeux.map((j) => (
            <div key={j.id} className="flex items-center justify-between rounded-2xl ring-1 ring-brass/15 px-5 py-4 gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-ink">{j.nom}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  {editCodeId === j.id ? (
                    <>
                      <input
                        autoFocus
                        value={codeBrouillon}
                        onChange={(e) => setCodeBrouillon(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && enregistrerCode(j.id)}
                        placeholder="Nouveau code"
                        className="border border-brass/20 rounded px-2 py-1 text-xs outline-none focus:border-brass w-28"
                      />
                      <button
                        onClick={() => enregistrerCode(j.id)}
                        disabled={!codeBrouillon.trim() || savingCode}
                        className="text-xs font-semibold text-brass-dark disabled:opacity-40"
                      >
                        {savingCode ? "..." : "Valider"}
                      </button>
                      <button onClick={() => setEditCodeId(null)} className="text-xs text-ink/45">
                        Annuler
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-ink/45">
                        Code joueurs : <span className="font-mono font-semibold text-ink">{j.codeAcces || "—"}</span>
                      </span>
                      <button
                        onClick={() => {
                          setEditCodeId(j.id);
                          setCodeBrouillon(j.codeAcces || "");
                        }}
                        className="text-xs text-ink/45 hover:text-brass-dark"
                      >
                        Modifier
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <Link href={`/organisateur/${j.id}`} className="text-sm font-semibold text-brass-dark">
                  Administrer →
                </Link>
                <button onClick={() => supprimer(j.id, j.nom)} className="text-xs text-stamp-red hover:text-stamp-red">
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 text-center">
        <Link href="/a-propos" className="text-xs text-ink/45 hover:text-brass-dark underline">
          À propos du développeur
        </Link>
      </div>
    </main>
  );
}
