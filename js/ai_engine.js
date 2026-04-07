// ============================================================
// ai_engine.js — UCM AI Decision Engine
// Handles: AI batting intent, bowling intent, field selection,
//          bowler selection, batter promotion — all 3 difficulties
// Depends on: match_engine.js (FORMAT_CONFIG, getPhase)
// ============================================================

'use strict';

// ─────────────────────────────────────────────────────────────
// DIFFICULTY MULTIPLIERS (applied to AI player PS in engine)
// Defined here as reference — actual application in match_engine.js
// ─────────────────────────────────────────────────────────────
const AI_PS_MULTIPLIER = {
  easy:   0.85,
  medium: 1.00,
  hard:   1.15
};

// ─────────────────────────────────────────────────────────────
// AI BATTING INTENT PICKER
// Decides what batting intent the AI uses for the current ball
// ─────────────────────────────────────────────────────────────
function ai_pick_batting_intent(params) {
  const {
    difficulty,
    matchState,   // { overNumber, ballInOver, wicketsFallen, runsScored, target, ballsRemaining, runsRequired, inningsNumber }
    batter,       // current batter object
    bowler,       // current bowler object
    format,
    rng
  } = params;

  const diff = (difficulty || 'medium').toLowerCase();

  // ── EASY: random from weighted distribution ───────────────
  if (diff === 'easy') {
    const rand = rng.next();
    if (rand < 0.25) return 'defensive';
    if (rand < 0.55) return 'neutral';
    if (rand < 0.80) return 'aggressive';
    return 'attack';
  }

  // ── MEDIUM: situation-aware ───────────────────────────────
  if (diff === 'medium') {
    const { overNumber, wicketsFallen, inningsNumber, runsRequired, ballsRemaining } = matchState;
    const phase = getPhaseAI(overNumber, format);

    // Innings 2 — chasing
    if (inningsNumber === 2 && ballsRemaining > 0) {
      const rr = runsRequired / (ballsRemaining / 6); // required run rate
      if (rr > 12)      return 'attack';
      if (rr > 9)       return 'aggressive';
      if (rr > 6)       return 'neutral';
      return 'defensive';
    }

    // Innings 1 — setting target
    if (wicketsFallen >= 7)  return 'defensive'; // protect tail
    if (phase === 'death')   return 'aggressive';
    if (phase === 'powerplay' && wicketsFallen < 2) return 'aggressive';
    return 'neutral';
  }

  // ── HARD: matchup-aware + pattern reading ─────────────────
  if (diff === 'hard') {
    const { overNumber, wicketsFallen, inningsNumber, runsRequired, ballsRemaining } = matchState;
    const phase = getPhaseAI(overNumber, format);

    // Innings 2 pressure-based
    if (inningsNumber === 2 && ballsRemaining > 0) {
      const rr = runsRequired / (ballsRemaining / 6);
      if (rr > 15)      return 'attack';
      if (rr > 10)      return 'aggressive';
      if (rr > 7)       return 'neutral';
      if (rr < 4)       return 'defensive'; // cruising
      return 'neutral';
    }

    // Batter subtype awareness
    const batSub = (batter?.roleSubtype || '').toLowerCase();
    if (batSub === 'finisher' && phase === 'death') return 'attack';
    if (batSub === 'top order' && phase === 'powerplay' && wicketsFallen < 2) return 'aggressive';

    // Bowler matchup — if weak bowler, attack
    const bowlPS = bowler?.ps || 60;
    if (bowlPS < 50) return 'aggressive';
    if (bowlPS > 80 && wicketsFallen < 5) return 'defensive'; // respect elite bowler

    if (phase === 'death')     return 'aggressive';
    if (phase === 'powerplay') return 'aggressive';
    return 'neutral';
  }

  return 'neutral';
}

// ─────────────────────────────────────────────────────────────
// AI BOWLING INTENT PICKER
// ─────────────────────────────────────────────────────────────
function ai_pick_bowling_intent(params) {
  const {
    difficulty,
    matchState,
    bowler,
    batter,
    format,
    rng
  } = params;

  const diff = (difficulty || 'medium').toLowerCase();

  // ── EASY: random ──────────────────────────────────────────
  if (diff === 'easy') {
    const rand = rng.next();
    if (rand < 0.25) return 'defensive';
    if (rand < 0.60) return 'neutral';
    if (rand < 0.85) return 'aggressive';
    return 'attack';
  }

  // ── MEDIUM: situation-aware ───────────────────────────────
  if (diff === 'medium') {
    const { overNumber, wicketsFallen, inningsNumber, runsRequired, ballsRemaining } = matchState;
    const phase = getPhaseAI(overNumber, format);

    if (phase === 'death' && inningsNumber === 1) return 'defensive'; // protect runs
    if (wicketsFallen < 3 && phase === 'powerplay') return 'aggressive'; // attack early
    if (inningsNumber === 2 && runsRequired < 20 && ballsRemaining > 12) return 'defensive';
    return 'neutral';
  }

  // ── HARD: matchup counter-strategy ───────────────────────
  if (diff === 'hard') {
    const { overNumber, wicketsFallen, inningsNumber, runsRequired, ballsRemaining } = matchState;
    const phase = getPhaseAI(overNumber, format);
    const batSub  = (batter?.roleSubtype  || '').toLowerCase();
    const bowlPS  = bowler?.ps || 60;
    const batPS   = batter?.ps || 60;

    // Elite bowler vs weak batter — go for wicket
    if (bowlPS > 75 && batPS < 55) return 'attack';

    // Finisher batter in death — don't give him room
    if (batSub === 'finisher' && phase === 'death') return 'aggressive';

    // Defending small target in death
    if (inningsNumber === 2 && runsRequired < 15 && ballsRemaining <= 12) return 'defensive';

    // Chasing and need wickets
    if (inningsNumber === 1 && wicketsFallen < 4 && phase === 'powerplay') return 'aggressive';

    if (phase === 'death') return 'aggressive';
    return 'neutral';
  }

  return 'neutral';
}

// ─────────────────────────────────────────────────────────────
// AI FIELD SETTING PICKER
// ─────────────────────────────────────────────────────────────
function ai_pick_field_setting(params) {
  const {
    difficulty,
    matchState,
    bowler,
    batter,
    format,
    overFieldChanges,  // how many field changes used this innings
    rng
  } = params;

  const diff  = (difficulty || 'medium').toLowerCase();
  const { overNumber, wicketsFallen, inningsNumber, runsRequired, ballsRemaining } = matchState;
  const phase = getPhaseAI(overNumber, format);

  // Max field changes per innings by difficulty
  const maxChanges = { easy: 5, medium: 6, hard: 8 };
  const limit = maxChanges[diff] || 6;

  // If limit reached, keep current (return null = no change)
  if (overFieldChanges >= limit) return null;

  // ── EASY: random from simple set ─────────────────────────
  if (diff === 'easy') {
    const opts = ['balanced', 'attacking', 'defensive', 'saving'];
    return opts[Math.floor(rng.next() * opts.length)];
  }

  // ── MEDIUM: situation-based ───────────────────────────────
  if (diff === 'medium') {
    if (phase === 'powerplay')     return 'attacking';
    if (phase === 'death' && inningsNumber === 1) return 'saving';
    if (inningsNumber === 2 && runsRequired < 20) return 'saving';
    if (wicketsFallen >= 7)        return 'saving';
    return 'balanced';
  }

  // ── HARD: full counter-strategy ──────────────────────────
  if (diff === 'hard') {
    const batSub    = (batter?.roleSubtype || '').toLowerCase();
    const bowlType  = (bowler?.bowlingType || 'pace').toLowerCase();
    const batType   = (batter?.battingType || '').toLowerCase(); // aggressive/defensive/neutral

    // Counter aggressive batter
    if (batType === 'aggressive' || batType === 'attack') return 'attacking';

    // Spin on turner pitch — set spin trap
    if (bowlType === 'spin') return 'spintrap';

    // Pace on flat pitch — pace trap
    if (bowlType === 'pace' && phase === 'powerplay') return 'pacetrap';

    // Finisher at crease in death — saving field
    if (batSub === 'finisher' && phase === 'death') return 'saving';

    // Death overs — protect boundaries
    if (phase === 'death') return 'saving';

    // Chasing comfortably — don't panic
    if (inningsNumber === 2 && runsRequired < 30 && ballsRemaining > 18) return 'defensive';

    // Wickets in hand — attack
    if (wicketsFallen < 4) return 'attacking';

    return 'balanced';
  }

  return 'balanced';
}

// ─────────────────────────────────────────────────────────────
// AI BOWLER SELECTOR
// Picks best available bowler for the current over
// ─────────────────────────────────────────────────────────────
function ai_pick_bowler(params) {
  const {
    difficulty,
    bowlingTeam,        // array of player objects
    bowlerOverCounts,   // { playerId: oversCompleted }
    lastBowlerId,       // player who bowled previous over
    matchState,
    batter,
    format,
    rng
  } = params;

  const diff    = (difficulty || 'medium').toLowerCase();
  const cfg     = typeof FORMAT_CONFIG !== 'undefined' ? FORMAT_CONFIG[format] : { maxPerBowler: 4 };
  const maxQuota = cfg?.maxPerBowler || 4;
  const { overNumber } = matchState;
  const phase   = getPhaseAI(overNumber, format);

  // Filter eligible bowlers
  const eligible = bowlingTeam.filter(p =>
    p.id !== lastBowlerId &&
    (bowlerOverCounts[p.id] || 0) < maxQuota
  );

  if (!eligible.length) {
    // Fallback — anyone under quota
    const fallback = bowlingTeam.filter(p => (bowlerOverCounts[p.id] || 0) < maxQuota);
    return fallback[0]?.id || bowlingTeam[0]?.id;
  }

  // ── EASY: random ──────────────────────────────────────────
  if (diff === 'easy') {
    return eligible[Math.floor(rng.next() * eligible.length)].id;
  }

  // ── MEDIUM: highest PS from eligible ─────────────────────
  if (diff === 'medium') {
    eligible.sort((a, b) => (b.ps || 0) - (a.ps || 0));
    return eligible[0].id;
  }

  // ── HARD: matchup-aware selection ────────────────────────
  if (diff === 'hard') {
    const batType = (batter?.battingType || '').toLowerCase(); // lhb/rhb
    const batSub  = (batter?.roleSubtype  || '').toLowerCase();

    // Score each eligible bowler
    const scored = eligible.map(bowler => {
      let score = bowler.ps || 60;

      // Phase matching
      const bowlSub = (bowler.roleSubtype || '').toLowerCase();
      if (phase === 'powerplay' && bowlSub === 'powerplay bowler') score += 10;
      if (phase === 'death'     && bowlSub === 'death bowler')     score += 10;

      // Spin vs LHB advantage
      if ((bowler.bowlingType || '').toLowerCase() === 'spin' && batType === 'lhb') score += 8;

      // Target tail with pace
      if ((bowler.bowlingType || '').toLowerCase() === 'pace' && batSub === 'tail') score += 12;

      // Avoid overused bowler
      const usageRatio = (bowlerOverCounts[bowler.id] || 0) / maxQuota;
      if (usageRatio > 0.6) score -= 5;

      return { id: bowler.id, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].id;
  }

  return eligible[0].id;
}

// ─────────────────────────────────────────────────────────────
// AI BATTER PROMOTION
// Decides if a lower-order bat-heavy player should be promoted
// ─────────────────────────────────────────────────────────────
function ai_promote_batter(params) {
  const {
    difficulty,
    remainingBatters,   // array of player objects yet to bat (in original order)
    matchState,
    bowler,
    format,
    rng
  } = params;

  const diff = (difficulty || 'medium').toLowerCase();

  // Easy — never promotes
  if (diff === 'easy') return null;

  const { overNumber, wicketsFallen } = matchState;
  const phase = getPhaseAI(overNumber, format);

  // Medium — promote finisher in death if available
  if (diff === 'medium') {
    if (phase !== 'death') return null;
    const finisher = remainingBatters.find(p => (p.roleSubtype || '').toLowerCase() === 'finisher');
    return finisher ? finisher.id : null;
  }

  // Hard — promote based on matchup + phase
  if (diff === 'hard') {
    const bowlType = (bowler?.bowlingType || 'pace').toLowerCase();

    // Promote best PS batter available if in death
    if (phase === 'death') {
      const best = remainingBatters.reduce((a, b) => ((a.ps || 0) > (b.ps || 0) ? a : b), remainingBatters[0]);
      return best ? best.id : null;
    }

    // Promote spin-friendly batter against spinner
    if (bowlType === 'spin') {
      const spinFriendly = remainingBatters.find(p =>
        (p.battingType || '').toLowerCase() === 'aggressive' && (p.ps || 0) > 60
      );
      return spinFriendly ? spinFriendly.id : null;
    }

    return null;
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// AI FULL OVER DECISION — Next Over automation
// Returns all decisions for an entire over at once
// ─────────────────────────────────────────────────────────────
function ai_decide_over(params) {
  const {
    difficulty,
    matchState,
    bowlingTeam,
    bowlerOverCounts,
    lastBowlerId,
    batter,
    bowlerCandidates,
    format,
    overFieldChanges,
    rng
  } = params;

  const bowlerId     = ai_pick_bowler({ difficulty, bowlingTeam, bowlerOverCounts, lastBowlerId, matchState, batter, format, rng });
  const bowler       = bowlingTeam.find(p => p.id === bowlerId);
  const fieldSetting = ai_pick_field_setting({ difficulty, matchState, bowler, batter, format, overFieldChanges, rng });
  const bowlingIntent = ai_pick_bowling_intent({ difficulty, matchState, bowler, batter, format, rng });

  return {
    bowlerId,
    fieldSetting: fieldSetting || 'balanced',
    bowlingIntent
  };
}

// ─────────────────────────────────────────────────────────────
// AI HARD — Pattern Tracker
// Tracks user's batting patterns across balls to counter them
// ─────────────────────────────────────────────────────────────
class AIPatternTracker {
  constructor() {
    this.ballHistory    = []; // array of { intent, outcome, runs }
    this.aggressionScore = 0; // higher = more aggressive
    this.spinWeakness    = false;
    this.bounceWeakness  = false;
  }

  recordBall(intent, outcome, runs, dismissalType) {
    this.ballHistory.push({ intent, outcome, runs, dismissalType });

    // Update aggression score
    if (intent === 'attack' || intent === 'aggressive') this.aggressionScore += 1;
    if (intent === 'defensive') this.aggressionScore = Math.max(0, this.aggressionScore - 1);

    // Detect spin weakness — dismissed by spin twice
    if (dismissalType && this.ballHistory.filter(b =>
      b.dismissalType && b.intent !== 'defensive').length >= 2) {
      this.spinWeakness = true;
    }
  }

  getCounterStrategy() {
    // Returns recommended field + bowling intent to counter user
    if (this.aggressionScore > 6) {
      return { field: 'attacking', bowlingIntent: 'aggressive', note: 'User is aggressive — go for wicket' };
    }
    if (this.spinWeakness) {
      return { field: 'spintrap', bowlingIntent: 'attack', note: 'User weak vs spin — attack with spin' };
    }
    if (this.aggressionScore < 2) {
      return { field: 'balanced', bowlingIntent: 'neutral', note: 'User is defensive — hold line' };
    }
    return { field: 'balanced', bowlingIntent: 'neutral', note: 'No clear pattern yet' };
  }

  reset() {
    this.ballHistory     = [];
    this.aggressionScore = 0;
    this.spinWeakness    = false;
    this.bounceWeakness  = false;
  }
}

// ─────────────────────────────────────────────────────────────
// HELPER — getPhase for AI (mirrors match_engine.js version)
// Kept local so ai_engine.js works standalone too
// ─────────────────────────────────────────────────────────────
function getPhaseAI(overNumber, format) {
  const phases = {
    ODI: { powerplay: [1,10], middle: [11,40], death: [41,50] },
    T20: { powerplay: [1,6],  middle: [7,15],  death: [16,20] },
    T10: { powerplay: [1,2],  middle: [3,7],   death: [8,10]  },
    T5:  null,
    BIZ: null
  };
  if (!phases[format]) return 'death'; // T5, BIZ = all death
  const p = phases[format];
  if (overNumber >= p.powerplay[0] && overNumber <= p.powerplay[1]) return 'powerplay';
  if (overNumber >= p.middle[0]    && overNumber <= p.middle[1])    return 'middle';
  return 'death';
}

// ─────────────────────────────────────────────────────────────
// AI SEASON END PS BOOST
// Applied after every season to AI team players
// ─────────────────────────────────────────────────────────────
function apply_season_ps_boost(players, difficulty, currentBoostTotal) {
  const diff = (difficulty || 'medium').toLowerCase();

  // Boost range per difficulty
  const boostRange = {
    easy:   { min: 0,   max: 0   },
    medium: { min: 3,   max: 5   },
    hard:   { min: 8,   max: 10  }
  };

  const MAX_CUMULATIVE_BOOST = 25; // hard cap

  if (diff === 'easy') return players; // no boost on easy
  if (currentBoostTotal >= MAX_CUMULATIVE_BOOST) return players; // cap reached

  const range = boostRange[diff];
  // Random boost in range (use Math.random for season-level, not ball-level)
  const boostPercent = range.min + Math.random() * (range.max - range.min);
  const actualBoost  = Math.min(boostPercent, MAX_CUMULATIVE_BOOST - currentBoostTotal);

  return players.map(player => ({
    ...player,
    ps: Math.min(100, Math.round(player.ps * (1 + actualBoost / 100)))
  }));
}

// ─────────────────────────────────────────────────────────────
// AI CLUB MODE SCORING (Phase 7B)
// Returns AI_SCORE for a team based on division + difficulty
// ─────────────────────────────────────────────────────────────
function get_ai_score(division, difficulty, season) {
  // Base scores per division + difficulty
  const baseScores = {
    div5: { easy: 100, medium: 120, hard: 132 },
    div4: { easy: 130, medium: 155, hard: 170 },
    div3: { easy: 165, medium: 195, hard: 215 },
    div2: { easy: 205, medium: 240, hard: 265 },
    div1: { easy: 250, medium: 290, hard: 320 },
    gt3:  { easy: 295, medium: 340, hard: 375 },
    gt2:  { easy: 340, medium: 385, hard: 420 },
    gt1:  { easy: 375, medium: 415, hard: 440 }
  };

  const key  = (division || 'div5').toLowerCase().replace(' ', '');
  const diff = (difficulty || 'medium').toLowerCase();
  const base = baseScores[key]?.[diff] || 120;

  // Season scaling for hard: increases every 2 seasons up to cap
  if (diff === 'hard' && season > 1) {
    const seasonBonus = Math.min(season - 1, 5) * 3;
    return base + seasonBonus;
  }

  return base;
}

// ─────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    AI_PS_MULTIPLIER,
    ai_pick_batting_intent,
    ai_pick_bowling_intent,
    ai_pick_field_setting,
    ai_pick_bowler,
    ai_promote_batter,
    ai_decide_over,
    AIPatternTracker,
    apply_season_ps_boost,
    get_ai_score
  };
}

