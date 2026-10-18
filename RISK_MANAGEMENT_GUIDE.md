# GUIDE TECHNIQUE & PÉDAGOGIQUE : GESTION DES RISQUES (STOP-LOSS, TAKE-PROFIT, TRAILING STOP & OCO)

Ce document constitue la référence théorique, mathématique et opérationnelle du module institutionnel de gestion des risques implémenté au sein de la plateforme **PIF Market Simulator** (Spring Boot 3, PostgreSQL, React, Lightweight Charts).

---

## 1. DÉFINITION THÉORIQUE DES ORDRES AVANCÉS

### A. Stop-Loss (SL) — Ordre de Protection du Capital
* **Rôle :** Protéger le capital du trader en déclenchant automatiquement un ordre de vente au marché dès que le cours baisse et franchit à la baisse un seuil critique prédéterminé.
* **Philosophie :** Couper immédiatement les pertes avant qu'elles ne menacent la solvabilité globale du portefeuille.
* **Comportement :** Seuil statique situé sous le prix d'achat initial ($SL < P_{entrée}$).

### B. Take-Profit (TP) — Ordre de Verrouillage des Gains
* **Rôle :** Sécuriser les plus-values latentes en déclenchant automatiquement la liquidation de la position dès que le cours atteint un objectif financier fixé à l'avance.
* **Philosophie :** Éliminer le biais psychologique de cupidité (*greed*) et matérialiser les gains selon un plan de trading rigoureux.
* **Comportement :** Seuil statique situé au-dessus du prix d'achat initial ($TP > P_{entrée}$).

### C. Trailing Stop (TS) — Stop Suiveur Dynamique
* **Rôle :** Sécuriser les gains tout en laissant courir les profits lors d'une tendance haussière continue.
* **Mécanisme :**
  1. Le système mémorise le cours le plus élevé observé depuis l'ouverture de la position ($P_{highest}$).
  2. Le seuil de déclenchement est réévalué à la hausse au fur et à mesure que l'actif progresse :
     $$\text{Seuil}_{TS}(t) = P_{highest}(t) - \Delta_{TS}$$
  3. Si le marché se retourne et chute de la distance $\Delta_{TS}$ par rapport au sommet historique local, l'ordre est immédiatement exécuté. Le seuil de Trailing Stop ne descend **jamais**.

### D. Ordre OCO (One-Cancels-the-Other) — Stratégie Combinée
* **Rôle :** Associer simultanément un **Stop-Loss** et un **Take-Profit** sur la même position.
* **Règle d'or :** L'exécution de l'un des deux seuils annule immédiatement et irrévocablement l'autre branche de l'ordre pour éviter toute double exécution ou positionnement à découvert involontaire.

---

## 2. MODÉLISATION MATHÉMATIQUE & FORMULES IMPLÉMENTÉES

Toutes les opérations financières dans le backend Spring Boot sont calculées avec une précision stricte `BigDecimal(15, 3)` et le mode d'arrondi banquier `RoundingMode.HALF_UP`.

### 1. Calcul des Seuils à l'Ordre Initial
Soit $P_{exec}$ le cours d'exécution initial et $Q$ la quantité d'actions achetées.

* **Seuil Stop-Loss par pourcentage ($\%_{SL}$) :**
  $$SL_{prix} = P_{exec} \times \left(1 - \frac{\%_{SL}}{100}\right)$$
* **Seuil Take-Profit par pourcentage ($\%_{TP}$) :**
  $$TP_{prix} = P_{exec} \times \left(1 + \frac{\%_{TP}}{100}\right)$$
* **Distance Trailing Stop ($\Delta_{TS}$) :**
  Fixée en valeur monétaire absolue (TND) ou en pourcentage glissant.

---

### 2. Algorithme de Surveillance et Déclenchement Automatique (Time-Lapse Engine)
À chaque tic de marché $t$ recevant le vecteur de cotations $\{P_{sym}(t)\}$ :

```text
Pour chaque position ouverte {sym, Q, PRU, SL, TP, TS_dist, P_highest} :

  1. Mise à jour du sommet historique :
     Si P_sym(t) > P_highest Alors
         P_highest := P_sym(t)
     Fin Si

  2. Calcul du seuil glissant dynamique :
     Si TS_dist défini Alors
         Seuil_TS := P_highest - TS_dist
     Sinon
         Seuil_TS := -∞
     Fin Si

  3. Évaluation des conditions de déclenchement :
     Déclencheur := FAUX
     Raison := ""

     Si TP != NULL ET P_sym(t) >= TP Alors
         Déclencheur := VRAI
         Raison := "TAKE-PROFIT"
     Sinon Si Seuil_TS != -∞ ET P_sym(t) <= Seuil_TS Alors
         Déclencheur := VRAI
         Raison := "TRAILING-STOP"
     Sinon Si SL != NULL ET P_sym(t) <= SL Alors
         Déclencheur := VRAI
         Raison := "STOP-LOSS"
     Fin Si

  4. Exécution atomique OCO :
     Si Déclencheur = VRAI Alors
         Exécuter VENTE(sym, Q, P_sym(t))
         Calculer Frais = Q * P_sym(t) * 0.0015
         Calculer PnL_Réalisé = Q * (P_sym(t) - PRU) - Frais
         Créditer Cash = Cash + (Q * P_sym(t) - Frais)
         Supprimer la position de la table PostgreSQL
         Enregistrer la transaction d'audit (Audit Trail)
     Fin Si
```

---

### 3. Calcul du Ratio Rendement / Risque (Risk / Reward Ratio - R/R)
Le ratio $R/R$ mesure l'espérance mathématique d'une stratégie :
$$R/R = \frac{\text{Gain Cible Potentiel}}{\text{Perte Maximale Autorisée}} = \frac{TP_{prix} - P_{exec}}{P_{exec} - SL_{prix}}$$

* **Exemple :**
  - Achat BIAT à $100.000\text{ TND}$
  - Stop-Loss à $95.000\text{ TND}$ (Risque : $5.000\text{ TND}$)
  - Take-Profit à $115.000\text{ TND}$ (Gain potentiel : $15.000\text{ TND}$)
  - $$R/R = \frac{115 - 100}{100 - 95} = \frac{15}{5} = 3.0 \quad (\text{Ratio 1:3})$$

---

## 3. BONNES PRATIQUES INSTITUTIONNELLES DE RISK MANAGEMENT

1. **Règle des 1% à 2% par Trade :**
   Ne jamais risquer plus de 1% à 2% de la valeur totale de votre portefeuille sur une seule transaction. Si votre portefeuille est de $100\,000\text{ TND}$, la perte maximale tolérée sur un Stop-Loss ne doit pas dépasser $1\,000$ à $2\,000\text{ TND}$.

2. **Toujours Exiger un Ratio $R/R \ge 1:2$ :**
   Avec un ratio de $1:2$, un trader n'a besoin que d'un taux de réussite (*win rate*) de **34%** pour être mathématiquement profitable sur le long terme :
   $$\text{Espérance} = (\text{Win Rate} \times \text{Gain Moyen}) - (\text{Loss Rate} \times \text{Perte Moyenne})$$

3. **Ne Jamais Éloigner un Stop-Loss en Cours de Position :**
   Le Stop-Loss doit être respecté sans négociation émotionnelle. En revanche, remonter son Stop-Loss pour sécuriser un seuil neutre (*Break-Even*) ou utiliser un **Trailing Stop** constitue la méthode optimale pour protéger ses plus-values.

4. **Tracé Visuel des Seuils sur le Graphique :**
   La plateforme trace automatiquement des lignes horizontales repères sur les chandeliers TradingView :
   - **Ligne Rouge Tiretée :** Niveau exact du Stop-Loss.
   - **Ligne Verte Tiretée :** Niveau exact du Take-Profit.
   Ce retour visuel instantané permet d'ajuster ses perspectives par rapport aux supports et résistances techniques (SMA 20, SMA 50).

---

## 4. CONTRATS D'API & ENDPOINTS REST CORRESPONDANTS

| Méthode | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/orders/execute` | Exécute un ordre en incluant optionnellement `stopLossPrice`, `takeProfitPrice`, `trailingStopDistance`. |
| `PATCH` | `/api/v1/orders/positions/{id}/risk` | Modifie ou supprime à la volée les seuils d'une position ouverte. |
| `POST` | `/api/v1/orders/check-risk` | Déclenche le scan de surveillance continue OCO lors de l'avancement d'une séance simulée. |
| `GET` | `/api/v1/orders/portfolio` | Renvoie les positions incluant les champs `stopLossPrice`, `takeProfitPrice` et `trailingStopDistance`. |
