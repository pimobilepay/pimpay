import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Rendu markdown minimal pour les bulles de chat (Elara / Support).
// Gère uniquement **gras** et [texte](url) — suffisant pour les réponses
// d'Elara (chemins de menu en gras, lien WhatsApp cliquable). Le numéro de
// téléphone brut n'apparaît jamais : seul le texte du lien est visible.
// ---------------------------------------------------------------------------
const INLINE_MD_RE = /\*\*(.+?)\*\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

export function renderChatText(content: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  INLINE_MD_RE.lastIndex = 0;
  while ((match = INLINE_MD_RE.exec(content)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(content.slice(lastIndex, match.index));
    }

    if (match[1] !== undefined) {
      // **texte en gras**
      nodes.push(
        <strong key={`b${key++}`} className="font-bold">
          {match[1]}
        </strong>
      );
    } else if (match[2] !== undefined && match[3] !== undefined) {
      // [texte](url) — le libellé est affiché, jamais l'URL brute.
      nodes.push(
        <a
          key={`a${key++}`}
          href={match[3]}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-emerald-400 underline underline-offset-2 decoration-emerald-400/50 hover:text-emerald-300"
        >
          {match[2]}
        </a>
      );
    }

    lastIndex = INLINE_MD_RE.lastIndex;
  }

  if (lastIndex < content.length) {
    nodes.push(content.slice(lastIndex));
  }

  return nodes;
}
