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

## 🗄️ Base de données (PostgreSQL)

Le projet utilise PostgreSQL via Docker :
```bash
# Depuis le répertoire racine du projet
docker compose up -d postgres      # démarre la DB
# Optionnel : interface pgAdmin
docker compose --profile tools up -d pgadmin
```
La base est exposée sur le port `5432` et les variables d'environnement sont récupérées depuis `backend/.env`.

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

---

## 🎨 Lancer le **Frontend** (React / Vite)

```bash
cd frontend
npm install                         # une seule fois
npm run dev                          # serveur de dev (http://localhost:5173)
```
Le frontend consomme l'API du backend (`http://localhost:8080`).

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
Les métriques d'entraînement (accuracy, f1, auc, …) sont écrites dans `ai/logs/train_model.log`.  Exemple :
```
[CV] Fold 1/5 | Accuracy=0.6824 | AUC=0.7512 …
[CV] Fold 5/5 | Accuracy=0.6941 | AUC=0.7625 …
```
Vous pourrez ainsi récupérer l'**accuracy finale** (moyenne des folds) directement dans ce log.

### 3️⃣ Moteur RAG (`rag_engine.py`)
Le moteur charge automatiquement les documents présents dans `ai/rag_docs/`; les 9 fichiers de référence (Basel III, finance islamique, stress‑testing, …) ont déjà été créés.
```bash
py -c "from rag_engine import get_rag_engine; print(get_rag_engine().retrieve('Quel est le LCR minimum ?', top_k=3))"
```
### 4️⃣ Serveur FastAPI (`ai_server.py`)
```bash
py ai_server.py                      # écoute sur http://0.0.0.0:8000
```
Le point d'entrée `/query` accepte un JSON `{"question": "…", "bank_type": "conventional|islamic|all"}` et renvoie le contexte RAG formaté.

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

## 📈 Accès à la **précision du modèle**
Après l’exécution de `train_model.py` :
- Ouvrez le fichier de log :`ai/logs/train_model.log` ;
- La section **[CV]** indique l'accuracy moyenne :
```
[CV] Accuracy moyenne = 0.6887  (écart‑type = 0.0073)
```
Cette valeur représente la performance du modèle sur les données de validation temporelle (TimeSeriesSplit).  Vous pouvez également charger le modèle et l’évaluer sur un jeu de test externe si besoin.

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
