import GameLogo from "@/app/components/GameLogo";

export default function LoadingScreen({ label = "Chargement..." }: { label?: string }) {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-ink px-6 text-center">
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-brass/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-ink-2 blur-3xl" />

      <div className="relative z-10 flex flex-col items-center">
        <GameLogo className="mb-8 w-24 sm:w-28 h-auto" />
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-brass animate-bounce [animation-delay:-0.3s]" />
          <span className="h-2.5 w-2.5 rounded-full bg-brass animate-bounce [animation-delay:-0.15s]" />
          <span className="h-2.5 w-2.5 rounded-full bg-brass animate-bounce" />
        </div>
        <p className="mt-5 text-sm text-parchment/60">{label}</p>
      </div>
    </main>
  );
}
