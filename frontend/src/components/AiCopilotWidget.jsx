import React, { useState } from 'react';
import {
  BrainCircuit,
  Sparkles,
  Zap,
  Play,
  Pause,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  TrendingUp,
  TrendingDown,
  PauseCircle,
  RefreshCw,
  Send,
  MessageSquare,
  BookOpen,
  PieChart,
  Target,
  CheckCircle2
} from 'lucide-react';
import { askAiChatbot, fetchMarketPauseAudit } from '../services/aiService';

export default function AiCopilotWidget({
  selectedAsset,
  simulatedDate,
  aiAnalysis,
  aiSignal,
  isLoadingSignal,
  onRefreshAnalysis,
  isPlaying = false,
  assets = [],
  currentMarketTick = {},
  cashBalance = 100000,
  portfolioValue = 100000,
  userPositions = [],
  assetSignals = {},
  onSelectAsset
}) {
  const [activeTab, setActiveTab] = useState('AUDIT'); // 'AUDIT' | 'LIVE_TICK' | 'CHAT'
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState(null);
  const [auditError, setAuditError] = useState(null);

  // Messages Chat
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'assistant',
      text: "Bonjour ! Je suis FinGPT Copilot. En mode PAUSE, cliquez sur l'audit pour scanner les meilleures opportunités du marché et ajuster votre portefeuille.",
      sources: ['BVMT Conjoncture', 'BCT TMM'],
      time: '10:00'
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Couleurs et labels du signal léger XGBoost pour l'actif courant
  const liveAction = aiAnalysis?.action || aiSignal?.action || 'HOLD';
  const liveConfidence = Math.round((aiAnalysis?.confidence_pct || aiSignal?.confidence_pct || 0.5) * 100);

  // Fonction de déclenchement de l'audit stratégique sur PAUSE
  const handleRunPauseAudit = async () => {
    if (isPlaying || isAuditing) return;

    setIsAuditing(true);
    setAuditError(null);

    // Snapshot du marché : signaux XGBoost calculés côté serveur sur l'historique réel à la date simulée
    const snapshot = Object.values(assetSignals || {}).map((sig) => ({
      ticker: sig.symbol,
      price: sig.close,
      change: sig.changePct != null ? sig.changePct * 100 : 0,
      volume: sig.volume || 0,
      xgboost_signal: sig.signal,
      confidence: Math.max(sig.pBuy ?? 0, sig.pSell ?? 0),
      p_buy: sig.pBuy,
      p_sell: sig.pSell
    }));

    const payload = {
      simulated_date: simulatedDate || '2022-01-03',
      market_snapshot: snapshot,
      portfolio: {
        cash: cashBalance,
        total_value: portfolioValue,
        positions: userPositions
      }
    };

    try {
      const res = await fetchMarketPauseAudit(payload);
      setAuditResult(res);
    } catch (err) {
      setAuditError("Impossible d'exécuter l'audit stratégique en ce moment.");
    } finally {
      setIsAuditing(false);
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputQuery.trim() || isSending) return;

    const userText = inputQuery.trim();
    setInputQuery('');
    const newMsg = {
      role: 'user',
      text: userText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages((prev) => [...prev, newMsg]);
    setIsSending(true);

    try {
      const resp = await askAiChatbot(userText, selectedAsset?.ticker, 'market', simulatedDate);
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: resp.answer || "Analyse indisponible.",
          sources: resp.sources || [],
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: "Désolé, une erreur de communication est survenue avec le service FinGPT local.",
          sources: [],
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#080C14] border border-[#1E293B] rounded-xl overflow-hidden shadow-2xl backdrop-blur-md">
      {/* Header avec indicateur d'état simulation & Switcher d'onglets */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#0F172A] border-b border-[#1E293B]">
        <div className="flex items-center space-x-2">
          <div className={`p-1.5 rounded-lg border transition-all ${
            isPlaying 
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' 
              : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
          }`}>
            <BrainCircuit className={`w-4 h-4 ${isPlaying ? 'animate-spin' : 'animate-pulse'}`} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              FinGPT Stratège
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${
                isPlaying 
                  ? 'bg-amber-950/80 text-amber-400 border border-amber-800' 
                  : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
              }`}>
                {isPlaying ? 'PLAY • VEILLE' : 'PAUSE • PRÊT'}
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">{simulatedDate}</p>
          </div>
        </div>

        <div className="flex bg-[#080C14] p-0.5 rounded-lg border border-[#1E293B]">
          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
              activeTab === 'AUDIT'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Audit
          </button>
          <button
            onClick={() => setActiveTab('LIVE_TICK')}
            className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
              activeTab === 'LIVE_TICK'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Actif
          </button>
          <button
            onClick={() => setActiveTab('CHAT')}
            className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-all ${
              activeTab === 'CHAT'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 1. ONGLET PRINCIPAL : AUDIT STRATÉGIQUE SUR PAUSE */}
      {activeTab === 'AUDIT' && (
        <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5">
          {/* BOUTON D'ACTION PRINCIPAL DYNAMIQUE */}
          {isPlaying ? (
            /* État PENDANT LA LECTURE (PLAY) : LLM en veille */
            <div className="bg-[#0F172A]/70 border border-slate-800/80 rounded-xl p-3.5 text-center space-y-2">
              <div className="inline-flex items-center justify-center p-2 rounded-full bg-slate-800/60 text-slate-500 mb-1">
                <Play className="w-4 h-4 fill-slate-500" />
              </div>
              <h4 className="text-xs font-bold text-slate-300">Simulation en cours de rejeu</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Le LLM génératif est en veille pour préserver les performances CPU/GPU. Seuls les signaux légers XGBoost défilent en direct.
              </p>
              <button
                disabled
                className="w-full py-2 px-3 rounded-lg bg-slate-800/50 text-slate-500 text-xs font-bold border border-slate-700/40 cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Zap className="w-3.5 h-3.5 opacity-40" />
                <span>Mettez en PAUSE pour déclencher l'audit</span>
              </button>
            </div>
          ) : (
            /* État SUR PAUSE : Bouton illuminé / pulsant prêt à être déclenché */
            <div className="bg-gradient-to-b from-indigo-950/40 to-[#0F172A] border border-indigo-500/40 rounded-xl p-3.5 space-y-3 shadow-lg shadow-indigo-950/50">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-bold text-indigo-300">
                  <Pause className="w-3.5 h-3.5 fill-indigo-400 text-indigo-400" />
                  Séance figée au {simulatedDate}
                </span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-full font-mono">
                  RAG + FinGPT
                </span>
              </div>

              <button
                onClick={handleRunPauseAudit}
                disabled={isAuditing}
                className="w-full py-2.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider text-white transition-all transform active:scale-95 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 shadow-md shadow-indigo-500/25 border border-indigo-400/40 animate-pulse hover:animate-none"
              >
                {isAuditing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Scan de marché en cours...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                    <span>⚡ Analyser le Marché & Mon Portefeuille</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* RÉSULTATS DE L'AUDIT STRATÉGIQUE */}
          {auditResult ? (
            <div className="space-y-3.5 animate-fadeIn">
              {/* SECTION 1 : SYNTHÈSE DE MARCHÉ */}
              <div className="bg-[#0F172A]/90 border border-[#1E293B] rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    1. Synthèse de Marché & Régime
                  </h4>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded font-mono ${
                    auditResult.market_regime === 'BULLISH'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : auditResult.market_regime === 'BEARISH'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  }`}>
                    {auditResult.market_regime}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed bg-[#080C14] p-2.5 rounded-lg border border-[#1E293B]">
                  {auditResult.market_summary}
                </p>

                {/* Impact Portefeuille */}
                {auditResult.portfolio_impact && (
                  <div className="pt-1.5 border-t border-[#1E293B] text-[11px] text-slate-400">
                    <span className="font-bold text-slate-300 block mb-0.5">Impact Portefeuille & Liquidités :</span>
                    <p className="text-slate-300 italic">{auditResult.portfolio_impact}</p>
                  </div>
                )}
              </div>

              {/* SECTION 2 : SÉLECTEUR D'OPPORTUNITÉS D'ACTIFS */}
              <div className="bg-[#0F172A]/90 border border-[#1E293B] rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-indigo-400" />
                    2. Top Opportunités d'Arbitrage
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">Confiance XGBoost</span>
                </div>

                <div className="space-y-2">
                  {auditResult.opportunities && auditResult.opportunities.length > 0 ? (
                    auditResult.opportunities.map((opp, idx) => {
                      const isBuy = opp.action === 'BUY';
                      const isTrim = opp.action === 'TRIM' || opp.action === 'SELL';

                      return (
                        <div
                          key={idx}
                          onClick={() => onSelectAsset && onSelectAsset({ ticker: opp.ticker })}
                          className="bg-[#080C14] hover:bg-[#131B2E] border border-[#1E293B] hover:border-indigo-500/50 p-2.5 rounded-lg transition-all cursor-pointer space-y-1.5 group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-white group-hover:text-cyan-400 transition-colors">
                                {opp.ticker}
                              </span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                                isBuy
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                  : isTrim
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                  : 'bg-slate-700/40 text-slate-300 border border-slate-600/50'
                              }`}>
                                {opp.action}
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-[11px] font-bold text-slate-200">
                                {opp.confidence_pct}%
                              </span>
                              <span className="text-[9px] text-slate-500 block">
                                {opp.risk_reward || 'R/R 1:2'}
                              </span>
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-400 leading-snug">
                            {opp.reasoning}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-2">
                      Aucune anomalie directionnelle forte identifiée sur cette séance.
                    </p>
                  )}
                </div>
              </div>

              {/* SOURCES RAG CONSULTÉES */}
              <div className="bg-[#080C14] p-2.5 rounded-xl border border-[#1E293B] space-y-1.5">
                <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                  <BookOpen className="w-3 h-3 text-amber-400" />
                  Sources Macro RAG & Bulletins :
                </span>
                <div className="flex flex-wrap gap-1">
                  {(auditResult.sources || ['Banque Centrale de Tunisie (BCT)', 'Bourse de Tunis (BVMT)']).map((src, i) => (
                    <span
                      key={i}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800"
                    >
                      {src}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Invite par défaut si pas encore audité */
            !isPlaying && (
              <div className="bg-[#0F172A]/40 border border-dashed border-[#1E293B] rounded-xl p-4 text-center space-y-2">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Cliquez sur le bouton ci-dessus pour geler la séance et analyser la dynamique globale du marché et vos opportunités d'arbitrage.
                </p>
              </div>
            )
          )}
        </div>
      )}

      {/* 2. ONGLET SECONDAIRE : ACTIF COURANT & XGBOOST TEMPS RÉEL */}
      {activeTab === 'LIVE_TICK' && (
        <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5">
          <div className="p-3 bg-[#0F172A] border border-[#1E293B] rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Actif Sélectionné</span>
              <span className="text-sm font-black text-white">{selectedAsset?.ticker || 'BIAT'}</span>
            </div>
            <div className="text-right">
              <span className={`text-xs font-black px-2 py-0.5 rounded font-mono ${
                liveAction === 'BUY'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : liveAction === 'SELL'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  : 'bg-slate-700/40 text-slate-300 border border-slate-600/50'
              }`}>
                {liveAction} ({liveConfidence}%)
              </span>
            </div>
          </div>

          <div className="bg-[#0F172A] p-3 rounded-xl border border-[#1E293B] space-y-2">
            <span className="text-xs font-bold text-slate-300 block">Note Technique Rapide :</span>
            <p className="text-xs text-slate-400 leading-relaxed bg-[#080C14] p-2.5 rounded-lg border border-[#1E293B]">
              {aiAnalysis?.analysis || "Signal continu calculé par le classificateur XGBoost 3-classes en temps réel."}
            </p>
          </div>
        </div>
      )}

      {/* 3. ONGLET SECONDAIRE : CHATBOT CONVERSATIONNEL */}
      {activeTab === 'CHAT' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <div className="flex-1 p-3 overflow-y-auto space-y-3">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] p-2.5 rounded-xl text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none shadow-md'
                      : 'bg-slate-800/80 text-slate-200 border border-slate-700 rounded-bl-none shadow'
                  }`}
                >
                  <p>{msg.text}</p>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-1.5 pt-1.5 border-t border-slate-700/60 text-[10px] text-slate-400">
                      <span className="font-semibold text-amber-400">Sources : </span>
                      {msg.sources.join(', ')}
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-slate-500 mt-0.5 px-1">{msg.time}</span>
              </div>
            ))}
            {isSending && (
              <div className="flex items-center space-x-2 text-xs text-slate-400 py-1">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>FinGPT réfléchit et interroge ChromaDB...</span>
              </div>
            )}
          </div>

          {/* Saisie du message */}
          <form onSubmit={handleSendMessage} className="p-2.5 bg-[#0F172A] border-t border-[#1E293B] flex gap-2">
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Posez une question sur le titre ou les taux..."
              className="flex-1 bg-[#080C14] text-slate-200 text-xs px-3 py-2 rounded-lg border border-[#1E293B] focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              type="submit"
              disabled={isSending || !inputQuery.trim()}
              className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
