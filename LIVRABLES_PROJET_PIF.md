# Guide et Spécification des Livrables du Projet
## Simulateur de Salle de Marché & AI Stress Testing (PIF 2026-2027)

---

## 1. Vue d'Ensemble des Livrables

Le projet s'articule autour de **quatre grandes catégories de livrables** indispensables pour valider la démarche d'ingénierie financière, logicielle et d'intelligence artificielle :

1. **Livrables Techniques & Logiciels (Code Source & Déploiement)**
2. **Livrables de Modélisation IA, XAI & Actuariat**
3. **Livrables Documentaires & Méthodologiques**
4. **Livrable de Démonstration & Soutenance**

---

## 2. Détail par Catégorie de Livrable

### 2.1. Livrables Techniques & Code Source

* **Cœur Backend (Spring Boot 3.x) :**
  - Moteur de simulation d'ordres d'achat/vente (Marché, Limite, Stop-Loss, Take-Profit).
  - Gestion transactionnelle sécurisée du portefeuille virtuel et valorisation en temps réel (P&L, cash balance).
  - Contrôles de conformité pré-trade et calcul des indicateurs de risque (VaR, Sharpe, Drawdown, exposition).
  - Piste d'audit (*Audit Trail*) immuable et authentification sécurisée (Spring Security + JWT / RBAC).
  - Serveur de WebSockets pour la diffusion des flux de cotations en temps réel.
* **Microservice IA / Data Science (Python - FastAPI / Flask) :**
  - API de calcul prédictif (modèles Time-Series ML/DL pour les tendances de cours).
  - Pipeline NLP d'analyse de sentiments sur actualités financières (ex. FinBERT).
  - Moteur de Stress Testing bancaire (génération de chocs macroéconomiques et calcul de résilience CET1/pertes).
  - Moteur d'explicabilité (XAI avec SHAP et LIME).
  - Modèles actuariels (tarification, prédiction de fréquence et provisionnement de sévérité des sinistres).
* **Interface Frontend (React / Angular) :**
  - Tableau de bord de salle de marché avec intégration graphique avancée (TradingView Lightweight Charts).
  - Espace de gestion du portefeuille et carnet d'ordres en direct.
  - Console interactive de Stress Testing avec comparaison dynamique (Banques Conventionnelles vs Banques Islamiques).
  - Tableaux de bord d'explicabilité XAI (graphiques SHAP summary et waterfall).
  - Espace pédagogique (modules de cours, quiz, leaderboard).


---

### 2.2. Livrables de Modélisation (IA, Risque & Actuariat)

* **Artefacts & Pipelines de Données :**
  - Jeux de données préparés et nettoyés (actions internationales/tunisiennes BVMT, cryptos, bilans bancaires, données sinistres).
  - Notebooks Jupyter documentés montrant l'entraînement, la validation croisée et l'évaluation des hyperparamètres.
* **Modèles Sauvegardés :**
  - Fichiers modèles sérialisés (`.joblib`, `.pt`, `.onnx`).
* **Rapport de Benchmarking des Modèles :**
  - Métriques comparatives de performance prédictive (RMSE, MAE, Accuracy, F1-score, AUC-ROC).
  - Comparatif chiffré de résilience bilancielle face aux scénarios de choc macroéconomique.

---

### 2.3. Livrables Documentaires

1. **Rapport Technique & Cahier d'Architecture :**
   - Diagrammes d'architecture logicielle (C4 Model ou UML : Cas d'utilisation, Classes, Séquence de transaction).
   - Schéma relationnel de la base de données (MCD/MLD).
   - Documentation OpenAPI/Swagger décrivant l'ensemble des endpoints REST.
2. **Dossier d'Ingénierie Financière & Méthodologique :**
   - Justification théorique des formules de risque retenues (VaR historique/paramétrique, Sharpe, Max Drawdown).
   - Méthodologie du Stress Testing : formalisation des bilans bancaires conventionnels vs participatifs (spécificités Mourabaha, Moudaraba, Ijara).
   - Formulations actuarielles (modèles de fréquence Poisson, lois de sévérité Gamma/Lognormale, calcul de prime pure).
3. **Manuel d'Installation et Guide Utilisateur :**
   - Guide pas à pas de déploiement en local (`README.md` exhaustif).
   - Manuel illustré d'utilisation des interfaces trader et administrateur.

---

### 2.4. Livrables de Démonstration & Soutenance

* **Support de Présentation (Slide Deck) :**
  - Présentation synthétique pour le jury / client expert financier (problématique, architecture, démonstration des fonctionnalités clés, résultats d'IA et XAI, perspectives).
* **Jeu d'Essai & Scénarios de Démo :**
  - Comptes de démonstration préconfigurés (Trader Junior, Trader Pro, Risk Manager, Admin).
  - Scénario préenregistré de Stress Test montrant en direct la réaction d'une banque conventionnelle face à une banque islamique.

---

## 3. Matrice de Répartition par Sprint

| Sprint | Livrables Attendus | Critères de Succès |
| :--- | :--- | :--- |
| **Sprint 1** | Socle Spring Boot, BDD PostgreSQL, Auth JWT, API Trading de base, Stream cours | Un utilisateur s'enregistre, dispose d'un capital virtuel, achète/vend un actif et voit son portefeuille mis à jour. |
| **Sprint 2** | Moteur de gestion des risques pré-trade, Backtesting, Audit trail, Dashboard UI | L'exécution d'un ordre bloque en cas de surexposition ; le backtest d'une stratégie sur 1 an sort un rapport de Sharpe/P&L. |
| **Sprint 3** | Microservice IA Python, Modèles de tendance de marché, NLP FinBERT, Visualisation SHAP | L'API IA renvoie un signal (Achat/Vente) avec le graphique des contributions explicatives locales XAI. |
| **Sprint 4** | Console de Stress Testing bancaire, Simulation de chocs macro, Comparatif conventionnel / islamique | L'utilisateur applique un choc de taux/défaut et observe la dégradation différentielle du ratio CET1 des deux banques. |
| **Sprint 5** | Module Actuariat (pricing/provisionnement), Agent autonome, Quiz/Challenges, Rapport final | Calcul automatisé de la prime d'assurance pure/chargée, système complet documenté et conteneurisé sous Docker. |

---

## 4. Arborescence Cible du Dépôt de Projet

```text
simulateur-salle-marche/
├── backend-spring/              # Application Spring Boot (Trading, Risk, Sécurité)
│   ├── src/main/java/com/pif/
│   │   ├── config/              # Sécurité JWT, WebSockets
│   │   ├── controllers/         # Endpoints REST
│   │   ├── models/              # Entités JPA (User, Position, Order, etc.)
│   │   ├── repositories/        # Interfaces Spring Data JPA
│   │   └── services/            # Logique métier transactionnelle
│   └── pom.xml
├── ai-microservice/             # Service Python (IA, XAI, Stress Testing, Actuariat)
│   ├── models/                  # Poids et fichiers de modèles sérialisés
│   ├── notebooks/               # Entraînement et validation des modèles
│   ├── src/
│   │   ├── stress_testing/      # Algorithmes de chocs et calculs de ratios
│   │   ├── xai/                 # Explicabilité SHAP / LIME
│   │   ├── actuarial/           # Tarification et modélisation de sinistres
│   │   └── main.py              # Point d'entrée FastAPI
│   └── requirements.txt
├── frontend/                    # Application Web (Angular / React)
│   ├── src/
│   │   ├── components/          # Widgets TradingView, carnets d'ordres, charts SHAP
│   │   ├── pages/               # Dashboard, Trading, Stress Testing, Formation
│   │   └── services/            # Appels API vers Spring Boot
│   └── package.json
├── docker-compose.yml           # Déploiement multi-conteneurs en une seule commande
├── docs/                        # Architecture, Manuel d'installation, Spécifications
└── README.md                    # Guide général de prise en main rapide
```
