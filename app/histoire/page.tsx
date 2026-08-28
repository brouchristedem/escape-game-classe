"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getQuizConfig } from "@/lib/data";

const HISTOIRE_PAR_DEFAUT = `Bienvenue à l'IUA, Classe X.

Ce matin, le Directeur du Département Administration des Affaires devait vous lire un message officiel de bienvenue. Problème : la veille au soir, un ancien étudiant facétieux a piraté le système et fragmenté ce message en 10 morceaux, cachés dans les 10 services de l'établissement.

Votre équipe représente un service. Pour récupérer votre fragment, vous devrez résoudre 10 énigmes — de vraies énigmes, pas des questions de cours. Chacune se répond par déduction, jamais par hasard.

Une fois votre fragment récupéré, rejoignez l'amphi. Quand les 10 équipes seront réunies, vous reconstituerez le message original.

Le compte à rebours démarre maintenant. Bonne chance.`;

export default function Histoire() {
  const [texte, setTexte] = useState(HISTOIRE_PAR_DEFAUT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getQuizConfig()
      .then((config) => {
        if (config.histoire && config.histoire.trim()) setTexte(config.histoire);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 bg-white text-center">
      <Image
        src="/logos/logo-iua-x-classe.jpg"
        alt="IUA Classe X"
        width={160}
        height={160}
        className="mb-8 w-32 sm:w-36 h-auto"
        priority
      />

      {loading ? (
        <p className="text-slate-400 text-sm">Chargement...</p>
      ) : (
        <div className="max-w-md text-slate-600 leading-relaxed whitespace-pre-line text-left sm:text-center mb-10">
          {texte}
        </div>
      )}

      <Link
        href="/jouer"
        className="bg-brand-blue hover:bg-brand-navy text-white font-semibold px-10 py-3 rounded-full text-lg transition"
      >
        Commencer
      </Link>
    </main>
  );
}
