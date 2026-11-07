const API = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

function authHeaders() {
  const token = localStorage.getItem('jwtToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse(res) {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json().catch(() => null);
}

export async function listRooms() {
  const res = await fetch(`${API}/rooms`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function createRoom(dto) {
  const res = await fetch(`${API}/rooms`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(dto),
  });
  return handleResponse(res);
}

export async function getRoom(roomId) {
  const res = await fetch(`${API}/rooms/${roomId}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function joinRoom(roomId) {
  const res = await fetch(`${API}/rooms/${roomId}/join`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function startRoom(roomId) {
  const res = await fetch(`${API}/rooms/${roomId}/start`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function placeOrder(roomId, order) {
  const res = await fetch(`${API}/rooms/${roomId}/orders`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(order),
  });
  return handleResponse(res);
}

export async function getLeaderboard(roomId) {
  const res = await fetch(`${API}/rooms/${roomId}/leaderboard`, { headers: authHeaders() });
  return handleResponse(res);
}

