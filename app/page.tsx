import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 bg-white text-center">
      <Image
        src="/logos/logo-iua-x-classe.png"
        alt="IUA Classe X"
        width={536}
        height={285}
        className="mb-6 w-64 sm:w-72 h-auto"
        priority
      />
      <h1 className="text-2xl sm:text-3xl font-bold mb-1 tracking-wide text-brand-navy">
        ESCAPE GAME IUA CLASSE X
      </h1>
      <p className="text-sm sm:text-base font-semibold tracking-widest text-brand-blue mb-8 uppercase">
        Le jeu commence maintenant.
      </p>
      <p className="text-slate-600 max-w-sm mb-3 leading-relaxed">
        Vous avez reçu une mission.
        <br />
        Vous ne connaissez pas encore la suite.
        <br />
        À vous de la découvrir.
      </p>
      <Link
        href="/histoire"
        className="mt-7 bg-brand-blue hover:bg-brand-navy text-white font-semibold px-10 py-3 rounded-full text-lg transition"
      >
        Commencer
      </Link>
    </main>
  );
}
