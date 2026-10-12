// Maps the v1 storage addressing — (day_id, block_index) — onto library exercise ids.
// v1 logs (set_logs / circuit_logs) only know "Sunday, block 3"; the v2 session log is keyed
// by exercise. This map is what lets the one-time v2 migration attach old history to the right
// exercise. It is pure data (no imports) so server code could also use it.
//
// Entry ids inside the default plan are `b<blockIndex>` for the same reason (see defaultPlan.js).
//
// Order MUST match src/data/days.js — tests/legacyMap.test.js cross-checks it, so a reorder of
// days.js can't silently re-point old history at the wrong exercise.

export const LEGACY_BLOCKS = {
  sun: [
    { id: 'bench_press', type: 'resistance' },
    { id: 'bent_over_rows', type: 'resistance' },
    { id: 'shoulder_press', type: 'resistance' },
    { id: 'around_the_world', type: 'resistance' },
    { id: 'plan_curl_kickback', type: 'resistance' },
    { id: 'plank', type: 'isometric' },
  ],
  mon: [
    { id: 'chair_squat', type: 'resistance' },
    { id: 'lunges', type: 'resistance' },
    { id: 'cossack_squats', type: 'resistance' },
    { id: 'calf_raises', type: 'resistance' },
    { id: 'jump_squats', type: 'resistance' },
    { id: 'wall_sit', type: 'isometric' },
  ],
  tue: [
    {
      id: 'circuit_tue',
      type: 'circuit',
      items: ['step_ups_fast', 'jumping_jacks', 'high_knees', 'mountain_climbers', 'jump_squats', 'plank'],
    },
  ],
  wed: [
    { id: 'hip_flexor_march', type: 'resistance' },
    { id: 'lateral_hip_steps', type: 'resistance' },
    { id: 'leg_circles', type: 'resistance' },
    { id: 'inner_thigh_raise', type: 'resistance' },
    { id: 'hip_adduction_squeeze', type: 'resistance' },
    { id: 'wood_chops', type: 'resistance' },
    { id: 'halo_wood_chops', type: 'resistance' },
    { id: 'bicycle_crunches', type: 'resistance' },
    { id: 'windshield_wiper', type: 'resistance' },
    { id: 'side_plank', type: 'isometric' },
  ],
  thu: [
    { id: 'declined_pushup', type: 'resistance' },
    { id: 'band_pulldown', type: 'resistance' },
    { id: 'lateral_raises', type: 'resistance' },
    { id: 'face_pulls', type: 'resistance' },
    { id: 'plan_hammer_triceps', type: 'resistance' },
    { id: 'superman', type: 'isometric' },
  ],
  fri: [
    { id: 'plan_legext_curl', type: 'resistance' },
    { id: 'glutes_bridge', type: 'resistance' },
    { id: 'side_leg_raises', type: 'resistance' },
    { id: 'laying_leg_raises', type: 'resistance' },
    { id: 'broad_jump', type: 'resistance' },
    { id: 'glute_bridge_hold', type: 'isometric' },
  ],
  sat: [
    {
      id: 'circuit_sat',
      type: 'circuit',
      items: ['step_ups_knee_drive', 'outdoor_sprint', 'lateral_jumps', 'toe_touches', 'skater_jumps', 'hollow_hold'],
    },
  ],
};

export const DEFAULT_PLAN_ID = 'default';
export const MAIN_SESSION_ID = 'main';
export const legacyEntryId = (blockIndex) => `b${blockIndex}`;
