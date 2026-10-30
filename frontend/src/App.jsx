import React, { useState, useEffect, useCallback } from 'react';
import {
  Terminal,
  Shield,
  BarChart2,
  PieChart,
  FileSpreadsheet,
  UserCircle,
  Globe,
  LogOut,
  LogIn,
  UserPlus,
  Trophy,
  Layers,
  Sparkles,
  BrainCircuit,
  History,
  GraduationCap,
  Landmark,
  Umbrella,
  ShieldCheck
} from 'lucide-react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import ModulePlaceholder from './pages/ModulePlaceholder';
import AdminAuditPage from './pages/AdminAuditPage';
import TickerTape from './components/TickerTape';
import MarketWatch from './components/MarketWatch';
import TradingChart from './components/TradingChart';
import DynamicLeaderboard from './components/DynamicLeaderboard';
import OrderBookTape from './components/OrderBookTape';
import QuickOrderWidget from './components/QuickOrderWidget';
import AccountSummaryFooter from './components/AccountSummaryFooter';
import CsvDataInspectorModal from './components/CsvDataInspectorModal';
import PortfolioAnalyticsView from './components/PortfolioAnalyticsView';
import AuthModal from './components/AuthModal';
import AiCopilotWidget from './components/AiCopilotWidget';
import { getAiAgentAnalysis, getAiSignal } from './services/aiService';
import {
  getRealSymbols,
  getPortfolioSummary,
  getCurrentUser,
  logoutUser,
  checkRiskOrders
} from './services/realMarketService';

// Onglets principaux : une route par module du cahier des charges
const NAV_ITEMS = [
  { path: '/', label: 'Terminal Time-Lapse', icon: BarChart2 },
  { path: '/portfolio', label: 'Portefeuille & Risque', icon: PieChart },
  { path: '/backtest', label: 'Backtesting', icon: History },
  { path: '/learn', label: 'Formation', icon: GraduationCap },
  { path: '/stress-test', label: 'Stress Testing', icon: Landmark },
  { path: '/actuarial', label: 'Actuariat', icon: Umbrella },
  { path: '/admin/audit', label: 'Audit', icon: ShieldCheck, adminOnly: true }
];

// Modules à venir (voir le plan d'audit) : remplacer chaque entrée par sa vraie page
const PLACEHOLDER_MODULES = [
  {
    path: '/backtest',
    title: 'Backtesting & comparaison de stratégies',
    section: '§3.2 Analyse financière',
    items: ['Définition de stratégies (SMA, RSI, signal IA, buy-and-hold)', 'Rejeu sur données historiques', 'Comparaison des performances']
  },
  {
    path: '/learn',
    title: 'Formation & apprentissage',
    section: '§3.3',
    items: ['Modules de cours par classe d\'actifs', 'Quiz et exercices', 'Scénarios de marché, concours, suivi de progression']
  },
  {
    path: '/stress-test',
    title: 'AI Stress Testing bancaire',
    section: '§3.5 et §3.6',
    items: ['Scénarios de stress (taux, marchés, défauts, récession)', 'Banques conventionnelles vs islamiques', 'Explications XAI (SHAP)']
  },
  {
    path: '/actuarial',
    title: 'Module d\'actuariat',
    section: '§3.7',
    items: ['Tarification (GLM fréquence / sévérité)', 'Marges de prime', 'Provisionnement (Chain Ladder)']
  }
];

export default function App() {
  const [assets, setAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedYear, setSelectedYear] = useState('2022');
  const [isCsvInspectorOpen, setIsCsvInspectorOpen] = useState(false);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);

  // Authentification & Utilisateur actif
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('LOGIN'); // 'LOGIN' ou 'REGISTER'

  // Données financières du compte (PostgreSQL / BigDecimal)
  const [cashBalance, setCashBalance] = useState(100000.00);
  const [portfolioValue, setPortfolioValue] = useState(100000.00);
  const [dailyPnL, setDailyPnL] = useState(0.00);
  const [dailyPnLPercent, setDailyPnLPercent] = useState(0.00);
  const [userPositions, setUserPositions] = useState([]);

  // État de simulation Time-Lapse Multi-Actifs Synchronisé
  const [simulatedDate, setSimulatedDate] = useState('2022-01-03');
  const [currentSimulatedPrice, setCurrentSimulatedPrice] = useState(null);
  const [currentMarketTick, setCurrentMarketTick] = useState({});
  const [assetMetadata, setAssetMetadata] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalDays, setTotalDays] = useState(0);
  const [isSimulationPlaying, setIsSimulationPlaying] = useState(false);

  // Volet Droit : 'LEADERBOARD', 'ORDERBOOK' ou 'COPILOT'
  const [rightPanelView, setRightPanelView] = useState('COPILOT');
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiSignal, setAiSignal] = useState(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [assetSignals, setAssetSignals] = useState({});

  // Navigation principale
  // Navigation principale : l'onglet actif est dérivé de l'URL (React Router)
  const location = useLocation();
  const navigate = useNavigate();

  // 1. Initialisation & Rafraîchissement du Portefeuille
  const refreshPortfolio = useCallback(async (dateToUse = simulatedDate, symbolToUse = selectedAsset?.ticker, priceToUse = currentSimulatedPrice) => {
    try {
      if (!getCurrentUser()) return;
      const summary = await getPortfolioSummary(dateToUse);
      if (summary) {
        setCashBalance(summary.cashBalance != null ? Number(summary.cashBalance) : 100000);
        setPortfolioValue(summary.totalPortfolioValue != null ? Number(summary.totalPortfolioValue) : 100000);
        setDailyPnL(summary.totalUnrealizedPnl != null ? Number(summary.totalUnrealizedPnl) : 0);
        setDailyPnLPercent(summary.totalUnrealizedPnlPercent != null ? Number(summary.totalUnrealizedPnlPercent) : 0);
        setUserPositions(summary.positions || []);
      }
    } catch (err) {
      console.warn('Erreur synchronisation portefeuille:', err);
    }
  }, [simulatedDate, selectedAsset, currentSimulatedPrice]);

  useEffect(() => {
    setIsLoadingAssets(true);
    // Les données de marché sont publiques ; le portefeuille exige une connexion explicite
    if (!getCurrentUser()) {
      setAuthModalMode('LOGIN');
      setIsAuthModalOpen(true);
    }
    getRealSymbols('ALL')
      .then((data) => {
        setAssets(data);
        setIsLoadingAssets(false);
        const defaultAsset = data.find((a) => a.ticker === 'BIAT') ||
          data.find((a) => a.ticker === 'SFBT') ||
          data.find((a) => a.ticker === 'BNB-USD') ||
          data[0];
        setSelectedAsset(defaultAsset);
        if (defaultAsset) {
          setCurrentSimulatedPrice(defaultAsset.price);
        }
        return refreshPortfolio();
      })
      .catch((err) => {
        console.error('Erreur initialisation instruments:', err);
        setIsLoadingAssets(false);
      });
  }, []);

  // Déconnexion
  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setAuthModalMode('LOGIN');
    setIsAuthModalOpen(true);
  };

  // Après connexion ou inscription réussie
  const handleAuthSuccess = (userData) => {
    const updated = getCurrentUser();
    setCurrentUser(updated);
    setIsAuthModalOpen(false);
    refreshPortfolio();
  };

  // Callback de mise à jour du moteur Time-Lapse Multi-Actifs
  const handleSimulationUpdate = useCallback((simState) => {
    if (simState.simulatedDate) setSimulatedDate(simState.simulatedDate);
    if (simState.currentIndex != null) setCurrentIndex(simState.currentIndex);
    if (simState.totalDays != null) setTotalDays(simState.totalDays);
    if (simState.isPlaying != null) setIsSimulationPlaying(simState.isPlaying);

    if (simState.marketTick) setCurrentMarketTick(simState.marketTick);
    if (simState.assetMetadata) setAssetMetadata(simState.assetMetadata);

    const activeSym = selectedAsset?.ticker;
    const currentPrice = simState.marketTick && activeSym && simState.marketTick[activeSym]
      ? simState.marketTick[activeSym].close
      : simState.currentPrice;

    if (currentPrice != null) {
      setCurrentSimulatedPrice(currentPrice);
    }

    // Synchronisation en direct du P&L du trader avec les cours synchronisés qui avancent
    if (userPositions && userPositions.length > 0 && simState.marketTick) {
      let positionsValuation = 0;
      let latentPnl = 0;

      const updated = userPositions.map((pos) => {
        const sym = pos.symbol?.toUpperCase();
        const tick = simState.marketTick[sym];
        const livePrice = tick?.close != null ? tick.close : (pos.currentPrice || pos.averageCostPrice);
        const mktVal = livePrice * pos.quantity;
        const cost = pos.averageCostPrice * pos.quantity;
        const pnl = mktVal - cost;
        const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;

        positionsValuation += mktVal;
        latentPnl += pnl;

        return {
          ...pos,
          currentPrice: livePrice,
          marketValue: mktVal,
          unrealizedPnl: pnl,
          unrealizedPnlPercent: pnlPct
        };
      });

      setUserPositions(updated);
      setPortfolioValue(cashBalance + positionsValuation);
      setDailyPnL(latentPnl);
      setDailyPnLPercent(cashBalance > 0 ? (latentPnl / (cashBalance + positionsValuation)) * 100 : 0);

      // Contrôle continu des déclencheurs Stop-Loss, Take-Profit et Trailing Stop (OCO)
      if (simState.simulatedDate && getCurrentUser()) {
        checkRiskOrders(simState.simulatedDate).then((triggered) => {
          if (triggered && triggered.length > 0) {
            refreshPortfolio(simState.simulatedDate, activeSym, currentPrice);
          }
        }).catch(() => {});
      }
    }
  }, [selectedAsset, userPositions, cashBalance, refreshPortfolio]);

  // Synchronisation asynchrone de l'analyse FinGPT & RAG (Uniquement au changement d'actif ou demande explicite, PAS sur chaque tick)
  const triggerAssetAnalysis = useCallback((assetToAnalyze = selectedAsset) => {
    if (!assetToAnalyze) return;

    setIsLoadingAi(true);
    const price = currentSimulatedPrice || assetToAnalyze.price || 100.0;
    const payload = {
      ticker: assetToAnalyze.ticker,
      simulation_date: simulatedDate,
      open: price,
      high: price * 1.01,
      low: price * 0.99,
      close: price,
      volume: 1250000,
      sma_20: price * 0.98,
      sma_50: price * 0.95,
      rsi_14: 61.5,
      macd: 1.25,
      macd_signal: 0.85,
      macd_hist: 0.40,
      volatility_30d: 38.5,
      bank_type: 'conventional',
      sentiment_score: 0.35,
      confidence_threshold: 0.60
    };

    getAiAgentAnalysis(payload)
      .then((data) => {
        setAiAnalysis(data);
        setIsLoadingAi(false);
      })
      .catch(() => {
        setIsLoadingAi(false);
      });
  }, [selectedAsset?.ticker, currentSimulatedPrice, simulatedDate]);

  // Déclenché uniquement lors du changement effectif d'actif sélectionné
  useEffect(() => {
    if (!selectedAsset) return;
    triggerAssetAnalysis(selectedAsset);
  }, [selectedAsset?.ticker]);

  // Calcul dynamique des signaux IA (XGBoost 3-classes) pour les actifs de la Watchlist
  useEffect(() => {
    if (!assets || assets.length === 0) return;

    let isMounted = true;
    const sampleAssets = assets.slice(0, 20); // Priorité aux 20 premiers actifs affichés

    sampleAssets.forEach((asset) => {
      const price = currentMarketTick && currentMarketTick[asset.ticker]
        ? currentMarketTick[asset.ticker].close
        : asset.price || 100.0;

      const features = {
        open: price,
        high: price * 1.01,
        low: price * 0.99,
        close: price,
        volume: asset.volume24h ? Number(String(asset.volume24h).replace(/,/g, '')) || 50000 : 50000,
        sma_20: price * 0.98,
        sma_50: price * 0.96,
        rsi_14: 55.0,
        macd: 0.5,
        macd_signal: 0.3,
        macd_hist: 0.2,
        volatility_30d: 20.0
      };

      getAiSignal(asset.ticker, features)
        .then((sig) => {
          if (isMounted && sig) {
            setAssetSignals((prev) => ({
              ...prev,
              [asset.ticker]: sig
            }));
          }
        })
        .catch(() => {});
    });

    return () => {
      isMounted = false;
    };
  }, [assets, simulatedDate]);

  // Sélection d'actif depuis le Leaderboard ou la Watchlist
  const handleSelectAsset = useCallback((assetItem) => {
    const sym = assetItem.symbol || assetItem.ticker;
    const existing = assets.find((a) => a.ticker === sym);
    if (existing) {
      setSelectedAsset(existing);
      if (currentMarketTick && currentMarketTick[sym]) {
        setCurrentSimulatedPrice(currentMarketTick[sym].close);
      } else {
        setCurrentSimulatedPrice(existing.price);
      }
    } else {
      const newAsset = {
        ticker: sym,
        name: assetItem.name || sym,
        category: assetItem.category || 'BVMT',
        currency: assetItem.currency || 'TND',
        price: assetItem.currentPrice || assetItem.price || 0
      };
      setSelectedAsset(newAsset);
      setCurrentSimulatedPrice(newAsset.price);
    }
  }, [assets, currentMarketTick]);

  // Callback après exécution d'un ordre de trading
  const handleOrderExecuted = useCallback((executionResult) => {
    refreshPortfolio(simulatedDate, selectedAsset?.ticker, currentSimulatedPrice);
  }, [simulatedDate, selectedAsset, currentSimulatedPrice, refreshPortfolio]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#080C14] text-[#F8FAFC] overflow-hidden font-sans">
      {/* 1. BARRE DE NAVIGATION SUPÉRIEURE */}
      <header className="h-12 bg-[#0F172A] border-b border-[#1E293B] px-4 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#0284C7]/20 text-[#38BDF8] border border-[#0284C7]/40 px-2.5 py-1 rounded-lg">
            <Terminal size={17} />
            <span className="font-extrabold tracking-wider text-sm whitespace-nowrap">PIF MARKET TIME-LAPSE</span>
          </div>
          <div className="hidden 2xl:flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2.5 py-0.5 rounded-full font-mono font-semibold">
            <Globe size={11} /> Moteur Multi-Actifs Synchronisé + Leaderboard
          </div>
        </div>

        {/* Onglets de navigation */}
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.filter((item) => !item.adminOnly || currentUser?.role === 'ROLE_ADMIN').map((item) => {
            const Icon = item.icon;
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                title={item.label}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#1E293B] text-[#38BDF8] border border-[#334155] shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]/50'
                }`}
              >
                <Icon size={14} />
                <span className="hidden xl:inline">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Actions header & Profil utilisateur */}
        <div className="flex items-center gap-2.5">
          {/* Bouton Visualiseur Données CSV */}
          <button
            onClick={() => setIsCsvInspectorOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0284C7]/20 hover:bg-[#0284C7]/30 text-[#38BDF8] border border-[#0284C7]/50 transition-all shadow-sm"
            title="Consulter et filtrer l'intégralité des fichiers CSV réels"
          >
            <FileSpreadsheet size={15} />
            <span className="hidden lg:inline">Données Brutes CSV</span>
          </button>

          {currentUser ? (
            <div className="flex items-center gap-2">
              <div
                onClick={() => {
                  setAuthModalMode('LOGIN');
                  setIsAuthModalOpen(true);
                }}
                className="flex items-center gap-2 bg-[#1E293B] border border-[#334155] px-2.5 py-1 rounded-lg cursor-pointer hover:border-[#38BDF8] transition-colors"
                title="Cliquer pour changer d'utilisateur"
              >
                <UserCircle size={16} className="text-[#38BDF8]" />
                <div className="text-left font-mono">
                  <div className="text-[11px] font-bold text-slate-200 truncate max-w-[130px]">
                    {currentUser.fullName || currentUser.email}
                  </div>
                  <div className="text-[9px] text-[#10B981] font-semibold">
                    {currentUser.role === 'ROLE_ADMIN' ? 'ADMINISTRATEUR' : 'TRADER ACTIF'}
                  </div>
                </div>
              </div>

              {/* Bouton Déconnexion */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/50 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 transition-all font-mono"
                title="Se déconnecter de la session courante"
              >
                <LogOut size={13} />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setAuthModalMode('LOGIN');
                  setIsAuthModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#1E293B] hover:bg-[#334155] text-slate-200 border border-[#334155] transition-all"
              >
                <LogIn size={13} className="text-[#38BDF8]" />
                <span>Connexion</span>
              </button>

              <button
                onClick={() => {
                  setAuthModalMode('REGISTER');
                  setIsAuthModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0284C7] hover:bg-[#0369A1] text-white transition-all shadow-sm"
              >
                <UserPlus size={13} />
                <span>Créer un Compte</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 2. TICKER TAPE DES COURS EN DÉFILEMENT */}
      <TickerTape />

      {/* 3. VUE PRINCIPALE DYNAMIQUE */}
      <Routes>
        <Route path="/" element={
        <main className="flex-1 flex overflow-hidden">
          {/* Watchlist à gauche */}
          <MarketWatch
            assets={assets}
            selectedAsset={selectedAsset}
            onSelectAsset={handleSelectAsset}
            isLoading={isLoadingAssets}
            assetSignals={assetSignals}
          />

          {/* Graphique Time-Lapse Multi-Actifs & Widget d'Ordre au centre */}
          <section className="flex-1 flex flex-col min-w-0 border-r border-[#1E293B]">
            {selectedAsset ? (
              <>
                <TradingChart
                  selectedAsset={selectedAsset}
                  selectedYear={selectedYear}
                  onSelectYear={setSelectedYear}
                  onSelectAsset={handleSelectAsset}
                  onOpenCsvInspector={() => setIsCsvInspectorOpen(true)}
                  onSimulationUpdate={handleSimulationUpdate}
                  userPositions={userPositions}
                />
                <QuickOrderWidget
                  selectedAsset={selectedAsset}
                  cashBalance={cashBalance}
                  simulatedDate={simulatedDate}
                  currentSimulatedPrice={currentSimulatedPrice}
                  userPositions={userPositions}
                  onOrderExecuted={handleOrderExecuted}
                />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 font-mono text-xs">
                Chargement de la simulation...
              </div>
            )}
          </section>

          {/* VOLET DROIT : COPILOT IA (PAR DÉFAUT), LEADERBOARD OU CARNET D'ORDRES L2 */}
          <div className="flex flex-col h-full w-[380px] bg-[#0B0F19] border-l border-[#1E293B] shrink-0">
            {/* Onglets sélecteurs de volet droit */}
            <div className="flex bg-[#0F172A] border-b border-[#1E293B] p-1 gap-1">
              <button
                onClick={() => setRightPanelView('COPILOT')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-md text-xs font-bold transition-all ${
                  rightPanelView === 'COPILOT'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]'
                }`}
                title="Assistant d'analyse de marché en temps réel et prédictions XGBoost"
              >
                <BrainCircuit size={13} className="text-cyan-400" />
                <span>IA Copilot</span>
              </button>

              <button
                onClick={() => setRightPanelView('LEADERBOARD')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-md text-xs font-bold transition-all ${
                  rightPanelView === 'LEADERBOARD'
                    ? 'bg-[#0284C7] text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]'
                }`}
                title="Classement dynamique en temps réel de tous les actifs par rendement cumulé YTD"
              >
                <Trophy size={13} />
                <span>Leaderboard</span>
              </button>

              <button
                onClick={() => setRightPanelView('ORDERBOOK')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-md text-xs font-bold transition-all ${
                  rightPanelView === 'ORDERBOOK'
                    ? 'bg-[#0284C7] text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]'
                }`}
                title="Carnet d'ordres L2 et flux de transactions"
              >
                <Layers size={13} />
                <span>Carnet L2</span>
              </button>
            </div>

            {/* Vue active du volet droit */}
            {rightPanelView === 'COPILOT' ? (
              <AiCopilotWidget
                selectedAsset={selectedAsset}
                simulatedDate={simulatedDate}
                aiAnalysis={aiAnalysis}
                aiSignal={aiSignal}
                isLoadingSignal={isLoadingAi}
                onRefreshAnalysis={() => triggerAssetAnalysis(selectedAsset)}
                isPlaying={isSimulationPlaying}
                assets={assets}
                currentMarketTick={currentMarketTick}
                cashBalance={cashBalance}
                portfolioValue={portfolioValue}
                userPositions={userPositions}
                onSelectAsset={handleSelectAsset}
              />
            ) : rightPanelView === 'LEADERBOARD' ? (
              <DynamicLeaderboard
                marketTick={currentMarketTick}
                assetMetadata={assetMetadata}
                selectedAsset={selectedAsset}
                onSelectAsset={handleSelectAsset}
                onQuickTrade={handleSelectAsset}
                simulatedDate={simulatedDate}
                currentIndex={currentIndex}
                totalDays={totalDays}
              />
            ) : (
              selectedAsset && <OrderBookTape selectedAsset={selectedAsset} />
            )}
          </div>
        </main>
        } />
        {/* Vue Dédiée Espace Portefeuille & Risque */}
        <Route path="/portfolio" element={
          <PortfolioAnalyticsView
            simulatedDate={simulatedDate}
            selectedAsset={selectedAsset}
            onNavigateToTrading={() => navigate('/')}
          />
        } />
        <Route path="/admin/audit" element={<AdminAuditPage currentUser={currentUser} />} />
        {PLACEHOLDER_MODULES.map((m) => (
          <Route key={m.path} path={m.path} element={<ModulePlaceholder {...m} />} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* 4. FOOTER RÉSUMÉ DE COMPTE ET STATUT DU BROKER */}
      <AccountSummaryFooter
        cashBalance={cashBalance}
        portfolioValue={portfolioValue}
        dailyPnL={dailyPnL}
        dailyPnLPercent={dailyPnLPercent}
      />

      {/* 5. MODAL D'INSPECTION DÉTAILLÉE DES FICHIERS CSV */}
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

      {/* 6. MODALE AUTHENTIFICATION (LOGIN / CRÉATION DE COMPTE) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}
