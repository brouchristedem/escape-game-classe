// Rendu minimal d'un texte libre saisi par l'organisateur : gère le
// **gras** (façon Markdown) et les retours à la ligne, sans jamais injecter
// de HTML brut (pas de dangerouslySetInnerHTML). Un mot ou groupe de mots
// entouré de ** devient en gras.
export default function RichText({ text, className }: { text: string; className?: string }) {
  const lignes = text.split("\n");

  return (
    <>
      {lignes.map((ligne, i) => (
        <p key={i} className={className}>
          {renderLigne(ligne)}
          {ligne === "" && "\u00A0"}
        </p>
      ))}
    </>
  );
}

function renderLigne(ligne: string): React.ReactNode[] {
  const parts = ligne.split(/(\*\*[^*]+\*\*)/g).filter((p) => p !== "");
  return parts.map((part, i) => {
    const m = part.match(/^\*\*([^*]+)\*\*$/);
    return m ? <strong key={i}>{m[1]}</strong> : <span key={i}>{part}</span>;
  });
}
