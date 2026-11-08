-- Scenarios predefinis (copie de la migration V3, non executee en test car Flyway est desactive)
INSERT INTO stress_scenarios (code, name, description, rate_shock_bp, equity_drop_pct, unemployment_increase_pp,
                              gdp_growth_pct, default_rate_multiplier, asset_quality_downgrade, revenue_drop_pct,
                              preset, created_at, updated_at)
VALUES
('BASELINE', 'Scénario de référence', 'Pas de choc : croissance de 1 %.', 0, 0, 0, 1, 1, 0, 0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('RATE_SHOCK', 'Hausse brutale des taux', 'Hausse de 300 pb des taux directeurs.', 300, 0, 0, 0.5, 1, 0, 0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('MARKET_CRASH', 'Krach boursier', 'Baisse de 35 % des marchés actions et des revenus de commissions.', 0, 35, 0, -1, 1, 0, 15, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('RECESSION', 'Récession économique', 'PIB -4 %, chômage +4 pts, défauts x2.', 0, 0, 4, -4, 2, 1, 10, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('CREDIT_CRISIS', 'Crise de crédit', 'Défauts x3 et dégradation de 2 crans de la qualité des actifs.', 0, 0, 2, -1.5, 3, 2, 0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('COMBINED_SEVERE', 'Choc combiné sévère', 'Chocs simultanés sur taux, marchés, emploi, défauts et revenus.', 250, 30, 5, -5, 2.5, 2, 20, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
