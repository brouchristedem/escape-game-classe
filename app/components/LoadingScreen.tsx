"use client";

import { useEffect, useState } from "react";
import Runes from "@/app/components/Runes";

const CITATIONS = [
  "Cinq mystères. Deux volontés pour chacun.",
  "Le Gardien observe ceux qui s'approchent.",
  "Ce qui est caché attend d'être trouvé.",
];
const RUNES = ["fe", "th", "r", "k", "s"];

export default function LoadingScreen({ label }: { label?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % CITATIONS.length), 2600);
    return () => clearInterval(t);
  }, []);

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center bg-brume px-6 text-center">
      <div className="flex items-center gap-3 text-nuit" aria-hidden>
        {RUNES.map((r, k) => (
          <span key={r} className="rune-allume" style={{ animationDelay: `${k * 0.45}s` }}>
            <Runes sequence={[r]} className="h-8 w-5" />
          </span>
        ))}
      </div>
      <p className="font-headline mt-8 max-w-xs text-base text-nuit" role="status">
        {CITATIONS[i]}
      </p>
      {label && !/^chargement/i.test(label) && <p className="mt-3 text-sm text-nuit/90">{label}</p>}
    </main>
  );
}
