import { Question, TypeEnigme } from "./types";

// --- Import d'un scénario personnalisé depuis un texte extrait d'un fichier
// Word (.docx) ou PDF. L'organisateur rédige son scénario en respectant un
// format simple à base de mots-clés (voir SCENARIO_FORMAT_GUIDE ci-dessous,
// affiché directement dans l'espace organisateur). Ce module ne fait AUCUNE
// hypothèse de mise en forme (gras, couleurs...) : seul le texte brut compte,
// ligne par ligne.

export const SCENARIO_FORMAT_GUIDE = `Rédigez votre document (Word ou PDF) en texte simple, avec CES MOTS-CLÉS en début de ligne (majuscules ou minuscules, peu importe). Copiez-collez ce squelette et remplissez-le :

HISTOIRE:
(Le texte affiché aux équipes avant qu'elles ne choisissent leur équipe. Plusieurs lignes possibles.)

FRAGMENTS:
1. Premier morceau de la phrase finale
2. Deuxième morceau de la phrase finale
(un fragment par ligne numérotée, autant que nécessaire)

SALLE: TD1

ENIGME 1
TYPE: QCM
TEXTE: L'énoncé de l'énigme
A) Première proposition
B) Deuxième proposition
C) Troisième proposition
D) Quatrième proposition
BONNE REPONSE: B
FEEDBACK CORRECT: Texte affiché si bonne réponse
FEEDBACK INCORRECT: Texte affiché si mauvaise réponse
TEMPS: 60

ENIGME 2
TYPE: LIBRE
TEXTE: L'énoncé de l'énigme
REPONSE: la réponse attendue
FEEDBACK CORRECT: Texte affiché si bonne réponse
FEEDBACK INCORRECT: Texte affiché si mauvaise réponse
TEMPS:

PAGE CODE
TEXTE: Texte affiché en haut de cette page intercalaire
CODE: LECODEATTENDU

SALLE: TD2

ENIGME 1
...

Règles :
- Une ligne "SALLE: ..." commence une nouvelle salle ; tout ce qui suit (énigmes, pages code) lui appartient jusqu'à la prochaine ligne "SALLE:".
- Une ligne "ENIGME <numéro>" commence une nouvelle énigme (le numéro sert juste de repère pour vous, l'ordre réel est celui du document).
- Une ligne "PAGE CODE" commence une page intercalaire (verrou par code, sans tentatives limitées).
- "TYPE:" vaut QCM ou LIBRE.
- Pour un QCM : exactement 4 propositions (A, B, C, D) et une ligne "BONNE REPONSE: <lettre>".
- Pour une énigme LIBRE ou une PAGE CODE : une ligne "REPONSE:" (énigme) ou "CODE:" (page) avec la réponse/le code attendu.
- "TEMPS:" en secondes, laissez vide si pas de limite de temps.
- Les sections HISTOIRE et FRAGMENTS sont facultatives ; si absentes, l'histoire et les fragments existants ne sont pas modifiés.
- Tout texte après "TEXTE:" peut continuer sur les lignes suivantes, jusqu'au prochain mot-clé.`;

interface ParsedQuestion {
  salle: string;
  ordre: number;
  type: TypeEnigme;
  texte: string;
  propositions?: [string, string, string, string];
  correctIndex?: 0 | 1 | 2 | 3;
  reponse?: string;
  feedbackCorrect: string;
  feedbackIncorrect: string;
  tempsLimite: number | null;
}

export interface ParsedScenario {
  histoire: string | null; // null = section absente, ne pas écraser l'existant
  fragments: string[] | null;
  questions: Omit<Question, "id">[];
}

const RE_HISTOIRE = /^HISTOIRE\s*:?\s*$/i;
const RE_FRAGMENTS = /^FRAGMENTS\s*:?\s*$/i;
const RE_SALLE = /^SALLE\s*:\s*(.+)$/i;
const RE_ENIGME = /^ENIGME\s+\d+\s*:?\s*$/i;
const RE_PAGE_CODE = /^PAGE\s*CODE\s*:?\s*$/i;
const RE_TYPE = /^TYPE\s*:\s*(QCM|LIBRE)\s*$/i;
const RE_TEXTE = /^TEXTE\s*:\s*(.*)$/i;
const RE_OPTION = /^([A-D])\)\s*(.*)$/i;
const RE_BONNE = /^BONNE\s*REPONSE\s*:\s*([A-D])\s*$/i;
const RE_REPONSE = /^REPONSE\s*:\s*(.*)$/i;
const RE_CODE = /^CODE\s*:\s*(.*)$/i;
const RE_FEEDBACK_OK = /^FEEDBACK\s*CORRECT\s*:\s*(.*)$/i;
const RE_FEEDBACK_KO = /^FEEDBACK\s*INCORRECT\s*:\s*(.*)$/i;
const RE_TEMPS = /^TEMPS\s*:\s*(.*)$/i;
const RE_FRAGMENT_LINE = /^\d+[.)]\s*(.+)$/;

function normaliserAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function estUneLigneRepere(ligneBrute: string): boolean {
  const l = normaliserAccents(ligneBrute.trim());
  return (
    RE_HISTOIRE.test(l) ||
    RE_FRAGMENTS.test(l) ||
    RE_SALLE.test(l) ||
    RE_ENIGME.test(l) ||
    RE_PAGE_CODE.test(l) ||
    RE_TYPE.test(l) ||
    RE_TEXTE.test(l) ||
    RE_OPTION.test(l) ||
    RE_BONNE.test(l) ||
    RE_REPONSE.test(l) ||
    RE_CODE.test(l) ||
    RE_FEEDBACK_OK.test(l) ||
    RE_FEEDBACK_KO.test(l) ||
    RE_TEMPS.test(l)
  );
}

export function parseScenario(texteBrut: string): ParsedScenario {
  const lignes = texteBrut
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.trim());

  let histoire: string | null = null;
  let fragments: string[] | null = null;
  const questions: Omit<Question, "id">[] = [];

  let salleCourante = "";
  let ordreCourant = 0;

  // État de l'étape en cours de construction (énigme ou page code)
  let etape: Partial<ParsedQuestion> | null = null;
  let texteAccumule: string[] | null = null; // pour TEXTE: multi-lignes

  function clotureTexteAccumule() {
    if (etape && texteAccumule !== null) {
      etape.texte = texteAccumule.join("\n").trim();
    }
    texteAccumule = null;
  }

  function clotureEtape() {
    clotureTexteAccumule();
    if (!etape) return;
    ordreCourant += 1;
    questions.push({
      salle: salleCourante,
      ordre: ordreCourant,
      type: etape.type ?? "libre",
      texte: etape.texte ?? "",
      ...(etape.type === "qcm"
        ? {
            propositions: etape.propositions ?? ["", "", "", ""],
            correctIndex: etape.correctIndex ?? 0,
          }
        : { reponse: etape.reponse ?? "" }),
      feedbackCorrect: etape.feedbackCorrect ?? "",
      feedbackIncorrect: etape.feedbackIncorrect ?? "",
      tempsLimite: etape.tempsLimite ?? null,
    } as Omit<Question, "id">);
    etape = null;
  }

  // Section en cours pour les blocs multi-lignes hors étape (HISTOIRE / FRAGMENTS)
  let section: "histoire" | "fragments" | null = null;
  const histoireLignes: string[] = [];
  const fragmentsListe: string[] = [];

  for (let i = 0; i < lignes.length; i++) {
    const ligneOriginale = lignes[i];
    const ligne = normaliserAccents(ligneOriginale);
    if (ligne === "") {
      if (texteAccumule !== null) texteAccumule.push("");
      continue;
    }

    if (RE_HISTOIRE.test(ligne)) {
      clotureEtape();
      section = "histoire";
      continue;
    }
    if (RE_FRAGMENTS.test(ligne)) {
      clotureEtape();
      section = "fragments";
      continue;
    }
    const mSalle = ligne.match(RE_SALLE);
    if (mSalle) {
      clotureEtape();
      section = null;
      salleCourante = ligneOriginale.replace(/^SALLE\s*:\s*/i, "").trim();
      ordreCourant = 0;
      continue;
    }
    if (RE_ENIGME.test(ligne)) {
      clotureEtape();
      section = null;
      etape = { type: "libre" };
      continue;
    }
    if (RE_PAGE_CODE.test(ligne)) {
      clotureEtape();
      section = null;
      etape = { type: "code" };
      continue;
    }

    if (section === "histoire") {
      histoireLignes.push(ligneOriginale);
      continue;
    }
    if (section === "fragments") {
      const mFrag = ligne.match(RE_FRAGMENT_LINE);
      fragmentsListe.push(mFrag ? mFrag[1].trim() : ligneOriginale.trim());
      continue;
    }

    if (!etape) continue; // ligne orpheline hors de toute étape/section connue

    const mType = ligne.match(RE_TYPE);
    if (mType) {
      clotureTexteAccumule();
      etape.type = mType[1].toLowerCase() === "qcm" ? "qcm" : "libre";
      continue;
    }
    const mTexte = ligne.match(RE_TEXTE);
    if (mTexte) {
      clotureTexteAccumule();
      const reste = ligneOriginale.replace(/^TEXTE\s*:\s*/i, "");
      texteAccumule = [reste];
      continue;
    }
    const mOption = ligne.match(RE_OPTION);
    if (mOption) {
      clotureTexteAccumule();
      const lettre = mOption[1].toUpperCase();
      const idx = lettre.charCodeAt(0) - 65; // A=0..D=3
      const props = (etape.propositions ?? ["", "", "", ""]) as [string, string, string, string];
      props[idx] = ligneOriginale.replace(/^[A-D]\)\s*/i, "").trim();
      etape.propositions = props;
      continue;
    }
    const mBonne = ligne.match(RE_BONNE);
    if (mBonne) {
      clotureTexteAccumule();
      etape.correctIndex = (mBonne[1].toUpperCase().charCodeAt(0) - 65) as 0 | 1 | 2 | 3;
      continue;
    }
    const mReponse = ligne.match(RE_REPONSE);
    if (mReponse) {
      clotureTexteAccumule();
      etape.reponse = ligneOriginale.replace(/^REPONSE\s*:\s*/i, "").trim();
      continue;
    }
    const mCode = ligne.match(RE_CODE);
    if (mCode) {
      clotureTexteAccumule();
      etape.reponse = ligneOriginale.replace(/^CODE\s*:\s*/i, "").trim();
      continue;
    }
    const mFbOk = ligne.match(RE_FEEDBACK_OK);
    if (mFbOk) {
      clotureTexteAccumule();
      etape.feedbackCorrect = ligneOriginale.replace(/^FEEDBACK\s*CORRECT\s*:\s*/i, "").trim();
      continue;
    }
    const mFbKo = ligne.match(RE_FEEDBACK_KO);
    if (mFbKo) {
      clotureTexteAccumule();
      etape.feedbackIncorrect = ligneOriginale.replace(/^FEEDBACK\s*INCORRECT\s*:\s*/i, "").trim();
      continue;
    }
    const mTemps = ligne.match(RE_TEMPS);
    if (mTemps) {
      clotureTexteAccumule();
      const valeur = ligneOriginale.replace(/^TEMPS\s*:\s*/i, "").trim();
      const n = Number(valeur.replace(/[^\d.]/g, ""));
      etape.tempsLimite = valeur === "" || Number.isNaN(n) ? null : n;
      continue;
    }

    // Ligne de continuation d'un TEXTE: multi-lignes
    if (texteAccumule !== null && !estUneLigneRepere(ligne)) {
      texteAccumule.push(ligneOriginale);
    }
  }
  clotureEtape();

  if (section === "histoire" || histoireLignes.length > 0) {
    histoire = histoireLignes.join("\n").trim();
  }
  if (section === "fragments" || fragmentsListe.length > 0) {
    fragments = fragmentsListe.filter((f) => f.trim() !== "");
  }

  return { histoire, fragments, questions };
}

// --- Extraction de texte brut depuis un fichier .docx ou .pdf, côté client. ---

export async function extraireTexteFichier(file: File): Promise<string> {
  const nom = file.name.toLowerCase();
  if (nom.endsWith(".docx")) {
    const mammoth = await import("mammoth/mammoth.browser");
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }
  if (nom.endsWith(".pdf")) {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages: string[] = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const strings = content.items.map((it) => ("str" in it ? it.str : ""));
      pages.push(strings.join(" "));
    }
    return pages.join("\n");
  }
  throw new Error("Format non supporté : utilisez un fichier .docx ou .pdf.");
}
