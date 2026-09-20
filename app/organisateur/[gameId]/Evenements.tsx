"use client";

// Événements surprise, côté organisateur : lancer une énigme surprise chez
// toutes les équipes (la première à répondre juste est départagée par l'heure
// serveur), puis appliquer l'effet à l'équipe visée — choisie à l'oral par
// l'équipe gagnante : mise en prison d'un membre ou blocage de l'écran.

import { useEffect, useState } from "react";
import {
  appliquerEffetEquipe,
  ecouterBonnesReponsesSurprise,
  ecouterEvenementsJeu,
  lancerEnigmeSurprise,
  retirerEffetEquipe,
  terminerEnigmeSurprise,
} from "@/lib/data";
import { BonneReponseSurprise, EffetEquipe, EnigmeSurprise, Team, TypeEffet, UniteTemps, versSecondes } from "@/lib/types";

function formaterHeure(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function Evenements({ gameId, teams }: { gameId: string; teams: Team[] }) {
  const [enigme, setEnigme] = useState<EnigmeSurprise | null>(null);
  const [effets, setEffets] = useState<Record<string, EffetEquipe | null>>({});
  const [bonnes, setBonnes] = useState<BonneReponseSurprise[]>([]);
  const [maintenant, setMaintenant] = useState(() => Date.now());

  const [enonce, setEnonce] = useState("");
  const [reponse, setReponse] = useState("");
  const [teamCible, setTeamCible] = useState("");
  const [typeEffet, setTypeEffet] = useState<TypeEffet>("prison");
  const [personne, setPersonne] = useState("");
  const [duree, setDuree] = useState("2");
  const [unite, setUnite] = useState<UniteTemps>("minutes");
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);

  useEffect(() => ecouterEvenementsJeu(gameId, (v) => {
    setEnigme(v.enigmeSurprise);
    setEffets(v.effets);
  }), [gameId]);

  const enigmeId = enigme?.id ?? null;
  useEffect(() => {
    if (!enigmeId) return;
    return ecouterBonnesReponsesSurprise(gameId, enigmeId, setBonnes);
  }, [gameId, enigmeId]);

  useEffect(() => {
    const id = setInterval(() => setMaintenant(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  async function executer(action: () => Promise<void>, ok: string) {
    setOccupe(true);
    setMessage(null);
    try {
      await action();
      setMessage({ ok: true, texte: ok });
    } catch {
      setMessage({ ok: false, texte: "Échec de l'opération. Vérifie ta connexion et tes droits sur ce jeu, puis réessaie." });
    } finally {
      setOccupe(false);
    }
  }

  function lancer() {
    if (!enonce.trim() || !reponse.trim()) return;
    executer(async () => {
      await lancerEnigmeSurprise(gameId, enonce.trim(), reponse.trim());
      setEnonce("");
      setReponse("");
    }, "Énigme surprise lancée chez toutes les équipes.");
  }

  function appliquer() {
    const equipe = teams.find((t) => t.id === teamCible);
    if (!equipe) return;
    if (typeEffet === "prison") {
      if (!personne.trim()) return;
      executer(async () => {
        await appliquerEffetEquipe(gameId, equipe.id, { type: "prison", personne: personne.trim() });
        setPersonne("");
      }, `${personne.trim()} est en prison (équipe ${equipe.nom}).`);
    } else {
      const valeur = Number(duree);
      if (!valeur || valeur <= 0) return;
      executer(
        () => appliquerEffetEquipe(gameId, equipe.id, { type: "blocage", dureeSecondes: versSecondes(valeur, unite) }),
        `Écran de l'équipe ${equipe.nom} bloqué.`
      );
    }
  }

  const effetsActifs = teams
    .map((t) => ({ team: t, effet: effets[t.id] ?? null }))
    .filter((x): x is { team: Team; effet: EffetEquipe } => !!x.effet);

  const champ = "bg-white border border-slate-200 rounded-lg px-3 py-2 w-full";
  const bouton = "rounded-full bg-brand-blue px-6 py-2 text-sm font-semibold text-white disabled:opacity-50";

  return (
    <section className="max-w-2xl flex flex-col gap-8">
      <div>
        <h2 className="font-semibold text-brand-navy mb-2">1. Énigme surprise</h2>
        {!enigme ? (
          <div className="bg-brand-blue-light rounded-xl p-4 flex flex-col gap-3">
            <p className="text-sm text-slate-600">
              L&apos;énigme s&apos;affiche en plein écran chez toutes les équipes, sans dire ce qui est en jeu. La
              première équipe à répondre juste apparaît ici.
            </p>
            <textarea value={enonce} onChange={(e) => setEnonce(e.target.value)} rows={3} className={champ} placeholder="Énoncé de l'énigme surprise" />
            <input value={reponse} onChange={(e) => setReponse(e.target.value)} className={champ} placeholder="Réponse attendue" />
            <button onClick={lancer} disabled={occupe || !enonce.trim() || !reponse.trim()} className={`${bouton} self-start`}>
              Lancer l&apos;énigme surprise
            </button>
          </div>
        ) : (
          <div className="bg-brand-blue-light rounded-xl p-4 flex flex-col gap-3">
            <p className="text-sm text-brand-navy whitespace-pre-line">{enigme.enonce}</p>
            <p className="text-xs text-slate-500">Réponse attendue : {enigme.reponse}</p>
            <div>
              <p className="text-sm font-medium text-brand-navy mb-1">Équipes ayant répondu juste</p>
              {bonnes.length === 0 ? (
                <p className="text-sm text-slate-500">Aucune pour l&apos;instant.</p>
              ) : (
                <ol className="text-sm text-brand-navy space-y-0.5">
                  {bonnes.map((b, i) => (
                    <li key={b.teamId} className={i === 0 ? "font-semibold" : ""}>
                      {i === 0 ? "🥇 " : `${i + 1}. `}
                      {b.nom || b.teamId} — {formaterHeure(b.at)}
                    </li>
                  ))}
                </ol>
              )}
            </div>
            <button
              onClick={() => executer(() => terminerEnigmeSurprise(gameId), "Énigme surprise terminée.")}
              disabled={occupe}
              className="self-start rounded-full border border-slate-300 px-6 py-2 text-sm text-brand-navy disabled:opacity-50"
            >
              Terminer l&apos;énigme surprise
            </button>
          </div>
        )}
      </div>

      <div>
        <h2 className="font-semibold text-brand-navy mb-2">2. Appliquer un effet à une équipe</h2>
        <div className="bg-brand-blue-light rounded-xl p-4 flex flex-col gap-3">
          <p className="text-sm text-slate-600">
            L&apos;équipe gagnante annonce sa cible à l&apos;oral : applique ici l&apos;effet choisi.
          </p>
          <select value={teamCible} onChange={(e) => setTeamCible(e.target.value)} className={champ}>
            <option value="">Équipe visée…</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nom}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            {(["prison", "blocage"] as TypeEffet[]).map((t) => (
              <button
                key={t}
                onClick={() => setTypeEffet(t)}
                className={`px-4 py-1.5 rounded-full text-sm transition ${
                  typeEffet === t ? "bg-brand-blue text-white" : "bg-white border border-slate-200 text-brand-navy"
                }`}
              >
                {t === "prison" ? "Prison" : "Écran bloqué"}
              </button>
            ))}
          </div>
          {typeEffet === "prison" ? (
            <input value={personne} onChange={(e) => setPersonne(e.target.value)} className={champ} placeholder="Nom de la personne mise en prison" />
          ) : (
            <div className="flex gap-2">
              <input type="number" min="1" value={duree} onChange={(e) => setDuree(e.target.value)} className={`${champ} w-28`} />
              <select value={unite} onChange={(e) => setUnite(e.target.value as UniteTemps)} className={`${champ} w-36`}>
                <option value="secondes">secondes</option>
                <option value="minutes">minutes</option>
              </select>
            </div>
          )}
          <button
            onClick={appliquer}
            disabled={occupe || !teamCible || (typeEffet === "prison" ? !personne.trim() : !Number(duree))}
            className={`${bouton} self-start`}
          >
            {typeEffet === "prison" ? "Mettre en prison" : "Bloquer l'écran"}
          </button>
        </div>
      </div>

      {effetsActifs.length > 0 && (
        <div>
          <h2 className="font-semibold text-brand-navy mb-2">Effets en cours</h2>
          <ul className="flex flex-col gap-2">
            {effetsActifs.map(({ team, effet }) => {
              const termine = effet.type === "blocage" && !!effet.finTimestamp && effet.finTimestamp <= maintenant;
              return (
                <li key={team.id} className="bg-brand-blue-light rounded-xl p-3 flex items-center justify-between gap-3 text-sm text-brand-navy">
                  <span>
                    <strong>{team.nom}</strong> —{" "}
                    {effet.type === "prison"
                      ? `🔒 ${effet.personne ?? "un membre"} en prison`
                      : termine
                        ? "écran bloqué (terminé)"
                        : `écran bloqué, encore ${Math.max(0, Math.ceil(((effet.finTimestamp ?? 0) - maintenant) / 1000))} s`}
                  </span>
                  <button
                    onClick={() => executer(() => retirerEffetEquipe(gameId, team.id), `Effet retiré pour ${team.nom}.`)}
                    disabled={occupe}
                    className="underline text-brand-blue shrink-0 disabled:opacity-50"
                  >
                    {effet.type === "prison" ? "Libérer" : "Retirer"}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {message && <p className={`text-sm ${message.ok ? "text-green-600" : "text-red-600"}`}>{message.texte}</p>}
    </section>
  );
}
