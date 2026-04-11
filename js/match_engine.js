/* ============================================================
   UCM — MATCH-ENGINE.JS
   Ball resolution engine — probability tables, outcome resolver,
   commentary generator, DRS review logic
   Pure functions only — no DOM, no state mutation
   ============================================================ */

/* ============================================================
   OUTCOME REGISTRY
   ============================================================ */

const OUTCOMES = [
  'dot', 'single', 'double', 'triple',
  'four', 'six',
  'wide', 'noball',
  'wicket'
];

/* ============================================================
   BASE PROBABILITY TABLE
   Weights per outcome — normalised inside resolveBall
   Order: dot, single, double, triple, four, six, wide, noball, wicket
   ============================================================ */

const BASE_WEIGHTS = {
  //              dot   1    2    3    4    6    Wd   NB   W
  powerplay:   [ 22,   28,  10,  2,   16,  9,   6,   3,   4 ],
  middle:      [ 28,   30,  10,  2,   14,  7,   4,   2,   3 ],
  death:       [ 18,   22,  8,   1,   18,  14,  6,   3,   10 ]
};

/* ============================================================
   INTENT MULTIPLIER TABLES
   Each row = [dot, 1, 2, 3, 4, 6, Wd, NB, W]
   ============================================================ */

const BATTING_INTENT_MUL = {
  defensive:  [ 1.5,  0.9,  0.7,  0.5,  0.5,  0.2,  0.8,  0.8,  0.6 ],
  neutral:    [ 1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0 ],
  aggressive: [ 0.8,  1.1,  1.2,  1.2,  1.4,  1.5,  1.0,  1.0,  1.2 ],
  attack:     [ 0.5,  0.9,  1.0,  1.1,  1.7,  2.2,  1.1,  1.1,  1.6 ]
};

const BOWLING_INTENT_MUL = {
  defensive:  [ 1.4,  1.1,  0.9,  0.8,  0.7,  0.5,  0.6,  0.5,  1.3 ],
  neutral:    [ 1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0 ],
  aggressive: [ 0.9,  1.0,  1.1,  1.1,  1.2,  1.2,  1.3,  1.2,  0.8 ],
  attack:     [ 0.7,  0.9,  1.1,  1.2,  1.4,  1.5,  1.5,  1.4,  0.6 ]
};

/* ============================================================
   FIELD SETTING MULTIPLIERS
   Attacking field = more wickets, more boundaries conceded
   Defensive field = fewer boundaries, more dot balls
   ============================================================ */

const FIELD_MUL = {
  attacking:  [ 0.8,  1.0,  1.1,  1.1,  1.3,  1.3,  1.0,  1.0,  1.5 ],
  balanced:   [ 1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0 ],
  defensive:  [ 1.3,  1.1,  1.0,  0.9,  0.7,  0.5,  1.0,  1.0,  0.7 ],
  seam:       [ 1.1,  1.0,  0.9,  0.9,  0.9,  0.8,  1.1,  1.2,  1.3 ],
  spin:       [ 1.2,  1.1,  1.0,  0.9,  0.8,  0.7,  0.9,  0.8,  1.2 ],
  powerplay:  [ 0.9,  1.1,  1.1,  1.0,  1.2,  1.1,  1.1,  1.1,  0.9 ]
};

/* ============================================================
   PS (PLAYER STRENGTH) MODIFIER
   PS 0–100. Batter PS raises boundary/scoring, lowers wicket
   Bowler PS raises wicket/dot, lowers scoring
   ============================================================ */

function _psModifier(batterPS, bowlerPS) {
  // Returns [dot, 1, 2, 3, 4, 6, Wd, NB, W]
  const bOff = (batterPS - 50) / 100;   // -0.5 … +0.5
  const bwOff = (bowlerPS  - 50) / 100; // -0.5 … +0.5

  return [
    1.0 - bOff * 0.3  + bwOff * 0.3,   // dot
    1.0,                                 // single — neutral
    1.0 + bOff * 0.2  - bwOff * 0.1,   // double
    1.0 + bOff * 0.1,                   // triple
    1.0 + bOff * 0.4  - bwOff * 0.3,   // four
    1.0 + bOff * 0.5  - bwOff * 0.4,   // six
    1.0               + bwOff * 0.2,    // wide
    1.0               + bwOff * 0.15,   // noball
    1.0 - bOff * 0.4  + bwOff * 0.5    // wicket
  ];
}

/* ============================================================
   FORM MODIFIER
   excellent: +ve for batter, -ve for bowler (more runs)
   poor:      -ve for batter, +ve for bowler (more wickets)
   ============================================================ */

const FORM_BATTER_MUL = {
  excellent: [ 0.85, 1.0,  1.1,  1.1,  1.3,  1.4,  1.0,  1.0,  0.7  ],
  good:      [ 0.93, 1.0,  1.05, 1.05, 1.1,  1.1,  1.0,  1.0,  0.85 ],
  average:   [ 1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0  ],
  poor:      [ 1.1,  0.95, 0.9,  0.85, 0.8,  0.7,  1.0,  1.0,  1.3  ]
};

const FORM_BOWLER_MUL = {
  excellent: [ 1.2,  1.0,  0.9,  0.85, 0.75, 0.6,  0.8,  0.8,  1.4  ],
  good:      [ 1.1,  1.0,  0.95, 0.9,  0.9,  0.85, 0.9,  0.9,  1.15 ],
  average:   [ 1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0  ],
  poor:      [ 0.85, 1.0,  1.1,  1.1,  1.2,  1.3,  1.2,  1.2,  0.7  ]
};

/* ============================================================
   FATIGUE MODIFIER
   High fatigue (>60) degrades performance
   ============================================================ */

function _fatigueMod(batterFatigue, bowlerFatigue) {
  const bf  = Math.max(0, (batterFatigue  - 40) / 100);
  const bwf = Math.max(0, (bowlerFatigue  - 40) / 100);
  return [
    1.0 + bf  * 0.2,   // dot
    1.0,               // single
    1.0 - bf  * 0.1,   // double
    1.0 - bf  * 0.1,   // triple
    1.0 - bf  * 0.2,   // four
    1.0 - bf  * 0.3,   // six
    1.0 + bwf * 0.25,  // wide
    1.0 + bwf * 0.2,   // noball
    1.0 - bf  * 0.2 + bwf * 0.2  // wicket
  ];
}

/* ============================================================
   VENUE MODIFIER
   ============================================================ */

const VENUE_MUL = {
  batting:  [ 0.9,  1.0,  1.1,  1.1,  1.2,  1.2,  1.0,  1.0,  0.8  ],
  bowling:  [ 1.2,  1.0,  0.9,  0.9,  0.8,  0.7,  1.0,  1.0,  1.3  ],
  neutral:  [ 1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0  ]
};

/* ============================================================
   DIFFICULTY MODIFIER (affects wicket + boundary rates)
   ============================================================ */

const DIFFICULTY_MUL = {
  easy:   [ 0.8,  1.0,  1.1,  1.1,  1.2,  1.2,  0.9,  0.9,  0.7  ],
  medium: [ 1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0  ],
  hard:   [ 1.2,  1.0,  0.9,  0.9,  0.85, 0.8,  1.1,  1.0,  1.3  ],
  expert: [ 1.4,  1.0,  0.85, 0.85, 0.75, 0.65, 1.2,  1.1,  1.6  ]
};

/* ============================================================
   FREE HIT MODIFIER — no wicket on legal delivery
   ============================================================ */

const FREEHIT_MUL = [ 1.0, 1.05, 1.1, 1.05, 1.1, 1.15, 1.0, 1.0, 0.0 ];

/* ============================================================
   BOWLER TYPE vs BATTER ROLE MATCHUP MODIFIER
   ============================================================ */

function _matchupMod(bowlerType, batterRole) {
  // [dot, 1, 2, 3, 4, 6, Wd, NB, W]
  const matchups = {
    pace: {
      batsman:     [ 1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0 ],
      'top-order': [ 0.9,  1.0,  1.0,  1.0,  1.1,  1.1,  1.0,  1.0,  0.9 ],
      'lower-order':[ 1.2, 0.9,  0.9,  0.9,  0.8,  0.7,  1.0,  1.1,  1.4 ],
      allrounder:  [ 1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0 ],
      wicketkeeper:[ 1.1,  1.0,  0.9,  0.9,  0.9,  0.8,  1.0,  1.0,  1.1 ]
    },
    spin: {
      batsman:     [ 0.9,  1.0,  1.0,  1.0,  1.1,  1.1,  0.9,  0.9,  0.9 ],
      'top-order': [ 0.85, 1.0,  1.1,  1.0,  1.1,  1.15, 0.9,  0.9,  0.85],
      'lower-order':[ 1.3, 0.9,  0.8,  0.8,  0.7,  0.6,  0.9,  0.9,  1.5 ],
      allrounder:  [ 1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0 ],
      wicketkeeper:[ 1.0,  1.0,  1.0,  1.0,  1.0,  0.9,  0.9,  0.9,  1.05]
    },
    medium: {
      batsman:     [ 1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.1,  1.0,  1.0 ],
      'top-order': [ 0.95, 1.0,  1.0,  1.0,  1.05, 1.0,  1.1,  1.0,  0.95],
      'lower-order':[ 1.1, 1.0,  0.95, 0.9,  0.85, 0.75, 1.1,  1.0,  1.2 ],
      allrounder:  [ 1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0 ],
      wicketkeeper:[ 1.05, 1.0,  0.95, 0.95, 0.95, 0.9,  1.0,  1.0,  1.05]
    }
  };

  const bType = (bowlerType ?? 'pace').toLowerCase();
  const bRole = (batterRole  ?? 'batsman').toLowerCase();

  return (matchups[bType]?.[bRole]) ?? Array(9).fill(1.0);
}

/* ============================================================
   COMBINE WEIGHTS — multiply element-wise across all modifier arrays
   ============================================================ */

function _combine(base, ...modifiers) {
  return base.map((w, i) =>
    modifiers.reduce((acc, mod) => acc * (mod[i] ?? 1.0), w)
  );
}

/* ============================================================
   WEIGHTED RANDOM PICK
   ============================================================ */

function _pick(weights, rng) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng.next() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

/* ============================================================
   DISMISSAL TYPE TABLE
   Bowler type + intent influence dismissal type
   ============================================================ */

const DISMISSAL_TYPES = {
  pace: {
    defensive:  ['bowled', 'lbw', 'caught behind', 'caught', 'caught behind'],
    neutral:    ['caught', 'bowled', 'lbw', 'caught behind', 'caught'],
    aggressive: ['caught', 'caught', 'bowled', 'lbw', 'run out'],
    attack:     ['caught', 'caught', 'caught', 'bowled', 'lbw']
  },
  spin: {
    defensive:  ['lbw', 'bowled', 'stumped', 'caught', 'lbw'],
    neutral:    ['stumped', 'lbw', 'caught', 'bowled', 'caught'],
    aggressive: ['caught', 'stumped', 'lbw', 'caught', 'run out'],
    attack:     ['caught', 'caught', 'stumped', 'lbw', 'caught']
  },
  medium: {
    defensive:  ['bowled', 'lbw', 'caught', 'caught behind', 'bowled'],
    neutral:    ['caught', 'bowled', 'lbw', 'caught behind', 'caught'],
    aggressive: ['caught', 'caught', 'run out', 'bowled', 'lbw'],
    attack:     ['caught', 'caught', 'caught', 'run out', 'bowled']
  }
};

function _pickDismissalType(bowlerType, bowlingIntent, rng) {
  const bType = (bowlerType   ?? 'pace').toLowerCase();
  const bInt  = (bowlingIntent ?? 'neutral').toLowerCase();
  const list  = DISMISSAL_TYPES[bType]?.[bInt]
             ?? DISMISSAL_TYPES.pace.neutral;
  const idx   = Math.floor(rng.next() * list.length);
  return list[idx];
}

function _buildDismissalText(type, bowlerName, fielderName) {
  const b = bowlerName  ?? 'bowler';
  const f = fielderName ?? 'fielder';
  switch (type) {
    case 'bowled':         return `b ${b}`;
    case 'lbw':            return `lbw b ${b}`;
    case 'caught':         return `c ${f} b ${b}`;
    case 'caught behind':  return `c †keeper b ${b}`;
    case 'stumped':        return `st †keeper b ${b}`;
    case 'run out':        return `run out (${f})`;
    default:               return `out b ${b}`;
  }
}

/* ============================================================
   COMMENTARY TEMPLATES
   ============================================================ */

const COMMENTARY = {
  dot: [
    "Played out. Dot ball.",
    "Tight line, defended back.",
    "Probing delivery, no run.",
    "Good length, left alone.",
    "Beaten outside off! Dot.",
    "Misses the drive — no run.",
    "Excellent delivery, dot ball."
  ],
  single: [
    "Nudged away for a single.",
    "Worked to mid-on, one run.",
    "Clipped off the pads, single.",
    "Pushed into the gap, they run.",
    "Quick single — good running.",
    "Flicked fine, a single taken.",
    "Tapped down the ground, one."
  ],
  double: [
    "Driven past cover — two runs!",
    "Good running, they come back for two.",
    "Through the gap for a couple.",
    "Cuts well, fields it at the fence — two.",
    "Punched off the back foot, two more.",
    "Driven hard, they turn for two.",
    "Mis-timed but enough for two."
  ],
  triple: [
    "Driven to the outfield — three runs!",
    "Deep fielder struggles — three taken.",
    "Powerful drive, three all the way.",
    "Misfield allows three!"
  ],
  four: [
    "FOUR! Cracked through the covers!",
    "FOUR! Driven beautifully to the boundary.",
    "FOUR! Pulled hard off the short delivery!",
    "FOUR! Edged — flies through the gap!",
    "FOUR! Swept all the way to the ropes!",
    "FOUR! Full toss clattered away.",
    "FOUR! Cut square — no stopping it!",
    "FOUR! Flicked off the legs, races away!",
    "FOUR! Driven on the up — stunning shot!",
    "FOUR! Slapped over mid-off!"
  ],
  six: [
    "SIX! Launches over long-on!",
    "SIX! Whipped over mid-wicket — huge!",
    "SIX! Steps out and lofts it miles!",
    "SIX! Cleared the ropes with ease!",
    "SIX! Flat-batted into the stands!",
    "SIX! Swept mightily over fine leg!",
    "SIX! Inside-out over extra cover!",
    "SIX! Hit out of the ground!",
    "SIX! Maximum! That's gone all the way!"
  ],
  wide: [
    "Wide! Down the leg side.",
    "Wide! Strays too far outside off.",
    "Wide! Bowler gets penalised.",
    "Wide down leg — poor delivery.",
    "Wide! Way outside off stump.",
    "Wide! Loses his line completely."
  ],
  noball: [
    "No ball! Front foot over the line.",
    "No ball — free hit coming up!",
    "No ball! Bowler in trouble.",
    "No ball! Steps over the crease.",
    "No ball! And a free hit is given."
  ],
  wicket: {
    bowled: [
      "BOWLED HIM! Off stump out of the ground!",
      "CLEAN BOWLED! Plays all around it!",
      "BOWLED! Through the gate!"
    ],
    lbw: [
      "OUT LBW! Struck in front — plumb!",
      "LBW! Trapped right in front!",
      "LBW! Huge appeal, given! On the knee roll!"
    ],
    caught: [
      "CAUGHT! Mistimed — straight to cover!",
      "CAUGHT! Goes for the big one and holes out!",
      "CAUGHT at mid-off! Poor shot selection."
    ],
    'caught behind': [
      "CAUGHT BEHIND! Edge carries to the keeper!",
      "CAUGHT! Thin edge, keeper takes it cleanly.",
      "EDGED! Gone behind! Great catch!"
    ],
    stumped: [
      "STUMPED! Down the track and beaten!",
      "STUMPED! Dances out, misses — keeper does the rest!",
      "STUMPED! Out of his crease!"
    ],
    'run out': [
      "RUN OUT! Mix-up between the batters!",
      "RUN OUT! Direct hit — no need for a review!",
      "RUN OUT! Caught short of the crease!"
    ],
    default: [
      "OUT! Great delivery gets the wicket!",
      "WICKET! Another one bites the dust!"
    ]
  },
  freeHit: [
    "FREE HIT! Extra pressure on the bowler.",
    "FREE HIT! Batter can swing freely!",
    "FREE HIT on the next delivery!"
  ]
};

function _pickCommentary(outcome, dismissalType, isFreeHit, rng) {
  if (isFreeHit && (outcome === 'dot' || outcome === 'single')) {
    const list = COMMENTARY.freeHit;
    return list[Math.floor(rng.next() * list.length)];
  }

  if (outcome === 'wicket') {
    const type = dismissalType ?? 'default';
    const list = COMMENTARY.wicket[type] ?? COMMENTARY.wicket.default;
    return list[Math.floor(rng.next() * list.length)];
  }

  const list = COMMENTARY[outcome] ?? COMMENTARY.single;
  return list[Math.floor(rng.next() * list.length)];
}

/* ============================================================
   RUNS MAP — outcome → runs scored
   ============================================================ */

const OUTCOME_RUNS = {
  dot:     0,
  single:  1,
  double:  2,
  triple:  3,
  four:    4,
  six:     6,
  wide:    1,
  noball:  1,
  wicket:  0
};

/* ============================================================
   MAIN RESOLVER — resolveBall(matchState) → result
   ============================================================ */

export function resolveBall(matchState) {
  const {
    batterPS       = 50,
    bowlerPS       = 50,
    batterForm     = 'average',
    bowlerForm     = 'average',
    batterFatigue  = 0,
    bowlerFatigue  = 0,
    batterRole     = 'batsman',
    bowlerType     = 'pace',
    battingIntent  = 'neutral',
    bowlingIntent  = 'neutral',
    fieldSetting   = 'balanced',
    isFreeHit      = false,
    phase          = 'middle',
    difficulty     = 'medium',
    venue          = 'neutral',
    rng
  } = matchState;

  if (!rng) throw new Error('resolveBall: rng is required');

  // 1. Base weights from phase
  const base = [...(BASE_WEIGHTS[phase] ?? BASE_WEIGHTS.middle)];

  // 2. Build all modifier arrays
  const biMul  = BATTING_INTENT_MUL[battingIntent]  ?? BATTING_INTENT_MUL.neutral;
  const bwMul  = BOWLING_INTENT_MUL[bowlingIntent]  ?? BOWLING_INTENT_MUL.neutral;
  const fMul   = FIELD_MUL[fieldSetting]            ?? FIELD_MUL.balanced;
  const psMul  = _psModifier(batterPS, bowlerPS);
  const bfMul  = FORM_BATTER_MUL[batterForm]        ?? FORM_BATTER_MUL.average;
  const bwfMul = FORM_BOWLER_MUL[bowlerForm]        ?? FORM_BOWLER_MUL.average;
  const fatMul = _fatigueMod(batterFatigue, bowlerFatigue);
  const venMul = VENUE_MUL[venue]                   ?? VENUE_MUL.neutral;
  const difMul = DIFFICULTY_MUL[difficulty]         ?? DIFFICULTY_MUL.medium;
  const matMul = _matchupMod(bowlerType, batterRole);
  const fhMul  = isFreeHit ? FREEHIT_MUL : Array(9).fill(1.0);

  // 3. Combine
  const weights = _combine(
    base,
    biMul, bwMul, fMul,
    psMul, bfMul, bwfMul,
    fatMul, venMul, difMul,
    matMul, fhMul
  );

  // 4. Pick outcome
  const idx     = _pick(weights, rng);
  const outcome = OUTCOMES[idx];

  // 5. Wicket resolution
  let isWicket     = outcome === 'wicket';
  let dismissalType = null;
  let dismissalText = null;
  let fielderName  = null;

  if (isWicket) {
    dismissalType = _pickDismissalType(bowlerType, bowlingIntent, rng);
    // Pick a random fielder name from a simple roster placeholder
    fielderName   = _pickFielderName(rng);
    dismissalText = _buildDismissalText(
      dismissalType,
      matchState.bowlerName ?? 'bowler',
      fielderName
    );
  }

  // 6. Runs
  const runs = OUTCOME_RUNS[outcome] ?? 0;

  // 7. Commentary
  const commentary = _pickCommentary(outcome, dismissalType, isFreeHit, rng);

  // 8. Build result
  return {
    outcome,
    runs,
    isWicket,
    dismissalType,
    dismissalText,
    fielderName,
    commentary,
    isFreeHit: outcome === 'noball' // next ball is free hit
  };
}

/* ============================================================
   DRS REVIEW RESOLVER
   Takes the original result + live state, returns overturned bool
   ============================================================ */

export function reviewDRSResult(result, live) {
  if (!result || !result.isWicket) {
    return { overturned: false, reason: 'No wicket to review' };
  }

  const rng = live.rng ?? { next: Math.random };

  // Dismissal types that can be overturned:
  const overturnableTypes = ['lbw', 'caught', 'caught behind', 'stumped'];
  if (!overturnableTypes.includes(result.dismissalType)) {
    return { overturned: false, reason: 'Bowled — cannot overturn' };
  }

  // Base overturn probability by dismissal type
  const basePct = {
    lbw:            0.32,
    caught:         0.20,
    'caught behind':0.28,
    stumped:        0.18
  };

  let p = basePct[result.dismissalType] ?? 0.20;

  // Difficulty modifier — harder = umpires more accurate
  const diffAdj = {
    easy:   +0.15,
    medium:  0,
    hard:   -0.08,
    expert: -0.14
  };
  p += diffAdj[live.difficulty ?? 'medium'] ?? 0;

  // Clamp
  p = Math.max(0.05, Math.min(0.55, p));

  const overturned = rng.next() < p;

  return {
    overturned,
    reason: overturned
      ? 'Ball tracking shows missing leg stump — NOT OUT'
      : 'Ball tracking confirms — OUT'
  };
}

/* ============================================================
   GENERATE COMMENTARY (standalone — for UI overlays)
   ============================================================ */

export function generateCommentary(outcome, dismissalType, isFreeHit, rng) {
  return _pickCommentary(outcome, dismissalType, isFreeHit, rng ?? { next: Math.random });
}

/* ============================================================
   HELPERS
   ============================================================ */

// Placeholder fielder names — replace with real XI names from matchState
// in a future pass if bowlingXI is passed into resolveBall
const _FIELDER_POOL = [
  'mid-off', 'cover', 'deep square leg', 'fine leg',
  'long-on', 'mid-wicket', 'third man', 'slip'
];

function _pickFielderName(rng) {
  const idx = Math.floor(rng.next() * _FIELDER_POOL.length);
  return _FIELDER_POOL[idx];
}