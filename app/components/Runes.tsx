// Rangée de runes gravées, purement décorative (elle n'est pas lue par les
// lecteurs d'écran). Chaque rune est un petit tracé, pas un caractère
// Unicode : elles s'affichent donc identiquement sur tous les téléphones.
const TRACES: Record<string, string> = {
  fe: "M0 -5V5M0 -2L4 -6M0 1L4 -3",
  u: "M-3 -5V5M-3 -5L3 0V5",
  th: "M-1 -5V5M-1 -3L4 0L-1 3",
  r: "M-2 -5V5M-2 -5L3 -2L-2 1M-2 1L3 5",
  k: "M3 -5L-3 0L3 5",
  g: "M-3 -5L3 5M3 -5L-3 5",
  w: "M-2 -5V5M-2 -5L3 -2L-2 1",
  i: "M0 -5V5",
  a: "M-2 -5V5M-2 -5L3 -2M-2 0L3 3",
  s: "M2 -5L-2 -1L2 1L-2 5",
};

const SEQUENCE_PAR_DEFAUT = ["fe", "u", "th", "a", "r", "k", "g", "w", "i", "s"];

export default function Runes({
  className = "",
  sequence = SEQUENCE_PAR_DEFAUT,
}: {
  className?: string;
  sequence?: string[];
}) {
  const pas = 14;
  const largeur = sequence.length * pas;
  return (
    <svg
      viewBox={`0 0 ${largeur} 14`}
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {sequence.map((k, i) => (
        <path key={i} d={TRACES[k] ?? TRACES.i} transform={`translate(${i * pas + pas / 2} 7)`} />
      ))}
    </svg>
  );
}
