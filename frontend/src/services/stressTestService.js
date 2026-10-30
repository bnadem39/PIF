// ============================================================================
// AI STRESS TESTING BANCAIRE (Spring Boot /api/v1/stress-test -> service IA)
// ============================================================================
import { ensureAuthenticated, getAuthHeaders } from './realMarketService';

const STRESS_BASE = '/api/v1/stress-test';
const ADMIN_BASE = '/api/v1/admin/stress-test/scenarios';

async function request(url, options = {}) {
  await ensureAuthenticated();
  const res = await fetch(url, { headers: getAuthHeaders(), ...options });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Erreur stress test (${res.status})`);
  }
  return data;
}

export const getStressScenarios = () => request(`${STRESS_BASE}/scenarios`);
export const getStressBanks = () => request(`${STRESS_BASE}/banks`);
export const getStressModels = () => request(`${STRESS_BASE}/models`);

/**
 * @param {{scenarioIds?: number[], customShocks?: object, bankIds?: string[], minCapitalRatio?: number}} body
 */
export const runStressTest = (body) =>
  request(`${STRESS_BASE}/run`, { method: 'POST', body: JSON.stringify(body) });

export const createStressScenario = (scenario) =>
  request(ADMIN_BASE, { method: 'POST', body: JSON.stringify(scenario) });

export const updateStressScenario = (id, scenario) =>
  request(`${ADMIN_BASE}/${id}`, { method: 'PUT', body: JSON.stringify(scenario) });

export const deleteStressScenario = (id) => request(`${ADMIN_BASE}/${id}`, { method: 'DELETE' });
