// ============================================================
// PROTOCOL APP — complete rewrite, all features integrated
// ============================================================

// ============================================================
// CONSTANTS & CONFIG
// ============================================================
const STORAGE_KEY = 'protocol_app_state_v1';
const DAY_ORDER   = ['sun','mon','tue','wed','thu','fri','sat'];
const HAIR_START  = new Date('2026-06-25T00:00:00');

const WATER_PER_DROP_ML  = 400;
const WATER_DROPS_TOTAL  = 8;

const MEDICATIONS = [
  { id: 'minoxidil',  name: 'Minoxidil 2.5mg',          time: '9:30am', detail: 'Take with breakfast — needs dietary fat for absorption. At least 2 hrs after RYZE coffee (caffeine can amplify heart rate).' },
  { id: 'd3_k2_b12', name: 'D3 5000IU + K2 100mcg + B12', time: '9:30am', detail: 'With breakfast — fat-soluble vitamins, absorbed with peanut butter/chia' },
  { id: 'finasteride',name: 'Finasteride 1mg',           time: '8:00pm', detail: 'With dinner, alongside B-Complex' },
  { id: 'bcomplex',   name: 'B-Complex',                 time: '8:00pm', detail: 'With dinner alongside Finasteride' }
];

const HAIR_MILESTONES = [
  { day: 0,   emoji: '🚀', label: 'Protocol started',       desc: 'Minoxidil 2.5mg daily + Finasteride 1mg nightly. Baseline photos taken.' },
  { day: 14,  emoji: '⚠️', label: 'Initial shed possible',  desc: 'Minoxidil can trigger a temporary shed — completely normal, follicles are activating.' },
  { day: 35,  emoji: '🔁', label: 'Dermaroller begins',     desc: 'Start 0.5mm dermaroller every Wednesday. Increases absorption up to 4×.' },
  { day: 60,  emoji: '📸', label: '2-month check',          desc: 'Take progress photos and compare with Day 0. No visible results expected yet.' },
  { day: 90,  emoji: '🛡️', label: '3 months',               desc: 'DHT levels significantly reduced. Hair loss should be slowing or stopped.' },
  { day: 120, emoji: '🌱', label: '4 months',               desc: 'Early regrowth may appear as fine vellus hairs.' },
  { day: 180, emoji: '✨', label: '6 months — real results', desc: 'Primary window for visible regrowth. Take progress photos.' },
  { day: 365, emoji: '🏆', label: '1 year — full assessment',desc: 'Maximum benefit window. Reassess with doctor.' }
];

const MUSCLE_GROUPS = {
  'Glutes':          ['mon_bridge','wed_sumo','wed_bulgarian','wed_glutebridge','fri_lunge','fri_squatcalf'],
  'Quads':           ['mon_squat','wed_squat','wed_bulgarian','wed_lunge','fri_squatcalf','fri_lunge'],
  'Hamstrings':      ['wed_lunge','wed_glutebridge','fri_lunge'],
  'Core / Abs':      ['mon_plank','tue_hollow','tue_legraise','tue_mtnclimb','tue_deadbug','thu_shouldertap','fri_plank','fri_mtnclimb'],
  'Chest':           ['mon_pushup','fri_pushup','thu_diamond'],
  'Shoulders':       ['thu_pike'],
  'Triceps':         ['thu_diamond','mon_pushup','fri_pushup'],
  'Upper back':      ['thu_row','thu_superman'],
  'Calves':          ['fri_squatcalf'],
  'Cardiovascular':  ['tue_cardio','fri_mtnclimb']
};

const MEAL_PREP_ITEMS = [
  { task: 'Cook quinoa (large batch)',      detail: 'Mon–Wed lunches + Fri dinner · 15 min' },
  { task: 'Make red lentil soup',           detail: '2–3 portions · Mon & Tue dinners · 20 min' },
  { task: 'Cook chickpeas / chole',         detail: 'Wed / Thu / Sun lunches · 25 min pressure cooker' },
  { task: 'Soak rajma overnight',           detail: 'For Friday lunch · 5 min + overnight' },
  { task: 'Prep overnight oats base',       detail: 'Mon breakfast · refrigerate tonight · 5 min' },
  { task: 'Portion frozen berries/mango',   detail: 'Daily ½-cup bags · 5 min' },
  { task: 'Measure + pack soya chunks',     detail: '40g portions for 3 days · 5 min' }
];

const ONBOARDING_STEPS = [
  { icon: '💪', title: 'Welcome to Protocol',  desc: 'Your complete personal health tracker — diet, exercise, medications, and hair protocol all in one place.' },
  { icon: '🍽️', title: 'Eat tab',              desc: 'Your 7-day vegetarian diet plan is pre-loaded. Switch meal options, swap ingredients, add custom foods, and track macros live.' },
  { icon: '🏋️', title: 'Train tab',            desc: 'Full 5-day bodyweight plan with how-to guides, sets/reps, rest timers, and calorie burn. Ticking an exercise auto-adjusts your meal targets.' },
  { icon: '💧', title: 'Today tab',            desc: 'Your daily hub — calorie ring, water tracker, medication checklist, and a night summary. Everything updates live.' },
  { icon: '📈', title: 'Progress tab',         desc: 'Track weight, body measurements, hair protocol milestones, and 30-day workout history.' },
  { icon: '🚀', title: "You\'re all set",       desc: 'Start by logging your breakfast in Eat, or check off your morning workout in Train. Data saves automatically.' }
];

// ============================================================
// STATE
// ============================================================
let state = loadState();
let currentView      = 'today';
let selectedTrainDay = todayDayId();
let selectedEatDay   = todayDayId();
let onboardingStep   = 0;
let restTimerInterval = null;
let restTimerSec     = 0;
let openExerciseDetail = {};
let swapContext      = { mealId: null, itemIdx: null, selectedFoodId: null };
let addFoodContext   = { mealId: null, selectedFoodId: null, mode: 'search' };
let editFoodContext  = { mealId: null, itemIdx: null };

function todayKey(date) {
  const d = date || new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function todayDayId(date) {
  return DAY_ORDER[(date || new Date()).getDay()];
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      p.days            = p.days            || {};
      p.weightLog       = p.weightLog       || [];
      p.currentWeight   = p.currentWeight   || PROFILE.startWeightKg;
      p.customFoodDefs  = p.customFoodDefs  || {};
      p.measureLog      = p.measureLog      || [];
      p.theme           = p.theme           || 'dark';
      p.onboardingDone  = p.onboardingDone  !== undefined ? p.onboardingDone : false;
      return p;
    }
  } catch(e) { console.error('Load failed', e); }
  return { days:{}, weightLog:[], currentWeight: PROFILE.startWeightKg,
           customFoodDefs:{}, measureLog:[], theme:'dark', onboardingDone:false };
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch(e) { showToast('Storage error'); }
}

function getDayLog(dateKey) {
  if (!state.days[dateKey]) state.days[dateKey] = {};
  const d = state.days[dateKey];
  d.exercises    = d.exercises    || {};
  d.activities   = d.activities   || [];
  d.meals        = d.meals        || {};
  d.mealChoices  = d.mealChoices  || {};
  d.mealScaleFactor = d.mealScaleFactor !== undefined ? d.mealScaleFactor : null;
  d.waterDrops   = d.waterDrops   !== undefined ? d.waterDrops : 0;
  d.medsTaken    = d.medsTaken    || {};
  d.prepDone     = d.prepDone     || {};
  d.mealConfirmed = d.mealConfirmed || {};
  return d;
}

// ============================================================
// HAPTIC
// ============================================================
function haptic(type) {
  if (!navigator.vibrate) return;
  const p = { light:[10], medium:[20], heavy:[30,10,30], success:[10,50,10] };
  navigator.vibrate(p[type] || [10]);
}

// ============================================================
// TOAST
// ============================================================
let toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2300);
}

// ============================================================
// THEME
// ============================================================
function applyTheme() {
  const isLight = state.theme === 'light';
  document.body.classList.toggle('light-mode', isLight);
  const btn = document.getElementById('themeToggleBtn');
  if (btn) btn.textContent = isLight ? '☀️' : '🌙';
}
function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  applyTheme();
  saveState();
  haptic('light');
}

// ============================================================
// OFFLINE INDICATOR
// ============================================================
function initOfflineIndicator() {
  function update() {
    const bar = document.getElementById('offlineBar');
    if (bar) bar.classList.toggle('visible', !navigator.onLine);
  }
  window.addEventListener('online',  update);
  window.addEventListener('offline', update);
  update();
}

// ============================================================
// HEADER DATE
// ============================================================
function updateHeaderDate() {
  const el = document.getElementById('headerDate');
  if (el) el.textContent = new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
}

// ============================================================
// GREETING — time-based, genuinely data-driven (no fake stats)
// ============================================================
function renderGreeting(dateKey, dayId, eaten, target, remaining) {
  const block = document.getElementById('greetingBlock');
  if (!block) return;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Still up?';

  const log = getDayLog(dateKey);
  const exDone = Object.values(log.exercises).some(e => e.completed);
  const waterDrops = log.waterDrops || 0;
  const medsCount = MEDICATIONS.filter(m => (log.medsTaken||{})[m.id]).length;

  // Pick the single most relevant, true line based on actual state — no filler
  let line;
  if (hour < 10 && medsCount === 0) {
    line = 'Minoxidil is due at 9:30am with breakfast — needs dietary fat to absorb well.';
  } else if (!exDone && hour >= 6 && hour < 20) {
    const day = EXERCISE_PLAN.find(d => d.id === dayId);
    line = day && day.exercises.length > 2 ? `Today's session: ${day.theme} — ${day.duration}` : `Rest day — light walk keeps recovery on track.`;
  } else if (exDone && remaining > 0) {
    line = `Nice work training today. ${Math.round(remaining)} kcal left in today's budget.`;
  } else if (waterDrops < 4 && hour >= 14) {
    line = `Water's at ${(waterDrops*WATER_PER_DROP_ML/1000).toFixed(1)}L so far — worth catching up before evening.`;
  } else if (remaining < 0) {
    line = `${Math.abs(Math.round(remaining))} kcal over today's target — no stress, tomorrow resets.`;
  } else {
    line = `${Math.round(remaining)} kcal remaining today. Steady as it goes.`;
  }

  block.innerHTML = `
    <div class="greeting-title">${greeting}</div>
    <div class="greeting-line">${line}</div>
  `;
}

// ============================================================
// VIEW SWITCHING
// ============================================================
function switchView(view) {
  currentView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  const el = document.getElementById('view-' + view);
  if (el) el.classList.add('active');
  if (view === 'today')    renderToday();
  if (view === 'train')    renderTrain();
  if (view === 'eat')      renderEat();
  if (view === 'progress') renderProgress();
}

// ============================================================
// CALORIE MATH
// ============================================================
function calcBMR(w) { return 10*w + 6.25*165 - 5*26 + 5; }
function calcMaintenance(w) { return calcBMR(w) * 1.55; }
function getTodayBaseTarget() {
  return Math.round(calcMaintenance(state.currentWeight || PROFILE.startWeightKg) - 500);
}

function getDayExerciseBurn(dateKey) {
  const log = getDayLog(dateKey);
  return Object.values(log.exercises).filter(e => e.completed).reduce((s,e) => s + (e.kcal||0), 0)
       + (log.activities||[]).reduce((s,a) => s + (a.kcal||0), 0);
}
function getDayStepsBurn(dateKey) {
  const log = getDayLog(dateKey);
  return log.steps ? (log.steps.kcal||0) : 0;
}
function getDayTotalBurn(dateKey) {
  return getDayExerciseBurn(dateKey) + getDayStepsBurn(dateKey);
}
function getDayTarget(dateKey) {
  return getTodayBaseTarget() + getDayExerciseBurn(dateKey);
}
function getMacroTargets(dateKey) {
  const extra = getDayTarget(dateKey) - getTodayBaseTarget();
  return {
    calories: getDayTarget(dateKey),
    protein:  PROFILE.baseMacroTargets.protein + Math.round(Math.max(0,extra*0.35)/4),
    carbs:    PROFILE.baseMacroTargets.carbs   + Math.round(Math.max(0,extra*0.40)/4),
    fat:      PROFILE.baseMacroTargets.fat     + Math.round(Math.max(0,extra*0.25)/9)
  };
}

function getExerciseKcal(ex, overrides) {
  const w   = state.currentWeight || PROFILE.startWeightKg;
  const met = MET_VALUES[ex.metKey] || 4;
  const sets = (overrides && overrides.sets) || ex.sets;
  let secs;
  if (ex.durationSec) {
    secs = ((overrides && overrides.durationSec) || ex.durationSec) * sets;
  } else {
    secs = ((overrides && overrides.reps) || ex.reps || 10) * 3 * sets;
  }
  return Math.round(met * w * (secs / 3600));
}

function estimateCaloriesFromSteps(steps, w) {
  return Math.round(steps * w * 0.0005);
}

// ============================================================
// FOOD
// ============================================================
function getFood(id) {
  return FOOD_DB.find(f => f.id === id) ||
         (state.customFoodDefs && state.customFoodDefs[id]) || null;
}

function computeItemMacros(item) {
  const food = getFood(item.foodId);
  if (!food) return { cal:0, protein:0, carbs:0, fat:0 };
  const factor = (food.unit==='100g'||food.unit==='100ml') ? item.amount/100 : item.amount;
  return {
    cal:     Math.round(food.cal     * factor),
    protein: +(food.protein * factor).toFixed(1),
    carbs:   +(food.carbs   * factor).toFixed(1),
    fat:     +(food.fat     * factor).toFixed(1)
  };
}

function getAllSearchableFoods() {
  const custom = Object.values(state.customFoodDefs||{}).map(f=>({...f,source:'custom'}));
  return [...custom, ...FOOD_DB.map(f=>({...f,source:'builtin'}))];
}

// ============================================================
// MEAL SYSTEM
// ============================================================
function getMealChoice(dateKey, dayId, mealId) {
  const log = getDayLog(dateKey);
  if (log.mealChoices[mealId]) return log.mealChoices[mealId];
  return (WEEKLY_DEFAULT_CHOICES[dayId]||{})[mealId] ||
         (MEAL_OPTIONS[mealId]&&MEAL_OPTIONS[mealId][0] ? MEAL_OPTIONS[mealId][0].id : null);
}

function getMealOption(dateKey, dayId, mealId) {
  const id = getMealChoice(dateKey, dayId, mealId);
  const opts = MEAL_OPTIONS[mealId] || [];
  return opts.find(o => o.id === id) || opts[0] || null;
}

function getMealItems(dateKey, dayId, mealId) {
  const log = getDayLog(dateKey);
  const choiceId = getMealChoice(dateKey, dayId, mealId);
  if (log.meals[mealId] && log.meals[mealId].lockedToChoice === choiceId) {
    return log.meals[mealId].items;
  }
  const option = getMealOption(dateKey, dayId, mealId);
  const items  = option ? option.items.map(i=>({...i})) : [];
  log.meals[mealId] = { items, lockedToChoice: choiceId };
  return items;
}

function computeMealTotals(items) {
  return items.reduce((a,item) => {
    const m = computeItemMacros(item);
    a.cal += m.cal; a.protein += m.protein; a.carbs += m.carbs; a.fat += m.fat;
    return a;
  }, {cal:0,protein:0,carbs:0,fat:0});
}

function computeDayEatenTotals(dateKey, dayId) {
  return MEAL_WINDOWS.reduce((a, mw) => {
    const t = computeMealTotals(getMealItems(dateKey, dayId, mw.id));
    a.cal += t.cal; a.protein += t.protein; a.carbs += t.carbs; a.fat += t.fat;
    return a;
  }, {cal:0,protein:0,carbs:0,fat:0});
}

function switchMealOption(mealId, optionId) {
  const dateKey = todayKey();
  const dayId   = todayDayId();
  const log     = getDayLog(dateKey);
  log.mealChoices[mealId] = optionId;
  delete log.meals[mealId];
  applyMealAutoScale(dateKey, dayId);
  saveState();
  const opt = (MEAL_OPTIONS[mealId]||[]).find(o=>o.id===optionId);
  showToast(opt ? `Switched to ${opt.label}` : 'Meal updated');
  haptic('light');
  renderEat();
  if (currentView==='today') renderToday();
}

// ============================================================
// MEAL AUTO-SCALING
// ============================================================
const SCALABLE_MEALS = ['lunch','dinner'];
const SCALABLE_CATS  = ['carb','fat'];

function applyMealAutoScale(dateKey, dayId) {
  const log    = getDayLog(dateKey);
  const extra  = getDayTarget(dateKey) - getTodayBaseTarget();

  if (extra <= 20) {
    if (log.mealScaleFactor) resetMealScaling(dateKey, dayId);
    return;
  }

  let baseKcal = 0;
  SCALABLE_MEALS.forEach(mId => {
    getMealItems(dateKey, dayId, mId).forEach(item => {
      const food = getFood(item.foodId);
      if (food && SCALABLE_CATS.includes(food.category)) {
        const orig = item._baseAmount || item.amount;
        baseKcal += Math.round(food.cal * (food.unit==='100g'||food.unit==='100ml' ? orig/100 : orig));
      }
    });
  });

  if (baseKcal <= 0) return;
  const factor = Math.min(1 + (extra*0.8/baseKcal), 2.2);

  SCALABLE_MEALS.forEach(mId => {
    getMealItems(dateKey, dayId, mId).forEach(item => {
      const food = getFood(item.foodId);
      if (!food || !SCALABLE_CATS.includes(food.category)) return;
      if (!item._baseAmount) item._baseAmount = item.amount;
      item.amount = +(item._baseAmount * factor).toFixed(1);
      item._scaledFrom = item._baseAmount;
      item.unitLabel   = (food.unit==='100g'||food.unit==='100ml') ? `${item.amount}${food.unit==='100g'?'g':'ml'} (scaled)` : `${item.amount} × ${food.unit} (scaled)`;
    });
  });
  log.mealScaleFactor = +factor.toFixed(2);
}

function resetMealScaling(dateKey, dayId) {
  const log = getDayLog(dateKey);
  SCALABLE_MEALS.forEach(mId => {
    getMealItems(dateKey, dayId, mId).forEach(item => {
      if (item._baseAmount) {
        const food = getFood(item.foodId);
        item.amount    = item._baseAmount;
        item.unitLabel = food ? (food.unit==='100g' ? `${item.amount}g` : `${item.amount} × ${food.unit}`) : item.unitLabel;
        delete item._scaledFrom;
      }
    });
  });
  log.mealScaleFactor = null;
}

// ============================================================
// PROGRESSIVE OVERLOAD
// ============================================================
function getLastSession(exId) {
  const today = new Date();
  for (let i=1; i<=14; i++) {
    const d = new Date(today); d.setDate(d.getDate()-i);
    const log = state.days[todayKey(d)];
    if (log && log.exercises && log.exercises[exId] && log.exercises[exId].completed)
      return log.exercises[exId];
  }
  return null;
}

function overloadBadgeHTML(ex, curSets, curReps) {
  const last = getLastSession(ex.id);
  if (!last) return '<span style="font-size:11px;color:var(--text-tertiary)">First session</span>';
  const lr = last.reps || ex.reps || 0;
  const ls = last.sets || ex.sets;
  const rUp = curReps > lr, sUp = curSets > ls;
  if (rUp||sUp) return `<span class="overload-badge new-pr">↑ PR${rUp?` +${curReps-lr} reps`:''}${sUp?` +${curSets-ls} sets`:''}</span>`;
  return `<span class="overload-badge">= ${lr} reps last session · try +1 today</span>`;
}

// ============================================================
// REST TIMER
// ============================================================
function startRestTimer(restSec, exName, nextName) {
  if (restTimerInterval) clearInterval(restTimerInterval);
  restTimerSec = restSec;
  const bar  = document.getElementById('restTimerBar');
  const cnt  = document.getElementById('restTimerCount');
  const nm   = document.getElementById('restTimerExName');
  const nx   = document.getElementById('restTimerNext');
  if (!bar) return;
  bar.classList.add('active');
  if (nm) nm.textContent = `After: ${exName}`;
  if (nx) nx.textContent = nextName ? `Up next: ${nextName}` : 'Last exercise';
  if (cnt) cnt.textContent = restTimerSec;

  restTimerInterval = setInterval(() => {
    restTimerSec--;
    if (cnt) cnt.textContent = Math.max(0, restTimerSec);
    if (restTimerSec <= 0) {
      clearInterval(restTimerInterval);
      if (bar) bar.classList.remove('active');
      haptic('success');
      showToast('Rest done — go!');
    } else if (restTimerSec <= 3) {
      haptic('light');
    }
  }, 1000);
}

function skipRestTimer() {
  if (restTimerInterval) clearInterval(restTimerInterval);
  const bar = document.getElementById('restTimerBar');
  if (bar) bar.classList.remove('active');
  haptic('medium');
}

// ============================================================
// TODAY VIEW
// ============================================================
function renderToday() {
  const dateKey = todayKey();
  const dayId   = todayDayId();
  const target  = getDayTarget(dateKey);
  const eaten   = computeDayEatenTotals(dateKey, dayId);
  const burned  = getDayTotalBurn(dateKey);
  const remaining = target - eaten.cal;
  const macros  = getMacroTargets(dateKey);

  try { renderGreeting(dateKey, dayId, eaten, target, remaining); }
  catch (e) { console.error('Greeting render failed:', e); }

  // Ring
  const circ = 2 * Math.PI * 95;
  const pct  = Math.max(0, Math.min(1, remaining / Math.max(target,1)));
  const ring = document.getElementById('ringFg');
  if (ring) {
    ring.setAttribute('stroke-dasharray', circ);
    ring.setAttribute('stroke-dashoffset', circ*(1-pct));
    const isOver = remaining < 0;
    const isCloseToGoal = !isOver && remaining <= target * 0.08; // within ~8% of target = "on track" pulse
    ring.classList.toggle('over', isOver);
    ring.classList.toggle('goal-close', isCloseToGoal);
  }
  setText('ringNum', Math.abs(Math.round(remaining)));
  setText('ringLabel', remaining < 0 ? 'kcal over budget' : 'kcal remaining');
  setText('statTarget', target);
  setText('statEaten', Math.round(eaten.cal));
  setText('statBurned', burned);

  // Macros
  setMacroBar('macroProteinNums','macroProteinFill', eaten.protein, macros.protein);
  setMacroBar('macroCarbsNums',  'macroCarbsFill',   eaten.carbs,   macros.carbs);
  setMacroBar('macroFatNums',    'macroFatFill',      eaten.fat,     macros.fat);

  // Medications
  renderMedChecklist();

  // Water
  renderWaterTracker();

  // Exercise log
  renderTodayExerciseLog(dateKey, dayId);

  // Activity log
  renderTodayActivityLog(dateKey);

  // Steps log
  renderTodayStepsLog(dateKey);

  // Daily summary (after 6pm)
  renderDailySummary();

  // Meal prep (Sundays only, on Eat tab — triggered here too)
  renderMealPrepBanner();
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setMacroBar(numsId, fillId, val, target) {
  const numsEl = document.getElementById(numsId);
  const fillEl = document.getElementById(fillId);
  if (numsEl) numsEl.textContent = `${Math.round(val)} / ${Math.round(target)}g`;
  if (fillEl) fillEl.style.width = Math.min(100, (val/Math.max(target,1))*100) + '%';
}

function renderTodayExerciseLog(dateKey, dayId) {
  const log = getDayLog(dateKey);
  const day = EXERCISE_PLAN.find(d => d.id === dayId);
  const done = Object.entries(log.exercises).filter(([,e]) => e.completed);
  const el  = document.getElementById('todayExerciseLog');
  if (!el) return;
  if (!done.length) {
    el.innerHTML = '<div class="empty-state">Nothing logged yet. Head to Train to check off exercises.</div>';
    return;
  }
  el.innerHTML = done.map(([id, e]) => {
    const ex = day ? day.exercises.find(x => x.id === id) : null;
    return `<div class="log-item">
      <div><div class="log-item-name">${ex ? ex.name : id}</div><div class="log-item-meta">${e.sets} sets</div></div>
      <div class="log-item-val">${e.kcal} kcal</div>
    </div>`;
  }).join('');
}

function renderTodayActivityLog(dateKey) {
  const log = getDayLog(dateKey);
  const el  = document.getElementById('todayActivityLog');
  if (!el) return;
  if (!log.activities.length) {
    el.innerHTML = '<div class="empty-state">No extra activity logged.</div>';
    return;
  }
  el.innerHTML = log.activities.map((a,i) => `
    <div class="log-item">
      <div><div class="log-item-name">${a.label}</div><div class="log-item-meta">${a.durationMin} min</div></div>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="log-item-val">${a.kcal} kcal</div>
        <button class="log-item-del" onclick="removeActivity(${i})">×</button>
      </div>
    </div>`).join('');
}

function renderTodayStepsLog(dateKey) {
  const log = getDayLog(dateKey);
  const el  = document.getElementById('todayStepsLog');
  if (!el) return;
  if (!log.steps) {
    el.innerHTML = '<div class="empty-state">Steps not logged yet today.</div>';
    return;
  }
  el.innerHTML = `<div class="log-item">
    <div><div class="log-item-name">${log.steps.steps.toLocaleString()} steps</div><div class="log-item-meta">Galaxy Watch 7</div></div>
    <div class="log-item-val">${log.steps.kcal} kcal</div>
  </div>`;
}

// ============================================================
// WATER TRACKER
// ============================================================
function renderWaterTracker() {
  const dateKey = todayKey();
  const log  = getDayLog(dateKey);
  const drops = log.waterDrops || 0;
  const el   = document.getElementById('waterDrops');
  if (!el) return;
  el.innerHTML = Array.from({length: WATER_DROPS_TOTAL}, (_,i) =>
    `<div class="water-drop ${i < drops ? 'filled' : ''}" onclick="toggleWaterDrop(${i})" title="${(i+1)*WATER_PER_DROP_ML}ml"></div>`
  ).join('');
  setText('waterAmount',    drops >= 1000/WATER_PER_DROP_ML ? `${(drops*WATER_PER_DROP_ML/1000).toFixed(1)}L` : `${drops*WATER_PER_DROP_ML}ml`);
  setText('waterGoalLabel', `Goal: ${(WATER_DROPS_TOTAL*WATER_PER_DROP_ML/1000).toFixed(1)}L · ${WATER_PER_DROP_ML}ml per drop`);
}

function toggleWaterDrop(idx) {
  haptic('light');
  const log = getDayLog(todayKey());
  const cur = log.waterDrops || 0;
  log.waterDrops = idx < cur ? idx : idx+1;
  if (log.waterDrops === WATER_DROPS_TOTAL) { showToast('💧 Water goal reached!'); haptic('success'); }
  saveState();
  renderWaterTracker();
}

// ============================================================
// MEDICATION CHECKLIST
// ============================================================
function renderMedChecklist() {
  const log = getDayLog(todayKey());
  const el  = document.getElementById('medChecklist');
  if (!el) return;
  el.innerHTML = MEDICATIONS.map(med => {
    const done = !!(log.medsTaken||{})[med.id];
    return `<div class="med-item ${done?'done':''}">
      <button class="check ${done?'checked':''}" onclick="toggleMed('${med.id}')">
        <svg viewBox="0 0 24 24" fill="none"><path d="M4 12l5 5L20 6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div class="med-info">
        <div class="med-name">${med.name}</div>
        <div class="med-time">${med.time}</div>
        <div class="med-detail">${med.detail}</div>
      </div>
    </div>`;
  }).join('');
}

function toggleMed(id) {
  haptic('light');
  const log = getDayLog(todayKey());
  log.medsTaken = log.medsTaken || {};
  log.medsTaken[id] = !log.medsTaken[id];
  const m = MEDICATIONS.find(x => x.id===id);
  if (log.medsTaken[id]) showToast(`✓ ${m.name} logged`);
  saveState();
  renderMedChecklist();
}

// ============================================================
// DAILY SUMMARY
// ============================================================
function renderDailySummary() {
  const card = document.getElementById('dailySummaryCard');
  if (!card) return;
  if (new Date().getHours() < 18) { card.style.display='none'; return; }
  card.style.display = 'block';
  const dateKey = todayKey(), dayId = todayDayId();
  const log    = getDayLog(dateKey);
  const eaten  = computeDayEatenTotals(dateKey, dayId);
  const target = getDayTarget(dateKey);
  const macros = getMacroTargets(dateKey);
  const deficit   = target - eaten.cal;
  const proteinOK = eaten.protein >= macros.protein * 0.9;
  const waterOK   = (log.waterDrops||0) >= 6;
  const medsOK    = MEDICATIONS.every(m => (log.medsTaken||{})[m.id]);
  const burn      = getDayTotalBurn(dateKey);
  const workoutDone = Object.values(log.exercises).some(e=>e.completed);
  setText('dailySummaryDate', new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}));
  const grid = document.getElementById('dailySummaryGrid');
  if (!grid) return;
  grid.innerHTML = `
    <div class="summary-cell ${deficit>=0?'good-cell':'warn-cell'}">
      <div class="sv">${Math.abs(Math.round(deficit))}</div>
      <div class="sl">${deficit>=0?'deficit ✓':'kcal over'}</div>
    </div>
    <div class="summary-cell ${proteinOK?'good-cell':'warn-cell'}">
      <div class="sv">${Math.round(eaten.protein)}g</div>
      <div class="sl">protein ${proteinOK?'✓':'— low'}</div>
    </div>
    <div class="summary-cell ${workoutDone?'good-cell':''}">
      <div class="sv">${workoutDone?burn+' kcal':'Rest'}</div>
      <div class="sl">exercise</div>
    </div>
    <div class="summary-cell ${waterOK?'good-cell':'warn-cell'}">
      <div class="sv">${((log.waterDrops||0)*WATER_PER_DROP_ML/1000).toFixed(1)}L</div>
      <div class="sl">water ${waterOK?'✓':'— low'}</div>
    </div>
    <div class="summary-cell ${medsOK?'good-cell':'warn-cell'}">
      <div class="sv">${medsOK?'All ✓':Object.values(log.medsTaken||{}).filter(Boolean).length+'/'+MEDICATIONS.length}</div>
      <div class="sl">meds</div>
    </div>`;
}

// ============================================================
// TRAIN VIEW
// ============================================================
function renderTrain() {
  renderTrainDayStrip();
  const day     = EXERCISE_PLAN.find(d => d.id === selectedTrainDay);
  const dateKey = todayKey();
  const log     = getDayLog(dateKey);
  const isToday = selectedTrainDay === todayDayId();

  // Theme card
  const themeCard = document.getElementById('trainThemeCard');
  if (themeCard) themeCard.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:8px">
      <div>
        <div class="eyebrow">${day.day.toUpperCase()}</div>
        <div class="day-theme-title">${day.theme}</div>
      </div>
    </div>
    <div class="day-theme-goal">${day.goal}</div>
    <div class="day-meta-row">
      <span class="pill">${day.duration}</span>
      <span class="pill">${day.intensity}</span>
      ${day.warmup ? `<span class="pill">Warm-up: ${day.warmup}</span>` : ''}
    </div>`;

  // Exercise list
  const list = document.getElementById('trainExerciseList');
  if (!list) return;
  let html = '';
  if (day.isCircuit) {
    html += `<div class="circuit-banner">Circuit: ${day.circuitRounds} rounds, all exercises back-to-back. Rest ${day.circuitExerciseRestSec}s between exercises, ${day.circuitRoundRestSec}s between rounds.</div>`;
  }
  html += day.exercises.map((ex, exIdx) => {
    const saved   = log.exercises[ex.id] || {};
    const completed = isToday && saved.completed;
    const sets    = saved.sets || ex.sets;
    const reps    = saved.reps || ex.reps || 0;
    const durSec  = saved.durationSec || ex.durationSec || 0;
    const kcal    = getExerciseKcal(ex, ex.durationSec ? {durationSec:durSec,sets} : {reps,sets});
    const isOpen  = !!openExerciseDetail[ex.id];
    const badge   = isToday ? overloadBadgeHTML(ex, sets, reps) : '';

    return `<div class="exercise-card">
      <div class="exercise-head">
        <button class="check ${completed?'checked':''}" ${isToday?`onclick="toggleExerciseComplete('${ex.id}')"`:'onclick="showToast(\'Switch to today to log this\')"'} aria-label="Done">
          <svg viewBox="0 0 24 24" fill="none"><path d="M4 12l5 5L20 6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="exercise-info">
          <div class="exercise-name">${ex.name}</div>
          <div class="exercise-type">${ex.type}</div>
          <div class="exercise-specs">${sets} sets · ${ex.durationSec ? formatDur(durSec) : reps+' reps'} · Rest ${ex.restSec}s</div>
          <div class="exercise-burn">~${kcal} kcal</div>
          ${badge}
          <div class="set-editor">
            <div class="mini-field"><label>Sets</label><input type="number" value="${sets}" min="1" ${isToday?`onchange="updateExerciseOverride('${ex.id}','sets',this.value)"`:'disabled'}></div>
            ${ex.durationSec
              ? `<div class="mini-field duration-field"><label>Sec</label><input type="number" value="${durSec}" min="5" ${isToday?`onchange="updateExerciseOverride('${ex.id}','durationSec',this.value)"`:'disabled'}></div>`
              : `<div class="mini-field"><label>Reps</label><input type="number" value="${reps}" min="1" ${isToday?`onchange="updateExerciseOverride('${ex.id}','reps',this.value)"`:'disabled'}></div>`}
          </div>
        </div>
        <button class="exercise-toggle-btn ${isOpen?'open':''}" onclick="toggleExerciseDetail('${ex.id}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </button>
      </div>
      <div class="exercise-detail ${isOpen?'open':''}">
        <div class="detail-block"><div class="detail-label">How to do it</div><ol>${ex.how.map(s=>`<li>${s}</li>`).join('')}</ol></div>
        <div class="tip-box">${ex.tip}</div>
        <div class="mistake-box">${ex.mistake}</div>
      </div>
    </div>`;
  }).join('');
  list.innerHTML = html;

  // Activity log on train tab
  renderTrainActivityList();
  updateTrainDayBurn();
}

function renderTrainDayStrip() {
  const strip = document.getElementById('trainDayStrip');
  if (!strip) return;
  const labels = {sun:'Sun',mon:'Mon',tue:'Tue',wed:'Wed',thu:'Thu',fri:'Fri',sat:'Sat'};
  strip.innerHTML = EXERCISE_PLAN.map(d =>
    `<button class="day-chip ${d.id===selectedTrainDay?'active':''} ${d.id===todayDayId()?'today-marker':''}"
      onclick="selectTrainDay('${d.id}')">${labels[d.id]}</button>`
  ).join('');
}

function selectTrainDay(id) { selectedTrainDay = id; renderTrain(); }

function toggleExerciseDetail(id) { openExerciseDetail[id] = !openExerciseDetail[id]; renderTrain(); }

function formatDur(sec) {
  if (sec >= 60) { const m=Math.floor(sec/60),s=sec%60; return s>0?`${m}m ${s}s`:`${m} min`; }
  return sec + 's';
}

function updateExerciseOverride(exId, field, rawVal) {
  if (selectedTrainDay !== todayDayId()) { showToast('Switch to today to log this'); return; }
  const val = parseInt(rawVal, 10);
  if (!val || val <= 0) return;
  const day = EXERCISE_PLAN.find(d => d.id === selectedTrainDay);
  const ex  = day && day.exercises.find(e => e.id === exId);
  if (!ex) return;
  const dateKey = todayKey();
  const log = getDayLog(dateKey);
  if (!log.exercises[exId]) log.exercises[exId] = { sets:ex.sets, reps:ex.reps, durationSec:ex.durationSec, completed:false, kcal:0 };
  log.exercises[exId][field] = val;
  const e = log.exercises[exId];
  e.kcal = getExerciseKcal(ex, ex.durationSec ? {durationSec:e.durationSec,sets:e.sets} : {reps:e.reps,sets:e.sets});
  applyMealAutoScale(dateKey, selectedTrainDay);
  saveState();
  renderTrain();
  if (currentView==='today') renderToday();
}

function toggleExerciseComplete(exId) {
  if (selectedTrainDay !== todayDayId()) { showToast('Switch to today to log this'); return; }
  const day  = EXERCISE_PLAN.find(d => d.id === selectedTrainDay);
  const exIdx = day ? day.exercises.findIndex(e => e.id === exId) : -1;
  const ex   = exIdx >= 0 ? day.exercises[exIdx] : null;
  if (!ex) return;
  const dateKey = todayKey();
  const log  = getDayLog(dateKey);
  if (!log.exercises[exId]) log.exercises[exId] = { sets:ex.sets, reps:ex.reps, durationSec:ex.durationSec, completed:false, kcal:0 };
  const wasCompleted = log.exercises[exId].completed;
  log.exercises[exId].completed = !wasCompleted;
  const e = log.exercises[exId];
  e.kcal = getExerciseKcal(ex, ex.durationSec ? {durationSec:e.durationSec,sets:e.sets} : {reps:e.reps,sets:e.sets});
  applyMealAutoScale(dateKey, selectedTrainDay);
  saveState();
  renderTrain();
  if (currentView==='today') renderToday();
  if (!wasCompleted) {
    haptic('medium');
    const next = exIdx < day.exercises.length-1 ? day.exercises[exIdx+1] : null;
    startRestTimer(ex.restSec||60, ex.name, next ? next.name : null);
    showToast(`${ex.name} ✓ — +${e.kcal} kcal`);
  } else {
    showToast(`${ex.name} unchecked`);
  }
}

function updateTrainDayBurn() {
  const burn = getDayExerciseBurn(todayKey());
  setText('trainDayBurn', burn + ' kcal');
}

function commitDayBurnToLog() {
  saveState();
  showToast('Synced to today\'s log');
  haptic('success');
  renderToday();
}

function renderTrainActivityList() {
  const dateKey = todayKey();
  const log  = getDayLog(dateKey);
  const el   = document.getElementById('customWorkoutList');
  if (!el) return;
  if (!log.activities.length) {
    el.innerHTML = '<div class="empty-state">No extra activity logged today.</div>';
    return;
  }
  el.innerHTML = log.activities.map((a,i) => `
    <div class="log-item">
      <div><div class="log-item-name">${a.label}</div><div class="log-item-meta">${a.durationMin} min · ${a.intensity||''}</div></div>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="log-item-val">${a.kcal} kcal</div>
        <button class="log-item-del" onclick="removeActivityFromTrain(${i})">×</button>
      </div>
    </div>`).join('');
}

// ============================================================
// EAT VIEW
// ============================================================
function renderEat() {
  renderEatDayStrip();
  const dateKey = todayKey();
  const macros  = getMacroTargets(dateKey);
  setText('eatTargetKcal',    macros.calories);
  setText('eatTargetProtein', macros.protein + 'g');

  const isToday = selectedEatDay === todayDayId();
  const log     = getDayLog(dateKey);
  const scaleNote = isToday && log.mealScaleFactor && log.mealScaleFactor>1
    ? `<div class="meal-note" style="margin-bottom:14px">🏋️ Meals scaled ×${log.mealScaleFactor} for training — carb/fat portions adjusted.</div>` : '';

  const list = document.getElementById('eatMealList');
  if (!list) return;
  list.innerHTML = scaleNote + MEAL_WINDOWS.map(mw => {
    const opts     = MEAL_OPTIONS[mw.id] || [];
    const choiceId = getMealChoice(dateKey, selectedEatDay, mw.id);
    const items    = isToday
      ? getMealItems(dateKey, selectedEatDay, mw.id)
      : ((getMealOption(dateKey, selectedEatDay, mw.id)||{items:[]}).items.map(i=>({...i})));
    const totals = computeMealTotals(items);
    const confirmed = isToday && !!(log.mealConfirmed||{})[mw.id];

    const chips = opts.length>1 ? `<div class="option-chips">${opts.map(o=>
      `<button class="option-chip ${o.id===choiceId?'active':''}" ${isToday?`onclick="switchMealOption('${mw.id}','${o.id}')"`:'disabled'}>${o.label}</button>`
    ).join('')}</div>` : '';

    return `<div class="card meal-card">
      <div class="meal-head">
        <div class="meal-head-left">
          <div>
            <div class="meal-title">${mw.label}</div>
            <div class="meal-time">${mw.time}</div>
          </div>
        </div>
        <div class="meal-kcal">${Math.round(totals.cal)} kcal</div>
      </div>
      ${mw.note ? `<div class="meal-note">${mw.note}</div>` : ''}
      ${chips}
      ${items.map((item,idx) => {
        const food = getFood(item.foodId);
        const m    = computeItemMacros(item);
        return `<div class="food-item-row ${item._scaledFrom?'scaled-row':''}">
          <span class="food-item-name">${food?food.name:item.foodId}<span class="food-item-amt"> ${item.unitLabel||''}</span></span>
          <span class="food-item-macros">${m.cal}kcal · ${m.protein}p</span>
          ${isToday ? `<span class="food-item-actions">
            <button class="icon-btn" onclick="openEditFoodModal('${mw.id}',${idx})" aria-label="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
            <button class="icon-btn" onclick="openSwapModal('${mw.id}',${idx})" aria-label="Swap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3"/></svg></button>
            <button class="icon-btn" onclick="removeMealItem('${mw.id}',${idx})" aria-label="Remove"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6"/></svg></button>
          </span>` : ''}
        </div>`;
      }).join('')}
      ${isToday ? `<button class="btn btn-sm" style="margin-top:10px;width:100%" onclick="openAddFoodModal('${mw.id}')">+ Add food</button>` : ''}
      <div class="meal-confirm-row">
        <span class="meal-confirm-label">${confirmed ? '✓ Marked as eaten' : 'Did you eat this?'}</span>
        ${isToday ? `<button class="confirm-btn ${confirmed?'confirmed':''}" onclick="toggleMealConfirmed('${mw.id}')">${confirmed?'Confirmed':'Confirm eaten'}</button>` : ''}
      </div>
      <div class="meal-totals">
        <span>${Math.round(totals.protein)}g protein</span>
        <span>${Math.round(totals.carbs)}g carbs</span>
        <span>${Math.round(totals.fat)}g fat</span>
      </div>
    </div>`;
  }).join('');
}

function renderEatDayStrip() {
  const strip = document.getElementById('eatDayStrip');
  if (!strip) return;
  const labels = {sun:'Sun',mon:'Mon',tue:'Tue',wed:'Wed',thu:'Thu',fri:'Fri',sat:'Sat'};
  strip.innerHTML = DAY_ORDER.map(id =>
    `<button class="day-chip ${id===selectedEatDay?'active':''} ${id===todayDayId()?'today-marker':''}"
      onclick="selectEatDay('${id}')">${labels[id]}</button>`
  ).join('');
}

function selectEatDay(id) { selectedEatDay = id; renderEat(); }

function toggleMealConfirmed(mealId) {
  haptic('light');
  const dateKey = todayKey();
  const log = getDayLog(dateKey);
  log.mealConfirmed = log.mealConfirmed || {};
  log.mealConfirmed[mealId] = !log.mealConfirmed[mealId];
  saveState();
  renderEat();
  if (log.mealConfirmed[mealId]) showToast('Meal confirmed ✓');
}

function renderMealPrepBanner() {
  const el = document.getElementById('mealPrepBanner');
  if (!el) return;
  if (todayDayId() !== 'sun') { el.style.display='none'; return; }
  const log = getDayLog(todayKey());
  el.style.display = 'block';
  el.innerHTML = `<div class="prep-banner">
    <div class="prep-banner-title">🥘 Sunday Meal Prep</div>
    <div style="font-size:12.5px;color:var(--text-secondary);margin-bottom:10px">Prep today → weekday meals under 10 min</div>
    ${MEAL_PREP_ITEMS.map((item,i) => {
      const done = !!(log.prepDone||{})[i];
      return `<div class="prep-item">
        <button class="check ${done?'checked':''}" onclick="togglePrepItem(${i})" style="width:20px;height:20px;border-radius:5px;flex-shrink:0">
          <svg viewBox="0 0 24 24" fill="none" style="width:11px;height:11px"><path d="M4 12l5 5L20 6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div>
          <div style="font-weight:600;${done?'text-decoration:line-through;color:var(--text-tertiary)':''}">${item.task}</div>
          <div style="font-size:11.5px;color:var(--text-tertiary)">${item.detail}</div>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

function togglePrepItem(idx) {
  haptic('light');
  const log = getDayLog(todayKey());
  log.prepDone = log.prepDone || {};
  log.prepDone[idx] = !log.prepDone[idx];
  saveState();
  renderMealPrepBanner();
}

// ============================================================
// MEAL ITEM ACTIONS
// ============================================================
function removeMealItem(mealId, idx) {
  const items = getMealItems(todayKey(), selectedEatDay, mealId);
  items.splice(idx, 1);
  saveState();
  renderEat();
  if (currentView==='today') renderToday();
}

function removeActivity(idx) {
  const log = getDayLog(todayKey());
  log.activities.splice(idx, 1);
  applyMealAutoScale(todayKey(), todayDayId());
  saveState();
  renderToday();
}

function removeActivityFromTrain(idx) {
  const log = getDayLog(todayKey());
  log.activities.splice(idx, 1);
  applyMealAutoScale(todayKey(), todayDayId());
  saveState();
  renderTrain();
  if (currentView==='today') renderToday();
}

// ============================================================
// EDIT FOOD MODAL
// ============================================================
function openEditFoodModal(mealId, idx) {
  editFoodContext = { mealId, itemIdx: idx };
  const items = getMealItems(todayKey(), selectedEatDay, mealId);
  const item  = items[idx];
  const food  = getFood(item.foodId);
  if (!food) return;
  setText('editFoodName', food.name);
  setText('editFoodUnit', food.unit==='100g'?`Enter grams (${food.cal} kcal/100g)`:food.unit==='100ml'?`Enter ml (${food.cal} kcal/100ml)`:`Enter quantity — 1 = one ${food.unit} (${food.cal} kcal)`);
  const inp = document.getElementById('editFoodAmount');
  if (inp) inp.value = item.amount;
  updateEditFoodPreview();
  document.getElementById('editFoodModalBackdrop').classList.add('open');
}
function closeEditFoodModal() { document.getElementById('editFoodModalBackdrop').classList.remove('open'); }
function updateEditFoodPreview() {
  const amount = parseFloat(document.getElementById('editFoodAmount').value);
  const el = document.getElementById('editFoodPreview');
  if (!el) return;
  if (!amount || amount<=0) { el.textContent='—'; return; }
  const items = getMealItems(todayKey(), selectedEatDay, editFoodContext.mealId);
  const item  = items[editFoodContext.itemIdx];
  const food  = getFood(item.foodId);
  if (!food) return;
  const m = computeItemMacros({...item, amount});
  el.textContent = `${m.cal} kcal · ${m.protein}g p · ${m.carbs}g c · ${m.fat}g f`;
}
function confirmEditFood() {
  const amount = parseFloat(document.getElementById('editFoodAmount').value);
  if (!amount||amount<=0) { showToast('Enter a valid amount'); return; }
  const items = getMealItems(todayKey(), selectedEatDay, editFoodContext.mealId);
  const item  = items[editFoodContext.itemIdx];
  const food  = getFood(item.foodId);
  if (!food) return;
  item.amount    = amount;
  item.unitLabel = food.unit==='100g'?`${amount}g`:food.unit==='100ml'?`${amount}ml`:`${amount} × ${food.unit}`;
  if (item._baseAmount) item._baseAmount = amount;
  saveState();
  closeEditFoodModal();
  showToast(`Updated to ${item.unitLabel}`);
  haptic('light');
  renderEat();
  if (currentView==='today') renderToday();
}

// ============================================================
// SWAP MODAL
// ============================================================
function openSwapModal(mealId, idx) {
  swapContext = { mealId, itemIdx: idx, selectedFoodId: null };
  const items = getMealItems(todayKey(), selectedEatDay, mealId);
  const food  = getFood(items[idx].foodId);
  setText('swapModalTitle', `Swap: ${food?food.name:'item'}`);
  const inp = document.getElementById('swapSearchInput');
  if (inp) inp.value = '';
  const amt = document.getElementById('swapAmountInput');
  if (amt) amt.value = '';
  setText('swapUnitHint', '');
  const sug = document.getElementById('recipeSuggestion');
  if (sug) sug.style.display = 'none';
  renderSwapResults();
  document.getElementById('swapModalBackdrop').classList.add('open');
}
function closeSwapModal() { document.getElementById('swapModalBackdrop').classList.remove('open'); }
function renderSwapResults() {
  const q   = (document.getElementById('swapSearchInput').value||'').toLowerCase().trim();
  const all = getAllSearchableFoods();
  const res = q ? all.filter(f => f.name.toLowerCase().includes(q)) : all;
  const list= document.getElementById('swapResultsList');
  if (!list) return;
  list.innerHTML = res.slice(0,25).map(f => `
    <div class="food-result-row ${swapContext.selectedFoodId===f.id?'selected':''}">
      <div><div class="food-result-name">${f.name}</div><div class="food-result-macro">${f.cal}kcal · ${f.protein}p per ${f.unit}</div></div>
      <button class="food-result-btn" onclick="selectSwapFood('${f.id}')">Select</button>
    </div>`).join('') || '<div class="empty-state">No matches</div>';
}
function selectSwapFood(id) {
  swapContext.selectedFoodId = id;
  const food = getFood(id);
  if (!food) return;
  setText('swapUnitHint', food.unit==='100g'?`Enter grams (${food.cal} kcal/100g)`:food.unit==='100ml'?`Enter ml`:food.unit+` — 1 = one serving`);
  const amt = document.getElementById('swapAmountInput');
  if (amt) amt.value = food.unit==='100g'?100:1;
  const sug = document.getElementById('recipeSuggestion');
  if (sug) {
    const tips = {protein:'Works in any curry, stir-fry, or rice bowl — cook with cumin, turmeric, garam masala.',carb:'Swap 1:1 for rice/oats — keep same portion logic (¾ cup cooked).',fat:'Small addition to oats or as dressing on bowls.',other:'Use as a direct substitute at similar portion size.'};
    sug.style.display='block'; sug.textContent='Suggested use: '+(tips[food.category]||tips.other);
  }
  renderSwapResults();
}
function confirmSwap() {
  if (!swapContext.selectedFoodId) { showToast('Pick a food first'); return; }
  const amount = parseFloat(document.getElementById('swapAmountInput').value);
  if (!amount||amount<=0) { showToast('Enter a valid amount'); return; }
  const food  = getFood(swapContext.selectedFoodId);
  const items = getMealItems(todayKey(), selectedEatDay, swapContext.mealId);
  items[swapContext.itemIdx] = {
    foodId: food.id, amount,
    unitLabel: food.unit==='100g'?`${amount}g`:food.unit==='100ml'?`${amount}ml`:`${amount} × ${food.unit}`,
    swapped: true
  };
  saveState();
  closeSwapModal();
  showToast(`Swapped to ${food.name}`);
  haptic('light');
  renderEat();
  if (currentView==='today') renderToday();
}

// ============================================================
// ADD FOOD MODAL
// ============================================================
function openAddFoodModal(mealId) {
  addFoodContext = { mealId, selectedFoodId: null, mode: 'search' };
  const inp = document.getElementById('addFoodSearchInput');
  if (inp) inp.value = '';
  const amt = document.getElementById('addFoodAmountInput');
  if (amt) amt.value = '';
  setText('addFoodUnitHint', '');
  const cf = document.getElementById('customFoodFields');
  if (cf) cf.style.display = 'none';
  renderAddFoodResults();
  document.getElementById('addFoodModalBackdrop').classList.add('open');
}
function closeAddFoodModal() { document.getElementById('addFoodModalBackdrop').classList.remove('open'); }
function renderAddFoodResults() {
  const q   = (document.getElementById('addFoodSearchInput').value||'').toLowerCase().trim();
  const all = getAllSearchableFoods();
  const res = q ? all.filter(f=>f.name.toLowerCase().includes(q)) : all;
  const list= document.getElementById('addFoodResultsList');
  if (!list) return;
  list.innerHTML = res.slice(0,30).map(f => `
    <div class="food-result-row ${addFoodContext.selectedFoodId===f.id?'selected':''}">
      <div>
        <div class="food-result-name">${f.name}${f.source==='custom'?' <span style="color:var(--accent);font-size:10px;font-weight:700">MY FOOD</span>':''}</div>
        <div class="food-result-macro">${f.cal}kcal · ${f.protein}p · ${f.carbs}c · ${f.fat}f per ${f.unit}</div>
      </div>
      <button class="food-result-btn" onclick="selectAddFoodItem('${f.id}')">Select</button>
    </div>`).join('') || '<div class="empty-state">No matches</div>';
}
function selectAddFoodItem(id) {
  addFoodContext.selectedFoodId = id;
  addFoodContext.mode = 'search';
  const cf = document.getElementById('customFoodFields');
  if (cf) cf.style.display = 'none';
  const food = getFood(id);
  if (!food) return;
  setText('addFoodUnitHint', food.unit==='100g'?`Enter grams — ${food.cal} kcal per 100g`:food.unit==='100ml'?`Enter ml — ${food.cal} kcal per 100ml`:`Enter qty — 1 = one ${food.unit} · ${food.cal} kcal`);
  const amt = document.getElementById('addFoodAmountInput');
  if (amt) amt.value = food.unit==='100g'?100:1;
  renderAddFoodResults();
}
function toggleCustomFoodMode() {
  addFoodContext.mode = 'custom';
  addFoodContext.selectedFoodId = null;
  const cf = document.getElementById('customFoodFields');
  if (cf) cf.style.display = 'block';
  renderAddFoodResults();
}
function confirmAddFood() {
  const dateKey = todayKey();
  const items   = getMealItems(dateKey, selectedEatDay, addFoodContext.mealId);
  if (addFoodContext.mode==='custom') {
    const name     = (document.getElementById('customFoodName').value||'').trim();
    const totalCal = parseFloat(document.getElementById('customFoodCal').value)||0;
    const totalP   = parseFloat(document.getElementById('customFoodProtein').value)||0;
    const totalC   = parseFloat(document.getElementById('customFoodCarbs').value)||0;
    const totalF   = parseFloat(document.getElementById('customFoodFat').value)||0;
    const servingG = parseFloat(document.getElementById('customFoodServingG').value)||0;
    if (!name) { showToast('Name the food'); return; }
    if (!totalCal) { showToast('Enter calories'); return; }
    if (!state.customFoodDefs) state.customFoodDefs = {};
    const existId = Object.keys(state.customFoodDefs).find(id => state.customFoodDefs[id].name.toLowerCase()===name.toLowerCase());
    const customId = existId || ('custom_'+Date.now());
    let food, addAmt, addUnit;
    if (servingG>0) {
      const f = 100/servingG;
      food = { id:customId, name, unit:'100g', category:'custom', cal:Math.round(totalCal*f), protein:+(totalP*f).toFixed(1), carbs:+(totalC*f).toFixed(1), fat:+(totalF*f).toFixed(1) };
      addAmt=servingG; addUnit=`${servingG}g`;
      showToast(`${name} saved to My Foods`);
    } else {
      food = { id:customId, name, unit:'1 serving', category:'custom', cal:totalCal, protein:totalP, carbs:totalC, fat:totalF };
      addAmt=1; addUnit='1 serving';
      showToast(`${name} added`);
    }
    state.customFoodDefs[customId] = food;
    items.push({ foodId:customId, amount:addAmt, unitLabel:addUnit, custom:true });
  } else {
    if (!addFoodContext.selectedFoodId) { showToast('Pick a food'); return; }
    const amount = parseFloat(document.getElementById('addFoodAmountInput').value);
    if (!amount||amount<=0) { showToast('Enter a valid amount'); return; }
    const food = getFood(addFoodContext.selectedFoodId);
    items.push({ foodId:food.id, amount, unitLabel: food.unit==='100g'?`${amount}g`:food.unit==='100ml'?`${amount}ml`:`${amount} × ${food.unit}` });
    showToast(`Added ${food.name}`);
  }
  saveState(); closeAddFoodModal(); haptic('light');
  renderEat();
  if (currentView==='today') renderToday();
}

// ============================================================
// STEPS MODAL
// ============================================================
function openStepsModal() {
  const log = getDayLog(todayKey());
  const inp = document.getElementById('stepsInput');
  const cal = document.getElementById('stepsCalInput');
  if (inp) inp.value = log.steps?log.steps.steps:'';
  if (cal) cal.value = log.steps&&log.steps.fromWatch?log.steps.kcal:'';
  document.getElementById('stepsModalBackdrop').classList.add('open');
}
function closeStepsModal() { document.getElementById('stepsModalBackdrop').classList.remove('open'); }
function logSteps() {
  const steps = parseInt(document.getElementById('stepsInput').value,10);
  if (!steps||steps<=0) { showToast('Enter valid step count'); return; }
  const watchCal = parseFloat(document.getElementById('stepsCalInput').value);
  const w = state.currentWeight||PROFILE.startWeightKg;
  const kcal = (watchCal&&watchCal>0) ? Math.round(watchCal) : estimateCaloriesFromSteps(steps,w);
  const log = getDayLog(todayKey());
  log.steps = { steps, kcal, fromWatch:!!(watchCal&&watchCal>0) };
  saveState(); closeStepsModal();
  showToast(`Steps logged — ${kcal} kcal`);
  haptic('light');
  renderToday();
}

// ============================================================
// ACTIVITY MODAL
// ============================================================
function openActivityModal() {
  const sel = document.getElementById('activityType');
  if (sel) sel.innerHTML = ACTIVITY_PRESETS.map(p=>`<option value="${p.id}">${p.label}</option>`).join('')+'<option value="custom">Other (custom)</option>';
  const cf  = document.getElementById('customActivityNameField');
  const cif = document.getElementById('customActivityIntensityField');
  if (cf) cf.style.display='none';
  if (cif) cif.style.display='none';
  const dur = document.getElementById('activityDuration');
  if (dur) dur.value = '';
  document.getElementById('activityModalBackdrop').classList.add('open');
}
function closeActivityModal() { document.getElementById('activityModalBackdrop').classList.remove('open'); }
function toggleCustomActivityFields() {
  const val = document.getElementById('activityType').value;
  const cf  = document.getElementById('customActivityNameField');
  const cif = document.getElementById('customActivityIntensityField');
  if (cf) cf.style.display  = val==='custom'?'block':'none';
  if (cif) cif.style.display= val==='custom'?'block':'none';
}
function logActivity() {
  const typeId = document.getElementById('activityType').value;
  const dur    = parseFloat(document.getElementById('activityDuration').value);
  if (!dur||dur<=0) { showToast('Enter a valid duration'); return; }
  let label, met;
  if (typeId==='custom') {
    label = (document.getElementById('customActivityName').value||'').trim()||'Activity';
    const intId = document.getElementById('customActivityIntensity').value;
    const intOptions = {'light':3.0,'moderate':5.0,'vigorous':7.5,'very_vigorous':10.0};
    met = intOptions[intId]||5.0;
  } else {
    const preset = ACTIVITY_PRESETS.find(p=>p.id===typeId);
    label = preset?preset.label:'Activity';
    met   = MET_VALUES[preset?preset.met:'sports_general']||5;
  }
  const w    = state.currentWeight||PROFILE.startWeightKg;
  const kcal = Math.round(met*w*(dur/60));
  const log  = getDayLog(todayKey());
  log.activities.push({ id:Date.now(), label, durationMin:dur, kcal, intensity:typeId==='custom'?document.getElementById('customActivityIntensity').value:'' });
  applyMealAutoScale(todayKey(), todayDayId());
  saveState(); closeActivityModal();
  showToast(`${label} — +${kcal} kcal burned`);
  haptic('light');
  renderToday();
  if (currentView==='train') renderTrain();
}

// ============================================================
// PROGRESS VIEW
// ============================================================
function renderProgress() {
  renderHairTracker();
  renderWeightSection();
  renderMeasurements();
  renderWorkoutHistory();
  renderWeeklyAverages();
}

function renderHairTracker() {
  const el     = document.getElementById('hairDayCount');
  const tl     = document.getElementById('hairTimeline');
  const nxt    = document.getElementById('hairNextEvent');
  if (!el||!tl) return;
  const now    = new Date();
  const daysOn = Math.max(0, Math.floor((now - HAIR_START) / 86400000));
  el.textContent = daysOn;

  // Dermaroller next Wednesday
  if (daysOn >= 35) {
    const dow = now.getDay();
    const toWed = (3-dow+7)%7;
    if (nxt) nxt.textContent = toWed===0 ? '🔁 Dermaroller day today!' : `Dermaroller in ${toWed} day${toWed>1?'s':''} (Wednesday)`;
  } else {
    const daysToStart = 35 - daysOn;
    if (nxt) nxt.textContent = `Dermaroller starts in ${daysToStart} day${daysToStart>1?'s':''} (Day 35)`;
  }

  // Timeline
  const lastReached = [...HAIR_MILESTONES].reverse().find(m => daysOn >= m.day);
  tl.innerHTML = HAIR_MILESTONES.map(m => {
    const reached = daysOn >= m.day;
    const isCurrent = lastReached && m.day === lastReached.day && m.day > 0;
    const milestoneDate = new Date(HAIR_START);
    milestoneDate.setDate(milestoneDate.getDate() + m.day);
    const dateStr = milestoneDate.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
    let cls = reached ? (isCurrent?'current':'reached') : 'upcoming';
    return `<div class="hair-milestone">
      <div class="hair-dot ${cls}">${m.emoji}</div>
      <div class="hair-milestone-info">
        <div class="hair-milestone-title">Day ${m.day} — ${m.label}</div>
        <div class="hair-milestone-date">${dateStr}${reached?' ✓':''}</div>
        <div class="hair-milestone-desc">${m.desc}</div>
      </div>
    </div>`;
  }).join('');
}

function renderWeightSection() {
  setText('weightStart',   PROFILE.startWeightKg+'kg');
  setText('weightCurrent', (state.currentWeight||PROFILE.startWeightKg)+'kg');
  drawWeightChart();
}

function drawWeightChart() {
  const svg = document.getElementById('weightChart');
  if (!svg) return;
  const log = state.weightLog||[];
  if (!log.length) { svg.innerHTML=`<text x="160" y="90" fill="#6B7480" font-size="12" text-anchor="middle">No weight entries yet</text>`; return; }
  const weights = log.map(w=>w.weight);
  const minW = Math.min(...weights, PROFILE.targetWeightKg)-1;
  const maxW = Math.max(...weights, PROFILE.startWeightKg)+1;
  const W=320,H=180,pX=14,pY=14;
  const xStep = log.length>1?(W-pX*2)/(log.length-1):0;
  const yFor  = v => H-pY-((v-minW)/(maxW-minW))*(H-pY*2);
  const pts   = log.map((e,i)=>`${pX+i*xStep},${yFor(e.weight)}`).join(' ');
  const dots  = log.map((e,i)=>`<circle cx="${pX+i*xStep}" cy="${yFor(e.weight)}" r="3" fill="var(--accent)"/>`).join('');
  svg.innerHTML = `
    <line x1="0" y1="${yFor(PROFILE.targetWeightKg)}" x2="${W}" y2="${yFor(PROFILE.targetWeightKg)}" stroke="var(--good)" stroke-width="1" stroke-dasharray="4,4" opacity="0.6"/>
    <polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${dots}`;
}

function logWeight() {
  const val = parseFloat(document.getElementById('weightInput').value);
  if (!val||val<=0) { showToast('Enter a valid weight'); return; }
  state.currentWeight = val;
  const dateKey = todayKey();
  const idx = (state.weightLog||[]).findIndex(w=>w.date===dateKey);
  if (idx>=0) state.weightLog[idx].weight=val;
  else { state.weightLog=state.weightLog||[]; state.weightLog.push({date:dateKey,weight:val}); }
  state.weightLog.sort((a,b)=>a.date.localeCompare(b.date));
  applyMealAutoScale(dateKey, todayDayId());
  saveState();
  const inp = document.getElementById('weightInput');
  if (inp) inp.value='';
  showToast('Weight saved');
  haptic('success');
  renderProgress();
}

function renderMeasurements() {
  const grid = document.getElementById('measureGrid');
  if (!grid) return;
  const log = state.measureLog||[];
  const latest = log[log.length-1];
  const baseline = log[0];
  const fields = [
    {id:'waist',label:'Waist',goal:'down'},{id:'chest',label:'Chest',goal:'up'},
    {id:'hips',label:'Hips',goal:'down'},{id:'thigh',label:'Thigh',goal:'down'},
    {id:'arm',label:'Arm',goal:'up'},{id:'neck',label:'Neck',goal:'neutral'}
  ];
  grid.innerHTML = fields.map(f => {
    const val  = latest?latest[f.id]:null;
    const base = baseline?baseline[f.id]:null;
    const diff = val&&base ? (val-base).toFixed(1) : null;
    const isGood = diff ? (f.goal==='down'?diff<0:f.goal==='up'?diff>0:false) : false;
    return `<div class="measure-cell">
      <div class="mv">${val?val+'cm':'—'}</div>
      <div class="ml">${f.label}</div>
      ${diff?`<div class="mdiff ${isGood?'loss':'gain'}">${diff>0?'+':''}${diff}cm from start</div>`:''}
    </div>`;
  }).join('');
  if (latest) {
    const note = document.createElement('div');
    note.style.cssText='font-size:11px;color:var(--text-tertiary);margin-top:10px;grid-column:1/-1';
    note.textContent = `Last logged: ${new Date(latest.date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}`;
    grid.appendChild(note);
  }
}

function openMeasureModal() {
  ['mWaist','mChest','mHips','mThigh','mArm','mNeck'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('measureModalBackdrop').classList.add('open');
}
function closeMeasureModal() { document.getElementById('measureModalBackdrop').classList.remove('open'); }
function saveMeasurements() {
  const fields = [{id:'waist',inp:'mWaist'},{id:'chest',inp:'mChest'},{id:'hips',inp:'mHips'},{id:'thigh',inp:'mThigh'},{id:'arm',inp:'mArm'},{id:'neck',inp:'mNeck'}];
  const entry = { date: new Date().toISOString() };
  let any = false;
  fields.forEach(f=>{const v=parseFloat(document.getElementById(f.inp).value);if(v>0){entry[f.id]=v;any=true;}});
  if (!any) { showToast('Fill at least one field'); return; }
  state.measureLog = state.measureLog||[];
  const todayStr = todayKey();
  const idx = state.measureLog.findIndex(m=>m.date.startsWith(todayStr));
  if (idx>=0) state.measureLog[idx]=entry; else state.measureLog.push(entry);
  saveState(); closeMeasureModal(); haptic('success');
  showToast('Measurements saved');
  renderMeasurements();
}

function renderWorkoutHistory() {
  const cal   = document.getElementById('historyCal');
  const label = document.getElementById('historyMonthLabel');
  if (!cal) return;
  const today = new Date();
  const days  = [];
  for (let i=29;i>=0;i--) { const d=new Date(today);d.setDate(d.getDate()-i);days.push(d); }
  if (label) {
    const f=days[0],l=days[days.length-1];
    const fm=f.toLocaleDateString('en-US',{month:'short'}),lm=l.toLocaleDateString('en-US',{month:'short',year:'numeric'});
    label.textContent = fm===lm.split(' ')[0] ? f.toLocaleDateString('en-US',{month:'long',year:'numeric'}) : `${fm} – ${lm}`;
  }
  cal.innerHTML = days.map(d=>{
    const key   = todayKey(d);
    const dayId = todayDayId(d);
    const log   = state.days[key];
    const planDay=EXERCISE_PLAN.find(p=>p.id===dayId);
    const total  = planDay?planDay.exercises.length:0;
    const done   = log?Object.values(log.exercises||{}).filter(e=>e.completed).length:0;
    const isToday= key===todayKey();
    let cls='rest';
    if(done>=total&&total>0) cls='full';
    else if(done>0) cls='partial';
    return `<div class="history-day ${cls} ${isToday?'today-ring':''}" title="${d.toLocaleDateString('en-US',{month:'short',day:'numeric'})}: ${done}/${total}">${d.toLocaleDateString('en-US',{weekday:'narrow'})}</div>`;
  }).join('');
}

function renderWeeklyAverages() {
  const today=new Date();
  let tCal=0,tProt=0,tBurn=0,wDays=0,dDays=0;
  for(let i=0;i<7;i++){
    const d=new Date(today);d.setDate(d.getDate()-i);
    const key=todayKey(d),dayId=todayDayId(d);
    const log=state.days[key];
    if(!log) continue;
    dDays++;
    const eaten=computeDayEatenTotals(key,dayId);
    tCal+=eaten.cal; tProt+=eaten.protein; tBurn+=getDayTotalBurn(key);
    if(Object.values(log.exercises||{}).some(e=>e.completed)) wDays++;
  }
  const div=dDays||1;
  setText('weekAvgCal',     Math.round(tCal/div));
  setText('weekAvgProtein', Math.round(tProt/div)+'g');
  setText('weekAvgBurn',    Math.round(tBurn/div));
  setText('weekWorkouts',   wDays+'/7');
}

// ============================================================
// EXPORT / IMPORT
// ============================================================
function exportData() {
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=`protocol-backup-${todayKey()}.json`;a.click();
  URL.revokeObjectURL(url);
  showToast('Backup downloaded');
}
function importData(event) {
  const file=event.target.files[0];if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const p=JSON.parse(e.target.result);
      if(!p.days) throw new Error('Invalid');
      state=p; saveState();
      showToast('Data restored');
      renderToday();renderTrain();renderEat();renderProgress();
    }catch{showToast('Import failed');}
  };
  reader.readAsText(file);event.target.value='';
}

// ============================================================
// ONBOARDING
// ============================================================
function showOnboarding() {
  if (state.onboardingDone) return;
  onboardingStep=0; renderOnboardingStep();
  const ov=document.getElementById('onboardingOverlay');
  if(ov) ov.classList.remove('hidden');
}
function renderOnboardingStep() {
  const s=ONBOARDING_STEPS[onboardingStep];
  setText('onboardingIcon',s.icon); setText('onboardingTitle',s.title); setText('onboardingDesc',s.desc);
  const btn=document.getElementById('onboardingBtn');
  if(btn) btn.textContent=onboardingStep===ONBOARDING_STEPS.length-1?"Let's go!":'Next';
  const dots=document.getElementById('onboardingDots');
  if(dots) dots.innerHTML=ONBOARDING_STEPS.map((_,i)=>`<div class="onboarding-dot ${i===onboardingStep?'active':''}"></div>`).join('');
}
function onboardingNext() { haptic('light'); onboardingStep++; if(onboardingStep>=ONBOARDING_STEPS.length) skipOnboarding(); else renderOnboardingStep(); }
function skipOnboarding() { state.onboardingDone=true; saveState(); const ov=document.getElementById('onboardingOverlay'); if(ov) ov.classList.add('hidden'); }

// ============================================================
// INIT
// ============================================================
function init() {
  console.log('Protocol app.js build: 2026-07-03-body-heatmap-greeting');
  applyTheme();
  initOfflineIndicator();
  updateHeaderDate();
  renderToday();
  showOnboarding();
}
init();
