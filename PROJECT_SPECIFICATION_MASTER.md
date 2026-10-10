# DOSSIER D'ARCHITECTURE TECHNIQUE, FONCTIONNELLE ET FINANCIÈRE
## Plateforme Intégrée : Simulateur de Salle de Marché, AI Stress Testing Bancaire & Actuariat Prédictif (PIF)
**Version :** 1.0.0-RELEASE  
**Statut :** Document de Référence et Spécification Maître  
**Auteur :** Lead Architect & Superviseur en Ingénierie Financière & IA  
**Cible :** Équipe de Développement, Encadrants Académiques, Jury d'Expertise Financière

---

## Sommaire Exécutif

1. [Vision Globale & Architecture d'Entreprise](#1-vision-globale--architecture-dentreprise)
2. [Inventaire & Cartographie Exhaustive des Données Existantes](#2-inventaire--cartographie-exhaustive-des-données-existantes)
3. [Architecture Logicielle & Stack Technologique](#3-architecture-logicielle--stack-technologique)
4. [Schéma Relationnel & DDL PostgreSQL Complet](#4-schéma-relationnel--ddl-postgresql-complet)
5. [Moteur Transactionnel & Mécanique de Marché (Spring Boot 3.x)](#5-moteur-transactionnel--mécanique-de-marché-spring-boot-3x)
6. [Ingénierie Financière : Risque Pré-Trade, Métriques de Portefeuille & VaR](#6-ingénierie-financière--risque-pré-trade-métriques-de-portefeuille--var)
7. [Module d'AI Stress Testing : Banques Conventionnelles vs Banques Islamiques](#7-module-dai-stress-testing--banques-conventionnelles-vs-banques-islamiques)
8. [Module d'Actuariat Prédictif & Provisionnement de Sinistres](#8-module-dactuariat-prédictif--provisionnement-de-sinistres)
9. [Module d'Explicabilité XAI (SHAP, LIME) & NLP FinBERT](#9-module-dexplicabilité-xai-shap-lime--nlp-finbert)
10. [Spécification des Contrats d'Interface (REST API & WebSockets STOMP)](#10-spécification-des-contrats-dinterface-rest-api--websockets-stomp)
11. [Matrice d'Implémentation Sprint par Sprint & Recette](#11-matrice-dimplémentation-sprint-par-sprint--recette)

---

## 1. Vision Globale & Architecture d'Entreprise

Le projet **PIF (Projet Informatique Finance)** est un écosystème fintech et regtech de pointe conçu pour répondre à la triple exigence des banques d'investissement, des régulateurs prudentiels et des compagnies d'assurance.

```
+----------------------------------------------------------------------------------------------------+
|                                    ÉCOSYSTÈME GLOBAL DU PIF                                        |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  [ FRONTEND REACT 18 / ANGULAR ]                                                                    |
|  * TradingView Lightweight Charts (Candlesticks, Depth, Volume)                                    |
|  * Carnet d'ordres L2 en temps réel (Bid/Ask Stomp WebSockets)                                     |
|  * Console de Stress Testing Comparatif (Sliders Macro, Graphiques Ratios CET1)                   |
|  * Tableaux de Bord XAI (SHAP Waterfall, Force Plots, Feature Importance)                         |
|  * Console Actuarielle (Courbes Sinistres, Tarification Pure vs Chargée)                           |
|                                     │                                                              |
|                                     ▼ (REST JWT / WebSocket STOMP)                                 |
|                                                                                                    |
|  [ BACKEND TRANSACTIONNEL SPRING BOOT 3.x (Java 17) ]                                              |
|  * Moteur d'ordres & Matching Engine (Marché, Limite, Stop-Loss, Take-Profit)                     |
|  * Moteur de Gestion des Risques Pré-Trade (Solvabilité, P&L, Slippage, Marges)                    |
|  * Gestionnaire de Portefeuille Multi-Actifs (Cash Ledger, Positions, P&L Réalisé/Latent)          |
|  * Piste d'Audit Immuable (Audit Trail non-répudiable)                                             |
|  * Broker WebSockets In-Memory pour la diffusion des ticks                                         |
|                                     │                                                              |
|                  ┌──────────────────┴──────────────────┐                                           |
|                  ▼                                     ▼                                           |
|  [ POSTGRESQL 15+ (OLTP) ]             [ MICROSERVICE IA / XAI FASTAPI (Python 3.11) ]            |
|  * Tables Relationnelles Normalisées   * Moteur de Stress Testing Conventionnel vs Islamique       |
|  * Partitionnement Séries Temporelles   * Algorithmes Actuariels GLM (Poisson, Gamma, Tweedie)     |
|  * Contraintes d'intégrité strictes    * Moteur XAI (TreeSHAP, KernelSHAP, LIME)                  |
|  * Verrouillage Pessimiste ACID        * Pipeline NLP FinBERT (Sentiment Scoring Actualités)       |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Inventaire & Cartographie Exhaustive des Données Existantes

Notre référentiel local dispose déjà d'actifs de données réels d'une qualité exceptionnelle :

| Source de Données | Emplacement Local | Volume | Période | Actifs & Caractéristiques Clés | Utilisation Métier Cible |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Bourse de Tunis (BVMT)** | `d:/PIF/ALL_DATA.csv/ALL_DATA.csv` | **187 987 lignes** | **2010 - 2022** (13 ans) | **88 Tickers Tunisiens** (OHLCV quotidien)<br>- Banques conventionnelles : `BIAT`, `AB`, `BNA`, `BT`, `ATB`, `BH`, `STB`, `UIB`, `UBCI`, `BTE`<br>- Banque Islamique : `WIFAK`<br>- Assurances : `STAR`, `AST`, `BHASS`, `AMI`, `TRE`<br>- Corporates : `SFBT`, `PGH`, `SAH`, `TLNET` | **AI Stress Testing Comparatif**, calibration des modèles de valorisation bancaire, modèles actuariels ALM, portefeuille d'actions réelles. |
| **Crypto Haute Fréquence (BTC)** | `d:/PIF/coinbaseUSD_1-min_data.csv/coinbaseUSD_1-min_data.csv` | **4 911 807 lignes** | 2014 - Récent | Barres 1 minute BTC/USD (Timestamp, Open, High, Low, Close, Volume) | **Replay de Salle de Marché en Temps Réel**, matching engine, simulation de flux d'ordres haute fréquence, VaR intraday. |
| **Crypto Haute Fréquence (ETH)** | `d:/PIF/ETH_1min.csv/ETH_1min.csv` | **4 235 500 lignes** | 2016 - Récent | Barres 1 minute ETH/USD (Timestamp, Open, High, Low, Close, Volume) | Exécution multi-actifs simultanée, arbitrage, analyse de corrélation et calculs de volatilité stochastique. |
| **Crypto Daily (BNB)** | `d:/PIF/BNB_USD_daily_data.csv` | **2 496 lignes** | 2017 - 2024 | Données quotidiennes BNB/USD (OHLCV) | Optimisation de frontière efficiente de Markowitz, backtesting multi-actifs avec actions tunisiennes. |

---

## 3. Architecture Logicielle & Stack Technologique

### 3.1. Composants et Versions
* **Plateforme d'Exécution :** Java 17 LTS (OpenJDK 17.0.18) & Python 3.11.9 & Node.js v24.
* **Backend Transactionnel :**
  - Spring Boot 3.2.x
  - Spring Data JPA (Hibernate 6)
  - Spring Security avec validation de jetons JWT asymétriques/symétriques (HMAC-SHA256)
  - Spring WebSocket avec protocole STOMP over SockJS
  - Resilience4j (Circuit Breaker pour les appels vers le microservice Python)
* **Microservice d'Intelligence Artificielle & Risque :**
  - FastAPI (Python ASGI haute performance avec validation Pydantic v2)
  - Scikit-Learn, XGBoost, LightGBM, Statsmodels (GLM actuariels)
  - SHAP (Shapley Additive exPlanations) & LIME
  - Transformers & PyTorch (Modèle FinBERT pour le scoring de dépêches financières)
* **Persistance & Données :**
  - PostgreSQL 15+ avec index B-Tree et BRIN (Block Range Index) pour les séries temporelles.
  - Migrations de schéma via Flyway / Liquibase.

---

## 4. Schéma Relationnel & DDL PostgreSQL Complet

Voici le script SQL de définition de schéma de référence (`schema.sql`) prêt pour initialisation de la base PostgreSQL.

```sql
-- ============================================================================
-- SCHÉMA DE BASE DE DONNÉES DU SIMULATEUR DE SALLE DE MARCHÉ ET STRESS TESTING
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. GESTION DES UTILISATEURS ET CONTRÔLE D'ACCÈS (RBAC)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    role VARCHAR(30) NOT NULL CHECK (role IN ('ROLE_TRADER_JUNIOR', 'ROLE_TRADER_PRO', 'ROLE_RISK_MANAGER', 'ROLE_ACTUAIRE', 'ROLE_ADMIN')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. PORTEFEUILLES VIRTUELS ET TRÉSORERIE (CASH LEDGER)
CREATE TABLE portfolios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL DEFAULT 'Portefeuille Principal',
    currency VARCHAR(5) NOT NULL DEFAULT 'TND' CHECK (currency IN ('TND', 'USD', 'EUR')),
    cash_balance NUMERIC(18, 4) NOT NULL DEFAULT 100000.0000 CHECK (cash_balance >= 0),
    blocked_cash NUMERIC(18, 4) NOT NULL DEFAULT 0.0000 CHECK (blocked_cash >= 0),
    total_equity NUMERIC(18, 4) NOT NULL DEFAULT 100000.0000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. RÉFÉRENTIEL DES INSTRUMENTS FINANCIERS
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticker VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    asset_class VARCHAR(30) NOT NULL CHECK (asset_class IN ('EQUITY_BVMT', 'CRYPTO', 'INDEX', 'COMMODITY')),
    currency VARCHAR(5) NOT NULL DEFAULT 'TND',
    last_price NUMERIC(18, 6) NOT NULL DEFAULT 0,
    previous_close NUMERIC(18, 6) DEFAULT 0,
    is_tradable BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. POSITIONS DÉTENUES EN PORTEFEUILLE
CREATE TABLE positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id),
    quantity NUMERIC(18, 6) NOT NULL CHECK (quantity >= 0),
    average_buy_price NUMERIC(18, 6) NOT NULL CHECK (average_buy_price > 0),
    current_market_price NUMERIC(18, 6) NOT NULL,
    unrealized_pnl NUMERIC(18, 4) DEFAULT 0.0000,
    realized_pnl NUMERIC(18, 4) DEFAULT 0.0000,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_portfolio_asset UNIQUE(portfolio_id, asset_id)
);

-- 5. ORDRES DE BOURSE (INTENTIONS DE TRANSACTION)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id),
    order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('MARKET', 'LIMIT', 'STOP_LOSS', 'TAKE_PROFIT')),
    side VARCHAR(10) NOT NULL CHECK (side IN ('BUY', 'SELL')),
    quantity NUMERIC(18, 6) NOT NULL CHECK (quantity > 0),
    executed_quantity NUMERIC(18, 6) NOT NULL DEFAULT 0 CHECK (executed_quantity <= quantity),
    limit_price NUMERIC(18, 6) CHECK (limit_price IS NULL OR limit_price > 0),
    stop_price NUMERIC(18, 6) CHECK (stop_price IS NULL OR stop_price > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED', 'REJECTED')),
    rejection_reason VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. TRANSACTIONS RÉALISÉES & PISTE D'AUDIT IMMUABLE
CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id),
    asset_id UUID NOT NULL REFERENCES assets(id),
    side VARCHAR(10) NOT NULL CHECK (side IN ('BUY', 'SELL')),
    executed_quantity NUMERIC(18, 6) NOT NULL CHECK (executed_quantity > 0),
    execution_price NUMERIC(18, 6) NOT NULL CHECK (execution_price > 0),
    gross_amount NUMERIC(18, 4) NOT NULL,
    fee_amount NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    net_amount NUMERIC(18, 4) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    action VARCHAR(30) NOT NULL,
    performed_by VARCHAR(50) NOT NULL,
    old_state JSONB,
    new_state JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. SÉRIES TEMPORELLES DE MARCHÉ (OPTIMISÉES AVEC INDEX BRIN/BTREE)
CREATE TABLE market_data_candles (
    id BIGSERIAL,
    ticker VARCHAR(20) NOT NULL,
    timeframe VARCHAR(10) NOT NULL CHECK (timeframe IN ('1M', '5M', '1H', '1D')),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    open_price NUMERIC(18, 6) NOT NULL,
    high_price NUMERIC(18, 6) NOT NULL,
    low_price NUMERIC(18, 6) NOT NULL,
    close_price NUMERIC(18, 6) NOT NULL,
    volume NUMERIC(22, 6) NOT NULL,
    PRIMARY KEY (ticker, timeframe, timestamp)
);

CREATE INDEX idx_candles_ticker_time ON market_data_candles (ticker, timestamp DESC);
CREATE INDEX idx_candles_brin_time ON market_data_candles USING BRIN (timestamp);

-- 8. MODULE AI STRESS TESTING : PROFILS BANCAIRES & BILANS
CREATE TABLE bank_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    ticker VARCHAR(20) REFERENCES assets(ticker),
    bank_type VARCHAR(30) NOT NULL CHECK (bank_type IN ('CONVENTIONAL', 'ISLAMIC')),
    total_assets NUMERIC(18, 4) NOT NULL,
    cet1_capital NUMERIC(18, 4) NOT NULL,
    risk_weighted_assets NUMERIC(18, 4) NOT NULL,
    non_performing_loans NUMERIC(18, 4) NOT NULL,
    liquidity_coverage_ratio NUMERIC(6, 2) NOT NULL,
    -- Spécificités Banques Islamiques (Normes IFSB)
    psias_balance NUMERIC(18, 4) DEFAULT 0, -- Comptes d'investissement avec partage des pertes
    per_reserve NUMERIC(18, 4) DEFAULT 0,    -- Profit Equalization Reserve
    irr_reserve NUMERIC(18, 4) DEFAULT 0,    -- Investment Risk Reserve
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stress_test_simulations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    scenario_name VARCHAR(100) NOT NULL,
    macro_interest_rate_shock NUMERIC(6, 4) NOT NULL, -- ex: +0.0300 (+300 bps)
    macro_gdp_contraction NUMERIC(6, 4) NOT NULL,      -- ex: -0.0450 (-4.5%)
    npl_increase_ratio NUMERIC(6, 4) NOT NULL,         -- ex: +0.0500 (+500 bps)
    market_crash_shock NUMERIC(6, 4) NOT NULL,         -- ex: -0.2500 (-25%)
    simulation_results JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. MODULE ACTUARIAT : POLICES ET SINISTRES
CREATE TABLE actuarial_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_number VARCHAR(50) UNIQUE NOT NULL,
    insured_driver_age INT NOT NULL,
    vehicle_power INT NOT NULL,
    zone_risk_code INT NOT NULL,
    bonus_malus NUMERIC(5, 2) NOT NULL DEFAULT 1.00,
    annual_pure_premium NUMERIC(12, 4),
    annual_commercial_premium NUMERIC(12, 4),
    effective_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE actuarial_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_id UUID NOT NULL REFERENCES actuarial_policies(id),
    occurrence_date DATE NOT NULL,
    notification_date DATE NOT NULL,
    claim_amount NUMERIC(14, 4) NOT NULL,
    settlement_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (settlement_status IN ('PENDING', 'SETTLED', 'REJECTED'))
);
```

---

## 5. Moteur Transactionnel & Mécanique de Marché (Spring Boot 3.x)

### 5.1. Logique d'Exécution & Atomicité Transactionnelle
Dans un simulateur de salle de marché professionnel, l'argent engagé et les titres échangés doivent satisfaire aux garanties **ACID**.

1. **Passage d'Ordre d'Achat (BUY) :**
   * *Contrôle Pré-Trade :* Solde disponible $\text{Cash Disponibles} = \text{cash\_balance} - \text{blocked\_cash}$.
   * *Verrouillage :* Pour un ordre Limite, le montant théorique $Q \times P_{\text{limit}} \times (1 + \text{Frais})$ est transféré immédiatement dans `blocked_cash`.
   * *Exécution (Matching) :* Lors de l'exécution, `cash_balance` est débité, `blocked_cash` libéré, et la ligne `positions` correspondante est mise à jour avec calcul du Prix Moyen Pondéré d'Acquisition (PRU / Weighted Average Price).

$$\text{PRU}_{\text{nouveau}} = \frac{(\text{Qté}_{\text{ancienne}} \times \text{PRU}_{\text{ancien}}) + (\text{Qté}_{\text{achetée}} \times P_{\text{exécution}})}{\text{Qté}_{\text{ancienne}} + \text{Qté}_{\text{achetée}}}$$

2. **Passage d'Ordre de Vente (SELL) :**
   * *Contrôle Pré-Trade :* Quantité d'actifs détenue $\ge Q_{\text{voulue}}$.
   * *P&L Réalisé :*
$$\text{P\&L Réalisé} = Q_{\text{vendue}} \times (P_{\text{exécution}} - \text{PRU}) - \text{Frais}$$
   * Le cash est crédité immédiatement, et le P&L est archivé dans la table `trades` pour la performance globale.

### 5.2. Gestion de la Concurrence Critique (Java Spring)
Pour parer aux conditions de concurrence (*race conditions*) lors de clics rapides ou de rafales d'ordres :
```java
@Repository
public interface PortfolioRepository extends JpaRepository<Portfolio, UUID> {
    
    // Verrouillage pessimiste en écriture pour garantir la sérialisation des débits/crédits
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Portfolio p WHERE p.id = :id")
    Optional<Portfolio> findByIdWithLock(@Param("id") UUID id);
}
```

---

## 6. Ingénierie Financière : Risque Pré-Trade, Métriques de Portefeuille & VaR

### 6.1. Indicateurs de Risque Pré-Trade (Validation en Vol)
Avant tout envoi d'ordre au moteur d'exécution, le service de risque vérifie :
1. **Ratio de Concentration :** Aucune position ne doit excéder un pourcentage $\theta_{\text{max}}$ de la valeur totale du portefeuille :
$$\frac{\text{Valeur de la Position}}{\text{Valeur Totale du Portefeuille}} \le 25\%$$
2. **Coupe-circuit de Volatilité :** Rejet si l'écart de prix dépasse 10% par rapport au cours de clôture de la veille (règle des seuils BVMT).

### 6.2. Indicateurs de Performance et de Risque Post-Trade

#### A. Value at Risk (VaR)
* **VaR Paramétrique (Variance-Covariance) :**  
  Pour un niveau de confiance $\alpha = 99\%$ ($Z_{0.99} \approx 2.326$) et un horizon temporel $h$ jours :
$$\text{VaR}_{\alpha, h} = \text{Valeur Portefeuille} \times Z_{\alpha} \times \sigma_p \times \sqrt{h}$$
  où $\sigma_p = \sqrt{w^T \Sigma w}$ avec $w$ le vecteur des pondérations d'actifs et $\Sigma$ la matrice de variance-covariance des rendements logarithmiques $R_t = \ln(P_t / P_{t-1})$.

* **VaR Historique :**
  Calculée directement sur le quantile $(1 - \alpha)$ de la distribution empirique des pertes et profits simulés sur notre historique BVMT / Crypto.

* **Conditional Value at Risk (CVaR / Expected Shortfall) :**
$$\text{CVaR}_{\alpha} = - \mathbb{E}[R \mid R \le -\text{VaR}_{\alpha}]$$

#### B. Ratios de Rentabilité Ajustée du Risque
* **Ratio de Sharpe :**
$$\text{Sharpe} = \frac{\mathbb{E}[R_p] - R_f}{\sigma_p}$$
  (avec $R_f$ calqué sur le TMM - Taux Moyen du Marché Monétaire tunisien, environ 8.00%).
* **Ratio de Sortino :**
$$\text{Sortino} = \frac{\mathbb{E}[R_p] - R_f}{\sigma_d}, \quad \text{avec } \sigma_d = \sqrt{\frac{1}{T}\sum_{t=1}^T \min(0, R_t - R_f)^2}$$
* **Maximum Drawdown (MDD) :**
$$\text{MDD} = \max_{\tau \in [0, T]} \left( \max_{t \in [0, \tau]} \frac{V_t - V_\tau}{V_t} \right)$$

---

## 7. Module d'AI Stress Testing : Banques Conventionnelles vs Banques Islamiques

Ce module constitue le cœur innovant du projet, simulant l'impact de crises macrofinancières sur deux architectures bilancielles distinctes.

```
       CHOCS MACROÉCONOMIQUES (Taux +300 bps, PIB -4.5%, Défaillances NPL +500 bps)
                                      │
              ┌───────────────────────┴───────────────────────┐
              ▼                                               ▼
   BANQUE CONVENTIONNELLE                             BANQUE ISLAMIQUE
  (Ex: BIAT, Amen Bank, BNA)                     (Ex: Wifak International Bank)
              │                                               │
  * Pertes sur portefeuille de crédits            * Contrats adossés à des actifs réels
    et créances douteuses (IFRS 9 / ECL)            (Mourabaha, Ijara)
  * Asymétrie d'échéances sur taux fixe           * Partage Pertes/Profits (Moudaraba/Musharaka)
  * Dégradation directe du ratio CET1 :           * Amortisseurs de choc IFSB :
                                                    - Profit Equalization Reserve (PER)
         CET1                                       - Investment Risk Reserve (IRR)
    CAR = ────                                      - Displaced Commercial Risk (DCR)
         RWA                                      * Dégradation différée / absorbée
```

### 7.1. Fondements Réglementaires & Équations Prudentielles

#### 1. Ratios Conventionnels (Normes de Bâle III / BCT) :
* **Ratio de Fonds Propres de Base de Catégorie 1 (CET1 Ratio) :**
$$\text{Ratio CET1} = \frac{\text{CET1 Capital}}{\text{RWA}} \ge 7.0\% \quad (\text{Seuil réglementaire + coussin de conservation})$$
* **Impact d'un Choc de Crédit (Modèle IFRS 9 / Expected Credit Loss) :**
$$\Delta \text{ECL} = \sum_{i} \text{EAD}_i \times \Delta \text{PD}_i \times \text{LGD}_i$$
  Ce supplément de provision dégrade directement le résultat net et le numérateur CET1.

#### 2. Ratios Islamiques (Normes IFSB - Islamic Financial Services Board) :
Dans les banques participatives (comme la banque `WIFAK`), une fraction substantielle des dépôts est constituée de **PSIA (Profit Sharing Investment Accounts)** où les déposants partagent les risques avec la banque.
* **Formule IFSB du Capital Adequacy Ratio (CAR) :**
$$\text{CAR}_{\text{IFSB}} = \frac{\text{Eligible Capital}}{\text{RWA}_{\text{Commercial}} + \text{RWA}_{\text{Investissements}} - (1 - \alpha) \text{RWA}_{\text{PSIA}}}$$
  où $\alpha$ (généralement compris entre 0.20 et 0.40) mesure le **Risque Commercial Déplacé (Displaced Commercial Risk - DCR)**.
* **Réserves Amortisseuses de Choc :**
  - **PER (Profit Equalization Reserve) :** Prévient la baisse brutale des rendements servis aux déposants pour éviter les retraits paniques (*Bank Run*).
  - **IRR (Investment Risk Reserve) :** Couvre les pertes directes sur le capital des investissements Moudaraba/Musharaka.

### 7.2. Pipeline Prédictif IA (FastAPI + XGBoost)
* **Entrées :** Choc sur TMM ($\Delta i$), variation du PIB ($\Delta \text{PIB}$), choc d'inflation, choc sur Tunindex.
* **Modèle ML :** Régresseurs multi-sorties calibrés sur les historiques d'états financiers pour prédire simultanément :
  1. Le nouveau niveau de créances classées ($\text{NPL}_{\text{post}}$).
  2. Le ratio de solvabilité final ($\text{CET1}_{\text{post}}$ ou $\text{CAR}_{\text{IFSB}}$).
  3. Le déficit ou surplus de fonds propres en millions de Dinars.

---

## 8. Module d'Actuariat Prédictif & Provisionnement de Sinistres

Ce module intègre la science actuarielle pour la modélisation de passifs d'assurance (en s'appuyant sur les données d'assureurs cotés comme `STAR`, `AST`, `BHASS`).

### 8.1. Tarification Prédictive par Modèles Linéaires Généralisés (GLM)
La prime pure est décomposée selon la structure canonique :
$$\text{Prime Pure } (\Pi) = \mathbb{E}[\text{Fréquence}] \times \mathbb{E}[\text{Sévérité}]$$

1. **Modèle de Fréquence (Loi de Poisson) :**
$$N_i \sim \mathcal{P}(\lambda_i), \quad \ln(\lambda_i) = \ln(E_i) + X_i \beta$$
   où $E_i$ est l'exposition au risque (durée de couverture en années).
2. **Modèle de Sévérité (Loi Gamma) :**
$$Y_i \sim \Gamma(\alpha, \mu_i), \quad \ln(\mu_i) = Z_i \gamma$$
3. **Prime Commerciale :**
$$\text{Prime Commerciale} = \frac{\Pi + \text{Frais de Gestion}}{(1 - \text{Taux de Chargement Commercial}) \times (1 - \text{Marge Bénéficiaire})}$$

### 8.2. Provisionnement des Sinistres (Triangles de Liquidation - Chain Ladder)
Estimation des provisions pour sinistres survenus mais non déclarés (**IBNR** - *Incurred But Not Reported*) :
* **Facteurs de développement (Link Ratios) :**
$$f_j = \frac{\sum_{i=1}^{n-j} C_{i, j+1}}{\sum_{i=1}^{n-j} C_{i, j}}$$
* **Projection des charges ultimes :**
$$\hat{C}_{i, n} = C_{i, n-i+1} \times \prod_{j=n-i+1}^{n-1} f_j$$
* **Provisions IBNR :**
$$\text{IBNR}_i = \hat{C}_{i, n} - C_{i, n-i+1}$$

---

## 9. Module d'Explicabilité XAI (SHAP, LIME) & NLP FinBERT

Pour qu'un modèle d'intelligence artificielle soit validé par les autorités de contrôle (BCT, ACPR, BCE) et compréhensible pour le trader ou risk manager :

```
             ┌───────────────────────────────────────────────────────────┐
             │                PIPELINE D'EXPLICABILITÉ XAI               │
             └─────────────────────────────┬─────────────────────────────┘
                                           │
         ┌─────────────────────────────────┴─────────────────────────────────┐
         ▼                                                                   ▼
 [ EXPLICABILITÉ LOCALE ]                                            [ EXPLICABILITÉ GLOBALE ]
 (Au niveau d'une transaction / d'une banque)                        (Sur l'ensemble du marché)
         │                                                                   │
 * SHAP Waterfall Plot :                                             * SHAP Summary Plot (Beeswarm) :
   Décomposition exacte de la décision :                               Classement des variables motrices
   Score de risque = Valeur de base (E[Y])                             (ex: Taux de NPL, Ratio LCR, TMM).
   + Contribution Choc Taux (+1.4%)                                  * Matrices de dépendance partielle
   - Amortisseur Réserve PER (-0.8%)                                   montrant les effets de seuil critiques.
   = Ratio CET1 simulé final.
```

### 9.1. Formulation Mathématique des Valeurs de Shapley
Pour chaque prédiction $f(x)$ d'un choc bancaire ou d'un tarif d'assurance, la contribution de la variable $i$ est définie par :
$$\phi_i(x) = \sum_{S \subseteq F \setminus \{i\}} \frac{|S|! (|F| - |S| - 1)!}{|F|!} \left[ f_x(S \cup \{i\}) - f_x(S) \right]$$
Garantissant les propriétés d'**Efficacité**, de **Symétrie**, de **Dummy** et d'**Additivité**.

### 9.2. Traitement NLP des Sentiments Financiers (FinBERT)
* Entrée : Flux RSS et communiqués financiers BVMT / Marchés internationaux.
* Traitement : Tokenisation BERT et classification tridimensionnelle `[Positive, Neutral, Negative]`.
* Output : **Score de Sentiment Normalisé $[-1.0, +1.0]$** injecté comme variable explicative exogène dans les modèles pré-trade.

---

## 10. Spécification des Contrats d'Interface (REST API & WebSockets STOMP)

### 10.1. Matrice des Endpoints REST

| Module | Méthode | URI Endpoint | Description Fonctionnelle | Rôles Autorisés |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/v1/auth/login` | Authentification & émission du JWT token | Public |
| **Auth** | `POST` | `/api/v1/auth/register` | Création de compte trader avec capital initial | Public |
| **Portfolio**| `GET` | `/api/v1/portfolios/me` | Synthèse du portefeuille, cash, positions, P&L | Authentifié |
| **Trading** | `POST` | `/api/v1/orders` | Dépôt d'un ordre (Market, Limit, Stop) | TRADER_JUNIOR, PRO |
| **Trading** | `DELETE`| `/api/v1/orders/{id}` | Annulation d'un ordre en attente | TRADER_JUNIOR, PRO |
| **Risk** | `GET` | `/api/v1/risk/metrics` | Calcul VaR (95%, 99%), Sharpe, Drawdown | RISK_MANAGER, ADMIN |
| **Stress** | `POST` | `/api/v1/stress-test/simulate`| Simulation de chocs macro conventionnel vs islamique | RISK_MANAGER, ADMIN |
| **XAI** | `POST` | `/api/v1/xai/explain-prediction` | Calcul des valeurs SHAP (waterfall/summary) | RISK_MANAGER, ACTUAIRE |
| **Actuariat**| `POST` | `/api/v1/actuarial/price-policy` | Calcul de la prime pure et chargée par GLM | ACTUAIRE, ADMIN |
| **Actuariat**| `GET` | `/api/v1/actuarial/chain-ladder` | Triangle de liquidation et calcul des réserves IBNR | ACTUAIRE, ADMIN |

### 10.2. Canaux Temps Réel (WebSockets STOMP)
* Point de raccordement WebSocket : `ws://localhost:8080/ws-market` (avec fallback SockJS).
* **Topic de cotation en direct :** `/topic/quotes/{ticker}`  
  *Payload :* `{ "ticker": "BIAT", "lastPrice": 94.500, "bid": 94.200, "ask": 94.600, "volume": 1250, "timestamp": "2026-10-04T12:00:00Z" }`
* **Queue privée d'exécution d'ordres :** `/user/queue/orders`  
  *Payload :* `{ "orderId": "uuid", "status": "FILLED", "executedPrice": 94.500, "quantity": 100 }`

---

## 11. Matrice d'Implémentation Sprint par Sprint & Recette

```
Sprint 1 (Fondations & Trading) ──► Sprint 2 (Risque & Backtest) ──► Sprint 3 (IA, XAI & NLP) ──► Sprint 4 (Stress Testing) ──► Sprint 5 (Actuariat & Docker)
```

| Sprint | Périmètre & Livrables Techniques | Jalons & Critères d'Acceptance |
| :--- | :--- | :--- |
| **Sprint 1 : Socle Transactionnel** | - Schéma PostgreSQL & migrations Flyway<br>- Modèles JPA, Spring Security JWT<br>- Moteur d'ordres d'achat/vente et verrouillage pessimiste<br>- Replay de cotations via WebSockets STOMP | Enregistrement d'un utilisateur, exécution atomique d'un ordre d'achat sur `BIAT` ou `BTC-USD`, mise à jour du cash et des positions sans double-dépense. |
| **Sprint 2 : Risque & Dashboard** | - Moteur de risque pré-trade (limites d'exposition)<br>- Calculs post-trade (VaR 99%, Sharpe, Drawdown)<br>- Frontend TradingView Lightweight Charts & carnet d'ordres | Blocage automatique d'un ordre si le montant excède le capital libre ; affichage en temps réel de la courbe P&L et du carnet. |
| **Sprint 3 : Microservice IA & XAI** | - FastAPI opérationnel connecté à Spring Boot<br>- Modèles de prédiction de tendance (XGBoost/LSTM)<br>- Explicabilité SHAP intégrée (Waterfall API)<br>- Module FinBERT pour le sentiment d'actualités | L'utilisateur soumet une prédiction et reçoit en retour le signal d'achat ainsi que le graphique des contributions locales de chaque facteur. |
| **Sprint 4 : AI Stress Testing Bancaire** | - Modélisation bilancielle Conventionnelle vs Islamique<br>- Moteur de chocs macroéconomiques (TMM, PIB, NPL)<br>- Simulateur de résilience CET1 vs CAR IFSB (WIFAK vs BIAT) | Application d'un choc macroéconomique extrême (+300 bps Taux, -4% PIB) et visualisation de la divergence de solvabilité entre banques. |
| **Sprint 5 : Actuariat & Industrialisation** | - Modèles GLM de tarification (Fréquence Poisson, Sévérité Gamma)<br>- Triangle de liquidation Chain Ladder (IBNR)<br>- Conteneurisation globale (`docker-compose.yml`)<br>- Rapport méthodologique final et slide deck de soutenance | Déploiement `docker-compose up` complet en une commande : PostgreSQL, Spring Boot, FastAPI et Frontend opérationnels. |

---
*Ce document sert de contrat de spécification technique pour l'ensemble des développements du projet PIF.*
