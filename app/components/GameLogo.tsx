"use client";

import { useLogoPersonnalise } from "@/app/components/GameTheme";

// Identité "Brume & Signal" — le logo s'appelle "la Faille" : une sphère de
// nuit fendue en deux par une fissure en éclair. Les deux moitiés glissent
// légèrement, et la lumière "signal" s'échappe par la brèche : c'est l'instant
// où l'énigme cède. La fissure est le seul élément animé en continu.
export default function GameLogo({ className = "" }: { className?: string }) {
  // Logo choisi par l'organisateur pour ce jeu (voir onglet "Apparence").
  const logoPersonnalise = useLogoPersonnalise();
  if (logoPersonnalise) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoPersonnalise} alt="Logo du jeu" className={`${className} object-contain`} />;
  }

  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label="Escape Game">
      <defs>
        <clipPath id="lf-sphere">
          <circle cx="100" cy="100" r="80" />
        </clipPath>
        <clipPath id="lf-gauche">
          <path d="M 0 0 L 122 0 L 90 52 L 116 88 L 84 122 L 108 156 L 88 200 L 0 200 Z" />
        </clipPath>
        <clipPath id="lf-droite">
          <path d="M 200 0 L 122 0 L 90 52 L 116 88 L 84 122 L 108 156 L 88 200 L 200 200 Z" />
        </clipPath>
        <linearGradient id="lf-nuit-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3a2a9a" />
          <stop offset="100%" stopColor="#1a1240" />
        </linearGradient>
        <linearGradient id="lf-nuit-b" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2b1d78" />
          <stop offset="100%" stopColor="#120a33" />
        </linearGradient>
        <radialGradient id="lf-lumiere" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e4fb7a" />
          <stop offset="100%" stopColor="#c9f31d" />
        </radialGradient>
      </defs>

      {/* halo de fuite de lumière */}
      <circle cx="100" cy="100" r="87" fill="none" stroke="#c9f31d" strokeWidth="7" opacity="0.7" className="lg-pulse" />

      {/* lumière derrière la fissure */}
      <g clipPath="url(#lf-sphere)">
        <rect x="0" y="0" width="200" height="200" fill="url(#lf-lumiere)" className="lg-crack" />
      </g>

      {/* deux moitiés décalées */}
      <g clipPath="url(#lf-sphere)">
        <g transform="translate(-7 -3)">
          <rect x="0" y="0" width="200" height="200" fill="url(#lf-nuit-a)" clipPath="url(#lf-gauche)" />
        </g>
        <g transform="translate(7 3)">
          <rect x="0" y="0" width="200" height="200" fill="url(#lf-nuit-b)" clipPath="url(#lf-droite)" />
        </g>
      </g>

      {/* anneau de cadran, fin et brisé */}
      <circle
        cx="100"
        cy="100"
        r="90"
        fill="none"
        stroke="#1a1240"
        strokeWidth="2.5"
        strokeDasharray="4 7 30 7"
        strokeLinecap="round"
      />

      {/* étincelles qui s'échappent de la brèche */}
      <g fill="#c9f31d" stroke="#1a1240" strokeWidth="1.5">
        <rect x="150" y="34" width="9" height="9" rx="2" transform="rotate(20 154 38)" />
        <rect x="163" y="60" width="6" height="6" rx="1.5" transform="rotate(-15 166 63)" />
        <circle cx="42" cy="152" r="4" />
      </g>
    </svg>
  );
}
