const BASE = '/api';

async function request(path, options) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || `Request failed: ${res.status}`);
    err.status = res.status;
    if (res.status === 401 && !path.startsWith('/auth/')) {
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    throw err;
  }
  return res.json();
}

export const todayKey = () => new Date().toISOString().slice(0, 10);

/* ---------- auth ---------- */

export function register(username, password) {
  return request('/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) });
}

export function login(username, password) {
  return request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
}

export function logout() {
  return request('/auth/logout', { method: 'POST' });
}

export function fetchMe() {
  return request('/auth/me');
}

export function fetchProgress(date) {
  return request(`/progress?date=${date}`);
}

export function toggleSet({ dayId, blockIndex, setIndex, date, done, weight }) {
  return request('/sets', {
    method: 'POST',
    body: JSON.stringify({ day_id: dayId, block_index: blockIndex, set_index: setIndex, date, done, weight }),
  });
}

export function updateSetWeight({ dayId, blockIndex, setIndex, date, weight }) {
  return request('/sets/weight', {
    method: 'PATCH',
    body: JSON.stringify({ day_id: dayId, block_index: blockIndex, set_index: setIndex, date, weight }),
  });
}

export function toggleCircuit({ dayId, blockIndex, date, done, roundsCompleted }) {
  return request('/circuits', {
    method: 'POST',
    body: JSON.stringify({ day_id: dayId, block_index: blockIndex, date, done, rounds_completed: roundsCompleted }),
  });
}

export function resetDay({ dayId, date }) {
  return request('/day/reset', {
    method: 'POST',
    body: JSON.stringify({ day_id: dayId, date }),
  });
}

export function fetchHistory(dayId, blockIndex, limit = 20) {
  return request(`/history/${dayId}/${blockIndex}?limit=${limit}`);
}

export function fetchStreak() {
  return request('/streak');
}
