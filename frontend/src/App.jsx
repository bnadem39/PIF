import React, { useState, useEffect } from 'react';
import { Terminal, Shield, BarChart2, Cpu, FileText, UserCircle, Globe, FileSpreadsheet } from 'lucide-react';
import TickerTape from './components/TickerTape';
import MarketWatch from './components/MarketWatch';
import TradingChart from './components/TradingChart';
import OrderBookTape from './components/OrderBookTape';
import QuickOrderWidget from './components/QuickOrderWidget';
import AccountSummaryFooter from './components/AccountSummaryFooter';
import CsvDataInspectorModal from './components/CsvDataInspectorModal';
import { getRealSymbols } from './services/realMarketService';

export default function App() {
  const [assets, setAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [isCsvInspectorOpen, setIsCsvInspectorOpen] = useState(false);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);

  const [cashBalance, setCashBalance] = useState(100000.00); // 100 000 TND de capital initial virtuel
  const [portfolioValue, setPortfolioValue] = useState(128450.00);
  const [dailyPnL, setDailyPnL] = useState(2450.00);
  const [dailyPnLPercent, setDailyPnLPercent] = useState(1.94);
  const [activeNav, setActiveNav] = useState('TRADING');

  // Chargement des instruments via Spring Boot
  useEffect(() => {
    setIsLoadingAssets(true);
    getRealSymbols('ALL')
      .then((data) => {
        setAssets(data);
        setIsLoadingAssets(false);
        // Sélection par défaut : IBM ou AAPL ou BIAT
        const defaultAsset = data.find((a) => a.ticker === 'IBM') || data.find((a) => a.ticker === 'AAPL') || data[0];
        setSelectedAsset(defaultAsset);
      })
      .catch((err) => {
        console.error('Erreur chargement symboles réels:', err);
        setIsLoadingAssets(false);
      });
  }, []);

  const handleExecuteOrder = (order) => {
    if (order.side === 'BUY') {
      setCashBalance((prev) => Math.max(0, prev - order.total));
      setPortfolioValue((prev) => prev + (order.total * 0.005));
    } else {
      setCashBalance((prev) => prev + order.total);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0B0F19] text-[#F8FAFC] overflow-hidden">
      {/* 1. BARRE DE NAVIGATION SUPÉRIEURE */}
      <header className="h-12 bg-[#0F172A] border-b border-[#1E293B] px-4 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/30 px-2.5 py-1 rounded">
            <Terminal size={18} />
            <span className="font-extrabold tracking-wider text-sm">PIF MARKET SIMULATOR</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-950/80 border border-emerald-800/50 px-2 py-0.5 rounded font-mono">
            <Globe size={11} /> Spring Boot 3 + Alpha Vantage API
          </div>
        </div>

        <nav className="flex items-center gap-1">
          {[
            { id: 'TRADING', label: 'Trading & Marché', icon: BarChart2 },
            { id: 'STRESS', label: 'AI Stress Testing', icon: Shield },
            { id: 'ACTUARIAT', label: 'Actuariat & Risque', icon: FileText },
            { id: 'XAI', label: 'Explicabilité (XAI)', icon: Cpu },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#1E293B] text-[#38BDF8] border border-[#334155]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]/50'
                }`}
              >
                <Icon size={14} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {/* Bouton d'accès direct au Visualiseur de Données CSV */}
          <button
            onClick={() => setIsCsvInspectorOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0284C7]/20 hover:bg-[#0284C7]/30 text-[#38BDF8] border border-[#0284C7]/50 transition-all shadow-sm"
            title="Consulter et filtrer l'intégralité des 4 fichiers CSV (BVMT, BNB, BTC, ETH)"
          >
            <FileSpreadsheet size={15} />
            <span className="hidden sm:inline">Visualiseur Données CSV</span>
            <span className="bg-[#0284C7] text-white text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
              4 Fichiers
            </span>
          </button>

          <div className="flex items-center gap-2 bg-[#1E293B] border border-[#334155] px-2.5 py-1 rounded">
            <UserCircle size={16} className="text-[#38BDF8]" />
            <div className="text-left font-mono">
              <div className="text-[11px] font-bold text-slate-200">Trader_Senior</div>
              <div className="text-[9px] text-[#10B981] font-semibold">ROLE_TRADER_PRO</div>
            </div>
          </div>
        </div>
      </header>

      {/* 2. BANDEAU DE TICKER TAPE DÉFILANT */}
      <TickerTape />

      {/* 3. CORPS DU DASHBOARD PRINCIPAL */}
      <main className="flex-1 flex overflow-hidden">
        <MarketWatch
          assets={assets}
          selectedAsset={selectedAsset}
          onSelectAsset={(asset) => {
            setSelectedAsset(asset);
          }}
          isLoading={isLoadingAssets}
        />

        <section className="flex-1 flex flex-col min-w-0 border-r border-[#1E293B]">
          {selectedAsset ? (
            <>
              <TradingChart
                selectedAsset={selectedAsset}
                selectedYear={selectedYear}
                onSelectYear={setSelectedYear}
                onOpenCsvInspector={() => setIsCsvInspectorOpen(true)}
              />
              <QuickOrderWidget
                selectedAsset={selectedAsset}
                cashBalance={cashBalance}
                onExecuteOrder={handleExecuteOrder}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 font-mono text-xs">
              Chargement de l'actif sélectionné...
            </div>
          )}
        </section>

        {selectedAsset && <OrderBookTape selectedAsset={selectedAsset} />}
      </main>

      {/* 4. FOOTER RÉSUMÉ DE COMPTE ET STATUT BROKER */}
      <AccountSummaryFooter
        cashBalance={cashBalance}
        portfolioValue={portfolioValue}
        dailyPnL={dailyPnL}
        dailyPnLPercent={dailyPnLPercent}
      />

      {/* 5. MODAL DE VISUALISATION DÉTAILLÉE DES FICHIERS CSV */}
      <CsvDataInspectorModal
        isOpen={isCsvInspectorOpen}
        onClose={() => setIsCsvInspectorOpen(false)}
        initialAsset={selectedAsset}
        initialYear={selectedYear}
        assets={assets}
        onSelectAssetAndYear={(asset, year) => {
          setSelectedAsset(asset);
          setSelectedYear(year);
        }}
      />
    </div>
  );
}
