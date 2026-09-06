/* =========================================================
   Three-layer recovery system (v2 handoff §4.5 / §6.2 / §6.3)

   - DYNAMIC : region-level movement prep, done before training
   - MOBILITY: joint-level CARs-style controlled-range drills —
               the "fluid, martial-artist" layer, distinct from both
               warm-up and stretching
   - STATIC  : muscle-level held stretches, done after training

   Each DYNAMIC/MOBILITY entry lists which STATIC muscles it
   "covers" — used to derive, per day, which dynamic + mobility
   video (if any) pairs with each of that day's target muscles.
   English-only: these are supplementary anatomy-library entries
   beyond the source PDF's own bilingual exercise list, so unlike
   DAYS in days.js they aren't transcribed from Arabic source text.
   ========================================================= */

export const DYNAMIC = {
  fullBodyCardio: {
    en: 'Full-Body / Cardio',
    ar: 'كامل الجسم / كارديو',
    vid: 'oiBAbrqajBw',
    covers: [],
    generic: true, // applies to any muscle when nothing more specific is assigned that day
    tips: ['Raises heart rate and loosens every major joint before you load them.', 'Keep it light — you should feel warm, not winded.', '3–5 minutes.'],
  },
  upperBodyDynamic: {
    en: 'Upper Body Dynamic',
    ar: 'علوي الجسم — ديناميكي',
    vid: 'k9MY1ijAvGo',
    covers: ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
    tips: ['Rehearses the pressing/pulling patterns you’re about to load.', 'Controlled reps, not fast and loose.', '5 minutes before any upper session.'],
  },
  lowerBodyDynamic: {
    en: 'Lower Body Dynamic',
    ar: 'سفلي الجسم — ديناميكي',
    vid: 'QLkLKfL_7F0',
    covers: ['quadsHamstrings', 'glutes'],
    tips: ['Wakes up the hips, knees, and ankles before squatting/lunging patterns.', 'Full range, but not bouncy at the end range.', '5 minutes before any lower session.'],
  },
  hipGluteActivation: {
    en: 'Hip & Glute Activation',
    ar: 'تفعيل الحوض والأرداف',
    vid: 'DgjiFOKWsfg',
    covers: ['hipFlexors', 'adductors', 'glutes'],
    tips: ['Gets the glutes firing before hip-hinge and rotational work — cold glutes let the lower back take over.', 'Feel it in the glute, not the lower back.', '5 minutes before Wednesday’s session.'],
  },
  ankleCalfMobility: {
    en: 'Ankle & Calf Mobility',
    ar: 'مرونة الكاحل والسمانة',
    vid: '3n5UuwirfYk',
    covers: ['calves'],
    tips: ['Loosens the ankle before jump-heavy HIIT work — stiff ankles push landing stress up into the knee.', 'Small controlled range, building up gradually.', '3–5 minutes before HIIT days.'],
  },
  coreTorsoRotation: {
    en: 'Core / Torso Rotation',
    ar: 'دوران الجذع والبطن',
    vid: 'm4-T61Xcpt4',
    covers: ['abs', 'obliquesLowerBack'],
    tips: ['Primes rotational control before wood chops and oblique work.', 'Rotate from the torso, keep the hips relatively stable.', '5 minutes before Wednesday’s session.'],
  },
};

export const MOBILITY = {
  shoulderCARs: {
    en: 'Shoulder CARs',
    ar: 'دوران الكتف الكامل (CARs)',
    vid: '2hyNG1U5wYs',
    covers: ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
    tips: ['Move slowly and own every degree of the circle — don’t let momentum carry the joint.', 'Keep the rest of the body still so only the shoulder moves.', '2–3 slow circles each direction, each arm.'],
  },
  hip9090: {
    en: 'Hip 90/90 Rotation',
    ar: 'دوران الحوض ٩٠/٩٠',
    vid: 'KOV5iN86EwM',
    covers: ['glutes', 'hipFlexors', 'adductors', 'quadsHamstrings'],
    tips: ['Rotate from the hip, not by twisting the lower back.', 'Keep both sit-bones on the floor through the movement.', '5 controlled reps each side.'],
  },
  tSpineRotation: {
    en: 'T-Spine (Thoracic) Rotation',
    ar: 'دوران الظهر العلوي',
    vid: 'h54us18qc20',
    covers: ['abs', 'obliquesLowerBack'],
    tips: ['Rotate through the mid-back, keep the hips facing forward the whole time.', 'Follow the moving hand with your eyes to encourage full rotation.', '5 slow reps each side.'],
  },
  ankleMobility: {
    en: 'Ankle Mobility (CARs-based)',
    ar: 'مرونة الكاحل',
    vid: 'Zq3HYp6MCkw',
    covers: ['calves'],
    tips: ['Drive the knee forward over the toes without the heel lifting.', 'Move to the edge of the range and pause a beat before returning.', '8–10 controlled reps each ankle.'],
  },
  wristMobility: {
    en: 'Wrist Mobility',
    ar: 'مرونة الرسغ',
    vid: 'nvJ-1suJCTU',
    covers: [],
    tips: ['Small range, done slow — this is prep for load-bearing on planks and push-ups, not a stretch.', 'Circle in both directions, then flex/extend through the full range.', '8–10 reps each direction, each wrist.'],
  },
  primalFlow: {
    en: 'Full-Body Primal Movement Flow',
    ar: 'تدفق حركي كامل الجسم (أسبوعي)',
    vid: 'IZi0rl8G-qw',
    covers: [],
    badge: 'Weekly bonus',
    tips: ['Move continuously and stay low — this connects movement across the whole body rather than isolating one joint.', 'Breathe steadily; holding your breath means you’re moving too fast.', '5–10 minutes, any day you want extra movement fluency.'],
  },
};

export const STATIC = {
  chest: {
    en: 'Chest (Pectorals)', ar: 'الصدر', vid: 'aR-u_PRGZkY',
    tips: ['Counterbalances all the pressing you just did — tight pecs round the shoulders forward over time.', 'Common mistake: bouncing the stretch — ease in and hold still.', 'Hold 20–30s per side.'],
  },
  back: {
    en: 'Back / Lats', ar: 'الظهر', vid: 'DrkBSODtE5s',
    tips: ['Rows and pull-downs load the lats — stretching keeps overhead reach and posture in check.', 'Let the weight of your arm do the work, don’t yank.', 'Hold 20–30s per side.'],
  },
  shoulders: {
    en: 'Shoulders (Deltoids)', ar: 'الأكتاف', vid: 'qLsgIzQ8_eQ',
    tips: ['High-rep pressing and lateral work tightens the deltoids fast — this keeps overhead range open.', 'Keep the shoulder blade relaxed, not shrugged, through the stretch.', 'Hold 20–30s per side.'],
  },
  biceps: {
    en: 'Biceps', ar: 'البايسبس', vid: 'Xm6rif0Crcg',
    tips: ['Curls shorten the biceps under load — stretching restores full elbow extension.', 'Straighten the elbow fully but don’t force the wrist back.', 'Hold 20–30s per side.'],
  },
  triceps: {
    en: 'Triceps', ar: 'الترايسبس', vid: '03XyeYNxOSc',
    tips: ['Overhead extensions and kickbacks tighten the triceps — this keeps the arm able to fully straighten overhead.', 'Pull from the upper arm, not the forearm or the elbow joint itself.', 'Hold 20–30s per side.'],
  },
  neck: {
    en: 'Neck', ar: 'الرقبة', vid: 't8Lbfc-gja0',
    tips: ['Called out specifically after Sunday’s session — pressing work tends to creep tension into the neck and traps.', 'Move slow, no forcing — this is a small, sensitive range.', 'Hold 20–30s per side, no bouncing.'],
  },
  abs: {
    en: 'Abs / Core', ar: 'البطن', vid: 'soa9oz3RTVo',
    tips: ['Crunches and planks shorten the abs — this restores a full, comfortable spinal extension.', 'Ease into it from the hips, not by yanking the neck back.', 'Hold 20–30s.'],
  },
  obliquesLowerBack: {
    en: 'Obliques & Lower Back', ar: 'البطن المائلة وأسفل الظهر', vid: 'PGDnZ-sCC_o',
    tips: ['Wood chops and windshield wipers work the obliques hard through rotation — this unwinds them and eases the lower back.', 'Rotate from the ribcage, not by wrenching the neck.', 'Hold 20–30s per side.'],
  },
  quadsHamstrings: {
    en: 'Quads & Hamstrings', ar: 'الفخذ الأمامي والخلفي', vid: '425X5y4yzvY',
    tips: ['Squats, lunges, and leg extensions load both sides of the thigh — stretch both so one side doesn’t stay tighter.', 'For the quad stretch, keep the knees together, don’t flare the hip.', 'Hold 20–30s per leg, each muscle.'],
  },
  glutes: {
    en: 'Glutes', ar: 'الأرداف', vid: 'dVcF97Ddo-8',
    tips: ['Bridges and squats fire the glutes hard — a pigeon-style stretch keeps hip rotation loose.', 'Keep the hips square, don’t let the trunk collapse to one side.', 'Hold 20–30s per side.'],
  },
  calves: {
    en: 'Calves', ar: 'السمانة', vid: 'trC42QD0wQI',
    tips: ['Calf raises and jump work (squat jumps, broad jumps, HIIT) tighten the calf fast — tight calves limit squat depth and ankle mobility.', 'Keep the back heel down and the leg straight for the full stretch.', 'Hold 20–30s per side.'],
  },
  hipFlexors: {
    en: 'Hip Flexors', ar: 'مقدمة الحوض', vid: 'nTJaGnjUkTY',
    tips: ['Squats and lunges keep the hip flexors in a shortened position under load — a couch stretch restores full hip extension.', 'Squeeze the glute on the stretching side to deepen it safely.', 'Hold 20–30s per side.'],
  },
  adductors: {
    en: 'Adductors / Groin (Inner Thigh)', ar: 'الفخذ الداخلي', vid: 'ANue9qDFg90',
    tips: ['Cossack squats and inner-thigh work load the adductors through a big range — stretching keeps that range from tightening back up.', 'Keep the stretching leg straight and the toes pointed up.', 'Hold 20–30s per side.'],
  },
};

/** Per-day recovery config — the Dynamic/Mobility/Static columns from handoff §4.5. */
const DAY_RECOVERY = {
  sun: { dynamic: ['upperBodyDynamic'], mobility: ['shoulderCARs', 'wristMobility'], static: ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'neck'] },
  mon: { dynamic: ['lowerBodyDynamic'], mobility: ['hip9090', 'ankleMobility'], static: ['quadsHamstrings', 'glutes', 'calves'] },
  tue: { dynamic: ['fullBodyCardio', 'ankleCalfMobility'], mobility: ['hip9090', 'ankleMobility'], static: ['quadsHamstrings', 'calves'] },
  wed: { dynamic: ['coreTorsoRotation', 'hipGluteActivation'], mobility: ['tSpineRotation', 'hip9090', 'wristMobility'], static: ['abs', 'obliquesLowerBack', 'hipFlexors', 'adductors', 'glutes'] },
  thu: { dynamic: ['upperBodyDynamic'], mobility: ['shoulderCARs', 'wristMobility'], static: ['back', 'shoulders', 'biceps', 'triceps', 'obliquesLowerBack'] },
  fri: { dynamic: ['lowerBodyDynamic'], mobility: ['hip9090', 'ankleMobility'], static: ['quadsHamstrings', 'glutes', 'calves'] },
  sat: { dynamic: ['fullBodyCardio', 'ankleCalfMobility'], mobility: ['hip9090', 'ankleMobility'], static: ['quadsHamstrings', 'calves'] },
};

/**
 * Builds the "Prepare & Recover" content for one day: one card per target
 * muscle (with whichever of that day's Dynamic/Mobility entries covers it,
 * if any — never all three are guaranteed), plus any of the day's
 * Dynamic/Mobility entries that don't map onto a specific muscle card
 * (e.g. Wrist Mobility on plank/push-up days) as standalone "extras".
 */
export function buildDayRecovery(dayId) {
  const config = DAY_RECOVERY[dayId];
  if (!config) return { cards: [], extras: [] };

  const dynamicEntries = config.dynamic.map((k) => ({ key: k, ...DYNAMIC[k] }));
  const mobilityEntries = config.mobility.map((k) => ({ key: k, ...MOBILITY[k] }));
  const usedDynamic = new Set();
  const usedMobility = new Set();

  const cards = config.static.map((muscleKey) => {
    const dynamic = dynamicEntries.find((e) => e.generic || e.covers.includes(muscleKey));
    const mobility = mobilityEntries.find((e) => e.covers.includes(muscleKey));
    if (dynamic) usedDynamic.add(dynamic.key);
    if (mobility) usedMobility.add(mobility.key);
    return { key: muscleKey, muscle: STATIC[muscleKey], dynamic, mobility };
  });

  const extras = [...dynamicEntries.filter((e) => !e.generic && !usedDynamic.has(e.key)), ...mobilityEntries.filter((e) => !usedMobility.has(e.key))];

  return { cards, extras };
}
