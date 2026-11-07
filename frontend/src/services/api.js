const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
const AI_URL = import.meta.env.VITE_AI_URL || 'http://localhost:8000/api/ai';

function getAuthHeaders() {
  const token = localStorage.getItem('jwtToken') || sessionStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    let errMessage = `HTTP ${res.status}`;
    try {
      const errObj = await res.json();
      errMessage = errObj.message || errObj.detail || errMessage;
    } catch (_) {
      const text = await res.text();
      if (text) errMessage = text;
    }
    throw new Error(errMessage);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

// ─── AUTH & USER PROFILE ──────────────────────────────────────────────
export async function loginUser(emailOrUsername, password) {
  const data = await request(`${BACKEND_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: emailOrUsername, password })
  });
  if (data?.token) {
    localStorage.setItem('jwtToken', data.token);
    localStorage.setItem('user', JSON.stringify(data));
  }
  return data;
}

export async function registerUser(payload) {
  const data = await request(`${BACKEND_URL}/auth/register`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  if (data?.token) {
    localStorage.setItem('jwtToken', data.token);
    localStorage.setItem('user', JSON.stringify(data));
  }
  return data;
}

export async function getAuthMe() {
  return request(`${BACKEND_URL}/auth/me`);
}

export function clearAuthStorage() {
  localStorage.removeItem('jwtToken');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('user_email');
  localStorage.removeItem('user_role');
  localStorage.removeItem('user_fullname');
  sessionStorage.removeItem('token');
  sessionStorage.clear();
}

export async function logoutUser() {
  try {
    await request(`${BACKEND_URL}/auth/logout`, { method: 'POST' });
  } catch (_) {}
  clearAuthStorage();
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

export async function getCustomizationPermissions() {
  return request(`${BACKEND_URL}/customization/permissions`);
}

// ─── ROOMS & ARENAS ──────────────────────────────────────────────────
export async function getRooms(status) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return request(`${BACKEND_URL}/rooms${query}`);
}

export async function getRoomById(roomId) {
  return request(`${BACKEND_URL}/rooms/${roomId}`);
}

export async function getMyRoomPortfolio(roomId) {
  return request(`${BACKEND_URL}/rooms/${roomId}/my-portfolio`);
}

export async function createArenaRoom(roomData) {
  return request(`${BACKEND_URL}/rooms`, {
    method: 'POST',
    body: JSON.stringify(roomData)
  });
}

export async function joinArenaRoom(roomId, password = null) {
  return request(`${BACKEND_URL}/rooms/${roomId}/join`, {
    method: 'POST',
    body: password ? JSON.stringify({ password }) : undefined
  });
}

export async function closeArenaRoom(roomId) {
  return request(`${BACKEND_URL}/rooms/${roomId}/close`, {
    method: 'POST'
  });
}

export async function startArenaRoom(roomId) {
  return request(`${BACKEND_URL}/rooms/${roomId}/start`, {
    method: 'POST'
  });
}

export async function pauseArenaRoom(roomId) {
  return request(`${BACKEND_URL}/rooms/${roomId}/pause`, {
    method: 'POST'
  }).catch(() => null);
}

export async function resumeArenaRoom(roomId) {
  return request(`${BACKEND_URL}/rooms/${roomId}/resume`, {
    method: 'POST'
  }).catch(() => null);
}

export async function placeArenaOrder(roomId, orderData) {
  return request(`${BACKEND_URL}/rooms/${roomId}/orders`, {
    method: 'POST',
    body: JSON.stringify(orderData)
  });
}

export async function toggleArenaReady(roomId) {
  return request(`${BACKEND_URL}/rooms/${roomId}/ready`, {
    method: 'POST'
  });
}

export async function inviteFriendToRoom(roomId, friendId) {
  return request(`${BACKEND_URL}/rooms/${roomId}/invite`, {
    method: 'POST',
    body: JSON.stringify({ friendId })
  });
}

export async function getArenaLeaderboard(roomId) {
  return request(`${BACKEND_URL}/rooms/${roomId}/leaderboard`);
}

// ─── FRIENDS & INVITATIONS ───────────────────────────────────────────
export async function getFriends() {
  return request(`${BACKEND_URL}/friends`);
}

export async function addFriendByUsername(username) {
  return request(`${BACKEND_URL}/friends/add`, {
    method: 'POST',
    body: JSON.stringify({ username })
  });
}

export async function searchPlayers(query) {
  const q = query ? `?query=${encodeURIComponent(query)}` : '';
  return request(`${BACKEND_URL}/friends/search${q}`);
}

export async function getPendingInvitations() {
  return request(`${BACKEND_URL}/invitations/pending`);
}

export async function acceptInvitation(invitationId) {
  return request(`${BACKEND_URL}/invitations/${invitationId}/accept`, {
    method: 'POST'
  });
}

export async function declineInvitation(invitationId) {
  return request(`${BACKEND_URL}/invitations/${invitationId}/decline`, {
    method: 'POST'
  });
}

// ─── PLAYER PROFILE, AVATAR & APPEARANCE ───────────────────────────
export async function getPlayerProfile() {
  return request(`${BACKEND_URL}/players/me`);
}

export async function getPublicPlayerProfile(playerId) {
  return request(`${BACKEND_URL}/players/${playerId}/public`);
}

export async function updatePlayerAppearance(appearanceData) {
  return request(`${BACKEND_URL}/players/appearance`, {
    method: 'PUT',
    body: JSON.stringify(appearanceData)
  });
}

export async function updatePlayerAvatar(profileImageUrl) {
  return request(`${BACKEND_URL}/players/avatar`, {
    method: 'PUT',
    body: JSON.stringify({ profileImageUrl })
  });
}

export async function uploadPlayerAvatar(file) {
  const token = localStorage.getItem('jwtToken') || sessionStorage.getItem('token');
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BACKEND_URL}/players/avatar/upload`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: formData
  });
  if (!res.ok) {
    let errMessage = `HTTP ${res.status}`;
    try {
      const errObj = await res.json();
      errMessage = errObj.message || errMessage;
    } catch (_) {}
    throw new Error(errMessage);
  }
  return res.json();
}

export async function uploadPlayerBackground(file) {
  const token = localStorage.getItem('jwtToken') || sessionStorage.getItem('token');
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BACKEND_URL}/players/background/upload`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: formData
  });
  if (!res.ok) {
    let errMessage = `HTTP ${res.status}`;
    try {
      const errObj = await res.json();
      errMessage = errObj.message || errMessage;
    } catch (_) {}
    throw new Error(errMessage);
  }
  return res.json();
}

export async function startSkill(skillId) {
  return request(`${GAMIFICATION_URL}/skills/${skillId}/start`, {
    method: 'POST'
  });
}

export async function updatePlayerTheme(customBackgroundUrl, themeAccentColor) {
  return request(`${BACKEND_URL}/players/theme`, {
    method: 'PUT',
    body: JSON.stringify({ customBackgroundUrl, themeAccentColor })
  });
}

// ─── QUANT & AI FASTAPI SERVICES ────────────────────────────────────
export async function triggerMarketPauseAudit(payload) {
  return request(`${AI_URL}/market-pause-audit`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function getXGBoostSignals(date, symbols = []) {
  return request(`${AI_URL}/signals`, {
    method: 'POST',
    body: JSON.stringify({ date, symbols })
  });
}

export async function runBacktest(strategyConfig) {
  return request(`${BACKEND_URL}/backtest/run`, {
    method: 'POST',
    body: JSON.stringify(strategyConfig)
  });
}

export async function runStressTest(scenarioConfig) {
  return request(`${BACKEND_URL}/stress-test/simulate`, {
    method: 'POST',
    body: JSON.stringify(scenarioConfig)
  });
}

// ─── GAMIFICATION ECOSYSTEM (SEASONS, SKILLS, ACHIEVEMENTS, CAREER, SPECTATOR, CELEBRATIONS) ───

export async function getActiveSeason() {
  return request(`${BACKEND_URL}/gamification/seasons/active`);
}

export async function getAllSeasons() {
  return request(`${BACKEND_URL}/gamification/seasons`);
}

export async function getSkillTree() {
  return request(`${BACKEND_URL}/gamification/skills`);
}

export async function unlockSkill(skillId) {
  return request(`${BACKEND_URL}/gamification/skills/${skillId}/unlock`, {
    method: 'POST'
  });
}

export async function improveSkillMastery(skillId, tier = 'INTERMEDIATE') {
  return request(`${BACKEND_URL}/gamification/skills/${skillId}/mastery?tier=${encodeURIComponent(tier)}`, {
    method: 'POST'
  });
}

export async function getAchievements() {
  return request(`${BACKEND_URL}/gamification/achievements`);
}

export async function getPublicTrophies(userId) {
  return request(`${BACKEND_URL}/gamification/achievements/public/${userId}`);
}

export async function togglePinAchievement(achievementId) {
  return request(`${BACKEND_URL}/gamification/achievements/${achievementId}/pin`, {
    method: 'POST'
  });
}

export async function getCareerDashboard() {
  return request(`${BACKEND_URL}/gamification/career`);
}

export async function getPublicCareer(userId) {
  return request(`${BACKEND_URL}/gamification/career/public/${userId}`);
}

export async function evaluateCareer() {
  return request(`${BACKEND_URL}/gamification/career/evaluate`, {
    method: 'POST'
  });
}

export async function getPendingCelebrations() {
  return request(`${BACKEND_URL}/gamification/celebrations/pending`);
}

export async function markCelebrationDisplayed(id) {
  return request(`${BACKEND_URL}/gamification/celebrations/${id}/displayed`, {
    method: 'POST'
  });
}

export async function joinSpectatorRoom(roomId) {
  return request(`${BACKEND_URL}/gamification/spectator/${roomId}/join`, {
    method: 'POST'
  });
}

export async function leaveSpectatorRoom(roomId) {
  return request(`${BACKEND_URL}/gamification/spectator/${roomId}/leave`, {
    method: 'POST'
  });
}

export async function getSpectatorCount(roomId) {
  return request(`${BACKEND_URL}/gamification/spectator/${roomId}/count`);
}

export async function completeAcademyCourse(courseId) {
  return request(`${BACKEND_URL}/gamification/academy/${courseId}/complete`, {
    method: 'POST'
  });
}

