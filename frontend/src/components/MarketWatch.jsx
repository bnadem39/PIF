import React, { useState } from 'react';
import { Search, SlidersHorizontal, ShieldCheck, Database, Globe } from 'lucide-react';

export default function MarketWatch({ assets = [], selectedAsset, onSelectAsset, isLoading, assetSignals = {} }) {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.ticker.toLowerCase().includes(search.toLowerCase()) ||
      asset.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      filterCategory === 'ALL' || asset.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Signal XGBoost à la date simulée (calculé côté serveur) : achat ou vente au seuil de 60 %, sinon attente
  const getSignalBadge = (sig) => {
    if (!sig || sig.pBuy == null) {
      return (
        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700/60">
          IA —
        </span>
      );
    }
    if (sig.signal === 1) {
      return (
        <span title={`P(hausse) ${Math.round(sig.pBuy * 100)} %`} className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-950/90 text-emerald-400 border border-emerald-700/80">
          ACHAT {Math.round(sig.pBuy * 100)}%
        </span>
      );
    }
    if (sig.signal === -1) {
      return (
        <span title={`P(baisse) ${Math.round(sig.pSell * 100)} %`} className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-950/90 text-rose-400 border border-rose-700/80">
          VENTE {Math.round(sig.pSell * 100)}%
        </span>
      );
    }
    return (
      <span
        title={`P(hausse) ${Math.round(sig.pBuy * 100)} % · P(baisse) ${Math.round(sig.pSell * 100)} % : sous le seuil de 60 %`}
        className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700/50"
      >
        ATTENTE
      </span>
    );
  };

  const categories = [
    { id: 'ALL', label: 'Tous' },
    { id: 'BVMT', label: 'BVMT' },
    { id: 'CRYPTO', label: 'Crypto' },
    ...(assets.some((a) => a.category === 'US_EQUITY') ? [{ id: 'US_EQUITY', label: 'US' }] : [])
  ];

  return (
    <aside className="w-80 bg-[#0F172A] border-r border-[#1E293B] flex flex-col h-full select-none">
      {/* En-tête et Recherche */}
      <div className="p-3 border-b border-[#1E293B]">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
            <SlidersHorizontal size={14} className="text-[#38BDF8]" />
            WATCHLIST / COTATIONS
          </h2>
          <span className="text-[11px] font-mono text-slate-300 bg-[#1E293B] border border-[#334155] px-2 py-0.5 rounded font-medium">
            {filteredAssets.length} actifs
          </span>
        </div>

        {/* Barre de recherche */}
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher (ex : BIAT, SFBT, BTC)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1E293B] border border-[#334155] rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#38BDF8] transition-colors"
          />
        </div>

        {/* Filtres par classe d'actifs */}
        <div className="grid gap-1 mt-2" style={{ gridTemplateColumns: `repeat(${categories.length}, minmax(0, 1fr))` }}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`text-[10px] py-1 font-medium rounded transition-colors text-center ${
                filterCategory === cat.id
                  ? 'bg-[#38BDF8] text-slate-900 font-semibold'
                  : 'bg-[#1E293B] text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Liste des actifs */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#1E293B]">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-[#38BDF8] border-t-transparent rounded-full animate-spin" />
            <span>Chargement des cotations Spring Boot...</span>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Aucun titre trouvé.
          </div>
        ) : (
          filteredAssets.map((asset) => {
            const isSelected = selectedAsset && selectedAsset.ticker === asset.ticker;
            const signalData = assetSignals[asset.ticker];
            // Cours, variation et volume de la dernière séance connue à la date simulée (sinon, dernières valeurs du fichier)
            const pricesLoading = Object.keys(assetSignals).length === 0;
            const notListed = !signalData && !pricesLoading;
            const price = signalData ? signalData.close : asset.price;
            const changePct = signalData?.changePct != null ? signalData.changePct * 100 : asset.change24h;
            const isPositive = changePct >= 0;

            return (
              <div
                key={asset.ticker}
                onClick={() => onSelectAsset(asset)}
                className={`p-2.5 cursor-pointer transition-all flex items-center justify-between hover:bg-[#1E293B]/80 ${
                  isSelected ? 'bg-[#1E293B] border-l-2 border-[#38BDF8]' : 'border-l-2 border-transparent'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-xs text-[#F8FAFC] tracking-wide">
                      {asset.ticker}
                    </span>
                    {getSignalBadge(signalData)}
                    {asset.ticker === 'WIFAK' && (
                      <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[9px] px-1 py-0.2 rounded font-semibold flex items-center gap-0.5">
                        <ShieldCheck size={10} /> Islamique
                      </span>
                    )}
                    {asset.category === 'CRYPTO' && (
                      <span className="bg-amber-950 text-amber-400 border border-amber-800 text-[9px] px-1 py-0.2 rounded font-semibold">
                        Crypto
                      </span>
                    )}
                    {asset.category === 'US_EQUITY' && (
                      <span className="bg-sky-950 text-sky-400 border border-sky-800 text-[9px] px-1 py-0.2 rounded font-semibold">
                        US
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate max-w-[140px] mt-0.5" title={asset.name}>
                    {asset.name}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                    {signalData ? `Vol : ${Math.round(signalData.volume).toLocaleString('fr-FR')} · ${signalData.date}` : pricesLoading ? 'Vol : …' : 'Vol : -'}
                  </div>
                </div>

                {pricesLoading ? (
                  <div className="text-right shrink-0 space-y-1">
                    <div className="h-3 w-16 rounded bg-[#1E293B] animate-pulse ml-auto" />
                    <div className="h-3 w-10 rounded bg-[#1E293B] animate-pulse ml-auto" />
                  </div>
                ) : notListed ? (
                  <div className="text-right shrink-0 text-[10px] text-slate-500">Pas encore coté<br />à cette date</div>
                ) : (
                <div className="text-right shrink-0">
                  <div className="font-mono text-xs font-semibold text-slate-100">
                    {Number(price).toLocaleString(undefined, {
                      minimumFractionDigits: asset.currency === 'TND' ? 3 : 2,
                      maximumFractionDigits: asset.currency === 'TND' ? 3 : 2
                    })}{' '}
                    <span className="text-[10px] text-slate-400">{asset.currency}</span>
                  </div>
                  <div
                    className={`inline-block font-mono text-[11px] px-1.5 py-0.5 rounded font-semibold mt-0.5 ${
                      isPositive
                        ? 'bg-emerald-950/80 text-[#10B981] border border-emerald-800/50'
                        : 'bg-rose-950/80 text-[#EF4444] border border-rose-800/50'
                    }`}
                  >
                    {isPositive ? '+' : ''}{Number(changePct).toFixed(2)}%
                  </div>
                </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
