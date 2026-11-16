// Salles d'entraînement : chaque salle fait travailler un comportement précis (codes identiques à TrainingTheme.java).
export const TRAINING_THEMES = [
  {
    code: 'RISK',
    title: 'Gestion du risque',
    goal: 'Protège ton capital : Stop-Loss, pas tout sur un titre, pertes limitées.',
    rules: ['Utiliser un Stop-Loss ou un Take-Profit', 'Pas plus de 40 % sur un seul titre', 'Perte de 5 % maximum']
  },
  {
    code: 'DIVERSIFICATION',
    title: 'Diversification',
    goal: 'Répartis ton capital sur plusieurs actifs.',
    rules: ['Au moins 4 actifs', 'Aucun actif au-dessus de 35 %', 'Au moins 50 % du capital investi']
  },
  {
    code: 'DISCIPLINE',
    title: 'Discipline de trading',
    goal: 'Moins d\'ordres, mais réfléchis et protégés.',
    rules: ['Entre 1 et 15 ordres', 'Ordres protégés (Stop-Loss ou Take-Profit)', 'Pas plus de 90 % du capital en cash']
  },
  {
    code: 'AI',
    title: 'Stratégie IA',
    goal: 'Décide avec méthode, aidé du Desk IA et des signaux du modèle.',
    rules: ['Rendement positif', 'Entre 3 et 20 ordres', 'Au moins 30 % du capital investi']
  },
  {
    code: 'CRISIS',
    title: 'Gestion de crise',
    goal: 'Traverse un marché difficile en limitant la perte.',
    rules: ['Perte de 5 % maximum', 'Au moins 20 % de cash gardé', 'Utiliser un Stop-Loss']
  }
];

export const THEME_BY_CODE = Object.fromEntries(TRAINING_THEMES.map((t) => [t.code, t]));
