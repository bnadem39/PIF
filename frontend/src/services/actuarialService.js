// ============================================================================
// MODULE ACTUARIAT : risque et prévision des actifs (Spring Boot /api/v1/actuarial -> service IA)
// ============================================================================
import { ensureAuthenticated, getAuthHeaders } from './realMarketService';

const ACTUARIAL_BASE = '/api/v1/actuarial';

/**
 * @param {{symbol: string, startDate?: string, endDate?: string, confidence?: number, horizonDays?: number,
 *          forecastDays?: number, simulations?: number, volatilityModel?: 'garch'|'ewma',
 *          distribution?: 'normal'|'student', drift?: 'zero'|'historical'}} body
 * La réponse est celle du service IA (clés en snake_case).
 */
export async function analyzeAsset(body) {
  await ensureAuthenticated();
  const res = await fetch(`${ACTUARIAL_BASE}/analyze`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Erreur actuariat (${res.status})`);
  }
  return data;
}
