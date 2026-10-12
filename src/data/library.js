/* =========================================================
   Exercise library — ONE catalogue of every exercise in the app.

   Built-in entries come from three sources, merged here in code:
     1. the weekly plan that already existed (days.js)        → source 'plan'
     2. the Muscle Atlas artifact's exercise list (generated) → source 'atlas'
     3. the flexibility & stick PDF (pdfProgram.js)            → source 'pdf'
   A built-in exercise that appears in more than one source is ONE entry
   (e.g. "Dumbbell Bench Press" is both a plan exercise and an Atlas one).

   The user's own exercises and edits to built-ins are stored server-side
   (user_exercises) and layered on top by applyOverrides(): an override replaces
   the editable fields of a built-in; "reset" simply deletes the override row.

   Exercise {
     id, name:{en,ar}, type:'reps'|'hold'|'hold_side'|'cardio',
     sets, reps, seconds, rest, countdown, perSide, // defaults (countdown null = inherit); a plan entry can override
     primary:[muscleKey], secondary:[muscleKey],   // Atlas muscle keys
     notes, how, dose, direction,
     media:{url,start,source,verified}|null,
     groups:[groupKey], source, builtin, archived
   }
   ========================================================= */
import { ATLAS_EXERCISES, ATLAS_MUSCLES, ATLAS_GROUPS } from './atlas.generated';
import { DAYS } from './days';
import { LEGACY_BLOCKS } from './legacyMap';
import { MEDIA_MAP } from './mediaMap.generated';
import {
  MOBILITY_A, MOBILITY_B, MOBILITY_C, YOGA, FASCIA, BREATH_MORNING, BREATH_NIGHT,
  STICK_LEVELS,
} from './pdfProgram';

export const EXERCISE_TYPES = [
  { id: 'reps', label: 'Reps', hint: 'sets × reps' },
  { id: 'hold', label: 'Timed hold', hint: 'sets × seconds' },
  { id: 'hold_side', label: 'Timed, per side', hint: 'a hold on each side' },
  { id: 'cardio', label: 'Cardio / interval', hint: 'rounds of work + rest' },
];
export const TYPE_LABEL = Object.fromEntries(EXERCISE_TYPES.map((t) => [t.id, t.label]));

export const MUSCLES = ATLAS_MUSCLES;
export const muscleLabel = (key) => ATLAS_MUSCLES[key]?.label || key;

const EXTRA_GROUPS = [
  { key: 'breath', en: 'Breathing', ar: 'التنفس', short: 'Breathing' },
  { key: 'plan', en: 'In the weekly plan', ar: 'في الخطة', short: 'Plan' },
];
export const GROUPS = [...ATLAS_GROUPS, ...EXTRA_GROUPS];
export const groupLabel = (key) => {
  const g = GROUPS.find((x) => x.key === key);
  return g ? g.short || g.en : key;
};

export const youtubeUrl = (id) => `https://www.youtube.com/watch?v=${id}`;

/** Parses a YouTube id out of the common URL shapes; null if it isn't a YouTube link. */
export function youtubeIdFromUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1) || null;
    if (u.hostname.endsWith('youtube.com') || u.hostname.endsWith('youtube-nocookie.com')) {
      if (u.pathname === '/watch') return u.searchParams.get('v');
      const m = u.pathname.match(/^\/(embed|shorts|v)\/([\w-]{6,})/);
      if (m) return m[2];
    }
  } catch {
    /* not a URL */
  }
  return null;
}

const mediaFromVid = (vid) => (vid ? { url: youtubeUrl(vid), start: null, source: 'YouTube', verified: null } : null);

function genericDefaults(type) {
  if (type === 'hold' || type === 'hold_side') return { sets: 3, reps: null, seconds: 30, rest: 30 };
  if (type === 'cardio') return { sets: 3, reps: null, seconds: 40, rest: 20 };
  return { sets: 3, reps: 12, seconds: null, rest: 30 };
}

function atlasType(a) {
  if (/^isometric/i.test(a.direction || '')) return 'hold';
  if (a.groups.includes('xhiit')) return 'cardio';
  return 'reps';
}

/** Normalises the PDF's (type, perSide) pair onto the 4 library types. */
function pdfType(item) {
  if (item.type === 'hold' && item.perSide) return 'hold_side';
  return item.type;
}

export function buildBuiltinLibrary() {
  const byId = new Map();

  // 1. Atlas
  for (const a of ATLAS_EXERCISES) {
    const type = atlasType(a);
    byId.set(a.id, {
      id: a.id,
      name: { en: a.name, ar: '' },
      type,
      ...genericDefaults(type),
      perSide: false,
      primary: a.primary,
      secondary: a.secondary,
      notes: '',
      how: '',
      dose: '',
      direction: a.direction,
      media: null,
      groups: [...a.groups],
      source: 'atlas',
      builtin: true,
      archived: false,
    });
  }

  // 2. The existing weekly plan (wins on name/defaults/media — it's the user's own wording)
  const touchedByMainBlock = new Set();
  const ensure = (id, fallbackName) => {
    if (!byId.has(id)) {
      byId.set(id, {
        id,
        name: { en: fallbackName, ar: '' },
        type: 'reps',
        ...genericDefaults('reps'),
        perSide: false,
        primary: [],
        secondary: [],
        notes: '',
        how: '',
        dose: '',
        direction: '',
        media: null,
        groups: [],
        source: 'plan',
        builtin: true,
        archived: false,
      });
    }
    return byId.get(id);
  };

  // Combined plan blocks have no single Atlas twin: their muscles = the union of their parts.
  const COMBO_PARTS = {
    plan_curl_kickback: ['db_curls', 'kickbacks'],
    plan_hammer_triceps: ['hammer_curls', 'triceps_ext'],
    plan_legext_curl: ['leg_extension', 'leg_curls'],
  };

  for (const day of DAYS) {
    day.blocks.forEach((block, bi) => {
      const legacy = LEGACY_BLOCKS[day.id][bi];
      if (block.type === 'circuit') {
        block.items.forEach((item, ii) => {
          const id = legacy.items[ii];
          const ex = ensure(id, item.en);
          if (!touchedByMainBlock.has(id)) {
            ex.name = { en: item.en, ar: item.ar };
            if (ex.type !== 'hold') {
              ex.type = 'cardio';
              Object.assign(ex, { sets: block.rounds, reps: null, seconds: block.work, rest: block.rest });
            }
            ex.media = ex.media || mediaFromVid(item.vid);
          }
          ex.source = 'plan';
          if (!ex.groups.includes(day.id)) ex.groups.push(day.id);
          if (!ex.groups.includes('plan')) ex.groups.push('plan');
        });
        return;
      }
      const id = legacy.id;
      const ex = ensure(id, block.en);
      touchedByMainBlock.add(id);
      ex.name = { en: block.en, ar: block.ar };
      if (block.type === 'isometric') {
        ex.type = 'hold';
        Object.assign(ex, { sets: block.sets, reps: null, seconds: block.hold, rest: block.rest });
      } else {
        ex.type = 'reps';
        Object.assign(ex, { sets: block.sets, reps: block.reps, seconds: null, rest: block.rest });
      }
      ex.perSide = /per (side|leg)/i.test(block.note || '');
      ex.notes = block.note || '';
      ex.media = mediaFromVid(block.vid);
      ex.source = 'plan';
      if (COMBO_PARTS[id] && ex.primary.length === 0) {
        const parts = COMBO_PARTS[id].map((p) => byId.get(p)).filter(Boolean);
        ex.primary = [...new Set(parts.flatMap((p) => p.primary))];
        ex.secondary = [...new Set(parts.flatMap((p) => p.secondary))].filter((k) => !ex.primary.includes(k));
        ex.groups = [...new Set(parts.flatMap((p) => p.groups))];
      }
      for (const g of [day.id, 'plan']) if (!ex.groups.includes(g)) ex.groups.push(g);
    });
  }

  // 3. The PDF's mobility / yoga / fascia / breathing / stick content
  const pdfItems = [
    ...MOBILITY_A, ...MOBILITY_B, ...MOBILITY_C, ...YOGA, ...FASCIA, ...BREATH_MORNING, ...BREATH_NIGHT,
    ...Object.values(STICK_LEVELS).flatMap((l) => l.items),
  ];
  for (const item of pdfItems) {
    let ex = byId.get(item.id);
    if (!ex) {
      const parts = (item.atlas || []).map((a) => byId.get(a)).filter(Boolean);
      const isBreath = item.id.startsWith('breath_');
      ex = {
        id: item.id,
        name: { en: item.en, ar: item.ar },
        type: 'hold',
        ...genericDefaults('hold'),
        perSide: false,
        primary: item.muscles ? item.muscles.primary : [...new Set(parts.flatMap((p) => p.primary))],
        secondary: item.muscles ? item.muscles.secondary : [...new Set(parts.flatMap((p) => p.secondary))],
        notes: '',
        how: '',
        dose: '',
        direction: '',
        media: null,
        groups: isBreath ? ['breath'] : [...new Set(parts.flatMap((p) => p.groups))],
        source: 'pdf',
        builtin: true,
        archived: false,
      };
      byId.set(item.id, ex);
    }
    ex.name = { en: item.en || ex.name.en, ar: item.ar };
    ex.type = pdfType(item);
    ex.sets = item.sets;
    ex.reps = item.reps ?? null;
    ex.seconds = item.seconds ?? null;
    ex.rest = item.rest ?? 0;
    ex.perSide = !!item.perSide;
    ex.how = item.how;
    ex.dose = item.dose;
    if (item.tool) ex.notes = item.tool;
    ex.source = 'pdf';
  }

  // 4. the verified media mapping supersedes the carried-over plan videos (exercise-media-map.md).
  //    Exercises it has no entry for keep what they had; the rest stay "no media yet".
  for (const [id, media] of Object.entries(MEDIA_MAP)) {
    const ex = byId.get(id);
    if (ex) ex.media = { ...media };
  }

  return [...byId.values()];
}

let builtinCache = null;
export function builtinLibrary() {
  if (!builtinCache) builtinCache = buildBuiltinLibrary();
  return builtinCache;
}

const EDITABLE = ['name', 'type', 'sets', 'reps', 'seconds', 'rest', 'countdown', 'perSide', 'primary', 'secondary', 'notes', 'how', 'dose', 'direction', 'media', 'groups'];
export const EDITABLE_FIELDS = EDITABLE;

/** Strips an exercise down to the fields that are stored as a user override / custom exercise. */
export function toOverridePayload(ex) {
  const out = {};
  for (const k of EDITABLE) out[k] = ex[k];
  out.source = ex.source;
  return out;
}

/**
 * Layers the user's server-side rows over the built-in catalogue.
 * @param rows [{id, data, archived}]
 * @returns {list, byId}
 */
export function applyOverrides(builtin, rows = []) {
  const overrides = new Map(rows.map((r) => [r.id, r]));
  const out = [];
  const seen = new Set();
  for (const b of builtin) {
    const o = overrides.get(b.id);
    seen.add(b.id);
    if (!o) {
      out.push(b);
      continue;
    }
    out.push({ ...b, ...o.data, id: b.id, builtin: true, edited: true, archived: !!o.archived });
  }
  for (const r of rows) {
    if (seen.has(r.id)) continue;
    out.push({
      id: r.id,
      type: 'reps',
      sets: 3, reps: 12, seconds: null, rest: 30, perSide: false,
      primary: [], secondary: [], notes: '', how: '', dose: '', direction: '', media: null, groups: [],
      source: 'custom',
      ...r.data,
      name: r.data?.name || { en: r.id, ar: '' },
      builtin: false,
      archived: !!r.archived,
    });
  }
  const byId = new Map(out.map((e) => [e.id, e]));
  return { list: out, byId };
}

export function newExerciseId() {
  return `ex_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function blankExercise(partial = {}) {
  return {
    id: newExerciseId(),
    name: { en: '', ar: '' },
    type: 'reps',
    sets: 3, reps: 12, seconds: null, rest: 30, countdown: null, perSide: false,
    primary: [], secondary: [], notes: '', how: '', dose: '', direction: '', media: null, groups: [],
    source: 'custom', builtin: false, archived: false,
    ...partial,
  };
}

/** Normalises user input for an exercise before saving (types, blanks → null, type-specific fields). */
export function normaliseExercise(ex) {
  const num = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Math.max(0, Math.round(Number(v))));
  const type = EXERCISE_TYPES.some((t) => t.id === ex.type) ? ex.type : 'reps';
  const timed = type !== 'reps';
  return {
    ...ex,
    type,
    sets: num(ex.sets) ?? 1,
    reps: timed ? null : num(ex.reps),
    seconds: timed ? num(ex.seconds) : null,
    rest: num(ex.rest) ?? 0,
    countdown: num(ex.countdown),
    perSide: type === 'hold_side' ? true : !!ex.perSide,
    name: { en: (ex.name?.en || '').trim(), ar: (ex.name?.ar || '').trim() },
    media: ex.media && ex.media.url ? { url: ex.media.url.trim(), start: num(ex.media.start), source: ex.media.source || '', verified: ex.media.verified || null, title: ex.media.title || null, note: ex.media.note || null } : null,
  };
}

/** Library search/filter used by the browse UI and the pickers. */
export function filterExercises(list, { q = '', muscle = '', type = '', group = '', source = '', archived = false } = {}) {
  const needle = q.trim().toLowerCase();
  return list.filter((e) => {
    if (!archived && e.archived) return false;
    if (archived && !e.archived) return false;
    if (type && e.type !== type) return false;
    if (source && e.source !== source) return false;
    if (group && !(e.groups || []).includes(group)) return false;
    if (muscle && !(e.primary || []).includes(muscle) && !(e.secondary || []).includes(muscle)) return false;
    if (needle) {
      const hay = `${e.name.en} ${e.name.ar} ${e.id} ${(e.primary || []).map(muscleLabel).join(' ')} ${(e.secondary || []).map(muscleLabel).join(' ')}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });
}

/**
 * How many logged sets an exercise produces. Only 'hold_side' doubles: the timer runs a separate
 * hold for each side. For 'reps', `perSide` is a label only ("per side" in the plan always meant
 * "each set is done on both sides") — doubling it would change the user's existing workouts.
 */
export function loggedSetCount(type, sets) {
  const n = Math.max(1, Number(sets) || 1);
  return type === 'hold_side' ? n * 2 : n;
}
