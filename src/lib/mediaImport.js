/* =========================================================
   Bulk media import — turns a pasted mapping (JSON, CSV/TSV, a Markdown table,
   or "id: url" lines) into per-exercise media objects.

   Matching: exact exercise id first, then exact English name, then exact Arabic
   name (all case-insensitive, whitespace-normalised). Anything that doesn't match
   is reported back — never guessed. Nothing is verified here: a mapping row can
   carry its own `verified` date; otherwise the media is stored as unverified.
   ========================================================= */
import { youtubeIdFromUrl } from '../data/library';

const norm = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
const URL_RE = /https?:\/\/[^\s)|,"'>\]]+/i;

function splitRow(line) {
  if (line.includes('|')) return line.split('|').map((c) => c.trim()).filter((c, i, a) => !(c === '' && (i === 0 || i === a.length - 1)));
  if (line.includes('\t')) return line.split('\t').map((c) => c.trim());
  // CSV with simple quote handling
  const out = [];
  let cur = '';
  let q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === ',' && !q) {
      out.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

const HEADER_KEYS = {
  id: ['id', 'exercise id', 'exercise_id', 'key'],
  name: ['name', 'exercise', 'exercise name', 'name en', 'english', 'en'],
  url: ['url', 'link', 'media', 'video', 'media link', 'youtube', 'href'],
  start: ['start', 'start time', 'start_time', 'start (s)', 'start s', 't'],
  source: ['source', 'channel', 'credit', 'attribution'],
  verified: ['verified', 'verified date', 'verified_on', 'date verified', 'checked'],
};

function headerIndex(cells) {
  const idx = {};
  cells.forEach((c, i) => {
    const k = norm(c);
    for (const [field, names] of Object.entries(HEADER_KEYS)) if (names.includes(k) && idx[field] == null) idx[field] = i;
  });
  return idx;
}

/** Parses text into [{ id?, name?, url, start?, source?, verified? }]. */
export function parseMediaMapping(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const data = JSON.parse(trimmed);
      const arr = Array.isArray(data) ? data : Object.entries(data).map(([id, v]) => (typeof v === 'string' ? { id, url: v } : { id, ...v }));
      return arr
        .map((r) => ({
          id: r.id ?? r.exercise_id ?? r.exerciseId,
          name: r.name ?? r.exercise ?? r.title,
          url: r.url ?? r.link ?? r.media?.url,
          start: r.start ?? r.media?.start,
          source: r.source ?? r.media?.source,
          verified: r.verified ?? r.verified_on ?? r.media?.verified,
        }))
        .filter((r) => r.url);
    } catch {
      /* fall through to the line parser */
    }
  }

  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows = [];
  let header = null;
  for (const line of lines) {
    if (/^[|:\-\s]+$/.test(line)) continue; // markdown separator row
    const cells = splitRow(line);
    if (!header && cells.length > 1 && !URL_RE.test(line)) {
      const h = headerIndex(cells);
      if (h.url != null || h.id != null || h.name != null) {
        header = h;
        continue;
      }
    }
    const urlMatch = line.match(URL_RE);
    if (!urlMatch) continue;
    if (header && cells.length > 1) {
      const get = (f) => (header[f] != null ? cells[header[f]] : undefined);
      const url = (get('url') || '').match(URL_RE)?.[0] || urlMatch[0];
      rows.push({ id: get('id') || undefined, name: get('name') || undefined, url, start: get('start') || undefined, source: get('source') || undefined, verified: get('verified') || undefined });
    } else {
      // "id: url" / "Name - url" / bare "name,url"
      const before = line.slice(0, line.indexOf(urlMatch[0])).replace(/[\s:=\-–—|,>]+$/, '').replace(/^[\s*\-•>#\d.)]+/, '').trim();
      rows.push({ id: before || undefined, name: before || undefined, url: urlMatch[0] });
    }
  }
  return rows;
}

function toSeconds(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Math.max(0, Math.round(v));
  const s = String(v).trim();
  const colon = s.match(/^(?:(\d+):)?(\d+):(\d+)$/);
  if (colon) return Number(colon[1] || 0) * 3600 + Number(colon[2]) * 60 + Number(colon[3]);
  const n = Number(s.replace(/s$/i, ''));
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : null;
}

/**
 * Matches parsed rows against the library.
 * @returns { matched: [{exercise, media, row}], unmatched: [row], invalid: [row] }
 */
export function matchMediaMapping(rows, exercises) {
  const byId = new Map(exercises.map((e) => [norm(e.id), e]));
  const byEn = new Map();
  const byAr = new Map();
  for (const e of exercises) {
    if (e.name?.en && !byEn.has(norm(e.name.en))) byEn.set(norm(e.name.en), e);
    if (e.name?.ar && !byAr.has(norm(e.name.ar))) byAr.set(norm(e.name.ar), e);
  }
  const matched = [];
  const unmatched = [];
  const invalid = [];
  for (const row of rows) {
    let url = String(row.url || '').trim();
    try {
      url = new URL(url).toString();
    } catch {
      invalid.push(row);
      continue;
    }
    const ex = (row.id && byId.get(norm(row.id))) || (row.name && (byEn.get(norm(row.name)) || byAr.get(norm(row.name) ))) || (row.id && (byEn.get(norm(row.id)) || byAr.get(norm(row.id))));
    if (!ex) {
      unmatched.push(row);
      continue;
    }
    const yt = youtubeIdFromUrl(url);
    matched.push({
      exercise: ex,
      row,
      media: {
        url,
        start: toSeconds(row.start),
        source: row.source || (yt ? 'YouTube' : ''),
        verified: /^\d{4}-\d{2}-\d{2}$/.test(String(row.verified || '')) ? row.verified : null,
      },
    });
  }
  return { matched, unmatched, invalid };
}

/** CSV listing every exercise with its current media — the template for the mapping file. */
export function exerciseIndexCsv(exercises) {
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['id', 'name_en', 'name_ar', 'type', 'source', 'groups', 'url', 'start', 'media_source', 'verified'];
  const lines = exercises.map((e) => [e.id, e.name.en, e.name.ar, e.type, e.source, (e.groups || []).join(' '), e.media?.url || '', e.media?.start ?? '', e.media?.source || '', e.media?.verified || ''].map(q).join(','));
  return [head.join(','), ...lines].join('\n');
}
