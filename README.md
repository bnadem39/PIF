# Projet PIF – Guide d'Installation & d'Exécution

Ce document décrit comment lancer **toutes** les parties du projet : le backend Java/Spring, le frontend React/Vite, les composants IA (pipeline de données, entraînement XGBoost, moteur RAG & serveur FastAPI) et la suite de tests.

---

## 📋 Prérequis

- **Node.js** v18+ (pour le frontend) ;
- **JDK** 17 (ou version compatible avec le projet) ;
- **Python** 3.11 ;
- **Docker** (facultatif – le compose démarre PostgreSQL) ;
- **Maven** (wrapper `mvnw` fourni) ;
- Bibliothèques Python : `pip install -r requirements_ai.txt` (voir le fichier **requirements_ai.txt** dans `ai/`).

### 🛠️ Créer un environnement virtuel Python (venv)

```bash
python -m venv venv          # créer le venv dans le répertoire du projet
.\\venv\\Scripts\\activate   # activer sous Windows PowerShell ou CMD
# (sur Unix/macOS) source venv/bin/activate
pip install -r requirements_ai.txt
```


---

## 🔐 Configuration (`backend/.env`)

Aucun secret n'est fourni par défaut. Avant le premier lancement :
```bash
cp backend/.env.example backend/.env
# puis remplir DB_PASSWORD, JWT_SECRET (32 caractères min., ex. `openssl rand -base64 48`),
# et, si vous voulez un compte admin, DEFAULT_ADMIN_EMAIL / DEFAULT_ADMIN_PASSWORD (12 caractères min.)
```
- Le backend refuse de démarrer si `JWT_SECRET` est absent ou trop court.
- Le compte administrateur n'est créé que si `DEFAULT_ADMIN_EMAIL` et `DEFAULT_ADMIN_PASSWORD` sont définis.
- `backend/.env` est ignoré par Git : ne le committez jamais.

---

## 🗄️ Base de données (PostgreSQL)

Le projet utilise PostgreSQL via Docker :
```bash
# Depuis le répertoire racine du projet
docker compose --env-file backend/.env up -d postgres      # démarre la DB
# Optionnel : interface pgAdmin (PGADMIN_EMAIL / PGADMIN_PASSWORD dans backend/.env)
docker compose --env-file backend/.env --profile tools up -d pgadmin
```
La base est exposée sur `127.0.0.1:5432`.

---

## 🚀 Lancer le **Backend** (Spring Boot / Java)

```bash
cd backend
# wrapper Maven fourni – aucune installation supplémentaire requise
mvnw.cmd spring-boot:run          # sous Windows
# ou, sur macOS/Linux :
./mvnw spring-boot:run
```
Le serveur démarre par défaut sur le port **8080**.

### Structure du backend
Un package par module sous `com.pif` : `auth` (comptes, JWT), `marketdata` (données CSV / Alpha Vantage, cours serveur), `trading` (ordres, positions, portefeuille), `ai` (client du service FastAPI), `audit` (journal d'audit), `common` (configuration, erreurs). Un nouveau module (stress test, backtest, formation, actuariat, admin) = un nouveau package.

### Base de données et migrations
Le schéma est géré par **Flyway** (`backend/src/main/resources/db/migration`) ; Hibernate se contente de le valider. Pour modifier le schéma, ajouter un fichier `V3__description.sql` (ne jamais modifier une migration déjà appliquée). Une base existante créée par l'ancienne configuration est automatiquement « baselinée » en version 1 au premier démarrage.

### Documentation de l'API
Swagger UI : http://localhost:8080/swagger-ui.html (bouton *Authorize* : coller le token renvoyé par `POST /api/v1/auth/login`).

### Journal d'audit
Connexions (réussies et échouées), inscriptions, ordres exécutés, déclenchements SL/TP, modifications de seuils et réinitialisations sont tracés dans `audit_logs`. Consultation réservée aux administrateurs : page **Audit** du frontend ou `GET /api/v1/admin/audit-logs`.

Les fichiers de données (`ALL_DATA.csv`, `BNB_USD_daily_data.csv`, `frontend/public/data/`) sont cherchés dans le répertoire courant puis le répertoire parent. Pour un autre emplacement, définir `PIF_DATA_DIR`.

---

## 🎨 Lancer le **Frontend** (React / Vite)

```bash
cd frontend
npm install                         # une seule fois
npm run dev                          # serveur de dev (http://localhost:3000)
```
Le frontend consomme l'API du backend (`http://localhost:8080`) via le proxy Vite. Il faut se connecter (ou créer un compte) pour trader : il n'y a plus de connexion automatique au compte admin.

### Règles du moteur de trading
- Le **cours d'exécution est déterminé par le serveur** : clôture de la dernière séance à la date simulée (`simulatedDate`). Le champ `executionPrice` envoyé par le client est ignoré.
- `type` = sens de l'ordre (`BUY` ou `SELL`). `orderType` = `MARKET` (défaut) ou `LIMIT` avec `limitPrice`. Un ordre LIMIT non exécutable au cours du jour est rejeté (pas encore de carnet d'ordres en attente).
- Pour un achat : Stop-Loss < cours < Take-Profit.
- Le portefeuille, la performance et le déclenchement SL/TP/Trailing Stop sont valorisés au cours serveur de la date simulée.
- Les endpoints `/api/ai/**` exigent un JWT (sauf `GET /api/ai/health`).

---

## 🤖 Lancer les **composants IA**

### 1️⃣ Pipeline de données (`data_pipeline.py`)
```bash
cd ai
py data_pipeline.py                 # génère `processed_data.parquet` dans `ai/`
```
### 2️⃣ Entraîner le modèle XGBoost (`train_model.py`)
```bash
py train_model.py                    # entraînement complet (TimeSeriesSplit)
# le modèle sérialisé et le fichier de méta‑données sont créés dans `ai/models/`
```
Les métriques d'entraînement sont écrites dans `ai/logs/train_model.log` et `ai/models/model_metadata.json`.

### 3️⃣ Moteur RAG (`rag_engine.py`)
Le moteur charge automatiquement les documents présents dans `ai/rag_docs/`; les 9 fichiers de référence (Basel III, finance islamique, stress‑testing, …) ont déjà été créés.
```bash
py -c "from rag_engine import get_rag_engine; print(get_rag_engine().retrieve('Quel est le LCR minimum ?', top_k=3))"
```
### 4️⃣ Serveur FastAPI (`ai_server.py`)
```bash
py ai_server.py                      # écoute sur http://127.0.0.1:8000 (AI_HOST / AI_PORT pour changer)
```
CORS : seules les origines de `AI_ALLOWED_ORIGINS` (par défaut le backend `http://localhost:8080`) sont acceptées.
Le point d'entrée `/query` accepte un JSON `{"question": "…", "bank_type": "conventional|islamic|all"}` et renvoie le contexte RAG formaté.

---

## 🔁 Intégration continue
Chaque pull request (et chaque push sur `main`) lance `.github/workflows/ci.yml` : tests backend, build frontend et vérification syntaxique du service IA. Ne fusionnez pas une PR dont la CI est rouge.

---

## ✅ Exécuter la **suite de tests** (`test_pipeline.py`)
```bash
cd ai
py test_pipeline.py                 # tests complets (incl. dépendances, sources, pipeline, modèle)
# ou en mode rapide (sans entraîner le modèle) :
py test_pipeline.py --quick
```
Les tests affichent un récapitulatif coloré et renvoient le code de sortie `0` si tout passe.

---

## 📚 Pourquoi des documents *Islamic* ?
Le cahier des charges mentionnait un **pipeline RAG automatisé** couvrant :
- les normes **Bâle III** (conventionnelles) ;
- les **normes de finance islamique** (Murabaha, Mudaraba, Musharaka, etc.) ;
- les **stress‑tests**.
Afin de permettre des recherches contextuelles tant pour les banques conventionnelles que pour les institutions islamiques, nous avons ajouté les 5 fichiers `islamic_*` dans `rag_docs/`.  Le moteur RAG les indexe automatiquement et, grâce aux tags (`banque_islamique`, `charia`), les filtres `bank_type="islamic"` renvoient uniquement les extraits pertinents.

---

## 📈 Performance actuelle du modèle

Valeurs réelles du modèle committé (`ai/models/model_metadata.json`, 5 folds TimeSeriesSplit) :

| Métrique | Moyenne CV |
| --- | --- |
| Accuracy | 0.50 |
| F1 macro | 0.42 |

La classe « Neutre » représente ~67 % des données de test : un modèle qui prédit toujours « Neutre » obtient ~0.67 d'accuracy. Il faut donc juger le modèle sur le F1 macro, la précision Achat/Vente et un backtest des signaux, pas sur l'accuracy seule.

---

## 🛠️ Nettoyage
```bash
# arrêter les containers Docker
docker compose down
# supprimer les artefacts Python
rm -rf ai/__pycache__ ai/models/* ai/logs/*
```
---

*Bonne chance !*
