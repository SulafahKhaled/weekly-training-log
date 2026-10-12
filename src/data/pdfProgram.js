/* =========================================================
   Source: برنامج المرونة والحركة وفنون العصا (12-week flexibility,
   mobility, yoga, fascia-release, breathing & stick-drill program, PDF,
   8 pages). This file is the app's ONLY source of mobility content.

   - `ar`   : the PDF's exercise name, verbatim (the PDF itself keeps some
              names in English, e.g. "Hip CARs" — copied as printed).
   - `how`  : the PDF's "الطريقة" (cue) column, verbatim.
   - `dose` : the PDF's "الجرعة / المدة" column, verbatim.
   - `en`   : English name (added; the Atlas artifact's own English name
              when the exercise exists there).
   - `atlas`: the matching Atlas exercise id, where there is one (gives the
              muscle map). Items with no Atlas twin carry `muscles` directly.
   Structured fields (type / sets / reps / seconds / rest / perSide) are a
   machine-readable reading of `dose`, used by the timers and the log. The
   verbatim `dose` string is always shown next to them. `rest` is not in the
   PDF; the 10 s used between holds / sides is an editable default.
   ========================================================= */

export const PDF_SOURCE = 'برنامج المرونة والحركة وفنون العصا';

const REST = 10; // editable default between holds / sides (not specified by the PDF)

function mk(id, en, ar, how, dose, spec) {
  return { id, en, ar, how, dose, source: 'pdf', ...spec };
}

/* ---------- Mobility A: hips & legs (الجلسة A: الورك والرجلين) ---------- */
export const MOBILITY_A = [
  mk('hip_cars', 'Hip CARs', 'Hip CARs', 'واقفة مستندة على جدار، ارفعي الركبة وارسمي أكبر دائرة بالورك بدون أن يتحرك الحوض', '3 لكل اتجاه، لكل رجل', { type: 'reps', sets: 1, reps: 3, perSide: true, rest: 0 }),
  mk('ankle_wall', 'Ankle: knee to wall', 'الكاحل: الركبة للجدار', 'القدم بعيدة عن الجدار، ادفعي الركبة للمس الجدار والكعب لاصق بالأرض', '10 لكل رجل', { type: 'reps', sets: 1, reps: 10, perSide: true, rest: 0 }),
  mk('ninety_ninety', '90/90 with transitions', '90/90 مع التبديل', 'جالسة، رجل أمامية وأخرى جانبية بزاوية 90. بدلي الجهة بدون استخدام اليدين متى ما قدرتي', '8 تبديلات + ثبات 30ث لكل جهة', { type: 'reps', sets: 1, reps: 8, rest: 0 }),
  mk('frog_rock', 'Frog rock', 'الضفدع المتأرجح (Frog rock)', 'على الأربع، الركب مفتوحة على وسائد، تأرجحي للخلف ببطء', '10 مرات + ثبات 30ث', { type: 'reps', sets: 1, reps: 10, rest: 0 }),
  mk('couch_stretch', 'Couch stretch', 'Couch stretch', 'ركبة على وسادة والقدم مرفوعة على الكنبة أو الجدار، شدي الأرداف', '60ث لكل رجل', { type: 'hold', sets: 1, seconds: 60, perSide: true, rest: REST }),
  mk('strap_hamstring', 'Hamstring lengthening with strap', 'إطالة خلف الفخذ بالحزام', 'على الظهر، الحزام حول القدم، ثم اضغطي بالرجل ضد الحزام 10 ثوان واسترخي وخذي مدى أكبر', '45ث + 2 انقباض لكل رجل', { type: 'hold', sets: 1, seconds: 45, perSide: true, rest: REST }),
  mk('cossack_shift', 'Cossack shift', 'Cossack shift', 'الرجلان مفتوحتان جدا، انقلي الوزن من جهة لجهة ممسكة بكرسي', '8 لكل جهة', { type: 'reps', sets: 1, reps: 8, perSide: true, rest: 0 }),
  mk('deep_squat_sit', 'Deep squat sit', 'جلسة القرفصاء العميقة', 'ممسكة بإطار باب أو عمود، الكعبان على الأرض (أو على كتاب في البداية)', '2 × 60ث', { type: 'hold', sets: 2, seconds: 60, rest: REST }),
];

/* ---------- Mobility B: shoulders, thoracic spine, wrist ---------- */
export const MOBILITY_B = [
  mk('shoulder_cars', 'Shoulder CARs', 'Shoulder CARs', 'الذراع مستقيمة، أكبر دائرة ممكنة والجذع ثابت', '3 لكل اتجاه لكل ذراع', { type: 'reps', sets: 1, reps: 3, perSide: true, rest: 0 }),
  mk('pass_throughs', 'Stick pass-throughs', 'تمرير العصا فوق الرأس (Pass-throughs)', 'امسكي العصا بقبضة واسعة ومرريها من الأمام للخلف. ضيقي القبضة شهريا.', '10 مرات', { type: 'reps', sets: 1, reps: 10, rest: 0 }),
  mk('open_book', 'Open book', 'الكتاب المفتوح (Open book)', 'على الجنب، الركب مثنية، افتحي الذراع العلوية للجهة الثانية مع النظر لليد', '8 لكل جهة', { type: 'reps', sets: 1, reps: 8, perSide: true, rest: 0 }),
  mk('thread_needle', 'Thread the needle', 'Thread the needle', 'على الأربع، مرري الذراع تحت الجسم ثم افتحيها للسماء', '8 لكل جهة', { type: 'reps', sets: 1, reps: 8, perSide: true, rest: 0 }),
  mk('wall_slides', 'Wall slides', 'Wall slides', 'الظهر والذراعان على الجدار بشكل W، اسحبيها لأعلى بدون أن تتركي الجدار', '2 × 10', { type: 'reps', sets: 2, reps: 10, rest: REST }),
  mk('doorway_chest', 'Doorway chest stretch', 'إطالة الصدر بالباب', 'الساعد على إطار الباب بزاوية 90، امشي خطوة للأمام', '45ث لكل جهة', { type: 'hold', sets: 1, seconds: 45, perSide: true, rest: REST }),
  mk('prone_ytw', 'Prone Y-T-W', 'Prone Y-T-W', 'على البطن، ارفعي الذراعين بأشكال Y ثم T ثم W وثبتي 3 ثوان', '6 لكل شكل', { type: 'reps', sets: 1, reps: 6, rest: 0 }),
  mk('wrist_prep', 'Wrist prep', 'تحضير المعصم', 'دوائر المعصم + إطالة الأصابع للخلف وللأمام على الأرض', '60ث', { type: 'hold', sets: 1, seconds: 60, rest: 0 }),
];

/* ---------- Mobility C: spine & floor movement ---------- */
export const MOBILITY_C = [
  mk('cat_cow', 'Cat-cow, segmental', 'القطة والبقرة المفصلية', 'على الأربع، حركي العمود فقرة فقرة من الحوض للرقبة', '8 مرات بطيئة', { type: 'reps', sets: 1, reps: 8, rest: 0 }),
  mk('side_bend', 'Standing side bend with stick', 'الانحناء الجانبي واقفة', 'العصا فوق الرأس، انحني جانبا مع زفير طويل', '30ث لكل جهة', { type: 'hold', sets: 1, seconds: 30, perSide: true, rest: REST }),
  mk('stick_rotation', 'Stick behind the neck rotation', 'الدوران بالعصا على الأكتاف', 'العصا خلف الرقبة، دوّري الجذع والحوض ثابت', '10 لكل جهة', { type: 'reps', sets: 1, reps: 10, perSide: true, rest: 0 }),
  mk('beast_reach', 'Beast reach', 'الوحش والمد (Beast reach)', 'وضعية الأربع مع رفع الركب قليلا، امدي ذراعا للأمام بالتبادل', '3 × 20ث', { type: 'hold', sets: 3, seconds: 20, rest: REST }),
  mk('bear_crawl', 'Bear crawl', 'مشي الدب (Bear crawl)', '4 خطوات للأمام و4 للخلف، الركب قريبة من الأرض', '3 مرات', { type: 'reps', sets: 3, reps: 1, rest: REST }),
  mk('crab_reach', 'Crab reach', 'مد السلطعون (Crab reach)', 'جالسة، اليدان خلفك، ارفعي الحوض وامدي ذراعا فوق الرأس', '5 لكل جهة', { type: 'reps', sets: 1, reps: 5, perSide: true, rest: 0 }),
  mk('getup_no_hands', 'Get-up without hands', 'القيام من الأرض بدون يدين', 'من الجلوس للوقوف بأقل عدد نقاط ارتكاز. ابدئي بيد واحدة', '5 مرات', { type: 'reps', sets: 1, reps: 5, rest: 0 }),
  mk('childs_pose', "Child's pose with breathing", 'وضعية الطفل مع التنفس', 'الركب مفتوحة، تنفسي في أسفل الظهر', '60ث', { type: 'hold', sets: 1, seconds: 60, rest: 0 }),
];

/* ---------- Long yoga session (Wednesday, 40 min): 8 sections ---------- */
// `poses` is the PDF's "الوضعيات" column; `dose` is its "المدة" column. `atlas` lists the Atlas
// pose exercises each section is made of, so the section inherits their muscle map.
export const YOGA = [
  mk('yoga_1', '1. Opening', '1. البداية', 'وضعية الطفل (الركب مفتوحة)، القطة والبقرة، الكلب المتجه للأسفل (الركب مثنية والكعبان مرفوعان)', '5 د', { type: 'hold', sets: 1, seconds: 300, rest: 0, atlas: ['childs_pose', 'cat_cow', 'downward_dog'] }),
  mk('yoga_2', '2. Modified sun salutation', '2. تحية الشمس المعدلة', 'رفع الذراعين، انحناء للأمام مع اليدين على البلوكات، اندفاع للخلف (lunge)، الكلب للأسفل، الكوبرا المنخفضة، ثم الرجوع', '4 جولات، 6 د', { type: 'hold', sets: 1, seconds: 360, rest: 0, atlas: ['sun_salutation'] }),
  mk('yoga_3', '3. Standing poses', '3. الوضعيات الواقفة', 'المحارب 2 ← الزاوية الجانبية الممتدة ← المثلث (اليد على بلوك)، ثم الجهة الثانية', '8 د', { type: 'hold', sets: 1, seconds: 480, rest: 0, atlas: ['warrior2', 'side_angle', 'triangle'] }),
  mk('yoga_4', '4. Deep hips', '4. الورك العميق', 'الاندفاع المنخفض ← السحلية (Lizard) باليدين على بلوكات ← الهرم (Pyramid) لخلف الفخذ، كل جهة', '60ث لكل وضعية، 6 د', { type: 'hold', sets: 1, seconds: 360, rest: 0, atlas: ['lizard_pyramid'] }),
  mk('yoga_5', '5. Pigeon', '5. الحمامة', 'نصف حمامة مع وسادة تحت الورك، أو وضعية الرقم 4 على الظهر إذا حسيتي بضغط في الركبة', '90ث لكل جهة', { type: 'hold', sets: 1, seconds: 90, perSide: true, rest: REST, atlas: ['pigeon'] }),
  mk('yoga_6', '6. Seated', '6. الجلوس', 'الفراشة (Bound angle) ← الفتح الواسع جالسة مع الانحناء للأمام على بلوكات', '90ث لكل واحدة', { type: 'hold', sets: 2, seconds: 90, rest: REST, atlas: ['bound_angle'] }),
  mk('yoga_7', '7. Back', '7. الظهر', 'الجسر المدعوم (بلوك تحت العجز)، الطفل السعيد (Happy baby)، اللفة على الظهر', '60ث لكل واحدة', { type: 'hold', sets: 3, seconds: 60, rest: REST, atlas: ['supported_bridge', 'happy_baby', 'supine_twist'] }),
  mk('yoga_8', '8. Closing', '8. الختام', 'الأرجل على الجدار ← استلقاء كامل (Savasana) مع زفير ضعف الشهيق', '5 د', { type: 'hold', sets: 1, seconds: 300, rest: 0, muscles: { primary: [], secondary: [] } }),
];
export const YOGA_PROGRESSION = 'التقدم بعد الأسبوع 6: ارفعي مدة الوضعيات العميقة إلى 2 دقيقة، وأضيفي الانقسام الأمامي المدعوم على بلوكين (نصف انقسام ← انزلاق بطيء) بعد الحمامة.';

/* ---------- Fascia release (10 minutes, Tue + Fri): 9 areas ---------- */
export const FASCIA = [
  mk('roll_foot', 'Roll: sole of the foot (ball)', 'باطن القدم', 'واقفة، دحرجي الكرة من الكعب للأصابع', '60ث لكل قدم', { type: 'hold', sets: 1, seconds: 60, perSide: true, rest: 0, tool: 'كرة' }),
  mk('roll_calf', 'Roll: calf (roller)', 'السمانة', 'جالسة، رجل فوق الثانية لزيادة الضغط', '60ث لكل رجل', { type: 'hold', sets: 1, seconds: 60, perSide: true, rest: 0, tool: 'رولر' }),
  mk('roll_quad', 'Roll: front of the thigh (roller)', 'مقدمة الفخذ', 'على البطن بالساعدين، رجل واحدة في كل مرة', '60ث لكل رجل', { type: 'hold', sets: 1, seconds: 60, perSide: true, rest: 0, tool: 'رولر' }),
  mk('roll_outer_thigh', 'Roll: outer thigh (roller)', 'جانب الفخذ', 'العضلة الجانبية الأمامية (وليس العظم الجانبي)، بدون ضغط مؤلم', '45ث لكل رجل', { type: 'hold', sets: 1, seconds: 45, perSide: true, rest: 0, tool: 'رولر' }),
  mk('roll_inner_thigh', 'Roll: inner thigh (roller)', 'الفخذ الداخلي', 'على البطن، الركبة مثنية للجانب والرولر تحت الفخذ الداخلي', '60ث لكل رجل', { type: 'hold', sets: 1, seconds: 60, perSide: true, rest: 0, tool: 'رولر' }),
  mk('roll_glutes', 'Roll: glutes (ball against wall)', 'الأرداف', 'الكرة بين الأرداف والجدار، تحكمي بالضغط بالميل', '60ث لكل جهة', { type: 'hold', sets: 1, seconds: 60, perSide: true, rest: 0, tool: 'كرة على الجدار' }),
  mk('roll_upper_back', 'Roll: upper back (roller)', 'الظهر الصدري', 'على الظهر، اليدان خلف الرأس، من أسفل اللوح لأعلى الظهر فقط', '60ث', { type: 'hold', sets: 1, seconds: 60, rest: 0, tool: 'رولر' }),
  mk('roll_lats', 'Roll: lats (roller)', 'الظهرية (Lats)', 'على الجنب، الذراع ممدودة فوق الرأس', '45ث لكل جهة', { type: 'hold', sets: 1, seconds: 45, perSide: true, rest: 0, tool: 'رولر' }),
  mk('roll_chest', 'Roll: chest (ball against wall)', 'الصدر', 'الكرة تحت الترقوة باتجاه الكتف، حركي الذراع ببطء', '45ث لكل جهة', { type: 'hold', sets: 1, seconds: 45, perSide: true, rest: 0, tool: 'كرة على الجدار' }),
];
export const FASCIA_RULES = 'القواعد: حركة بطيئة (2 سم في الثانية)، ووقفة 20 ثانية على النقطة المؤلمة مع التنفس، والألم لا يتجاوز 5 من 10. لا تضغطي على العظام، ولا المفاصل، ولا أسفل الظهر، ولا مقدمة الرقبة. إذا كان النزول للأرض متعبا، استخدمي الكرة على الجدار بدل الرولر.';

/* ---------- Breathing ---------- */
export const BREATH_MORNING = [
  mk('breath_crocodile', 'Crocodile breathing', 'تنفس التمساح (Crocodile breathing)', 'على بطنك، الجبين على اليدين. شهيق 4 ثوانٍ من الأنف بحيث يرتفع أسفل الظهر وجوانب الخصر، زفير 6 ثوانٍ', '2 دقيقة', { type: 'hold', sets: 1, seconds: 120, rest: 0, muscles: { primary: [], secondary: [] } }),
  mk('breath_9090', '90/90 wall breathing', 'تنفس 90/90 على الجدار', 'على ظهرك، القدمان على الجدار والركب 90 درجة. اسحبي القدمين للجدار بلطف وازفري كل الهواء حتى تنزل الأضلاع', '5 أنفاس بطيئة', { type: 'reps', sets: 1, reps: 5, rest: 0, muscles: { primary: [], secondary: [] } }),
  mk('breath_box', 'Box breathing', 'تنفس الصندوق (Box breathing)', 'شهيق 4، حبس 4، زفير 4، حبس 4', '2 دقيقة', { type: 'hold', sets: 1, seconds: 120, rest: 0, muscles: { primary: [], secondary: [] } }),
];
export const BREATH_NIGHT = [
  mk('breath_legs_up', 'Legs up the wall, 4-in / 8-out breathing', 'الأرجل على الجدار (Legs up the wall)', 'مع شهيق 4 ثوانٍ وزفير 8 ثوانٍ. الزفير الأطول من الشهيق يهدئ القلب.', '5 دقائق', { type: 'hold', sets: 1, seconds: 300, rest: 0, muscles: { primary: [], secondary: [] } }),
];
export const BREATH_NOTES = {
  intro: 'التنفس من الحجاب الحاجز يرخي الجهاز العصبي فيسمح بمدى أكبر، والمقاتل يحتاج يتحكم في نفسه تحت الضغط. 5 دقائق صباحا وخمس قبل النوم.',
  fighting: 'تنفس القتال (أثناء تمارين العصا): زفير قصير حاد من الفم ("تسس") مع كل ضربة، مع شد البطن لحظة الضربة، وشهيق من الأنف بين الضربات. هذا يزيد القوة ويمنع حبس النفس.',
  dizzy: 'إذا حسيتي بدوخة في أي تمرين تنفس، ارجعي للتنفس الطبيعي فورا.',
};

/* ---------- Stick drills (Arnis / Kali) ---------- */
export const STICK_LEVELS = {
  1: {
    title: 'المستوى 1: التحكم (الأسابيع 1 إلى 4)',
    en: 'Level 1 — Control (weeks 1–4)',
    items: [
      mk('stick_footwork', 'Footwork without a stick', 'خطوات القدمين بدون عصا', 'خطوة للأمام وللخلف بدون أن تتقاطع القدمان، ثم جانبي، ثم الالتفاف بـ 90 درجة (pivot)', '3 × 45ث', { type: 'hold', sets: 3, seconds: 45, rest: REST, level: 1 }),
      mk('figure8', 'Figure 8', 'الدوران الثماني (Figure 8)', 'العصا بيد واحدة، ارسمي رقم 8 أمامك من المعصم وليس من الكتف', '3 × 30ث لكل يد', { type: 'hold', sets: 3, seconds: 30, perSide: true, rest: REST, level: 1 }),
      mk('helicopter', 'Helicopter', 'المروحة (Helicopter)', 'العصا من الوسط باليدين، دوريها أمامك بتبادل اليدين', '3 × 30ث', { type: 'hold', sets: 3, seconds: 30, rest: REST, level: 1 }),
      mk('angles_1_5', 'Angles 1 to 5, slow', 'الزوايا 1 إلى 5 ببطء', 'كل ضربة تبدأ من الورك والقدم الخلفية، لا من الذراع', '5 جولات لكل يد', { type: 'reps', sets: 5, reps: 5, perSide: true, rest: REST, level: 1 }),
      mk('pass_around', 'Passing the stick around the body', 'تمرير العصا حول الجسم', 'من يد لأخرى خلف الظهر، ثم حول الخصر، ثم تحت الرجل', '10 دورات لكل اتجاه', { type: 'reps', sets: 1, reps: 10, perSide: true, rest: 0, level: 1 }),
    ],
  },
  2: {
    title: 'المستوى 2: السرعة والربط (الأسابيع 5 إلى 8)',
    en: 'Level 2 — Speed & linking (weeks 5–8)',
    items: [
      mk('strikes_move', 'Strikes with movement', 'ضربات مع حركة', 'خطوة للأمام + زاوية 1، خطوة للخلف + زاوية 2، pivot + زاوية 3', '4 × 30ث، راحة 30ث', { type: 'hold', sets: 4, seconds: 30, rest: 30, level: 2 }),
      mk('combos_3', 'Three-strike combinations', 'تركيبات 3 ضربات', '1-2-5، 3-4-1، 2-3-5 على هدف (وسادة مربوطة أو إطار قديم)', '5 × كل تركيبة', { type: 'reps', sets: 3, reps: 5, rest: REST, level: 2 }),
      mk('number_reaction', 'Number reaction', 'رد الفعل للأرقام', 'تطبيق أو شخص ينادي رقما عشوائيا من 1 إلى 5 وتضربين تلك الزاوية فورا', '3 × 60ث', { type: 'hold', sets: 3, seconds: 60, rest: REST, level: 2 }),
      mk('block_attack', 'Block then attack', 'الصد ثم الهجوم', 'صد بالعصا أفقيا أعلى الرأس أو عموديا للجانب، ثم ضربة مرتدة فورية', '3 × 10 لكل جهة', { type: 'reps', sets: 3, reps: 10, perSide: true, rest: REST, level: 2 }),
      mk('box_step', 'Box step', 'المربع (Box step)', 'ارسمي مربعا بشريط لاصق متر×متر، انتقلي بين الزوايا مع ضربة في كل زاوية', '3 × 40ث', { type: 'hold', sets: 3, seconds: 40, rest: REST, level: 2 }),
    ],
  },
  3: {
    title: 'المستوى 3: المقاتلة (الأسابيع 9 إلى 12)',
    en: 'Level 3 — Fighting (weeks 9–12)',
    items: [
      mk('shadow_fight', 'Shadow fighting with the stick', 'ملاكمة الظل بالعصا', 'خصم خيالي: حركة دائمة، تركيبات، صد، هروب بالالتفاف', '3 جولات × 2د، راحة 60ث', { type: 'hold', sets: 3, seconds: 120, rest: 60, level: 3 }),
      mk('peak_speed', 'Peak speed intervals', 'فترات السرعة القصوى', 'أكبر عدد ضربات نظيفة على الهدف (زاوية 1 و2 بالتبادل)', '6 × 20ث، راحة 40ث', { type: 'hold', sets: 6, seconds: 20, rest: 40, level: 3 }),
      mk('spin_360', '360 degree spin', 'الالتفاف 360', 'ضربة أمامية، ثم التفاف كامل بخطوتين، ثم ضربة من الجهة الثانية', '3 × 6 لكل اتجاه', { type: 'reps', sets: 3, reps: 6, perSide: true, rest: REST, level: 3 }),
      mk('drop_knee', 'Drop to a knee and stand', 'النزول والقيام بالعصا', 'انزلي على ركبة واحدة مع ضربة منخفضة، ثم قومي بسرعة إلى وضعية القتال', '3 × 8', { type: 'reps', sets: 3, reps: 8, rest: REST, level: 3 }),
      mk('weak_hand', 'Stick work with the weak hand', 'العصا باليد غير المسيطرة', 'كل تمارين المستوى 1 باليد الضعيفة فقط', '5 د', { type: 'hold', sets: 1, seconds: 300, rest: 0, level: 3 }),
    ],
  },
};
export const STICK_NOTES = {
  intro: 'التمارين مبنية على أساسيات الـ Arnis/Kali (العصا القصيرة الفلبينية) والـ Bōjutsu (العصا اليابانية الطويلة)، بدون قفز مرتفع لحماية الركب. عصا مكنسة 120 إلى 130 سم تكفي في البداية، ومساحة 2×2 متر بدون أثاث ولا ثريا قريبة.',
  stance: 'وضعية القتال الأساسية: القدمان بعرض الأكتاف، واحدة متقدمة نصف خطوة، الركب مثنية قليلا، الوزن على مقدمة القدمين، والعصا أمام الجسم ممسوكة باليدين.',
  angles: 'زوايا الضرب الخمس (نظام Arnis): 1 مائلة من أعلى اليسار لأسفل اليمين، 2 مائلة من أعلى اليمين لأسفل اليسار، 3 أفقية للخصر من اليسار، 4 أفقية من اليمين، 5 طعنة مستقيمة للأمام.',
  speedRule: 'قاعدة السرعة: بطء نظيف ثم سرعة. لا تزيدي السرعة قبل أن تكون الحركة نظيفة 10 مرات متتالية، لأن الجسم يحفظ النمط الذي تكررينه. وللوصول لمستوى مقاتلة حقيقي، الأفضل بعد الأسبوع 12 الانضمام لصف Kali أو Arnis أو Bōjutsu مع مدرب يصحح التقنية ويضيف التدريب مع شريك.',
};

/* ---------- Progress tests (fill at start / week 4 / week 8 / week 12) ---------- */
export const CHECKPOINTS = [
  { id: 'start', en: 'Start', ar: 'البداية' },
  { id: 'w4', en: 'Week 4', ar: 'أسبوع 4' },
  { id: 'w8', en: 'Week 8', ar: 'أسبوع 8' },
  { id: 'w12', en: 'Week 12', ar: 'أسبوع 12' },
];

// fields: each { key, label, kind: 'number'|'yesno', unit? }
export const PROGRESS_TESTS = [
  { id: 'reach', ar: 'الوصول للأصابع واقفة (سم)', en: 'Standing toe reach (cm)', how: 'المسافة بين الأصابع والأرض، الركب مستقيمة والقدمان بعرض الورك', fields: [{ key: 'value', label: 'cm', kind: 'number' }] },
  { id: 'deep_squat', ar: 'القرفصاء العميقة (ثانية)', en: 'Deep squat (seconds)', how: 'الكعبان على الأرض، مع سند ثم بدونه', fields: [{ key: 'supported', label: 'with support (s)', kind: 'number' }, { key: 'unsupported', label: 'without support (s)', kind: 'number' }] },
  { id: 'knee_wall', ar: 'الركبة للجدار (سم)', en: 'Knee to wall (cm)', how: 'أبعد مسافة للقدم من الجدار والركبة تلمسه (يمين / يسار)', fields: [{ key: 'right', label: 'right (cm)', kind: 'number' }, { key: 'left', label: 'left (cm)', kind: 'number' }] },
  { id: 'pass_grip', ar: 'قبضة تمرير العصا (سم)', en: 'Stick pass-through grip (cm)', how: 'أضيق مسافة بين اليدين مع تمرير نظيف (الأقل أفضل)', fields: [{ key: 'value', label: 'cm (lower is better)', kind: 'number' }] },
  { id: 'front_split', ar: 'الانقسام الأمامي (سم)', en: 'Front split (cm)', how: 'المسافة بين الحوض والأرض (يمين / يسار)', fields: [{ key: 'right', label: 'right (cm)', kind: 'number' }, { key: 'left', label: 'left (cm)', kind: 'number' }] },
  { id: 'ninety_no_hands', ar: '90/90 بدون يدين', en: '90/90 without hands', how: 'نعم / لا، وعدد التبديلات النظيفة', fields: [{ key: 'ok', label: 'managed it', kind: 'yesno' }, { key: 'clean', label: 'clean transitions', kind: 'number' }] },
  { id: 'getup', ar: 'القيام من الأرض', en: 'Get-up from the floor', how: 'عدد نقاط الارتكاز المستخدمة (الأقل أفضل)', fields: [{ key: 'value', label: 'support points (lower is better)', kind: 'number' }] },
  { id: 'strikes_30', ar: 'ضربات في 30 ثانية', en: 'Strikes in 30 seconds', how: 'زاوية 1 و2 بالتبادل، ضربات نظيفة فقط', fields: [{ key: 'value', label: 'clean strikes', kind: 'number' }] },
  { id: 'fig8_weak', ar: 'الدوران الثماني باليد الضعيفة المتواصل (ثانية)', en: 'Figure 8, weak hand, continuous (seconds)', how: 'قبل أول سقطة', fields: [{ key: 'value', label: 'seconds', kind: 'number' }] },
];
export const PROGRESS_TEST_NOTE = 'صوّري فيديو لكل اختبار من نفس الزاوية، وأرسليه مع الأرقام للتحليل.';

/* ---------- Program text ---------- */
export const PROGRAM = {
  title: 'برنامج المرونة والحركة وفنون العصا',
  subtitle: 'برنامج 12 أسبوع · موبيليتي · يوغا · فك الغشاء · تنفس · عصا للسرعة والمناورة',
  principles: [
    { label: 'الشدة', text: 'شد بدرجة 6 إلى 7 من 10. لا ألم حاد، ولا تنميل، ولا ارتداد (bouncing).' },
    { label: 'التنفس', text: 'زفير طويل وأنتِ تدخلين في الإطالة، وما تحبسين النفس أبدا.' },
    { label: 'قبل التمرين', text: 'حركة ديناميكية فقط. بعده أو في وقت منفصل: الثبات والإطالة الطويلة.' },
    { label: 'القوة في نهاية المدى', text: 'كل إطالة تنتهي بانقباض 10 ثوانٍ عند أقصى نقطة (طريقة PAILs/RAILs)، فيتحول المدى الجديد إلى مدى تتحكمين فيه.' },
    { label: 'مع الوزن الحالي', text: 'استخدمي البلوكات والوسائد تحت الركب، وافتحي الرجلين أعرض في الانحناءات الأمامية لكي يأخذ البطن مساحته، وبدّلي الوضعيات اللي تضغط على الركب بوضعيات على الظهر.' },
    { label: 'أيام الدوام الطويل (12 ساعة)', text: 'النسخة الدنيا 10 دقائق: التنفس + 3 حركات من جلسة اليوم. الاستمرار أهم من الكمال.' },
  ],
  stages: [
    'الأسابيع 1 إلى 4 (الأساس): الجلسات بالجرعات المكتوبة، ومستوى العصا 1. شرط الانتقال: جلسة القرفصاء العميقة 60 ثانية بسند، والدوران الثماني 30 ثانية بدون إسقاط العصا.',
    'الأسابيع 5 إلى 8 (العمق): الثبات في الإطالات يزيد من 30–60 إلى 60–90 ثانية، وانقباضات نهاية المدى 3 بدل 2، ومستوى العصا 2. شرط الانتقال: تبديل 90/90 بدون يدين، والتركيبات الثلاث نظيفة على الهدف.',
    'الأسابيع 9 إلى 12 (المقاتلة): إضافة الانقسام الأمامي المدعوم والجسر الكامل من الأرض (إذا كانت الأكتاف وأسفل الظهر بدون ألم)، ومستوى العصا 3.',
    'الأسبوع 13: أسبوع تخفيف بنصف الجرعات، ثم نعيد تصميم المرحلة التالية بناء على نتائجك.',
  ],
  tools: [
    { tool: 'مات يوغا', spec: 'سماكة 6 إلى 8 ملم لراحة الركب', alt: 'بطانية مطوية' },
    { tool: 'بلوكات يوغا', spec: 'اثنان', alt: 'كتب سميكة' },
    { tool: 'حزام يوغا', spec: '2 متر تقريبا', alt: 'حزام روب أو الحبل المطاطي' },
    { tool: 'رولر', spec: 'متوسط الصلابة، 30 إلى 45 سم', alt: 'قنينة ماء صلبة للساقين' },
    { tool: 'كرة مساج', spec: 'كرة لاكروس أو كرة تنس للبداية', alt: 'كرة تنس' },
    { tool: 'عصا طويلة', spec: '120 إلى 130 سم، خشب أو بلاستيك', alt: 'عصا مكنسة بدون رأس' },
    { tool: 'عصا قصيرة (لاحقا)', spec: 'عصا Arnis من الخيزران طولها قرابة 70 سم', alt: 'مقبض مكنسة مقصوص' },
    { tool: 'هدف ضرب', spec: 'وسادة مربوطة بشريط على عمود أو إطار قديم', alt: 'وسادة على الكنبة' },
  ],
  safety: [
    'توقفي فورا مع ألم حاد، أو تنميل، أو كهرباء نازلة في الرجل أو الذراع. هذا عصب، مو عضلة.',
    'لا تسوين الإطالات العميقة والجسم بارد. ابدئي دائما بالـ CARs أو بعد التمرين.',
    'الركبة في الحمامة والـ 90/90 لازم تكون مريحة، والألم في الركبة يعني ارجعي للنسخة على الظهر.',
    'المرونة الزائدة بدون قوة تزيد الإصابات، لذلك انقباضات نهاية المدى جزء أساسي وليس اختياريا.',
    'تمارين العصا: أحذية رياضية بسطح غير زلق، وفحص السقف والمصابيح، والأطفال بعيدا عن مساحة التدريب.',
    'إذا كان عندك أي إصابة أو حالة صحية في الظهر أو المفاصل، استشيري الطبيب أو أخصائي العلاج الطبيعي قبل البدء.',
  ],
  missedYoga: 'إذا فاتتك جلسة اليوغا يوم الأربعاء فانقليها لأقرب يوم فاضي.',
  twelveHourDay: 'إذا كان يوم دوام 12 ساعة، اكتفي بالتنفس وثلاث حركات من الجلسة.',
};

/* ---------- Weekly add-on table (PDF page 1) ---------- */
// day → ordered add-on sessions + the PDF's stated duration, verbatim label in `ar`.
export const WEEKLY_ADDONS = {
  sun: { minutes: 25, parts: ['mob_b', 'stick_rot'], ar: 'موبيليتي B (أكتاف وظهر صدري) + عصا: دورانات', en: 'Mobility B + stick: rotations' },
  mon: { minutes: 20, parts: ['mob_a'], ar: 'موبيليتي A (ورك ورجلين)', en: 'Mobility A' },
  tue: { minutes: 25, parts: ['stick_speed', 'fascia'], ar: 'عصا: سرعة وحركة قدمين + فك الغشاء', en: 'Stick: speed and footwork + fascia release' },
  wed: { minutes: 40, parts: ['yoga'], ar: 'جلسة اليوغا الطويلة (مساء)', en: 'Long yoga session (evening)' },
  thu: { minutes: 25, parts: ['mob_c', 'stick_strikes'], ar: 'موبيليتي C (عمود فقري وحركة أرضية) + عصا: ضربات', en: 'Mobility C + stick: strikes' },
  fri: { minutes: 25, parts: ['mob_a', 'fascia'], ar: 'موبيليتي A + فك الغشاء', en: 'Mobility A + fascia release' },
  sat: { minutes: 20, parts: ['stick_shadow', 'calm_stretch'], ar: 'عصا: جولات ملاكمة ظل + إطالة هادئة', en: 'Stick: shadow-boxing rounds + calm stretching' },
};
export const EVERY_DAY = {
  morning: { minutes: 5, session: 'breath_am', ar: 'روتين التنفس الصباحي', en: 'Breathing routine' },
  night: { minutes: 5, session: 'breath_pm', ar: 'تنفس النوم + وضعية الأرجل على الجدار', en: 'Sleep breathing + legs up the wall' },
};

/* Stick theme → drills per level. The PDF's weekly table only names a theme per day
   (rotations / speed & footwork / strikes / shadow rounds) and organises the drills by
   level, so this theme × level mapping is an assumption — editable in the plan. */
export const STICK_THEMES = {
  stick_rot: { en: 'Stick: rotations', ar: 'عصا: دورانات', 1: ['figure8', 'helicopter', 'pass_around'], 2: ['figure8', 'helicopter', 'pass_around'], 3: ['figure8', 'helicopter', 'spin_360'] },
  stick_speed: { en: 'Stick: speed & footwork', ar: 'عصا: سرعة وحركة قدمين', 1: ['stick_footwork', 'angles_1_5'], 2: ['box_step', 'number_reaction'], 3: ['box_step', 'peak_speed'] },
  stick_strikes: { en: 'Stick: strikes', ar: 'عصا: ضربات', 1: ['angles_1_5'], 2: ['strikes_move', 'combos_3', 'block_attack'], 3: ['combos_3', 'block_attack', 'weak_hand'] },
  stick_shadow: { en: 'Stick: shadow-boxing rounds', ar: 'عصا: جولات ملاكمة ظل', 1: ['stick_footwork', 'angles_1_5'], 2: ['combos_3', 'number_reaction'], 3: ['shadow_fight', 'drop_knee'] },
};

// "Calm stretching" (Saturday) has no table in the PDF — these are the PDF's own calm, held
// stretches. Assumption, editable.
export const CALM_STRETCH_IDS = ['childs_pose', 'doorway_chest', 'couch_stretch', 'strap_hamstring'];

export const MOBILITY_SESSIONS = [
  { id: 'mob_a', en: 'Mobility A — hips & legs', ar: 'الجلسة A: الورك والرجلين (للركلات والقرفصاء والانقسام)', minutes: 20, items: MOBILITY_A },
  { id: 'mob_b', en: 'Mobility B — shoulders, thoracic spine, wrist', ar: 'الجلسة B: الأكتاف والظهر الصدري والمعصم (للضرب بالعصا)', minutes: 20, items: MOBILITY_B },
  { id: 'mob_c', en: 'Mobility C — spine & floor movement', ar: 'الجلسة C: العمود الفقري والحركة الأرضية (للمناورة والقوام من الأرض)', minutes: 20, items: MOBILITY_C },
  { id: 'yoga', en: 'Long yoga session (Wednesday)', ar: 'جلسة اليوغا الطويلة (الأربعاء، 40 دقيقة)', minutes: 40, items: YOGA },
  { id: 'fascia', en: 'Fascia release — roller & ball', ar: 'فك الغشاء (الفاشيا)', minutes: 10, items: FASCIA },
  { id: 'breath_am', en: 'Morning breathing (5 min)', ar: 'الصباح (5 دقائق)', minutes: 5, items: BREATH_MORNING },
  { id: 'breath_pm', en: 'Bedtime breathing (5 min)', ar: 'قبل النوم (5 دقائق)', minutes: 5, items: BREATH_NIGHT },
];
