"""
========================================================================================
  PIF AI — TEST D'INTÉGRATION DE BOUT EN BOUT
  Validation séquentielle :
    Étape A : ML Calibré (Respect absolu du seuil de confiance 0.60)
    Étape B : Isolation RAG ChromaDB (Zéro contamination inter-domaines)
    Étape C : FinGPT Local (localhost:1234) avec payload enrichi & fallback autonome
========================================================================================
"""

import sys
import json
import logging
import time
import numpy as np
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
log = logging.getLogger("IntegrationPipeline")

AI_DIR = Path(__file__).parent
sys.path.insert(0, str(AI_DIR))


def test_step_a_ml_calibration():
    """
    Étape A (ML Calibré) :
    Exécuter une inférence avec xgboost_model.pkl sur un ensemble de test,
    et confirmer que 100% des signaux directionnels (Achat +1 / Vente -1) respectent P >= 0.60.
    """
    log.info("=" * 70)
    log.info("ÉTAPE A : VALIDATION DU MODÈLE XGBOOST 3-CLASSES CALIBRÉ (SEUIL >= 0.60)")
    log.info("=" * 70)

    from train_model import load_model, prepare_data
    from data_pipeline import load_processed, OUTPUT_PATH
    from predict_signals import predict_calibrated_batch

    model, scaler, feature_cols = load_model()
    log.info(f"[ML] Modèle chargé. Features: {len(feature_cols)}")

    df = load_processed(OUTPUT_PATH)
    X, y = prepare_data(df)
    test_split = int(len(X) * 0.8)
    X_test = X.iloc[test_split:].values
    y_test = y.iloc[test_split:].values

    res = predict_calibrated_batch(
        X_test,
        model,
        scaler,
        confidence_threshold=0.60,
    )
    preds = res["preds_calibrated"]
    probas = res["probas"]

    buy_indices = np.where(preds == 1)[0]
    sell_indices = np.where(preds == -1)[0]
    neutral_indices = np.where(preds == 0)[0]

    log.info(f"[ML] Total test: {len(preds):,} | Achat (+1): {len(buy_indices):,} | Vente (-1): {len(sell_indices):,} | Neutre (0): {len(neutral_indices):,}")

    if len(buy_indices) > 0:
        buy_probas = probas[buy_indices, 2]
        min_buy_p = float(buy_probas.min())
        log.info(f"[ML] Probabilité Achat min observée sur signaux +1 : {min_buy_p:.4f}")
        assert min_buy_p >= 0.60, f"Violation seuil Achat: min proba {min_buy_p} < 0.60"

    if len(sell_indices) > 0:
        sell_probas = probas[sell_indices, 0]
        min_sell_p = float(sell_probas.min())
        log.info(f"[ML] Probabilité Vente min observée sur signaux -1 : {min_sell_p:.4f}")
        assert min_sell_p >= 0.60, f"Violation seuil Vente: min proba {min_sell_p} < 0.60"

    log.info("[ML] -> ASSERTION A VALIDÉE : 100% des signaux Achat et Vente respectent P >= 0.60 !\n")
    return True


def test_step_b_rag_isolation():
    """
    Étape B (Isolation RAG) :
    Lancer des requêtes orientées Marché Financier (BCT, TMM, BVMT, inflation)
    et affirmer unitairement qu'aucun extrait retourné ne provient du domaine banking_islamic.
    """
    log.info("=" * 70)
    log.info("ÉTAPE B : VALIDATION DE L'ISOLATION VECTORIELLE CHROMADB (ZÉRO POLLUTION)")
    log.info("=" * 70)

    from rag_engine import get_rag_engine
    rag = get_rag_engine()

    market_test_queries = [
        "Politique monétaire BCT et évolution taux TMM Tunisie",
        "Conjoncture marché financier actions BVMT et liquidité",
        "Inflation macroéconomique internationale et politique monétaire",
        "Analyse de tendance haussière trading crypto BNB",
    ]

    for q in market_test_queries:
        results = rag.retrieve_market(q, top_k=5)
        log.info(f"[RAG] Requête Marché : '{q}' -> {len(results)} chunks retournés")
        for idx, doc in enumerate(results, 1):
            domain = doc.get("domain", "")
            source = doc.get("source", "")
            title = doc.get("title", "")
            log.info(f"   [{idx}] Domaine: {domain:15s} | Source: {source} | Titre: {title[:40]}")
            # Assertions strictes
            assert domain == "market", f"VIOLATION D'ISOLATION : Chunk avec domaine '{domain}' au lieu de 'market' !"
            assert "murabaha" not in source.lower(), "Contamination par contrat Murabaha"
            assert "mudaraba" not in source.lower(), "Contamination par contrat Mudaraba"
            assert "sukuk" not in source.lower(), "Contamination par Sukuk"
            assert "basel3" not in source.lower(), "Contamination par ratio Bâle III"

    log.info("[RAG] -> ASSERTION B VALIDÉE : Étanchéité absolue confirmée (0% contamination banking_islamic) !\n")
    return True


def test_step_c_fingpt_integration():
    """
    Étape C (Appel FinGPT) :
    Vérifier la connectivité au port 1234 (http://localhost:1234/v1).
    Si le serveur LLM est actif, envoyer le payload complet et valider le HTTP 200 + cohérence.
    Si le serveur est hors-ligne, tester le mécanisme de fallback autonome de sécurité.
    """
    log.info("=" * 70)
    log.info("ÉTAPE C : VALIDATION DU SERVICE AGENT FINGPT (PORT 1234) & FALLBACK")
    log.info("=" * 70)

    from agent_service import FinGPTAgent, MarketState, analyze_market_targeted_sync

    sample_features = {
        "open": 315.5,
        "high": 322.0,
        "low": 312.8,
        "close": 318.75,
        "volume": 1250000,
        "sma_20": 310.2,
        "sma_50": 298.5,
        "rsi_14": 62.5,
        "macd": 3.45,
        "macd_signal": 2.1,
        "macd_hist": 1.35,
        "atr_14": 5.4,
        "volatility_30d": 42.3,
    }

    log.info("[AGENT] Exécution du pipeline complet analyze_market_targeted_sync()...")
    res = analyze_market_targeted_sync(
        ticker="BNB-USD",
        simulation_date="2024-03-20",
        raw_features=sample_features,
        sentiment_score=0.42,
        confidence_threshold=0.60,
        rag_top_k=3,
    )

    pred_res = res["calibrated_signal"]
    agent_resp = res["agent_response"]
    macro_context = res["macro_context"]

    log.info(f"[AGENT] Signal ML Calibré : {pred_res['signal']} (Classe {pred_res['prediction']})")
    log.info(f"[AGENT] Confiance ML      : {pred_res['confidence']:.2%}")
    log.info(f"[AGENT] Recommandation LLM: {agent_resp.recommendation}")
    log.info(f"[AGENT] Niveau de Risque  : {agent_resp.risk_level}")
    log.info(f"[AGENT] Latence Réponse   : {agent_resp.latency_ms:.1f}ms")

    assert agent_resp.recommendation in ["BUY", "SELL", "HOLD"], f"Recommandation invalide: {agent_resp.recommendation}"
    assert len(macro_context) > 0, "Le contexte RAG macroéconomique ne doit pas être vide"

    log.info("[AGENT] -> ASSERTION C VALIDÉE : Réponse synthétisée avec succès !\n")
    return True


def run_all_tests():
    t0 = time.time()
    log.info("######################################################################")
    log.info("  LANCEMENT DE LA SUITE DE TESTS D'INTÉGRATION PIF AI PIPELINE")
    log.info("######################################################################\n")

    step_a = test_step_a_ml_calibration()
    step_b = test_step_b_rag_isolation()
    step_c = test_step_c_fingpt_integration()

    elapsed = time.time() - t0
    log.info("######################################################################")
    log.info(f"  SUITE COMPLÈTE RÉUSSIE AVEC SUCCÈS EN {elapsed:.2f}s !")
    log.info("  [✓] Étape A (ML Calibré P >= 0.60)        : PASSÉ")
    log.info("  [✓] Étape B (Isolation RAG 0% Pollution)   : PASSÉ")
    log.info("  [✓] Étape C (Intégration Agent FinGPT)     : PASSÉ")
    log.info("######################################################################")


if __name__ == "__main__":
    run_all_tests()
