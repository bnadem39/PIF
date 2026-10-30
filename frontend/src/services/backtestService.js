// ============================================================================
// BACKTESTING & COMPARAISON DE STRATÉGIES (Spring Boot /api/v1/backtest)
// ============================================================================
import { ensureAuthenticated, getAuthHeaders } from './realMarketService';

const BACKTEST_BASE = '/api/v1/backtest';

async function request(url, options = {}) {
  await ensureAuthenticated();
  const res = await fetch(url, { headers: getAuthHeaders(), ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Erreur backtesting (${res.status})`);
  }
  return data;
}

export const getBacktestStrategies = () => request(`${BACKTEST_BASE}/strategies`);

/**
 * @param {{symbol: string, startDate?: string, endDate?: string,
 *          strategies: {type: string, params?: object}[],
 *          initialCapital?: number, commissionPct?: number, slippagePct?: number, riskFreeRate?: number}} body
 */
export const runBacktest = (body) =>
  request(`${BACKTEST_BASE}/run`, { method: 'POST', body: JSON.stringify(body) });
