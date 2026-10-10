# Projet PIF - Guide d'Installation et d'Exécution

Ce document explique comment lancer les différentes parties du projet (Frontend et Backend) sur votre machine locale.

## Prérequis
- [Node.js](https://nodejs.org/) (version 18+ recommandée) pour le frontend.
- [Java Development Kit (JDK)](https://adoptium.net/) (version 17 ou plus, à vérifier selon le projet) pour le backend.

---

## 🚀 Lancer le Backend (Spring Boot / Java)

Le backend utilise Maven. Un wrapper Maven (`mvnw`) est inclus, il n'est donc pas nécessaire d'installer Maven manuellement.

1. Ouvrez un terminal.
2. Déplacez-vous dans le dossier `backend` :
   ```bash
   cd backend
   ```
3. Exécutez l'application via le wrapper Maven (sur Windows) :
   ```cmd
   mvnw.cmd spring-boot:run
   ```
   *(Si vous êtes sur Mac/Linux, utilisez `./mvnw spring-boot:run`)*

Le serveur backend devrait démarrer (généralement sur le port `8080`).

---

## 🎨 Lancer le Frontend (React / Vite)

Le frontend utilise React avec Vite et TailwindCSS.

1. Ouvrez un **nouveau** terminal (laissez le backend tourner).
2. Déplacez-vous dans le dossier `frontend` :
   ```bash
   cd frontend
   ```
3. Installez les dépendances npm (à faire uniquement la première fois ou si le `package.json` a été modifié) :
   ```bash
   npm install
   ```
4. Lancez le serveur de développement :
   ```bash
   npm run dev
   ```

Vite vous affichera une URL locale (généralement `http://localhost:5173`) dans le terminal. Ouvrez ce lien dans votre navigateur pour accéder à l'application.
