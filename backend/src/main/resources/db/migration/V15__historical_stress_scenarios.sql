-- Scénarios de stress historiques (valeurs approximatives, pédagogiques). Miroir de ai/stress/scenarios.py.
INSERT INTO stress_scenarios (code, name, description, rate_shock_bp, equity_drop_pct, unemployment_increase_pp,
                              gdp_growth_pct, default_rate_multiplier, asset_quality_downgrade, revenue_drop_pct,
                              preset, created_at, updated_at)
VALUES
('TUNISIA_2011', 'Révolution tunisienne 2011 (inspiré)', 'Ordre de grandeur de 2011 : PIB -2 %, chômage +4 pts, bourse -10 %, défauts x2.', 0, 10, 4, -2, 2, 1, 10, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('COVID_2020', 'Crise Covid-19 2020 (inspiré)', 'Ordre de grandeur de 2020 : PIB -9 %, chômage +2 pts, bourse -15 % au plus bas, défauts x1,8.', 0, 15, 2, -9, 1.8, 1, 12, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('GFC_2008', 'Crise financière mondiale 2008 (inspiré)', 'Ordre de grandeur de 2008 : actions -40 %, chômage +4 pts, PIB -3 %, défauts x2,5.', 0, 40, 4, -3, 2.5, 2, 20, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
