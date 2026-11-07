# 🌳 Arbre de Compétences RPG du Trader (Skill Tree) — PIF Trading Arena

## 1. Structure des 5 Branches

L'arbre de compétences propose 18 nœuds répartis en 5 branches d'expertise :

### 1. Analyse Technique (Branch: TECHNICAL)
- `tech_ma` : **Moyennes Mobiles & Croisements** (Tier 1, Niveau Max: 3) — Prérequis: aucun
- `tech_rsi` : **RSI & Oscillateurs de Momentum** (Tier 2, Niveau Max: 3) — Prérequis: `tech_ma`
- `tech_macd` : **MACD & Divergences** (Tier 2, Niveau Max: 3) — Prérequis: `tech_ma`
- `tech_ichimoku` : **Nuage d'Ichimoku Kinko Hyo** (Tier 3, Niveau Max: 2) — Prérequis: `tech_rsi`

### 2. Gestion du Risque (Branch: RISK)
- `risk_sizing` : **Dimensionnement Optimal de Position** (Tier 1, Niveau Max: 3) — Prérequis: aucun
- `risk_stoploss` : **Stop-Loss Systématique** (Tier 2, Niveau Max: 3) — Prérequis: `risk_sizing`
- `risk_rr` : **Ratio Risque / Rendement Asymétrique** (Tier 2, Niveau Max: 3) — Prérequis: `risk_sizing`
- `risk_drawdown` : **Garde-Fou Max Drawdown** (Tier 3, Niveau Max: 2) — Prérequis: `risk_stoploss`

### 3. Gestion de Portefeuille (Branch: PORTFOLIO)
- `port_diversification` : **Diversification Sectorielle BVMT** (Tier 1, Niveau Max: 3) — Prérequis: aucun
- `port_rebalancing` : **Équilibrage Dynamique** (Tier 2, Niveau Max: 3) — Prérequis: `port_diversification`
- `port_hedging` : **Couverture de Position & Hedging** (Tier 3, Niveau Max: 2) — Prérequis: `port_rebalancing`

### 4. Analyse de Marché (Branch: MARKET)
- `market_orderbook` : **Lecture du Carnet d'Ordres** (Tier 1, Niveau Max: 3) — Prérequis: aucun
- `market_macro` : **Analyse Macroéconomique & Taux** (Tier 2, Niveau Max: 3) — Prérequis: `market_orderbook`
- `market_sentiment` : **Sentiment & Flux d'Actualités** (Tier 3, Niveau Max: 2) — Prérequis: `market_macro`

### 5. Stratégies Avancées (Branch: STRATEGY)
- `strat_mean_reversion` : **Mean Reversion sur la BVMT** (Tier 1, Niveau Max: 3) — Prérequis: aucun
- `strat_breakout` : **Breakout Trading sur Nouveaux Sommets** (Tier 2, Niveau Max: 3) — Prérequis: `strat_mean_reversion`
- `strat_algo` : **Exécution Algorithmique** (Tier 3, Niveau Max: 2) — Prérequis: `strat_breakout`

## 2. Déblocage & Maîtrise

- **Validation Académique** : Chaque nœud peut être validé en complétant le cours académique correspondant (`POST /api/gamification/academy/complete`) ou en dépensant des points de compétence via `POST /api/gamification/skills/{id}/unlock`.
- **Récompense en EXP** : Chaque nœud validé rapporte entre 200 et 600 EXP et déclenche une notification temps réel.

