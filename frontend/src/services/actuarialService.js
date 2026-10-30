// ============================================================================
// MODULE D'ACTUARIAT (Spring Boot /api/v1/actuarial -> service IA)
// ============================================================================
import { ensureAuthenticated, getAuthHeaders } from './realMarketService';

const ACTUARIAL_BASE = '/api/v1/actuarial';

async function request(path, options = {}) {
  await ensureAuthenticated();
  const res = await fetch(`${ACTUARIAL_BASE}${path}`, { headers: getAuthHeaders(), ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Erreur actuariat (${res.status})`);
  }
  return data;
}

const post = (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) });

export const getActuarialPortfolio = () => request('/portfolio');
export const getActuarialModels = () => request('/models');
/** body : { profile, duration, expense_ratio, profit_margin } (noms du service IA, en snake_case) */
export const getQuote = (body) => post('/quote', body);
/** body : { segment_by, expense_ratio, profit_margin, mode, wakala_fee, surplus_share } */
export const getMargins = (body) => post('/margins', body);
export const getDefaultReserving = () => request('/reserving');
/** body : { triangle: number[][] (incrémental), tail_factor } */
export const runReserving = (body) => post('/reserving', body);
