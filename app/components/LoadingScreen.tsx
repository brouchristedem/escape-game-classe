import Image from "next/image";

export default function LoadingScreen({ label = "Chargement..." }: { label?: string }) {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-white px-6 text-center">
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-brand-blue/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-brand-navy/10 blur-3xl" />

      <div className="relative z-10 flex flex-col items-center">
        <Image
          src="/logos/logo-iua-x-classe.png"
          alt="Logo du jeu"
          width={536}
          height={285}
          className="mb-8 w-36 sm:w-40 h-auto opacity-90 animate-pulse"
          priority
        />
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-blue animate-bounce [animation-delay:-0.3s]" />
          <span className="h-2.5 w-2.5 rounded-full bg-brand-blue animate-bounce [animation-delay:-0.15s]" />
          <span className="h-2.5 w-2.5 rounded-full bg-brand-blue animate-bounce" />
        </div>
        <p className="mt-5 text-sm text-slate-500">{label}</p>
      </div>
    </main>
  );
}
