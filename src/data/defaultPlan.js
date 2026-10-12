/* =========================================================
   The default plan: the user's existing 7-day resistance plan (UNCHANGED — same
   blocks, same order, same sets/reps/holds/rests, entry ids `b0…bN`, which is what
   keeps v1 history attached to the right exercise) plus the PDF's add-on sessions
   from its weekly table, as separate OPTIONAL sessions:

       morning breathing  →  [ main resistance session ]  →  add-ons  →  night breathing
   ========================================================= */
import { DAYS } from './days';
import { LEGACY_BLOCKS, DEFAULT_PLAN_ID, MAIN_SESSION_ID, legacyEntryId } from './legacyMap';
import { builtinLibrary } from './library';
import {
  MOBILITY_SESSIONS, STICK_THEMES, STICK_LEVELS, CALM_STRETCH_IDS, WEEKLY_ADDONS, EVERY_DAY,
} from './pdfProgram';
import { DAY_IDS } from '../lib/plan';

export const DEFAULT_PLAN_SEED_VERSION = 1;

const SESSION_META = Object.fromEntries(MOBILITY_SESSIONS.map((s) => [s.id, s]));
const ADDON_COLOR = 'mobility';

function diffOverrides(block, ex) {
  const o = {};
  if (block.sets !== ex.sets) o.sets = block.sets;
  if (block.type === 'resistance') {
    if (block.reps !== ex.reps) o.reps = block.reps;
  } else if (block.hold !== ex.seconds) {
    o.seconds = block.hold;
  }
  if (block.rest !== ex.rest) o.rest = block.rest;
  return o;
}

function mainSession(day, byId) {
  const entries = day.blocks.map((block, bi) => {
    const legacy = LEGACY_BLOCKS[day.id][bi];
    const eid = legacyEntryId(bi);
    if (block.type === 'circuit') {
      return {
        eid,
        kind: 'circuit',
        name: { en: block.en, ar: block.ar },
        rounds: block.rounds,
        work: block.work,
        rest: block.rest,
        items: legacy.items.map((id) => ({ exerciseId: id })),
      };
    }
    const ex = byId.get(legacy.id);
    return { eid, kind: 'exercise', exerciseId: legacy.id, overrides: diffOverrides(block, ex) };
  });
  return {
    id: MAIN_SESSION_ID,
    name: { en: day.tag, ar: day.tagAr },
    color: day.color,
    optional: false,
    warmup: day.warmup,
    cooldown: day.cooldown,
    entries,
  };
}

const itemEntry = (item, extra = {}) => ({ eid: item.id, kind: 'exercise', exerciseId: item.id, overrides: {}, ...extra });

function addOnSession(id) {
  if (SESSION_META[id]) {
    const m = SESSION_META[id];
    return { id, name: { en: m.en, ar: m.ar }, color: ADDON_COLOR, optional: true, minutes: m.minutes, entries: m.items.map((i) => itemEntry(i)) };
  }
  if (STICK_THEMES[id]) {
    const t = STICK_THEMES[id];
    const entries = [];
    for (const level of [1, 2, 3]) {
      for (const exId of t[level]) {
        entries.push({ eid: `${exId}@L${level}`, kind: 'exercise', exerciseId: exId, overrides: {}, level });
      }
    }
    return { id, name: { en: t.en, ar: t.ar }, color: ADDON_COLOR, optional: true, entries, stickLevels: true };
  }
  if (id === 'calm_stretch') {
    return {
      id,
      name: { en: 'Calm stretching', ar: 'إطالة هادئة' },
      color: ADDON_COLOR,
      optional: true,
      entries: CALM_STRETCH_IDS.map((exId) => ({ eid: exId, kind: 'exercise', exerciseId: exId, overrides: {} })),
    };
  }
  throw new Error(`Unknown add-on session "${id}"`);
}

export function buildDefaultPlan() {
  const byId = new Map(builtinLibrary().map((e) => [e.id, e]));
  const days = {};
  const addOns = {};
  for (const dayId of DAY_IDS) {
    const day = DAYS.find((d) => d.id === dayId);
    const spec = WEEKLY_ADDONS[dayId];
    days[dayId] = [
      addOnSession(EVERY_DAY.morning.session),
      mainSession(day, byId),
      ...spec.parts.map(addOnSession),
      addOnSession(EVERY_DAY.night.session),
    ];
    addOns[dayId] = { minutes: spec.minutes, ar: spec.ar, en: spec.en };
  }
  return {
    id: DEFAULT_PLAN_ID,
    name: 'Weekly plan',
    timing: { countdown: null, work: null, rest: null },
    days,
    addOns,
    everyDay: { morning: EVERY_DAY.morning, night: EVERY_DAY.night },
    seedVersion: DEFAULT_PLAN_SEED_VERSION,
  };
}

/** The PDF's "minimum version for 12-hour work days": breathing + 3 movements from the day's add-ons. */
export function minimumVersion(plan, dayId, stickLevel = 1) {
  const sessions = plan.days[dayId] || [];
  const breathing = sessions.filter((s) => s.id === EVERY_DAY.morning.session);
  const addOnEntries = sessions
    .filter((s) => s.optional && s.id !== EVERY_DAY.morning.session && s.id !== EVERY_DAY.night.session)
    .flatMap((s) => s.entries.filter((e) => e.level == null || e.level === Number(stickLevel)).map((e) => ({ sessionId: s.id, eid: e.eid })));
  return { breathing: breathing.map((s) => s.id), movements: addOnEntries.slice(0, 3) };
}

export { STICK_LEVELS };
