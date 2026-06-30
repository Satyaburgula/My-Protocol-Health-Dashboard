// ============================================================
// USER PROFILE & CALORIE MATH
// ============================================================
const PROFILE = {
  heightCm: 165,       // 5'5"
  startWeightKg: 75.5,
  targetWeightKg: 67.5,
  age: 26,
  sex: 'male',
  activityMultiplier: 1.55, // moderately active
  deficitKcal: 500,
  baseMacroTargets: { protein: 120, carbs: 210, fat: 55 } // grams, from diet plan PDF
};

function calcBMR(weightKg, heightCm, age) {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + 5; // Mifflin-St Jeor, male
}

function calcMaintenance(weightKg) {
  return calcBMR(weightKg, PROFILE.heightCm, PROFILE.age) * PROFILE.activityMultiplier;
}

function calcBaseTarget(weightKg) {
  return Math.round(calcMaintenance(weightKg) - PROFILE.deficitKcal);
}

// ============================================================
// MET VALUES for calorie burn calculation
// kcal burned = MET * weightKg * (durationMinutes/60)
// ============================================================
const MET_VALUES = {
  // Strength / bodyweight
  'bodyweight_strength_moderate': 3.8,
  'bodyweight_strength_vigorous': 5.0,
  'circuit_training': 8.0,
  'plank_core_work': 3.0,
  // Cardio
  'brisk_walk': 4.3,
  'jog_light': 7.0,
  'jog_moderate': 8.3,
  'run_fast': 11.0,
  'easy_walk_recovery': 3.0,
  'stretching': 2.3,
  // Common "other activity" presets
  'cycling_leisure': 6.0,
  'cycling_vigorous': 10.0,
  'swimming': 7.0,
  'yoga': 2.5,
  'stairs': 8.0,
  'dancing': 4.5,
  'household_chores': 3.0,
  'sports_general': 7.0,
  'badminton': 5.5,
  'cricket': 5.0,
  'football_soccer': 7.0,
  'basketball': 6.5
};

const ACTIVITY_PRESETS = [
  { id: 'brisk_walk', label: 'Brisk walk', met: 'brisk_walk' },
  { id: 'jog', label: 'Jog', met: 'jog_moderate' },
  { id: 'run', label: 'Run (fast)', met: 'run_fast' },
  { id: 'cycling', label: 'Cycling', met: 'cycling_leisure' },
  { id: 'swimming', label: 'Swimming', met: 'swimming' },
  { id: 'yoga', label: 'Yoga', met: 'yoga' },
  { id: 'stairs', label: 'Stair climbing', met: 'stairs' },
  { id: 'sports', label: 'Sports (general)', met: 'sports_general' },
  { id: 'badminton', label: 'Badminton', met: 'badminton' },
  { id: 'cricket', label: 'Cricket', met: 'cricket' },
  { id: 'football', label: 'Football', met: 'football_soccer' },
  { id: 'basketball', label: 'Basketball', met: 'basketball' },
  { id: 'dancing', label: 'Dancing', met: 'dancing' },
  { id: 'chores', label: 'Household chores', met: 'household_chores' }
];

// Galaxy Watch step-calorie cross-check (rough estimate if user only has steps, no watch-reported kcal)
// kcal ≈ steps * weightKg * 0.0005 (commonly used approximation)
function estimateCaloriesFromSteps(steps, weightKg) {
  return Math.round(steps * weightKg * 0.0005);
}

// ============================================================
// EXERCISE PLAN — from exercise_plan.pdf
// ============================================================
const EXERCISE_PLAN = [
  {
    id: 'mon',
    day: 'Monday',
    label: 'MON',
    theme: 'Full Body Strength',
    goal: 'Kickstart the week. Hit every major muscle. Boost metabolism for 24–48hrs after.',
    duration: '40 min',
    intensity: 'Moderate–High',
    warmup: '3 min jumping jacks',
    cooldown: '5 min easy walk + stretch',
    exercises: [
      {
        id: 'mon_warmup', name: 'Jumping Jacks', type: 'Warm-up', metKey: 'bodyweight_strength_moderate',
        sets: 1, reps: null, durationSec: 180, restSec: 0, repsLabel: '3 minutes continuous',
        how: [
          'Stand with feet together, arms by your sides.',
          'Jump feet out wide while raising both arms overhead.',
          'Jump back to start. Repeat at a steady, comfortable pace.',
          'If jumping feels heavy on knees, do stepping jacks instead.'
        ],
        tip: 'This prepares your joints and raises muscle temperature. Never skip it.',
        mistake: 'Skipping warm-up because it feels easy. Cold muscles perform worse and injure more easily.'
      },
      {
        id: 'mon_squat', name: 'Bodyweight Squat', type: 'Lower Body', metKey: 'bodyweight_strength_moderate',
        sets: 4, reps: 15, restSec: 60, repsLabel: '15 reps',
        how: [
          'Feet shoulder-width apart, toes slightly outward (15–30°).',
          'Arms straight in front or crossed at chest. Chest tall, core braced.',
          'Push hips back and bend knees together — sit DOWN, not forward.',
          'Go until thighs are parallel to floor or lower.',
          'Drive through your whole foot to stand. Squeeze glutes at the top.'
        ],
        tip: 'Total time per set: ~45 sec. Total with rest: ~7 min.',
        mistake: 'Heels rising off the floor. Place a thin book under each heel temporarily if this happens.'
      },
      {
        id: 'mon_pushup', name: 'Push-up', type: 'Upper Body', metKey: 'bodyweight_strength_vigorous',
        sets: 4, reps: 8, restSec: 60, repsLabel: 'Max reps (aim 6–10)',
        how: [
          'Hands slightly wider than shoulder-width. Body straight from head to heels.',
          'Core tight, glutes squeezed — no sagging or raised hips.',
          'Lower chest to 2cm from the floor. Elbows at ~45° from your body.',
          'Push back up explosively. Lock arms out fully at the top.',
          "Can't do 5 full reps? Drop to knees — same form, still effective."
        ],
        tip: "Add 1 rep per set each week — that's progressive overload without equipment.",
        mistake: 'Partial reps going only halfway down. Half a push-up builds half the muscle.'
      },
      {
        id: 'mon_bridge', name: 'Glute Bridge', type: 'Lower Body', metKey: 'bodyweight_strength_moderate',
        sets: 3, reps: 20, restSec: 45, repsLabel: '20 reps',
        how: [
          'Lie on your back, knees bent at 90°, feet flat, hip-width apart.',
          'Drive through heels and lift hips until body is straight from knees to shoulders.',
          'Squeeze glutes hard at the top. Hold for 1 second.',
          "Lower slowly — 2 seconds down. Don't let hips touch floor between reps.",
          "Keep ribs down — don't let your lower back arch."
        ],
        tip: "The 1-second squeeze at the top is what builds the glute. Don't skip it.",
        mistake: 'Lower back doing the work instead of glutes. Focus on squeezing glutes before lifting.'
      },
      {
        id: 'mon_plank', name: 'Plank', type: 'Core', metKey: 'plank_core_work',
        sets: 3, reps: null, durationSec: 38, restSec: 45, repsLabel: '30–45 seconds',
        how: [
          'Forearms on floor, elbows directly under shoulders.',
          'Body in a straight line from head to heels.',
          'Squeeze abs, glutes, and quads all at once.',
          "Breathe slowly and steadily — don't hold your breath.",
          'Stop the moment your hips drop. Form beats time every time.'
        ],
        tip: 'A 20-second perfect plank beats a 60-second sagging plank.',
        mistake: 'Holding bad form for longer. The moment hips drop, the core stops being the prime mover.'
      }
    ]
  },
  {
    id: 'tue',
    day: 'Tuesday',
    label: 'TUE',
    theme: 'Cardio + Core (Fat Burn)',
    goal: 'Burn fat. Tighten midsection. Zone 2 cardio targets belly fat specifically.',
    duration: '40–45 min',
    intensity: 'Moderate',
    warmup: '2 min easy walk into jog',
    cooldown: '5 min easy walk + hamstring stretch',
    exercises: [
      {
        id: 'tue_cardio', name: 'Brisk Walk / Jog', type: 'Cardio', metKey: 'jog_light',
        sets: 1, reps: null, durationSec: 1500, restSec: 0, repsLabel: '25 minutes continuous',
        how: [
          'Walk fast enough to feel slightly breathless but still able to talk.',
          'Or jog at a pace you can hold for the full 25 minutes without stopping.',
          "Arms swing naturally. Upright posture — don't hunch forward.",
          'Breathe through your nose if possible.',
          'Too breathless to talk? Slow down. Too easy? Speed up slightly.'
        ],
        tip: 'Your most important fat-loss session of the week. Also boosts scalp blood flow for your hair protocol.',
        mistake: 'Walking too slowly — window-shopping pace does almost nothing. Stay slightly breathless.'
      },
      {
        id: 'tue_hollow', name: 'Hollow Body Hold', type: 'Core', metKey: 'plank_core_work',
        sets: 3, reps: null, durationSec: 25, restSec: 45, repsLabel: '25 seconds',
        how: [
          'Lie on back, arms straight above head, legs straight out.',
          'Press your lower back COMPLETELY flat into the floor — zero gap.',
          'Lift shoulder blades and legs off floor simultaneously.',
          'Start with legs at 45°. Work toward 30° over weeks.',
          'Hold with everything braced.'
        ],
        tip: 'Better than crunches for flattening the midsection. Used by gymnasts for this reason.',
        mistake: 'Lower back arching off the floor. Raise legs higher until back stays flat.'
      },
      {
        id: 'tue_legraise', name: 'Leg Raise', type: 'Core', metKey: 'plank_core_work',
        sets: 3, reps: 12, restSec: 45, repsLabel: '12 reps',
        how: [
          'Lie on back, hands tucked under lower glutes for support.',
          'Legs straight together, lower back pressed to floor.',
          'Raise legs slowly to 90° (vertical).',
          'Lower slowly — 3 full seconds down — stop just before heels touch floor.',
          'Never let your lower back peel off the floor.'
        ],
        tip: 'The slow lowering phase is where 80% of the work happens.',
        mistake: 'Legs crashing to floor and bouncing back up — momentum doing the work, not your core.'
      },
      {
        id: 'tue_mtnclimb', name: 'Mountain Climbers', type: 'Full Body', metKey: 'bodyweight_strength_vigorous',
        sets: 3, reps: null, durationSec: 30, restSec: 45, repsLabel: '30 seconds',
        how: [
          'Start in a high plank — hands under shoulders, body straight.',
          'Drive right knee toward chest, quickly switch — left knee in, right leg back.',
          'Alternate continuously at a controlled but steady pace.',
          'Keep hips low and level throughout.',
          'Core stays braced the entire set.'
        ],
        tip: 'Combines core stability with cardio in one move. Heart rate spikes here intentionally.',
        mistake: 'Hips rising as you get tired. Once hips rise, it stops being a core exercise.'
      },
      {
        id: 'tue_deadbug', name: 'Dead Bug', type: 'Core', metKey: 'plank_core_work',
        sets: 3, reps: 10, restSec: 45, repsLabel: '10 reps each side',
        how: [
          'Lie on back. Arms straight toward ceiling. Knees bent at 90° (tabletop position).',
          'Slowly lower your RIGHT arm overhead AND LEFT leg toward floor simultaneously.',
          'Go as close to floor as possible WITHOUT lower back lifting.',
          'Return to start. Then opposite arm and leg.',
          'Move slowly — 3–4 seconds per rep.'
        ],
        tip: 'Trains your spine to stay neutral under load — protects your back long term.',
        mistake: 'Going fast and losing lower back contact. Slow is everything here.'
      }
    ]
  },
  {
    id: 'wed',
    day: 'Wednesday',
    label: 'WED',
    theme: 'Legs, Thighs & Glutes',
    goal: 'Your thighs, glutes, and belly are problem areas. This session directly targets them.',
    duration: '40 min',
    intensity: 'High',
    warmup: '3 min leg swings + hip circles',
    cooldown: "5 min hip flexor stretch + child's pose",
    exercises: [
      {
        id: 'wed_squat', name: 'Bodyweight Squat', type: 'Lower Body', metKey: 'bodyweight_strength_moderate',
        sets: 3, reps: 20, restSec: 60, repsLabel: '20 reps',
        how: [
          'Feet shoulder-width apart, toes slightly out.',
          'Arms forward for balance. Chest tall, core braced.',
          'Sit hips down and back — thighs parallel or below.',
          'Drive through full foot to stand. Squeeze glutes at top.',
          'Controlled pace — 2 seconds down, 1 second up.'
        ],
        tip: 'Opening set to warm up the legs before the harder exercises below.',
        mistake: 'Heels lifting. Widen stance slightly or place books under heels.'
      },
      {
        id: 'wed_bulgarian', name: 'Bulgarian Split Squat', type: 'Lower Body', metKey: 'bodyweight_strength_vigorous',
        sets: 3, reps: 10, restSec: 75, repsLabel: '10 reps each leg',
        how: [
          'Stand 2 feet in front of a sofa or chair. Place one foot behind you on the surface.',
          'Front foot far enough forward that your shin stays vertical as you lower.',
          'Lower your back knee straight down toward the floor — not forward.',
          "Front knee tracks over your second toe — don't let it cave inward.",
          'Push through front heel to stand. Complete all reps one side, then switch.'
        ],
        tip: 'Hardest exercise of the week. This shapes thighs and glutes faster than any other bodyweight move.',
        mistake: 'Front foot too close to sofa — forces shin forward and destroys knee tracking.'
      },
      {
        id: 'wed_sumo', name: 'Sumo Squat', type: 'Lower Body', metKey: 'bodyweight_strength_moderate',
        sets: 4, reps: 15, restSec: 60, repsLabel: '15 reps',
        how: [
          'Stand with feet wider than shoulder-width, toes pointing out at 45°.',
          'Hands clasped at chest or straight in front.',
          'Lower hips straight down between your legs — sit into the squat.',
          'Inner thighs stretch at the bottom. Hold 1 second.',
          'Drive through whole foot. Squeeze inner thighs and glutes at top.'
        ],
        tip: "Targets inner thighs and glutes — exactly where you're carrying excess fat.",
        mistake: 'Knees caving inward as you stand. Actively push knees outward throughout.'
      },
      {
        id: 'wed_lunge', name: 'Reverse Lunge', type: 'Lower Body', metKey: 'bodyweight_strength_moderate',
        sets: 3, reps: 12, restSec: 60, repsLabel: '12 reps each leg',
        how: [
          'Stand tall, feet hip-width apart, hands on hips.',
          'Step one foot backward and lower that knee toward the floor.',
          'Front shin stays vertical. Front knee directly above ankle.',
          'Back knee hovers 2cm above floor at the bottom.',
          'Push through front heel to return to standing. Alternate legs.'
        ],
        tip: 'Easier on knees than forward lunges. Great for toning the front of your thighs.',
        mistake: 'Front knee driving way forward over toes. Keep that front shin vertical.'
      },
      {
        id: 'wed_glutebridge', name: 'Single-Leg Glute Bridge', type: 'Lower Body', metKey: 'bodyweight_strength_moderate',
        sets: 3, reps: 12, restSec: 45, repsLabel: '12 reps each leg',
        how: [
          'Lie on back, one knee bent with foot flat on floor. Other leg extended straight.',
          "Drive through the bent leg's heel to lift hips.",
          "Body straight from shoulders to extended leg's knee at top.",
          'Squeeze the working glute hard at the top. Hold 1 second.',
          'Lower slowly. Complete all reps one side then switch.'
        ],
        tip: 'Forces each glute to work independently — fixes imbalances and hits harder than two-leg version.',
        mistake: 'Hips tilting sideways. Both hip bones must stay level throughout.'
      }
    ]
  },
  {
    id: 'thu',
    day: 'Thursday',
    label: 'THU',
    theme: 'Upper Body + Posture',
    goal: 'Good posture makes you look 3–5kg lighter immediately. Build the muscles that hold you upright.',
    duration: '35–40 min',
    intensity: 'Moderate',
    warmup: '2 min arm circles + shoulder rolls',
    cooldown: '5 min chest opener + thoracic rotation',
    exercises: [
      {
        id: 'thu_pike', name: 'Pike Push-up', type: 'Shoulders', metKey: 'bodyweight_strength_vigorous',
        sets: 4, reps: 10, restSec: 60, repsLabel: 'Max reps (aim 8–12)',
        how: [
          'Start in downward dog — hips high, body like an inverted V.',
          'Hands shoulder-width apart, fingers spread wide.',
          'Bend elbows and lower the TOP of your head toward the floor.',
          'Push back up. Keep hips HIGH the whole movement.',
          'Feel the shoulders working — not the chest.'
        ],
        tip: 'Broader shoulders create the visual illusion of a narrower waist. Your most important upper body exercise.',
        mistake: 'Hips dropping as you tire — it becomes a regular push-up. Reset between reps if needed.'
      },
      {
        id: 'thu_row', name: 'Table Row (Inverted Row)', type: 'Back', metKey: 'bodyweight_strength_vigorous',
        sets: 4, reps: 10, restSec: 60, repsLabel: 'Max reps',
        how: [
          'Lie under a sturdy table. Grip the edge with both hands, shoulder-width.',
          'Body straight from head to heels, heels on floor, arms fully extended.',
          'Pull your chest up toward the table edge. Lead with elbows — drive them BACK.',
          'Squeeze shoulder blades together at the top. Hold 1 second.',
          'Lower with control over 2 seconds. Fully extend before next rep.'
        ],
        tip: 'Your back builder until you get a pull-up bar. Trains the muscles that pull shoulders back.',
        mistake: 'Pulling with hands and arms. Think: elbows going back, hands are just hooks.'
      },
      {
        id: 'thu_superman', name: 'Superman Y-Raise', type: 'Back / Posture', metKey: 'bodyweight_strength_moderate',
        sets: 3, reps: 15, restSec: 45, repsLabel: '15 reps',
        how: [
          'Lie face down. Arms in a Y shape above your head, thumbs pointing toward ceiling.',
          'Lift both arms and chest off the floor simultaneously.',
          'Squeeze shoulder blades together as you lift. Hold 1 second at top.',
          "Lower slowly. Arms don't touch the floor between reps.",
          'Keep neck neutral — look at the floor, not forward.'
        ],
        tip: 'Most ignored exercise that gives the biggest posture improvement.',
        mistake: 'Craning neck upward. Eyes on floor. Neutral spine only.'
      },
      {
        id: 'thu_diamond', name: 'Diamond Push-up', type: 'Triceps', metKey: 'bodyweight_strength_vigorous',
        sets: 3, reps: 8, restSec: 60, repsLabel: '8–10 reps',
        how: [
          'Place hands together under chest — thumbs and index fingers form a diamond shape.',
          'Body straight, core tight.',
          'Elbows track STRAIGHT BACK along your body — not flared out.',
          'Lower chest toward hands. Feel the back of the arms stretching.',
          'Push back up and fully lock out arms.'
        ],
        tip: 'Triceps = 2/3 of your arm. Building them changes arm appearance significantly.',
        mistake: 'Elbows flaring wide — converts it to chest work. Keep them tight to your sides.'
      },
      {
        id: 'thu_shouldertap', name: 'Shoulder Tap Plank', type: 'Core', metKey: 'plank_core_work',
        sets: 3, reps: 16, restSec: 45, repsLabel: '16 taps (8 each side)',
        how: [
          'High plank position — hands under shoulders, body straight.',
          'Lift right hand, tap left shoulder. Return to floor.',
          'Lift left hand, tap right shoulder. That\'s 2 taps.',
          'Goal is ZERO hip rotation — brace abs and glutes hard.',
          'Wider feet = easier balance. Start there.'
        ],
        tip: 'Core anti-rotation training. Builds stability that keeps your torso upright and waist tight.',
        mistake: 'Hips rocking side to side with each tap. Slow down until hips are completely still.'
      }
    ]
  },
  {
    id: 'fri',
    day: 'Friday',
    label: 'FRI',
    theme: 'Full Body Circuit (Highest Calorie Burn)',
    goal: 'End the week strong. Minimal rest between moves keeps heart rate high. Most calories burned of any session.',
    duration: '40 min',
    intensity: 'High',
    warmup: '3 min jumping jacks + arm swings',
    cooldown: '5 min full body stretch',
    isCircuit: true,
    circuitRounds: 4,
    circuitExerciseRestSec: 20,
    circuitRoundRestSec: 90,
    exercises: [
      {
        id: 'fri_squatcalf', name: 'Squat to Calf Raise', type: 'Lower Body', metKey: 'circuit_training',
        sets: 4, reps: 15, restSec: 20, repsLabel: '15 reps per round',
        how: [
          'Perform a full bodyweight squat — hips parallel or lower.',
          'As you stand, continue rising onto the balls of your feet (calf raise).',
          'Hold at the very top for 1 second — balance and squeeze calves.',
          'Lower heels back to floor. That\'s 1 rep.',
          'Controlled pace. This is not a race.'
        ],
        tip: 'Two movements in one rep — doubles the time your muscles are under tension.',
        mistake: 'Rushing the calf raise. The balance demand is intentional — slow it down.'
      },
      {
        id: 'fri_pushup', name: 'Push-up', type: 'Upper Body', metKey: 'circuit_training',
        sets: 4, reps: 10, restSec: 20, repsLabel: '10 reps (or max if under 10)',
        how: [
          'Standard push-up form — body straight, full range of motion.',
          'Focus on consistent form even as you get tired.',
          'If full push-ups fail mid-circuit, drop to knees — keep moving.',
          'Full range every rep. No partial reps.',
          'Breathe out on the push up.'
        ],
        tip: 'Stopping completely kills the circuit effect. Modify to knees, never stop entirely.',
        mistake: 'Going to zero instead of modifying. Knee push-ups still work.'
      },
      {
        id: 'fri_lunge', name: 'Reverse Lunge', type: 'Lower Body', metKey: 'circuit_training',
        sets: 4, reps: 10, restSec: 20, repsLabel: '10 reps each leg per round',
        how: [
          'Alternate legs with each rep.',
          'Front shin vertical. Back knee close to floor.',
          'Stand fully between each rep.',
          'Pace yourself — this is the middle of a circuit, not a sprint.',
          'Hands on hips for balance.'
        ],
        tip: 'Large lower body muscles mid-circuit force the heart to pump hard — this drives fat burn.',
        mistake: 'Sloppy form when tired. Slow down rather than compromise knee tracking.'
      },
      {
        id: 'fri_mtnclimb', name: 'Mountain Climbers', type: 'Full Body', metKey: 'circuit_training',
        sets: 4, reps: null, durationSec: 30, restSec: 20, repsLabel: '30 seconds per round',
        how: [
          'High plank position. Drive knees to chest alternately.',
          'Steady continuous pace — not maximum sprint speed.',
          'Hips stay level and LOW throughout.',
          'Core braced the entire 30 seconds.',
          'Breathe out with each knee drive.'
        ],
        tip: "Heart rate peaks here — this is intentional. It's the cardio spike of the circuit.",
        mistake: 'Hips bouncing up and down. Keep them level even if you slow the pace.'
      },
      {
        id: 'fri_plank', name: 'Plank Hold', type: 'Core', metKey: 'circuit_training',
        sets: 4, reps: null, durationSec: 30, restSec: 90, repsLabel: '30 seconds per round',
        how: [
          'End each round with a forearm plank.',
          'By round 3–4 this will feel very hard. That\'s correct.',
          'Perfect form even when exhausted.',
          'Breathe slowly. Never hold your breath.',
          "Drop to knees if form fails before 30 seconds — don't collapse."
        ],
        tip: 'Ending each round with a hold reinforces core endurance under real-world fatigue.',
        mistake: 'Giving up at 20 seconds when form is still good. Push the full 30.'
      }
    ]
  },
  {
    id: 'sat',
    day: 'Saturday',
    label: 'SAT',
    theme: 'Active Rest',
    goal: 'Muscle is built during recovery. These days are part of the plan, not a break from it.',
    duration: '25–30 min',
    intensity: 'Low',
    warmup: null,
    cooldown: null,
    exercises: [
      {
        id: 'sat_walk', name: 'Easy Walk', type: 'Recovery', metKey: 'easy_walk_recovery',
        sets: 1, reps: null, durationSec: 1500, restSec: 0, repsLabel: '20–30 minutes',
        how: [
          'Easy, comfortable pace. This is not a workout.',
          'Outside if possible — sunlight supports Vitamin D.',
          'Also increases scalp blood circulation — directly supports your hair protocol.',
          'No heart rate target. Just move and breathe.',
          'Enjoy it. This is the recovery that makes Mon–Fri work.'
        ],
        tip: 'Active recovery reduces next-day soreness by 30–40% compared to complete rest.',
        mistake: 'Turning this into a workout. Pushing hard on rest days undermines your weekly recovery.'
      },
      {
        id: 'sat_stretch', name: '5-Stretch Routine', type: 'Flexibility', metKey: 'stretching',
        sets: 1, reps: null, durationSec: 300, restSec: 0, repsLabel: 'Hold each stretch 30–45 seconds',
        how: [
          'Hip flexor: lunge, back knee on floor, push hips gently forward. 30 sec each side.',
          'Chest opener: clasp hands behind back, squeeze blades, open chest upward. 30 sec.',
          "Child's pose: sit on heels, arms stretched forward on floor. 60 sec.",
          'Hamstring: seated, legs straight, reach gently toward feet. 30 sec each leg.',
          'Thoracic rotation: sit cross-legged, rotate upper body slowly left and right. 30 sec each side.'
        ],
        tip: 'Tight hip flexors and chest limit squat depth and shoulder movement — fixing them improves results.',
        mistake: "Skipping because 'nothing hurts'. Restrictions are painless until they cause injury."
      }
    ]
  },
  {
    id: 'sun',
    day: 'Sunday',
    label: 'SUN',
    theme: 'Active Rest',
    goal: 'Muscle is built during recovery. These days are part of the plan, not a break from it.',
    duration: '25–30 min',
    intensity: 'Low',
    warmup: null,
    cooldown: null,
    exercises: [
      {
        id: 'sun_walk', name: 'Easy Walk', type: 'Recovery', metKey: 'easy_walk_recovery',
        sets: 1, reps: null, durationSec: 1500, restSec: 0, repsLabel: '20–30 minutes',
        how: [
          'Easy, comfortable pace. This is not a workout.',
          'Outside if possible — sunlight supports Vitamin D.',
          'Also increases scalp blood circulation — directly supports your hair protocol.',
          'No heart rate target. Just move and breathe.',
          'Enjoy it. This is the recovery that makes Mon–Fri work.'
        ],
        tip: 'Active recovery reduces next-day soreness by 30–40% compared to complete rest.',
        mistake: 'Turning this into a workout. Pushing hard on rest days undermines your weekly recovery.'
      },
      {
        id: 'sun_stretch', name: '5-Stretch Routine', type: 'Flexibility', metKey: 'stretching',
        sets: 1, reps: null, durationSec: 300, restSec: 0, repsLabel: 'Hold each stretch 30–45 seconds',
        how: [
          'Hip flexor: lunge, back knee on floor, push hips gently forward. 30 sec each side.',
          'Chest opener: clasp hands behind back, squeeze blades, open chest upward. 30 sec.',
          "Child's pose: sit on heels, arms stretched forward on floor. 60 sec.",
          'Hamstring: seated, legs straight, reach gently toward feet. 30 sec each leg.',
          'Thoracic rotation: sit cross-legged, rotate upper body slowly left and right. 30 sec each side.'
        ],
        tip: 'Tight hip flexors and chest limit squat depth and shoulder movement — fixing them improves results.',
        mistake: "Skipping because 'nothing hurts'. Restrictions are painless until they cause injury."
      }
    ]
  }
];

// ============================================================
// FOOD DATABASE — for swap engine. Values per 100g unless noted.
// From diet plan PDF (Protein Source Guide) + meal ingredients.
// ============================================================
const FOOD_DB = [
  // ---- Proteins (cooked unless noted) ----
  { id: 'soya_chunks_dry', name: 'Soya chunks (dry)', unit: '100g', cal: 330, protein: 52, carbs: 33, fat: 0.5, category: 'protein' },
  { id: 'tofu_firm', name: 'Tofu (firm)', unit: '100g', cal: 144, protein: 17, carbs: 3, fat: 8, category: 'protein' },
  { id: 'paneer_lowfat', name: 'Paneer (low-fat)', unit: '100g', cal: 265, protein: 18, carbs: 6, fat: 20, category: 'protein' },
  { id: 'black_beans', name: 'Black beans (cooked)', unit: '100g', cal: 132, protein: 21, carbs: 24, fat: 0.5, category: 'protein' },
  { id: 'chickpeas', name: 'Chickpeas (cooked)', unit: '100g', cal: 164, protein: 19, carbs: 27, fat: 2.5, category: 'protein' },
  { id: 'red_pinto_beans', name: 'Red/pinto beans (cooked)', unit: '100g', cal: 143, protein: 22, carbs: 26, fat: 0.5, category: 'protein' },
  { id: 'green_peas', name: 'Green peas', unit: '100g', cal: 81, protein: 5, carbs: 14, fat: 0.4, category: 'protein' },
  { id: 'dal_generic', name: 'Dal, all types (cooked)', unit: '100g', cal: 116, protein: 9, carbs: 20, fat: 0.4, category: 'protein' },
  { id: 'whey_scoop', name: 'Whey protein, 1 scoop', unit: '1 scoop', cal: 120, protein: 24, carbs: 5, fat: 2, category: 'protein' },
  { id: 'rajma', name: 'Rajma (kidney beans, cooked)', unit: '100g', cal: 143, protein: 22, carbs: 26, fat: 0.5, category: 'protein' },
  // ---- Carb staples ----
  { id: 'rice_cooked', name: 'Basmati/brown rice (cooked)', unit: '100g', cal: 130, protein: 2.7, carbs: 28, fat: 0.3, category: 'carb' },
  { id: 'quinoa_cooked', name: 'Quinoa (cooked)', unit: '100g', cal: 120, protein: 4.4, carbs: 21, fat: 1.9, category: 'carb' },
  { id: 'oats_dry', name: 'Rolled oats (dry)', unit: '100g', cal: 380, protein: 13, carbs: 68, fat: 7, category: 'carb' },
  { id: 'roti', name: 'Whole wheat roti', unit: '1 piece', cal: 85, protein: 3, carbs: 18, fat: 0.5, category: 'carb' },
  { id: 'bread_daves', name: "Dave's Killer Bread, 1 slice", unit: '1 slice', cal: 110, protein: 5, carbs: 22, fat: 1.5, category: 'carb' },
  { id: 'tortilla_wheat', name: 'Whole wheat tortilla, 1', unit: '1 piece', cal: 130, protein: 4, carbs: 22, fat: 3.5, category: 'carb' },
  // ---- Fats / extras ----
  { id: 'peanut_butter', name: 'Natural peanut butter', unit: '1 tbsp', cal: 95, protein: 4, carbs: 3, fat: 8, category: 'fat' },
  { id: 'chia_seeds', name: 'Chia seeds', unit: '1 tbsp', cal: 58, protein: 2, carbs: 5, fat: 3.5, category: 'fat' },
  { id: 'almonds', name: 'Almonds, raw', unit: '5 pieces', cal: 35, protein: 1.3, carbs: 1.3, fat: 3, category: 'fat' },
  { id: 'avocado', name: 'Avocado', unit: '1/4 piece', cal: 80, protein: 1, carbs: 4, fat: 7, category: 'fat' },
  { id: 'almond_milk', name: 'Unsweetened almond milk', unit: '200ml', cal: 20, protein: 1, carbs: 1, fat: 1.5, category: 'other' },
  { id: 'greek_yogurt', name: 'Plain low-fat yogurt (Fage 0%)', unit: '100g', cal: 60, protein: 10, carbs: 4, fat: 0, category: 'protein' },
  { id: 'banana', name: 'Banana, medium', unit: '1 whole', cal: 105, protein: 1.3, carbs: 27, fat: 0.4, category: 'other' },
  { id: 'mango_berries_frozen', name: 'Frozen mango/mixed berries', unit: '1/2 cup', cal: 40, protein: 0.5, carbs: 10, fat: 0, category: 'other' },
  { id: 'protein_bar', name: 'No Cow / ALOHA protein bar', unit: '1 bar', cal: 200, protein: 20, carbs: 20, fat: 7, category: 'protein' },
  { id: 'spinach', name: 'Baby spinach/kale', unit: '1 cup', cal: 10, protein: 1, carbs: 2, fat: 0, category: 'other' },
  { id: 'tahini', name: 'Tahini dressing', unit: '1 tbsp', cal: 45, protein: 1.5, carbs: 2, fat: 4, category: 'fat' }
];

// ============================================================
// DIET PLAN — from Diet-Plan-USA.pdf
// ============================================================
const DIET_TARGETS = { calories: 1900, protein: 120, carbs: 210, fat: 55 };

const MEAL_WINDOWS = [
  { id: 'preworkout', label: 'Pre-Workout', time: '6:30am', kcalTarget: 150 },
  { id: 'breakfast', label: 'Breakfast', time: '8:30–9:30am', kcalTarget: 450, proteinTarget: 32, note: 'Post-workout. Take Minoxidil here.' },
  { id: 'lunch', label: 'Lunch', time: '12:30–1:30pm', kcalTarget: 600, proteinTarget: 35 },
  { id: 'snack', label: 'Evening Snack', time: '4:30–5:30pm', kcalTarget: 200 },
  { id: 'dinner', label: 'Dinner', time: '7:30–8:30pm', kcalTarget: 550, proteinTarget: 30, note: 'Take Finasteride + supplements here.' }
];

const WEEKLY_MEAL_PLAN = {
  mon: {
    breakfast: 'Overnight oats + whey',
    lunch: 'Soya chunks curry + rice + dahi',
    snack: 'No Cow protein bar',
    dinner: 'Tofu bhurji + 2 rotis + dal',
    items: {
      breakfast: [
        { foodId: 'oats_dry', amount: 75, unitLabel: '75g' },
        { foodId: 'almond_milk', amount: 200, unitLabel: '200ml' },
        { foodId: 'whey_scoop', amount: 1, unitLabel: '1 scoop' },
        { foodId: 'chia_seeds', amount: 1, unitLabel: '1 tbsp' },
        { foodId: 'peanut_butter', amount: 1, unitLabel: '1 tbsp' },
        { foodId: 'banana', amount: 0.5, unitLabel: '½ banana' },
        { foodId: 'mango_berries_frozen', amount: 1, unitLabel: '½ cup' }
      ],
      lunch: [
        { foodId: 'rice_cooked', amount: 150, unitLabel: '¾ cup cooked (~150g)' },
        { foodId: 'soya_chunks_dry', amount: 40, unitLabel: 'curry (~40g dry)' },
        { foodId: 'greek_yogurt', amount: 120, unitLabel: '½ cup' }
      ],
      snack: [
        { foodId: 'protein_bar', amount: 1, unitLabel: '1 bar' }
      ],
      dinner: [
        { foodId: 'tofu_firm', amount: 100, unitLabel: '100g (bhurji)' },
        { foodId: 'roti', amount: 2, unitLabel: '2 pieces' },
        { foodId: 'dal_generic', amount: 200, unitLabel: '1.5 cups (~200g)' }
      ]
    }
  },
  tue: {
    breakfast: "Toast (Dave's) + peanut butter + whey shake",
    lunch: 'Burrito bowl — black beans + tofu + brown rice',
    snack: 'Apple + 2 tbsp almond butter',
    dinner: 'Red lentil soup + salad + 1 slice bread',
    items: {
      breakfast: [
        { foodId: 'bread_daves', amount: 2, unitLabel: '2 slices' },
        { foodId: 'peanut_butter', amount: 2, unitLabel: '2 tbsp' },
        { foodId: 'whey_scoop', amount: 1, unitLabel: '1 scoop' },
        { foodId: 'banana', amount: 1, unitLabel: '1 medium' }
      ],
      lunch: [
        { foodId: 'rice_cooked', amount: 130, unitLabel: 'brown rice (~130g)' },
        { foodId: 'black_beans', amount: 130, unitLabel: '(~130g)' },
        { foodId: 'tofu_firm', amount: 100, unitLabel: '½ cup pan-seared' },
        { foodId: 'avocado', amount: 0.25, unitLabel: '¼ avocado' },
        { foodId: 'greek_yogurt', amount: 60, unitLabel: '2 tbsp sour cream/yogurt' }
      ],
      snack: [
        { foodId: 'peanut_butter', amount: 2, unitLabel: '2 tbsp almond butter' }
      ],
      dinner: [
        { foodId: 'dal_generic', amount: 300, unitLabel: 'red lentil soup, 2 cups' },
        { foodId: 'bread_daves', amount: 1, unitLabel: '1 slice' }
      ]
    }
  },
  wed: {
    breakfast: 'Overnight oats + whey + blueberries',
    lunch: 'Chana masala + brown rice + yogurt',
    snack: 'No Cow protein bar',
    dinner: 'Soya chunks sabzi + 2 rotis + salad',
    items: {
      breakfast: [
        { foodId: 'oats_dry', amount: 75, unitLabel: '75g' },
        { foodId: 'almond_milk', amount: 200, unitLabel: '200ml' },
        { foodId: 'whey_scoop', amount: 1, unitLabel: '1 scoop' },
        { foodId: 'mango_berries_frozen', amount: 1, unitLabel: '½ cup blueberries' }
      ],
      lunch: [
        { foodId: 'rice_cooked', amount: 130, unitLabel: 'brown rice (~130g)' },
        { foodId: 'chickpeas', amount: 150, unitLabel: 'chana masala (~150g)' },
        { foodId: 'greek_yogurt', amount: 120, unitLabel: '½ cup' }
      ],
      snack: [
        { foodId: 'protein_bar', amount: 1, unitLabel: '1 bar' }
      ],
      dinner: [
        { foodId: 'soya_chunks_dry', amount: 40, unitLabel: 'sabzi (~40g dry)' },
        { foodId: 'roti', amount: 2, unitLabel: '2 pieces' }
      ]
    }
  },
  thu: {
    breakfast: 'Smoothie — whey + banana + almond milk',
    lunch: 'Hybrid power bowl — quinoa + chickpeas + tofu + spinach',
    snack: 'Apple + peanut butter',
    dinner: 'Dal makhani (low fat) + 2 rotis + cucumber salad',
    items: {
      breakfast: [
        { foodId: 'whey_scoop', amount: 1, unitLabel: '1 scoop' },
        { foodId: 'banana', amount: 1, unitLabel: '1 banana' },
        { foodId: 'almond_milk', amount: 200, unitLabel: '200ml' },
        { foodId: 'chia_seeds', amount: 1, unitLabel: '1 tbsp' },
        { foodId: 'oats_dry', amount: 25, unitLabel: '25g' }
      ],
      lunch: [
        { foodId: 'quinoa_cooked', amount: 90, unitLabel: '½ cup' },
        { foodId: 'rice_cooked', amount: 90, unitLabel: '½ cup brown rice' },
        { foodId: 'chickpeas', amount: 80, unitLabel: '½ cup' },
        { foodId: 'tofu_firm', amount: 100, unitLabel: '100g pan-fried' },
        { foodId: 'spinach', amount: 1, unitLabel: '1 cup' },
        { foodId: 'tahini', amount: 1, unitLabel: '1 tbsp' }
      ],
      snack: [
        { foodId: 'peanut_butter', amount: 1, unitLabel: '1 tbsp' }
      ],
      dinner: [
        { foodId: 'dal_generic', amount: 220, unitLabel: 'dal makhani, low fat' },
        { foodId: 'roti', amount: 2, unitLabel: '2 pieces' }
      ]
    }
  },
  fri: {
    breakfast: 'Overnight oats + whey + strawberries',
    lunch: 'Rajma + rice + dahi',
    snack: 'No Cow protein bar',
    dinner: 'Low-fat paneer tikka (80g) + quinoa + sabzi',
    items: {
      breakfast: [
        { foodId: 'oats_dry', amount: 75, unitLabel: '75g' },
        { foodId: 'almond_milk', amount: 200, unitLabel: '200ml' },
        { foodId: 'whey_scoop', amount: 1, unitLabel: '1 scoop' },
        { foodId: 'mango_berries_frozen', amount: 1, unitLabel: '½ cup strawberries' }
      ],
      lunch: [
        { foodId: 'rajma', amount: 150, unitLabel: '(~150g)' },
        { foodId: 'rice_cooked', amount: 150, unitLabel: '¾ cup' },
        { foodId: 'greek_yogurt', amount: 120, unitLabel: '½ cup dahi' }
      ],
      snack: [
        { foodId: 'protein_bar', amount: 1, unitLabel: '1 bar' }
      ],
      dinner: [
        { foodId: 'paneer_lowfat', amount: 80, unitLabel: '80g tikka' },
        { foodId: 'quinoa_cooked', amount: 90, unitLabel: '½ cup' }
      ]
    }
  },
  sat: {
    breakfast: 'Toast + peanut butter + banana + whey shake',
    lunch: 'Pinto bean + tofu burrito bowl',
    snack: 'Apple + almonds',
    dinner: 'Soya chunks + mixed dal + roti + salad',
    items: {
      breakfast: [
        { foodId: 'bread_daves', amount: 2, unitLabel: '2 slices' },
        { foodId: 'peanut_butter', amount: 2, unitLabel: '2 tbsp' },
        { foodId: 'banana', amount: 1, unitLabel: '1 banana' },
        { foodId: 'whey_scoop', amount: 1, unitLabel: '1 scoop' }
      ],
      lunch: [
        { foodId: 'red_pinto_beans', amount: 130, unitLabel: '(~130g)' },
        { foodId: 'tofu_firm', amount: 100, unitLabel: '100g' },
        { foodId: 'rice_cooked', amount: 130, unitLabel: 'brown rice' }
      ],
      snack: [
        { foodId: 'almonds', amount: 5, unitLabel: '5 pieces' }
      ],
      dinner: [
        { foodId: 'soya_chunks_dry', amount: 35, unitLabel: '(~35g dry)' },
        { foodId: 'dal_generic', amount: 150, unitLabel: 'mixed dal' },
        { foodId: 'roti', amount: 1, unitLabel: '1 piece' }
      ]
    }
  },
  sun: {
    breakfast: 'Overnight oats + whey + chia + peanut butter',
    lunch: 'Chole (chickpeas) + brown rice + dahi',
    snack: 'No Cow bar or fruit + nut butter',
    dinner: 'Tofu stir-fry + brown rice + steamed broccoli',
    items: {
      breakfast: [
        { foodId: 'oats_dry', amount: 75, unitLabel: '75g' },
        { foodId: 'whey_scoop', amount: 1, unitLabel: '1 scoop' },
        { foodId: 'chia_seeds', amount: 1, unitLabel: '1 tbsp' },
        { foodId: 'peanut_butter', amount: 1, unitLabel: '1 tbsp' }
      ],
      lunch: [
        { foodId: 'chickpeas', amount: 150, unitLabel: 'chole (~150g)' },
        { foodId: 'rice_cooked', amount: 130, unitLabel: 'brown rice' },
        { foodId: 'greek_yogurt', amount: 120, unitLabel: '½ cup dahi' }
      ],
      snack: [
        { foodId: 'protein_bar', amount: 1, unitLabel: '1 bar' }
      ],
      dinner: [
        { foodId: 'tofu_firm', amount: 100, unitLabel: '100g stir-fry' },
        { foodId: 'rice_cooked', amount: 130, unitLabel: 'brown rice' }
      ]
    }
  }
};

const SUPPLEMENT_SCHEDULE = [
  { time: '6:30am', label: 'Pre-Workout', items: 'RYZE coffee + ½ banana + almonds (no medication)' },
  { time: '9:30am', label: 'Breakfast', items: 'Minoxidil 2.5mg + D3 5000 IU + K2 100mcg + sublingual B12' },
  { time: '8:00pm', label: 'Dinner', items: 'Finasteride 1mg + B-Complex' }
];

const NON_NEGOTIABLE_RULES = [
  'Hit 120g protein daily. Soya chunks 3–4x/week is what gets you there.',
  'Rice portion = ¾ cup cooked maximum at lunch — biggest lever for insulin resistance and SHBG.',
  'No added sugar, no white bread, no fried food.',
  'Drink 3–3.5 litres of water daily.',
  'Limit full-fat paneer to occasional use — default to low-fat paneer or tofu on weekdays.',
  'Meal prep on Sunday — quinoa, red lentil soup, chickpeas for Mon–Wed lunches.'
];

const FOODS_TO_AVOID = [
  'Subway / fast food sandwiches',
  'Flavoured yogurt (Yoplait etc.)',
  'Most granola bars',
  'Fruit juices / smoothie shop drinks',
  'Protein bars with maltitol / sucralose (Quest, ONE Bar)',
  'Restaurant Indian food (most US locations)',
  'Packaged biscuits / namkeen',
  'A second daily scoop of whey protein'
];
