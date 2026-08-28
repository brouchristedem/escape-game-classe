"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import LoadingScreen from "@/app/components/LoadingScreen";

export default function Home() {
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);

  function commencer() {
    setNavigating(true);
    setTimeout(() => router.push("/histoire"), 650);
  }

  if (navigating) {
    return <LoadingScreen label="Ouverture de votre mission..." />;
  }

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6 py-16 bg-white text-center">
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-brand-blue/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-brand-navy/10 blur-3xl" />

      <div className="relative z-10 flex flex-col items-center max-w-md w-full">
        <div className="mb-8 rounded-3xl bg-white/80 backdrop-blur px-8 py-6 shadow-[0_8px_30px_rgba(20,163,221,0.12)] ring-1 ring-black/5">
          <Image
            src="/logos/logo-iua-x-classe.png"
            alt="IUA Classe X"
            width={536}
            height={285}
            className="w-56 sm:w-64 h-auto mx-auto"
            priority
          />
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold mb-2 tracking-wide text-brand-navy">
          ESCAPE GAME IUA CLASSE X
        </h1>
        <p className="text-xs sm:text-sm font-semibold tracking-[0.25em] text-brand-blue mb-8 uppercase">
          Le jeu commence maintenant
        </p>
        <p className="text-slate-600 max-w-sm mb-10 leading-relaxed">
          Vous avez reçu une mission.
          <br />
          Vous ne connaissez pas encore la suite.
          <br />
          À vous de la découvrir.
        </p>

        <button
          onClick={commencer}
          className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-blue to-brand-navy px-10 py-3.5 text-lg font-semibold text-white shadow-lg shadow-brand-blue/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-blue/40 active:translate-y-0"
        >
          Commencer
          <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
        </button>
      </div>
    </main>
  );
}
