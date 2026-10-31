// ============================================================================
// SERVICE CONNECTEUR SPRING BOOT 3 (ALPHA VANTAGE, SIMULATEUR & MARCHÉS RÉELS)
// ============================================================================

const API_BASE = '/api/market';
const AUTH_BASE = '/api/v1/auth';
const ORDERS_BASE = '/api/v1/orders';

/**
 * Récupère les en-têtes d'authentification JWT
 */
export function getAuthHeaders() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

/**
 * Connexion administrateur ou trader
 */
export async function loginUser(email, password) {
  const res = await fetch(`${AUTH_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Identifiants invalides');
  }
  if (data.token) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user_email', data.email);
    localStorage.setItem('user_role', data.role);
    localStorage.setItem('user_fullname', data.fullName || '');
  }
  return data;
}

/**
 * Inscription d'un nouveau compte trader
 */
export async function registerUser(email, password, fullName) {
  const res = await fetch(`${AUTH_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, fullName })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `Échec de l'inscription (HTTP ${res.status})`);
  }
  if (data.token) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user_email', data.email);
    localStorage.setItem('user_role', data.role);
    localStorage.setItem('user_fullname', data.fullName || '');
  }
  return data;
}

/**
 * Déconnexion utilisateur
 */
export function logoutUser() {
  localStorage.removeItem('token');
  localStorage.removeItem('user_email');
  localStorage.removeItem('user_role');
  localStorage.removeItem('user_fullname');
}

/**
 * Récupère l'utilisateur actuellement connecté
 */
export function getCurrentUser() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  return {
    token,
    email: localStorage.getItem('user_email') || '',
    role: localStorage.getItem('user_role') || 'ROLE_TRADER',
    fullName: localStorage.getItem('user_fullname') || ''
  };
}

/**
 * Assure la présence d'un token JWT : l'utilisateur doit s'être connecté lui-même.
 * (Aucune connexion automatique avec un compte par défaut.)
 */
export async function ensureAuthenticated() {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('Authentification requise : veuillez vous connecter.');
  }
  return user;
}

/**
 * Récupère la liste de tous les instruments réels depuis Spring Boot
 */
export async function getRealSymbols(category = 'ALL') {
  try {
    const res = await fetch(`${API_BASE}/symbols?category=${category}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("Spring Boot offline or error, fallback default catalog:", err);
    return [
      { ticker: 'BIAT', name: 'Banque Internationale Arabe de Tunisie', category: 'BVMT', type: 'Banque Conventionnelle', currency: 'TND', price: 92.50, change24h: 1.25, high24h: 93.00, low24h: 91.50, volume24h: '480K TND' },
      { ticker: 'SFBT', name: 'Ste Frigorifique et Brasserie de Tunis', category: 'BVMT', type: 'Agroalimentaire', currency: 'TND', price: 12.80, change24h: 0.78, high24h: 12.90, low24h: 12.70, volume24h: '320K TND' },
      { ticker: 'BNB-USD', name: 'Binance Coin / US Dollar', category: 'CRYPTO', type: 'Crypto-Actif', currency: 'USD', price: 580.00, change24h: -1.15, high24h: 595.00, low24h: 575.00, volume24h: '1.2B USD' },
      { ticker: 'BTC-USD', name: 'Bitcoin / US Dollar', category: 'CRYPTO', type: 'Crypto-Actif', currency: 'USD', price: 64500.00, change24h: 2.15, high24h: 65200.00, low24h: 63800.00, volume24h: '28.5B USD' }
    ];
  }
}

/**
 * Initialisation Time-Lapse (Zero Lookahead Bias)
 * Renvoie le calendrier des séances et la première bougie sans jamais révéler les cours futurs.
 */
export async function initSimulation(symbol, year) {
  const res = await fetch(`${API_BASE}/simulation/init?symbol=${encodeURIComponent(symbol)}&year=${encodeURIComponent(year)}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(`Erreur HTTP ${res.status} sur l'initialisation de la simulation`);
  return await res.json();
}

/**
 * Récupération stricte de la tranche chronologique jusqu'à T_courant
 * Empêche le frontend de recevoir les bougies postérieures à la date simulée courante.
 */
export async function getSimulationSlice(symbol, year, currentDate) {
  const dateParam = currentDate ? `&currentDate=${encodeURIComponent(currentDate)}` : '';
  const res = await fetch(`${API_BASE}/simulation/slice?symbol=${encodeURIComponent(symbol)}&year=${encodeURIComponent(year)}${dateParam}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(`Erreur HTTP ${res.status} sur la récupération de la tranche temporelle`);
  return await res.json();
}

/**
 * Récupère la matrice temporelle multi-actifs alignée (actions BVMT & Cryptos)
 * avec forward-fill et calcul synchronisé du rendement YTD.
 */
export async function getMultiAssetMatrix(year = '2022', symbols = null) {
  let url = `${API_BASE}/simulation/multi-matrix?year=${encodeURIComponent(year)}`;
  if (symbols && symbols.length > 0) {
    url += `&symbols=${encodeURIComponent(symbols.join(','))}`;
  }
  const res = await fetch(url, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(`Erreur HTTP ${res.status} sur la matrice multi-actifs`);
  return await res.json();
}

/**
 * Récupère l'historique en chandeliers japonais OHLCV depuis Spring Boot avec filtrage par année
 */
export async function getRealHistory(symbol, interval = '1d', year = 'ALL', limit = 10000) {
  const yearParam = year && year !== 'ALL' ? `&year=${encodeURIComponent(year)}` : '';
  const res = await fetch(`${API_BASE}/history?symbol=${encodeURIComponent(symbol)}&interval=${interval}${yearParam}&limit=${limit}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

/**
 * Récupère les années disponibles pour un instrument
 */
export async function getAvailableYears(symbol) {
  const res = await fetch(`${API_BASE}/years?symbol=${encodeURIComponent(symbol)}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

/**
 * Exécute un ordre de trading (ACHAT ou VENTE) avec contrôle pré-trade et atomicité backend
 */
export async function executeTradeOrder(orderRequest) {
  await ensureAuthenticated();
  const res = await fetch(`${ORDERS_BASE}/execute`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(orderRequest)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `Erreur lors de l'exécution de l'ordre (${res.status})`);
  }
  return data;
}

/**
 * Modifie à la volée les seuils de risque (Stop-Loss, Take-Profit, Trailing Stop) d'une position ouverte
 */
export async function updatePositionRisk(positionId, riskThresholds) {
  await ensureAuthenticated();
  const res = await fetch(`${ORDERS_BASE}/positions/${positionId}/risk`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(riskThresholds)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `Erreur modification des seuils de risque (${res.status})`);
  }
  return data;
}

/**
 * Déclenche la vérification du moteur de risque sur la bougie courante (SL/TP/TS/OCO)
 */
export async function checkRiskOrders(simulatedDate) {
  await ensureAuthenticated();
  // Les cours sont lus côté serveur à la date simulée
  const res = await fetch(`${ORDERS_BASE}/check-risk`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ simulatedDate })
  });
  if (!res.ok) return [];
  return await res.json();
}

/**
 * Récupère la synthèse du portefeuille (Cash balance, P&L Latent, Positions)
 */
export async function getPortfolioSummary(simulatedDate = '') {
  await ensureAuthenticated();
  // Valorisation au cours serveur de la date simulée
  const url = `${ORDERS_BASE}/portfolio?simulatedDate=${encodeURIComponent(simulatedDate || '')}`;
  const res = await fetch(url, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} sur le portefeuille`);
  return await res.json();
}

/**
 * Récupère l'historique tabulaire d'audit des transactions
 */
export async function getTransactionsHistory() {
  await ensureAuthenticated();
  const res = await fetch(`${ORDERS_BASE}/transactions`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} sur les transactions`);
  return await res.json();
}

/**
 * Récupère les indicateurs de performance (Win Rate, Max Drawdown, Equity Curve)
 */
export async function getAccountPerformance(simulatedDate = '') {
  await ensureAuthenticated();
  const url = `${ORDERS_BASE}/performance?simulatedDate=${encodeURIComponent(simulatedDate || '')}`;
  const res = await fetch(url, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} sur la performance`);
  return await res.json();
}

/**
 * Réinitialise le compte utilisateur (solde = 100 000.000 TND)
 */
export async function resetAccountPortfolio() {
  await ensureAuthenticated();
  const res = await fetch(`${ORDERS_BASE}/reset`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} sur la réinitialisation du compte`);
  return await res.json();
}

/**
 * Demande un audit stratégique IA du portefeuille à la demande (LLM local / FinGPT)
 */
export async function explainPortfolioAudit(payload) {
  await ensureAuthenticated();
  const res = await fetch(`${ORDERS_BASE}/portfolio/explain`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload || {})
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} lors de l'audit IA du portefeuille`);
  return await res.json();
}

/**
 * Récupère la cartographie détaillée des fichiers CSV locaux
 */
export async function getCsvOverview() {
  const res = await fetch(`${API_BASE}/csv-overview`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

/**
 * Récupère les données brutes paginées d'un fichier CSV
 */
export async function getRawCsvData(symbol, year = 'ALL', page = 0, size = 50, search = '') {
  const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
  const res = await fetch(`${API_BASE}/raw-data?symbol=${encodeURIComponent(symbol)}&year=${encodeURIComponent(year)}&page=${page}&size=${size}${searchParam}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

/**
 * Récupère le carnet d'ordres L2 depuis Spring Boot
 */
export async function getRealOrderBook(symbol, price) {
  const priceParam = price ? `&price=${encodeURIComponent(price)}` : '';
  const res = await fetch(`${API_BASE}/orderbook?symbol=${encodeURIComponent(symbol)}${priceParam}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

/**
 * Récupère les indices majeurs pour le Ticker Tape
 */
export async function getRealIndices(date) {
  const res = await fetch(`${API_BASE}/indices${date ? `?date=${encodeURIComponent(date)}` : ''}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

/**
 * Journal d'audit (ROLE_ADMIN uniquement)
 */
export async function getAuditLogs({ page = 0, size = 50, action, userId } = {}) {
  await ensureAuthenticated();
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (action) params.set('action', action);
  if (userId != null) params.set('userId', String(userId));
  const res = await fetch(`/api/v1/admin/audit-logs?${params.toString()}`, {
    headers: getAuthHeaders()
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Erreur chargement du journal d'audit (${res.status})`);
  }
  return data;
}
