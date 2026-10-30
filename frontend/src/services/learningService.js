// ============================================================================
// FORMATION & GAMIFICATION (Spring Boot /api/v1/learning)
// ============================================================================
import { ensureAuthenticated, getAuthHeaders } from './realMarketService';

const LEARNING_BASE = '/api/v1/learning';

async function request(url, options = {}) {
  await ensureAuthenticated();
  const res = await fetch(url, { headers: getAuthHeaders(), ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Erreur formation (${res.status})`);
  }
  return data;
}

const post = (url, body) => request(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined });

export const getLearningCatalog = () => request(`${LEARNING_BASE}/catalog`);
export const getLesson = (id) => request(`${LEARNING_BASE}/lessons/${encodeURIComponent(id)}`);
export const completeLesson = (id) => post(`${LEARNING_BASE}/lessons/${encodeURIComponent(id)}/complete`);
export const getQuiz = (id) => request(`${LEARNING_BASE}/quizzes/${encodeURIComponent(id)}`);
/** @param {Object<string, number>} answers identifiant de question → index de l'option choisie */
export const submitQuiz = (id, answers) => post(`${LEARNING_BASE}/quizzes/${encodeURIComponent(id)}/submit`, { answers });
export const getScenario = (id) => request(`${LEARNING_BASE}/scenarios/${encodeURIComponent(id)}`);
/** @param {'ACHETER'|'ATTENDRE'|'VENDRE'} decision */
export const answerScenario = (id, decision) => post(`${LEARNING_BASE}/scenarios/${encodeURIComponent(id)}/answer`, { decision });
/** @param {{type: string, params?: object}} strategy */
export const submitChallenge = (id, strategy) => post(`${LEARNING_BASE}/challenges/${encodeURIComponent(id)}/submit`, { strategy });
export const getLeaderboard = (limit = 20) => request(`${LEARNING_BASE}/leaderboard?limit=${limit}`);
