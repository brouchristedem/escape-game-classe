import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 bg-white text-center">
      <Image
        src="/logos/logo-iua-x-classe.jpg"
        alt="IUA Classe X"
        width={280}
        height={280}
        className="mb-6 w-56 sm:w-64 h-auto"
        priority
      />
      <h1 className="text-3xl sm:text-4xl font-bold mb-3 text-brand-navy">Escape Game IUA Classe X</h1>
      <p className="text-slate-600 max-w-md mb-10">
        Résolvez les énigmes, débloquez votre fragment,
        puis rejoignez l&apos;amphi pour reconstituer la phrase finale.
      </p>
      <Link
        href="/jouer"
        className="bg-brand-blue hover:bg-brand-navy text-white font-semibold px-8 py-3 rounded-full text-lg transition"
      >
        Commencer l&apos;escape game de mon équipe
      </Link>
      <Link
        href="/admin"
        className="mt-6 text-brand-navy/70 text-sm underline underline-offset-4 hover:text-brand-navy"
      >
        Espace organisateur
      </Link>
    </main>
  );
}
