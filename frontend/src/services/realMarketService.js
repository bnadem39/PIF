// ============================================================================
// SERVICE CONNECTEUR SPRING BOOT 3 (ALPHA VANTAGE & MARCHÉS RÉELS)
// ============================================================================

const API_BASE = '/api/market';

/**
 * Récupère la liste de tous les instruments réels depuis Spring Boot
 */
export async function getRealSymbols(category = 'ALL') {
  try {
    const res = await fetch(`${API_BASE}/symbols?category=${category}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("Spring Boot offline or error, fallback default catalog:", err);
    return [
      { ticker: 'IBM', name: 'International Business Machines', category: 'US_EQUITY', type: 'Tech Blue Chip', currency: 'USD', price: 191.80, change24h: 1.05, high24h: 192.50, low24h: 189.70, volume24h: '3.2M USD' },
      { ticker: 'AAPL', name: 'Apple Inc.', category: 'US_EQUITY', type: 'Tech Titan', currency: 'USD', price: 228.40, change24h: 1.85, high24h: 230.10, low24h: 226.50, volume24h: '48.5M USD' },
      { ticker: 'MSFT', name: 'Microsoft Corporation', category: 'US_EQUITY', type: 'Tech & Cloud', currency: 'USD', price: 425.20, change24h: -0.42, high24h: 428.00, low24h: 422.10, volume24h: '22.1M USD' },
      { ticker: 'BTC-USD', name: 'Bitcoin / US Dollar', category: 'CRYPTO', type: 'Crypto-Actif', currency: 'USD', price: 64500.00, change24h: 2.15, high24h: 65200.00, low24h: 63800.00, volume24h: '28.5B USD' },
      { ticker: 'BIAT', name: 'Banque Internationale Arabe de Tunisie', category: 'BVMT', type: 'Banque Conventionnelle', currency: 'TND', price: 88.00, change24h: -0.55, high24h: 88.52, low24h: 88.00, volume24h: '480K TND' },
      { ticker: 'WIFAK', name: 'Wifak International Bank', category: 'BVMT', type: 'Banque Islamique', currency: 'TND', price: 7.40, change24h: 1.37, high24h: 7.40, low24h: 7.30, volume24h: '115K TND' }
    ];
  }
}

/**
 * Récupère l'historique en chandeliers japonais OHLCV depuis Spring Boot avec filtrage par année
 */
export async function getRealHistory(symbol, interval = '1d', year = 'ALL', limit = 10000) {
  const yearParam = year && year !== 'ALL' ? `&year=${encodeURIComponent(year)}` : '';
  const res = await fetch(`${API_BASE}/history?symbol=${encodeURIComponent(symbol)}&interval=${interval}${yearParam}&limit=${limit}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

/**
 * Récupère les années disponibles pour un instrument
 */
export async function getAvailableYears(symbol) {
  const res = await fetch(`${API_BASE}/years?symbol=${encodeURIComponent(symbol)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

/**
 * Récupère la cartographie détaillée des fichiers CSV locaux
 */
export async function getCsvOverview() {
  const res = await fetch(`${API_BASE}/csv-overview`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

/**
 * Récupère les données brutes paginées d'un fichier CSV
 */
export async function getRawCsvData(symbol, year = 'ALL', page = 0, size = 50, search = '') {
  const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
  const res = await fetch(`${API_BASE}/raw-data?symbol=${encodeURIComponent(symbol)}&year=${encodeURIComponent(year)}&page=${page}&size=${size}${searchParam}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

/**
 * Récupère le carnet d'ordres L2 depuis Spring Boot
 */
export async function getRealOrderBook(symbol) {
  const res = await fetch(`${API_BASE}/orderbook?symbol=${encodeURIComponent(symbol)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

/**
 * Récupère les indices majeurs pour le Ticker Tape
 */
export async function getRealIndices() {
  const res = await fetch(`${API_BASE}/indices`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}
