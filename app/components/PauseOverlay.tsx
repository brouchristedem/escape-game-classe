export default function PauseOverlay({
  titre,
  message,
}: {
  titre: string;
  message: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-white/95 backdrop-blur-sm px-6 text-center">
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-brand-blue/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-brand-navy/10 blur-3xl" />

      <div className="relative z-10 flex flex-col items-center max-w-sm">
        <p className="text-5xl mb-5">⏸️</p>
        <h1 className="text-xl font-bold text-brand-navy mb-3">{titre}</h1>
        <p className="text-sm text-slate-500">{message}</p>
        <div className="mt-6 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-blue animate-bounce [animation-delay:-0.3s]" />
          <span className="h-2.5 w-2.5 rounded-full bg-brand-blue animate-bounce [animation-delay:-0.15s]" />
          <span className="h-2.5 w-2.5 rounded-full bg-brand-blue animate-bounce" />
        </div>
      </div>
    </div>
  );
}
