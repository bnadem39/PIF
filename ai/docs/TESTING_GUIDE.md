# 📘 GUIDE DE PROCÉDURE DE TESTS & VALIDATION — PIF AI TRADING SYSTEM

Ce document fournit la procédure complète et standardisée pour tester, calibrer et valider l'ensemble du pipeline d'intelligence artificielle du projet **PIF (Plateforme d'Intermédiation Financière)**.

---

## 1. ENVIRONNEMENT & PRÉ-REQUIS

Tous les scripts s'exécutent depuis le répertoire `D:\PIF\ai\` avec l'environnement virtuel Python activé.

```powershell
cd D:\PIF\ai
.\venv\Scripts\activate
```

Les dépendances requises sont listées dans `requirements_ai.txt` :
* `xgboost`, `scikit-learn`, `pandas`, `numpy`, `joblib`, `pyarrow`
* `chromadb`, `sentence-transformers`, `torch`
* `fastapi`, `uvicorn`, `httpx`

---

## 2. PROCÉDURE D'ENTRAÎNEMENT DU MODÈLE XGBOOST 3-CLASSES

Avant de tester l'inférence ou de calibrer les seuils, voici la procédure pas-à-pas pour préparer les données et entraîner le modèle 3-classes.

### Étape 1 : Préparation des Données & Feature Engineering
Exécuter le pipeline de données pour ingérer les fichiers bruts (`ALL_DATA.csv`, `BNB_USD_daily_data.csv`, cryptos 1-min), calculer les 20 indicateurs techniques (SMA, RSI, MACD, Bandes de Bollinger, ATR, volatilité 30j, lags) et générer la cible 3-classes calibrée par ATR :

```powershell
python data_pipeline.py
```
* **Entrée** : Données brutes OHLCV multi-actifs.
* **Traitement** : Nettoyage, calcul des indicateurs techniques, filtrage du bruit sous $\pm 1.5 \times \text{ATR}$, encodage des cibles directionnelles :
  * `+1` (Achat / Haussier) : Variation $> +1.5 \times \text{ATR}$
  * `-1` (Vente / Baissier) : Variation $< -1.5 \times \text{ATR}$
  * `0` (Neutre / Bruit) : Variation dans la bande $\pm 1.5 \times \text{ATR}$
* **Sortie** : Fichier optimisé `D:\PIF\ai\processed_data.parquet` (187 287 observations, 29 colonnes).

### Étape 2 : Entraînement du Modèle XGBoost 3-Classes
Lancer l'entraînement du modèle avec validation croisée temporelle (`TimeSeriesSplit` sur 5 folds chronologiques) et validation finale sur les 20% les plus récents :

```powershell
python train_model.py
```

* **Déroulement de l'exécution** :
  1. Chargement de `processed_data.parquet` et standardisation des 20 features (`RobustScaler`).
  2. Validation croisée temporelle 5 folds (`TimeSeriesSplit`) pour évaluer la stabilité out-of-sample (Accuracy $\approx 50.1\%$, F1-Weighted $\approx 53.5\%$).
  3. Entraînement final `XGBClassifier` (`objective="multi:softprob"`, `n_estimators=600`, `learning_rate=0.02`, `tree_method="hist"`).
  4. Évaluation sur les 20% les plus récents (37 458 observations).
  5. Export et sérialisation des artefacts dans `D:\PIF\ai\models\` :
     * `xgboost_model.pkl` : Pipeline complet sérialisé (Modèle + Scaler + Liste des features).
     * `xgboost_model.json` : Modèle natif XGBoost pour inférence ultra-rapide C++/JVM.
     * `model_metadata.json` : Métadonnées, hyperparamètres, scores CV et métriques finales.

### Options avancées d'entraînement
```powershell
# Entraîner uniquement sur un actif spécifique (ex: BNB-USD)
python train_model.py --ticker BNB-USD

# Spécifier un chemin de données personnalisé
python train_model.py --data-path processed_data.parquet
```

---

## 3. PROCÉDURE DE TEST 1 : CALIBRATION D'INFÉRENCE DU MODÈLE XGBOOST 3-CLASSES

### Objectif
Vérifier que le post-processing par seuil de confiance strict ($\ge 60\%$) élimine les faux signaux directionnels (Achat/Vente) générés par un simple `argmax()`, et assure la sécurisation du capital en classant les observations indécises en **Neutre (0)**.

### Règle de décision calibrée
$$\text{Signal} = \begin{cases}
+1 \ (\text{BULLISH}) & \text{si } P(\text{Achat}) \ge \text{threshold} \quad \text{et} \quad P(\text{Achat}) > P(\text{Vente}) \\
-1 \ (\text{BEARISH}) & \text{si } P(\text{Vente}) \ge \text{threshold} \quad \text{et} \quad P(\text{Vente}) > P(\text{Achat}) \\
0 \ (\text{NEUTRAL}) & \text{dans tous les autres cas (confiance insuffisante / indécision)}
\end{cases}$$

### Commandes de test

#### A. Évaluation multi-seuils comparative (`[0.45, 0.50, 0.55, 0.60]`)
```powershell
python predict_signals.py --threshold 0.60
```
Cette commande exécute automatiquement la grille des 4 seuils sur les 37 458 observations du jeu de test (20% temporel récent) et génère :
* Le tableau comparatif affiché sur la console.
* Le rapport détaillé : `D:\PIF\ai\logs\calibration_report.txt`.
* Les métriques structurées : `D:\PIF\ai\logs\calibration_metrics.json`.
* La sauvegarde du seuil optimal dans `D:\PIF\ai\models\model_metadata.json` sous la clé `"confidence_threshold": 0.60`.

#### B. Résultats de référence observés sur la grille multi-seuils

| Seuil | Accuracy | F1-Macro | Précision Achat (+1) | Précision Vente (-1) | Faux Achat | Faux Vente | Signaux Émis (A/V) |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Brut (Argmax)** | 51.60% | 0.4315 | 26.29% | 25.53% | 7 170 | 7 139 | 9 727 / 9 586 |
| **45%** | 63.84% | 0.4342 | 32.48% | 32.70% | 2 709 | 2 834 | 4 012 / 4 211 |
| **50%** | 66.40% | 0.3847 | 36.07% | 37.15% | 1 154 | 1 340 | 1 805 / 2 132 |
| **55%** | 67.05% | 0.3269 | 40.03% | 40.83% | 388 | 513 | 647 / 867 |
| **60% (Optimal)**| **67.01%** | 0.2872 | **45.93%** | **40.07%** | **93** | **163** | **172 / 272** |

> **Conclusion** : Le seuil de 60% réduit les faux signaux d'achat de **98.7%** (de 7 170 à 93) et de vente de **97.7%** (de 7 139 à 163), augmentant la précision prédictive de près de 75%.

#### C. Script d'assertion automatique (Non-régression)
Exécuter la commande suivante pour valider qu'aucun signal Achat (+1) ou Vente (-1) n'est émis sous la probabilité de 60% :

```powershell
python -c "import numpy as np; from predict_signals import predict_calibrated_batch; from train_model import load_model, prepare_data; from data_pipeline import load_processed, OUTPUT_PATH; df = load_processed(OUTPUT_PATH); X, y = prepare_data(df); split = int(len(X) * 0.8); model, scaler, _ = load_model(); res = predict_calibrated_batch(X.iloc[split:].values, model, scaler, confidence_threshold=0.60); preds = res['preds_calibrated']; probas = res['probas']; buy_idx = np.where(preds == 1)[0]; sell_idx = np.where(preds == -1)[0]; assert (probas[buy_idx, 2] >= 0.60).all(), 'Échec assertion Achat'; assert (probas[sell_idx, 0] >= 0.60).all(), 'Échec assertion Vente'; print('ASSERTION RÉUSSIE : 100% des signaux Achat et Vente respectent P >= 0.60 !')"
```

---

## 3. PROCÉDURE DE TEST 2 : ISOLATION & SEGMENTATION RAG CHROMADB

### Objectif
Garantir une étanchéité absolue entre la collection documentaire de marché boursier (`domain: "market"`) et la collection prudentielle / finance islamique (`domain: "banking_islamic"`). Une requête formulée pour un trader ou une analyse d'actif ne doit jamais renvoyer d'extrait de contrats islamiques (Mourabaha, Mudaraba, Sukuk) ou de ratios Bâle III hors sujet.

### Structure documentaire segmentée

1. **Domaine Marché & Trading (`domain: "market"`)** :
   * `bvmt_conjoncture_marche_financier.txt` (Tunindex, liquidité, dividend yield)
   * `bct_politique_monetaire_tmm.txt` (Politique monétaire BCT, taux directeur, TMM)
   * `bct_rapport_stabilite_financiere.txt` (Stabilité financière, risques systémiques)
   * `macro_economie_internationale_inflation.txt` (Cycle Fed/BCE, inflation, matières premières)

2. **Domaine Banque, Stress-Testing & Finance Islamique (`domain: "banking_islamic"`)** :
   * `basel3_capital_adequacy.txt`, `basel3_lcr_liquidity.txt`, `basel3_market_risk_frtb.txt`, `basel3_nsfr_funding.txt`
   * `ifsb_risk_management_framework.txt`
   * `islamic_finance_mudaraba.txt`, `islamic_finance_murabaha.txt`, `islamic_finance_musharaka_sukuk.txt`
   * `stress_testing_methodology.txt`

### Commandes de test

#### A. Re-construction et indexation vectorielle ChromaDB
Découpe en fragments (*chunk size* = 500 caractères, *overlap* = 50 caractères) avec métadonnée `domain` :

```powershell
python -c "from rag_engine import get_rag_engine; engine = get_rag_engine(); engine.build_index(); print('Total chunks indexés dans ChromaDB :', engine.vector_store._chroma_col.count())"
```

#### B. Test d'étanchéité stricte (Zéro contamination islamique sur requête boursière)
Ce test exécute une recherche sémantique boursière et vérifie l'absence totale de vocabulaire islamique :

```powershell
python -c "from rag_engine import get_rag_engine; engine = get_rag_engine(); query = 'Recommandation trading action BIAT BVMT et analyse inflation BCT TMM'; results = engine.retrieve_market(query, top_k=5); islamic_kw = ['murabaha', 'mudaraba', 'musharaka', 'sukuk', 'charia', 'sharia', 'qirad', 'riba', 'gharar', 'aaoifi']; contaminated = False; [print(f'Doc: {r[\"title\"]} | Domaine: {r.get(\"domain\")} | Score: {r[\"score\"]:.3f}') for r in results]; any_contam = any(any(k in (r['title'] + ' ' + r['text']).lower() for k in islamic_kw) for r in results); assert not any_contam, 'Échec étanchéité'; print('\nCONFIRMATION : Zéro contamination islamique dans la collection Marché !')"
```

#### C. Test de récupération ciblée Finance Islamique / Stress-Testing
Ce test vérifie que les requêtes réglementaires et prudentielles ciblent exclusivement `domain: "banking_islamic"` :

```powershell
python -c "from rag_engine import get_rag_engine; engine = get_rag_engine(); query = 'Contrat Murabaha gestion du risque de contrepartie et ratio LCR Bale III'; results = engine.retrieve_banking_islamic(query, top_k=3); [print(f'Doc: {r[\"title\"]} | Domaine: {r.get(\"domain\")} | Score: {r[\"score\"]:.3f}') for r in results]; assert all(r.get('domain') == 'banking_islamic' for r in results); print('\nCONFIRMATION : Récupération ciblée banking_islamic 100% conforme !')"
```

---

## 4. PROCÉDURE DE TEST 2 : ISOLATION & SEGMENTATION RAG CHROMADB

### Objectif
Garantir une étanchéité absolue entre la collection documentaire de marché boursier (`domain: "market"`) et la collection prudentielle / finance islamique (`domain: "banking_islamic"`). Une requête formulée pour un trader ou une analyse d'actif ne doit jamais renvoyer d'extrait de contrats islamiques (Mourabaha, Mudaraba, Sukuk) ou de ratios Bâle III hors sujet.

### Structure documentaire segmentée

1. **Domaine Marché & Trading (`domain: "market"`)** :
   * `bvmt_conjoncture_marche_financier.txt` (Tunindex, liquidité, dividend yield)
   * `bct_politique_monetaire_tmm.txt` (Politique monétaire BCT, taux directeur, TMM)
   * `bct_rapport_stabilite_financiere.txt` (Stabilité financière, risques systémiques)
   * `macro_economie_internationale_inflation.txt` (Cycle Fed/BCE, inflation, matières premières)

2. **Domaine Banque, Stress-Testing & Finance Islamique (`domain: "banking_islamic"`)** :
   * `basel3_capital_adequacy.txt`, `basel3_lcr_liquidity.txt`, `basel3_market_risk_frtb.txt`, `basel3_nsfr_funding.txt`
   * `ifsb_risk_management_framework.txt`
   * `islamic_finance_mudaraba.txt`, `islamic_finance_murabaha.txt`, `islamic_finance_musharaka_sukuk.txt`
   * `stress_testing_methodology.txt`

### Commandes de test

#### A. Re-construction et indexation vectorielle ChromaDB
Découpe en fragments (*chunk size* = 500 caractères, *overlap* = 50 caractères) avec métadonnée `domain` :

```powershell
python -c "from rag_engine import get_rag_engine; engine = get_rag_engine(); engine.build_index(); print('Total chunks indexés dans ChromaDB :', engine.vector_store._chroma_col.count())"
```

#### B. Test d'étanchéité stricte (Zéro contamination islamique sur requête boursière)
Ce test exécute une recherche sémantique boursière et vérifie l'absence totale de vocabulaire islamique :

```powershell
python -c "from rag_engine import get_rag_engine; engine = get_rag_engine(); query = 'Recommandation trading action BIAT BVMT et analyse inflation BCT TMM'; results = engine.retrieve_market(query, top_k=5); islamic_kw = ['murabaha', 'mudaraba', 'musharaka', 'sukuk', 'charia', 'sharia', 'qirad', 'riba', 'gharar', 'aaoifi']; contaminated = False; [print(f'Doc: {r[\"title\"]} | Domaine: {r.get(\"domain\")} | Score: {r[\"score\"]:.3f}') for r in results]; any_contam = any(any(k in (r['title'] + ' ' + r['text']).lower() for k in islamic_kw) for r in results); assert not any_contam, 'Échec étanchéité'; print('\nCONFIRMATION : Zéro contamination islamique dans la collection Marché !')"
```

#### C. Test de récupération ciblée Finance Islamique / Stress-Testing
Ce test vérifie que les requêtes réglementaires et prudentielles ciblent exclusivement `domain: "banking_islamic"` :

```powershell
python -c "from rag_engine import get_rag_engine; engine = get_rag_engine(); query = 'Contrat Murabaha gestion du risque de contrepartie et ratio LCR Bale III'; results = engine.retrieve_banking_islamic(query, top_k=3); [print(f'Doc: {r[\"title\"]} | Domaine: {r.get(\"domain\")} | Score: {r[\"score\"]:.3f}') for r in results]; assert all(r.get('domain') == 'banking_islamic' for r in results); print('\nCONFIRMATION : Récupération ciblée banking_islamic 100% conforme !')"
```

---

## 5. PROCÉDURE DE TEST 3 : AGENT SERVICE FINGPT (PORT 1234)

### Objectif
Tester l'intégration de bout en bout de l'Agent FinGPT (`fingpt-mt-llama-3-8b-lora` sur `http://localhost:1234/v1`) en validant que :
1. Le prompt reçoit uniquement le contexte de marché épuré.
2. Le signal XGBoost transmis est qualifié d'`ACTIF` si $\ge 60\%$, sinon de `NEUTRE / ATTENTE`.
3. Le moteur quantitatif de secours prend le relais en toute transparence si le port 1234 est hors-ligne.

### Commandes de test

#### Test du pipeline d'analyse de marché ciblé
```powershell
python -c "import asyncio; from agent_service import analyze_market_targeted; sample = {'open': 315.0, 'high': 322.0, 'low': 312.0, 'close': 320.0, 'volume': 1500000.0, 'sma_20': 310.0, 'sma_50': 295.0, 'rsi_14': 64.0, 'macd': 2.5, 'macd_signal': 1.8, 'macd_hist': 0.7, 'bb_upper': 325.0, 'bb_lower': 295.0, 'bb_width': 30.0, 'bb_pct': 0.83, 'price_to_sma20': 1.032, 'atr_14': 0.025, 'volatility_30d': 38.0, 'candle_range_pct': 3.2, 'log_return_1d': 0.015, 'lag_return_1': 0.01, 'lag_return_2': 0.005, 'lag_return_3': -0.002, 'volume_zscore': 1.2, 'sentiment_score': 0.42}; res = asyncio.run(analyze_market_targeted('BNB-USD', '2024-01-15', sample, sentiment_score=0.42, confidence_threshold=0.60)); print('Ticker :', res['ticker']); print('Signal :', res['calibrated_signal']['signal'], '| Classe :', res['calibrated_signal']['prediction']); print('Confiance :', f\"{res['calibrated_signal']['confidence']:.1%}\"); print('Recommandation Agent :', res['agent_response'].recommendation)"
```

---

---

## 6. PROCÉDURE DE TEST 4 : TEST D'INTÉGRATION DE BOUT EN BOUT (`test_integration_pipeline.py`)

Ce script valide séquentiellement les 3 piliers opérationnels du système IA :
1. **Étape A (ML Calibré)** : Vérifie sur l'échantillon test que 100% des signaux directionnels (+1 / -1) respectent la condition stricte $P \ge 0.60$.
2. **Étape B (Isolation RAG)** : Exécute une batterie de requêtes boursières et affirme par test unitaire qu'aucun document de finance islamique ou de ratio bancaire n'est retourné.
3. **Étape C (Service Agent FinGPT)** : Teste la synthèse complète, l'appel HTTP au port 1234 et le mécanisme de secours autonome en cas d'indisponibilité.

### Commande d'exécution
```powershell
python test_integration_pipeline.py
```

Résultat attendu :
```text
######################################################################
  SUITE COMPLÈTE RÉUSSIE AVEC SUCCÈS !
  [✓] Étape A (ML Calibré P >= 0.60)        : PASSÉ
  [✓] Étape B (Isolation RAG 0% Pollution)   : PASSÉ
  [✓] Étape C (Intégration Agent FinGPT)     : PASSÉ
######################################################################
```

---

## 7. PROCÉDURE DE TEST 5 : EXEMPLES DE REQUÊTES cURL (`ai_server.py`)

Démarrer le serveur FastAPI :
```powershell
python ai_server.py
```
Le serveur écoute sur `http://localhost:8000`.

### A. Healthcheck des composants
```bash
curl -X GET "http://localhost:8000/api/ai/health" \
     -H "Accept: application/json"
```

### B. Inférence ML Calibrée 3-Classes
```bash
curl -X POST "http://localhost:8000/api/ai/predict" \
     -H "Content-Type: application/json" \
     -d '{
       "ticker": "BNB-USD",
       "features": {
         "open": 315.5, "high": 322.0, "low": 312.8, "close": 318.75, "volume": 1250000,
         "sma_20": 310.2, "sma_50": 298.5, "rsi_14": 62.5, "macd": 3.45, "macd_signal": 2.1,
         "macd_hist": 1.35, "atr_14": 5.4, "volatility_30d": 42.3
       },
       "confidence_threshold": 0.60
     }'
```

### C. Recherche Documentaire RAG avec filtre strict de domaine
```bash
curl -X POST "http://localhost:8000/api/ai/rag/query" \
     -H "Content-Type: application/json" \
     -d '{
       "query": "Politique monétaire taux directeur TMM et conjoncture BVMT",
       "domain": "market",
       "top_k": 3
     }'
```

### D. Pipeline d'Analyse Intégré (ML + RAG Ciblé + FinGPT)
```bash
curl -X POST "http://localhost:8000/api/ai/analyze" \
     -H "Content-Type: application/json" \
     -d '{
       "ticker": "BNB-USD",
       "simulation_date": "2024-03-20",
       "features": {
         "open": 315.5, "high": 322.0, "low": 312.8, "close": 318.75, "volume": 1250000,
         "sma_20": 310.2, "sma_50": 298.5, "rsi_14": 62.5, "macd": 3.45, "macd_signal": 2.1,
         "macd_hist": 1.35, "atr_14": 5.4, "volatility_30d": 42.3
       },
       "sentiment_score": 0.35,
       "confidence_threshold": 0.60
     }'
```

---

## 8. MÉTRIQUES DE PERFORMANCE & RESSOURCES MACHINE (LOCALES)

Mesures observées sur machine de développement locale (CPU Intel Core i7 / 16 Go RAM / SSD NVMe) :

| Composant | Latence Moyenne | Consommation Mémoire (RAM) | Remarques |
| :--- | :---: | :---: | :--- |
| **Inférence XGBoost Calibrée** | **1.2 ms** à **4.5 ms** | ~85 Mo (modèle + scaler) | Inférence vectorisée ultra-rapide |
| **Recherche Vectorielle ChromaDB** | **18 ms** à **35 ms** | ~320 Mo (embeddings + index) | Cosine similarity sur 161 chunks |
| **Génération FinGPT Local (Port 1234)**| **1.8 s** à **4.2 s** | VRAM 6-8 Go (si GPU) / CPU | Dépendant de la longueur du prompt |
| **Moteur Fallback Autonome (Offline)** | **< 2.0 ms** | 0 Mo additionnel | Secours instantané sans timeout |
| **Pipeline Global Complet (`/analyze`)**| **~2.1 s** (LLM actif) / **~45 ms** (Fallback) | ~450 Mo RAM (processus Python) | Totalement non-bloquant (async FastAPI) |

---

## 9. TABLEAU DE SYNTHÈSE DES VALIDATIONS

| Composant | Statut | Critère de Succès |
| :--- | :---: | :--- |
| **Inférence XGBoost** | ✅ CONFORME | Seuil $\ge 60\%$ respecté, chute de $>97\%$ des faux signaux d'Achat et de Vente. |
| **Segmentation ChromaDB** | ✅ CONFORME | $0\%$ de contamination islamique sur requêtes de marché boursier (`domain: "market"`). |
| **Routage FinGPT** | ✅ CONFORME | Injection du contexte ciblé `domain: "market"` et signal filtré transmis. |
| **Résilience / Fallback** | ✅ CONFORME | Moteur autonome actif en cas d'indisponibilité du LLM port 1234. |
| **Intégration Bout-en-Bout**| ✅ CONFORME | Suite unitaire `test_integration_pipeline.py` validée sans erreur. |
