# PIF TRADING ARENA — GUIDE DE DÉPLOIEMENT & DE DÉMARRAGE COMPLET
**Version :** 2.0-PRODUCTION  
**Date :** Novembre 2026

---

## 1. PRÉREQUIS SYSTÈME

* **Système d'exploitation :** Windows 10/11, Linux (Ubuntu 22.04+) ou macOS (Apple Silicon / Intel).
* **Docker & Docker Compose :** Docker Engine 24+ avec Docker Desktop actif.
* **Java Development Kit :** JDK 17 (Temurin, Oracle ou Corretto).
* **Node.js :** Version 18.x ou 20.x (LTS) avec npm 9+.
* **Python :** Version 3.11.x (avec venv).

---

## 2. PORTS RÉSEAU & ARCHITECTURE DES SERVICES

| Service | Technologie | Port d'Écoute | URL d'Accès / Health Check |
|---|---|---|---|
| **Base de Données** | PostgreSQL 16 Alpine | `5432` | `localhost:5432/pif_trading_db` |
| **Backend API & WS** | Spring Boot 3.2.5 | `8080` | `http://localhost:8080/api/v1/rooms` |
| **Microservice IA** | FastAPI / Python 3.11 | `8000` | `http://localhost:8000/docs` |
| **Frontend Web** | React 18 / Vite | `3000` | `http://localhost:3000` |

---

## 3. PROCÉDURE DE DÉMARRAGE PAS-À-PAS

### ÉTAPE 1 : Démarrage du Conteneur PostgreSQL
Dans le répertoire racine du projet :
```bash
docker compose up -d postgres
```
*Vérification :*
```bash
docker ps
```
Le conteneur `pif-postgres` doit afficher l'état `Up (healthy)` sur le port `5432`.

---

### ÉTAPE 2 : Démarrage du Microservice IA (FastAPI)
Activez l'environnement virtuel Python et lancez le serveur Uvicorn :
```bash
# Sous Windows
venv\Scripts\activate
uvicorn ai.ai_server:app --host 0.0.0.0 --port 8000 --reload

# Sous Linux / macOS
source venv/bin/activate
uvicorn ai.ai_server:app --host 0.0.0.0 --port 8000 --reload
```
*Vérification :* Ouvrez votre navigateur sur `http://localhost:8000/docs`. La documentation interactive Swagger UI s'affiche.

---

### ÉTAPE 3 : Démarrage du Backend Spring Boot
Depuis la racine du projet ou le dossier `backend` :
```bash
# Sous Windows
cd backend
.\mvnw.cmd spring-boot:run

# Sous Linux / macOS
cd backend
./mvnw spring-boot:run
```
*Flyway appliquera automatiquement toutes les migrations de V1 à V10, et le serveur démarrera sur le port 8080.*

---

### ÉTAPE 4 : Démarrage de l'Interface Utilisateur (Frontend Vite)
Dans un nouveau terminal :
```bash
cd frontend
npm run dev
```
*Le serveur de développement démarrera instantanément sur `http://localhost:3000`.*

---

## 4. COMPTES DE DÉMONSTRATION & TEST IMMÉDIAT

Pour évaluer la plateforme sans devoir créer manuellement des données :

| Utilisateur | Adresse Email | Mot de Passe | Rang Compétitif | Rôle & Permissions |
|---|---|---|---|---|
| **Adem (Compte Démo)** | `adem@gmail.com` | `Adem2026!` | **GOLD** (1650 ELO) | Création de salons, personnalisation de skin, import PC de photos et GIFs animés |
| **Master Trader** | `gold@pif.tn` | `Adem2026!` | **MASTER** (2600 ELO) | Rang Élite, accès complet aux fonctionnalités avancées |
| **Administrateur** | `admin@pif.tn` | `Admin2026!` | **ADMIN** | Gestionnaire global du système et des scénarios de crise |

---

## 5. DÉPANNAGE & SOLUTIONS COURANTES

* **Erreur de mot de passe à la connexion :**
  Si un mot de passe est rejeté, exécutez `python update_passwords.py` pour réinjecter les hash BCrypt authentiques à 60 caractères.
* **Problème d'accès à la base de données :**
  Assurez-vous que le conteneur Docker `pif-postgres` est bien actif (`docker start pif-postgres`).
* **Conflit de ports (8080, 8000 ou 3000) :**
  Identifiez le processus occupant le port avec `netstat -ano | findstr :8080` et terminez-le avant de relancer le service.

