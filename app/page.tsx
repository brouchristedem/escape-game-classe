import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 bg-gradient-to-b from-indigo-950 via-indigo-900 to-slate-900 text-white text-center">
      <h1 className="text-3xl sm:text-4xl font-bold mb-3">Quiz Semaine d&apos;Intégration</h1>
      <p className="text-indigo-200 max-w-md mb-10">
        Un téléphone par équipe. Répondez aux questions, débloquez votre fragment,
        puis rejoignez l&apos;amphi pour reconstituer la phrase finale.
      </p>
      <Link
        href="/jouer"
        className="bg-amber-400 hover:bg-amber-300 text-indigo-950 font-semibold px-8 py-3 rounded-full text-lg transition"
      >
        Commencer le quiz de mon équipe
      </Link>
      <Link
        href="/admin"
        className="mt-6 text-indigo-300 text-sm underline underline-offset-4 hover:text-indigo-100"
      >
        Espace organisateur
      </Link>
    </main>
  );
}
