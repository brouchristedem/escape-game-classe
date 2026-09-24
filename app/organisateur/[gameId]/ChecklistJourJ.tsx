"use client";

// Checklist "Prêt pour le jour J" : relit l'état du jeu et signale ce qui
// manque ou cloche (équipes sans circuit, énigmes incomplètes, statistiques
// d'une ancienne partie, inscrits sans équipe, effets restés actifs...).
// Ne modifie rien : chaque point dit où corriger. Se relance à la demande.

import { useEffect, useState } from "react";
import { getAllQuestions, getInscriptions, getLiveState, getQuizConfig } from "@/lib/data";
import { Question, Team } from "@/lib/types";

type Niveau = "erreur" | "warn" | "info" | "ok";
interface Point {
  niveau: Niveau;
  titre: string;
  detail?: string;
}

const ORDRE: Record<Niveau, number> = { erreur: 0, warn: 1, info: 2, ok: 3 };
const ICONE: Record<Niveau, string> = { erreur: "❌", warn: "⚠️", info: "ℹ️", ok: "✅" };

function apercu(liste: string[], max = 6): string {
  return liste.slice(0, max).join(", ") + (liste.length > max ? `, … (+${liste.length - max})` : "");
}

function problemeEtape(q: Question): string | null {
  if (!q.texte.trim()) return "énoncé vide";
  if (q.type === "qcm") {
    if (!q.propositions || q.propositions.some((p) => !p.trim())) return "proposition vide";
    if (q.correctIndex === undefined || q.correctIndex === null) return "bonne réponse non choisie";
  }
  if (q.type === "libre" && !q.reponse?.trim()) return "réponse vide";
  if (q.type === "code" && !q.reponse?.trim()) return "code vide";
  return null;
}

async function verifier(gameId: string, teams: Team[]): Promise<Point[]> {
  const [questions, config, etats, inscrits] = await Promise.all([
    getAllQuestions(gameId),
    getQuizConfig(gameId),
    Promise.all(teams.map((t) => getLiveState(gameId, t.id).catch(() => null))),
    getInscriptions(gameId).catch(() => []),
  ]);
  const points: Point[] = [];

  // Équipes et circuits
  if (teams.length === 0) {
    points.push({ niveau: "erreur", titre: "Aucune équipe", detail: "Crée les équipes dans l'onglet Équipes." });
  } else {
    points.push({ niveau: "ok", titre: `${teams.length} équipe${teams.length > 1 ? "s" : ""} dans le jeu` });
    const parEquipe = teams.map((t) => ({
      team: t,
      etapes: questions.filter((q) => q.salle === t.salle).sort((a, b) => a.ordre - b.ordre),
    }));
    const sansCircuit = parEquipe.filter((x) => x.etapes.length === 0);
    if (sansCircuit.length > 0) {
      points.push({
        niveau: "erreur",
        titre: `${sansCircuit.length} équipe${sansCircuit.length > 1 ? "s" : ""} sans circuit d'énigmes`,
        detail: `${apercu(sansCircuit.map((x) => x.team.nom))}. Importe ton scénario (onglet Scénario) ou crée les étapes (onglet Circuit du jeu).`,
      });
    } else {
      points.push({ niveau: "ok", titre: "Toutes les équipes ont un circuit" });
    }

    const longueurs = parEquipe.filter((x) => x.etapes.length > 0).map((x) => x.etapes.length);
    if (longueurs.length > 0 && Math.min(...longueurs) !== Math.max(...longueurs)) {
      points.push({
        niveau: "warn",
        titre: "Circuits de longueurs différentes",
        detail: `De ${Math.min(...longueurs)} à ${Math.max(...longueurs)} étapes selon les équipes : le classement ne sera pas équitable si ce n'est pas voulu.`,
      });
    }

    // Énigmes complètes
    const incompletes: string[] = [];
    parEquipe.forEach(({ team, etapes }) =>
      etapes.forEach((q, i) => {
        const probleme = problemeEtape(q);
        if (probleme) incompletes.push(`${team.nom}, étape ${i + 1} (${probleme})`);
      })
    );
    if (incompletes.length > 0) {
      points.push({
        niveau: "erreur",
        titre: `${incompletes.length} étape${incompletes.length > 1 ? "s" : ""} incomplète${incompletes.length > 1 ? "s" : ""}`,
        detail: `${apercu(incompletes, 5)}. À corriger dans l'onglet Circuit du jeu.`,
      });
    } else if (sansCircuit.length < teams.length) {
      points.push({ niveau: "ok", titre: "Toutes les énigmes sont complètes" });
    }
  }

  // Statistiques d'une ancienne partie
  const avecStats = etats.filter((e) => e !== null).length;
  if (avecStats > 0) {
    points.push({
      niveau: "warn",
      titre: `Des statistiques existent déjà (${avecStats} équipe${avecStats > 1 ? "s" : ""})`,
      detail: "Si ce sont des restes de tests ou d'une ancienne partie, réinitialise-les (onglet Résultats).",
    });
  } else if (teams.length > 0) {
    points.push({ niveau: "ok", titre: "Aucune statistique d'une ancienne partie" });
  }

  // État du jeu et chrono
  if (config.gameStatus === "pause") {
    points.push({ niveau: "warn", titre: "Le jeu est en pause", detail: "Reprends-le avant de commencer." });
  } else {
    points.push({ niveau: "ok", titre: "Jeu actif (pas en pause)" });
  }
  const fin = config.tempsGeneral?.finTimestamp;
  if (!fin) {
    points.push({ niveau: "info", titre: "Chrono général non démarré", detail: "À lancer au début de la partie (panneau en haut)." });
  } else if (fin <= Date.now()) {
    points.push({ niveau: "warn", titre: "Le chrono général est terminé", detail: "Arrête-le ou relance-en un nouveau." });
  } else {
    points.push({ niveau: "ok", titre: "Chrono général en cours" });
  }

  // Inscriptions
  if (inscrits.length > 0) {
    const idsEquipes = new Set(teams.map((t) => t.id));
    const sansEquipe = inscrits.filter((i) => !i.equipeId || !idsEquipes.has(i.equipeId));
    if (sansEquipe.length > 0) {
      points.push({
        niveau: "warn",
        titre: `${sansEquipe.length} inscrit${sansEquipe.length > 1 ? "s" : ""} sans équipe`,
        detail: "Forme les équipes ou répartis les retardataires (onglet Formation des équipes).",
      });
    } else {
      points.push({ niveau: "ok", titre: `Les ${inscrits.length} inscrits ont tous une équipe` });
    }
  }
  if (config.inscriptionsOuvertes) {
    points.push({
      niveau: "info",
      titre: "Les inscriptions sont encore ouvertes",
      detail: "Ferme-les quand tout le monde est inscrit (onglet Formation des équipes).",
    });
  }

  // Événements surprise restés actifs
  const effetsActifs = Object.values(config.effets ?? {}).filter((e) => !!e).length;
  if (config.enigmeSurprise || effetsActifs > 0) {
    points.push({
      niveau: "warn",
      titre: "Un événement surprise est encore actif",
      detail: `${config.enigmeSurprise ? "Une énigme surprise est en cours. " : ""}${effetsActifs > 0 ? `${effetsActifs} effet${effetsActifs > 1 ? "s" : ""} (prison / écran bloqué) actif${effetsActifs > 1 ? "s" : ""}. ` : ""}Termine-le dans l'onglet Événements.`,
    });
  } else {
    points.push({ niveau: "ok", titre: "Aucun événement surprise en cours" });
  }

  // Ce que l'application ne peut pas vérifier elle-même
  points.push({
    niveau: "info",
    titre: "Règles Firestore publiées ?",
    detail: "Impossible à vérifier d'ici : après chaque mise à jour, publie le fichier firestore.rules dans la console Firebase.",
  });

  return points.sort((a, b) => ORDRE[a.niveau] - ORDRE[b.niveau]);
}

export default function ChecklistJourJ({ gameId, teams }: { gameId: string; teams: Team[] }) {
  const [points, setPoints] = useState<Point[] | null>(null);
  const [erreur, setErreur] = useState(false);
  const [relance, setRelance] = useState(0);
  const cleEquipes = teams.map((t) => t.id).join(",");

  useEffect(() => {
    let annule = false;
    verifier(gameId, teams)
      .then((p) => {
        if (!annule) {
          setPoints(p);
          setErreur(false);
        }
      })
      .catch(() => {
        if (!annule) setErreur(true);
      });
    return () => {
      annule = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, cleEquipes, relance]);

  function reverifier() {
    setPoints(null);
    setErreur(false);
    setRelance((n) => n + 1);
  }

  const nbErreurs = points?.filter((p) => p.niveau === "erreur").length ?? 0;
  const nbAlertes = points?.filter((p) => p.niveau === "warn").length ?? 0;

  return (
    <section className="max-w-2xl">
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="font-semibold text-ink">
          {points === null
            ? erreur
              ? "Vérification impossible"
              : "Vérification en cours..."
            : nbErreurs > 0
              ? `❌ ${nbErreurs} problème${nbErreurs > 1 ? "s" : ""} bloquant${nbErreurs > 1 ? "s" : ""}${nbAlertes > 0 ? `, ${nbAlertes} point${nbAlertes > 1 ? "s" : ""} à vérifier` : ""}`
              : nbAlertes > 0
                ? `⚠️ ${nbAlertes} point${nbAlertes > 1 ? "s" : ""} à vérifier`
                : "✅ Tout est prêt"}
        </p>
        <button onClick={reverifier} className="shrink-0 rounded-full border border-admin-blue/30 px-4 py-1.5 text-sm text-ink">
          Revérifier
        </button>
      </div>

      {erreur && <p className="text-sm text-stamp-red">Impossible de lire l&apos;état du jeu. Vérifie ta connexion, puis réessaie.</p>}

      {points && (
        <ul className="flex flex-col gap-2">
          {points.map((p, i) => (
            <li
              key={i}
              className={`rounded-xl px-4 py-3 text-sm ${
                p.niveau === "erreur"
                  ? "bg-red-50 ring-1 ring-red-200"
                  : p.niveau === "warn"
                    ? "bg-amber-50 ring-1 ring-amber-200"
                    : "bg-admin-blue-light"
              }`}
            >
              <p className="font-medium text-ink">
                {ICONE[p.niveau]} {p.titre}
              </p>
              {p.detail && <p className="text-ink/65 mt-0.5">{p.detail}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
