// Identité visuelle du jeu : un cadran de coffre-fort/serrure à combinaison,
// avec un trou de serrure d'où s'échappe la lumière. Seul élément animé de
// façon continue (mais discrète) sur les écrans de jeu — le reste de
// l'interface reste calme, conformément au principe "un seul moment fort".
export default function GameLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      role="img"
      aria-label="Escape Game"
    >
      <defs>
        <radialGradient id="gl-ink-bg" cx="50%" cy="42%" r="65%">
          <stop offset="0%" stopColor="#1b2a4c" />
          <stop offset="100%" stopColor="#0d1526" />
        </radialGradient>
        <linearGradient id="gl-brass-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e9cd85" />
          <stop offset="100%" stopColor="#a97e2e" />
        </linearGradient>
        <radialGradient id="gl-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f2d99a" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#f2d99a" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="100" cy="100" r="98" fill="url(#gl-ink-bg)" />

      <circle cx="100" cy="100" r="90" fill="none" stroke="url(#gl-brass-grad)" strokeWidth="3" />
      <circle cx="100" cy="100" r="79" fill="none" stroke="#c9a24d" strokeWidth="1" opacity="0.55" />

      <g stroke="#c9a24d" strokeWidth="2.5" strokeLinecap="round" opacity="0.9">
        <line x1="100" y1="11" x2="100" y2="23" />
        <line x1="100" y1="177" x2="100" y2="189" />
        <line x1="11" y1="100" x2="23" y2="100" />
        <line x1="177" y1="100" x2="189" y2="100" />
        <line x1="35" y1="35" x2="43" y2="43" />
        <line x1="165" y1="35" x2="157" y2="43" />
        <line x1="35" y1="165" x2="43" y2="157" />
        <line x1="165" y1="165" x2="157" y2="157" />
      </g>

      <circle cx="100" cy="92" r="34" fill="url(#gl-glow)" className="gl-seal-glow" />

      <g fill="#f2d99a">
        <path d="M 114 84 L 152 60 L 146 66 L 118 92 Z" className="gl-beam gl-beam-1" />
        <path d="M 118 96 L 160 90 L 158 96 L 120 100 Z" className="gl-beam gl-beam-2" />
        <path d="M 113 106 L 145 118 L 141 123 L 116 112 Z" className="gl-beam gl-beam-3" />
      </g>

      <circle cx="100" cy="88" r="17" fill="#0d1526" />
      <path d="M 89 99 L 111 99 L 104 132 L 96 132 Z" fill="#0d1526" />
    </svg>
  );
}
