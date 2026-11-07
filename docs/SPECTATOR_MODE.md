# 👁️ Mode Spectateur E-Sport (Spectator Arena) — PIF Trading Arena

## 1. Objectifs & Fonctionnalités

Le **Mode Spectateur E-Sport** permet à la communauté d'observer les tournois et les matchs en cours sans risquer de capital virtuel et sans perturber le déroulement de la simulation.

### Points Clés :
1. **Accès en un clic** : Depuis n'importe quelle carte d'arène en statut `RUNNING` ou `PAUSED`, un bouton violet **"Spectateur"** permet de rejoindre le direct (`/spectator/:roomId`).
2. **Interface Broadcast Esports à 3 Colonnes** :
   - **Colonne Gauche** : Classement en direct des compétiteurs (Roster, Rang, Solde, Equity totale, PnL %, ELO).
   - **Colonne Centrale** : Graphique en chandeliers japonais synchronisé ou Parquet 3D immersif (Three.js trading floor toggle).
   - **Colonne Droite** : Flux de transactions en direct (Orders Feed : Acheteur, Ticker, Volume, Prix, Type, Horodatage).
3. **Top HUD de Diffusion** :
   - Nom de l'arène & ID.
   - Date boursière historique simulée en direct.
   - Chronomètre de match restant.
   - Compteur de spectateurs connectés en temps réel avec badge pulsant `LIVE`.
4. **Sécurité & Intégrité** :
   - Les spectateurs n'ont pas accès aux boutons de passation d'ordres (Achat/Vente).
   - L'endpoint `POST /api/multiplayer/rooms/{id}/orders` refuse toute transaction émanant d'un spectateur.
   - Entrée et sortie gérées par `POST /api/gamification/spectator/{roomId}/join` et `leave`.

