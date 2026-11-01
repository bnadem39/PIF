import React from 'react';

/**
 * En-tête de page partagé : icône + titre, phrase d'explication, zone optionnelle à droite
 * (boutons d'action, badge d'information...). Composant d'affichage pur, aucune logique.
 */
export default function PageHeader({ icon: Icon, title, subtitle, right }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={20} className="text-[#38BDF8] shrink-0" />}
        <div>
          <h1 className="text-xl font-bold text-slate-100">{title}</h1>
          {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {right && <div className="flex items-center gap-2.5 shrink-0">{right}</div>}
    </div>
  );
}
