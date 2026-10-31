// ============================================================================
// CONSOLE D'ADMINISTRATION (Spring Boot /api/v1/admin, ROLE_ADMIN)
// ============================================================================
import { ensureAuthenticated, getAuthHeaders } from './realMarketService';

async function request(url, options = {}) {
  await ensureAuthenticated();
  const res = await fetch(url, { headers: getAuthHeaders(), ...options });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Erreur administration (${res.status})`);
  return data;
}

export const getPlatformStats = () => request('/api/v1/admin/stats');
export const getUsers = (search) => request(`/api/v1/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`);
/** @param {{role?: 'ROLE_ADMIN'|'ROLE_TRADER', enabled?: boolean}} update */
export const updateUser = (id, update) => request(`/api/v1/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(update) });
export const resetUserPortfolio = (id) => request(`/api/v1/admin/users/${id}/reset-portfolio`, { method: 'POST' });
export const getLearningStats = () => request('/api/v1/admin/learning/stats');
export const getAiHealth = () => fetch('/api/ai/health').then((r) => r.json());
