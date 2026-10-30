"""
????????????????????????????????????????????????????????????????????????????????
?         AI API SERVER ? FastAPI Asynchrone (PIF Market Simulator)           ?
?   Endpoints ML ? RAG ? FinGPT ? Optimise RAM/CPU pour laptop               ?
????????????????????????????????????????????????????????????????????????????????

Demarrage :
    uvicorn ai_server:app --host 0.0.0.0 --port 8000 --reload

Endpoints :
    POST /api/ai/predict        ? Prediction XGBoost
    POST /api/ai/analyze        ? Analyse complete FinGPT + RAG
    GET  /api/ai/rag/query      ? Recherche documentaire RAG
    GET  /api/ai/health         ? Sante du pipeline
    GET  /api/ai/model/info     ? Metadonnees du modele
"""

import asyncio
import gc
import json
import logging
import os
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional, List, Dict, Any

import numpy as np
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from stress.api import router as stress_router, state as stress_state
from backtest_signals import router as backtest_router
from actuarial.api import router as actuarial_router, state as actuarial_state

AI_DIR   = Path(__file__).parent
LOGS_DIR = AI_DIR / "logs"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(LOGS_DIR / "ai_server.log", mode="w", encoding="utf-8"),
    ],
)
log = logging.getLogger(__name__)


# ????????????????????????????????????????????????????????????????????????????
#  APPLICATION STATE ? Chargement paresseux des composants lourds
# ????????????????????????????????????????????????????????????????????????????

class AppState:
    ml_model  = None
    ml_scaler = None
    ml_features: List[str] = []
    rag_engine = None
    fingpt_agent = None
    model_metadata: Dict = {}


state = AppState()


async def load_components():
    """Chargement asynchrone des composants IA au demarrage."""
    log.info("[INIT] Chargement des composants IA...")

    # 1. Modele ML
    try:
        from train_model import load_model
        state.ml_model, state.ml_scaler, state.ml_features = load_model()
        log.info(f"[INIT] Modele XGBoost charge ({len(state.ml_features)} features)")

        # Charger les metadonnees
        meta_path = AI_DIR / "models" / "model_metadata.json"
        if meta_path.exists():
            with open(meta_path, encoding="utf-8") as f:
                state.model_metadata = json.load(f)
    except FileNotFoundError:
        log.warning("[INIT] Modele ML non trouve. Executez train_model.py d abord.")
    except Exception as e:
        log.error(f"[INIT] Erreur chargement modele ML : {e}")

    # 2. RAG Engine (chargement embeddings)
    try:
        from rag_engine import RAGEngine
        state.rag_engine = RAGEngine()
        # Construction de l index en background pour ne pas bloquer le demarrage
        asyncio.create_task(asyncio.to_thread(state.rag_engine.build_index))
        log.info("[INIT] RAG Engine initialise (index en cours de construction)")
    except Exception as e:
        log.error(f"[INIT] Erreur RAG Engine : {e}")

    # 3. FinGPT Agent
    try:
        from agent_service import FinGPTAgent
        state.fingpt_agent = FinGPTAgent()
        available = await state.fingpt_agent.is_available()
        log.info(f"[INIT] FinGPT Agent : {'DISPONIBLE' if available else 'HORS-LIGNE (fallback actif)'}")
    except Exception as e:
        log.error(f"[INIT] Erreur FinGPT Agent : {e}")

    gc.collect()
    log.info("[INIT] Composants IA prets")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Cycle de vie de l application FastAPI."""
    await load_components()
    # Modèles de stress testing : chargement / entraînement en arrière-plan (ne bloque pas le démarrage)
    import threading
    threading.Thread(target=stress_state.ready, name="stress-warmup", daemon=True).start()
    threading.Thread(target=actuarial_state.ready, name="actuarial-warmup", daemon=True).start()
    yield
    # Nettoyage memoire au shutdown
    if state.fingpt_agent:
        await state.fingpt_agent.close()
    gc.collect()
    log.info("[SHUTDOWN] Serveur IA arrete proprement")


# ????????????????????????????????????????????????????????????????????????????
#  APPLICATION FASTAPI
# ????????????????????????????????????????????????????????????????????????????

app = FastAPI(
    title="PIF AI Engine",
    description="Pipeline IA complet : XGBoost ? RAG ? FinGPT pour le simulateur de salle de marche",
    version="1.0.0",
    lifespan=lifespan,
)

# Le service IA est appele par le backend Spring Boot (serveur a serveur) :
# seules les origines listees dans AI_ALLOWED_ORIGINS (separees par des virgules) sont autorisees en CORS.
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("AI_ALLOWED_ORIGINS", "http://localhost:8080,http://127.0.0.1:8080").split(",")
    if o.strip()
]

app.include_router(stress_router)
app.include_router(backtest_router)
app.include_router(actuarial_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)


# ????????????????????????????????????????????????????????????????????????????
#  SCHEMAS PYDANTIC ? Request / Response
# ????????????????????????????????????????????????????????????????????????????

class PredictRequest(BaseModel):
    ticker:         str = Field(..., json_schema_extra={"example": "BNB-USD"})
    open:           float
    high:           float
    low:            float
    close:          float
    volume:         float
    sma_20:         float = 0.0
    sma_50:         float = 0.0
    rsi_14:         float = 50.0
    macd:           float = 0.0
    macd_signal:    float = 0.0
    macd_hist:      float = 0.0
    volatility_30d: float = 0.0
    log_return_1d:  float = 0.0
    price_to_sma20: float = 1.0
    candle_range_pct: float = 0.0
    volume_zscore:  float = 0.0


class PredictResponse(BaseModel):
    ticker:         str
    signal:         str      # BULLISH / BEARISH / NEUTRAL
    action:         str = "HOLD"  # BUY / SELL / HOLD
    prediction:     int      # -1, 0, 1
    confidence_pct: float = 0.5  # 0.0 à 1.0
    probability_up: float    # 0.0 a 1.0
    probabilities:  Dict[str, float] = Field(default_factory=dict)
    confidence:     str      # LOW / MEDIUM / HIGH
    inference_ms:   float


class ChatRequest(BaseModel):
    question:       str = Field(..., json_schema_extra={"example": "Que penses-tu de l'action BIAT dans le contexte actuel de taux BCT ?"})
    ticker:         Optional[str] = "BIAT"
    domain:         Optional[str] = "market"  # market | banking_islamic | all
    simulation_date: Optional[str] = None
    bank_type:      Optional[str] = "conventional"


class ChatResponse(BaseModel):
    answer:         str
    sources:        List[str] = Field(default_factory=list)
    domain_used:    str
    latency_ms:     float
    timestamp:      str


class AnalyzeRequest(BaseModel):
    simulation_date:    str = Field(..., json_schema_extra={"example": "2024-01-15"})
    ticker:             str = Field(..., json_schema_extra={"example": "BNB-USD"})
    bank_type:          str = Field("conventional", json_schema_extra={"example": "conventional"})  # conventional | islamic
    open:               float
    high:               float
    low:                float
    close:              float
    volume:             float
    sma_20:             float = 0.0
    sma_50:             float = 0.0
    rsi_14:             float = 50.0
    macd:               float = 0.0
    macd_signal:        float = 0.0
    macd_hist:          float = 0.0
    volatility_30d:     float = 0.0
    log_return_1d:      float = 0.0
    price_to_sma20:     float = 1.0
    candle_range_pct:   float = 0.0
    volume_zscore:      float = 0.0
    sentiment_score:    float = 0.0
    current_position:   str   = "NONE"
    unrealized_pnl:     float = 0.0
    include_rag:        bool  = True
    rag_top_k:          int   = 3


class AnalyzeResponse(BaseModel):
    ticker:          str
    simulation_date: str
    bank_type:       str
    recommendation:  str
    confidence:      str
    risk_level:      str
    ml_signal:       str
    ml_probability:  float
    action:          str = "HOLD"
    confidence_pct:  float = 0.5
    probabilities:   Dict[str, float] = Field(default_factory=dict)
    sources:         List[str] = Field(default_factory=list)
    analysis:        str
    compliance_note: str = ""
    rag_context:     str = ""
    total_ms:        float
    llm_ms:          float = 0.0
    llm_available:   bool = True
    error:           Optional[str] = None


class RAGQueryRequest(BaseModel):
    query:      str = Field(..., json_schema_extra={"example": "Ratio LCR Bale III"})
    bank_type:  str = Field("all", json_schema_extra={"example": "conventional"})
    top_k:      int = Field(5, ge=1, le=10)


class RAGQueryResponse(BaseModel):
    query:    str
    results:  List[Dict]
    count:    int
    query_ms: float


class PortfolioPositionItem(BaseModel):
    symbol:         str
    shares:         Optional[float] = 0.0
    quantity:       Optional[float] = None
    current_price:  Optional[float] = 0.0
    avg_buy_price:  Optional[float] = 0.0
    averageCostPrice: Optional[float] = None
    unrealized_pnl: Optional[float] = 0.0
    unrealizedPnl:  Optional[float] = None


class PortfolioExplainRequest(BaseModel):
    simulated_date:   str = Field("2022-01-03", json_schema_extra={"example": "2022-03-18"})
    cash_disponible:  float = Field(100000.0, json_schema_extra={"example": 99379.07})
    valeur_totale:    float = Field(100000.0, json_schema_extra={"example": 100059.07})
    pnl_jour:         float = Field(0.0, json_schema_extra={"example": 60.00})
    positions:        List[Dict[str, Any]] = Field(default_factory=list)


class PortfolioExplainResponse(BaseModel):
    simulated_date:   str
    risk_level:       str = "MODERATE"     # LOW, MODERATE, HIGH, VERY HIGH
    arbitrage_advice: str = "OBSERVE"      # ACCUMULATE, TRIM, REBALANCE, OBSERVE
    explanation:      str
    key_ratios:       Dict[str, Any] = Field(default_factory=dict)
    sources:          List[str] = Field(default_factory=list)
    latency_ms:       float = 0.0


class MarketPauseAuditRequest(BaseModel):
    simulated_date:   str = Field("2022-01-31", json_schema_extra={"example": "2022-01-31"})
    portfolio:        Optional[Dict[str, Any]] = Field(default_factory=dict)
    market_snapshot:  List[Dict[str, Any]] = Field(default_factory=list)


class OpportunityItem(BaseModel):
    ticker:           str
    action:           str           # BUY, TRIM, HOLD
    confidence_pct:   float         # 0 à 100
    xgboost_signal:   int           # -1, 0, 1
    reasoning:        str
    risk_reward:      str = "Équilibré"


class MarketPauseAuditResponse(BaseModel):
    simulated_date:   str
    market_regime:    str = "MODERATE"     # BULLISH, BEARISH, RANGE_BOUND, VOLATILE
    market_summary:   str
    opportunities:    List[OpportunityItem] = Field(default_factory=list)
    portfolio_impact: str
    sources:          List[str] = Field(default_factory=list)
    latency_ms:       float = 0.0


# ????????????????????????????????????????????????????????????????????????????
#  ENDPOINTS
# ????????????????????????????????????????????????????????????????????????????

@app.get("/api/ai/health")
async def health_check():
    """Verification de l etat de tous les composants IA."""
    ml_ok    = state.ml_model is not None
    rag_ok   = state.rag_engine is not None
    llm_ok   = False

    if state.fingpt_agent:
        try:
            llm_ok = await asyncio.wait_for(state.fingpt_agent.is_available(), timeout=3.0)
        except asyncio.TimeoutError:
            llm_ok = False

    status = "healthy" if (ml_ok and rag_ok) else "degraded"

    return {
        "status":        status,
        "components": {
            "xgboost_model": "OK" if ml_ok else "NOT_LOADED",
            "rag_engine":    "OK" if rag_ok else "NOT_LOADED",
            "fingpt_llm":    "OK" if llm_ok else "OFFLINE",
        },
        "model_info": {
            "cv_mean_accuracy": state.model_metadata.get("cv_mean_accuracy"),
            "cv_mean_auc":      state.model_metadata.get("cv_mean_auc"),
            "trained_at":       state.model_metadata.get("trained_at"),
        },
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


@app.post("/api/ai/predict", response_model=PredictResponse)
async def predict(req: PredictRequest):
    """
    Inférence 3-classes CALIBRÉE (XGBoost) avec filtrage par seuil de confiance >= 0.60.
    Élimine les faux signaux directionnels (Achat/Vente) et sécurise en Neutre.
    """
    if state.ml_model is None:
        raise HTTPException(503, "Modele XGBoost non charge. Executez train_model.py d abord.")

    t0 = time.perf_counter()

    feature_values = {
        "open": req.open, "high": req.high, "low": req.low,
        "close": req.close, "volume": req.volume,
        "sma_20": req.sma_20, "sma_50": req.sma_50, "rsi_14": req.rsi_14,
        "macd": req.macd, "macd_signal": req.macd_signal, "macd_hist": req.macd_hist,
        "volatility_30d": req.volatility_30d, "log_return_1d": req.log_return_1d,
        "price_to_sma20": req.price_to_sma20, "candle_range_pct": req.candle_range_pct,
        "volume_zscore": req.volume_zscore,
    }

    # Inférence calibrée via la fonction standardisée
    from train_model import predict as ml_predict_calibrated
    cal_res = ml_predict_calibrated(feature_values, confidence_threshold=0.60)

    inference_ms = (time.perf_counter() - t0) * 1000
    prob_buy = cal_res["probabilities"]["buy"]
    conf_level = "HIGH" if cal_res["confidence"] >= 0.60 else ("MEDIUM" if cal_res["confidence"] >= 0.45 else "LOW")
    action = "BUY" if cal_res["prediction"] == 1 else ("SELL" if cal_res["prediction"] == -1 else "HOLD")

    return PredictResponse(
        ticker=req.ticker,
        signal=cal_res["signal"],
        action=action,
        prediction=cal_res["prediction"],
        confidence_pct=round(float(cal_res["confidence"]), 4),
        probability_up=round(prob_buy, 4),
        probabilities={k: round(float(v), 4) for k, v in cal_res["probabilities"].items()},
        confidence=conf_level,
        inference_ms=round(inference_ms, 2),
    )


@app.post("/api/ai/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest):
    """
    Analyse complète : XGBoost Calibré (3-classes) + RAG Ciblé (Segmentation Marché vs Banque) + FinGPT.
    Pipeline asynchrone non bloquant.
    """
    t0 = time.perf_counter()

    feature_values = {
        "open": req.open, "high": req.high, "low": req.low,
        "close": req.close, "volume": req.volume,
        "sma_20": req.sma_20, "sma_50": req.sma_50, "rsi_14": req.rsi_14,
        "macd": req.macd, "macd_signal": req.macd_signal, "macd_hist": req.macd_hist,
        "volatility_30d": req.volatility_30d, "log_return_1d": req.log_return_1d,
        "price_to_sma20": req.price_to_sma20, "candle_range_pct": req.candle_range_pct,
        "volume_zscore": req.volume_zscore,
    }

    # 1. Prediction ML 3-classes CALIBRÉE (seuil >= 0.60)
    ml_signal = "NEUTRAL"
    ml_pred = 0
    ml_conf = 0.5
    ml_probs = {"sell": 0.33, "neutral": 0.34, "buy": 0.33}

    if state.ml_model is not None:
        from train_model import predict as ml_predict_calibrated
        cal_res = ml_predict_calibrated(feature_values, confidence_threshold=0.60)
        ml_signal = cal_res["signal"]
        ml_pred = cal_res["prediction"]
        ml_conf = cal_res["confidence"]
        ml_probs = cal_res["probabilities"]

    # 2. Contexte RAG CIBLÉ (where={"domain": "market"} pour trading/recommandation d'actif)
    rag_context = ""
    macro_context = ""
    if req.include_rag and state.rag_engine is not None:
        try:
            if req.bank_type in ["islamic", "banking_islamic"]:
                # Réservé aux aspects prudentiels/stress tests/charia
                rag_query = f"normes prudentielles conformité charia IFSB AAOIFI gestion risque {req.ticker}"
                rag_context = await asyncio.to_thread(
                    state.rag_engine.retrieve_banking_islamic,
                    rag_query,
                    req.rag_top_k,
                    req.bank_type,
                )
                rag_context = state.rag_engine.format_context(rag_context)
            else:
                # Analyse actif/marché : RAG strictement ciblé marché (where={"domain": "market"})
                market_query = f"conditions marché bourse inflation politique monétaire TMM BVMT BCT {req.ticker}"
                macro_results = await asyncio.to_thread(
                    state.rag_engine.retrieve_market,
                    market_query,
                    req.rag_top_k,
                )
                macro_context = state.rag_engine.format_context(macro_results)
                rag_context = macro_context
        except Exception as e:
            log.warning(f"[ANALYZE] RAG erreur : {e}")
            rag_context = "Contexte documentaire non disponible."

    # 3. Construction de l etat du simulateur
    from agent_service import MarketState
    market_state = MarketState(
        simulation_date=req.simulation_date,
        ticker=req.ticker,
        bank_type=req.bank_type,
        open=req.open, high=req.high, low=req.low,
        close=req.close, volume=req.volume,
        sma_20=req.sma_20, sma_50=req.sma_50, rsi_14=req.rsi_14,
        macd=req.macd, macd_signal=req.macd_signal, macd_hist=req.macd_hist,
        volatility_30d=req.volatility_30d,
        ml_signal=ml_signal,
        ml_prediction=ml_pred,
        ml_confidence=ml_conf,
        ml_probabilities=ml_probs,
        sentiment_score=req.sentiment_score,
        sentiment_label="POSITIVE" if req.sentiment_score > 0.1 else ("NEGATIVE" if req.sentiment_score < -0.1 else "NEUTRAL"),
        rag_context=rag_context,
        macro_context=macro_context,
        current_position=req.current_position,
        unrealized_pnl=req.unrealized_pnl,
    )

    # 4. Appel FinGPT (asynchrone)
    llm_ms = 0.0
    llm_available = False
    if state.fingpt_agent is not None:
        agent_resp = await state.fingpt_agent.analyze(market_state)
        llm_ms = agent_resp.latency_ms
        llm_available = agent_resp.error is None
    else:
        from agent_service import AgentResponse
        agent_resp = AgentResponse(
            raw_text=f"FinGPT non disponible. Signal calibré XGBoost : {ml_signal} ({ml_conf:.1%})",
            recommendation="BUY" if ml_signal == "BULLISH" else ("SELL" if ml_signal == "BEARISH" else "HOLD"),
            confidence="HIGH" if ml_conf >= 0.60 else "MEDIUM",
            risk_level="MODERATE",
            error="Agent non initialise",
        )

    total_ms = (time.perf_counter() - t0) * 1000

    # Extraire la liste des sources documentaires
    doc_sources = []
    if req.include_rag and state.rag_engine is not None:
        try:
            if req.bank_type in ["islamic", "banking_islamic"]:
                hits = state.rag_engine.retrieve_banking_islamic(rag_query, req.rag_top_k, req.bank_type)
            else:
                hits = macro_results if 'macro_results' in locals() else []
            doc_sources = list({f"{h.get('title')} ({h.get('source')})" for h in hits if h.get('title')})
        except Exception:
            doc_sources = ["Banque Centrale de Tunisie (BCT)", "Bourse de Tunis (BVMT)"]

    return AnalyzeResponse(
        ticker=req.ticker,
        simulation_date=req.simulation_date,
        bank_type=req.bank_type,
        recommendation=agent_resp.recommendation,
        confidence=agent_resp.confidence,
        risk_level=agent_resp.risk_level,
        ml_signal=ml_signal,
        ml_probability=round(ml_probs.get("buy", 0.0), 4),
        action="BUY" if ml_pred == 1 else ("SELL" if ml_pred == -1 else "HOLD"),
        confidence_pct=round(float(ml_conf), 4),
        probabilities={k: round(float(v), 4) for k, v in ml_probs.items()},
        sources=doc_sources,
        analysis=agent_resp.raw_text,
        compliance_note=agent_resp.compliance_note,
        rag_context=rag_context[:500] if rag_context else "",  # Tronquer pour la reponse JSON
        total_ms=round(total_ms, 2),
        llm_ms=round(llm_ms, 2),
        llm_available=llm_available,
        error=agent_resp.error,
    )


@app.post("/api/ai/chat/ask", response_model=ChatResponse)
@app.post("/api/chat/ask", response_model=ChatResponse)
async def chat_ask(req: ChatRequest):
    """
    Chatbot pédagogique et analytique :
    Interroge le RAG selon le domaine demandé (market / banking_islamic)
    et synthétise une réponse explicative claire avec FinGPT (ou moteur autonome de secours).
    """
    t0 = time.perf_counter()
    domain = req.domain or "market"
    context = ""
    sources = []

    if state.rag_engine is not None:
        try:
            if domain == "market":
                hits = await asyncio.to_thread(state.rag_engine.retrieve_market, req.question, 3)
            elif domain == "banking_islamic":
                hits = await asyncio.to_thread(state.rag_engine.retrieve_banking_islamic, req.question, 3, req.bank_type)
            else:
                hits = await asyncio.to_thread(state.rag_engine.retrieve, req.question, 3)
            context = state.rag_engine.format_context(hits)
            sources = list({f"{h.get('title')} ({h.get('source')})" for h in hits if h.get('title')})
        except Exception as e:
            log.warning(f"[CHAT] Erreur RAG : {e}")

    # Prompt LLM conversationnel
    system_prompt = f"""Tu es FinGPT Copilot, un assistant financier expert pour les traders et gestionnaires de risque.
Tu réponds aux questions de l'utilisateur avec rigueur financière, pédagogie et concision.
Appuie-toi sur le contexte réglementaire et macroéconomique suivant :
{context}
"""
    answer = ""
    if state.fingpt_agent is not None:
        try:
            answer, _ = await state.fingpt_agent._call_llm(system_prompt, req.question)
        except Exception as e:
            log.warning(f"[CHAT] LLM appel direct échoué ({e}). Utilisation du fallback.")
            answer = f"Analyse Copilot : Concernant '{req.question}', les sources de marché ({', '.join(sources) if sources else 'BCT/BVMT'}) indiquent une conjoncture à surveiller attentivement, notamment l'évolution du taux TMM et la politique de liquidité."
    else:
        answer = f"Analyse Copilot : Concernant '{req.question}', les indicateurs de référence ({', '.join(sources) if sources else 'BCT/BVMT'}) recommandent une posture prudente alignée sur les fondamentaux actuels."

    latency_ms = (time.perf_counter() - t0) * 1000
    return ChatResponse(
        answer=answer,
        sources=sources,
        domain_used=domain,
        latency_ms=round(latency_ms, 2),
        timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    )


@app.post("/api/ai/portfolio-explain", response_model=PortfolioExplainResponse)
async def portfolio_explain(req: PortfolioExplainRequest):
    """
    Audit stratégique du portefeuille à la demande :
    - Évalue l'exposition et la diversification du capital.
    - Analyse la pertinence des positions ouvertes par rapport aux cours et au P&L.
    - Formule des conseils de gestion des risques (Stop-Loss, Take-Profit, liquidités).
    """
    t0 = time.perf_counter()

    # 1. Calculs des métriques fondamentales du portefeuille
    total_val = req.valeur_totale if req.valeur_totale > 0 else 100000.0
    cash = req.cash_disponible
    cash_ratio = round((cash / total_val) * 100, 2)
    invested_ratio = round(100.0 - cash_ratio, 2)
    num_positions = len(req.positions)

    # Récupérer contexte macroéconomique via RAG
    rag_context = ""
    sources = ["Banque Centrale de Tunisie (BCT)", "Bourse de Tunis (BVMT)"]
    if state.rag_engine is not None:
        try:
            hits = await asyncio.to_thread(
                state.rag_engine.retrieve_market,
                f"taux directeur TMM liquidite marche actions BVMT conjoncture {req.simulated_date}",
                2
            )
            rag_context = state.rag_engine.format_context(hits)
            if hits:
                sources = list({f"{h.get('title')} ({h.get('source')})" for h in hits if h.get('title')})
        except Exception as e:
            log.warning(f"[PORTFOLIO_EXPLAIN] Erreur RAG: {e}")

    # Formatage des positions pour le prompt
    pos_desc = []
    total_unrealized = 0.0
    for p in req.positions:
        sym = p.get("symbol", "N/A")
        qty = float(p.get("shares") or p.get("quantity") or 0.0)
        curr = float(p.get("current_price") or 0.0)
        avg = float(p.get("avg_buy_price") or p.get("averageCostPrice") or curr)
        pnl = float(p.get("unrealized_pnl") or p.get("unrealizedPnl") or ((curr - avg) * qty))
        total_unrealized += pnl
        pos_desc.append(f"- {sym} : {qty:.0f} titres | PRU: {avg:.3f} | Cours: {curr:.3f} | P&L: {pnl:+.3f} TND")

    pos_text = "\n".join(pos_desc) if pos_desc else "Aucune position ouverte (100% Liquidités)."

    # Détermination indicative du profil de risque & arbitrage
    risk_level = "LOW" if invested_ratio < 30 else ("MODERATE" if invested_ratio < 70 else "HIGH")
    if total_unrealized > 200:
        arbitrage_advice = "TAKE_PROFIT"
    elif total_unrealized < -200:
        arbitrage_advice = "STOP_LOSS"
    elif num_positions >= 3:
        arbitrage_advice = "REBALANCE"
    else:
        arbitrage_advice = "OBSERVE"

    system_prompt = """Tu es l'Auditeur en Chef des Risques et Stratège Quantitatif du Desk de Marché.
Ton rôle est de fournir un diagnostic précis, bienveillant et orienté gestion des risques sur le portefeuille du trader.
Structure impérativement ton analyse avec ces 3 sections clés :
1. EXPOSITION & DIVERSIFICATION DU CAPITAL (Analyse du ratio Liquidités / Titres investis).
2. DIAGNOSTIC DES POSITIONS & P&L (Pertinence des lignes ouvertes face aux cours actuels).
3. PLAN DE CONDUITE & GESTION DES RISQUES (Recommandations concrètes de Stop-Loss, Prise de bénéfice et Arbitrage).
Reste concis, professionnel et direct (maximum 250 mots)."""

    user_prompt = f"""=== AUDIT DU PORTEFEUILLE TRADER — DATE : {req.simulated_date} ===
- Valeur Totale du Portefeuille : {total_val:,.3f} TND
- Liquidités Disponibles (Cash) : {cash:,.3f} TND ({cash_ratio}% du portefeuille)
- Part Investie : {invested_ratio}% | P&L du Jour : {req.pnl_jour:+.2f} TND
- Positions Ouvertes ({num_positions}) :
{pos_text}

=== CONTEXTE MACROÉCONOMIQUE BVMT / BCT (RAG) ===
{rag_context if rag_context else "Conditions de taux et de liquidités stables sur le marché financier tunisien."}

Fournis le diagnostic stratégique opérationnel pour orienter le trader."""

    explanation = ""
    if state.fingpt_agent is not None and await state.fingpt_agent.is_available():
        try:
            explanation, _ = await state.fingpt_agent._call_llm(system_prompt, user_prompt)
        except Exception as e:
            log.warning(f"[PORTFOLIO_EXPLAIN] Erreur appel LLM : {e}")

    if not explanation:
        # Fallback analytique intelligent et quantitatif
        explanation = f"""### 1. EXPOSITION & DIVERSIFICATION DU CAPITAL
Votre portefeuille affiche une valeur de {total_val:,.2f} TND avec {cash_ratio}% en liquidités et {invested_ratio}% investi sur {num_positions} actif(s). Le coussin de liquidité assure une flexibilité optimale pour saisir de nouvelles opportunités.

### 2. DIAGNOSTIC DES POSITIONS & P&L
{f"Vos positions ouvertes dégagent un P&L de {total_unrealized:+.2f} TND. La dynamique globale reflète un bon alignement avec les tendances de marché observées." if num_positions > 0 else "Vous êtes actuellement 100% en cash. C'est une posture défensive prudente en attente de signaux directionnels clairs."}

### 3. PLAN DE CONDUITE & GESTION DES RISQUES
- **Stop-Loss / Sécurisation :** Positionnez un seuil de protection à -2x ATR sous votre prix de revient unitaire.
- **Prise de Bénéfices :** En cas d'extension haussière au-delà de +5%, allégez progressivement 30% de la position.
- **Liquidité :** Maintenez au moins 20% de trésorerie disponible pour amortir la volatilité."""

    latency_ms = (time.perf_counter() - t0) * 1000

    return PortfolioExplainResponse(
        simulated_date=req.simulated_date,
        risk_level=risk_level,
        arbitrage_advice=arbitrage_advice,
        explanation=explanation,
        key_ratios={
            "cash_ratio_pct": cash_ratio,
            "invested_ratio_pct": invested_ratio,
            "positions_count": num_positions,
            "total_unrealized_pnl": round(total_unrealized, 3)
        },
        sources=sources,
        latency_ms=round(latency_ms, 2)
    )


@app.post("/api/ai/market-pause-audit", response_model=MarketPauseAuditResponse)
async def market_pause_audit(req: MarketPauseAuditRequest):
    """
    Assistant Stratégique déclenché sur PAUSE :
    - Scan de marché : analyse globale de la dynamique boursière et de volatilité.
    - Évaluation du portefeuille (cash et positions ouvertes).
    - Sélection des Top Opportunités (achats ciblés / allègements) avec justification XGBoost et ratio risque/rendement.
    """
    t0 = time.perf_counter()

    # 1. Analyse du Marché et extraction des signaux XGBoost
    market_snapshot = req.market_snapshot or []
    portfolio_data = req.portfolio or {}
    cash = float(portfolio_data.get("cash", 100000.0))
    total_val = float(portfolio_data.get("total_value", 100000.0))
    positions = portfolio_data.get("positions", [])

    # Calcul du régime de marché
    avg_change = 0.0
    bulls = 0
    bears = 0
    neutrals = 0

    if market_snapshot:
        changes = [float(item.get("change", 0.0)) for item in market_snapshot]
        avg_change = sum(changes) / len(changes)
        for item in market_snapshot:
            sig = int(item.get("xgboost_signal", 0))
            if sig == 1:
                bulls += 1
            elif sig == -1:
                bears += 1
            else:
                neutrals += 1

    if avg_change > 1.0 or bulls > bears + 1:
        market_regime = "BULLISH"
    elif avg_change < -1.0 or bears > bulls + 1:
        market_regime = "BEARISH"
    elif abs(avg_change) < 0.5:
        market_regime = "RANGE_BOUND"
    else:
        market_regime = "VOLATILE"

    # Récupérer contexte macroéconomique via RAG
    rag_context = ""
    sources = ["Bourse de Tunis (BVMT)", "Banque Centrale de Tunisie (BCT)"]
    if state.rag_engine is not None:
        try:
            hits = await asyncio.to_thread(
                state.rag_engine.retrieve_market,
                f"tendance marche boursier BVMT taux TMM inflation conjoncture {req.simulated_date}",
                2
            )
            rag_context = state.rag_engine.format_context(hits)
            if hits:
                sources = list({f"{h.get('title')} ({h.get('source')})" for h in hits if h.get('title')})
        except Exception as e:
            log.warning(f"[MARKET_PAUSE_AUDIT] Erreur RAG: {e}")

    # 2. Filtrage des meilleures opportunités (Top 2-3 actifs)
    # Trier par confiance de signal directionnel (1 ou -1)
    directional_items = sorted(
        market_snapshot,
        key=lambda x: (abs(int(x.get("xgboost_signal", 0))), float(x.get("confidence", 0.0))),
        reverse=True
    )

    opportunities = []
    top_candidates = directional_items[:3] if directional_items else []

    for c in top_candidates:
        sig = int(c.get("xgboost_signal", 0))
        ticker = c.get("ticker", "N/A")
        price = float(c.get("price", 0.0))
        conf_pct = round(float(c.get("confidence", 0.5)) * 100, 1)

        if sig == 1:
            action = "BUY"
            reason = f"Signal haussier confirmé (seuil XGBoost {conf_pct}%). Momentum positif avec ratio de gain potentiel favorable."
            risk_rew = "Favorable (1:2.5)"
        elif sig == -1:
            action = "TRIM"
            reason = f"Pression vendeuse identifiée (confiance {conf_pct}%). Risque de consolidation technique sous résistance."
            risk_rew = "Défensif"
        else:
            action = "HOLD"
            reason = f"Bruit statistique ou indécision sur le cours ({price:.3f} TND). Patience recommandée."
            risk_rew = "Neutre"

        opportunities.append(
            OpportunityItem(
                ticker=ticker,
                action=action,
                confidence_pct=conf_pct,
                xgboost_signal=sig,
                reasoning=reason,
                risk_reward=risk_rew
            )
        )

    # 3. Élaboration de la synthèse via LLM FinGPT
    market_summary = ""
    portfolio_impact = ""

    system_prompt = """Tu es l'Analyste Stratégique en Chef du Desk de Trading de Tunis.
Ton rôle est de fournir un flash de synthèse lors d'une PAUSE de simulation :
1. ANALYSE DU RÉGIME DE MARCHÉ (tendance, volatilité, volume, taux TMM BCT).
2. IMPACT DIRECT SUR LE PORTEFEUILLE (évaluation du cash disponible, risque de concentration, plan d'action immédiat).
Sois percutant, synthétique et opérationnel (maximum 200 mots)."""

    snap_summary = ", ".join([f"{item.get('ticker')}: {item.get('price')} TND ({item.get('change'):+g}%, signal={item.get('xgboost_signal')})" for item in market_snapshot[:6]])

    user_prompt = f"""=== FLASH STRATÉGIQUE PAUSE DU {req.simulated_date} ===
- Régime Détecté : {market_regime} (Variation moyenne : {avg_change:+.2f}%)
- Portefeuille Actuel : Cash={cash:,.2f} TND | Valeur Totale={total_val:,.2f} TND | Positions={len(positions)}
- Cotations Clés : {snap_summary}
- Contexte Macro RAG : {rag_context if rag_context else 'Stabilité relative des taux sur le marché financier tunisien.'}

Rédige :
SECTION 1 - SYNTHÈSE DE MARCHÉ :
SECTION 2 - IMPACT SUR LE PORTEFEUILLE :"""

    llm_text = ""
    if state.fingpt_agent is not None and await state.fingpt_agent.is_available():
        try:
            llm_text, _ = await state.fingpt_agent._call_llm(system_prompt, user_prompt)
        except Exception as e:
            log.warning(f"[MARKET_PAUSE_AUDIT] Erreur appel LLM : {e}")

    if llm_text and "SECTION 2" in llm_text:
        parts = llm_text.split("SECTION 2")
        market_summary = parts[0].replace("SECTION 1 - SYNTHÈSE DE MARCHÉ :", "").strip()
        portfolio_impact = parts[1].replace("- IMPACT SUR LE PORTEFEUILLE :", "").strip()
    elif llm_text:
        market_summary = llm_text[:len(llm_text)//2].strip()
        portfolio_impact = llm_text[len(llm_text)//2:].strip()
    else:
        # Fallback analytique structuré
        market_summary = f"Le marché évolue en régime {market_regime} avec une moyenne de {avg_change:+.2f}%. Les modèles XGBoost identifient {bulls} signal(aux) d'achat et {bears} signal(aux) de vente. La dynamique des volumes reste cohérente avec les orientations macroéconomiques BCT/BVMT."
        portfolio_impact = f"Votre trésorerie disponible de {cash:,.2f} TND ({(cash/total_val)*100:.1f}% du capital) offre une marge de manœuvre substantielle pour arbitrer les titres en rupture de tendance sans surexposition au risque de baisse."

    latency_ms = (time.perf_counter() - t0) * 1000

    return MarketPauseAuditResponse(
        simulated_date=req.simulated_date,
        market_regime=market_regime,
        market_summary=market_summary,
        opportunities=opportunities,
        portfolio_impact=portfolio_impact,
        sources=sources,
        latency_ms=round(latency_ms, 2)
    )


@app.post("/api/ai/rag/query", response_model=RAGQueryResponse)
async def rag_query(req: RAGQueryRequest):
    """Recherche documentaire RAG libre."""
    if state.rag_engine is None:
        raise HTTPException(503, "RAG Engine non initialise.")

    t0 = time.perf_counter()
    results = await asyncio.to_thread(
        state.rag_engine.retrieve,
        req.query,
        req.top_k,
        req.bank_type,
    )
    query_ms = (time.perf_counter() - t0) * 1000

    return RAGQueryResponse(
        query=req.query,
        results=results,
        count=len(results),
        query_ms=round(query_ms, 2),
    )


@app.get("/api/ai/model/info")
async def model_info():
    """Metadonnees du modele XGBoost entraine."""
    if not state.model_metadata:
        raise HTTPException(503, "Metadonnees du modele non disponibles.")
    return state.model_metadata


@app.post("/api/ai/gc")
async def force_gc(background_tasks: BackgroundTasks):
    """Force un garbage collection (utile pour liberer la RAM apres de grosses inferences)."""
    background_tasks.add_task(gc.collect)
    return {"message": "Garbage collection programme", "timestamp": time.time()}


# ????????????????????????????????????????????????????????????????????????????
#  POINT D ENTREE
# ????????????????????????????????????????????????????????????????????????????

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "ai_server:app",
        # Ecoute en local uniquement par defaut : definir AI_HOST=0.0.0.0 pour l'exposer (ex. Docker)
        host=os.getenv("AI_HOST", "127.0.0.1"),
        port=int(os.getenv("AI_PORT", "8000")),
        reload=os.getenv("AI_RELOAD", "false").lower() == "true",
        log_level="info",
        workers=1,   # 1 seul worker pour economiser la RAM sur laptop
    )