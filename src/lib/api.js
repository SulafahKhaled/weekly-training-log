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

// "Today" is the Asia/Riyadh calendar date (see lib/dates.js) — never the UTC date.
export { today as todayKey } from './dates';

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

export function toggleSet({ dayId, blockIndex, setIndex, date, done, weight, holdSeconds }) {
  return request('/sets', {
    method: 'POST',
    body: JSON.stringify({ day_id: dayId, block_index: blockIndex, set_index: setIndex, date, done, weight, hold_seconds: holdSeconds }),
  });
}

export function updateSetWeight({ dayId, blockIndex, setIndex, date, weight }) {
  return request('/sets/weight', {
    method: 'PATCH',
    body: JSON.stringify({ day_id: dayId, block_index: blockIndex, set_index: setIndex, date, weight }),
  });
}

export function updateSetHold({ dayId, blockIndex, setIndex, date, holdSeconds }) {
  return request('/sets/hold', {
    method: 'PATCH',
    body: JSON.stringify({ day_id: dayId, block_index: blockIndex, set_index: setIndex, date, hold_seconds: holdSeconds }),
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

function qs(params) {
  const parts = Object.entries(params)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

/* ---------- stats ---------- */

export function fetchStatsLogs(start, end) {
  return request(`/stats/logs${qs({ start, end })}`);
}

/* ---------- journal ---------- */

export function fetchJournal(start, end) {
  return request(`/journal${qs({ start, end })}`);
}

export function saveJournalEntry({ date, dayId, text }) {
  return request('/journal', { method: 'POST', body: JSON.stringify({ date, day_id: dayId, text }) });
}

export function deleteJournalEntry(id) {
  return request(`/journal/${id}`, { method: 'DELETE' });
}

export function uploadJournalPhoto(entryId, { mime, data }) {
  return request(`/journal/${entryId}/photos`, { method: 'POST', body: JSON.stringify({ mime, data }) });
}

export function deleteJournalPhoto(id) {
  return request(`/journal/photos/${id}`, { method: 'DELETE' });
}

export const journalPhotoUrl = (id) => `${BASE}/journal/photos/${id}`;

/* ---------- body composition & measurements ---------- */

export function fetchBodyLogs(start, end) {
  return request(`/body-logs${qs({ start, end })}`);
}

export function saveBodyLog(entry) {
  return request('/body-logs', { method: 'POST', body: JSON.stringify(entry) });
}

export function fetchBodyMeasurements(start, end, type) {
  return request(`/body-measurements${qs({ start, end, type })}`);
}

export function saveBodyMeasurement({ date, measurementType, value, unit }) {
  return request('/body-measurements', { method: 'POST', body: JSON.stringify({ date, measurement_type: measurementType, value, unit }) });
}

/* ---------- nutrition ---------- */

export function fetchNutritionLogs(start, end) {
  return request(`/nutrition-logs${qs({ start, end })}`);
}

export function saveNutritionLog(entry) {
  return request('/nutrition-logs', { method: 'POST', body: JSON.stringify(entry) });
}

export function fetchNutritionGoals() {
  return request('/nutrition-goals');
}

export function saveNutritionGoal(goal) {
  return request('/nutrition-goals', { method: 'POST', body: JSON.stringify(goal) });
}

/* ---------- per-user UI preferences ---------- */

export function fetchUiPrefs() {
  return request('/ui-prefs');
}

export function saveUiPrefs(collapsedSections) {
  return request('/ui-prefs', { method: 'PUT', body: JSON.stringify({ collapsed_sections: collapsedSections }) });
}

/* ---------- v2: settings, library, plans, session log ---------- */

export function fetchSettings() {
  return request('/settings');
}
export function saveSettings(settings) {
  return request('/settings', { method: 'PUT', body: JSON.stringify({ settings }) });
}

export function fetchExercises() {
  return request('/exercises');
}
export function saveExercise(id, data, archived = false) {
  return request(`/exercises/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify({ data, archived }) });
}
export function deleteExercise(id) {
  return request(`/exercises/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function fetchPlans() {
  return request('/plans');
}
export function savePlan(id, data, sortOrder = 0) {
  return request(`/plans/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify({ data, sort_order: sortOrder }) });
}
export function deletePlan(id) {
  return request(`/plans/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function fetchSessionLog(start, end) {
  return request(`/session-log${qs({ start, end })}`);
}
export function saveSessionLog({ sessions = [], items = [] }) {
  return request('/session-log', { method: 'POST', body: JSON.stringify({ sessions, items }) });
}
export function deleteItems(itemKeys) {
  return request('/session-log/items', { method: 'DELETE', body: JSON.stringify({ item_keys: itemKeys }) });
}
export function deleteSession(sessionKey) {
  return request('/session-log/session', { method: 'DELETE', body: JSON.stringify({ session_key: sessionKey }) });
}

export function fetchDayExtras(start, end) {
  return request(`/day-extras${qs({ start, end })}`);
}
export function saveDayExtras(date, data) {
  return request(`/day-extras/${date}`, { method: 'PUT', body: JSON.stringify({ data }) });
}

export function fetchProgressTests() {
  return request('/progress-tests');
}
export function saveProgressTest(checkpoint, testedOn, data) {
  return request(`/progress-tests/${checkpoint}`, { method: 'PUT', body: JSON.stringify({ tested_on: testedOn, data }) });
}

export function fetchLegacyLogs() {
  return request('/legacy/logs');
}

export function fetchBackup() {
  return request('/backup');
}
export function importBackup(backup) {
  return request('/backup/import', { method: 'POST', body: JSON.stringify(backup) });
}

/* ---------- Claude connector + meals ---------- */

export function fetchMcpToken() {
  return request('/mcp-token');
}
export function createMcpToken() {
  return request('/mcp-token', { method: 'POST' });
}
export function revokeMcpToken() {
  return request('/mcp-token', { method: 'DELETE' });
}
export function fetchMeals(start, end) {
  return request(`/meals${qs({ start, end })}`);
}
export function deleteMeal(id) {
  return request(`/meals/${id}`, { method: 'DELETE' });
}
