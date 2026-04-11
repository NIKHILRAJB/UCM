/* ============================================================
   UCM — AI-ENGINE.JS
   All AI decision functions — batting intent, bowling intent,
   field setting, over planning, batting order promotion,
   and the AIPatternTracker class.
   Pure functions only — no DOM, no state mutation.
   ============================================================ */

/* ============================================================
   CONSTANTS
   ============================================================ */

const INTENTS = {
  batting:  ['defensive', 'neutral', 'aggressive', 'attack'],
  bowling:  ['defensive', 'neutral', 'aggressive', 'attack'],
  field:    ['attacking', 'balanced', 'defensive', 'seam', 'spin', 'powerplay']
};

const PHASES = {
  powerplay: { overStart: 0,  overEnd: 5  },
  middle:    { overStart: 6,  overEnd: 15 },
  death:     { overStart: 16, overEnd: 19 }
};

/* ============================================================
   HELPERS
   ============================================================ */

function _clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function _weightedPick(options, weights) {
  // options: array of values, weights: parallel array of numbers
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < options.length; i++) {
    r -= weights[i];
    if (r <= 0) return options[i];
  }
  return options[options.length - 1];
}

function _getPhase(oversDone, totalOvers) {
  const pct = oversDone / totalOvers;
  if (pct < 0.30) return 'powerplay';
  if (pct < 0.75) return 'middle';
  return 'death';
}

function _rrRequired(target, runs, legalBalls, totalOvers) {
  if (!target) return null;
  const ballsLeft = (totalOvers * 6) - legalBalls;
  if (ballsLeft <= 0) return Infinity;
  return ((target - runs) / ballsLeft) * 6;
}

function _currentRR(runs, legalBalls) {
  if (legalBalls <= 0) return 0;
  return (runs / legalBalls) * 6;
}

function _wicketsPressure(wickets) {
  // Returns 0.0 (no pressure) → 1.0 (heavy pressure)
  if (wickets <= 2)  return 0.0;
  if (wickets <= 4)  return 0.2;
  if (wickets <= 6)  return 0.45;
  if (wickets <= 7)  return 0.65;
  if (wickets <= 8)  return 0.80;
  return 0.92;
}

function _psScore(player) {
  return _clamp(player?.ps ?? 50, 0, 100);
}

/* ============================================================
   AI PATTERN TRACKER
   Records ball outcomes per batter to expose tendencies
   ============================================================ */

export class AIPatternTracker {
  constructor() {
    this._history    = [];      // { battingIntent, outcome, runs, dismissalType }
    this.aggressionScore  = 0; // +ve = batter goes hard; -ve = batter defends
    this.spinWeakness     = 0; // higher = dismissals vs spin
    this.bounceWeakness   = 0; // higher = dismissals vs pace short
  }

  recordBall(battingIntent, outcome, runs, dismissalType = null) {
    const entry = { battingIntent, outcome, runs, dismissalType };
    this._history.push(entry);

    // Rolling aggression score
    if (['attack', 'aggressive'].includes(battingIntent)) {
      this.aggressionScore = _clamp(this.aggressionScore + 1, -10, 10);
    } else if (['defensive'].includes(battingIntent)) {
      this.aggressionScore = _clamp(this.aggressionScore - 1, -10, 10);
    }

    // Weakness detection on wickets
    if (dismissalType) {
      if (['lbw', 'stumped', 'bowled'].includes(dismissalType)) {
        this.spinWeakness = _clamp(this.spinWeakness + 2, 0, 10);
      }
      if (['caught', 'caught behind'].includes(dismissalType)) {
        this.bounceWeakness = _clamp(this.bounceWeakness + 2, 0, 10);
      }
    }

    // Decay over time
    if (this._history.length % 6 === 0) {
      this.aggressionScore  *= 0.9;
      this.spinWeakness     *= 0.85;
      this.bounceWeakness   *= 0.85;
    }
  }

  get recentDotRate() {
    const last12 = this._history.slice(-12);
    if (!last12.length) return 0;
    return last12.filter(b => b.runs === 0 && b.outcome !== 'wicket').length / last12.length;
  }

  get recentBoundaryRate() {
    const last12 = this._history.slice(-12);
    if (!last12.length) return 0;
    return last12.filter(b => b.outcome === 'four' || b.outcome === 'six').length / last12.length;
  }

  get isHotStreak() {
    const last6 = this._history.slice(-6);
    return last6.filter(b => b.outcome === 'four' || b.outcome === 'six').length >= 3;
  }

  get isColdStreak() {
    const last8 = this._history.slice(-8);
    return last8.filter(b => b.runs === 0 && b.outcome !== 'wicket').length >= 5;
  }

  get likelyToAttack() {
    return this.aggressionScore > 3 || this.isHotStreak;
  }

  get likelyToDefend() {
    return this.aggressionScore < -3 || this.isColdStreak;
  }
}

/* ============================================================
   1. AI BATTING INTENT
   Called when AI controls the batting side
   ============================================================ */

export function aipickbattingintent(striker, bowler, ctx) {
  const {
    innings       = 1,
    oversDone     = 0,
    runs          = 0,
    wickets       = 0,
    target        = null,
    totalOvers    = 20,
    legalBalls    = 0,
    difficulty    = 'medium',
    patternTracker = null
  } = ctx ?? {};

  const phase      = _getPhase(oversDone, totalOvers);
  const rrrVal     = _rrRequired(target, runs, legalBalls, totalOvers);
  const crrVal     = _currentRR(runs, legalBalls);
  const wPressure  = _wicketsPressure(wickets);
  const batterPS   = _psScore(striker);
  const bowlerPS   = _psScore(bowler);

  // Base intent weights [defensive, neutral, aggressive, attack]
  let w = [10, 30, 35, 25];

  // ── Phase adjustments ──────────────────────────────────
  if (phase === 'powerplay') {
    w = [5, 20, 40, 35]; // Powerplay → push hard
  } else if (phase === 'death') {
    w = [3, 15, 35, 47]; // Death → maximum aggression
  }

  // ── Innings 2 run-rate pressure ────────────────────────
  if (innings === 2 && rrrVal !== null) {
    if (rrrVal > crrVal + 4) {
      // Need big RR — go all out
      w[0] = 1; w[1] = 8; w[2] = 30; w[3] = 61;
    } else if (rrrVal > crrVal + 2) {
      w[0] = 3; w[1] = 15; w[2] = 38; w[3] = 44;
    } else if (rrrVal < crrVal - 3) {
      // Way ahead — consolidate
      w[0] = 15; w[1] = 40; w[2] = 30; w[3] = 15;
    }
  }

  // ── Wicket pressure ────────────────────────────────────
  w[0] += wPressure * 20;
  w[1] += wPressure * 10;
  w[2] -= wPressure * 15;
  w[3] -= wPressure * 15;

  // ── Batter PS ──────────────────────────────────────────
  if (batterPS >= 80) {
    w[2] += 10; w[3] += 15;
  } else if (batterPS <= 30) {
    w[0] += 15; w[1] += 10;
  }

  // ── Bowler PS retaliation ──────────────────────────────
  if (bowlerPS >= 80) {
    w[0] += 8; w[1] += 5; w[2] -= 5; w[3] -= 8;
  } else if (bowlerPS <= 30) {
    w[2] += 8; w[3] += 12;
  }

  // ── Pattern tracker adjustments ───────────────────────
  if (patternTracker) {
    if (patternTracker.isHotStreak) {
      w[2] += 12; w[3] += 18; w[0] -= 5; w[1] -= 5;
    }
    if (patternTracker.isColdStreak) {
      w[0] += 15; w[1] += 10; w[2] -= 10; w[3] -= 15;
    }
    if (patternTracker.recentDotRate > 0.6) {
      // Too many dots — force aggression
      w[2] += 10; w[3] += 10;
    }
    if (patternTracker.recentBoundaryRate > 0.4) {
      // On fire — keep attacking
      w[3] += 15;
    }
  }

  // ── Difficulty modifier ────────────────────────────────
  const diffAdj = {
    easy:   [ +5,  +5,  0,   -10 ],
    medium: [  0,   0,  0,     0 ],
    hard:   [ -3,  -3,  +3,   +3 ],
    expert: [ -5,  -5,  +5,   +5 ]
  };
  const adj = diffAdj[difficulty] ?? [0, 0, 0, 0];
  w = w.map((v, i) => Math.max(1, v + adj[i]));

  return _weightedPick(INTENTS.batting, w);
}

/* ============================================================
   2. AI BOWLING INTENT
   Called when AI controls the bowling side (user is batting)
   ============================================================ */

export function aipickbowlingintent(bowler, striker, ctx) {
  const {
    innings       = 1,
    oversDone     = 0,
    wickets       = 0,
    runs          = 0,
    target        = null,
    totalOvers    = 20,
    legalBalls    = 0,
    difficulty    = 'medium',
    patternTracker = null
  } = ctx ?? {};

  const phase    = _getPhase(oversDone, totalOvers);
  const rrrVal   = _rrRequired(target, runs, legalBalls, totalOvers);
  const crrVal   = _currentRR(runs, legalBalls);
  const bowlerPS = _psScore(bowler);
  const batterPS = _psScore(striker);

  // Base weights [defensive, neutral, aggressive, attack]
  let w = [15, 35, 30, 20];

  // ── Phase ──────────────────────────────────────────────
  if (phase === 'powerplay') {
    w = [10, 25, 35, 30]; // Powerplay — attack early
  } else if (phase === 'death') {
    w = [5, 20, 35, 40];  // Death — full attack
  }

  // ── Innings 2 bowling tactics ──────────────────────────
  if (innings === 2 && rrrVal !== null) {
    if (rrrVal < crrVal - 3) {
      // Batting team well ahead — defensive bowl to maintain pressure
      w[0] += 20; w[1] += 10; w[2] -= 15; w[3] -= 15;
    } else if (rrrVal > crrVal + 3) {
      // Batting struggling — keep attacking
      w[0] -= 5; w[2] += 10; w[3] += 15;
    }
  }

  // ── Bowler PS ──────────────────────────────────────────
  if (bowlerPS >= 80) {
    w[2] += 10; w[3] += 15; // High PS bowler — confident, attack
  } else if (bowlerPS <= 30) {
    w[0] += 15; w[1] += 10; // Low PS bowler — survive, don't get hit
  }

  // ── Batter PS counter ──────────────────────────────────
  if (batterPS >= 80) {
    w[0] += 10; w[1] += 5; w[2] -= 5; w[3] -= 10;
  } else if (batterPS <= 30) {
    w[2] += 10; w[3] += 15;
  }

  // ── Pattern tracker exploitation ──────────────────────
  if (patternTracker) {
    if (patternTracker.spinWeakness > 4 && bowler?.bowlingType === 'spin') {
      // Exploit spin weakness
      w[2] += 15; w[3] += 20;
    }
    if (patternTracker.bounceWeakness > 4 && bowler?.bowlingType === 'pace') {
      w[2] += 12; w[3] += 18;
    }
    if (patternTracker.isHotStreak) {
      // Batter is on fire — switch to defence
      w[0] += 20; w[1] += 10; w[2] -= 15; w[3] -= 15;
    }
    if (patternTracker.isColdStreak) {
      // Batter struggling — keep attacking
      w[2] += 10; w[3] += 15;
    }
    if (patternTracker.likelyToAttack) {
      // Batter likely to swing — set defensive trap
      w[0] += 12; w[1] += 8;
    }
  }

  // ── Wickets taken pressure — more wickets = more attacking ─
  w[2] += wickets * 2;
  w[3] += wickets * 1;

  // ── Difficulty modifier ────────────────────────────────
  const diffAdj = {
    easy:   [ +5,  +5,  -5,  -5  ],
    medium: [  0,   0,   0,   0  ],
    hard:   [ -3,   0,  +3,  +3  ],
    expert: [ -8,  -5,  +5,  +8  ]
  };
  const adj = diffAdj[difficulty] ?? [0, 0, 0, 0];
  w = w.map((v, i) => Math.max(1, v + adj[i]));

  return _weightedPick(INTENTS.bowling, w);
}

/* ============================================================
   3. AI FIELD SETTING
   Called when AI controls the bowling side
   ============================================================ */

export function aipickfieldsetting(ctx) {
  const {
    innings       = 1,
    oversDone     = 0,
    wickets       = 0,
    runs          = 0,
    target        = null,
    totalOvers    = 20,
    legalBalls    = 0,
    difficulty    = 'medium',
    patternTracker = null
  } = ctx ?? {};

  const phase  = _getPhase(oversDone, totalOvers);
  const rrrVal = _rrRequired(target, runs, legalBalls, totalOvers);
  const crrVal = _currentRR(runs, legalBalls);

  // Weights: [attacking, balanced, defensive, seam, spin, powerplay]
  let w = [15, 40, 15, 15, 10, 5];

  // ── Phase ──────────────────────────────────────────────
  if (phase === 'powerplay') {
    w = [5, 20, 10, 20, 10, 35]; // Powerplay field in powerplay overs
  } else if (phase === 'middle') {
    w = [15, 35, 20, 15, 15, 0]; // Spin/seam mix in middle
  } else if (phase === 'death') {
    w = [40, 30, 10, 10, 10, 0]; // Attacking field at death
  }

  // ── Run rate ───────────────────────────────────────────
  if (innings === 2 && rrrVal !== null) {
    if (rrrVal < crrVal - 3) {
      // Batting well ahead — defensive
      w[2] += 20; w[0] -= 10;
    } else if (rrrVal > crrVal + 3) {
      // Batting behind — attacking to take wickets
      w[0] += 20; w[2] -= 10;
    }
  }

  // ── Many wickets fallen — can attack more ──────────────
  if (wickets >= 6) {
    w[0] += 20; w[1] -= 5; w[2] -= 15;
  } else if (wickets >= 4) {
    w[0] += 10;
  }

  // ── Pattern tracker ────────────────────────────────────
  if (patternTracker) {
    if (patternTracker.spinWeakness > 4) {
      w[4] += 20; // Spin field to exploit weakness
    }
    if (patternTracker.bounceWeakness > 4) {
      w[3] += 20; // Seam/pace field
    }
    if (patternTracker.isHotStreak) {
      w[2] += 15; w[0] -= 10; // Defensive to slow hot batter
    }
  }

  // ── Difficulty modifier ────────────────────────────────
  const diffAdj = {
    easy:   [  -5,  0,  +10,  0,   0,   0 ],
    medium: [   0,  0,    0,  0,   0,   0 ],
    hard:   [  +5,  0,   -5,  +5,  0,   0 ],
    expert: [ +10,  0,  -10,  +5,  +5,  0 ]
  };
  const adj = diffAdj[difficulty] ?? Array(6).fill(0);
  w = w.map((v, i) => Math.max(1, v + adj[i]));

  return _weightedPick(INTENTS.field, w);
}

/* ============================================================
   4. AI DECIDE OVER
   Called at end of each over when AI is bowling.
   Returns { bowlerId, bowlingIntent, fieldSetting }
   ============================================================ */

export function aidecideover(ctx) {
  const {
    bowlingXI      = [],
    bowlerStats    = {},
    bowlerOverCount = {},
    lastBowlerId   = null,
    striker        = null,
    innings        = 1,
    oversDone      = 0,
    wickets        = 0,
    runs           = 0,
    target         = null,
    totalOvers     = 20,
    legalBalls     = 0,
    difficulty     = 'medium',
    patternTracker = null
  } = ctx ?? {};

  const phase    = _getPhase(oversDone, totalOvers);
  const maxQ     = Math.floor(totalOvers / 5);
  const aiCtx    = { innings, oversDone, wickets, runs, target,
                     totalOvers, legalBalls, difficulty, patternTracker };

  // ── 1. Pick bowler ─────────────────────────────────────

  // Score each eligible bowler
  const candidates = bowlingXI
    .filter(p => {
      const oc = bowlerOverCount[p.id] ?? 0;
      return oc < maxQ && p.id !== lastBowlerId;
    })
    .map(p => {
      const oc   = bowlerOverCount[p.id] ?? 0;
      const bs   = bowlerStats[p.id]     ?? {};
      const ps   = _psScore(p);
      const wkts = bs.wickets ?? 0;
      const runs = bs.runs    ?? 1;
      const ec   = (oc > 0) ? (runs / (oc * 6)) * 6 : 6; // economy

      let score = ps;

      // Phase preferences
      if (phase === 'powerplay') {
        if (['pace', 'medium'].includes(p.bowlingType)) score += 15;
      } else if (phase === 'middle') {
        if (p.bowlingType === 'spin') score += 12;
      } else if (phase === 'death') {
        if (['pace', 'medium'].includes(p.bowlingType)) score += 18;
      }

      // Reward wicket-takers
      score += wkts * 8;

      // Penalise expensive bowlers (EC > 10)
      if (ec > 10) score -= 15;
      if (ec > 8)  score -= 8;
      if (ec < 5)  score += 10;

      // Spinner vs pattern tracker
      if (patternTracker?.spinWeakness > 4 && p.bowlingType === 'spin')  score += 20;
      if (patternTracker?.bounceWeakness > 4 && p.bowlingType === 'pace') score += 20;

      // Prefer overs not yet used (keep bowlers fresh for death)
      if (phase !== 'death' && oc === 0) score += 5;

      // Clamp score to minimum 1
      return { player: p, score: Math.max(1, score) };
    });

  let chosenBowler = null;

  if (candidates.length > 0) {
    // Weighted pick by score
    const options = candidates.map(c => c.player);
    const weights = candidates.map(c => c.score);
    chosenBowler  = _weightedPick(options, weights);
  } else {
    // Fallback: anyone with quota remaining
    const fallback = bowlingXI.find(p => (bowlerOverCount[p.id] ?? 0) < maxQ);
    chosenBowler   = fallback ?? bowlingXI[0];
  }

  // ── 2. Decide bowling intent for this over ─────────────
  const bowlingIntent = aipickbowlingintent(chosenBowler, striker, aiCtx);

  // ── 3. Decide field setting for this over ─────────────
  const fieldSetting  = aipickfieldsetting(aiCtx);

  return {
    bowlerId:      chosenBowler?.id    ?? null,
    bowlerName:    chosenBowler?.name  ?? null,
    bowlingIntent,
    fieldSetting
  };
}

/* ============================================================
   5. AI PROMOTE BATTER
   Called on wicket — decides if AI should send in a pinch-hitter
   Returns the promoted player object or null (no change)
   ============================================================ */

export function aipromotebatter(ctx) {
  const {
    nextBatterIdx  = 0,
    batOrder       = [],
    innings        = 1,
    oversDone      = 0,
    wickets        = 0,
    runs           = 0,
    target         = null,
    totalOvers     = 20,
    legalBalls     = 0,
    difficulty     = 'medium'
  } = ctx ?? {};

  const phase  = _getPhase(oversDone, totalOvers);
  const rrrVal = _rrRequired(target, runs, legalBalls, totalOvers);
  const crrVal = _currentRR(runs, legalBalls);

  // Remaining batters
  const remaining = batOrder.slice(nextBatterIdx);
  if (remaining.length === 0) return null;

  // Promote only in specific situations
  const shouldPromote = (() => {
    // Death overs — send in big hitter
    if (phase === 'death') return true;

    // Innings 2 and badly behind on RRR
    if (innings === 2 && rrrVal !== null && rrrVal > crrVal + 4) return true;

    // Wicket in powerplay — don't disrupt, keep natural order
    if (phase === 'powerplay') return false;

    // Middle overs, not desperate
    return false;
  })();

  if (!shouldPromote) return null;

  // Find the highest PS remaining batter who can hit
  const attackers = remaining
    .filter(p => {
      const role = (p.roleSubtype ?? p.role ?? '').toLowerCase();
      return !['bowler', 'spinner', 'pacer'].includes(role);
    })
    .sort((a, b) => _psScore(b) - _psScore(a));

  if (!attackers.length) return null;

  const best = attackers[0];

  // Don't promote if they're already next
  if (best.id === remaining[0]?.id) return null;

  // Difficulty guard — easy AI doesn't promote wisely
  if (difficulty === 'easy' && Math.random() > 0.3) return null;
  if (difficulty === 'medium' && Math.random() > 0.6) return null;

  return best;
}

/* ============================================================
   6. AI PICK NEXT BOWLER (lightweight, no over planning)
   Used when user controls bowling side and autoPick is off
   but AI needs a bowler for a quick decision
   ============================================================ */

export function aipicknextbowler(ctx) {
  const {
    bowlingXI      = [],
    bowlerOverCount = {},
    lastBowlerId   = null,
    totalOvers     = 20,
    oversDone      = 0
  } = ctx ?? {};

  const maxQ  = Math.floor(totalOvers / 5);
  const phase = _getPhase(oversDone, totalOvers);

  // Eligible bowlers
  const eligible = bowlingXI.filter(p =>
    (bowlerOverCount[p.id] ?? 0) < maxQ && p.id !== lastBowlerId
  );

  if (!eligible.length) {
    // Fallback — anyone with quota
    return bowlingXI.find(p => (bowlerOverCount[p.id] ?? 0) < maxQ) ?? bowlingXI[0];
  }

  // Score and pick
  const scored = eligible.map(p => {
    let score = _psScore(p);
    if (phase === 'powerplay' && ['pace', 'medium'].includes(p.bowlingType)) score += 10;
    if (phase === 'middle'   && p.bowlingType === 'spin')                    score += 10;
    if (phase === 'death'    && ['pace', 'medium'].includes(p.bowlingType))  score += 15;
    return { player: p, score: Math.max(1, score) };
  });

  return _weightedPick(
    scored.map(s => s.player),
    scored.map(s => s.score)
  );
}

/* ============================================================
   7. AI DIFFICULTY PROFILE
   Returns a descriptor object for the current difficulty
   Used by match-core to calibrate various factors
   ============================================================ */

export function getDifficultyProfile(difficulty) {
  const profiles = {
    easy: {
      label:              'Easy',
      description:        'Forgiving AI — makes frequent mistakes',
      aiDecisionAccuracy: 0.40,  // 0–1 how often AI picks optimal intent
      reviewAccuracy:     0.30,
      promotionChance:    0.20,
      aggressionBias:     -0.2,  // negative = AI plays safer
      wicketBias:         -0.3
    },
    medium: {
      label:              'Medium',
      description:        'Balanced AI — plays sensible cricket',
      aiDecisionAccuracy: 0.65,
      reviewAccuracy:     0.55,
      promotionChance:    0.50,
      aggressionBias:     0.0,
      wicketBias:         0.0
    },
    hard: {
      label:              'Hard',
      description:        'Smart AI — exploits weaknesses',
      aiDecisionAccuracy: 0.80,
      reviewAccuracy:     0.72,
      promotionChance:    0.70,
      aggressionBias:     +0.2,
      wicketBias:         +0.2
    },
    expert: {
      label:              'Expert',
      description:        'Elite AI — near-optimal every ball',
      aiDecisionAccuracy: 0.95,
      reviewAccuracy:     0.88,
      promotionChance:    0.90,
      aggressionBias:     +0.35,
      wicketBias:         +0.35
    }
  };

  return profiles[difficulty] ?? profiles.medium;
}

/* ============================================================
   8. AI SHOULD REVIEW (DRS decision helper)
   Returns true if AI should take a DRS review
   ============================================================ */

export function aishouldreview(result, ctx) {
  const {
    drsReviews  = 0,
    difficulty  = 'medium',
    wickets     = 0,
    oversDone   = 0,
    totalOvers  = 20,
    innings     = 1,
    target      = null,
    runs        = 0,
    legalBalls  = 0
  } = ctx ?? {};

  if (drsReviews <= 0)         return false;
  if (!result?.isWicket)       return false;

  const phase    = _getPhase(oversDone, totalOvers);
  const profile  = getDifficultyProfile(difficulty);
  const rrrVal   = _rrRequired(target, runs, legalBalls, totalOvers);
  const crrVal   = _currentRR(runs, legalBalls);

  let reviewProb = 0.0;

  // Only review 'borderline' dismissal types
  const borderline = ['lbw', 'caught behind', 'caught', 'stumped'];
  if (!borderline.includes(result.dismissalType)) return false;

  // Base probability from difficulty
  reviewProb = profile.reviewAccuracy;

  // Situation modifiers
  if (phase === 'death')       reviewProb += 0.15; // high stakes
  if (wickets >= 7)            reviewProb += 0.20; // last wickets — worth it
  if (innings === 2) {
    if (rrrVal !== null && rrrVal < crrVal - 2) reviewProb -= 0.20; // winning — protect review
    if (rrrVal !== null && rrrVal > crrVal + 3) reviewProb += 0.20; // losing — must fight
  }
  if (drsReviews === 1)        reviewProb -= 0.15; // last review — be conservative

  reviewProb = _clamp(reviewProb, 0.0, 1.0);

  return Math.random() < reviewProb;
}