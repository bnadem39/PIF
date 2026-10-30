import React from 'react';
import { Construction } from 'lucide-react';

/**
 * Page d'attente pour un module du cahier des charges pas encore développé.
 * Remplacer par le vrai composant quand le module est prêt.
 */
export default function ModulePlaceholder({ title, section, items = [] }) {
  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto bg-[#0F172A] border border-[#1E293B] rounded-xl p-6">
        <div className="flex items-center gap-2 text-amber-400 mb-2">
          <Construction size={18} />
          <span className="text-xs font-bold uppercase tracking-wider">Module en construction</span>
        </div>
        <h1 className="text-xl font-extrabold text-slate-100">{title}</h1>
        {section && <p className="text-xs text-slate-500 mt-1">Cahier des charges, {section}</p>}
        {items.length > 0 && (
          <ul className="mt-4 space-y-1.5 text-sm text-slate-300 list-disc pl-5">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
