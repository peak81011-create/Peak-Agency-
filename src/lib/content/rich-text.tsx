import type { ReactNode } from "react";

// Rendu volontairement minimal et sûr (aucun HTML interprété) pour les textes
// saisis par l'admin : « ## Titre », listes « - élément », paragraphes.
export function RichText({ text }: { text: string }) {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="flex max-w-[720px] flex-col gap-4 text-base leading-relaxed text-muted-foreground">
      {blocks.map((block, i) => renderBlock(block, i))}
    </div>
  );
}

function renderBlock(block: string, key: number): ReactNode {
  if (block.startsWith("## ")) {
    return (
      <h2 key={key} className="mt-6 font-display text-[22px] font-bold text-foreground [font-stretch:108%]">
        {block.slice(3)}
      </h2>
    );
  }
  const lines = block.split("\n");
  if (lines.every((l) => l.startsWith("- "))) {
    return (
      <ul key={key} className="flex list-disc flex-col gap-1.5 pl-5">
        {lines.map((l, j) => (
          <li key={j}>{l.slice(2)}</li>
        ))}
      </ul>
    );
  }
  return (
    <p key={key} className="whitespace-pre-line">
      {block}
    </p>
  );
}
