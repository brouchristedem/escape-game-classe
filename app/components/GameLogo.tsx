"use client";

import Image from "next/image";
import { useLogoPersonnalise } from "@/app/components/GameTheme";

// Identité "Le Gardien" — le médaillon est tiré de la photo du personnage :
// la silhouette à capuche sans visage devant ses écrans, dans un anneau d'acier
// à runes serties d'or. Par moments, deux yeux s'allument dans le vide de la
// capuche (voir .lg-yeux dans globals.css).
export default function GameLogo({ className = "" }: { className?: string }) {
  // Logo choisi par l'organisateur pour ce jeu (voir onglet "Apparence").
  const logoPersonnalise = useLogoPersonnalise();
  if (logoPersonnalise) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoPersonnalise} alt="Logo du jeu" className={`${className} object-contain`} />;
  }

  return (
    <div className={`relative aspect-square ${className}`} role="img" aria-label="Escape Game">
      <Image
        src="/brand/gardien-medaillon.webp"
        alt=""
        fill
        priority
        sizes="(max-width: 640px) 120px, 160px"
        className="object-contain"
      />
      <svg viewBox="0 0 100 100" className="lg-yeux pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <filter id="lg-flou" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="1.1" />
          </filter>
        </defs>
        <g fill="#7fcaff" filter="url(#lg-flou)">
          <path d="M43.2 43.9L49 45.7L43.8 46.7Z" />
          <path d="M56.8 43.9L51 45.7L56.2 46.7Z" />
        </g>
        <g fill="#eaf8ff">
          <path d="M44.2 44.6L48.6 45.8L44.6 46.3Z" />
          <path d="M55.8 44.6L51.4 45.8L55.4 46.3Z" />
        </g>
      </svg>
    </div>
  );
}
