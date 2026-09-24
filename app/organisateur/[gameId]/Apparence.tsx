"use client";

// Apparence du jeu, réglée par son organisateur : logo, couleur de fond et
// couleur d'accent. S'applique à toutes les pages joueur (/g/{gameId}/...),
// y compris l'écran de projection. Les textes (titre, message d'accueil...)
// restent gérés dans l'onglet "Textes du site".

import { useEffect, useState } from "react";
import { getQuizConfig, saveQuizConfig } from "@/lib/data";
import { ACCENT_PAR_DEFAUT, FOND_PAR_DEFAUT, variablesTheme, verifierCouleurs } from "@/lib/theme";
import GameLogo from "@/app/components/GameLogo";

const TAILLE_MAX_LOGO = 320; // px, côté le plus long

// Réduit l'image choisie et la convertit en data URL légère : elle est
// stockée directement dans le document du jeu (pas de stockage de fichiers).
function reduireImage(fichier: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(fichier);
    const img = new Image();
    img.onload = () => {
      const echelle = Math.min(1, TAILLE_MAX_LOGO / Math.max(img.width, img.height));
      const largeur = Math.max(1, Math.round(img.width * echelle));
      const hauteur = Math.max(1, Math.round(img.height * echelle));
      const canvas = document.createElement("canvas");
      canvas.width = largeur;
      canvas.height = hauteur;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas indisponible"));
        return;
      }
      ctx.drawImage(img, 0, 0, largeur, hauteur);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/webp", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image illisible"));
    };
    img.src = url;
  });
}

export default function Apparence({ gameId }: { gameId: string }) {
  const [fond, setFond] = useState(FOND_PAR_DEFAUT);
  const [accent, setAccent] = useState(ACCENT_PAR_DEFAUT);
  const [logo, setLogo] = useState("");
  const [charge, setCharge] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);

  useEffect(() => {
    getQuizConfig(gameId)
      .then((c) => {
        const p = c.personnalisation;
        if (p?.couleurFond) setFond(p.couleurFond);
        if (p?.couleurAccent) setAccent(p.couleurAccent);
        if (p?.logo) setLogo(p.logo);
      })
      .finally(() => setCharge(true));
  }, [gameId]);

  const erreurCouleurs = verifierCouleurs(fond, accent);

  async function choisirLogo(fichier: File | undefined) {
    if (!fichier) return;
    setMessage(null);
    try {
      setLogo(await reduireImage(fichier));
    } catch {
      setMessage({ ok: false, texte: "Impossible de lire cette image. Essaie un fichier PNG, JPG ou SVG." });
    }
  }

  async function enregistrer() {
    if (erreurCouleurs) return;
    setEnregistrement(true);
    setMessage(null);
    try {
      // logo: "" efface un logo précédent (l'écriture Firestore est fusionnée).
      await saveQuizConfig(gameId, { personnalisation: { logo, couleurFond: fond, couleurAccent: accent } });
      setMessage({ ok: true, texte: "Apparence enregistrée. Elle s'applique dès maintenant sur les pages du jeu." });
    } catch {
      setMessage({ ok: false, texte: "Échec de l'enregistrement. Vérifie ta connexion et réessaie." });
    } finally {
      setEnregistrement(false);
    }
  }

  async function reinitialiser() {
    setEnregistrement(true);
    setMessage(null);
    try {
      await saveQuizConfig(gameId, { personnalisation: null });
      setFond(FOND_PAR_DEFAUT);
      setAccent(ACCENT_PAR_DEFAUT);
      setLogo("");
      setMessage({ ok: true, texte: "Apparence par défaut rétablie." });
    } catch {
      setMessage({ ok: false, texte: "Échec de la réinitialisation. Réessaie." });
    } finally {
      setEnregistrement(false);
    }
  }

  if (!charge) return <p className="text-ink/55 text-sm">Chargement...</p>;

  return (
    <section className="max-w-2xl">
      <p className="text-ink/65 mb-6 text-sm">
        Personnalise le logo et les couleurs de ce jeu. Les changements s&apos;appliquent à toutes les pages
        joueur et à l&apos;écran de projection. Les textes (titre, message d&apos;accueil...) se modifient dans
        l&apos;onglet &quot;Textes du site&quot;.
      </p>

      <div className="grid gap-6 sm:grid-cols-2 mb-6">
        <div className="bg-admin-blue-light rounded-xl p-4 flex flex-col gap-4">
          <label className="flex items-center justify-between gap-3 text-sm font-medium text-ink">
            Couleur de fond
            <input type="color" value={fond} onChange={(e) => setFond(e.target.value)} className="h-9 w-14 cursor-pointer rounded" />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm font-medium text-ink">
            Couleur d&apos;accent
            <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-9 w-14 cursor-pointer rounded" />
          </label>
          {erreurCouleurs && <p className="text-sm text-stamp-red">{erreurCouleurs}</p>}
        </div>

        <div className="bg-admin-blue-light rounded-xl p-4 flex flex-col gap-3">
          <p className="text-sm font-medium text-ink">Logo</p>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => choisirLogo(e.target.files?.[0])}
            className="text-sm text-ink/65"
          />
          {logo && (
            <button onClick={() => setLogo("")} className="self-start text-sm underline text-ink">
              Retirer le logo
            </button>
          )}
        </div>
      </div>

      <p className="text-sm font-medium text-ink mb-2">Aperçu</p>
      <div
        className="rounded-xl p-6 mb-6 flex flex-col items-center text-center gap-4 bg-ink text-parchment"
        style={variablesTheme({ couleurFond: fond, couleurAccent: accent })}
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="Logo du jeu" className="h-20 w-auto object-contain" />
        ) : (
          <GameLogo className="h-20 w-auto" />
        )}
        <p className="text-xl font-bold">Titre du jeu</p>
        <div className="h-2 w-48 rounded-full bg-ink-2 overflow-hidden">
          <div className="h-full w-2/3 rounded-full bg-admin-blue" />
        </div>
        <span className="rounded-full bg-admin-blue px-6 py-2 text-sm font-semibold text-ink">Commencer</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={enregistrer}
          disabled={enregistrement || !!erreurCouleurs}
          className="rounded-full bg-admin-blue px-6 py-2 text-sm font-semibold text-ink disabled:opacity-50"
        >
          {enregistrement ? "Enregistrement..." : "Enregistrer l'apparence"}
        </button>
        <button
          onClick={reinitialiser}
          disabled={enregistrement}
          className="rounded-full border border-admin-blue/30 px-6 py-2 text-sm text-ink disabled:opacity-50"
        >
          Revenir au thème par défaut
        </button>
        {message && <p className={`text-sm ${message.ok ? "text-green-600" : "text-stamp-red"}`}>{message.texte}</p>}
      </div>
    </section>
  );
}
