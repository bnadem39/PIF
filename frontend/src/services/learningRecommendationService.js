// ============================================================================
// COURS RECOMMANDÉS APRÈS UN MATCH (Spring Boot GET /api/v1/learning/recommendation/{roomId})
// ============================================================================
import { ensureAuthenticated, getAuthHeaders } from './realMarketService';

/**
 * @returns {Promise<{summary: {returnPct:number, rank:number, participants:number, tradeCount:number,
 *   positionCount:number, cashSharePct:number, largestPositionSharePct:number},
 *   recommendations: Array<{code:string, moduleId:string, moduleTitle:string, level:string,
 *   nextStep:'LESSON'|'QUIZ', lessonId:?string, lessonTitle:?string, quizId:string, reason:string}>,
 *   message: ?string}>}
 */
export async function getMatchRecommendation(roomId) {
  await ensureAuthenticated();
  const res = await fetch(`/api/v1/learning/recommendation/${encodeURIComponent(roomId)}`, { headers: getAuthHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Erreur recommandation (${res.status})`);
  }
  return data;
}
