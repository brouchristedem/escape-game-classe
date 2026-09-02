"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getQuizConfig } from "@/lib/data";
import { fusionnerTextes, GameTexts } from "@/lib/types";
import LoadingScreen from "@/app/components/LoadingScreen";

const HISTOIRE_PAR_DEFAUT = `Bienvenue à l'IUA, Classe X.

Ce matin, le Directeur du Département Administration des Affaires devait vous lire un message officiel de bienvenue. Problème : la veille au soir, un ancien étudiant facétieux a piraté le système et fragmenté ce message en 10 morceaux, cachés dans les 10 services de l'établissement.

Votre équipe représente un service. Pour récupérer votre fragment, vous devrez résoudre 10 énigmes — de vraies énigmes, pas des questions de cours. Chacune se répond par déduction, jamais par hasard.

Une fois votre fragment récupéré, rejoignez l'amphi. Quand les 10 équipes seront réunies, vous reconstituerez le message original.

Le compte à rebours démarre maintenant. Bonne chance.`;

export default function Histoire() {
  const router = useRouter();
  const [texte, setTexte] = useState(HISTOIRE_PAR_DEFAUT);
  const [texts, setTexts] = useState<GameTexts>(fusionnerTextes());
  const [loading, setLoading] = useState(true);
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    getQuizConfig()
      .then((config) => {
        if (config.histoire && config.histoire.trim()) setTexte(config.histoire);
        setTexts(fusionnerTextes(config.texts));
      })
      .finally(() => setLoading(false));
  }, []);

  function continuer() {
    setNavigating(true);
    setTimeout(() => router.push("/jouer"), 550);
  }

  if (loading) return <LoadingScreen label={texts.histoireChargementLabel} />;
  if (navigating) return <LoadingScreen label={texts.histoireNavigationLabel} />;

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6 py-16 bg-white text-center">
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-brand-blue/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-brand-navy/10 blur-3xl" />

      <div className="relative z-10 flex flex-col items-center max-w-lg w-full">
        <Image
          src="/logos/logo-iua-x-classe.png"
          alt="IUA Classe X"
          width={536}
          height={285}
          className="mb-8 w-40 sm:w-48 h-auto"
          priority
        />

        <div className="mb-10 max-w-md rounded-3xl bg-brand-blue-light/70 ring-1 ring-brand-blue/15 px-6 sm:px-8 py-7 text-slate-700 leading-relaxed whitespace-pre-line text-left sm:text-center shadow-sm">
          {texte}
        </div>

        <button
          onClick={continuer}
          className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-blue to-brand-navy px-10 py-3.5 text-lg font-semibold text-white shadow-lg shadow-brand-blue/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-blue/40 active:translate-y-0"
        >
          {texts.histoireBouton}
          <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
        </button>
      </div>
    </main>
  );
}
