// ============================================================================
// ACTUALITÉS & SENTIMENT (Spring Boot /api/v1/news, gestion /api/v1/admin/news)
// ============================================================================
import { ensureAuthenticated, getAuthHeaders } from './realMarketService';

async function request(url, options = {}) {
  await ensureAuthenticated();
  const res = await fetch(url, { headers: getAuthHeaders(), ...options });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Erreur actualités (${res.status})`);
  return data;
}

const qs = (params) => new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '')).toString();

/** Actualités publiées jusqu'à la date simulée (aucune actualité future), filtrables sur un actif. */
export const getNews = (date, symbol, limit = 20) => request(`/api/v1/news?${qs({ date, symbol, limit })}`);
/** Sentiment agrégé des 30 jours précédant la date, pondéré par l'ancienneté des articles. */
export const getNewsSentiment = (date, symbol) => request(`/api/v1/news/sentiment?${qs({ date, symbol })}`);

export const getAllNews = () => request('/api/v1/admin/news');
export const analyzeNewsText = (text) => request('/api/v1/admin/news/analyze', { method: 'POST', body: JSON.stringify({ text }) });
export const createNews = (article) => request('/api/v1/admin/news', { method: 'POST', body: JSON.stringify(article) });
export const updateNews = (id, article) => request(`/api/v1/admin/news/${id}`, { method: 'PUT', body: JSON.stringify(article) });
export const deleteNews = (id) => request(`/api/v1/admin/news/${id}`, { method: 'DELETE' });
