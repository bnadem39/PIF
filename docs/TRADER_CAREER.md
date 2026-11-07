# 💼 Carrière du Trader (Trader Career) — PIF Trading Arena

## 1. Les 9 Échelons de la Profession Financière

| Échelon | Titre Officiel | Niveau Min | EXP Min | Victoires | Compétences | Bonus & Titre Cosmétique |
|---|---|---|---|---|---|---|
| 1 | **Novice du Marché** | 1 | 0 | 0 | 0 | Titre "Stagiaire Bourse" |
| 2 | **Trader Junior** | 5 | 1 500 | 1 | 2 | Titre "Exécutant Junior" |
| 3 | **Analyste Financier** | 10 | 4 000 | 3 | 4 | Titre "Analyste Agréé", Badge Néon |
| 4 | **Opérateur de Marché** | 15 | 8 000 | 6 | 6 | Titre "Opérateur de Salle", +5% EXP |
| 5 | **Senior Trader** | 20 | 14 000 | 10 | 8 | Titre "Senior Market Maker", Cadre Argent |
| 6 | **Gestionnaire de Portefeuille** | 25 | 22 000 | 15 | 10 | Titre "Portfolio Manager", Cadre Or |
| 7 | **Stratège d'Investissement** | 30 | 32 000 | 22 | 12 | Titre "Chief Investment Officer" |
| 8 | **Hedge Fund Manager** | 40 | 50 000 | 35 | 15 | Titre "Loup de la BVMT", Cadre Diamant |
| 9 | **Légende de la BVMT** | 50 | 80 000 | 50 | 18 | Titre "Légende Vivante de Tunis", Aura Or |

## 2. Évaluation & Promotion

- Les critères sont réévalués en temps réel après chaque match ou via `POST /api/gamification/career/evaluate`.
- Si toutes les exigences (Niveau, EXP, Victoires en arène, Compétences débloquées) sont remplies, la promotion est instantanément enregistrée dans la table `career_history` et une célébration 3D de prestige est déclenchée.

