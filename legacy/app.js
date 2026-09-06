/* =========================================================
   الخطة الأسبوعية — Weekly Training Log
   Single-file local app: data + rendering + timers
   ========================================================= */

/* ---------- helpers ---------- */
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
const todayKey = () => new Date().toISOString().slice(0, 10);

function store(key, val) {
  if (val === undefined) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  }
  localStorage.setItem(key, JSON.stringify(val));
}

function beep(freq = 880, dur = 0.15, delay = 0) {
  try {
    const ctx = beep._ctx || (beep._ctx = new (window.AudioContext || window.webkitAudioContext)());
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  } catch (e) { /* audio not available */ }
}
function beepStart() { beep(660, 0.12); }
function beepEnd() { beep(880, 0.12); beep(880, 0.12, 0.16); }
function beepDone() { beep(520, 0.12); beep(660, 0.12, 0.14); beep(880, 0.18, 0.28); }

function fmtTime(s) {
  s = Math.max(0, Math.round(s));
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

/* ---------- video data (verified YouTube demo videos) ---------- */
const V = {
  warmupGeneral: 'oiBAbrqajBw',
  cooldownGeneral: '4Ajg_KJwbHc',
  mobilityGeneral: 'W1OQIx-Rgw4',
  mobilityHip: '888Fod2Fcmo',
  mobilityShoulder: 'cHEdG5bb0ds',

  benchPress: 'J-gWN5hYwRU',
  bentOverRow: 'c-gt-zzoa_A',
  shoulderPress: '0JfYxMRsUCQ',
  aroundTheWorld: 'TQa0zH8Mvf4',
  curlKickback: 'I5BsUOzDyC4',
  plank: 'mwlp75MS6Rg',

  chairSquat: 'rvpC9QkTc3Y',
  lunges: '9gglI77Kzq8',
  cossackSquat: 'JaCbmoDqUc4',
  calfRaise: 'ndQc4mz4mBU',
  jumpSquat: 'tZjZxrAeVjg',
  wallSit: 'rHRVy2j85EE',

  stepUp: 'vs87hPGdnCc',
  jumpingJack: 'Q4QnlZs9PqI',
  highKnees: 'lR3cpCVBjPM',
  mountainClimber: 'cnyTQDSE884',

  hipBandRoutine: 'MfWcrchYEN4',
  woodChop: 'Rf-2l8Z40dg',
  halo: 'hGP_n2y-r84',
  bicycleCrunch: 'wpRI3xBhJmo',
  windshieldWiper: 'ggmcWcfSeq4',
  sidePlank: 'iNbH7_edNI8',

  declinePushup: 'QBlYp-EwHlo',
  bandPullDown: 'zTSPbF4LSZw',
  lateralRaise: 'ssAo_xwFt5c',
  facePull: 'PYj77in44ms',
  hammerCurlTricep: 'oOQg_AJNTIg',
  superman: 'ATly_pW0i6g',

  legExtCurl: 'ZHlBSI6JPsA',
  gluteBridge: '1PRGMrkaOBM',
  sideLegRaise: '8c0HOaxWlYE',
  lyingLegRaise: 'sY2ZgV2Sj_s',
  broadJump: '7Du1KbwCdUk',

  lateralJump: 'VcbNNYXyhdc',
  toeTouch: 'NR4k8hJfs-8',
  skaterJump: 'ZuOYHejN7GU',
  hollowHold: 'LlDNef_Ztsc',
};

/* ---------- exercise-type builders ----------
   resistance: {type:'resistance', en, ar, sets, reps, rest, vid}
   isometric : {type:'isometric', en, ar, sets, hold, rest, vid}
   circuit   : {type:'circuit', en, ar, rounds, work, rest, items:[{en,ar,vid}]}
------------------------------------------------- */

const DAYS = [
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

/* ---------- Warm-up / Cool-down / Mobility info pages ---------- */
const WARMUP_INFO = {
  title: 'Warm-up', ar: 'الإحماء',
  blurb: 'A proper warm-up raises your heart rate and takes joints through a full range of motion before you load them. Do this before every session — 5–10 minutes.',
  videos: [
    { en: 'Full-Body Dynamic Warm-Up (10 min)', ar: 'إحماء ديناميكي كامل الجسم', vid: V.warmupGeneral, tips: ['Follow along before any resistance or HIIT day', 'Keep movements controlled, not bouncy', 'Should leave you slightly warm, not fatigued'] },
  ],
};
const COOLDOWN_INFO = {
  title: 'Cool-down', ar: 'التربيد',
  blurb: 'Cooling down brings your heart rate back down gradually and uses static stretching — holding each stretch 20–30 seconds — to release the muscles you just trained.',
  videos: [
    { en: 'Full-Body Stretch & Cool-Down (10 min)', ar: 'تمدد وتربيد كامل الجسم', vid: V.cooldownGeneral, tips: ['Breathe slowly into each stretch', 'Never bounce — ease in and hold', 'Best done immediately after training while muscles are warm'] },
  ],
};
const MOBILITY_INFO = {
  title: 'Mobility', ar: 'المرونة والحركة',
  blurb: 'Mobility work is different from stretching — it actively moves a joint through its full range. Doing a short mobility routine 2–3×/week (or as a rest-day activity) improves squat depth, shoulder overhead position, and general movement quality.',
  videos: [
    { en: 'Full-Body Mobility Routine (10 min)', ar: 'روتين مرونة كامل الجسم', vid: V.mobilityGeneral, tips: ['Great for rest days or as extra warm-up', 'Move slow and controlled through each range'] },
    { en: 'Hip Mobility for a Better Squat', ar: 'مرونة الحوض لتحسين القرفصاء', vid: V.mobilityHip, tips: ['Pairs well with Monday/Friday leg days', 'Helps squat depth and knee comfort'] },
    { en: 'Shoulder Mobility Routine', ar: 'روتين مرونة الكتف', vid: V.mobilityShoulder, tips: ['Pairs well with Sunday/Thursday upper days', 'Good for desk-related shoulder stiffness'] },
  ],
};

/* =========================================================
   STATE + ROUTING
   ========================================================= */
let route = { view: 'home', dayId: null };

function setRoute(view, dayId = null) {
  route = { view, dayId };
  render();
  window.scrollTo(0, 0);
}

$$('.tabbar button').forEach(btn => {
  btn.addEventListener('click', () => setRoute(btn.dataset.tab));
});
$('#backBtn').addEventListener('click', () => setRoute('home'));

/* =========================================================
   RENDER
   ========================================================= */
function render() {
  $$('.tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === route.view || (route.view === 'day' && b.dataset.tab === 'home')));
  const back = $('#backBtn');
  back.classList.toggle('show', route.view === 'day');

  const titleEl = $('#topTitle'), subEl = $('#topSub');
  const main = $('#main');
  main.innerHTML = '';

  if (route.view === 'home') {
    titleEl.textContent = 'الخطة الأسبوعية';
    subEl.textContent = 'Your 7-day training tracker';
    main.appendChild(renderHome());
  } else if (route.view === 'day') {
    const day = DAYS.find(d => d.id === route.dayId);
    titleEl.textContent = day.nameEn;
    subEl.textContent = day.tag;
    main.appendChild(renderDay(day));
  } else if (route.view === 'warmup') {
    titleEl.textContent = 'Warm-up'; subEl.textContent = 'الإحماء';
    main.appendChild(renderInfo(WARMUP_INFO));
  } else if (route.view === 'mobility') {
    titleEl.textContent = 'Mobility'; subEl.textContent = 'المرونة والحركة';
    main.appendChild(renderInfo(MOBILITY_INFO));
  } else if (route.view === 'cooldown') {
    titleEl.textContent = 'Cool-down'; subEl.textContent = 'التربيد';
    main.appendChild(renderInfo(COOLDOWN_INFO));
  }
}

function dayProgress(day) {
  let total = 0, done = 0;
  day.blocks.forEach((b, bi) => {
    if (b.type === 'resistance' || b.type === 'isometric') {
      for (let s = 0; s < b.sets; s++) {
        total++;
        if (store(setKey(day.id, bi, s))) done++;
      }
    } else if (b.type === 'circuit') {
      total += b.items.length;
      if (store(circuitDoneKey(day.id, bi))) done += b.items.length;
    }
  });
  return { done, total };
}

function renderHome() {
  const wrap = document.createElement('div');
  wrap.className = 'view active';

  wrap.innerHTML = `
    <div class="hero">
      <div class="kicker">7-DAY SPLIT · UPPER / LOWER / CORE+HIP / HIIT</div>
      <h1>This Week's Plan</h1>
      <p>Tap a day to open it. Each move has a timer or checklist and a video demo you can preview right here.</p>
    </div>
    <div class="legend">
      <div class="item"><span class="dot" style="background:var(--upper)"></span>Upper</div>
      <div class="item"><span class="dot" style="background:var(--lower)"></span>Lower</div>
      <div class="item"><span class="dot" style="background:var(--core)"></span>Core + Hip</div>
      <div class="item"><span class="dot" style="background:var(--hiit)"></span>HIIT / Cardio</div>
    </div>
    <div class="day-grid" id="dayGrid"></div>
    <div class="quicklinks">
      <button data-go="warmup">🔥 Warm-up guide</button>
      <button data-go="mobility">🤸 Mobility</button>
      <button data-go="cooldown">🧊 Cool-down guide</button>
    </div>
    <footer class="note">Weekly cycle repeats every week, Sun → Sat.<br>Pick a weight where the last 2–3 reps feel hard.</footer>
  `;

  const grid = $('#dayGrid', wrap);
  DAYS.forEach(day => {
    const p = dayProgress(day);
    const card = document.createElement('button');
    card.className = 'day-card';
    card.innerHTML = `
      <div class="daynum" style="background:var(--${day.color}-dim);color:var(--${day.color})">${day.nameEn.slice(0, 3).toUpperCase()}</div>
      <div class="info">
        <div class="dayname">${day.nameEn}<span class="ar">${day.nameAr}</span></div>
        <span class="tag" style="background:var(--${day.color}-dim);color:var(--${day.color})">${day.tag}</span>
        <div class="progress-pill">${p.done}/${p.total} done today</div>
      </div>
      <div class="chev">›</div>
    `;
    card.addEventListener('click', () => setRoute('day', day.id));
    grid.appendChild(card);
  });

  $$('[data-go]', wrap).forEach(b => b.addEventListener('click', () => setRoute(b.dataset.go)));

  return wrap;
}

function renderDay(day) {
  const wrap = document.createElement('div');
  wrap.className = 'view active';

  const p = dayProgress(day);
  wrap.innerHTML = `
    <div class="day-hero" style="background:var(--${day.color}-dim);border-color:var(--${day.color})">
      <span class="tag" style="background:rgba(0,0,0,.25);color:var(--${day.color})">${day.tag} · ${day.tagAr}</span>
      <h2>${day.nameEn} <span style="font-weight:400;color:var(--text-dim)">${day.nameAr}</span></h2>
      <div class="ar">${p.done}/${p.total} exercises checked off today</div>
      <button class="reset" id="resetDay">Reset today's progress</button>
    </div>

    <div class="section-label"><span>🔥 Warm-up</span><span class="line"></span></div>
    <div class="info-card">
      <div>${day.warmup.en}</div>
      <div class="ar" style="margin-top:6px">${day.warmup.ar}</div>
    </div>

    <div class="section-label"><span>💪 Workout</span><span class="line"></span></div>
    <div id="blocksWrap"></div>

    <div class="section-label"><span>🧊 Cool-down</span><span class="line"></span></div>
    <div class="info-card">
      <div>${day.cooldown.en}</div>
      <div class="ar" style="margin-top:6px">${day.cooldown.ar}</div>
    </div>
  `;

  const blocksWrap = $('#blocksWrap', wrap);
  day.blocks.forEach((b, bi) => {
    if (b.type === 'resistance') blocksWrap.appendChild(renderResistance(day, b, bi));
    else if (b.type === 'isometric') blocksWrap.appendChild(renderIsometric(day, b, bi));
    else if (b.type === 'circuit') blocksWrap.appendChild(renderCircuit(day, b, bi));
  });

  $('#resetDay', wrap).addEventListener('click', () => {
    day.blocks.forEach((b, bi) => {
      if (b.type === 'resistance' || b.type === 'isometric') {
        for (let s = 0; s < b.sets; s++) localStorage.removeItem(setKey(day.id, bi, s));
      } else if (b.type === 'circuit') {
        localStorage.removeItem(circuitDoneKey(day.id, bi));
      }
    });
    render();
  });

  return wrap;
}

/* ---------- storage keys ---------- */
const setKey = (dayId, bi, si) => `wk_${dayId}_${bi}_set${si}_${todayKey()}`;
const circuitDoneKey = (dayId, bi) => `wk_${dayId}_${bi}_circuitdone_${todayKey()}`;

/* ---------- video embed block ---------- */
function videoBlock(vid) {
  const div = document.createElement('div');
  div.className = 'video-wrap';
  div.innerHTML = `
    <img loading="lazy" src="https://i.ytimg.com/vi/${vid}/hqdefault.jpg" alt="Video preview">
    <div class="playbtn">
      <div class="circle"><svg width="18" height="18" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="#111"/></svg></div>
    </div>
    <span class="yt-label">▶ Watch demo</span>
  `;
  div.querySelector('.playbtn').addEventListener('click', (e) => {
    e.stopPropagation();
    div.innerHTML = `<iframe src="https://www.youtube.com/embed/${vid}?autoplay=1&rel=0" title="Exercise demo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
  });
  return div;
}

/* ---------- exercise header (shared) ---------- */
function exerciseCard(headHtml, isDoneFn) {
  const card = document.createElement('div');
  card.className = 'ex-card';
  const head = document.createElement('div');
  head.className = 'ex-head';
  head.innerHTML = headHtml;
  head.addEventListener('click', () => card.classList.toggle('open'));
  card.appendChild(head);
  return { card, head };
}

/* ---------- RESISTANCE block ---------- */
function renderResistance(day, b, bi) {
  const doneCount = () => { let c = 0; for (let s = 0; s < b.sets; s++) if (store(setKey(day.id, bi, s))) c++; return c; };

  const { card, head } = exerciseCard(`
    <div class="checkmark ${doneCount() === b.sets ? 'done' : ''}">✓</div>
    <div class="names">
      <div class="en">${b.en}</div>
      <div class="arname ar">${b.ar}</div>
      <div class="meta">${b.sets} sets × ${b.reps} reps${b.note ? ' · ' + b.note : ''} · rest ${b.rest}s</div>
    </div>
    <div class="expand-ic">▾</div>
  `);

  const body = document.createElement('div');
  body.className = 'ex-body';
  body.appendChild(videoBlock(b.vid));

  const restLine = document.createElement('div');
  restLine.className = 'hint';
  restLine.textContent = `Tap a set once you complete it. A ${b.rest}s rest timer starts automatically.`;
  body.appendChild(restLine);

  const restTimerEl = document.createElement('div');
  restTimerEl.className = 'timerbox';
  restTimerEl.style.display = 'none';
  restTimerEl.innerHTML = `
    <div class="phase">Rest</div>
    <div class="big">--:--</div>
    <div class="controls">
      <button class="btn-reset">Skip rest</button>
    </div>
  `;
  const restBigEl = restTimerEl.querySelector('.big');
  const restSkipBtn = restTimerEl.querySelector('.btn-reset');
  body.appendChild(restTimerEl);

  for (let s = 0; s < b.sets; s++) {
    const row = document.createElement('div');
    row.className = 'set-row';
    row.innerHTML = `
      <div class="setbox ${store(setKey(day.id, bi, s)) ? 'done' : ''}">${s + 1}</div>
      <div class="setlabel">Set ${s + 1} — ${b.reps} reps${b.note ? ' (' + b.note + ')' : ''}</div>
    `;
    const box = row.querySelector('.setbox');
    box.addEventListener('click', () => {
      const nowDone = !store(setKey(day.id, bi, s));
      store(setKey(day.id, bi, s), nowDone);
      box.classList.toggle('done', nowDone);
      head.querySelector('.checkmark').classList.toggle('done', doneCount() === b.sets);
      updateHomeBadgeSoon();
      if (nowDone && s < b.sets - 1) startRestTimer(restTimerEl, restBigEl, restSkipBtn, b.rest);
    });
    body.appendChild(row);
  }

  card.appendChild(body);
  return card;
}

function startRestTimer(container, bigEl, skipBtn, seconds) {
  container.style.display = 'block';
  let remaining = seconds;
  if (bigEl) bigEl.textContent = fmtTime(remaining);
  beepStart();
  clearInterval(container._t);
  container._t = setInterval(() => {
    remaining--;
    if (bigEl) bigEl.textContent = fmtTime(remaining);
    if (remaining <= 0) {
      clearInterval(container._t);
      beepEnd();
      container.style.display = 'none';
    }
  }, 1000);
  if (skipBtn) skipBtn.onclick = () => {
    clearInterval(container._t);
    container.style.display = 'none';
  };
}

/* ---------- ISOMETRIC block (hold timer) ---------- */
function renderIsometric(day, b, bi) {
  const doneCount = () => { let c = 0; for (let s = 0; s < b.sets; s++) if (store(setKey(day.id, bi, s))) c++; return c; };

  const { card, head } = exerciseCard(`
    <div class="checkmark ${doneCount() === b.sets ? 'done' : ''}">✓</div>
    <div class="names">
      <div class="en">${b.en}</div>
      <div class="arname ar">${b.ar}</div>
      <div class="meta">${b.sets} holds × ${b.hold}s${b.note ? ' · ' + b.note : ''} · rest ${b.rest}s</div>
    </div>
    <div class="expand-ic">▾</div>
  `);

  const body = document.createElement('div');
  body.className = 'ex-body';
  body.appendChild(videoBlock(b.vid));

  const timerBox = document.createElement('div');
  timerBox.className = 'timerbox';
  timerBox.innerHTML = `
    <div class="phase">Ready</div>
    <div class="big">${fmtTime(b.hold)}</div>
    <div class="progress-txt">Hold ${1} of ${b.sets}</div>
    <div class="controls">
      <button class="btn-start">Start</button>
      <button class="btn-reset">Reset</button>
    </div>
  `;
  body.appendChild(timerBox);

  const hint = document.createElement('div');
  hint.className = 'hint';
  hint.textContent = `Runs through all ${b.sets} holds automatically with rest between. Sets are marked complete as you go.`;
  body.appendChild(hint);

  let state = { holdIdx: 0, phase: 'hold', remaining: b.hold, running: false, timer: null };

  const phaseEl = () => timerBox.querySelector('.phase');
  const bigEl = () => timerBox.querySelector('.big');
  const progEl = () => timerBox.querySelector('.progress-txt');
  const startBtn = () => timerBox.querySelector('.btn-start');
  const resetBtn = () => timerBox.querySelector('.btn-reset');

  function tick() {
    state.remaining--;
    bigEl().textContent = fmtTime(state.remaining);
    if (state.remaining <= 0) {
      if (state.phase === 'hold') {
        beepEnd();
        store(setKey(day.id, bi, state.holdIdx), true);
        head.querySelector('.checkmark').classList.toggle('done', doneCount() === b.sets);
        updateHomeBadgeSoon();
        state.holdIdx++;
        if (state.holdIdx >= b.sets) {
          clearInterval(state.timer);
          state.running = false;
          beepDone();
          phaseEl().textContent = 'Done! 🎉';
          progEl().textContent = `${b.sets} of ${b.sets} complete`;
          startBtn().textContent = 'Restart';
          return;
        }
        state.phase = 'rest';
        state.remaining = b.rest;
        phaseEl().textContent = 'Rest';
        progEl().textContent = `Hold ${state.holdIdx + 1} of ${b.sets} next`;
      } else {
        beepStart();
        state.phase = 'hold';
        state.remaining = b.hold;
        phaseEl().textContent = 'Hold!';
        progEl().textContent = `Hold ${state.holdIdx + 1} of ${b.sets}`;
      }
    }
  }

  startBtn().addEventListener('click', () => {
    if (state.running) {
      clearInterval(state.timer);
      state.running = false;
      startBtn().textContent = 'Resume';
      return;
    }
    if (startBtn().textContent === 'Restart') {
      state = { holdIdx: 0, phase: 'hold', remaining: b.hold, running: false, timer: null };
      bigEl().textContent = fmtTime(b.hold);
      progEl().textContent = `Hold 1 of ${b.sets}`;
    }
    state.running = true;
    phaseEl().textContent = state.phase === 'hold' ? 'Hold!' : 'Rest';
    startBtn().textContent = 'Pause';
    beepStart();
    state.timer = setInterval(tick, 1000);
  });

  resetBtn().addEventListener('click', () => {
    clearInterval(state.timer);
    state = { holdIdx: 0, phase: 'hold', remaining: b.hold, running: false, timer: null };
    bigEl().textContent = fmtTime(b.hold);
    phaseEl().textContent = 'Ready';
    progEl().textContent = `Hold 1 of ${b.sets}`;
    startBtn().textContent = 'Start';
  });

  card.appendChild(body);
  return card;
}

/* ---------- CIRCUIT block (HIIT) ---------- */
function renderCircuit(day, b, bi) {
  const isDone = () => !!store(circuitDoneKey(day.id, bi));

  const { card, head } = exerciseCard(`
    <div class="checkmark ${isDone() ? 'done' : ''}">✓</div>
    <div class="names">
      <div class="en">${b.en}</div>
      <div class="arname ar">${b.ar}</div>
      <div class="meta">${b.rounds} rounds · ${b.items.length} moves · work ${b.work}s / rest ${b.rest}s</div>
    </div>
    <div class="expand-ic">▾</div>
  `);

  const body = document.createElement('div');
  body.className = 'ex-body';

  const list = document.createElement('div');
  list.className = 'hint';
  list.innerHTML = '<strong style="color:var(--text-dim)">Sequence</strong><br>' +
    b.items.map((it, i) => `${i + 1}. ${it.en} <span class="ar">— ${it.ar}</span>`).join('<br>');
  body.appendChild(list);

  const timerBox = document.createElement('div');
  timerBox.className = 'timerbox';
  timerBox.innerHTML = `
    <div class="phase">Ready</div>
    <div class="big">${fmtTime(b.work)}</div>
    <div class="cur-ex"></div>
    <div class="progress-txt">Round 1 of ${b.rounds}</div>
    <div class="controls">
      <button class="btn-start">Start Circuit</button>
      <button class="btn-reset">Reset</button>
    </div>
  `;
  body.appendChild(timerBox);

  const vidHolder = document.createElement('div');
  body.appendChild(vidHolder);
  function showVid(i) {
    vidHolder.innerHTML = '';
    vidHolder.appendChild(videoBlock(b.items[i].vid));
  }
  showVid(0);

  let state = { round: 1, exIdx: 0, phase: 'work', remaining: b.work, running: false, timer: null };
  const phaseEl = () => timerBox.querySelector('.phase');
  const bigEl = () => timerBox.querySelector('.big');
  const curEl = () => timerBox.querySelector('.cur-ex');
  const progEl = () => timerBox.querySelector('.progress-txt');
  const startBtn = () => timerBox.querySelector('.btn-start');
  const resetBtn = () => timerBox.querySelector('.btn-reset');

  function refreshLabels() {
    curEl().textContent = state.phase === 'work' ? `${b.items[state.exIdx].en}` : `Next: ${b.items[(state.exIdx + 1) % b.items.length].en}`;
    progEl().textContent = `Round ${state.round} of ${b.rounds} · move ${state.exIdx + 1}/${b.items.length}`;
  }

  function tick() {
    state.remaining--;
    bigEl().textContent = fmtTime(state.remaining);
    if (state.remaining <= 0) {
      if (state.phase === 'work') {
        beepEnd();
        state.phase = 'rest';
        state.remaining = b.rest;
        phaseEl().textContent = 'Rest';
      } else {
        state.exIdx++;
        if (state.exIdx >= b.items.length) {
          state.exIdx = 0;
          state.round++;
        }
        if (state.round > b.rounds) {
          clearInterval(state.timer);
          state.running = false;
          beepDone();
          phaseEl().textContent = 'Circuit complete! 🎉';
          curEl().textContent = '';
          progEl().textContent = `${b.rounds} of ${b.rounds} rounds done`;
          startBtn().textContent = 'Restart';
          store(circuitDoneKey(day.id, bi), true);
          head.querySelector('.checkmark').classList.add('done');
          updateHomeBadgeSoon();
          return;
        }
        beepStart();
        state.phase = 'work';
        state.remaining = b.work;
        phaseEl().textContent = 'Go!';
        showVid(state.exIdx);
      }
      refreshLabels();
    }
  }

  startBtn().addEventListener('click', () => {
    if (state.running) {
      clearInterval(state.timer);
      state.running = false;
      startBtn().textContent = 'Resume';
      return;
    }
    if (startBtn().textContent === 'Restart') {
      state = { round: 1, exIdx: 0, phase: 'work', remaining: b.work, running: false, timer: null };
      bigEl().textContent = fmtTime(b.work);
      showVid(0);
    }
    state.running = true;
    phaseEl().textContent = state.phase === 'work' ? 'Go!' : 'Rest';
    refreshLabels();
    startBtn().textContent = 'Pause';
    beepStart();
    state.timer = setInterval(tick, 1000);
  });

  resetBtn().addEventListener('click', () => {
    clearInterval(state.timer);
    state = { round: 1, exIdx: 0, phase: 'work', remaining: b.work, running: false, timer: null };
    bigEl().textContent = fmtTime(b.work);
    phaseEl().textContent = 'Ready';
    curEl().textContent = '';
    progEl().textContent = `Round 1 of ${b.rounds}`;
    startBtn().textContent = 'Start Circuit';
    showVid(0);
  });

  card.appendChild(body);
  return card;
}

function updateHomeBadgeSoon() { /* progress pills recompute on next home render */ }

/* ---------- Info pages ---------- */
function renderInfo(info) {
  const wrap = document.createElement('div');
  wrap.className = 'view active';
  wrap.innerHTML = `
    <div class="info-hero">
      <div class="badge">${info.ar}</div>
      <h2>${info.title}</h2>
      <p>${info.blurb}</p>
    </div>
  `;
  info.videos.forEach(v => {
    const card = document.createElement('div');
    card.className = 'info-card';
    card.innerHTML = `<h3>${v.en}</h3><div class="ar">${v.ar}</div>`;
    card.appendChild(videoBlock(v.vid));
    const tips = document.createElement('ul');
    tips.className = 'tips';
    v.tips.forEach(t => { const li = document.createElement('li'); li.textContent = t; tips.appendChild(li); });
    card.appendChild(tips);
    wrap.appendChild(card);
  });
  return wrap;
}

/* ---------- init ---------- */
render();
