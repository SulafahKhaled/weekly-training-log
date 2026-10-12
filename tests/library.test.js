import { describe, it, expect } from 'vitest';
import { DAYS } from '../src/data/days';
import { LEGACY_BLOCKS, legacyEntryId } from '../src/data/legacyMap';
import { builtinLibrary, applyOverrides, filterExercises, normaliseExercise, blankExercise, youtubeIdFromUrl, MUSCLES } from '../src/data/library';
import { buildDefaultPlan, minimumVersion } from '../src/data/defaultPlan';
import { ATLAS_EXERCISES } from '../src/data/atlas.generated';
import { MOBILITY_A, MOBILITY_B, MOBILITY_C, YOGA, FASCIA, BREATH_MORNING, STICK_LEVELS } from '../src/data/pdfProgram';

const lib = builtinLibrary();
const byId = new Map(lib.map((e) => [e.id, e]));

describe('legacy map stays in step with days.js', () => {
  it('same blocks, same order, same types', () => {
    for (const day of DAYS) {
      expect(LEGACY_BLOCKS[day.id], day.id).toHaveLength(day.blocks.length);
      day.blocks.forEach((b, i) => {
        expect(LEGACY_BLOCKS[day.id][i].type).toBe(b.type);
        if (b.type === 'circuit') expect(LEGACY_BLOCKS[day.id][i].items).toHaveLength(b.items.length);
      });
    }
  });
  it('every mapped id exists in the library', () => {
    for (const blocks of Object.values(LEGACY_BLOCKS)) {
      for (const b of blocks) {
        if (b.items) b.items.forEach((id) => expect(byId.has(id), id).toBe(true));
        else expect(byId.has(b.id), b.id).toBe(true);
      }
    }
  });
});

describe('exercise library', () => {
  it('contains every Atlas exercise (reused, not retyped) with Atlas muscle keys', () => {
    for (const a of ATLAS_EXERCISES) expect(byId.has(a.id), a.id).toBe(true);
    for (const e of lib) for (const k of [...e.primary, ...e.secondary]) expect(MUSCLES[k], `${e.id}:${k}`).toBeTruthy();
  });
  it('contains the PDF exercises: A(8) B(8) C(8), yoga(8), fascia, breathing, stick L1-3', () => {
    expect([MOBILITY_A, MOBILITY_B, MOBILITY_C, YOGA].map((x) => x.length)).toEqual([8, 8, 8, 8]);
    expect(FASCIA).toHaveLength(9);
    expect(BREATH_MORNING).toHaveLength(3);
    for (const l of [1, 2, 3]) expect(STICK_LEVELS[l].items).toHaveLength(5);
    for (const it of [...MOBILITY_A, ...YOGA, ...FASCIA]) {
      const e = byId.get(it.id);
      expect(e.name.ar, it.id).toBe(it.ar);
      expect(e.dose).toBe(it.dose);
      expect(e.how).toBe(it.how);
    }
  });
  it('keeps the plan’s own names, sets, reps, holds and rests', () => {
    expect(byId.get('bench_press')).toMatchObject({ name: { en: 'Dumbbell Bench Press' }, type: 'reps', sets: 3, reps: 12, rest: 45 });
    expect(byId.get('plank')).toMatchObject({ type: 'hold', sets: 3, seconds: 40, rest: 30 });
    expect(byId.get('side_plank').perSide).toBe(true);
  });
  it('media comes from the verified mapping; exercises it has no video for say "no media yet"', () => {
    expect(byId.get('bench_press').media.url).toContain('youtube.com/watch?v=');
    expect(byId.get('hip_cars').media).toMatchObject({ source: expect.any(String), verified: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) });
    expect(byId.get('drop_knee').media).toBeNull();
    expect(byId.get('weak_hand').media).toBeNull();
    // the mapping's own caveat travels with the media
    expect(byId.get('halo_wood_chops').media.note).toMatch(/halo only/i);
  });
  it('filters by muscle, type, group and text', () => {
    expect(filterExercises(lib, { muscle: 'hamstrings' }).every((e) => [...e.primary, ...e.secondary].includes('hamstrings'))).toBe(true);
    expect(filterExercises(lib, { type: 'hold_side' }).length).toBeGreaterThan(0);
    expect(filterExercises(lib, { group: 'mobA' }).map((e) => e.id)).toContain('hip_cars');
    expect(filterExercises(lib, { q: 'bench press' }).map((e) => e.id)).toContain('bench_press');
  });
  it('user edits layer over built-ins and customs are added; reset = drop the override', () => {
    const rows = [
      { id: 'plank', data: { sets: 5, seconds: 60 }, archived: false },
      { id: 'my_move', data: { name: { en: 'My move', ar: '' }, type: 'reps' }, archived: false },
      { id: 'bench_press', data: {}, archived: true },
    ];
    const { list, byId: b } = applyOverrides(lib, rows);
    expect(b.get('plank')).toMatchObject({ sets: 5, seconds: 60, builtin: true, edited: true });
    expect(b.get('my_move')).toMatchObject({ builtin: false, source: 'custom' });
    expect(b.get('bench_press').archived).toBe(true);
    expect(filterExercises(list, {}).map((e) => e.id)).not.toContain('bench_press');
    expect(applyOverrides(lib, []).byId.get('plank').sets).toBe(3);
  });
  it('normalises user input', () => {
    const e = normaliseExercise({ ...blankExercise(), type: 'hold_side', sets: '3', seconds: '45', reps: '12', name: { en: '  Hold  ', ar: '' } });
    expect(e).toMatchObject({ sets: 3, seconds: 45, reps: null, perSide: true, name: { en: 'Hold' } });
  });
  it('parses YouTube ids', () => {
    expect(youtubeIdFromUrl('https://www.youtube.com/watch?v=abc123XYZ_-')).toBe('abc123XYZ_-');
    expect(youtubeIdFromUrl('https://youtu.be/abc123XYZ_-')).toBe('abc123XYZ_-');
    expect(youtubeIdFromUrl('https://example.com/x')).toBeNull();
  });
});

describe('default plan', () => {
  const plan = buildDefaultPlan();
  it('keeps the existing resistance workouts as the required session of each day', () => {
    for (const day of DAYS) {
      const main = plan.days[day.id].find((s) => s.id === 'main');
      expect(main.optional).toBe(false);
      expect(main.entries).toHaveLength(day.blocks.length);
      main.entries.forEach((e, i) => expect(e.eid).toBe(legacyEntryId(i)));
    }
  });
  it('adds the PDF add-ons from the weekly table as OPTIONAL sessions', () => {
    const ids = (d) => plan.days[d].map((s) => s.id);
    expect(ids('sun')).toEqual(['breath_am', 'main', 'mob_b', 'stick_rot', 'breath_pm']);
    expect(ids('mon')).toEqual(['breath_am', 'main', 'mob_a', 'breath_pm']);
    expect(ids('tue')).toEqual(['breath_am', 'main', 'stick_speed', 'fascia', 'breath_pm']);
    expect(ids('wed')).toEqual(['breath_am', 'main', 'yoga', 'breath_pm']);
    expect(ids('thu')).toEqual(['breath_am', 'main', 'mob_c', 'stick_strikes', 'breath_pm']);
    expect(ids('fri')).toEqual(['breath_am', 'main', 'mob_a', 'fascia', 'breath_pm']);
    expect(ids('sat')).toEqual(['breath_am', 'main', 'stick_shadow', 'calm_stretch', 'breath_pm']);
    for (const d of Object.keys(plan.days)) for (const s of plan.days[d]) if (s.id !== 'main') expect(s.optional, `${d}:${s.id}`).toBe(true);
    expect(plan.addOns.wed.minutes).toBe(40);
  });
  it('every entry points at a real exercise', () => {
    for (const sessions of Object.values(plan.days)) {
      for (const s of sessions) for (const e of s.entries) {
        if (e.kind === 'circuit') e.items.forEach((i) => expect(byId.has(i.exerciseId), i.exerciseId).toBe(true));
        else expect(byId.has(e.exerciseId), e.exerciseId).toBe(true);
      }
    }
  });
  it('the 12-hour minimum version is breathing + 3 movements', () => {
    const m = minimumVersion(plan, 'wed');
    expect(m.breathing).toEqual(['breath_am']);
    expect(m.movements).toHaveLength(3);
  });
});
