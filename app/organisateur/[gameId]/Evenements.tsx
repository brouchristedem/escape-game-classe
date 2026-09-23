"use client";

// Événements surprise, côté organisateur : lancer une énigme surprise chez
// toutes les équipes (la première à répondre juste est départagée par l'heure
// serveur), puis appliquer l'effet à l'équipe visée — choisie à l'oral par
// l'équipe gagnante : mise en prison d'un membre ou blocage de l'écran.

import { useEffect, useState } from "react";
import {
  appliquerEffetEquipe,
  appliquerEffetToutesEquipes,
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
  const [prisonDureeLimitee, setPrisonDureeLimitee] = useState(false);
  const [dureePrison, setDureePrison] = useState("5");
  const [unitePrison, setUnitePrison] = useState<UniteTemps>("minutes");
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);

  // Section 3 : "fausse fin" / "glitch", déclenchables chez une équipe
  // précise ou chez toutes les équipes en même temps, avec une durée
  // d'affichage choisie ici (secondes ou minutes).
  const [typeSurprise, setTypeSurprise] = useState<"fausseFin" | "glitch">("fausseFin");
  const [cibleSurprise, setCibleSurprise] = useState<"equipe" | "toutes">("toutes");
  const [teamSurprise, setTeamSurprise] = useState("");
  const [glitchTexte, setGlitchTexte] = useState("");
  const [dureeSurprise, setDureeSurprise] = useState("4");
  const [uniteSurprise, setUniteSurprise] = useState<UniteTemps>("secondes");
  const [vibrer, setVibrer] = useState(true);

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
      const dureeSecondes = prisonDureeLimitee ? versSecondes(Number(dureePrison), unitePrison) : undefined;
      if (prisonDureeLimitee && !dureeSecondes) return;
      executer(async () => {
        await appliquerEffetEquipe(gameId, equipe.id, { type: "prison", personne: personne.trim(), dureeSecondes });
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

  function declencherSurprise() {
    const dureeSecondes = versSecondes(Number(dureeSurprise), uniteSurprise) || undefined;
    const effet =
      typeSurprise === "glitch"
        ? ({ type: "glitch", texte: glitchTexte.trim(), dureeSecondes, vibrer } as const)
        : ({ type: "fausseFin", dureeSecondes } as const);
    if (typeSurprise === "glitch" && !glitchTexte.trim()) return;

    if (cibleSurprise === "toutes") {
      executer(
        () => appliquerEffetToutesEquipes(gameId, teams.map((t) => t.id), effet),
        typeSurprise === "glitch" ? "Glitch déclenché chez toutes les équipes." : "Fausse fin déclenchée chez toutes les équipes."
      );
    } else {
      const equipe = teams.find((t) => t.id === teamSurprise);
      if (!equipe) return;
      executer(
        () => appliquerEffetEquipe(gameId, equipe.id, effet),
        typeSurprise === "glitch" ? `Glitch déclenché chez ${equipe.nom}.` : `Fausse fin déclenchée chez ${equipe.nom}.`
      );
    }
  }

  const effetsActifs = teams
    .map((t) => ({ team: t, effet: effets[t.id] ?? null }))
    .filter((x): x is { team: Team; effet: EffetEquipe } => !!x.effet && (x.effet.type === "prison" || x.effet.type === "blocage"));

  const champ = "bg-white border border-brass/20 rounded-lg px-3 py-2 w-full";
  const bouton = "rounded-full bg-brass px-6 py-2 text-sm font-semibold text-ink disabled:opacity-50";

  return (
    <section className="max-w-2xl flex flex-col gap-8">
      <div>
        <h2 className="font-semibold text-ink mb-2">1. Énigme surprise</h2>
        {!enigme ? (
          <div className="bg-brass-light rounded-xl p-4 flex flex-col gap-3">
            <p className="text-sm text-ink/65">
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
          <div className="bg-brass-light rounded-xl p-4 flex flex-col gap-3">
            <p className="text-sm text-ink whitespace-pre-line">{enigme.enonce}</p>
            <p className="text-xs text-ink/55">Réponse attendue : {enigme.reponse}</p>
            <div>
              <p className="text-sm font-medium text-ink mb-1">Équipes ayant répondu juste</p>
              {bonnes.length === 0 ? (
                <p className="text-sm text-ink/55">Aucune pour l&apos;instant.</p>
              ) : (
                <ol className="text-sm text-ink space-y-0.5">
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
              className="self-start rounded-full border border-brass/30 px-6 py-2 text-sm text-ink disabled:opacity-50"
            >
              Terminer l&apos;énigme surprise
            </button>
          </div>
        )}
      </div>

      <div>
        <h2 className="font-semibold text-ink mb-2">2. Appliquer un effet à une équipe</h2>
        <div className="bg-brass-light rounded-xl p-4 flex flex-col gap-3">
          <p className="text-sm text-ink/65">
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
                  typeEffet === t ? "bg-brass text-ink" : "bg-white border border-brass/20 text-ink"
                }`}
              >
                {t === "prison" ? "Prison" : "Écran bloqué"}
              </button>
            ))}
          </div>
          {typeEffet === "prison" ? (
            <>
              <input value={personne} onChange={(e) => setPersonne(e.target.value)} className={champ} placeholder="Nom de la personne mise en prison" />
              <label className="flex items-center gap-2 text-sm text-ink/70">
                <input type="checkbox" checked={prisonDureeLimitee} onChange={(e) => setPrisonDureeLimitee(e.target.checked)} />
                Durée limitée (sinon jusqu&apos;à ce que tu libères la personne)
              </label>
              {prisonDureeLimitee && (
                <div className="flex gap-2">
                  <input type="number" min="1" value={dureePrison} onChange={(e) => setDureePrison(e.target.value)} className={`${champ} w-28`} />
                  <select value={unitePrison} onChange={(e) => setUnitePrison(e.target.value as UniteTemps)} className={`${champ} w-36`}>
                    <option value="secondes">secondes</option>
                    <option value="minutes">minutes</option>
                  </select>
                </div>
              )}
            </>
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

      <div>
        <h2 className="font-semibold text-ink mb-2">3. Fausse fin / Glitch</h2>
        <div className="bg-brass-light rounded-xl p-4 flex flex-col gap-3">
          <p className="text-sm text-ink/65">
            À déclencher au moment de ton choix, chez une équipe précise ou chez toutes en même temps. L&apos;effet
            se joue automatiquement (quelques secondes) puis le jeu reprend tout seul.
          </p>
          <div className="flex gap-2">
            {(["fausseFin", "glitch"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setTypeSurprise(v)}
                className={`px-4 py-1.5 rounded-full text-sm transition ${
                  typeSurprise === v ? "bg-brass text-ink" : "bg-white border border-brass/20 text-ink"
                }`}
              >
                {v === "fausseFin" ? "Fausse fin" : "Glitch (site piraté)"}
              </button>
            ))}
          </div>
          {typeSurprise === "glitch" && (
            <textarea
              value={glitchTexte}
              onChange={(e) => setGlitchTexte(e.target.value)}
              rows={2}
              className={champ}
              placeholder="Message révélé pendant le glitch"
            />
          )}
          <div>
            <p className="text-xs text-ink/55 mb-1">
              {typeSurprise === "glitch" ? "Durée d'affichage du glitch" : "Durée de l'écran de victoire (avant la révélation)"}
            </p>
            <div className="flex gap-2">
              <input type="number" min="1" value={dureeSurprise} onChange={(e) => setDureeSurprise(e.target.value)} className={`${champ} w-28`} />
              <select value={uniteSurprise} onChange={(e) => setUniteSurprise(e.target.value as UniteTemps)} className={`${champ} w-36`}>
                <option value="secondes">secondes</option>
                <option value="minutes">minutes</option>
              </select>
            </div>
          </div>
          {typeSurprise === "glitch" && (
            <label className="flex items-center gap-2 text-sm text-ink/70">
              <input type="checkbox" checked={vibrer} onChange={(e) => setVibrer(e.target.checked)} />
              Faire vibrer l&apos;appareil pendant le glitch (si le téléphone le permet)
            </label>
          )}
          <div className="flex gap-2">
            {(["toutes", "equipe"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setCibleSurprise(v)}
                className={`px-4 py-1.5 rounded-full text-sm transition ${
                  cibleSurprise === v ? "bg-brass text-ink" : "bg-white border border-brass/20 text-ink"
                }`}
              >
                {v === "toutes" ? "Toutes les équipes" : "Une équipe précise"}
              </button>
            ))}
          </div>
          {cibleSurprise === "equipe" && (
            <select value={teamSurprise} onChange={(e) => setTeamSurprise(e.target.value)} className={champ}>
              <option value="">Équipe visée…</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nom}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={declencherSurprise}
            disabled={
              occupe ||
              (typeSurprise === "glitch" && !glitchTexte.trim()) ||
              (cibleSurprise === "equipe" && !teamSurprise)
            }
            className={`${bouton} self-start`}
          >
            Déclencher
          </button>
        </div>
      </div>

      {effetsActifs.length > 0 && (
        <div>
          <h2 className="font-semibold text-ink mb-2">Effets en cours</h2>
          <ul className="flex flex-col gap-2">
            {effetsActifs.map(({ team, effet }) => {
              const termine = effet.type === "blocage" && !!effet.finTimestamp && effet.finTimestamp <= maintenant;
              return (
                <li key={team.id} className="bg-brass-light rounded-xl p-3 flex items-center justify-between gap-3 text-sm text-ink">
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
                    className="underline text-brass-dark shrink-0 disabled:opacity-50"
                  >
                    {effet.type === "prison" ? "Libérer" : "Retirer"}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {message && <p className={`text-sm ${message.ok ? "text-green-600" : "text-stamp-red"}`}>{message.texte}</p>}
    </section>
  );
}
