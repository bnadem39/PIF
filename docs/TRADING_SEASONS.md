# 🏆 Saisons Compétitives (Trading Seasons) — PIF Trading Arena

## 1. Cycle de Vie des Saisons

Les saisons sont gérées côté backend avec 4 statuts d'exécution :
- `UPCOMING` : Saison annoncée avec compte à rebours.
- `ACTIVE` : Saison en cours, tous les matchs officiels attribuent des points.
- `FINISHED` : Période de compétition terminée, calcul des récompenses.
- `ARCHIVED` : Archives consultables dans l'onglet historique.

## 2. Modèle d'Attribution des Points de Saison

Lors de la finalisation d'un match multijoueur (`RoomSimulationTicker.finalizeMatch`) :
- **Victoire (1ère place au classement equity)** : `+100 points de saison`
- **Participation active (ordres passés)** : `+25 points de saison`
- **Bonus Drawdown Maîtrisé** : Si le joueur maintient un Max Drawdown `< 5%` sur l'ensemble de la simulation : `+30 points bonus`.

## 3. Paliers de Récompenses

| Palier | Points Requis | Récompense Cosmétique | EXP Accordé |
|---|---|---|---|
| **Bronze BVMT** | 100 pts | Badge Bronze, Titre Novice | +500 EXP |
| **Argent BVMT** | 350 pts | Badge Argent, Cadre Néon Cyan | +1 000 EXP |
| **Or BVMT** | 750 pts | Badge Or, Cadre Or Brillant | +2 500 EXP |
| **Platine BVMT** | 1 500 pts | Badge Platine, Aura de Profil | +5 000 EXP |
| **Diamant BVMT** | 3 000 pts | Badge Diamant, Titre Maître du Marché | +10 000 EXP |
| **Master BVMT** | Top 10 | Trophée 3D Exclusif, Bannière Légendaire | +25 000 EXP |

## 4. Leaderboard & Clôture Automatique

- Le classement en direct affiche le Top 50 des participants avec leurs victoires, matchs joués et ratio V/D.
- Les administrateurs peuvent finaliser et distribuer les récompenses via `POST /api/gamification/seasons/{id}/finalize`.

