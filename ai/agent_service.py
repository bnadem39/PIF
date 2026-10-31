"""
????????????????????????????????????????????????????????????????????????????????
?         AGENT SERVICE ? Connexion FinGPT Local (Port 1234)                  ?
?   Prompt systemique avance ? Injection RAG ? Analyse risque                 ?
????????????????????????????????????????????????????????????????????????????????

Connexion a l API LLM locale (compatible OpenAI) :
  URL  : http://localhost:1234/v1
  Model: fingpt-mt-llama-3-8b-lora

Usage :
    from agent_service import FinGPTAgent
    agent = FinGPTAgent()
    response = await agent.analyze(market_state)
"""

import asyncio
import gc
import json
import logging
import os
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, List, Any

import httpx

AI_DIR   = Path(__file__).parent
LOGS_DIR = AI_DIR / "logs"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(LOGS_DIR / "agent_service.log", mode="w", encoding="utf-8"),
    ],
)
log = logging.getLogger(__name__)

# ─── Configuration FinGPT / LLM Local ──────────────────────────────────────────
FINGPT_BASE_URL   = os.getenv("FINGPT_BASE_URL", "http://localhost:1234/v1")
FINGPT_MODEL      = os.getenv("FINGPT_MODEL", "qwen2.5-7b-instruct-1m")
FINGPT_TIMEOUT    = float(os.getenv("FINGPT_TIMEOUT", "120.0"))      # secondes
FINGPT_MAX_TOKENS = int(os.getenv("FINGPT_MAX_TOKENS", "350"))
FINGPT_TEMP       = float(os.getenv("FINGPT_TEMP", "0.3"))        # temperature basse pour coherence financiere


# ????????????????????????????????????????????????????????????????????????????
#  DATA STRUCTURES ? Etat du simulateur
# ????????????????????????????????????????????????????????????????????????????

@dataclass
class MarketState:
    """État courant du simulateur de salle de marché."""
    # Métadonnées
    simulation_date:  str
    ticker:           str
    bank_type:        str = "conventional"  # "conventional" ou "islamic"

    # Prix OHLCV
    open:    float = 0.0
    high:    float = 0.0
    low:     float = 0.0
    close:   float = 0.0
    volume:  float = 0.0

    # Indicateurs techniques & Volatilité ATR
    sma_20:         float = 0.0
    sma_50:         float = 0.0
    rsi_14:         float = 50.0
    macd:           float = 0.0
    macd_signal:    float = 0.0
    macd_hist:      float = 0.0
    atr_14:         float = 0.0
    volatility_30d: float = 0.0

    # Signal du modèle XGBoost 3-Classes (-1 Vente, 0 Neutre, +1 Achat)
    ml_signal:         str   = "NEUTRAL"   # "BULLISH", "BEARISH", "NEUTRAL"
    ml_prediction:     int   = 0           # -1, 0, 1
    ml_confidence:     float = 0.5
    ml_probabilities:  Dict[str, float] = field(default_factory=lambda: {"sell": 0.33, "neutral": 0.34, "buy": 0.33})

    # Sentiment agrégé des actualités publiées jusqu'à la date (-1 à +1)
    sentiment_score: float = 0.0
    sentiment_label: str   = "NEUTRAL"

    # Contextes RAG (Réglementaire Bâle III/Islamique & Macro BCT/BVMT)
    rag_context:   str = ""
    macro_context: str = ""

    # Position actuelle du trader
    current_position: str   = "NONE"   # "LONG", "SHORT", "NONE"
    unrealized_pnl:   float = 0.0

    def to_dict(self) -> Dict:
        return {k: v for k, v in self.__dict__.items()}


@dataclass
class AgentResponse:
    """Réponse structurée de l'agent FinGPT."""
    raw_text:         str
    recommendation:   str  = "HOLD"     # BUY, SELL, HOLD
    confidence:       str  = "MEDIUM"   # LOW, MEDIUM, HIGH
    risk_level:       str  = "MODERATE" # LOW, MODERATE, HIGH, VERY HIGH
    key_factors:      List[str] = field(default_factory=list)
    compliance_note:  str  = ""         # Note spécifique banque islamique
    error:            Optional[str] = None
    latency_ms:       float = 0.0


# ════════════════════════════════════════════════════════════════════════════
#  PROMPT ENGINEERING
# ════════════════════════════════════════════════════════════════════════════

SYSTEM_PROMPT_CONVENTIONAL = """Tu es FinGPT, un agent IA expert en finance quantitative de marché, gestion actif-passif et risques bancaires (Bâle III).
Tu analyses l'état du marché, la prédiction du modèle XGBoost 3-classes (-1 Vente, 0 Neutre, +1 Achat calibré par ATR), le sentiment des actualités publiées jusqu'à la date et les contextes macroéconomiques (BCT/BVMT).

Tes réponses DOIVENT impérativement suivre cette structure :
1. **ANALYSE TECHNIQUE & VOLATILITÉ (ATR)** : Interprète la tendance SMA, le RSI, le MACD et la volatilité ATR.
2. **SIGNAL PRÉDICTIF XGBOOST (3 CLASSES)** : Analyse le signal (-1, 0, +1) et sa distribution de probabilités.
3. **SYNTHÈSE MACROÉCONOMIQUE & SENTIMENT NLP** : Analyse l'impact des taux (TMM/BCT), de l'inflation et du score de sentiment.
4. **RECOMMANDATION D'ACTION TRADING** : BUY / SELL / HOLD claire, argumentée et orientée gestion des risques.
5. **PROFIL DE RISQUE & BÂLE III** : Niveau de risque (LOW/MODERATE/HIGH/VERY HIGH) et contrainte prudentielle.

Sois précis, quantitatif, factuel et orienté prise de décision."""

SYSTEM_PROMPT_ISLAMIC = """Tu es FinGPT, un agent IA expert en finance quantitative de marché et conformité Charia (Normes AAOIFI & IFSB).
Tu analyses l'état du marché, la prédiction XGBoost 3-classes (-1 Vente, 0 Neutre, +1 Achat calibré par ATR), le sentiment des actualités publiées jusqu'à la date et les contextes macroéconomiques.

Tes réponses DOIVENT impérativement suivre cette structure :
1. **ANALYSE TECHNIQUE & VOLATILITÉ (ATR)** : Interprète la tendance SMA, le RSI, le MACD et la volatilité ATR.
2. **SIGNAL PRÉDICTIF XGBOOST (3 CLASSES)** : Analyse le signal (-1, 0, +1) et sa distribution de probabilités.
3. **CONFORMITÉ CHARIA & RISQUE ÉTHIQUE** : Évalue l'interdiction du Riba, Gharar, Maysir et les structures contractuelles (Murabaha/Mudaraba/Sukuk).
4. **RECOMMANDATION D'ACTION TRADING** : BUY / SELL / HOLD strictement compatible Charia.
5. **PROFIL DE RISQUE GLOBAL** : Niveau de risque financier et de conformité réglementaire IFSB.

Sois rigoureux, éthique et orienté action."""


def build_user_prompt(state: MarketState) -> str:
    """Construit le prompt utilisateur complet combinant toutes les sources d'information."""

    # Tendance SMA
    if state.sma_20 > state.sma_50:
        sma_trend = "HAUSSIÈRE (SMA20 > SMA50)"
    elif state.sma_20 < state.sma_50:
        sma_trend = "BAISSIÈRE (SMA20 < SMA50)"
    else:
        sma_trend = "NEUTRE"

    # Zone RSI
    if state.rsi_14 > 70:
        rsi_zone = f"{state.rsi_14:.1f} → SURACHETÉ (>70)"
    elif state.rsi_14 < 30:
        rsi_zone = f"{state.rsi_14:.1f} → SURVENDU (<30)"
    else:
        rsi_zone = f"{state.rsi_14:.1f} → NEUTRE (30-70)"

    macd_signal = "HAUSSIER" if state.macd > state.macd_signal else "BAISSIER"

    probs = state.ml_probabilities
    prob_str = f"P(Vente -1)={probs.get('sell', 0.0):.1%} | P(Neutre 0)={probs.get('neutral', 0.0):.1%} | P(Achat +1)={probs.get('buy', 0.0):.1%}"

    prompt = f"""
=== ÉTAT DU SIMULATEUR DE SALLE DE MARCHÉ — {state.simulation_date} ===

ACTIF ANALYSÉ : {state.ticker}
Type d'Institution : {state.bank_type.upper()}

--- DONNÉES DE MARCHÉ & COURS ---
Open  : {state.open:.4f} | High : {state.high:.4f} | Low : {state.low:.4f} | Close : {state.close:.4f}
Volume: {state.volume:,.0f}

--- INDICATEURS TECHNIQUES & VOLATILITÉ ATR ---
SMA(20)          : {state.sma_20:.4f}
SMA(50)          : {state.sma_50:.4f}
Tendance SMA     : {sma_trend}
RSI(14)          : {rsi_zone}
MACD             : {state.macd:.6f} (Signal: {state.macd_signal:.6f}, Hist: {state.macd_hist:.6f})
Croisement MACD  : {macd_signal}
ATR(14)          : {state.atr_14:.4f} (Seuil de bruit de marché ±1.5x ATR)
Volatilité 30j   : {state.volatility_30d:.2f}% (annualisée)

--- PRÉDICTION MODÈLE IA XGBOOST (3 CLASSES) ---
Statut Signal    : {"ACTIF (Signal confirmé par seuil ≥ 60%)" if state.ml_prediction != 0 else "NEUTRE / ATTENTE (Confiance insuffisante sous le seuil de 60% ou marché indécis)"}
Signal Modèle    : {state.ml_signal} (Classe {state.ml_prediction:+d})
Confiance        : {state.ml_confidence:.1%}
Distribution     : {prob_str}

--- SENTIMENT DES ACTUALITÉS (lexique financier) ---
Score Sentiment  : {state.sentiment_score:+.3f} ({state.sentiment_label})

--- CONTEXTE MACROÉCONOMIQUE & BCT (RAG WEB) ---
{state.macro_context if state.macro_context else "Données macroéconomiques de référence BCT/BVMT alignées sur la date simulée."}

--- CONTEXTE RÉGLEMENTAIRE & PRUDENTIEL (RAG) ---
{state.rag_context if state.rag_context else "Normes Bâle III et ratios prudentiels applicables."}

--- POSITION COURANTE DU TRADER ---
Position Actuelle: {state.current_position}
P&L Non Réalisé  : {state.unrealized_pnl:+.2f}

=== MISSION TRADING ===
Formule une note d'analyse synthétique, argumentée et une recommandation opérationnelle (BUY / SELL / HOLD) pour le desk de trading.
"""
    return prompt.strip()


def parse_agent_response(raw: str) -> AgentResponse:
    """
    Parse la reponse brute du LLM pour extraire la recommandation structuree.
    Utilise des heuristiques robustes.
    """
    text_upper = raw.upper()

    # Recommandation
    if any(kw in text_upper for kw in ["STRONG BUY", "ACHAT FORT", "BUY FORT"]):
        recommendation = "BUY"
    elif "BUY" in text_upper or "ACHAT" in text_upper or "ACQUERIR" in text_upper:
        recommendation = "BUY"
    elif any(kw in text_upper for kw in ["SELL", "VENTE", "CESSION", "SORTIR"]):
        recommendation = "SELL"
    else:
        recommendation = "HOLD"

    # Niveau de confiance
    if any(kw in text_upper for kw in ["TRES CONFIANT", "HAUTEMENT", "FORTE CONVICTION", "HIGH CONFIDENCE"]):
        confidence = "HIGH"
    elif any(kw in text_upper for kw in ["PEU CONFIANT", "INCERTAIN", "LOW CONFIDENCE", "FAIBLE"]):
        confidence = "LOW"
    else:
        confidence = "MEDIUM"

    # Niveau de risque
    if any(kw in text_upper for kw in ["TRES ELEVE", "VERY HIGH", "EXTREME"]):
        risk_level = "VERY HIGH"
    elif any(kw in text_upper for kw in ["ELEVE", "HIGH RISK", "RISQUE IMPORTANT"]):
        risk_level = "HIGH"
    elif any(kw in text_upper for kw in ["FAIBLE", "LOW RISK", "RISQUE FAIBLE"]):
        risk_level = "LOW"
    else:
        risk_level = "MODERATE"

    # Compliance islamique
    compliance_note = ""
    if any(kw in text_upper for kw in ["CHARIA", "ISLAMIQUE", "RIBA", "HALAL", "HARAM"]):
        # Extraire la section compliance si possible
        lines = raw.split("\n")
        for i, line in enumerate(lines):
            if any(kw in line.upper() for kw in ["CHARIA", "CONFORMITE", "ISLAMIQUE"]):
                compliance_note = "\n".join(lines[i:i+3]).strip()
                break

    return AgentResponse(
        raw_text=raw,
        recommendation=recommendation,
        confidence=confidence,
        risk_level=risk_level,
        key_factors=[],
        compliance_note=compliance_note,
    )


# ????????????????????????????????????????????????????????????????????????????
#  FINGPT AGENT ? Client asynchrone
# ????????????????????????????????????????????????????????????????????????????

class FinGPTAgent:
    """
    Client asynchrone pour l API FinGPT locale.
    Compatible OpenAI API format (LM Studio / Ollama / llama.cpp).
    """

    def __init__(
        self,
        base_url: str = FINGPT_BASE_URL,
        model: str = FINGPT_MODEL,
        timeout: float = FINGPT_TIMEOUT,
    ):
        self.base_url  = base_url.rstrip("/")
        self.model     = model
        self.timeout   = timeout
        self._client   = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=httpx.Timeout(timeout),
            headers={"Content-Type": "application/json"},
        )
        log.info(f"[AGENT] FinGPTAgent initialise ? {self.base_url} | Model: {self.model}")

    async def is_available(self) -> bool:
        """Verifie si le serveur LLM est accessible et adapte le modele si necessaire."""
        try:
            resp = await self._client.get("/models", timeout=5.0)
            if resp.status_code == 200:
                data = resp.json()
                models = [m.get("id") for m in data.get("data", []) if isinstance(m, dict) and "id" in m]
                if models and self.model not in models:
                    # Trouver le premier modèle de chat approprié (ex: qwen, llama, etc.)
                    chat_model = next((m for m in models if "embed" not in m.lower()), models[0])
                    log.info(f"[AGENT] Modele '{self.model}' non listé, bascule automatique vers le modèle actif '{chat_model}'")
                    self.model = chat_model
                return True
            return False
        except Exception:
            return False

    async def _call_llm(self, system_prompt: str, user_prompt: str) -> tuple[str, float]:
        """
        Appel non bloquant a l API OpenAI-compatible.
        Retourne (texte_reponse, latence_ms).
        """
        import time
        payload = {
            "model":       self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            "max_tokens":   FINGPT_MAX_TOKENS,
            "temperature":  FINGPT_TEMP,
            "stream":       False,
        }

        t0 = time.perf_counter()
        resp = await self._client.post("/chat/completions", json=payload)
        latency_ms = (time.perf_counter() - t0) * 1000

        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        return content, latency_ms

    async def analyze(self, state: MarketState) -> AgentResponse:
        """
        Analyse complete d un etat de marche.
        Retourne une AgentResponse structuree.
        """
        log.info(f"[AGENT] Analyse {state.ticker} ({state.simulation_date}) ? {state.bank_type}")

        # Selection du prompt systeme selon type de banque
        system_prompt = (
            SYSTEM_PROMPT_ISLAMIC
            if state.bank_type == "islamic"
            else SYSTEM_PROMPT_CONVENTIONAL
        )
        user_prompt = build_user_prompt(state)

        # Vérifier disponibilité avant d'appeler
        if not await self.is_available():
            log.warning("[AGENT] LLM non disponible (localhost:1234). Moteur quantitatif de secours actif.")
            reco = "BUY" if state.ml_signal == "BULLISH" else ("SELL" if state.ml_signal == "BEARISH" else "HOLD")
            conf = "HIGH" if state.ml_confidence > 0.60 else ("MEDIUM" if state.ml_confidence > 0.40 else "LOW")
            risk = "HIGH" if state.volatility_30d > 45 else ("MODERATE" if state.volatility_30d > 25 else "LOW")

            note = f"""[NOTE D'ANALYSE FINANCIÈRE QUANTITATIVE]
Actif : {state.ticker} | Date : {state.simulation_date} | Type : {state.bank_type.upper()}

1. SIGNAL TECHNIQUE & DYNAMIQUE ATR :
- Cours actuel : {state.close:.4f} (SMA20={state.sma_20:.4f}, RSI14={state.rsi_14:.1f}, Volatilité={state.volatility_30d:.1f}%).
- Indicateur ATR(14) : {state.atr_14:.4f}. Les micro-mouvements sous ±1.5x ATR sont filtrés comme bruit de marché.

2. PRÉDICTION MODÈLE XGBOOST (3 CLASSES) :
- Signal : {state.ml_signal} (Classe {state.ml_prediction:+d}) avec confiance de {state.ml_confidence:.1%}.
- Répartition des probabilités : Vente={state.ml_probabilities.get('sell', 0):.1%} | Neutre={state.ml_probabilities.get('neutral', 0):.1%} | Achat={state.ml_probabilities.get('buy', 0):.1%}.

3. SENTIMENT DES ACTUALITÉS :
- Sentiment des actualités : {state.sentiment_score:+.3f} ({state.sentiment_label}).

4. RECOMMANDATION OPÉRATIONNELLE : {reco}
- Justification : Conviction {conf} basée sur la convergence du signal XGBoost et des filtres de volatilité ATR.
- Profil de risque : {risk}."""

            return AgentResponse(
                raw_text=note,
                recommendation=reco,
                confidence=conf,
                risk_level=risk,
                compliance_note="Note quantitative générée sans LLM : aucune analyse de conformité (charia ou prudentielle) n'a été effectuée.",
                error="LLM hors-ligne (moteur quantitatif autonome exécuté)",
            )

        try:
            raw_text, latency_ms = await self._call_llm(system_prompt, user_prompt)
            log.info(f"[AGENT] Reponse recue en {latency_ms:.0f}ms ({len(raw_text)} chars)")

            response = parse_agent_response(raw_text)
            response.latency_ms = latency_ms
            return response

        except httpx.TimeoutException:
            log.error("[AGENT] Timeout lors de l appel LLM")
            return AgentResponse(
                raw_text="[TIMEOUT] L appel au LLM a depasse la limite de temps.",
                recommendation="HOLD",
                confidence="LOW",
                risk_level="HIGH",
                error="Timeout",
            )
        except Exception as e:
            log.error(f"[AGENT] Erreur inattendue : {e}")
            return AgentResponse(
                raw_text=f"[ERREUR] {str(e)}",
                recommendation="HOLD",
                confidence="LOW",
                risk_level="HIGH",
                error=str(e),
            )

    async def quick_sentiment(self, text: str) -> Dict:
        """
        Analyse de sentiment rapide sur un texte financier (news, rapport).
        Retourne {"score": float, "label": str, "summary": str}
        """
        system = "Tu es un analyste de sentiment financier. Analyse le texte et reponds UNIQUEMENT en JSON: {\"score\": float entre -1 et 1, \"label\": \"POSITIVE\"|\"NEGATIVE\"|\"NEUTRAL\", \"summary\": \"resume en 1 phrase\"}"
        user   = f"Texte a analyser:\n{text[:1000]}"

        if not await self.is_available():
            return {"score": 0.0, "label": "NEUTRAL", "summary": "LLM non disponible"}

        try:
            raw, _ = await self._call_llm(system, user)
            # Extraire le JSON de la reponse
            import re
            json_match = re.search(r'\{[^}]+\}', raw, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
        except Exception:
            pass
        return {"score": 0.0, "label": "NEUTRAL", "summary": "Erreur d analyse"}

    async def close(self):
        """Ferme le client HTTP proprement."""
        await self._client.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self.close()


# ????????????????????????????????????????????????????????????????????????????
#  FONCTIONS UTILITAIRES ? Appels synchrones et ciblés
# ????????????????????????????????????????????????????????????????????????????

def analyze_sync(state: MarketState) -> AgentResponse:
    """Wrapper synchrone pour appeler l agent depuis du code non-async."""
    async def _run():
        async with FinGPTAgent() as agent:
            return await agent.analyze(state)
    return asyncio.run(_run())


async def analyze_market_targeted(
    ticker: str,
    simulation_date: str,
    raw_features: Dict[str, Any],
    sentiment_score: float = 0.0,
    confidence_threshold: float = 0.60,
    rag_top_k: int = 3,
) -> Dict[str, Any]:
    """
    Pipeline de recommandation d'actif pour trader avec RAG strictement ciblé marché :
      - Inférence ML 3-classes calibrée (seuil >= confidence_threshold)
      - Récupération documentaire RAG ChromaDB filtrée : where={"domain": "market"}
      - Exclut rigoureusement tout texte de finance islamique ou ratios Bâle III hors sujet
      - Synthèse transmise à FinGPT (localhost:1234)
    """
    from train_model import predict as ml_predict
    from rag_engine import get_rag_engine

    # 1. Inférence calibrée 3-classes
    pred_res = ml_predict(raw_features, confidence_threshold=confidence_threshold)

    # 2. Récupération documentaire ciblée Marché & Trading
    rag_engine = get_rag_engine()
    market_query = f"conditions marché boursier taux TMM inflation conjoncture {ticker}"
    market_context = rag_engine.query_market_context(
        query=market_query,
        simulation_date=simulation_date,
        top_k=rag_top_k,
    )

    # 3. Assembler le MarketState avec contexte épuré
    probs = pred_res.get("probabilities", {"sell": 0.33, "neutral": 0.34, "buy": 0.33})
    state = MarketState(
        simulation_date=simulation_date,
        ticker=ticker,
        bank_type="conventional",
        open=float(raw_features.get("open", 0.0)),
        high=float(raw_features.get("high", 0.0)),
        low=float(raw_features.get("low", 0.0)),
        close=float(raw_features.get("close", 0.0)),
        volume=float(raw_features.get("volume", 0.0)),
        sma_20=float(raw_features.get("sma_20", 0.0)),
        sma_50=float(raw_features.get("sma_50", 0.0)),
        rsi_14=float(raw_features.get("rsi_14", 50.0)),
        macd=float(raw_features.get("macd", 0.0)),
        macd_signal=float(raw_features.get("macd_signal", 0.0)),
        macd_hist=float(raw_features.get("macd_hist", 0.0)),
        atr_14=float(raw_features.get("atr_14", 0.0)),
        volatility_30d=float(raw_features.get("volatility_30d", 0.0)),
        ml_signal=pred_res.get("signal", "NEUTRAL"),
        ml_prediction=pred_res.get("prediction", 0),
        ml_confidence=pred_res.get("confidence", 0.5),
        ml_probabilities=probs,
        sentiment_score=sentiment_score,
        sentiment_label="POSITIVE" if sentiment_score > 0.1 else ("NEGATIVE" if sentiment_score < -0.1 else "NEUTRAL"),
        rag_context="",  # Normes prudentielles non requises pour analyse pure marché
        macro_context=market_context,  # Contexte RAG épuré BCT/BVMT/Macro
    )

    # 4. Analyse FinGPT
    async with FinGPTAgent() as agent:
        agent_resp = await agent.analyze(state)

    return {
        "ticker": ticker,
        "simulation_date": simulation_date,
        "calibrated_signal": pred_res,
        "macro_context": market_context,
        "agent_response": agent_resp,
    }


def analyze_market_targeted_sync(
    ticker: str,
    simulation_date: str,
    raw_features: Dict[str, Any],
    sentiment_score: float = 0.0,
    confidence_threshold: float = 0.60,
    rag_top_k: int = 3,
) -> Dict[str, Any]:
    """Wrapper synchrone pour analyze_market_targeted."""
    return asyncio.run(
        analyze_market_targeted(
            ticker=ticker,
            simulation_date=simulation_date,
            raw_features=raw_features,
            sentiment_score=sentiment_score,
            confidence_threshold=confidence_threshold,
            rag_top_k=rag_top_k,
        )
    )


# ????????????????????????????????????????????????????????????????????????????
#  POINT D ENTREE ? TEST
# ????????????????????????????????????????????????????????????????????????????

if __name__ == "__main__":
    # Test avec un etat de marche fictif
    test_state = MarketState(
        simulation_date="2024-01-15",
        ticker="BNB-USD",
        bank_type="islamic",
        open=315.50,
        high=322.00,
        low=312.80,
        close=318.75,
        volume=1_250_000,
        sma_20=310.20,
        sma_50=298.50,
        rsi_14=62.5,
        macd=3.45,
        macd_signal=2.10,
        macd_hist=1.35,
        volatility_30d=42.3,
        ml_signal="BULLISH",
        ml_prediction=1,
        ml_confidence=0.68,
        ml_probabilities={"sell": 0.12, "neutral": 0.20, "buy": 0.68},
        sentiment_score=0.35,
        sentiment_label="POSITIVE",
        rag_context="[Extrait RAG] Risque Murabaha : la banque doit surveiller le risque de contrepartie...",
        current_position="NONE",
        unrealized_pnl=0.0,
    )

    print("Test FinGPT Agent ? Mode ISLAMIQUE")
    print("="*60)
    response = analyze_sync(test_state)
    print(f"Recommandation : {response.recommendation}")
    print(f"Confiance      : {response.confidence}")
    print(f"Risque         : {response.risk_level}")
    print(f"Latence        : {response.latency_ms:.0f}ms")
    if response.compliance_note:
        print(f"Conformite     : {response.compliance_note}")
    print(f"\nAnalyse :\n{response.raw_text}")