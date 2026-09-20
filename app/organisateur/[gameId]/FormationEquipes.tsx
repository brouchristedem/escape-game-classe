"use client";

// Formation des équipes : les participants s'inscrivent avec le QR code (à
// projeter ou imprimer via l'affiche), puis l'organisateur les répartit au
// hasard dans les équipes existantes du jeu, en équipes de taille égale. Il peut ensuite déplacer ou retirer
// une personne et exporter la composition. Voir Inscription dans lib/types.ts.

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  definirInscriptionsOuvertes,
  deplacerInscrit,
  ecouterInscriptions,
  formerEquipes,
  getQuizConfig,
  repartirRetardataires,
  retirerInscrit,
} from "@/lib/data";
import { Inscription, Team } from "@/lib/types";

function champCsv(valeur: string): string {
  return `"${valeur.replace(/"/g, '""')}"`;
}

export default function FormationEquipes({ gameId, teams }: { gameId: string; teams: Team[] }) {
  const [inscrits, setInscrits] = useState<Inscription[]>([]);
  const [ouvertes, setOuvertes] = useState(false);
  const [lien, setLien] = useState("");
  const [qr, setQr] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);

  useEffect(() => {
    getQuizConfig(gameId)
      .then((c) => setOuvertes(!!c.inscriptionsOuvertes))
      .catch(() => {});
    return ecouterInscriptions(gameId, setInscrits);
  }, [gameId]);

  useEffect(() => {
    const url = `${window.location.origin}/g/${gameId}/inscription`;
    QRCode.toDataURL(url, { width: 480, margin: 2, color: { dark: "#0d1526", light: "#ffffff" } })
      .then((dataUrl) => {
        setQr(dataUrl);
        setLien(url);
      })
      .catch(() => {});
  }, [gameId]);

  const idsEquipes = useMemo(() => new Set(teams.map((t) => t.id)), [teams]);
  const estAffecte = (i: Inscription) => !!i.equipeId && idsEquipes.has(i.equipeId);
  const sansEquipe = inscrits.filter((i) => !estAffecte(i));
  const nbAffectes = inscrits.length - sansEquipe.length;

  // Noms identiques (sans tenir compte de la casse) : doublons possibles.
  const doublons = useMemo(() => {
    const compte = new Map<string, number>();
    inscrits.forEach((i) => compte.set(i.nom.trim().toLowerCase(), (compte.get(i.nom.trim().toLowerCase()) ?? 0) + 1));
    return compte;
  }, [inscrits]);

  const tailleApprox = inscrits.length > 0 && teams.length > 0 ? Math.ceil(inscrits.length / teams.length) : 0;

  async function executer(action: () => Promise<string>) {
    setOccupe(true);
    setMessage(null);
    try {
      setMessage({ ok: true, texte: await action() });
    } catch {
      setMessage({ ok: false, texte: "Échec de l'opération. Vérifie ta connexion et tes droits sur ce jeu, puis réessaie." });
    } finally {
      setOccupe(false);
    }
  }

  function basculerInscriptions() {
    executer(async () => {
      await definirInscriptionsOuvertes(gameId, !ouvertes);
      setOuvertes(!ouvertes);
      return !ouvertes ? "Inscriptions ouvertes." : "Inscriptions fermées.";
    });
  }

  function former() {
    if (inscrits.length === 0 || teams.length === 0) return;
    if (
      nbAffectes > 0 &&
      !window.confirm(
        "Des personnes ont déjà une équipe. Former les équipes recompose TOUT au hasard : tout le monde peut changer d'équipe. Continuer ?"
      )
    ) {
      return;
    }
    executer(async () => {
      const r = await formerEquipes(gameId);
      return `${r.inscrits} personne${r.inscrits > 1 ? "s" : ""} réparties dans les ${r.equipes} équipes du jeu.`;
    });
  }

  function repartirRetards() {
    executer(async () => {
      const n = await repartirRetardataires(gameId);
      return `${n} personne${n > 1 ? "s" : ""} placée${n > 1 ? "s" : ""} dans les équipes les moins remplies.`;
    });
  }

  function deplacer(i: Inscription, equipeId: string) {
    const equipe = teams.find((t) => t.id === equipeId) ?? null;
    executer(async () => {
      await deplacerInscrit(gameId, i.id, equipe ? { id: equipe.id, nom: equipe.nom } : null);
      return `${i.nom} : ${equipe ? `déplacé(e) vers ${equipe.nom}` : "retiré(e) de son équipe"}.`;
    });
  }

  function retirer(i: Inscription) {
    if (!window.confirm(`Supprimer l'inscription de ${i.nom} ?`)) return;
    executer(async () => {
      await retirerInscrit(gameId, i.id);
      return `Inscription de ${i.nom} supprimée.`;
    });
  }

  function exporterCsv() {
    const lignes = [...inscrits]
      .sort((a, b) => (a.equipeNom ?? "￿").localeCompare(b.equipeNom ?? "￿") || a.nom.localeCompare(b.nom))
      .map((i) => [estAffecte(i) ? (teams.find((t) => t.id === i.equipeId)?.nom ?? "") : "", i.nom].map(champCsv).join(","));
    const csv = "\uFEFF" + [["Équipe", "Nom"].map(champCsv).join(","), ...lignes].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "composition-equipes.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const bouton = "rounded-full bg-brand-blue px-6 py-2 text-sm font-semibold text-white disabled:opacity-50";
  const boutonSecondaire = "rounded-full border border-slate-300 px-5 py-2 text-sm text-brand-navy disabled:opacity-50";

  const equipesAvecMembres = teams.map((t) => ({ team: t, membres: inscrits.filter((i) => i.equipeId === t.id) }));

  return (
    <section className="max-w-3xl flex flex-col gap-8">
      <div>
        <h2 className="font-semibold text-brand-navy mb-2">1. Inscriptions</h2>
        <div className="bg-brand-blue-light rounded-xl p-4 flex flex-col sm:flex-row gap-5">
          <div className="shrink-0">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="QR code d'inscription" className="h-40 w-40 rounded-lg ring-1 ring-black/5" />
            ) : (
              <div className="h-40 w-40 rounded-lg bg-slate-100 animate-pulse" />
            )}
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-slate-600">
              Les participants scannent ce QR code et saisissent leur prénom et l&apos;initiale de leur nom.
              Ouvre l&apos;affiche pour le projeter en plein écran ou l&apos;imprimer.
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href={`/g/${gameId}/inscription/affiche`}
                target="_blank"
                rel="noopener noreferrer"
                className={bouton}
              >
                Ouvrir l&apos;affiche (écran ou impression)
              </a>
              {qr && (
                <a href={qr} download="qrcode-inscription.png" className={boutonSecondaire}>
                  Télécharger le QR (PNG)
                </a>
              )}
            </div>
            {lien && <p className="text-xs text-slate-500 break-all">{lien}</p>}
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={basculerInscriptions} disabled={occupe} className={ouvertes ? boutonSecondaire : bouton}>
                {ouvertes ? "Fermer les inscriptions" : "Ouvrir les inscriptions"}
              </button>
              <span className={`text-sm font-medium ${ouvertes ? "text-green-600" : "text-slate-500"}`}>
                {ouvertes ? "Inscriptions ouvertes" : "Inscriptions fermées"}
              </span>
            </div>
            <p className="text-sm font-semibold text-brand-navy">
              {inscrits.length} inscrit{inscrits.length > 1 ? "s" : ""}
              {inscrits.length > 0 && ` — ${sansEquipe.length} sans équipe`}
            </p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-brand-navy mb-2">2. Former les équipes</h2>
        <div className="bg-brand-blue-light rounded-xl p-4 flex flex-col gap-3">
          {teams.length === 0 ? (
            <p className="text-sm text-amber-700">
              Aucune équipe pour l&apos;instant : crée d&apos;abord les équipes dans l&apos;onglet &quot;Équipes&quot;.
            </p>
          ) : (
            <p className="text-sm text-slate-600">
              Répartit tous les inscrits au hasard dans les {teams.length} équipes du jeu, en équipes de même taille
              (à une personne près)
              {tailleApprox > 0 && <> : environ {tailleApprox} personnes par équipe</>}. Aucune équipe n&apos;est
              créée.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button onClick={former} disabled={occupe || inscrits.length === 0 || teams.length === 0} className={bouton}>
              Former les équipes
            </button>
            {nbAffectes > 0 && sansEquipe.length > 0 && (
              <button onClick={repartirRetards} disabled={occupe} className={boutonSecondaire}>
                Répartir les {sansEquipe.length} sans équipe
              </button>
            )}
          </div>
        </div>
      </div>

      {message && <p className={`text-sm ${message.ok ? "text-green-600" : "text-red-600"}`}>{message.texte}</p>}

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-brand-navy">3. Composition des équipes</h2>
          {inscrits.length > 0 && (
            <button onClick={exporterCsv} className="text-sm underline text-brand-blue">
              Exporter en CSV
            </button>
          )}
        </div>
        {inscrits.length === 0 ? (
          <p className="text-sm text-slate-500">Personne n&apos;est inscrit pour l&apos;instant.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {[...equipesAvecMembres, { team: null, membres: sansEquipe }]
              .filter((g) => g.team !== null || g.membres.length > 0)
              .map((g) => (
                <div key={g.team?.id ?? "sans-equipe"} className="bg-brand-blue-light rounded-xl p-3">
                  <p className="font-medium text-sm text-brand-navy mb-2">
                    {g.team ? g.team.nom : "Sans équipe"} ({g.membres.length})
                  </p>
                  {g.membres.length === 0 ? (
                    <p className="text-xs text-slate-500">Personne pour l&apos;instant.</p>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {g.membres.map((i) => (
                        <li key={i.id} className="flex items-center justify-between gap-2 text-sm text-brand-navy">
                          <span className="truncate">
                            {i.nom}
                            {(doublons.get(i.nom.trim().toLowerCase()) ?? 0) > 1 && (
                              <span className="ml-1 text-amber-600" title="Nom identique à une autre inscription">
                                ⚠
                              </span>
                            )}
                          </span>
                          <span className="flex items-center gap-2 shrink-0">
                            <select
                              value={estAffecte(i) ? i.equipeId ?? "" : ""}
                              onChange={(e) => deplacer(i, e.target.value)}
                              disabled={occupe}
                              className="bg-white border border-slate-200 rounded px-1 py-0.5 text-xs max-w-32"
                              aria-label={`Déplacer ${i.nom}`}
                            >
                              <option value="">Sans équipe</option>
                              {teams.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.nom}
                                </option>
                              ))}
                            </select>
                            <button onClick={() => retirer(i)} disabled={occupe} className="text-red-500 underline text-xs">
                              Retirer
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </section>
  );
}
