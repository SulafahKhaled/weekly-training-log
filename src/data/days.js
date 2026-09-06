import { V } from './videos';
import { DYNAMIC, MOBILITY, STATIC } from './recovery';

/* Exercise-type shapes:
   resistance: {type:'resistance', en, ar, sets, reps, rest, vid, note?}
   isometric : {type:'isometric', en, ar, sets, hold, rest, vid, note?}
   circuit   : {type:'circuit', en, ar, rounds, work, rest, items:[{en,ar,vid}]}
*/

export const DAYS = [
  {
    id: 'sun', color: 'upper', tag: 'Upper A', tagAr: 'علوي A',
    nameEn: 'Sunday', nameAr: 'الأحد',
    warmup: { en: 'Brisk walk 5 min + arm circles ×10/side + neck circles ×10/side + waist circles ×10', ar: 'مشي سريع 5 د + Arm circles ×10 لكل جهة + Neck circles ×10 + Waist circles ×10' },
    blocks: [
      { type: 'resistance', en: 'Dumbbell Bench Press', ar: 'Dumbbell bench press (الصدر)', sets: 3, reps: 12, rest: 45, vid: V.benchPress },
      { type: 'resistance', en: 'Dumbbell Bent-Over Row', ar: 'Dumbbell bent over rows (الظهر)', sets: 3, reps: 12, rest: 45, vid: V.bentOverRow },
      { type: 'resistance', en: 'Dumbbell Shoulder Press', ar: 'Dumbbell shoulder press (الأكتاف)', sets: 3, reps: 12, rest: 45, vid: V.shoulderPress },
      { type: 'resistance', en: 'Around the World', ar: 'Around the world (الأكتاف)', sets: 2, reps: 10, rest: 30, vid: V.aroundTheWorld },
      { type: 'resistance', en: 'DB Curl + Kickback', ar: 'Dumbbell curls + Kickbacks (بايسبس/ترايسبس)', sets: 3, reps: 12, rest: 45, vid: V.curlKickback },
      { type: 'isometric', en: 'Plank Hold', ar: 'Plank ثبات (الكور)', sets: 3, hold: 40, rest: 30, vid: V.plank },
    ],
    cooldown: { en: 'Shoulder / Triceps / Arms / Neck stretch — 30s each side', ar: 'تربيد: Shoulder / Triceps / Arms / Neck stretch — 30ث لكل جهة' },
  },
  {
    id: 'mon', color: 'lower', tag: 'Lower A', tagAr: 'سفلي A',
    nameEn: 'Monday', nameAr: 'الاثنين',
    warmup: { en: 'Brisk walk 5 min + hip circles ×10/side + foot circles ×10/side + leg circles ×10/side', ar: 'مشي سريع 5 د + Hip circles ×10 + Foot circles ×10 + Leg circles ×10 لكل جهة' },
    blocks: [
      { type: 'resistance', en: 'Chair Squat', ar: 'Chair squat (كواد/أرداف)', sets: 3, reps: 15, rest: 30, vid: V.chairSquat },
      { type: 'resistance', en: 'Dumbbell Lunges', ar: 'Dumbbell lunges (فخذ/أرداف)', sets: 3, reps: 12, rest: 30, vid: V.lunges },
      { type: 'resistance', en: 'Cossack Squat', ar: 'Cossack squats (فخذ داخلي/أرداف)', sets: 3, reps: 10, rest: 30, note: 'per side', vid: V.cossackSquat },
      { type: 'resistance', en: 'Standing Calf Raise', ar: 'Step standing calf raises (السمانة)', sets: 3, reps: 12, rest: 30, vid: V.calfRaise },
      { type: 'resistance', en: 'Jump Squat', ar: 'Jump squats (فخذ/أرداف)', sets: 3, reps: 10, rest: 30, vid: V.jumpSquat },
      { type: 'isometric', en: 'Wall Sit', ar: 'Wall sit ثبات (كواد)', sets: 3, hold: 40, rest: 30, vid: V.wallSit },
    ],
    cooldown: { en: 'Quads / Calf / Hamstring / Glutes stretch — 30s each leg', ar: 'تربيد: Quads / Calf / Hamstring / Glutes stretch — 30ث لكل قدم' },
  },
  {
    id: 'tue', color: 'hiit', tag: 'HIIT · Circuit 1', tagAr: 'كارديو ستيب سيركلز ١',
    nameEn: 'Tuesday', nameAr: 'الثلاثاء',
    warmup: { en: 'Quick march 5 min + arm/waist circles', ar: 'مشي سريع 5 د + Arm/Waist circles' },
    blocks: [
      {
        type: 'circuit', en: 'HIIT Circuit', ar: 'الدائرة', rounds: 4, work: 40, rest: 20,
        items: [
          { en: 'Fast Step-Ups', ar: 'Step-ups سريع (فخذ/أرداف)', vid: V.stepUp },
          { en: 'Jumping Jacks', ar: 'Jumping jacks (كامل الجسم)', vid: V.jumpingJack },
          { en: 'High Knees', ar: 'سربنت في المكان — High knees سريع', vid: V.highKnees },
          { en: 'Mountain Climbers', ar: 'Mountain climbers (بطن/كارديو)', vid: V.mountainClimber },
          { en: 'Squat Jump', ar: 'Squat jump (فخذ/أرداف)', vid: V.jumpSquat },
          { en: 'Plank Hold (30s)', ar: 'Plank ثبات (الكور) ٣٠ث', vid: V.plank },
        ],
      },
    ],
    cooldown: { en: 'Easy walk 5 min + full-body stretch 30s/muscle', ar: 'تربيد: مشي هادئ 5 د + إطالة عامة للجسم كامل 30ث/جزء' },
  },
  {
    id: 'wed', color: 'core', tag: 'Core + Hip', tagAr: 'Core + حوض',
    nameEn: 'Wednesday', nameAr: 'الأربعاء',
    warmup: { en: 'Brisk walk 5 min + hip circles ×15/side + waist circles ×15/side', ar: 'مشي سريع 5 د + Hip circles ×15 + Waist circles ×15 لكل جهة' },
    blocks: [
      { type: 'resistance', en: 'Supine Hip Flexor March', ar: 'Supine hip flexor march (مقدمة الحوض) — band', sets: 3, reps: 12, rest: 20, note: 'per leg · resistance band', vid: V.hipBandRoutine },
      { type: 'resistance', en: 'Seated Lateral Hip Steps', ar: 'Seated lateral hip steps (مبعدات الحوض) — band', sets: 3, reps: 12, rest: 20, note: 'per side · resistance band', vid: V.hipBandRoutine },
      { type: 'resistance', en: 'Side-Lying Leg Circles', ar: 'Side-lying leg circles (الأرداف) — band', sets: 3, reps: 10, rest: 20, note: 'per side · resistance band', vid: V.hipBandRoutine },
      { type: 'resistance', en: 'Side-Lying Inner Thigh Raise', ar: 'Side-lying inner thigh raise (الفخذ الداخلي) — band', sets: 3, reps: 12, rest: 20, note: 'per side · resistance band', vid: V.hipBandRoutine },
      { type: 'resistance', en: 'Hip Adduction Squeeze', ar: 'Hip adduction squeeze (الفخذ الداخلي) — band/ball', sets: 3, reps: 12, rest: 20, vid: V.hipBandRoutine },
      { type: 'resistance', en: 'Wood Chops', ar: 'Wood chops (بطن مائلة)', sets: 3, reps: 12, rest: 30, note: 'per side', vid: V.woodChop },
      { type: 'resistance', en: 'Halo + Wood Chop combo', ar: 'Halo + Wood chops مدمج (بطن مائلة/أكتاف)', sets: 2, reps: 10, rest: 30, note: 'per side', vid: V.halo },
      { type: 'resistance', en: 'Bicycle Crunches', ar: 'Bicycle crunches (البطن)', sets: 3, reps: 12, rest: 30, vid: V.bicycleCrunch },
      { type: 'resistance', en: 'Windshield Wiper', ar: 'Windshield wiper (بطن سفلي/مائلة)', sets: 3, reps: 12, rest: 30, vid: V.windshieldWiper },
      { type: 'isometric', en: 'Side Plank Hold', ar: 'Side plank ثبات (بطن مائلة)', sets: 3, hold: 30, rest: 25, note: 'per side', vid: V.sidePlank },
    ],
    cooldown: { en: 'Glutes / Hip flexor / Waist stretch — 30s', ar: 'تربيد: Glutes / Hip flexor / Waist stretch — 30ث' },
  },
  {
    id: 'thu', color: 'upper', tag: 'Upper B', tagAr: 'علوي B',
    nameEn: 'Thursday', nameAr: 'الخميس',
    warmup: { en: 'Brisk walk 5 min + arm circles ×10/side + neck circles ×10/side', ar: 'مشي سريع 5 د + Arm circles ×10 + Neck circles ×10 لكل جهة' },
    blocks: [
      { type: 'resistance', en: 'Decline Push-Up', ar: 'Declined push up (صدر سفلي/ترايسبس)', sets: 3, reps: 12, rest: 45, vid: V.declinePushup },
      { type: 'resistance', en: 'Band Pull-Down', ar: 'Band pull down (الظهر)', sets: 3, reps: 12, rest: 45, vid: V.bandPullDown },
      { type: 'resistance', en: 'Lateral Raise', ar: 'Lateral raises (أكتاف جانبية)', sets: 3, reps: 12, rest: 30, vid: V.lateralRaise },
      { type: 'resistance', en: 'Face Pull', ar: 'Face pulls (ظهر علوي/أكتاف خلفية)', sets: 3, reps: 12, rest: 30, vid: V.facePull },
      { type: 'resistance', en: 'Hammer Curl + Overhead Triceps Ext.', ar: 'Dumbbell hammer curls + Triceps overhead ext', sets: 3, reps: 12, rest: 30, vid: V.hammerCurlTricep },
      { type: 'isometric', en: 'Superman Hold', ar: 'Superman ثبات (أسفل الظهر)', sets: 3, hold: 40, rest: 30, vid: V.superman },
    ],
    cooldown: { en: 'Shoulder / Triceps / Arms stretch — 30s each arm', ar: 'تربيد: Shoulder / Triceps / Arms stretch — 30ث لكل ذراع' },
  },
  {
    id: 'fri', color: 'lower', tag: 'Lower B', tagAr: 'سفلي B',
    nameEn: 'Friday', nameAr: 'الجمعة',
    warmup: { en: 'Brisk walk 5 min + leg/foot circles ×10/side', ar: 'مشي سريع 5 د + Leg/Foot circles ×10 لكل جهة' },
    blocks: [
      { type: 'resistance', en: 'DB Leg Extension + Leg Curl', ar: 'Dumbbell leg extension + leg curls (كواد/هامسترينغ)', sets: 3, reps: 12, rest: 30, vid: V.legExtCurl },
      { type: 'resistance', en: 'Glute Bridge', ar: 'Glutes bridge (الأرداف)', sets: 3, reps: 14, rest: 30, vid: V.gluteBridge },
      { type: 'resistance', en: 'Side Leg Raise', ar: 'Side leg raises (مبعدات الفخذ)', sets: 3, reps: 12, rest: 30, note: 'per side', vid: V.sideLegRaise },
      { type: 'resistance', en: 'Lying Leg Raise', ar: 'Laying leg raises (بطن سفلي)', sets: 3, reps: 12, rest: 30, vid: V.lyingLegRaise },
      { type: 'resistance', en: 'Broad Jump', ar: 'Broad jump (فخذ/أرداف) — قفز أمامي', sets: 3, reps: 8, rest: 40, vid: V.broadJump },
      { type: 'isometric', en: 'Glute Bridge Top Hold', ar: 'Glute bridge ثبات (أعلى الحركة)', sets: 3, hold: 30, rest: 25, vid: V.gluteBridge },
    ],
    cooldown: { en: 'Quads / Calf / Hamstring / Glutes stretch — 30s each leg', ar: 'تربيد: Quads / Calf / Hamstring / Glutes stretch — 30ث لكل قدم' },
  },
  {
    id: 'sat', color: 'hiit', tag: 'HIIT · Circuit 2', tagAr: 'كارديو ستيب سيركلز ٢',
    nameEn: 'Saturday', nameAr: 'السبت',
    warmup: { en: 'Quick march 5 min + leg/waist circles', ar: 'مشي سريع 5 د + Leg/Waist circles' },
    blocks: [
      {
        type: 'circuit', en: 'HIIT Circuit', ar: 'الدائرة', rounds: 4, work: 40, rest: 20,
        items: [
          { en: 'Step-Up + Knee Drive', ar: 'Step-ups + Knee drive (فخذ/أرداف)', vid: V.stepUp },
          { en: 'Max-Speed Sprint in Place', ar: 'سربنت خارجي/سري — أقصى سرعة', vid: V.highKnees },
          { en: 'Lateral Jumps', ar: 'Lateral jumps (فخذ جانبي/أرداف)', vid: V.lateralJump },
          { en: 'Toe Touches', ar: 'Toe touches (البطن)', vid: V.toeTouch },
          { en: 'Skater Jumps', ar: 'Skater jumps (فخذ جانبي/أرداف)', vid: V.skaterJump },
          { en: 'Hollow Hold (30s)', ar: 'Hollow hold ثبات (الكور) ٣٠ث', vid: V.hollowHold },
        ],
      },
    ],
    cooldown: { en: 'Easy walk 5 min + full-body stretch 30s/muscle', ar: 'تربيد: مشي هادئ 5 د + إطالة كاملة 30ث/جزء' },
  },
];

/* Warm-up / Mobility / Cool-down tabs are full reference libraries — every
   region/joint/muscle entry from the three-layer recovery system in
   recovery.js, browsable outside the context of any one day. The primary
   path for "what applies to today" is each Day screen's own
   Prepare & Recover section (see PrepareRecover.jsx), which pulls from the
   same underlying data. */
export const WARMUP_INFO = {
  title: 'Warm-up', ar: 'الإحماء',
  blurb: 'Dynamic, movement-based warm-ups — done before training to raise your heart rate and rehearse the movement pattern you’re about to load. Every entry here also appears on the relevant training day’s Prepare & Recover section.',
  videos: Object.values(DYNAMIC).map((d) => ({ en: d.en, ar: d.ar, vid: d.vid, tips: d.tips })),
};
export const COOLDOWN_INFO = {
  title: 'Cool-down', ar: 'التربيد',
  blurb: 'Static, held stretches — done after training while the muscle is still warm, holding each 20–30 seconds. Browse the full library here, or find just the muscles a given day trains on that day’s Prepare & Recover section.',
  videos: Object.values(STATIC).map((s) => ({ en: s.en, ar: s.ar, vid: s.vid, tips: s.tips })),
};
export const MOBILITY_INFO = {
  title: 'Mobility', ar: 'المرونة والحركة',
  blurb: 'Controlled Articular Rotations (CARs) and joint-focused drills — slow, deliberate, full-range-of-motion work. This is the layer that builds real, martial-artist-like control at end-range, distinct from both warm-up and stretching.',
  videos: Object.values(MOBILITY).map((m) => ({ en: m.en, ar: m.ar, vid: m.vid, tips: m.tips, badge: m.badge })),
};
