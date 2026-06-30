// ============================================================
// STATE & STORAGE
// ============================================================
const STORAGE_KEY = 'protocol_app_state_v1';
const DAY_ORDER = ['sun','mon','tue','wed','thu','fri','sat'];
const DAY_ID_BY_INDEX = ['sun','mon','tue','wed','thu','fri','sat'];

function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function todayDayId(date = new Date()) {
  return DAY_ID_BY_INDEX[date.getDay()];
}

function defaultDayLog() {
  return {
    exercises: {},      // exerciseId -> { sets, reps, durationSec, completed, kcal }
    activities: [],      // [{id, label, durationMin, kcal}]
    customWorkouts: [],  // [{id, name, metKey, sets, reps/durationSec, kcal}]
    customFoods: {},     // mealId -> [{id, name, cal, protein, carbs, fat}]
    steps: null,          // { steps, kcal }
    meals: {},            // mealId -> { items: [{foodId, amount, unitLabel, swapped}], swaps: {} }
    weight: null,
    mealScaleFactor: null // set when exercise burn triggers auto-scaling
  };
}

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed.days) parsed.days = {};
      if (!parsed.weightLog) parsed.weightLog = [];
      if (!parsed.currentWeight) parsed.currentWeight = PROFILE.startWeightKg;
      if (!parsed.customFoodDefs) parsed.customFoodDefs = {};
      return parsed;
    }
  } catch (e) { console.error('Load failed', e); }
  return { days: {}, weightLog: [], currentWeight: PROFILE.startWeightKg, customFoodDefs: {} };
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Save failed', e);
    showToast('Storage error — could not save');
  }
}

function getDayLog(dateKey) {
  if (!state.days[dateKey]) state.days[dateKey] = defaultDayLog();
  // backfill any missing fields for older saved logs
  const d = state.days[dateKey];
  if (!d.exercises) d.exercises = {};
  if (!d.activities) d.activities = [];
  if (!d.customWorkouts) d.customWorkouts = [];
  if (!d.customFoods) d.customFoods = {};
  if (!d.meals) d.meals = {};
  if (!d.mealChoices) d.mealChoices = {};
  if (d.mealScaleFactor === undefined) d.mealScaleFactor = null;
  return d;
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
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// ============================================================
// VIEW SWITCHING
// ============================================================
let currentView = 'today';
function switchView(view) {
  currentView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + view).classList.add('active');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  if (view === 'today') renderToday();
  if (view === 'train') renderTrain();
  if (view === 'eat') renderEat();
  if (view === 'progress') renderProgress();
}

// ============================================================
// CALORIE / MACRO ENGINE
// ============================================================
function getExerciseKcal(ex, overrides) {
  const weight = state.currentWeight || PROFILE.startWeightKg;
  const met = MET_VALUES[ex.metKey] || 4;
  let totalSeconds;
  if (ex.durationSec) {
    // hold/duration-based exercise; allow override of duration
    const durSec = (overrides && overrides.durationSec) || ex.durationSec;
    totalSeconds = durSec * ex.sets;
  } else {
    // rep-based; estimate ~3 sec per rep as time under tension, plus implicit rest already separate
    const reps = (overrides && overrides.reps) || ex.reps || 10;
    const sets = (overrides && overrides.sets) || ex.sets;
    totalSeconds = reps * 3 * sets;
  }
  const minutes = totalSeconds / 60;
  return Math.round(met * weight * (minutes / 60));
}

function getTodayBaseTarget() {
  return calcBaseTarget(state.currentWeight || PROFILE.startWeightKg);
}

function getDayExerciseBurn(dateKey) {
  const log = getDayLog(dateKey);
  let total = 0;
  Object.values(log.exercises).forEach(e => { if (e.completed) total += (e.kcal || 0); });
  (log.customWorkouts || []).forEach(w => { total += (w.kcal || 0); });
  return total;
}

function getDayActivityBurn(dateKey) {
  const log = getDayLog(dateKey);
  return (log.activities || []).reduce((sum, a) => sum + (a.kcal || 0), 0);
}

function getDayStepsBurn(dateKey) {
  const log = getDayLog(dateKey);
  return log.steps ? (log.steps.kcal || 0) : 0;
}

function getDayTotalBurn(dateKey) {
  return getDayExerciseBurn(dateKey) + getDayActivityBurn(dateKey) + getDayStepsBurn(dateKey);
}

function getDayTarget(dateKey) {
  // Note: step-based NEAT is already folded into the 1.55 activity multiplier baseline,
  // so we only add *planned exercise + logged extra activity* on top, not steps,
  // to avoid double counting incidental daily movement.
  const base = getTodayBaseTarget();
  const exerciseBurn = getDayExerciseBurn(dateKey) + getDayActivityBurn(dateKey);
  return Math.round(base + exerciseBurn);
}

function getMacroTargetsForDay(dateKey) {
  const targetKcal = getDayTarget(dateKey);
  const baseKcal = getTodayBaseTarget();
  const extraKcal = targetKcal - baseKcal;
  // keep base macros as the diet plan prescribes; allocate extra calories from exercise
  // using a 40% carb / 35% protein / 25% fat split (supports recovery without derailing protein priority)
  const extraProtein = Math.round((extraKcal * 0.35) / 4);
  const extraCarbs = Math.round((extraKcal * 0.40) / 4);
  const extraFat = Math.round((extraKcal * 0.25) / 9);
  return {
    calories: targetKcal,
    protein: PROFILE.baseMacroTargets.protein + Math.max(0, extraProtein),
    carbs: PROFILE.baseMacroTargets.carbs + Math.max(0, extraCarbs),
    fat: PROFILE.baseMacroTargets.fat + Math.max(0, extraFat)
  };
}

// ============================================================
// MEAL AUTO-SCALING — when exercise burn rises, scale up the
// carb/fat staple items in lunch + dinner to absorb the surplus.
// Protein items (whey, protein bars, beans/dal/tofu/paneer) stay
// fixed so the protein target isn't accidentally blown past.
// ============================================================
const SCALABLE_MEAL_IDS = ['lunch', 'dinner'];
const SCALABLE_FOOD_CATEGORIES = ['carb', 'fat'];

function applyMealAutoScale(dateKey, dayId) {
  const log = getDayLog(dateKey);
  const baseKcal = getTodayBaseTarget();
  const targetKcal = getDayTarget(dateKey);
  const extraKcal = targetKcal - baseKcal;

  // figure out how many "scalable" calories exist across lunch+dinner, always measured
  // from each item's ORIGINAL (pre-scaling) amount so repeated scaling never compounds
  let scalableBaseKcal = 0;
  SCALABLE_MEAL_IDS.forEach(mealId => {
    const items = getMealItems(dateKey, dayId, mealId);
    items.forEach(item => {
      const food = getFood(item.foodId);
      if (food && SCALABLE_FOOD_CATEGORIES.includes(food.category)) {
        const originalAmount = item._baseAmount || item.amount;
        scalableBaseKcal += computeItemMacros({ ...item, amount: originalAmount }).cal;
      }
    });
  });

  if (extraKcal <= 20 || scalableBaseKcal <= 0) {
    // no meaningful surplus, or nothing to scale — reset any previous scaling
    if (log.mealScaleFactor) {
      resetMealScaling(dateKey, dayId);
    }
    return;
  }

  // target: scalable items should grow enough to absorb ~80% of the surplus
  // (leaving ~20% as a small natural buffer rather than overshooting exactly)
  const desiredAddedKcal = extraKcal * 0.8;
  const scaleFactor = 1 + (desiredAddedKcal / scalableBaseKcal);
  const cappedFactor = Math.min(scaleFactor, 2.2); // sanity cap — never more than 2.2x a portion

  SCALABLE_MEAL_IDS.forEach(mealId => {
    const items = getMealItems(dateKey, dayId, mealId);
    items.forEach(item => {
      const food = getFood(item.foodId);
      if (!food || !SCALABLE_FOOD_CATEGORIES.includes(food.category)) return;
      if (!item._baseAmount) item._baseAmount = item.amount; // remember true original before any scaling
      item.amount = +(item._baseAmount * cappedFactor).toFixed(1);
      item._scaledFrom = item._baseAmount;
      item.unitLabel = food.unit === '100g'
        ? `${item.amount}g (scaled up for training)`
        : `${item.amount} × ${food.unit} (scaled up for training)`;
    });
  });

  log.mealScaleFactor = +cappedFactor.toFixed(2);
}

function resetMealScaling(dateKey, dayId) {
  const log = getDayLog(dateKey);
  SCALABLE_MEAL_IDS.forEach(mealId => {
    const items = getMealItems(dateKey, dayId, mealId);
    items.forEach(item => {
      if (item._baseAmount) {
        const food = getFood(item.foodId);
        item.amount = item._baseAmount;
        item.unitLabel = food.unit === '100g' ? `${item.amount}g` : `${item.amount} × ${food.unit}`;
        delete item._scaledFrom;
      }
    });
  });
  log.mealScaleFactor = null;
}

function getFood(foodId) {
  const fromDb = FOOD_DB.find(f => f.id === foodId);
  if (fromDb) return fromDb;
  // check persisted custom foods (survives page reload, unlike session-only FOOD_DB pushes)
  if (state.customFoodDefs && state.customFoodDefs[foodId]) return state.customFoodDefs[foodId];
  return null;
}

function computeItemMacros(item) {
  const food = getFood(item.foodId);
  if (!food) return { cal: 0, protein: 0, carbs: 0, fat: 0 };
  // amount is interpreted relative to food.unit
  // '100g' or '100ml' → amount is grams/ml, divide by 100 to get factor
  // anything else (1 scoop, 1 tbsp, 1 piece, etc.) → amount is multiples of that unit
  let factor;
  if (food.unit === '100g' || food.unit === '100ml') factor = item.amount / 100;
  else factor = item.amount;
  return {
    cal: Math.round(food.cal * factor),
    protein: +(food.protein * factor).toFixed(1),
    carbs: +(food.carbs * factor).toFixed(1),
    fat: +(food.fat * factor).toFixed(1)
  };
}

// Get the chosen option ID for a meal on a given day
function getMealChoice(dateKey, dayId, mealId) {
  const log = getDayLog(dateKey);
  if (log.mealChoices && log.mealChoices[mealId]) return log.mealChoices[mealId];
  return (WEEKLY_DEFAULT_CHOICES[dayId] && WEEKLY_DEFAULT_CHOICES[dayId][mealId])
    ? WEEKLY_DEFAULT_CHOICES[dayId][mealId]
    : (MEAL_OPTIONS[mealId] && MEAL_OPTIONS[mealId][0] ? MEAL_OPTIONS[mealId][0].id : null);
}

// Get the option object for a meal on a given day
function getMealOption(dateKey, dayId, mealId) {
  const choiceId = getMealChoice(dateKey, dayId, mealId);
  return MEAL_OPTIONS[mealId] ? MEAL_OPTIONS[mealId].find(o => o.id === choiceId) || MEAL_OPTIONS[mealId][0] : null;
}

// Get the live items array for a meal (user edits/swaps are layered on top of the option's base items)
function getMealItems(dateKey, dayId, mealId) {
  const log = getDayLog(dateKey);
  // if user has manually edited this meal's items (swaps/adds), use those
  if (log.meals[mealId] && log.meals[mealId].items && log.meals[mealId].lockedToChoice) {
    return log.meals[mealId].items;
  }
  // otherwise build fresh from the chosen option (deep copy so mutations don't affect template)
  const option = getMealOption(dateKey, dayId, mealId);
  const baseItems = option ? option.items.map(i => ({ ...i })) : [];
  log.meals[mealId] = { items: baseItems, lockedToChoice: getMealChoice(dateKey, dayId, mealId) };
  return baseItems;
}

// Switch the meal option for today — resets that meal's items to the new option's template
function switchMealOption(mealId, optionId) {
  const dateKey = todayKey();
  const dayId = todayDayId();
  const log = getDayLog(dateKey);
  if (!log.mealChoices) log.mealChoices = {};
  log.mealChoices[mealId] = optionId;
  // reset items so they come fresh from the new option
  delete log.meals[mealId];
  saveState();
  renderEat();
  if (currentView === 'today') renderToday();
  // re-apply scaling since meal base has changed
  applyMealAutoScale(dateKey, dayId);
  saveState();
  const option = MEAL_OPTIONS[mealId] ? MEAL_OPTIONS[mealId].find(o => o.id === optionId) : null;
  showToast(option ? `Switched to ${option.label}` : 'Meal updated');
}

function computeMealTotals(items) {
  return items.reduce((acc, item) => {
    const m = computeItemMacros(item);
    acc.cal += m.cal; acc.protein += m.protein; acc.carbs += m.carbs; acc.fat += m.fat;
    return acc;
  }, { cal: 0, protein: 0, carbs: 0, fat: 0 });
}

function computeDayEatenTotals(dateKey, dayId) {
  let total = { cal: 0, protein: 0, carbs: 0, fat: 0 };
  MEAL_WINDOWS.forEach(mw => {
    const items = getMealItems(dateKey, dayId, mw.id);
    const t = computeMealTotals(items);
    total.cal += t.cal; total.protein += t.protein; total.carbs += t.carbs; total.fat += t.fat;
  });
  return total;
}

// ============================================================
// HEADER DATE
// ============================================================
function updateHeaderDate() {
  const d = new Date();
  const opts = { weekday: 'short', month: 'short', day: 'numeric' };
  document.getElementById('headerDate').textContent = d.toLocaleDateString('en-US', opts);
}

// ============================================================
// TODAY VIEW
// ============================================================
function renderToday() {
  const dateKey = todayKey();
  const dayId = todayDayId();
  const target = getDayTarget(dateKey);
  const eaten = computeDayEatenTotals(dateKey, dayId);
  const burned = getDayTotalBurn(dateKey);
  const remaining = target - eaten.cal;

  document.getElementById('statTarget').textContent = target;
  document.getElementById('statEaten').textContent = Math.round(eaten.cal);
  document.getElementById('statBurned').textContent = burned;

  const circumference = 2 * Math.PI * 95;
  const pct = Math.max(0, Math.min(1, remaining / target));
  const ringFg = document.getElementById('ringFg');
  ringFg.setAttribute('stroke-dasharray', circumference);
  ringFg.setAttribute('stroke-dashoffset', circumference * (1 - pct));
  ringFg.classList.toggle('over', remaining < 0);
  document.getElementById('ringNum').textContent = Math.abs(Math.round(remaining));
  document.getElementById('ringLabel').textContent = remaining < 0 ? 'kcal over budget' : 'kcal remaining';

  const macroTargets = getMacroTargetsForDay(dateKey);
  setMacroBar('Protein', eaten.protein, macroTargets.protein);
  document.getElementById('macroProteinNums').textContent = `${Math.round(eaten.protein)} / ${macroTargets.protein}g`;
  document.getElementById('macroProteinFill').style.width = Math.min(100, (eaten.protein / macroTargets.protein) * 100) + '%';
  document.getElementById('macroCarbsNums').textContent = `${Math.round(eaten.carbs)} / ${macroTargets.carbs}g`;
  document.getElementById('macroCarbsFill').style.width = Math.min(100, (eaten.carbs / macroTargets.carbs) * 100) + '%';
  document.getElementById('macroFatNums').textContent = `${Math.round(eaten.fat)} / ${macroTargets.fat}g`;
  document.getElementById('macroFatFill').style.width = Math.min(100, (eaten.fat / macroTargets.fat) * 100) + '%';

  renderTodayExerciseLog(dateKey, dayId);
  renderTodayActivityLog(dateKey);
  renderTodayStepsLog(dateKey);
}

function setMacroBar() { /* placeholder kept for compatibility, handled inline above */ }

function renderTodayExerciseLog(dateKey, dayId) {
  const log = getDayLog(dateKey);
  const day = EXERCISE_PLAN.find(d => d.id === dayId);
  const completedEntries = Object.entries(log.exercises).filter(([id, e]) => e.completed);
  const container = document.getElementById('todayExerciseLog');
  if (!completedEntries.length) {
    container.innerHTML = `<div class="empty-state">Nothing logged yet today. Head to Train to check off exercises.</div>`;
    return;
  }
  container.innerHTML = completedEntries.map(([id, e]) => {
    const ex = day ? day.exercises.find(x => x.id === id) : null;
    const name = ex ? ex.name : id;
    return `<div class="log-item">
      <div><div class="log-item-name">${name}</div><div class="log-item-meta">${e.sets} sets</div></div>
      <div class="log-item-val">${e.kcal} kcal</div>
    </div>`;
  }).join('');
}

function renderTodayActivityLog(dateKey) {
  const log = getDayLog(dateKey);
  const container = document.getElementById('todayActivityLog');
  if (!log.activities.length) {
    container.innerHTML = `<div class="empty-state">No extra activity logged. Tap "Log activity" above.</div>`;
    return;
  }
  container.innerHTML = log.activities.map((a, idx) => `
    <div class="log-item">
      <div><div class="log-item-name">${a.label}</div><div class="log-item-meta">${a.durationMin} min</div></div>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="log-item-val">${a.kcal} kcal</div>
        <button class="log-item-del" onclick="removeActivity(${idx})" aria-label="Remove">×</button>
      </div>
    </div>`).join('');
}

function renderTodayStepsLog(dateKey) {
  const log = getDayLog(dateKey);
  const container = document.getElementById('todayStepsLog');
  if (!log.steps) {
    container.innerHTML = `<div class="empty-state">Steps not logged yet today.</div>`;
    return;
  }
  container.innerHTML = `<div class="log-item">
    <div><div class="log-item-name">${log.steps.steps.toLocaleString()} steps</div><div class="log-item-meta">Galaxy Watch 7</div></div>
    <div class="log-item-val">${log.steps.kcal} kcal</div>
  </div>`;
}

function removeActivity(idx) {
  const dateKey = todayKey();
  const log = getDayLog(dateKey);
  log.activities.splice(idx, 1);
  applyMealAutoScale(dateKey, todayDayId());
  saveState();
  renderToday();
}

// ============================================================
// ACTIVITY MODAL
// ============================================================
const CUSTOM_INTENSITY_MET = { light: 3.0, moderate: 5.0, vigorous: 8.0 };

function openActivityModal() {
  const select = document.getElementById('activityType');
  select.innerHTML = ACTIVITY_PRESETS.map(p => `<option value="${p.id}">${p.label}</option>`).join('')
    + `<option value="custom">Other (custom)</option>`;
  select.value = ACTIVITY_PRESETS[0].id;
  toggleCustomActivityFields();
  document.getElementById('activityModalBackdrop').classList.add('open');
}
function closeActivityModal() {
  document.getElementById('activityModalBackdrop').classList.remove('open');
}
function toggleCustomActivityFields() {
  const isCustom = document.getElementById('activityType').value === 'custom';
  document.getElementById('customActivityNameField').style.display = isCustom ? 'block' : 'none';
  document.getElementById('customActivityIntensityField').style.display = isCustom ? 'block' : 'none';
}
function logActivity() {
  const typeId = document.getElementById('activityType').value;
  const duration = parseFloat(document.getElementById('activityDuration').value);
  if (!duration || duration <= 0) { showToast('Enter a valid duration'); return; }

  let label, metKey, met;
  if (typeId === 'custom') {
    const customName = document.getElementById('customActivityName').value.trim();
    if (!customName) { showToast('Enter what you did'); return; }
    const intensity = document.getElementById('customActivityIntensity').value;
    label = customName;
    met = CUSTOM_INTENSITY_MET[intensity] || CUSTOM_INTENSITY_MET.moderate;
  } else {
    const preset = ACTIVITY_PRESETS.find(p => p.id === typeId);
    metKey = preset ? preset.met : 'sports_general';
    label = preset ? preset.label : 'Activity';
    met = MET_VALUES[metKey] || 5;
  }

  const weight = state.currentWeight || PROFILE.startWeightKg;
  const kcal = Math.round(met * weight * (duration / 60));

  const dateKey = todayKey();
  const log = getDayLog(dateKey);
  log.activities.push({ id: Date.now(), label, durationMin: duration, kcal });
  applyMealAutoScale(dateKey, todayDayId());
  saveState();
  closeActivityModal();
  document.getElementById('activityDuration').value = '';
  document.getElementById('customActivityName').value = '';
  showToast(`Logged ${label} — +${kcal} kcal, meals scaled up`);
  renderToday();
  if (currentView === 'eat') renderEat();
  if (currentView === 'train') renderTrain();
}

// ============================================================
// STEPS MODAL
// ============================================================
function openStepsModal() {
  const dateKey = todayKey();
  const log = getDayLog(dateKey);
  document.getElementById('stepsInput').value = log.steps ? log.steps.steps : '';
  document.getElementById('stepsCalInput').value = log.steps && log.steps.fromWatch ? log.steps.kcal : '';
  document.getElementById('stepsModalBackdrop').classList.add('open');
}
function closeStepsModal() {
  document.getElementById('stepsModalBackdrop').classList.remove('open');
}
function logSteps() {
  const steps = parseInt(document.getElementById('stepsInput').value, 10);
  if (!steps || steps <= 0) { showToast('Enter a valid step count'); return; }
  const watchCal = parseFloat(document.getElementById('stepsCalInput').value);
  const weight = state.currentWeight || PROFILE.startWeightKg;
  const kcal = (watchCal && watchCal > 0) ? Math.round(watchCal) : estimateCaloriesFromSteps(steps, weight);
  const fromWatch = !!(watchCal && watchCal > 0);

  const dateKey = todayKey();
  const log = getDayLog(dateKey);
  log.steps = { steps, kcal, fromWatch };
  saveState();
  closeStepsModal();
  showToast(`Steps logged${fromWatch ? '' : ' (estimated)'}`);
  renderToday();
}

// ============================================================
// TRAIN VIEW
// ============================================================
let selectedTrainDay = todayDayId();
let openExerciseDetail = {};

function renderTrainDayStrip() {
  const strip = document.getElementById('trainDayStrip');
  const labels = { sun:'Sun', mon:'Mon', tue:'Tue', wed:'Wed', thu:'Thu', fri:'Fri', sat:'Sat' };
  strip.innerHTML = EXERCISE_PLAN.map(d => {
    const isToday = d.id === todayDayId();
    return `<button class="day-chip ${d.id === selectedTrainDay ? 'active' : ''} ${isToday ? 'today-marker' : ''}"
      onclick="selectTrainDay('${d.id}')">${labels[d.id]}</button>`;
  }).join('');
}

function selectTrainDay(dayId) {
  selectedTrainDay = dayId;
  renderTrain();
}

function renderTrain() {
  renderTrainDayStrip();
  const day = EXERCISE_PLAN.find(d => d.id === selectedTrainDay);
  const themeCard = document.getElementById('trainThemeCard');
  themeCard.innerHTML = `
    <div class="day-theme-row">
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
    </div>
  `;

  const list = document.getElementById('trainExerciseList');
  let circuitHtml = '';
  if (day.isCircuit) {
    circuitHtml = `<div class="circuit-banner">Circuit format — ${day.circuitRounds} rounds, all exercises back to back. Rest ${day.circuitExerciseRestSec}s between exercises, ${day.circuitRoundRestSec}s between rounds.</div>`;
  }

  const dateKey = todayKey();
  const log = getDayLog(dateKey);
  const isViewingToday = selectedTrainDay === todayDayId();

  list.innerHTML = circuitHtml + day.exercises.map(ex => {
    const saved = log.exercises[ex.id];
    const completed = isViewingToday && saved && saved.completed;
    const sets = saved ? saved.sets : ex.sets;
    const repsOrDur = ex.durationSec
      ? (saved ? saved.durationSec : ex.durationSec)
      : (saved ? saved.reps : ex.reps);
    const previewKcal = getExerciseKcal(ex, ex.durationSec ? { durationSec: repsOrDur, sets } : { reps: repsOrDur, sets });
    const isOpen = !!openExerciseDetail[ex.id];

    return `
    <div class="exercise-card">
      <div class="exercise-head">
        <button class="check ${completed ? 'checked' : ''}" onclick="toggleExerciseComplete('${ex.id}')" aria-label="Mark complete">
          <svg viewBox="0 0 24 24" fill="none"><path d="M4 12l5 5L20 6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="exercise-info">
          <div class="exercise-name">${ex.name}</div>
          <div class="exercise-type">${ex.type}</div>
          <div class="exercise-specs">${sets} sets · ${ex.durationSec ? formatDuration(repsOrDur) : repsOrDur + ' reps'} · Rest ${ex.restSec}s</div>
          <div class="exercise-burn">~${previewKcal} kcal at current sets/${ex.durationSec ? 'duration' : 'reps'}</div>
          <div class="set-editor">
            <div class="mini-field">
              <label>Sets</label>
              <input type="number" value="${sets}" min="1" onchange="updateExerciseOverride('${ex.id}', 'sets', this.value)">
            </div>
            ${ex.durationSec ? `
            <div class="mini-field duration-field">
              <label>Sec</label>
              <input type="number" value="${repsOrDur}" min="5" onchange="updateExerciseOverride('${ex.id}', 'durationSec', this.value)">
            </div>` : `
            <div class="mini-field">
              <label>Reps</label>
              <input type="number" value="${repsOrDur}" min="1" onchange="updateExerciseOverride('${ex.id}', 'reps', this.value)">
            </div>`}
          </div>
        </div>
        <button class="exercise-toggle-btn ${isOpen ? 'open' : ''}" onclick="toggleExerciseDetail('${ex.id}')" aria-label="Show details">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </button>
      </div>
      <div class="exercise-detail ${isOpen ? 'open' : ''}">
        <div class="detail-block">
          <div class="detail-label">How to do it</div>
          <ol>${ex.how.map(s => `<li>${s}</li>`).join('')}</ol>
        </div>
        <div class="tip-box">${ex.tip}</div>
        <div class="mistake-box">${ex.mistake}</div>
      </div>
    </div>`;
  }).join('');

  updateTrainDayBurn();
  renderTrainActivityList();
}

function renderTrainActivityList() {
  const dateKey = todayKey();
  const log = getDayLog(dateKey);
  const container = document.getElementById('customWorkoutList');
  if (!container) return;
  if (!log.activities.length) {
    container.innerHTML = `<div class="empty-state">No extra activity logged today.</div>`;
    return;
  }
  container.innerHTML = log.activities.map((a, idx) => `
    <div class="log-item">
      <div><div class="log-item-name">${a.label}</div><div class="log-item-meta">${a.durationMin} min</div></div>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="log-item-val">${a.kcal} kcal</div>
        <button class="log-item-del" onclick="removeActivityFromTrain(${idx})" aria-label="Remove">×</button>
      </div>
    </div>`).join('');
}

function removeActivityFromTrain(idx) {
  const dateKey = todayKey();
  const log = getDayLog(dateKey);
  log.activities.splice(idx, 1);
  applyMealAutoScale(dateKey, selectedTrainDay);
  saveState();
  renderTrain();
  if (currentView === 'today') renderToday();
}

function formatDuration(sec) {
  if (sec >= 60) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s > 0 ? `${m}m ${s}s` : `${m} min`;
  }
  return `${sec}s`;
}

function toggleExerciseDetail(id) {
  openExerciseDetail[id] = !openExerciseDetail[id];
  renderTrain();
}

function updateExerciseOverride(exId, field, rawVal) {
  const val = parseInt(rawVal, 10);
  if (!val || val <= 0) return;
  const day = EXERCISE_PLAN.find(d => d.id === selectedTrainDay);
  const ex = day.exercises.find(e => e.id === exId);
  const dateKey = todayKey();
  const log = getDayLog(dateKey);
  if (!log.exercises[exId]) {
    log.exercises[exId] = {
      sets: ex.sets,
      reps: ex.reps,
      durationSec: ex.durationSec,
      completed: false,
      kcal: 0
    };
  }
  log.exercises[exId][field] = val;
  // recompute kcal preview
  const e = log.exercises[exId];
  e.kcal = getExerciseKcal(ex, ex.durationSec ? { durationSec: e.durationSec, sets: e.sets } : { reps: e.reps, sets: e.sets });
  applyMealAutoScale(dateKey, selectedTrainDay);
  saveState();
  renderTrain();
  if (currentView === 'today') renderToday();
}

function toggleExerciseComplete(exId) {
  const day = EXERCISE_PLAN.find(d => d.id === selectedTrainDay);
  const ex = day.exercises.find(e => e.id === exId);
  const dateKey = todayKey();
  const log = getDayLog(dateKey);
  if (!log.exercises[exId]) {
    log.exercises[exId] = {
      sets: ex.sets,
      reps: ex.reps,
      durationSec: ex.durationSec,
      completed: false,
      kcal: 0
    };
  }
  const e = log.exercises[exId];
  e.completed = !e.completed;
  e.kcal = getExerciseKcal(ex, ex.durationSec ? { durationSec: e.durationSec, sets: e.sets } : { reps: e.reps, sets: e.sets });
  applyMealAutoScale(dateKey, selectedTrainDay);
  saveState();
  renderTrain();
  if (currentView === 'today') renderToday();
  if (e.completed) showToast(`${ex.name} done — +${e.kcal} kcal, meals scaled up`);
  else showToast(`${ex.name} unchecked — meals rebalanced`);
}

function updateTrainDayBurn() {
  const dateKey = todayKey();
  const burn = getDayExerciseBurn(dateKey);
  document.getElementById('trainDayBurn').textContent = burn + ' kcal';
}

function commitDayBurnToLog() {
  saveState();
  showToast('Synced to today\'s log');
  renderToday();
}

// ============================================================
// EAT VIEW
// ============================================================
let selectedEatDay = todayDayId();

function renderEatDayStrip() {
  const strip = document.getElementById('eatDayStrip');
  const labels = { sun:'Sun', mon:'Mon', tue:'Tue', wed:'Wed', thu:'Thu', fri:'Fri', sat:'Sat' };
  strip.innerHTML = DAY_ORDER.map(id => {
    const isToday = id === todayDayId();
    return `<button class="day-chip ${id === selectedEatDay ? 'active' : ''} ${isToday ? 'today-marker' : ''}"
      onclick="selectEatDay('${id}')">${labels[id]}</button>`;
  }).join('');
}
function selectEatDay(dayId) {
  selectedEatDay = dayId;
  renderEat();
}

function renderEat() {
  renderEatDayStrip();
  const dateKey = todayKey();
  const targets = getMacroTargetsForDay(dateKey);
  document.getElementById('eatTargetKcal').textContent = targets.calories;
  document.getElementById('eatTargetProtein').textContent = targets.protein + 'g';

  const list = document.getElementById('eatMealList');
  const isToday = selectedEatDay === todayDayId();

  // show scale factor badge if meals are currently scaled
  const log = getDayLog(dateKey);
  const scaleNote = isToday && log.mealScaleFactor && log.mealScaleFactor > 1
    ? `<div class="meal-note" style="margin-bottom:14px">
        🏋️ Meals scaled ×${log.mealScaleFactor} for today's training — carb/fat portions adjusted. Protein items unchanged.
       </div>` : '';

  list.innerHTML = scaleNote + MEAL_WINDOWS.map(mw => {
    const options = MEAL_OPTIONS[mw.id] || [];
    const choiceId = getMealChoice(dateKey, selectedEatDay, mw.id);
    const items = isToday
      ? getMealItems(dateKey, selectedEatDay, mw.id)
      : (getMealOption(dateKey, selectedEatDay, mw.id) || { items: [] }).items.map(i => ({...i}));
    const totals = computeMealTotals(items);

    // option selector chips — only shown when there are multiple options
    const optionChips = options.length > 1
      ? `<div class="option-chips">
          ${options.map(opt => `
            <button class="option-chip ${opt.id === choiceId ? 'active' : ''}"
              ${isToday ? `onclick="switchMealOption('${mw.id}', '${opt.id}')"` : 'disabled'}
            >${opt.label}</button>
          `).join('')}
         </div>` : '';

    return `
    <div class="card meal-card">
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
      ${optionChips}
      ${items.map((item, idx) => {
        const food = getFood(item.foodId);
        const m = computeItemMacros(item);
        const isScaled = !!item._scaledFrom;
        return `<div class="food-item-row ${isScaled ? 'scaled-row' : ''}">
          <span class="food-item-name">${food ? food.name : item.foodId}
            <span class="food-item-amt">${item.unitLabel || ''}</span>
          </span>
          <span class="food-item-macros">${m.cal}kcal · ${m.protein}p</span>
          ${isToday ? `<span class="food-item-actions">
            <button class="icon-btn" onclick="openSwapModal('${mw.id}', ${idx})" aria-label="Swap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3"/></svg>
            </button>
            <button class="icon-btn" onclick="removeMealItem('${mw.id}', ${idx})" aria-label="Remove">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6"/></svg>
            </button>
          </span>` : ''}
        </div>`;
      }).join('')}
      ${isToday ? `<button class="btn btn-sm" style="margin-top:10px;width:100%" onclick="openAddFoodModal('${mw.id}')">+ Add food to ${mw.label.toLowerCase()}</button>` : ''}
      <div class="meal-totals">
        <span>${Math.round(totals.protein)}g protein</span>
        <span>${Math.round(totals.carbs)}g carbs</span>
        <span>${Math.round(totals.fat)}g fat</span>
      </div>
    </div>`;
  }).join('');
}

function removeMealItem(mealId, itemIdx) {
  const dateKey = todayKey();
  const items = getMealItems(dateKey, selectedEatDay, mealId);
  items.splice(itemIdx, 1);
  saveState();
  renderEat();
  if (currentView === 'today') renderToday();
}

// ============================================================
// FOOD SWAP MODAL
// ============================================================
let swapContext = { mealId: null, itemIdx: null, selectedFoodId: null };

function openSwapModal(mealId, itemIdx) {
  const dateKey = todayKey();
  const items = getMealItems(dateKey, selectedEatDay, mealId);
  const item = items[itemIdx];
  const food = getFood(item.foodId);
  swapContext = { mealId, itemIdx, selectedFoodId: null };
  document.getElementById('swapModalTitle').textContent = `Swap: ${food ? food.name : item.foodId}`;
  document.getElementById('swapSearchInput').value = '';
  document.getElementById('swapAmountInput').value = '';
  document.getElementById('swapUnitHint').textContent = '';
  document.getElementById('recipeSuggestion').style.display = 'none';
  renderSwapResults();
  document.getElementById('swapModalBackdrop').classList.add('open');
}
function closeSwapModal() {
  document.getElementById('swapModalBackdrop').classList.remove('open');
}

function renderSwapResults() {
  const q = document.getElementById('swapSearchInput').value.toLowerCase().trim();
  const results = FOOD_DB.filter(f => !q || f.name.toLowerCase().includes(q));
  const list = document.getElementById('swapResultsList');
  list.innerHTML = results.map(f => `
    <div class="food-result-row ${swapContext.selectedFoodId === f.id ? 'selected' : ''}">
      <div>
        <div class="food-result-name">${f.name}</div>
        <div class="food-result-macro">${f.cal}kcal · ${f.protein}p · ${f.carbs}c · ${f.fat}f per ${f.unit}</div>
      </div>
      <button class="food-result-btn" onclick="selectSwapFood('${f.id}')">Select</button>
    </div>
  `).join('') || `<div class="empty-state">No matches. Try a different search term.</div>`;
}

function selectSwapFood(foodId) {
  swapContext.selectedFoodId = foodId;
  const food = getFood(foodId);
  document.getElementById('swapUnitHint').textContent = `Amount is in multiples of: ${food.unit}${food.unit === '100g' ? ' (e.g. enter 150 for 150g)' : ' (e.g. enter 1 for one ' + food.unit + ')'}`;
  renderSwapResults();
  // suggest a default amount matching the unit type
  document.getElementById('swapAmountInput').value = food.unit === '100g' ? 100 : 1;
  renderRecipeSuggestion(food);
}

function renderRecipeSuggestion(food) {
  const box = document.getElementById('recipeSuggestion');
  const suggestions = {
    protein: `Works well swapped into a curry, stir-fry, or rice bowl the same way as your existing protein options — pan-sear or simmer in your usual dal/curry spices (cumin, turmeric, garam masala) and pair with rice or roti at the same portion logic (¾ cup rice cooked).`,
    carb: `Use as a 1:1 swap for rice or oats in the same meal slot — keep portions close to your existing ¾ cup cooked guideline to stay near your carb target.`,
    fat: `Small-quantity swap — works as a fat source layered into breakfast (oats/toast) or as a dressing on lunch bowls, same way peanut butter or chia is used in your plan.`,
    other: `Use as a direct substitute for the item it's replacing — keep the portion size similar to avoid shifting the meal's calorie total much.`
  };
  box.style.display = 'block';
  box.textContent = `Suggested use: ${suggestions[food.category] || suggestions.other}`;
}

function confirmSwap() {
  if (!swapContext.selectedFoodId) { showToast('Pick a food first'); return; }
  const amount = parseFloat(document.getElementById('swapAmountInput').value);
  if (!amount || amount <= 0) { showToast('Enter a valid amount'); return; }
  const food = getFood(swapContext.selectedFoodId);
  const dateKey = todayKey();
  const items = getMealItems(dateKey, selectedEatDay, swapContext.mealId);
  items[swapContext.itemIdx] = {
    foodId: food.id,
    amount,
    unitLabel: food.unit === '100g' ? `${amount}g` : `${amount} × ${food.unit}`,
    swapped: true
  };
  saveState();
  closeSwapModal();
  showToast(`Swapped to ${food.name}`);
  renderEat();
  if (currentView === 'today') renderToday();
}

// ============================================================
// ADD FOOD MODAL — append a new item (from DB or fully custom)
// ============================================================
// ADD FOOD MODAL — append a new item (from built-in DB, personal
// library, or fully custom). Custom foods saved per-100g so they
// can be reused tomorrow by name with any gram amount.
// ============================================================
let addFoodContext = { mealId: null, selectedFoodId: null, mode: 'search' };

function openAddFoodModal(mealId) {
  addFoodContext = { mealId, selectedFoodId: null, mode: 'search' };
  document.getElementById('addFoodSearchInput').value = '';
  document.getElementById('addFoodAmountInput').value = '';
  document.getElementById('addFoodUnitHint').textContent = '';
  document.getElementById('customFoodFields').style.display = 'none';
  renderAddFoodResults();
  document.getElementById('addFoodModalBackdrop').classList.add('open');
}
function closeAddFoodModal() {
  document.getElementById('addFoodModalBackdrop').classList.remove('open');
}

// Merge built-in FOOD_DB with personal library for unified search
function getAllSearchableFoods() {
  const builtIn = FOOD_DB.map(f => ({ ...f, source: 'builtin' }));
  const custom = Object.values(state.customFoodDefs || {}).map(f => ({ ...f, source: 'custom' }));
  return [...custom, ...builtIn]; // personal library first so it appears at top
}

function renderAddFoodResults() {
  const q = document.getElementById('addFoodSearchInput').value.toLowerCase().trim();
  const all = getAllSearchableFoods();
  const results = q ? all.filter(f => f.name.toLowerCase().includes(q)) : all;
  const list = document.getElementById('addFoodResultsList');
  if (!results.length) {
    list.innerHTML = `<div class="empty-state">No matches — add it as a custom food below.</div>`;
    return;
  }
  list.innerHTML = results.slice(0, 30).map(f => `
    <div class="food-result-row ${addFoodContext.selectedFoodId === f.id ? 'selected' : ''}">
      <div>
        <div class="food-result-name">${f.name}${f.source === 'custom' ? ' <span style="color:var(--accent);font-size:10px;font-weight:700">MY FOOD</span>' : ''}</div>
        <div class="food-result-macro">${f.cal}kcal · ${f.protein}g p · ${f.carbs}g c · ${f.fat}g f per ${f.unit}</div>
      </div>
      <button class="food-result-btn" onclick="selectAddFoodItem('${f.id}')">Select</button>
    </div>
  `).join('');
}

function selectAddFoodItem(foodId) {
  addFoodContext.selectedFoodId = foodId;
  addFoodContext.mode = 'search';
  document.getElementById('customFoodFields').style.display = 'none';
  const food = getFood(foodId);
  if (!food) return;
  const hint = food.unit === '100g'
    ? `Enter grams — e.g. 150 for 150g (${food.cal} kcal per 100g)`
    : `Enter quantity — 1 = one ${food.unit} · ${food.cal} kcal each`;
  document.getElementById('addFoodUnitHint').textContent = hint;
  document.getElementById('addFoodAmountInput').value = food.unit === '100g' ? 100 : 1;
  renderAddFoodResults();
}

function toggleCustomFoodMode() {
  addFoodContext.mode = 'custom';
  addFoodContext.selectedFoodId = null;
  document.getElementById('customFoodFields').style.display = 'block';
  document.getElementById('addFoodUnitHint').textContent = '';
  renderAddFoodResults();
}

function confirmAddFood() {
  const dateKey = todayKey();
  const items = getMealItems(dateKey, selectedEatDay, addFoodContext.mealId);

  if (addFoodContext.mode === 'custom') {
    const name = document.getElementById('customFoodName').value.trim();
    const totalCal     = parseFloat(document.getElementById('customFoodCal').value) || 0;
    const totalProtein = parseFloat(document.getElementById('customFoodProtein').value) || 0;
    const totalCarbs   = parseFloat(document.getElementById('customFoodCarbs').value) || 0;
    const totalFat     = parseFloat(document.getElementById('customFoodFat').value) || 0;
    const servingG     = parseFloat(document.getElementById('customFoodServingG').value) || 0;

    if (!name) { showToast('Name the food'); return; }
    if (!totalCal) { showToast('Enter at least calories'); return; }

    if (!state.customFoodDefs) state.customFoodDefs = {};

    // If a food with this exact name exists already, update it
    const existingId = Object.keys(state.customFoodDefs).find(
      id => state.customFoodDefs[id].name.toLowerCase() === name.toLowerCase()
    );
    const customId = existingId || ('custom_' + Date.now());

    let customFood, addAmount, addUnit;
    if (servingG > 0) {
      // Convert to per-100g so tomorrow user just enters any gram weight
      const f = 100 / servingG;
      customFood = {
        id: customId, name, unit: '100g', category: 'custom',
        cal:     Math.round(totalCal * f),
        protein: +((totalProtein * f).toFixed(1)),
        carbs:   +((totalCarbs * f).toFixed(1)),
        fat:     +((totalFat * f).toFixed(1))
      };
      addAmount = servingG;
      addUnit   = `${servingG}g`;
      showToast(`${name} saved — enter any gram amount next time`);
    } else {
      // No weight — store as a fixed single-serving entry
      customFood = { id: customId, name, unit: '1 serving', category: 'custom',
        cal: totalCal, protein: totalProtein, carbs: totalCarbs, fat: totalFat };
      addAmount = 1;
      addUnit   = '1 serving';
      showToast(`${name} added`);
    }

    state.customFoodDefs[customId] = customFood;
    items.push({ foodId: customId, amount: addAmount, unitLabel: addUnit, custom: true });

  } else {
    if (!addFoodContext.selectedFoodId) { showToast('Pick a food or add a custom one'); return; }
    const amount = parseFloat(document.getElementById('addFoodAmountInput').value);
    if (!amount || amount <= 0) { showToast('Enter a valid amount'); return; }
    const food = getFood(addFoodContext.selectedFoodId);
    items.push({
      foodId: food.id, amount,
      unitLabel: food.unit === '100g' ? `${amount}g` : `${amount} × ${food.unit}`
    });
    showToast(`Added ${food.name}`);
  }

  saveState();
  closeAddFoodModal();
  renderEat();
  if (currentView === 'today') renderToday();
}


// ============================================================
// PROGRESS VIEW
// ============================================================
function logWeight() {
  const val = parseFloat(document.getElementById('weightInput').value);
  if (!val || val <= 0) { showToast('Enter a valid weight'); return; }
  state.currentWeight = val;
  const dateKey = todayKey();
  const existingIdx = state.weightLog.findIndex(w => w.date === dateKey);
  if (existingIdx >= 0) state.weightLog[existingIdx].weight = val;
  else state.weightLog.push({ date: dateKey, weight: val });
  state.weightLog.sort((a, b) => a.date.localeCompare(b.date));
  // weight changes the maintenance/base target, which changes today's surplus — rescale today's meals
  applyMealAutoScale(dateKey, todayDayId());
  saveState();
  document.getElementById('weightInput').value = '';
  showToast('Weight saved');
  renderProgress();
}

function renderProgress() {
  document.getElementById('weightStart').textContent = PROFILE.startWeightKg + 'kg';
  document.getElementById('weightCurrent').textContent = (state.currentWeight || PROFILE.startWeightKg) + 'kg';
  document.getElementById('weightTarget').textContent = PROFILE.targetWeightKg + 'kg';

  drawWeightChart();
  renderStreakGrid();
  renderWeeklyAverages();
}

function drawWeightChart() {
  const svg = document.getElementById('weightChart');
  const log = state.weightLog;
  if (!log.length) {
    svg.innerHTML = `<text x="160" y="90" fill="#6B7480" font-size="12" text-anchor="middle">No weight entries yet</text>`;
    return;
  }
  const weights = log.map(w => w.weight);
  const minW = Math.min(...weights, PROFILE.targetWeightKg) - 1;
  const maxW = Math.max(...weights, PROFILE.startWeightKg) + 1;
  const w = 320, h = 180, padX = 14, padY = 14;
  const xStep = log.length > 1 ? (w - padX * 2) / (log.length - 1) : 0;
  const yFor = (val) => h - padY - ((val - minW) / (maxW - minW)) * (h - padY * 2);

  const points = log.map((entry, i) => `${padX + i * xStep},${yFor(entry.weight)}`).join(' ');
  const targetY = yFor(PROFILE.targetWeightKg);

  let dots = log.map((entry, i) => `<circle cx="${padX + i * xStep}" cy="${yFor(entry.weight)}" r="3" fill="#E8943A"/>`).join('');

  svg.innerHTML = `
    <line x1="0" y1="${targetY}" x2="${w}" y2="${targetY}" stroke="#8FA888" stroke-width="1" stroke-dasharray="4,4" opacity="0.6"/>
    <polyline points="${points}" fill="none" stroke="#E8943A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${dots}
  `;
}

function renderStreakGrid() {
  const grid = document.getElementById('streakGrid');
  const today = new Date();
  let html = '';
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = todayKey(d);
    const log = state.days[key];
    const dayId = todayDayId(d);
    const planDay = EXERCISE_PLAN.find(p => p.id === dayId);
    const totalEx = planDay ? planDay.exercises.length : 0;
    const doneCount = log ? Object.values(log.exercises).filter(e => e.completed).length : 0;
    let cls = '';
    if (doneCount > 0 && doneCount >= totalEx) cls = 'done';
    else if (doneCount > 0) cls = 'partial';
    const label = d.toLocaleDateString('en-US', { weekday: 'narrow' });
    html += `<div class="streak-cell ${cls}">${label}</div>`;
  }
  grid.innerHTML = html;
}

function renderWeeklyAverages() {
  const today = new Date();
  let totalCal = 0, totalProtein = 0, totalBurn = 0, workoutDays = 0, daysWithData = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = todayKey(d);
    const dayId = todayDayId(d);
    const log = state.days[key];
    if (!log) continue;
    daysWithData++;
    const eaten = computeDayEatenTotals(key, dayId);
    totalCal += eaten.cal;
    totalProtein += eaten.protein;
    totalBurn += getDayTotalBurn(key);
    const completedCount = Object.values(log.exercises).filter(e => e.completed).length;
    if (completedCount > 0) workoutDays++;
  }
  const divisor = daysWithData || 1;
  document.getElementById('weekAvgCal').textContent = Math.round(totalCal / divisor);
  document.getElementById('weekAvgProtein').textContent = Math.round(totalProtein / divisor) + 'g';
  document.getElementById('weekAvgBurn').textContent = Math.round(totalBurn / divisor);
  document.getElementById('weekWorkouts').textContent = workoutDays + '/7';
}

// ============================================================
// EXPORT / IMPORT
// ============================================================
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `protocol-backup-${todayKey()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup downloaded');
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed.days) throw new Error('Invalid file format');
      state = parsed;
      saveState();
      showToast('Data restored');
      renderToday(); renderTrain(); renderEat(); renderProgress();
    } catch (err) {
      showToast('Import failed — invalid file');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// ============================================================
// INIT
// ============================================================
function init() {
  updateHeaderDate();
  renderToday();
}
init();
