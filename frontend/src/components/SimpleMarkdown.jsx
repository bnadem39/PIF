import React from 'react';

/**
 * Rendu minimal de Markdown pour les textes générés par l'IA : titres (#), gras (**), listes (- ou *, 1.) et paragraphes.
 * Aucun HTML brut n'est injecté : tout passe par des éléments React, le texte reste donc échappé.
 */
function inline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4
      ? <strong key={i} className="font-bold text-slate-100">{part.slice(2, -2)}</strong>
      : <React.Fragment key={i}>{part.replace(/\*\*/g, '')}</React.Fragment>
  );
}

export default function SimpleMarkdown({ text, className = '' }) {
  if (!text) return null;
  const lines = String(text).replace(/\r/g, '').split('\n');
  const blocks = [];
  let list = null;

  const flushList = () => {
    if (list) { blocks.push(list); list = null; }
  };

  lines.forEach((raw) => {
    // Un titre peut être encadré par des ### des deux côtés (« ### Titre ### ») : on retire les marqueurs
    const line = raw.trim().replace(/^#{1,6}\s*/, (m) => (m ? '#' : '')).replace(/\s*#{2,}$/, '');
    if (!raw.trim() || /^#+$/.test(line)) { flushList(); return; }
    if (line.startsWith('#')) {
      flushList();
      const heading = line.replace(/^#+\s*/, '');
      // Une longue phrase précédée de ### reste un paragraphe : seuls les textes courts sont des titres
      blocks.push({ type: heading.length > 90 ? 'p' : 'h', text: heading });
      return;
    }
    const item = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (item) {
      if (!list) list = { type: 'ul', items: [] };
      list.items.push(item[1]);
      return;
    }
    flushList();
    blocks.push({ type: 'p', text: line.replace(/\s*#{2,}$/, '') });
  });
  flushList();

  return (
    <div className={`space-y-1.5 ${className}`}>
      {blocks.map((b, i) => {
        if (b.type === 'h') return <div key={i} className="text-xs font-bold text-slate-100 pt-0.5">{inline(b.text)}</div>;
        if (b.type === 'ul') {
          return (
            <ul key={i} className="list-disc pl-4 space-y-0.5">
              {b.items.map((it, j) => <li key={j}>{inline(it)}</li>)}
            </ul>
          );
        }
        return <p key={i}>{inline(b.text)}</p>;
      })}
    </div>
  );
}
