# 🏛️ Architecture du Système de Gamification Multijoueur — PIF Trading Arena

## 1. Vue d'Ensemble & Vision Produit

Le système de gamification de **PIF Trading Arena** transforme le simulateur boursier multijoueur en un écosystème e-sport financier complet, compétitif et immersif. Il relie six sous-systèmes interconnectés alimentés par une autorité backend Spring Boot 3 stricte et une interface réactive React 18 / Three.js :

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PIF TRADING ARENA HUB                             │
└──────┬─────────────────┬───────────────────┬─────────────────┬──────────────┘
       │                 │                   │                 │
┌──────▼──────┐   ┌──────▼──────┐     ┌──────▼──────┐   ┌──────▼──────┐
│  Spectator  │   │   Trading   │     │ Skill Tree  │   │ Achievements│
│    Mode     │   │   Seasons   │     │  (RPG Tree) │   │  & Trophies │
└──────┬──────┘   └──────┬──────┘     └──────┬──────┘   └──────┬──────┘
       │                 │                   │                 │
       └─────────────────┼───────────────────┼─────────────────┘
                         │                   │
                  ┌──────▼──────┐     ┌──────▼──────┐
                  │Trader Career│     │3D Cinematic │
                  │  (9 Stages) │     │Celebrations │
                  └─────────────┘     └─────────────┘
```

---

## 2. Les Six Modules Fondamentaux

### Module 1 : Mode Spectateur Esports (Spectator Arena)
- **Objectif** : Permettre à n'importe quel trader d'observer en direct une salle de match sans risquer de capital ni interférer.
- **Fonctionnalités** :
  - Synchronisation temps réel du flux de chandeliers japonais et des ordres exécutés.
  - Classement dynamique des traders en direct (Equity, PnL %, Cash).
  - Flux d'activité des transactions (Buy/Sell, volumes, ticker).
  - Décompte instantané des spectateurs connectés via WebSocket (`/topic/room/{id}/spectators`).
  - Vue 3D du parquet de la salle de marché (Floor Three.js) ou graphique boursier.

### Module 2 : Saisons Compétitives (Trading Seasons)
- **Objectif** : Organiser la compétition dans le temps avec des cycles de saisons (ex: Saison 1 : L'Envol des Champions BVMT).
- **Modèle de Points** :
  - **Victoire de match** : `+100 pts`
  - **Participation** : `+25 pts`
  - **Bonus Maîtrise du Drawdown** (Drawdown < 5%) : `+30 pts`
- **Paliers de Récompenses** : Bronze, Argent, Or, Platine, Diamant, Master BVMT.
- **Clôture automatique & Archives** : Historique des saisons passées avec podiums archivés.

### Module 3 : Arbre de Compétences RPG (Skill Tree)
- **Objectif** : Récompenser l'apprentissage et le perfectionnement financier avec un arbre technologique à 5 branches :
  1. **Analyse Technique** (Moyennes mobiles, RSI, MACD, Ichimoku, Price Action).
  2. **Gestion du Risque** (Dimensionnement de position, Stop-Loss strict, Ratio R:R, Max Drawdown Guard).
  3. **Gestion de Portefeuille** (Diversification sectorielle BVMT, Équilibrage dynamique, Hedging).
  4. **Analyse de Marché** (Lecture du carnet d'ordres, Analyse macroéconomique, Sentiment de marché).
  5. **Stratégies Avancées** (Mean Reversion, Breakout Trading, Arbitrage statistique, Algorithmic Execution).
- **Intégration Académie** : La validation des modules académiques débloque les compétences associées.

### Module 4 : Succès & Salle des Trophées (Achievements & Trophies)
- **Objectif** : Gamifier les actions réelles en match avec 17 succès répartis en 6 catégories :
  - *Trading, Gestion du Risque, Compétitif, Éducation, Carrière, Social*.
- **Raretés** : Commun, Rare, Épique, Légendaire, Mythique.
- **Vitrine Publique** : Épinglage des trophées favoris sur le profil public du joueur.

### Module 5 : Carrière du Trader (Trader Career)
- **Objectif** : Progression à long terme à travers 9 échelons prestigieux :
  1. *Novice du Marché* (Niv. 1)
  2. *Trader Junior* (Niv. 5)
  3. *Analyste Financier* (Niv. 10)
  4. *Opérateur de Marché* (Niv. 15)
  5. *Senior Trader* (Niv. 20)
  6. *Gestionnaire de Portefeuille* (Niv. 25)
  7. *Stratège d'Investissement* (Niv. 30)
  8. *Hedge Fund Manager* (Niv. 40)
  9. *Légende de la BVMT* (Niv. 50)
- **Avantages Débloqués** : Titres cosmétiques dorés, bonus d'EXP, cadres néon exclusifs.

### Module 6 : Moteur de Célébration 3D Cinématique (Three.js)
- **Objectif** : Marquer les accomplissements majeurs avec des cinématiques 3D interactives en temps réel :
  - Déballage de trophée 3D métallique avec particules et vortex néon selon la rareté.
  - Anneaux d'énergie orbitaux et montée de niveau 3D (Level Up).
  - Couronne de laurier dorée et confettis pour les victoires d'arène (Victory).
  - Gestionnaire central `CelebrationManager` avec file d'attente FIFO, déduplication et persistance backend.

---

## 3. Schéma Relationnel PostgreSQL

```sql
-- Tables créées dans la migration Flyway V12
game_rooms (allow_spectators, max_spectators)
room_spectators (room_id, user_id, joined_at)
seasons (id, title, description, start_date, end_date, status, reward_tiers_json)
season_participants (season_id, user_id, season_points, matches_played, matches_won, rank)
skill_nodes (id, branch, title, description, tier, max_level, exp_reward, academy_module_id)
player_skills (user_id, skill_id, current_level, unlocked_at)
achievements (id, category, name, description, rarity, target_count, exp_reward, icon_key)
player_achievements (user_id, achievement_id, current_progress, unlocked, is_pinned)
career_stages (stage_number, title, badge_icon, min_level, min_exp, min_wins, min_skills)
player_careers (user_id, current_stage_number, unlocked_at, title_equipped)
career_history (user_id, stage_number, promoted_at)
celebration_events (event_id, user_id, event_type, title, subtitle, rarity, is_displayed)
```

---

## 4. Endpoints REST & Canaux WebSocket

### Endpoints REST (`/api/gamification/*`) :
- `GET /api/gamification/seasons/active` : Données de la saison active + stats joueur
- `GET /api/gamification/seasons/{id}/leaderboard` : Classement top 50 de la saison
- `GET /api/gamification/skills/tree` : Arbre de compétences complet avec état joueur
- `POST /api/gamification/skills/{id}/unlock` : Déblocage / amélioration de compétence
- `GET /api/gamification/achievements` : Liste des 17 succès + progression
- `POST /api/gamification/achievements/{id}/pin` : Épinglage vitrine publique
- `GET /api/gamification/career/dashboard` : Progression de carrière et exigences du palier suivant
- `POST /api/gamification/career/evaluate` : Réévaluation et promotion automatique
- `GET /api/gamification/celebrations/pending` : File d'attente des célébrations 3D non affichées
- `POST /api/gamification/celebrations/{id}/displayed` : Acquittement d'affichage
- `POST /api/gamification/spectator/{roomId}/join` : Entrée en session spectateur
- `POST /api/gamification/spectator/{roomId}/leave` : Sortie de la session spectateur
- `POST /api/gamification/academy/complete` : Validation d'un cours académique

### Canaux WebSocket STOMP :
- `/topic/room/{roomId}/spectators` : Décompte en direct des spectateurs
- `/topic/room/{roomId}/orders` : Flux d'ordres en temps réel
- `/topic/room/{roomId}/ticks` : Flux de prix et dates historiques simulées
- `/topic/user/{username}/celebrations` : Déclenchement instantané d'une célébration 3D

