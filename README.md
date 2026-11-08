# PIF – Simulateur de salle de marché

Projet Informatique Finance (option Fintech, ESPRIT, 2026-2027).

Une plateforme où l'on trade avec de l'argent virtuel sur des données de marché réelles, où l'on teste des stratégies, où l'on simule des crises bancaires et des produits d'assurance, et où l'on apprend la finance. L'intelligence artificielle est présente dans chaque module.

---

## ✨ Fonctionnalités

| Module | Ce que l'on peut faire | Page |
|---|---|---|
| **Trading** | Acheter et vendre 87 actions de la Bourse de Tunis et des cryptos avec 100 000 TND virtuels, à une date simulée | Salle de marché |
| **Gestion du risque** | Stop-Loss, Take-Profit, Trailing Stop, suivi de la performance, optimiseur de Markowitz | Portefeuille |
| **IA de marché** | Signal Achat / Vente / Neutre (XGBoost) expliqué par SHAP, actualités et sentiment, séances anormales, agent d'analyse, assistant documenté (RAG) | Salle de marché |
| **Backtesting** | Rejouer 6 stratégies sur l'historique et comparer leurs résultats (Sharpe, perte maximale…) | Backtesting |
| **Stress testing** | Simuler une crise sur des banques conventionnelles et islamiques, avec explications SHAP | Stress Testing |
| **Actuariat** | Mesurer le risque d'un actif (volatilité, VaR, Expected Shortfall, drawdown maximal), prévoir sa volatilité (GARCH) et simuler ses trajectoires (Monte-Carlo) | Actuariat |
| **Formation** | Cours, quiz, scénarios de marché réels, défis, points, badges et classement ; cours recommandé à la fin d'un match | Formation |
| **Administration** | Statistiques de la plateforme, gestion des comptes, saisie des actualités, suivi de la formation, journal d'audit | Administration (admin) |

---

## 🏗️ Architecture

```
Navigateur ──► Frontend React (port 3000) ──► Backend Spring Boot (port 8080) ──► Service IA FastAPI (port 8000)
                                                       │                                  │ (optionnel)
                                                       ▼                                  ▼
                                               PostgreSQL (port 5432)             LLM local LM Studio (port 1234)
```

Le navigateur ne parle qu'au backend. Le backend vérifie l'identité (JWT), applique les règles métier et appelle le service IA pour les calculs Python.

| Couche | Technologies |
|---|---|
| Frontend | React 18, Vite, React Router, Tailwind CSS |
| Backend | Java 17, Spring Boot 3.2, Spring Security + JWT, JPA, Flyway, Swagger |
| Service IA | Python 3.11, FastAPI, XGBoost, scikit-learn, SHAP, statsmodels, sentence-transformers, ChromaDB / FAISS |
| Base de données | PostgreSQL 16 (Docker) |

### Structure du dépôt

```
PIF/
├── frontend/              Interface React (src/pages, src/components, src/services)
├── backend/               API Spring Boot, un package par module sous com.pif
├── ai/                    Service IA : signal, RAG, agent, stress/, actuarial/
├── ALL_DATA.csv/          Historique journalier des actions BVMT (2010-2022)
├── BNB_USD_daily_data.csv Historique BNB
├── docker-compose.yml     PostgreSQL (+ pgAdmin en option)
└── .github/workflows/     Intégration continue
```

Packages du backend (`com.pif`) : `auth`, `marketdata`, `trading`, `ai`, `backtest`, `stresstest`, `actuarial`, `learning`, `audit`, `common`.

---

## 🚀 Démarrage rapide

### 1. Prérequis

| Outil | Version |
|---|---|
| Node.js | 18 ou plus |
| JDK | 17 |
| Python | 3.11 |
| Docker | Pour PostgreSQL (ou un PostgreSQL local) |

Maven n'est pas nécessaire : le wrapper `mvnw` est fourni.

### 2. Configuration

```bash
cp backend/.env.example backend/.env
```

Remplir dans `backend/.env` :

| Variable | Obligatoire | Rôle |
|---|---|---|
| `DB_PASSWORD` | Oui | Mot de passe PostgreSQL |
| `JWT_SECRET` | Oui | 32 caractères minimum (ex. `openssl rand -base64 48`) |
| `DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD` | Non | Crée un compte admin au démarrage (mot de passe de 12 caractères min.) |
| `ALPHA_VANTAGE_API_KEY` | Non | Actions américaines en ligne |

`backend/.env` est ignoré par Git : ne jamais le committer. Le backend refuse de démarrer si `JWT_SECRET` est absent ou trop court.

### 3. Lancer les services (un terminal par service, dans cet ordre)

**Terminal 1 – Base de données**
```bash
docker compose --env-file backend/.env up -d postgres
```

**Terminal 2 – Service IA**
```bash
cd ai
python -m venv venv
source venv/bin/activate        # Windows : venv\Scripts\activate
pip install -r requirements_ai.txt
python ai_server.py             # http://127.0.0.1:8000
```
Le modèle XGBoost entraîné est déjà fourni dans `ai/models/` : aucun entraînement n'est nécessaire.

**Terminal 3 – Backend**
```bash
cd backend
./mvnw spring-boot:run          # Windows : mvnw.cmd spring-boot:run
```

**Terminal 4 – Frontend**
```bash
cd frontend
npm install                     # la première fois
npm run dev
```

### 4. Utiliser l'application

1. Ouvrir **http://localhost:3000**.
2. Créer un compte (rôle Trader, 100 000 TND virtuels) ou se connecter avec le compte admin du `.env`.
3. Choisir un actif et une date simulée, puis passer des ordres.

| Adresse | Contenu |
|---|---|
| http://localhost:3000 | Application |
| http://localhost:8080/swagger-ui.html | Documentation de l'API (bouton *Authorize* : coller le token de `POST /api/v1/auth/login`) |
| http://127.0.0.1:8000/docs | Documentation du service IA |

### Options

| Action | Commande |
|---|---|
| Interface pgAdmin (port 5050) | `docker compose --env-file backend/.env --profile tools up -d pgadmin` (remplir `PGADMIN_EMAIL` / `PGADMIN_PASSWORD`) |
| Agent IA avec un vrai LLM | Lancer LM Studio sur le port 1234. Sans lui, un moteur quantitatif de secours répond. |
| Pré-entraîner le stress test (~1 min) | `cd ai && python -m stress.models` (sinon fait au premier appel) |
| Ré-entraîner le signal IA | `cd ai && python data_pipeline.py && python train_model.py` |

---

## 📊 Données

| Source | Contenu |
|---|---|
| `ALL_DATA.csv/ALL_DATA.csv` | Cours journaliers de 87 actions de la Bourse de Tunis, 2010 à 2022 |
| `frontend/public/data/` | Mêmes actions au format JSON, cryptos BTC / ETH / BNB (journalier, minute pour BTC et ETH) |
| Alpha Vantage | Actions américaines (AAPL, MSFT, NVDA, TSLA, IBM), avec une clé API |
| `ai/rag_docs/` | 13 documents de référence : Bâle III, BCT, BVMT, finance islamique, stress testing |
| `ai/stress/data/bank_profiles.csv` | 8 profils de banques anonymisés et **illustratifs** |
| `backend/src/main/resources/learning/catalog.json` | Contenu de la formation |

Les fichiers de données sont cherchés dans le répertoire courant puis le répertoire parent. Pour un autre emplacement, définir `PIF_DATA_DIR`.

> ⚠️ Les modèles de stress testing et d'actuariat sont entraînés sur des données **synthétiques** dont le processus générateur est documenté (`ai/stress/dataset.py`, `ai/actuarial/portfolio.py`). Pour des résultats réels, remplacer ces données par des chiffres réels ayant les mêmes colonnes.

---

## 📘 Détail des modules

### Trading (`/api/v1/orders`)
- Le **prix d'exécution est fixé par le serveur** : clôture de la dernière séance à la date simulée. Un prix envoyé par le navigateur est ignoré.
- `type` = sens (`BUY` ou `SELL`) ; `orderType` = `MARKET` (défaut) ou `LIMIT` avec `limitPrice`. Un ordre LIMIT non exécutable au cours du jour est rejeté (pas encore de carnet d'ordres en attente).
- Frais de 0,15 %. Contrôle du solde avant achat et de la quantité avant vente (pas de vente à découvert).
- Pour un achat : Stop-Loss < cours < Take-Profit. SL, TP et Trailing Stop sont déclenchés automatiquement au cours de la date simulée.
- Le bandeau de marché (indice équipondéré PIF-BVMT, cryptos, hausses et baisses du jour) est calculé sur les cours réels à la date simulée. Le carnet d'ordres L2 est **illustratif** : il est généré autour du cours réel, faute de données de profondeur.

### IA de marché (`/api/ai`)
- **Signal XGBoost** : 20 indicateurs techniques (RSI, MACD, Bollinger, ATR…), prédiction d'une hausse ou d'une baisse nette à 5 jours. Achat ou Vente seulement si la probabilité dépasse 60 %.
- **Performance** (5 plis TimeSeriesSplit) : accuracy 0,50, F1 macro 0,42. La classe Neutre représente ~67 % des cas : juger le modèle sur le F1 macro et par backtest, pas sur l'accuracy.
- **RAG** : les documents de `ai/rag_docs/` sont indexés (all-MiniLM-L6-v2 + ChromaDB, FAISS en secours) et filtrables par type de banque (`conventional`, `islamic`, `all`).
- **Signaux à la date simulée** (`GET /api/v1/ai/signals`) : la watchlist affiche le signal, le cours, la variation et le volume de la dernière séance connue à la date. Les signaux de tous les actifs sont précalculés au démarrage du backend (désactivable avec `ai.signals.warm-up=false`).
- **Pourquoi ce signal ?** (`GET /api/v1/ai/explain`, onglet *Signal IA*) : probabilités des trois classes et contribution de chaque indicateur (valeurs de Shapley exactes de l'arbre XGBoost), avec un avertissement si la date est dans la période d'entraînement.
- **Actualités et sentiment** (`/api/v1/news`) : l'administrateur saisit des actualités datées ; un lexique financier français/anglais (avec négation et intensifieurs) leur attribue un score de -1 à +1 et montre les mots retenus. Une actualité n'apparaît qu'à partir de sa date de publication, et le sentiment agrégé des 30 derniers jours (demi-vie 7 jours) alimente l'agent d'analyse.
- **Séances anormales** (`GET /api/v1/ai/anomalies`) : rendement, volume ou amplitude à plus de 4 écarts-types de la médiane des 60 séances précédentes.
- **Optimiseur de portefeuille** (`POST /api/v1/ai/optimize`, page Portefeuille) : variance minimale, Sharpe maximal, équipondéré et portefeuille actuel, frontière efficiente, part de chaque actif dans le risque. Markowitz sans vente à découvert, poids maximal par actif, covariance de Ledoit-Wolf, sur l'historique connu à la date simulée.
- Les endpoints `/api/ai/**` du backend exigent un JWT (sauf `/api/ai/health`). Le service Python n'accepte que les origines de `AI_ALLOWED_ORIGINS` (par défaut le backend).

### Backtesting (`/api/v1/backtest`)
- 6 stratégies : achat-conservation, croisement de moyennes mobiles, RSI, MACD, Bollinger, signal IA.
- **Sans biais d'anticipation** : décision à la clôture, exécution à l'ouverture du lendemain.
- **Réaliste** : frais 0,4 %, slippage 0,1 %, titres entiers pour les actions, quantités fractionnaires pour les cryptos.
- Indicateurs : rendement total et annualisé, volatilité, Sharpe, Sortino, perte maximale, Calmar, bêta, taux de réussite, profit factor, exposition, frais.

> ⚠️ Le modèle IA a été entraîné sur les données antérieures au **2020-06-19**. Un backtest du signal IA qui commence avant cette date le teste sur ses propres données d'entraînement ; la page l'indique.

### Stress testing et XAI (`/api/v1/stress-test`)
- 6 scénarios prédéfinis (référence, hausse des taux, krach, récession, crise de crédit, choc combiné) ; l'admin peut en créer d'autres et chaque utilisateur peut lancer un scénario personnalisé.
- Ridge, Random Forest et XGBoost comparés en validation croisée à 5 plis ; le meilleur R² est retenu.
- Projection des pertes puis des ratios CET1, LCR, NPL, ROA et du besoin en capital. Statut `CRITIQUE` (CET1 < 7 %), `VULNERABLE` (sous le minimum, 10 % par défaut, ou LCR < 1) ou `RESILIENTE`.
- Finance islamique : absorption de 80 % des pertes par les PSIA, risque commercial déplacé, Murabaha moins sensible aux taux, Musharaka / Mudaraba exposées comme des fonds propres.
- Explications SHAP par banque, écart entre banque conventionnelle et islamique, importance globale.

### Actuariat (`/api/v1/actuarial`)
La Bourse n'est pas assurable : le module ne calcule **ni prime, ni sinistre**. Il applique les méthodes actuarielles de mesure du risque aux **actifs financiers** et décrit leur évolution possible par des fourchettes de probabilités, jamais par une promesse de rendement.
- **Route** : `POST /api/v1/actuarial/analyze` (JWT). Le backend lit l'historique journalier de l'actif, le **coupe à la date simulée de la salle** (aucune donnée future) et l'envoie au service IA (`POST /api/ai/actuarial/analyze`), qui fait tous les calculs. Au moins 60 séances sont nécessaires.
- **Risque** (rendements logarithmiques journaliers) : volatilité annualisée, VaR historique et paramétrique, Expected Shortfall, passage à h jours par la règle en √h, drawdown maximal et actuel, asymétrie et kurtosis.
- **Prévision de volatilité** : GARCH(1,1) estimé par maximum de vraisemblance (retour progressif vers la moyenne de long terme), avec repli automatique sur l'EWMA (λ = 0,94) si l'historique compte moins de 100 séances ou si l'ajustement échoue.
- **Monte-Carlo** : 500 à 20 000 trajectoires (5 000 par défaut), chocs normaux ou de Student, dérive nulle par défaut. Résultats : éventail de prix (percentiles 5, 25, 50, 75, 95), probabilité de perte, VaR et Expected Shortfall sur le prix final, drawdown attendu.
- **Paramètres** : confiance de 90 % à 99,9 %, horizon de VaR de 1 à 60 jours, prévision de 1 à 90 jours.
- **Limites** : tout repose sur l'historique et suppose des rendements indépendants d'un jour à l'autre ; un actif est analysé à la fois (le risque d'un portefeuille est traité par l'optimiseur de Markowitz, voir *IA de marché*).
- **Tests** : `ai/actuarial/tests` (pytest, lancé par la CI) et `ActuarialControllerIntegrationTest`.
- **Rapport détaillé** (formules, exemples chiffrés, optimiseur de portefeuille) : [`docs/Rapport_Actuariat_et_Optimisation_PIF.pdf`](docs/Rapport_Actuariat_et_Optimisation_PIF.pdf).

### Formation (`/api/v1/learning`)
- 7 modules, 14 leçons, un quiz de 5 questions par module, corrigé côté serveur (seul le meilleur score compte).
- 6 scénarios sur données réelles (krach COVID, record du bitcoin…) : décider Acheter, Attendre ou Vendre, puis voir les 20 séances suivantes.
- 4 défis notés par le moteur de backtesting.
- Points, 6 niveaux (Débutant → Expert), 7 badges et classement.
- **Cours recommandé après un match** (`GET /api/v1/learning/recommendation/{roomId}`) : à la fin d'une salle, des règles simples analysent le résultat du joueur (rendement, rang, nombre d'ordres, concentration, part de cash, usage du Stop-Loss) et proposent jusqu'à 3 cours, en sautant ceux qu'il a déjà validés. Aucune donnée d'un autre joueur n'est utilisée.

### Administration (`/api/v1/admin`, rôle ADMIN)
- **Vue d'ensemble** : utilisateurs, ordres, montants échangés, connexions, backtests, activité des 30 derniers jours, progression de la formation, état du service IA.
- **Utilisateurs** : recherche, changement de rôle, désactivation (le compte ne peut plus se connecter et ses jetons sont refusés), réinitialisation du portefeuille. Un administrateur ne peut ni se désactiver ni retirer son propre rôle.
- **Actualités** : saisie, aperçu du sentiment avant publication, modification et suppression.
- **Formation** : taux de réussite par quiz, scénario et défi.
- **Journal d'audit** (`/api/v1/admin/audit-logs`) : connexions (réussies et échouées), inscriptions, ordres, déclenchements SL/TP, modifications de seuils, réinitialisations, actions des administrateurs.

---

## 🗄️ Base de données

Le schéma est géré par **Flyway** (`backend/src/main/resources/db/migration`, versions V1 à V5) ; Hibernate se contente de le valider. Pour modifier le schéma, ajouter un nouveau fichier `V6__description.sql`, sans jamais modifier une migration déjà appliquée.

---

## ✅ Tests et intégration continue

| Partie | Commande |
|---|---|
| Backend | `cd backend && ./mvnw test` (base H2 en mémoire, aucun secret requis) |
| Service IA | `cd ai && python -m pytest stress/tests actuarial/tests tests -q` |
| Frontend | `cd frontend && npm run build` |
| Pipeline IA complet | `cd ai && python test_pipeline.py --quick` |

Chaque pull request et chaque push sur `main` lancent ces vérifications (`.github/workflows/ci.yml`). Ne pas fusionner une PR dont la CI est rouge.

---

## 🛠️ Dépannage

| Problème | Solution |
|---|---|
| Le backend ne démarre pas (`JWT_SECRET`) | Remplir `JWT_SECRET` dans `backend/.env` (32 caractères min.) |
| `DB_PASSWORD manquant` avec Docker | Passer `--env-file backend/.env` à `docker compose` |
| Pages IA, Stress Testing ou Actuariat en erreur | Vérifier que `python ai_server.py` tourne sur le port 8000 |
| `pip install` très long (torch, CUDA) | Installer d'abord la version CPU : `pip install torch --index-url https://download.pytorch.org/whl/cpu` |
| Le frontend ne joint pas l'API | Le backend doit tourner sur le port 8080 (le proxy Vite y redirige `/api`) |

Pour arrêter la base : `docker compose down` (les données sont conservées dans le volume `pif_postgres_data`).


## Améliorations de l'interface et de la fiabilité (novembre 2026)

Ces changements portent sur l'affichage et la fiabilité de l'interface. Aucun calcul, aucun appel serveur et aucun port n'ont été modifiés.

### Correctifs
- Le time-lapse ne repart plus de zéro quand on change de page : le Terminal reste actif en arrière-plan.
- Les résultats de Backtesting, Stress Testing et Actuariat sont conservés quand on change de page, et réinitialisés quand on change de compte.
- Un conflit de clés React qui faisait apparaître des pages les unes sous les autres est corrigé.

### Lisibilité
- Textes de 9 à 11 px agrandis dans toute l'application (12 et 13 px au minimum).
- Menu avec le nom de chaque page, une infobulle et un onglet actif plus marqué.
- Bouton de déconnexion plus discret, avec icône et infobulle.
- Watchlist : prix plus gros, dates en JJ/MM/AAAA, infobulles sur les badges.
- Pied de page : cash, valeur totale et P&L en grands chiffres.

### Clarté
- Ligne d'aide en trois étapes en haut du Terminal (fermable).
- Libellés simplifiés et infobulles en français sur les termes techniques (Sharpe, Gini, CET1, LCR, Stop-Loss).
- Écrans vides guidés, avec un bouton vers le Terminal dans le Portefeuille.
- En-tête commun (titre et phrase d'explication) sur les pages principales.

### Nouveautés visibles
- Backtesting : trois cartes de verdict au-dessus du tableau (meilleure stratégie, Signal IA, phrase de comparaison).
- Stress Testing : cartes vertes, orange ou rouges selon la part de banques hors seuils, avec légende.

### Limites connues et suite
- Précision du modèle IA d'environ 50 % en validation croisée : le Signal IA fait moins bien que l'achat-conservation.
- À faire : améliorer le modèle (validation walk-forward), traduire les messages d'erreur d'authentification, désactiver le bouton Optimiser avec moins de 2 actifs, afficher un vrai statut de connexion.

## Mises à jour : P&L, validation du modèle IA et parité d'inférence

### Portefeuille : P&L réalisé et latent
- Le **P&L réalisé** inclut désormais les frais d'achat au prorata de la quantité vendue :
  `P&L réalisé = (prix de vente − PRU) × quantité − frais de vente − frais d'achat proportionnels`.
- Le **P&L latent** retranche les frais d'achat non encore réalisés, de sorte que
  `P&L réalisé + P&L latent = variation de la valeur totale du compte`.
- Une migration (`V6__position_buy_fees.sql`) ajoute le cumul des frais d'achat à chaque position.
  Les positions ouvertes avant la migration démarrent avec des frais d'achat à 0.
- La colonne Stop-Loss est un **prix absolu** : elle est maintenant affichée avec l'unité (TND).
- Test unitaire : achat de 10 à 60,5 puis vente de 10 à 63 (frais 0,15 %) → P&L réalisé de 23,147.

### Service IA : validation et métriques
- Tri des données par `(date, ticker)` et `TimeSeriesSplit` à 5 plis avec un **gap de 5 jours de bourse**
  (5 × nombre de tickers) entre entraînement et validation. Évaluation finale sur les 20 % de dates les plus récentes.
- `cv_mean_auc` est calculé (AUC un-contre-tous, moyenne macro) et exposé par `/api/ai/health`.
- Métriques affichées à l'entraînement : accuracy, AUC macro, AUC par classe, **AUC directionnelle**
  (Achat contre Vente sur les jours non neutres), précision/rappel par classe, baseline « toujours Neutre »
  et matrice de confusion du dernier pli.
- `sentiment_score` renommé `momentum_proxy_score` : c'est un score de momentum dérivé de RSI/MACD, pas un
  sentiment d'actualités.
- 8 variables ajoutées (28 au total) : rendements cumulés 5/10/20 jours, rendement relatif au marché,
  ratio de volatilité 5/30 jours, distance au plus haut/bas 52 semaines, volume relatif 5/20 jours.

### Parité entraînement / inférence
- `relative_to_market_return` suppose la moyenne du marché à la même date. Avec un seul ticker, elle valait
  toujours 0 à l'inférence. Elle est désormais lue dans `ai/models/market_return_by_date.csv`
  (généré par `ai/build_market_return.py`) ; si une date manque, la moyenne retombe sur 0 avec un avertissement.
- Vérification sur BIAT (3 170 dates) : écart maximal nul entre la valeur d'entraînement et celle d'inférence.

### Relancer le service IA après un réentraînement
Le modèle du backtest est chargé une seule fois, au premier appel après le démarrage du service.
Après chaque réentraînement :
1. Redémarrer `ai_server.py` (`cd ai` puis `py -3.12 ai_server.py`).
2. Vérifier `/api/ai/health` : `trained_at` et `cv_mean_auc` doivent être à jour.
3. Relancer le backtest.

### Résultats (action BIAT, 01/07/2020 → 30/12/2022, seuil 0,5, détention 5 jours)
| Modèle IA | Rendement | Sharpe | Trades | Frais (TND) |
|---|---|---|---|---|
| Avant correction de la validation | 24,3 % | 0,83 | 18 | 20 217 |
| Validation corrigée (20 variables) | 23,2 % | 0,80 | 18 | 19 840 |
| Achat-conservation (référence) | 84,9 % | 1,46 | 1 | 498 |

Métriques en validation croisée (28 variables) : AUC macro 0,649, AUC directionnelle 0,576,
précision directionnelle 0,577. Le signal directionnel est faible mais stable ; l'AUC macro est surtout
portée par la détection de volatilité (classe Neutre).

### Limites connues
- Le Signal IA fait moins bien que l'achat-conservation sur la période testée ; relever le seuil de 0,5 à 0,6
  réduit les frais mais dégrade le résultat (6 trades, échantillon trop petit pour conclure).
- `/predict` et `/analyze` ne calculent que 11 des 28 variables à partir des champs envoyés par le client ;
  les autres valent 0 (écart antérieur à ces changements).
- Stress testing et actuariat reposent sur des données synthétiques et des profils bancaires illustratifs.
- Le bas de page affiche « WS Live: STOMP Connected » en dur ; WebSockets STOMP, LIME et LSTM ne sont pas implémentés.
