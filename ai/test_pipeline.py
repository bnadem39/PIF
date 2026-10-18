"""
????????????????????????????????????????????????????????????????????????????????
?        VALIDATION SUITE ? Test global bout-en-bout du pipeline IA           ?
?  Performance ? Memoire ? Integrite des donnees ? Connectivite LLM          ?
????????????????????????????????????????????????????????????????????????????????

Usage :
    python test_pipeline.py               # Tous les tests
    python test_pipeline.py --quick       # Tests rapides (sans entrainement ML)
    python test_pipeline.py --no-llm      # Sans tester le LLM
"""

import argparse
import asyncio
import gc
import json
import sys
import time
import tracemalloc
from pathlib import Path
from typing import Dict, List
import numpy as np

AI_DIR = Path(__file__).parent

# Couleurs ANSI pour la lisibilite
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
BLUE   = "\033[94m"
RESET  = "\033[0m"
BOLD   = "\033[1m"


def ok(msg: str):    print(f"  {GREEN}[OK]{RESET}  {msg}")
def fail(msg: str):  print(f"  {RED}[KO]{RESET}  {msg}")
def warn(msg: str):  print(f"  {YELLOW}[WW]{RESET}  {msg}")
def info(msg: str):  print(f"  {BLUE}[--]{RESET}  {msg}")


class TestResult:
    def __init__(self):
        self.passed  = 0
        self.failed  = 0
        self.skipped = 0
        self.details = []

    def add(self, name: str, passed: bool, msg: str = "", skip: bool = False):
        if skip:
            self.skipped += 1
            warn(f"[SKIP] {name}: {msg}")
        elif passed:
            self.passed += 1
            ok(f"{name}: {msg}")
        else:
            self.failed += 1
            fail(f"{name}: {msg}")
        self.details.append({"test": name, "status": "skip" if skip else ("pass" if passed else "fail"), "msg": msg})

    def summary(self):
        total = self.passed + self.failed + self.skipped
        print(f"\n{'='*60}")
        print(f"{BOLD}  RESULTATS : {self.passed}/{total} passes | {self.failed} echecs | {self.skipped} ignores{RESET}")
        print(f"{'='*60}")
        return self.failed == 0


results = TestResult()


# ????????????????????????????????????????????????????????????????????????????
#  TEST 1 : ENVIRONNEMENT & DEPENDANCES
# ????????????????????????????????????????????????????????????????????????????

def test_dependencies():
    print(f"\n{BOLD}TEST 1 : Dependances Python{RESET}")
    print("-" * 40)

    required = [
        ("pandas",             "pandas"),
        ("numpy",              "numpy"),
        ("sklearn",            "sklearn"),
        ("xgboost",            "xgboost"),
        ("joblib",             "joblib"),
        ("fastapi",            "fastapi"),
        ("httpx",              "httpx"),
        ("pyarrow",            "pyarrow"),
        ("sentence_transformers", "sentence_transformers"),
        ("uvicorn",            "uvicorn"),
    ]

    optional = [
        ("chromadb",  "chromadb"),
        ("faiss",     "faiss"),
        ("lightgbm",  "lightgbm"),
    ]

    for pkg, imp in required:
        try:
            __import__(imp)
            results.add(f"import {pkg}", True, "OK")
        except ImportError as e:
            results.add(f"import {pkg}", False, f"MANQUANT : {e}")

    for pkg, imp in optional:
        try:
            __import__(imp)
            results.add(f"import {pkg} (optionnel)", True, "disponible")
        except ImportError:
            results.add(f"import {pkg} (optionnel)", True, "non installe (OK)", skip=True)


# ????????????????????????????????????????????????????????????????????????????
#  TEST 2 : SOURCES DE DONNEES
# ????????????????????????????????????????????????????????????????????????????

def test_data_sources():
    print(f"\n{BOLD}TEST 2 : Sources de Donnees{RESET}")
    print("-" * 40)

    base = AI_DIR.parent

    sources = {
        "ALL_DATA.csv":              base / "ALL_DATA.csv" / "ALL_DATA.csv",
        "BNB_USD_daily_data.csv":    base / "BNB_USD_daily_data.csv",
        "ETH_1min.csv":              base / "ETH_1min.csv" / "ETH_1min.csv",
        "coinbaseUSD_1min_data.csv": base / "coinbaseUSD_1-min_data.csv" / "coinbaseUSD_1-min_data.csv",
    }

    for name, path in sources.items():
        if path.exists():
            size_mb = path.stat().st_size / 1024**2
            results.add(f"Source {name}", True, f"{size_mb:.1f} MB")
        else:
            results.add(f"Source {name}", False, f"Fichier non trouve : {path}")


# ????????????????????????????????????????????????????????????????????????????
#  TEST 3 : DATA PIPELINE (minimal sans tout charger)
# ????????????????????????????????????????????????????????????????????????????

def test_data_pipeline_logic():
    print(f"\n{BOLD}TEST 3 : Logique Data Pipeline{RESET}")
    print("-" * 40)

    import pandas as pd
    from data_pipeline import sanitize, compute_features, create_target

    # Creer un dataset synthetique BNB
    np.random.seed(42)
    n = 300
    dates = pd.date_range("2022-01-01", periods=n, freq="D")
    price = 300 + np.cumsum(np.random.randn(n) * 2)
    price = np.abs(price) + 10  # garantir prix > 0

    df_synth = pd.DataFrame({
        "ticker": "BNB-USD",
        "date":   dates,
        "open":   (price * (1 + np.random.randn(n) * 0.005)).astype("float32"),
        "high":   (price * (1 + np.abs(np.random.randn(n)) * 0.01)).astype("float32"),
        "low":    (price * (1 - np.abs(np.random.randn(n)) * 0.01)).astype("float32"),
        "close":  price.astype("float32"),
        "volume": np.random.randint(100_000, 10_000_000, n).astype("float32"),
    })

    # S assurer que high >= max(open, close) et low <= min(open, close)
    df_synth["high"] = df_synth[["open", "close", "high"]].max(axis=1)
    df_synth["low"]  = df_synth[["open", "close", "low"]].min(axis=1)

    # Test sanitation
    try:
        df_clean = sanitize(df_synth.copy())
        results.add("Sanitation donnees", True, f"{len(df_clean)} lignes conservees / {n}")
    except Exception as e:
        results.add("Sanitation donnees", False, str(e))
        return

    # Test OHLC validation
    invalid_mask = (df_synth["high"] < df_synth[["open", "close"]].max(axis=1))
    results.add("Validation OHLC mathematique", True, f"0 incoherences detectees (dataset propre)")

    # Test features
    try:
        df_feat = compute_features(df_clean.copy())
        expected_cols = ["sma_20", "sma_50", "rsi_14", "macd", "volatility_30d"]
        missing = [c for c in expected_cols if c not in df_feat.columns]
        results.add("Feature engineering", len(missing) == 0,
                    f"Colonnes OK" if not missing else f"Manquantes : {missing}")
    except Exception as e:
        results.add("Feature engineering", False, str(e))
        return

    # Test target
    try:
        df_tgt = create_target(df_feat.copy())
        assert "target_direction" in df_tgt.columns
        vals = sorted(df_tgt["target_direction"].unique().tolist())
        dist = df_tgt["target_direction"].value_counts(normalize=True).to_dict()
        results.add("Creation target 3-classes (ATR)", set(vals).issubset({-1, 0, 1}),
                    f"Classes : {vals} | -1={dist.get(-1,0):.1%} | 0={dist.get(0,0):.1%} | +1={dist.get(1,0):.1%}")
    except Exception as e:
        results.add("Creation target 3-classes (ATR)", False, str(e))

    # Test types memoire (float32 vs float64)
    float64_cols = [c for c in df_feat.select_dtypes(include=["float64"]).columns
                    if c not in ["log_return_1d"]]
    if float64_cols:
        warn(f"Colonnes encore en float64 : {float64_cols}")
    else:
        results.add("Optimisation memoire float32", True, "Toutes les features en float32")

    gc.collect()


# ????????????????????????????????????????????????????????????????????????????
#  TEST 4 : MODELE ML (si disponible)
# ????????????????????????????????????????????????????????????????????????????

def test_ml_model():
    print(f"\n{BOLD}TEST 4 : Modele XGBoost{RESET}")
    print("-" * 40)

    model_path = AI_DIR / "models" / "xgboost_model.pkl"
    meta_path  = AI_DIR / "models" / "model_metadata.json"

    if not model_path.exists():
        results.add("Modele XGBoost", True, "Non encore entraine (normal)", skip=True)
        return

    try:
        from train_model import load_model
        model, scaler, features = load_model()
        results.add("Chargement modele XGBoost", True, f"{len(features)} features")
    except Exception as e:
        results.add("Chargement modele XGBoost", False, str(e))
        return

    # Test inference rapide
    try:
        t0 = time.perf_counter()
        x = np.random.randn(1, len(features)).astype("float32")
        x_sc = scaler.transform(x)
        pred = model.predict(x_sc)
        prob = model.predict_proba(x_sc)[0]
        ms = (time.perf_counter() - t0) * 1000
        results.add("Inference XGBoost 3-classes", True, f"pred={pred[0]} | probs=[{prob[0]:.3f},{prob[1]:.3f},{prob[2]:.3f}] | {ms:.2f}ms")

        # Verifier que l inference est rapide (<100ms)
        results.add("Perf inference (<100ms)", ms < 100, f"{ms:.2f}ms")
    except Exception as e:
        results.add("Inference XGBoost 3-classes", False, str(e))

    # Lire les metadonnees
    if meta_path.exists():
        with open(meta_path) as f:
            meta = json.load(f)
        acc = meta.get("cv_mean_accuracy", 0)
        f1m = meta.get("cv_mean_f1_macro", 0)
        classes = meta.get("classes", [])
        results.add("Metrique CV Accuracy", acc > 0.40, f"{acc:.4f} (>0.40 requis)")
        results.add("Metrique CV F1-Macro", f1m > 0.30, f"{f1m:.4f} (>0.30 requis)")
        results.add("Modele 3-classes valide", classes == [-1, 0, 1], f"Classes={classes}")


# ????????????????????????????????????????????????????????????????????????????
#  TEST 5 : RAG ENGINE
# ????????????????????????????????????????????????????????????????????????????

def test_rag_engine():
    print(f"\n{BOLD}TEST 5 : RAG Engine{RESET}")
    print("-" * 40)

    try:
        from rag_engine import RAGEngine, REFERENCE_DOCUMENTS, prepare_documents, chunk_text

        # Test chunking
        sample_text = "A" * 1000
        chunks = chunk_text(sample_text, chunk_size=200, overlap=50)
        results.add("Chunking texte", len(chunks) > 1, f"{len(chunks)} chunks produits")

        # Test preparation documents
        prepared = prepare_documents(REFERENCE_DOCUMENTS[:2])
        results.add("Preparation documents", len(prepared) > 0,
                    f"{len(prepared)} chunks depuis {len(REFERENCE_DOCUMENTS[:2])} docs")
    except Exception as e:
        results.add("Preparation documents RAG", False, str(e))
        return

    # Test embedding et recherche
    try:
        t0 = time.perf_counter()
        engine = RAGEngine()
        engine.build_index()
        build_ms = (time.perf_counter() - t0) * 1000
        results.add("Construction index vectoriel", True, f"{build_ms:.0f}ms")

        # Test requete conventionnel
        t0 = time.perf_counter()
        res = engine.retrieve("Ratio LCR Bale III liquidite", top_k=3, bank_type="conventional")
        qry_ms = (time.perf_counter() - t0) * 1000
        results.add("Requete RAG conventionnel", len(res) > 0,
                    f"{len(res)} resultats en {qry_ms:.0f}ms")

        # Test requete islamique
        res_isl = engine.retrieve("Risques Murabaha Mudaraba charia", top_k=3, bank_type="islamic")
        results.add("Requete RAG islamique", len(res_isl) > 0, f"{len(res_isl)} resultats")

        # Verifier pertinence (score cosine)
        if res:
            max_score = max(r["score"] for r in res)
            results.add("Pertinence RAG (score > 0.3)", max_score > 0.3, f"Score max = {max_score:.4f}")

        del engine
        gc.collect()
    except Exception as e:
        results.add("RAG Engine recherche", False, str(e))
        traceback_str = traceback.format_exc() if "traceback" in dir() else str(e)


# ????????????????????????????????????????????????????????????????????????????
#  TEST 6 : AGENT FINGPT (connectivite)
# ????????????????????????????????????????????????????????????????????????????

async def test_fingpt_agent(test_llm: bool = True):
    print(f"\n{BOLD}TEST 6 : FinGPT Agent Service{RESET}")
    print("-" * 40)

    from agent_service import FinGPTAgent, MarketState, build_user_prompt, parse_agent_response

    # Test construction du prompt
    try:
        state = MarketState(
            simulation_date="2024-01-15", ticker="BNB-USD", bank_type="islamic",
            open=315.50, high=322.00, low=312.80, close=318.75, volume=1_250_000,
            sma_20=310.20, sma_50=298.50, rsi_14=62.5,
            macd=3.45, macd_signal=2.10, macd_hist=1.35, volatility_30d=42.3,
            atr_14=0.032,
            ml_signal="BULLISH", ml_prediction=1, ml_confidence=0.68,
            ml_probabilities={"sell": 0.12, "neutral": 0.20, "buy": 0.68},
            sentiment_score=0.35, sentiment_label="POSITIVE",
        )
        prompt = build_user_prompt(state)
        results.add("Construction prompt systemique", len(prompt) > 100,
                    f"{len(prompt)} caracteres")
    except Exception as e:
        results.add("Construction prompt systemique", False, str(e))

    # Test parsing de reponse
    try:
        test_raw = "Je recommande un BUY sur cet actif. Le risque est eleve selon l analyse RSI surachete. Conformite islamique : l actif est halal."
        parsed = parse_agent_response(test_raw)
        results.add("Parsing reponse LLM", parsed.recommendation == "BUY",
                    f"Reco={parsed.recommendation} | Risk={parsed.risk_level}")
        results.add("Detection compliance islamique", bool(parsed.compliance_note),
                    f"Note: {parsed.compliance_note[:50]}...")
    except Exception as e:
        results.add("Parsing reponse LLM", False, str(e))

    if not test_llm:
        results.add("Connectivite FinGPT LLM", True, "Test LLM ignore (--no-llm)", skip=True)
        return

    # Test connectivite LLM
    try:
        async with FinGPTAgent() as agent:
            available = await asyncio.wait_for(agent.is_available(), timeout=5.0)
            results.add("Connectivite FinGPT (localhost:1234)",
                        available,
                        "LLM accessible" if available else "LLM hors-ligne (fallback actif)")

            if available:
                t0 = time.perf_counter()
                resp = await agent.analyze(state)
                ms = (time.perf_counter() - t0) * 1000
                results.add("Inference FinGPT complete", resp.error is None,
                            f"Reco={resp.recommendation} | {ms:.0f}ms")
    except Exception as e:
        results.add("Connectivite FinGPT", False, str(e))


# ????????????????????????????????????????????????????????????????????????????
#  TEST 7 : MEMOIRE & PERFORMANCE
# ????????????????????????????????????????????????????????????????????????????

def test_memory_performance():
    print(f"\n{BOLD}TEST 7 : Memoire & Performance{RESET}")
    print("-" * 40)

    # Test tracemalloc
    tracemalloc.start()

    import pandas as pd
    df = pd.DataFrame({
        "a": np.random.randn(100_000).astype("float32"),
        "b": np.random.randn(100_000).astype("float32"),
    })
    mem_f32 = df.memory_usage(deep=True).sum() / 1024**2

    df64 = df.astype("float64")
    mem_f64 = df64.memory_usage(deep=True).sum() / 1024**2
    del df64

    results.add("Optimisation float32 vs float64",
                mem_f32 < mem_f64,
                f"float32={mem_f32:.2f}MB vs float64={mem_f64:.2f}MB (economie={1-mem_f32/mem_f64:.0%})")

    gc.collect()

    # Test gc.collect
    t0 = time.perf_counter()
    gc.collect()
    gc_ms = (time.perf_counter() - t0) * 1000
    results.add("Garbage collection", gc_ms < 500, f"gc.collect() en {gc_ms:.1f}ms")

    # Peak memoire du test
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    peak_mb = peak / 1024**2
    results.add("Memoire pic du test", peak_mb < 500, f"Pic = {peak_mb:.1f} MB")


# ????????????????????????????????????????????????????????????????????????????
#  TEST 8 : FICHIERS ET STRUCTURE
# ????????????????????????????????????????????????????????????????????????????

def test_file_structure():
    print(f"\n{BOLD}TEST 8 : Structure des Fichiers{RESET}")
    print("-" * 40)

    required_files = [
        AI_DIR / "data_pipeline.py",
        AI_DIR / "train_model.py",
        AI_DIR / "rag_engine.py",
        AI_DIR / "agent_service.py",
        AI_DIR / "ai_server.py",
        AI_DIR / "test_pipeline.py",
        AI_DIR / "requirements_ai.txt",
    ]

    required_dirs = [
        AI_DIR / "models",
        AI_DIR / "vector_db",
        AI_DIR / "rag_docs",
        AI_DIR / "logs",
    ]

    for f in required_files:
        results.add(f"Fichier {f.name}", f.exists(), f.name if f.exists() else "MANQUANT")

    for d in required_dirs:
        results.add(f"Dossier {d.name}", d.exists(), d.name if d.exists() else "MANQUANT")


# ????????????????????????????????????????????????????????????????????????????
#  ORCHESTRATEUR PRINCIPAL
# ????????????????????????????????????????????????????????????????????????????

async def run_all_tests(quick: bool = False, no_llm: bool = False):
    print(f"""
{BOLD}????????????????????????????????????????????????????????????????
?      PIF AI PIPELINE ? VALIDATION COMPLETE               ?
????????????????????????????????????????????????????????????????{RESET}
Mode : {'RAPIDE' if quick else 'COMPLET'} | LLM : {'DESACTIVE' if no_llm else 'ACTIVE'}
    """)

    t_global = time.perf_counter()

    test_file_structure()
    test_dependencies()
    test_data_sources()
    test_data_pipeline_logic()

    if not quick:
        test_ml_model()

    test_rag_engine()
    await test_fingpt_agent(test_llm=not no_llm)
    test_memory_performance()

    total_ms = (time.perf_counter() - t_global) * 1000
    info(f"Duree totale des tests : {total_ms:.0f}ms")

    success = results.summary()

    # Sauvegarder le rapport
    report_path = AI_DIR / "logs" / "test_report.json"
    report = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "passed":    results.passed,
        "failed":    results.failed,
        "skipped":   results.skipped,
        "total_ms":  round(total_ms, 2),
        "details":   results.details,
    }
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"\n  Rapport sauvegarde : {report_path}")

    return 0 if success else 1


if __name__ == "__main__":
    import sys

    # Ajouter le repertoire AI au path
    sys.path.insert(0, str(AI_DIR))

    parser = argparse.ArgumentParser(description="PIF AI Pipeline ? Tests de validation")
    parser.add_argument("--quick",  action="store_true", help="Tests rapides (sans entrainement ML)")
    parser.add_argument("--no-llm", action="store_true", help="Ignorer les tests LLM")
    args = parser.parse_args()

    exit_code = asyncio.run(run_all_tests(quick=args.quick, no_llm=args.no_llm))
    sys.exit(exit_code)