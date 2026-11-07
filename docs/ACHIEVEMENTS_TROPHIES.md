# 🎖️ Succès & Salle des Trophées (Achievements & Trophies) — PIF Trading Arena

## 1. Liste des 17 Succès Déblocables

| ID | Nom | Catégorie | Rareté | Condition | EXP |
|---|---|---|---|---|---|
| `ach_first_trade` | Premier Pas en Bourse | TRADING | COMMON | Exécuter 1 ordre | +100 |
| `ach_10_trades` | Opérateur Actif | TRADING | RARE | Exécuter 10 ordres | +250 |
| `ach_50_trades` | Trader Chevronné | TRADING | EPIC | Exécuter 50 ordres | +750 |
| `ach_100_trades` | Maître des Carnets | TRADING | LEGENDARY | Exécuter 100 ordres | +2 000 |
| `ach_stoploss` | Discipline de Fer | RISK | RARE | Déclencher 1 stop-loss sans panique | +200 |
| `ach_drawdown_5` | Bouclier Anti-Crise | RISK | EPIC | Terminer un match avec DD < 5% | +500 |
| `ach_zero_loss` | Perfection Risque | RISK | MYTHIC | Finir 1er sans aucune perte nette | +3 000 |
| `ach_first_win` | Première Couronne | COMPETITIVE | RARE | Gagner 1 match d'arène | +300 |
| `ach_5_wins` | Habitué des Podiums | COMPETITIVE | EPIC | Gagner 5 matchs | +800 |
| `ach_10_wins` | Champion Indétrônable | COMPETITIVE | LEGENDARY | Gagner 10 matchs | +2 500 |
| `ach_academy_novice` | Apprenti du Savoir | EDUCATIONAL | COMMON | Compléter 1 cours d'académie | +150 |
| `ach_academy_master` | Érudit de la BVMT | EDUCATIONAL | EPIC | Compléter 5 modules académiques | +1 000 |
| `ach_career_analyst` | Titulaire de Licence | CAREER | RARE | Atteindre le rang Analyste Financier | +400 |
| `ach_career_hedgefund` | Loup de Tunis | CAREER | LEGENDARY | Atteindre le rang Hedge Fund Manager | +3 500 |
| `ach_room_creator` | Grand Architecte | SOCIAL | COMMON | Créer 1 arène de match privée | +150 |
| `ach_spectator_fan` | Observateur Éclairé | SOCIAL | COMMON | Regarder 3 matchs en direct | +200 |
| `ach_legend_mythic` | Légende Immortelle | CAREER | MYTHIC | Atteindre le rang Légende BVMT | +10 000 |

## 2. Vitrine Publique & Épinglage

- Les joueurs peuvent épingler jusqu'à 3 trophées favoris sur leur profil public via `POST /api/gamification/achievements/{id}/pin`.
- Les trophées débloqués déclenchent automatiquement la cinématique 3D de déballage de trophée métallique `TrophyCelebration3D`.

