-- Frais d'achat cumulés (TND) sur la quantité actuellement détenue d'une position, pour permettre
-- de les répartir au prorata de la quantité vendue lors du calcul du P&L réalisé (voir TradingService).
ALTER TABLE positions ADD COLUMN total_buy_fees NUMERIC(15, 3) NOT NULL DEFAULT 0;
