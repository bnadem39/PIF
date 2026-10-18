import React, { useState, useMemo } from 'react';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Search,
  Zap,
  Activity,
  Layers,
  Sparkles,
  ExternalLink
} from 'lucide-react';

export default function DynamicLeaderboard({
  marketTick,
  assetMetadata,
  selectedAsset,
  onSelectAsset,
  simulatedDate,
  currentIndex,
  totalDays,
  onQuickTrade
}) {
  const [filterCategory, setFilterCategory] = useState('ALL'); // 'ALL', 'BVMT', 'CRYPTO'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('YTD_DESC'); // 'YTD_DESC', 'YTD_ASC', 'TICKER'

  // Construction de la liste des actifs avec leurs données du tick courant
  const leaderboardData = useMemo(() => {
    if (!marketTick || !assetMetadata) return [];

    const list = Object.keys(assetMetadata).map((symbol) => {
      const meta = assetMetadata[symbol] || {};
      const tick = marketTick[symbol] || {};

      const currentPrice = tick.close != null ? tick.close : (meta.initialPrice || 0);
      const ytdReturn = tick.ytdReturn != null ? tick.ytdReturn : 0;
      const dailyChange = tick.change != null ? tick.change : 0;
      const volume = tick.volume || 0;

      return {
        symbol,
        name: meta.name || symbol,
        category: meta.category || 'BVMT',
        currency: meta.currency || 'TND',
        initialPrice: meta.initialPrice || currentPrice,
        currentPrice,
        ytdReturn,
        dailyChange,
        volume
      };
    });

    // Filtrage par catégorie et recherche
    const filtered = list.filter((item) => {
      if (filterCategory !== 'ALL' && item.category !== filterCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.symbol.toLowerCase().includes(q) || item.name.toLowerCase().includes(q);
      }
      return true;
    });

    // Tri dynamique par rendement cumulé YTD (du meilleur au pire)
    filtered.sort((a, b) => {
      if (sortBy === 'YTD_DESC') return b.ytdReturn - a.ytdReturn;
      if (sortBy === 'YTD_ASC') return a.ytdReturn - b.ytdReturn;
      return a.symbol.localeCompare(b.symbol);
    });

    return filtered;
  }, [marketTick, assetMetadata, filterCategory, searchQuery, sortBy]);

  // Trouver le rendement max et min pour normaliser la jauge visuelle
  const { maxReturn, minReturn } = useMemo(() => {
    if (leaderboardData.length === 0) return { maxReturn: 10, minReturn: -10 };
    let max = -Infinity;
    let min = Infinity;
    leaderboardData.forEach((item) => {
      if (item.ytdReturn > max) max = item.ytdReturn;
      if (item.ytdReturn < min) min = item.ytdReturn;
    });
    return {
      maxReturn: Math.max(max, 5),
      minReturn: Math.min(min, -5)
    };
  }, [leaderboardData]);

  return (
    <aside className="w-80 md:w-96 bg-[#0B0F19] border-l border-[#1E293B] flex flex-col h-full overflow-hidden select-none font-sans shrink-0">
      {/* 1. EN-TÊTE DU LEADERBOARD */}
      <div className="p-3 bg-[#0F172A] border-b border-[#1E293B] flex flex-col gap-2.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Trophy size={16} />
            </div>
            <div>
              <h2 className="text-xs font-black text-white tracking-wide uppercase flex items-center gap-1.5">
                Leaderboard Rendement YTD
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </h2>
              <p className="text-[10px] text-slate-400 font-mono">
                Simulation au : <strong className="text-sky-400">{simulatedDate || '---'}</strong>
              </p>
            </div>
          </div>

          <div className="text-right font-mono">
            <span className="text-[10px] bg-[#0284C7]/20 text-[#38BDF8] border border-[#0284C7]/40 px-2 py-0.5 rounded font-bold">
              {currentIndex + 1} / {totalDays || 0} séances
            </span>
          </div>
        </div>

        {/* Filtres de catégorie & recherche rapide */}
        <div className="flex items-center gap-1.5 pt-1">
          <div className="flex items-center bg-[#080C14] rounded-lg p-0.5 border border-[#1E293B] flex-1 text-[11px] font-mono">
            {[
              { id: 'ALL', label: 'Tous' },
              { id: 'BVMT', label: 'BVMT' },
              { id: 'CRYPTO', label: 'Crypto' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterCategory(tab.id)}
                className={`flex-1 py-1 rounded text-center font-bold transition-all ${
                  filterCategory === tab.id
                    ? 'bg-[#1E293B] text-[#38BDF8] shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-32">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Chercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#080C14] border border-[#1E293B] rounded-lg pl-7 pr-2 py-1 text-[11px] text-slate-200 placeholder-slate-500 outline-none focus:border-[#38BDF8]"
            />
          </div>
        </div>
      </div>

      {/* 2. ENTÊTE DU TABLEAU */}
      <div className="grid grid-cols-12 px-3 py-1.5 bg-[#080C14] text-[10px] font-mono font-bold text-slate-400 border-b border-[#1E293B] uppercase tracking-wider">
        <div className="col-span-2 text-center">Rang</div>
        <div className="col-span-4">Actif / Prix</div>
        <div className="col-span-4 text-right">Rendement YTD</div>
        <div className="col-span-2 text-center">Action</div>
      </div>

      {/* 3. LISTE DYNAMIQUE DES ACTIFS (AUTO-REORDER FLUIDE) */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#1E293B]/60 scrollbar-thin scrollbar-thumb-slate-800">
        {leaderboardData.length === 0 ? (
          <div className="p-8 text-center text-slate-400 font-mono text-xs flex flex-col items-center gap-2">
            <Activity size={24} className="text-slate-600 animate-pulse" />
            <span>Aucun actif ne correspond aux critères.</span>
          </div>
        ) : (
          leaderboardData.map((asset, index) => {
            const rank = index + 1;
            const isSelected = selectedAsset?.ticker === asset.symbol;
            const isPositive = asset.ytdReturn >= 0;
            const isCrypto = asset.category === 'CRYPTO';
            const precision = asset.currency === 'TND' ? 3 : 2;

            // Médaille spéciale pour le podium #1, #2, #3
            let rankBadge = (
              <span className="font-mono text-[11px] font-bold text-slate-400">
                #{rank}
              </span>
            );
            if (rank === 1) {
              rankBadge = (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 text-slate-950 font-black text-[10px] shadow-sm shadow-amber-500/30">
                  1
                </span>
              );
            } else if (rank === 2) {
              rankBadge = (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-slate-200 to-slate-400 text-slate-950 font-black text-[10px] shadow-sm">
                  2
                </span>
              );
            } else if (rank === 3) {
              rankBadge = (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-amber-100 font-black text-[10px] shadow-sm">
                  3
                </span>
              );
            }

            // Calcul du remplissage de la jauge visuelle de performance (%)
            const barWidthPercent = isPositive
              ? Math.min(100, Math.max(4, (asset.ytdReturn / (maxReturn || 1)) * 100))
              : Math.min(100, Math.max(4, (Math.abs(asset.ytdReturn) / (Math.abs(minReturn) || 1)) * 100));

            return (
              <div
                key={asset.symbol}
                onClick={() => onSelectAsset && onSelectAsset(asset)}
                className={`grid grid-cols-12 items-center px-3 py-2 transition-all duration-300 cursor-pointer group hover:bg-[#1E293B]/50 ${
                  isSelected
                    ? 'bg-[#0284C7]/15 border-l-2 border-[#38BDF8]'
                    : rank === 1
                    ? 'bg-amber-950/20'
                    : ''
                }`}
                title={`Cliquez pour analyser et trader ${asset.symbol}`}
              >
                {/* Rang */}
                <div className="col-span-2 flex items-center justify-center">
                  {rankBadge}
                </div>

                {/* Actif / Prix */}
                <div className="col-span-4 flex flex-col min-w-0 pr-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-xs text-white group-hover:text-[#38BDF8] transition-colors truncate">
                      {asset.symbol}
                    </span>
                    <span
                      className={`text-[8px] font-bold px-1 rounded uppercase tracking-wider ${
                        isCrypto
                          ? 'bg-purple-950/80 text-purple-300 border border-purple-800/60'
                          : 'bg-sky-950/80 text-sky-300 border border-sky-800/60'
                      }`}
                    >
                      {isCrypto ? 'Crypto' : 'BVMT'}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-300 font-bold truncate">
                    {asset.currentPrice.toFixed(precision)}{' '}
                    <span className="text-[9px] text-slate-400 font-normal">{asset.currency}</span>
                  </div>
                </div>

                {/* Rendement Cumulé YTD & Jauge visuelle */}
                <div className="col-span-4 flex flex-col items-end pr-1.5 font-mono">
                  {/* Badge de Rendement Cumulé YTD Fluo */}
                  <div
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-black transition-all ${
                      isPositive
                        ? 'bg-emerald-950/90 text-emerald-400 border border-emerald-600/70 shadow-sm shadow-emerald-950'
                        : 'bg-rose-950/90 text-rose-400 border border-rose-600/70 shadow-sm shadow-rose-950'
                    }`}
                  >
                    {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    <span>
                      {isPositive ? '+' : ''}
                      {asset.ytdReturn.toFixed(2)}%
                    </span>
                  </div>

                  {/* Micro-jauge proportionnelle */}
                  <div className="w-16 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden flex justify-end">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isPositive ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${barWidthPercent}%` }}
                    />
                  </div>
                </div>

                {/* Bouton d'Action Rapide "Trader" */}
                <div className="col-span-2 flex items-center justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onQuickTrade) {
                        onQuickTrade(asset);
                      } else if (onSelectAsset) {
                        onSelectAsset(asset);
                      }
                    }}
                    className="p-1 px-1.5 bg-[#0284C7]/20 hover:bg-[#0284C7] text-[#38BDF8] hover:text-white border border-[#0284C7]/50 rounded text-[10px] font-bold font-mono transition-all flex items-center gap-0.5 shadow-sm active:scale-95"
                    title={`Trader immédiatement ${asset.symbol}`}
                  >
                    <Zap size={10} />
                    <span>Trade</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. FOOTER RÉCAPITULATIF DU LEADERBOARD */}
      <div className="p-2.5 bg-[#0F172A] border-t border-[#1E293B] flex items-center justify-between text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-1 text-emerald-400 font-bold">
          <Sparkles size={12} />
          <span>Synchronisation 100% Temps Réel</span>
        </div>
        <div>{leaderboardData.length} Actifs Actifs</div>
      </div>
    </aside>
  );
}
