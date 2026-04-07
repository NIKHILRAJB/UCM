// ============================================================
// match_engine.js — UCM Core Ball-by-Ball Match Engine
// Handles: SeededRNG, resolve_ball(), simulate_innings(),
//          simulate_match(), format configs, DRS logic,
//          post-match stats writer
// ============================================================

'use strict';

// ─────────────────────────────────────────────────────────────
// 2A — SEEDED RNG (xorshift32)
// ─────────────────────────────────────────────────────────────
class SeededRNG {
  constructor(seed) {
    this.state = seed >>> 0 || 1; // ensure uint32, never 0
    this.initialSeed = this.state;
  }

  // Returns float in [0, 1)
  next() {
    let s = this.state;
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    this.state = s >>> 0;
    return (this.state >>> 0) / 4294967296;
  }

  // Returns int in [min, max] inclusive
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  reset() {
    this.state = this.initialSeed;
  }
}

// ─────────────────────────────────────────────────────────────
// 2D — FORMAT CONFIGURATIONS
// ─────────────────────────────────────────────────────────────
const FORMAT_CONFIG = {
  ODI: {
    overs: 50,
    maxPerBowler: 10,
    drsReviews: 2,
    freeHit: true,
    phases: { powerplay: [1, 10], middle: [11, 40], death: [41, 50] },
    allDeath: false
  },
  T20: {
    overs: 20,
    maxPerBowler: 4,
    drsReviews: 2,
    freeHit: true,
    phases: { powerplay: [1, 6], middle: [7, 15], death: [16, 20] },
    allDeath: false
  },
  T10: {
    overs: 10,
    maxPerBowler: 2,
    drsReviews: 1,
    freeHit: true,
    phases: { powerplay: [1, 2], middle: [3, 7], death: [8, 10] },
    allDeath: false
  },
  T5: {
    overs: 5,
    maxPerBowler: 2,
    drsReviews: 1,
    freeHit: true,
    phases: null,
    allDeath: true
  },
  BIZ: {
    overs: 2,
    maxPerBowler: 1,
    drsReviews: 1,
    freeHit: true,
    phases: null,
    allDeath: true
  }
};

// ─────────────────────────────────────────────────────────────
// HELPER — Get Phase from over number + format
// ─────────────────────────────────────────────────────────────
function getPhase(overNumber, format) {
  const cfg = FORMAT_CONFIG[format];
  if (!cfg) return 'death';
  if (cfg.allDeath) return 'death';
  const p = cfg.phases;
  if (overNumber >= p.powerplay[0] && overNumber <= p.powerplay[1]) return 'powerplay';
  if (overNumber >= p.middle[0]    && overNumber <= p.middle[1])    return 'middle';
  return 'death';
}

// ─────────────────────────────────────────────────────────────
// HELPER — Effective PS calculation
// ─────────────────────────────────────────────────────────────
function getEffectivePS(player, isAI, difficulty) {
  // Form multiplier
  const formMap = { low: 0.88, medium: 1.00, high: 1.08, consistent: 1.05 };
  const formMult = formMap[(player.form || 'medium').toLowerCase()] || 1.00;

  // Fatigue multiplier
  const fatigueMap = { fresh: 1.00, average: 0.95, low: 0.88 };
  const fatigueMult = fatigueMap[(player.fatigue || 'fresh').toLowerCase()] || 1.00;

  // Difficulty multiplier (only for AI players)
  const diffMap = { easy: 0.85, medium: 1.00, hard: 1.15 };
  const diffMult = isAI ? (diffMap[(difficulty || 'medium').toLowerCase()] || 1.00) : 1.00;

  return Math.min(100, player.ps * formMult * fatigueMult * diffMult);
}

// ─────────────────────────────────────────────────────────────
// 2B — RESOLVE_BALL() — Core ball outcome function
// ─────────────────────────────────────────────────────────────
function resolve_ball(params) {
  const {
    batter,          // { ps, form, fatigue, role, roleSubtype, battingType, isAI }
    bowler,          // { ps, form, fatigue, role, roleSubtype, bowlingType, isAI }
    matchState,      // { overNumber, ballInOver, wicketsFallen, runsScored, target, ballsRemaining, runsRequired, inningsNumber }
    venue,           // { pitchType }
    fieldPreset,     // 'attacking'|'balanced'|'defensive'|'saving'|'spinTrap'|'paceTrap'
    battingIntent,   // 'defensive'|'neutral'|'aggressive'|'attack'
    bowlingIntent,   // 'defensive'|'neutral'|'aggressive'|'attack'
    format,          // 'ODI'|'T20'|'T10'|'T5'|'BIZ'
    difficulty,      // 'easy'|'medium'|'hard'
    rng,             // SeededRNG instance
    isFreeHit        // boolean
  } = params;

  // ── STEP 1: Effective PS ──────────────────────────────────
  const epsBat  = getEffectivePS(batter,  batter.isAI,  difficulty);
  const epsBowl = getEffectivePS(bowler,  bowler.isAI,  difficulty);

  // ── STEP 2: Delta ─────────────────────────────────────────
  const delta = (epsBat - epsBowl) / 100.0;

  // ── STEP 3: Base Probabilities ────────────────────────────
  let p_dot    = 0.30 - (delta * 0.15);
  let p_single = 0.28 + (delta * 0.08);
  let p_double = 0.12 + (delta * 0.04);
  let p_four   = 0.14 + (delta * 0.10);
  let p_six    = 0.06 + (delta * 0.07);
  let p_wicket = 0.08 - (delta * 0.12);
  let p_extra  = 0.02;

  // ── STEP 4: MODIFIER 1 — Batting Intent ──────────────────
  const bi = (battingIntent || 'neutral').toLowerCase();
  if (bi === 'defensive') {
    p_dot    += 0.02; p_single += 0.04;
    p_four   -= 0.03; p_six    -= 0.02; p_wicket -= 0.02;
  } else if (bi === 'aggressive') {
    p_four   += 0.03; p_six    += 0.02;
    p_dot    -= 0.03; p_wicket += 0.02;
  } else if (bi === 'attack') {
    p_six    += 0.05; p_four   += 0.03;
    p_wicket += 0.04; p_dot    -= 0.04;
  }
  // neutral = no change

  // ── STEP 5: MODIFIER 2 — Field Setting ───────────────────
  const fp = (fieldPreset || 'balanced').toLowerCase();
  if (fp === 'attacking') {
    p_wicket += 0.03; p_four -= 0.02; p_single -= 0.01;
  } else if (fp === 'defensive') {
    p_four -= 0.03; p_single += 0.02; p_dot += 0.01;
  } else if (fp === 'saving') {
    p_six -= 0.02; p_four -= 0.02; p_single += 0.03; p_double += 0.01;
  } else if (fp === 'spintrap') {
    p_wicket += 0.03; p_dot += 0.02; p_six += 0.01;
  } else if (fp === 'pacetrap') {
    p_wicket += 0.02; p_four -= 0.02;
  }
  // balanced = no change

  // ── STEP 6: MODIFIER 3 — Fatigue Penalty ─────────────────
  if ((bowler.fatigue || 'fresh').toLowerCase() === 'low') {
    p_wicket -= 0.02; p_four += 0.01; p_six += 0.01;
  }

  // ── STEP 7: MODIFIER 4 — Pressure Index ──────────────────
  if (matchState.inningsNumber === 2 && matchState.ballsRemaining > 0) {
    const pressureIndex = matchState.runsRequired / matchState.ballsRemaining;
    if (pressureIndex > 1.5) {
      p_wicket += 0.03; p_six += 0.02; p_dot += 0.02;
    } else if (pressureIndex < 0.5) {
      p_single += 0.02; p_dot += 0.02;
    }
  }

  // ── STEP 8: MODIFIER 5 — Role Modifier ───────────────────
  const batSub  = (batter.roleSubtype  || '').toLowerCase();
  const bowlSub = (bowler.roleSubtype  || '').toLowerCase();

  // Batter role subtypes
  if (batSub === 'finisher') {
    p_six += 0.04; p_dot -= 0.02; p_wicket += 0.02;
  } else if (batSub === 'top order') {
    p_single += 0.02; p_double += 0.01;
  } else if (batSub === 'middle order') {
    p_single += 0.01; p_four += 0.01;
  }

  // Bowler role subtypes
  if (bowlSub === 'death bowler') {
    p_wicket += 0.02; p_dot += 0.02; p_six -= 0.02;
  } else if (bowlSub === 'powerplay bowler') {
    p_wicket += 0.01; p_four -= 0.01;
  }

  // ── STEP 9: MODIFIER 6 — Pitch Modifier ──────────────────
  const pitch   = (venue?.pitchType || 'good').toLowerCase();
  const bType   = (bowler.bowlingType || 'pace').toLowerCase();

  if (pitch === 'flat') {
    p_four += 0.03; p_six += 0.02; p_wicket -= 0.03;
  } else if (pitch === 'deteriorating') {
    p_wicket += 0.02; p_dot += 0.01; p_four -= 0.02;
  } else if (pitch === 'rank turner') {
    if (bType === 'spin') {
      p_wicket += 0.05; p_dot += 0.03; p_four -= 0.04; p_six -= 0.03;
    } else {
      // pace on turner gets slight advantage too
      p_wicket += 0.01; p_dot += 0.01;
    }
  }
  // good pitch = no change

  // ── STEP 10: MODIFIER 7 — Phase Modifier ─────────────────
  const phase = getPhase(matchState.overNumber, format);
  if (phase === 'powerplay') {
    p_four += 0.02; p_six += 0.01; p_wicket += 0.01;
  } else if (phase === 'middle') {
    p_dot += 0.02; p_single += 0.01; p_wicket -= 0.01;
  } else if (phase === 'death') {
    p_six += 0.03; p_four += 0.02; p_wicket += 0.02; p_dot -= 0.03;
  }

  // ── STEP 11: MODIFIER 8 — Difficulty Outcome ─────────────
  const diff = (difficulty || 'medium').toLowerCase();
  const userIsBatting = !batter.isAI;

  if (diff === 'easy') {
    if (userIsBatting) {
      // Easier for user batter
      p_wicket -= 0.03; p_four += 0.02; p_dot -= 0.02;
    } else {
      // Easier for user bowler
      p_wicket += 0.02; p_four -= 0.02; p_dot += 0.01;
    }
  } else if (diff === 'hard') {
    if (userIsBatting) {
      // Harder for user batter
      p_wicket += 0.03; p_four -= 0.02; p_dot += 0.02;
    } else {
      // Harder for user bowler
      p_wicket -= 0.02; p_four += 0.02; p_dot -= 0.01;
    }
  }
  // medium = no change

  // ── STEP 12: Free Hit — wicket not possible ───────────────
  if (isFreeHit) {
    p_dot    += p_wicket * 0.6; // redistribute wicket prob
    p_single += p_wicket * 0.4;
    p_wicket  = 0;
  }

  // ── STEP 13: Clamp all to min 0 ──────────────────────────
  p_dot    = Math.max(0, p_dot);
  p_single = Math.max(0, p_single);
  p_double = Math.max(0, p_double);
  p_four   = Math.max(0, p_four);
  p_six    = Math.max(0, p_six);
  p_wicket = Math.max(0, p_wicket);
  p_extra  = Math.max(0, p_extra);

  // ── STEP 14: Normalize to 1.0 ────────────────────────────
  const total = p_dot + p_single + p_double + p_four + p_six + p_wicket + p_extra;
  p_dot    /= total;
  p_single /= total;
  p_double /= total;
  p_four   /= total;
  p_six    /= total;
  p_wicket /= total;
  p_extra  /= total;

  // ── STEP 15: Weighted RNG Pick ────────────────────────────
  const rand = rng.next();
  const buckets = [
    { key: 'dot',    runs: 0, cumulative: p_dot },
    { key: 'single', runs: 1, cumulative: p_dot + p_single },
    { key: 'double', runs: 2, cumulative: p_dot + p_single + p_double },
    { key: 'four',   runs: 4, cumulative: p_dot + p_single + p_double + p_four },
    { key: 'six',    runs: 6, cumulative: p_dot + p_single + p_double + p_four + p_six },
    { key: 'wicket', runs: 0, cumulative: p_dot + p_single + p_double + p_four + p_six + p_wicket },
    { key: 'extra',  runs: 1, cumulative: 1.0 }
  ];

  let outcome = buckets[buckets.length - 1];
  for (const b of buckets) {
    if (rand < b.cumulative) { outcome = b; break; }
  }

  // ── STEP 16: Wicket — determine dismissal type ────────────
  let dismissalType = null;
  let isDrsEligible = false;

  if (outcome.key === 'wicket') {
    const bTypeForDismissal = (bowler.bowlingType || 'pace').toLowerCase();
    const dRand = rng.next();

    if (bTypeForDismissal === 'pace') {
      if      (dRand < 0.30) dismissalType = 'bowled';
      else if (dRand < 0.65) dismissalType = 'caught';
      else if (dRand < 0.85) dismissalType = 'lbw';
      else                   dismissalType = 'caught_behind';
    } else {
      // spin
      if      (dRand < 0.25) dismissalType = 'bowled';
      else if (dRand < 0.45) dismissalType = 'caught';
      else if (dRand < 0.65) dismissalType = 'lbw';
      else if (dRand < 0.80) dismissalType = 'stumped';
      else                   dismissalType = 'caught_behind';
    }

    isDrsEligible = (dismissalType === 'lbw' || dismissalType === 'caught_behind');
  }

  // ── STEP 17: Extra — determine type ──────────────────────
  let extraType = null;
  let isFreeHitNext = false;
  if (outcome.key === 'extra') {
    const eRand = rng.next();
    extraType = eRand < 0.6 ? 'wide' : 'no_ball';
    // Free hit on no-ball for all formats
    if (extraType === 'no_ball' && FORMAT_CONFIG[format]?.freeHit) {
      isFreeHitNext = true;
    }
  }

  // ── STEP 18: Commentary ───────────────────────────────────
  const commentary = generateCommentary(outcome.key, dismissalType, extraType, batter, bowler, delta);

  // ── RETURN ────────────────────────────────────────────────
  return {
    outcome:        outcome.key,
    runs:           outcome.runs,
    isWicket:       outcome.key === 'wicket',
    dismissalType,
    isDrsEligible,
    isFreeHitNext,
    extraType,
    commentary,
    // Debug info
    _debug: {
      delta: delta.toFixed(4),
      epsBat: epsBat.toFixed(2),
      epsBowl: epsBowl.toFixed(2),
      probabilities: {
        dot: p_dot.toFixed(4), single: p_single.toFixed(4),
        double: p_double.toFixed(4), four: p_four.toFixed(4),
        six: p_six.toFixed(4), wicket: p_wicket.toFixed(4),
        extra: p_extra.toFixed(4)
      },
      rand: rand.toFixed(4),
      phase
    }
  };
}

// ─────────────────────────────────────────────────────────────
// 2E — DRS SYSTEM
// ─────────────────────────────────────────────────────────────
function resolve_drs(bowlerPS, rng) {
  const overturnChance = 0.30 + ((bowlerPS - 50) / 100 * 0.30);
  const clampedChance  = Math.min(0.60, Math.max(0.15, overturnChance));
  const rand = rng.next();
  // overturnChance = chance original OUT is correct = DRS fails for batter
  // So if rand < overturnChance → OUT upheld → DRS FAILED
  //    if rand >= overturnChance → NOT OUT   → DRS SUCCEEDED
  const upheld = rand < clampedChance;
  return {
    upheld,           // true = batter still OUT | false = batter NOT OUT
    overturnChance:   clampedChance.toFixed(3),
    result:           upheld ? 'OUT — Upheld' : 'NOT OUT — Overturned'
  };
}

// ─────────────────────────────────────────────────────────────
// 2C — INNINGS SIMULATION
// ─────────────────────────────────────────────────────────────
function simulate_innings(params) {
  const {
    battingTeam,    // array of 11 player objects (batting order)
    bowlingTeam,    // array of 11 player objects
    bowlingOrder,   // array of player IDs in bowling rotation order
    format,
    venue,
    difficulty,
    rng,
    target,         // null for innings 1 | number for innings 2
    inningsNumber,  // 1 or 2
    userTeamId,     // to determine isAI flags
    fieldPreset,    // starting field preset
    battingIntent,  // starting batting intent
    bowlingIntent   // starting bowling intent
  } = params;

  const cfg = FORMAT_CONFIG[format];
  const maxOvers   = cfg.overs;
  const maxPerBowl = cfg.maxPerBowler;

  // ── State ─────────────────────────────────────────────────
  let totalRuns    = 0;
  let wickets      = 0;
  let legalBalls   = 0;
  let isFreeHit    = false;
  let currentOver  = 1;

  // Batter tracking
  const batterStats = {};
  battingTeam.forEach(p => {
    batterStats[p.id] = { runs: 0, balls: 0, fours: 0, sixes: 0, dismissal: null };
  });

  // Bowler tracking
  const bowlerStats = {};
  bowlingTeam.forEach(p => {
    bowlerStats[p.id] = { overs: 0, balls: 0, wickets: 0, runs: 0, extras: 0 };
  });

  // Bowling rotation state
  const bowlerOverCount = {};
  bowlingTeam.forEach(p => { bowlerOverCount[p.id] = 0; });
  let lastBowlerId      = null;

  // Batting order state
  let strikerIdx    = 0; // index in battingTeam
  let nonStrikerIdx = 1;
  let nextBatterIdx = 2;

  // Scorecard
  const overs           = [];
  const fallOfWickets   = [];
  const extras          = { wides: 0, noBalls: 0, total: 0 };

  // Current over intent tracking (can change per ball in ball-by-ball)
  let currentFieldPreset  = fieldPreset  || 'balanced';
  let currentBatIntent    = battingIntent || 'neutral';
  let currentBowlIntent   = bowlingIntent || 'neutral';

  // ── Helper: pick next bowler ──────────────────────────────
  function pickNextBowler(overNum) {
    // Use bowling order array, skip if: quota exceeded or bowled previous over
    for (const pid of bowlingOrder) {
      if (pid === lastBowlerId) continue;
      if ((bowlerOverCount[pid] || 0) >= maxPerBowl) continue;
      return pid;
    }
    // Fallback: anyone available
    for (const pid of bowlingOrder) {
      if ((bowlerOverCount[pid] || 0) < maxPerBowl) return pid;
    }
    return bowlingOrder[0]; // last resort
  }

  // ── Main innings loop ─────────────────────────────────────
  while (currentOver <= maxOvers && wickets < 10) {
    const bowlerId    = pickNextBowler(currentOver);
    const bowler      = bowlingTeam.find(p => p.id === bowlerId);
    bowlerStats[bowlerId].balls = bowlerStats[bowlerId].balls || 0;

    const overRecord  = { overNumber: currentOver, bowlerId, balls: [], runsThisOver: 0, wicketsThisOver: 0 };
    let ballsThisOver = 0; // legal balls only

    while (ballsThisOver < 6 && wickets < 10) {
      const batter      = battingTeam[strikerIdx];
      const totalBalls  = currentOver * 6 - (6 - ballsThisOver);
      const ballsLeft   = (maxOvers * 6) - (legalBalls);
      const runsNeeded  = target ? (target - totalRuns) : 0;

      const result = resolve_ball({
        batter:       { ...batter, isAI: batter.teamId !== userTeamId },
        bowler:       { ...bowler, isAI: bowler.teamId !== userTeamId },
        matchState: {
          overNumber:     currentOver,
          ballInOver:     ballsThisOver + 1,
          wicketsFallen:  wickets,
          runsScored:     totalRuns,
          target:         target || null,
          ballsRemaining: ballsLeft,
          runsRequired:   runsNeeded,
          inningsNumber
        },
        venue,
        fieldPreset:    currentFieldPreset,
        battingIntent:  currentBatIntent,
        bowlingIntent:  currentBowlIntent,
        format,
        difficulty,
        rng,
        isFreeHit
      });

      // ── Process result ──────────────────────────────────
      isFreeHit = result.isFreeHitNext;

      if (result.outcome === 'extra') {
        // Extra — ball not counted as legal, re-bowl
        if (result.extraType === 'wide') {
          totalRuns++; extras.wides++; extras.total++;
          bowlerStats[bowlerId].runs++;
          bowlerStats[bowlerId].extras++;
        } else if (result.extraType === 'no_ball') {
          totalRuns++; extras.noBalls++; extras.total++;
          bowlerStats[bowlerId].runs++;
          bowlerStats[bowlerId].extras++;
        }
        overRecord.balls.push({ ...result, ballNumber: ballsThisOver + 1, isLegal: false });
        // Do NOT increment ballsThisOver — re-bowl
      } else {
        // Legal ball
        legalBalls++;
        ballsThisOver++;
        totalRuns += result.runs;
        bowlerStats[bowlerId].runs += result.runs;

        const bs = batterStats[batter.id];
        bs.balls++;
        bs.runs += result.runs;
        if (result.runs === 4) bs.fours++;
        if (result.runs === 6) bs.sixes++;

        if (result.isWicket) {
          bs.dismissal = result.dismissalType;
          fallOfWickets.push({ wicketNumber: wickets + 1, runsAtFall: totalRuns, overAtFall: `${currentOver}.${ballsThisOver}` });
          wickets++;
          overRecord.wicketsThisOver++;
          bowlerStats[bowlerId].wickets++;

          // Bring in new batter
          if (nextBatterIdx < battingTeam.length) {
            strikerIdx = nextBatterIdx++;
          }
        }

        // Strike rotation — odd runs swap striker
        if (!result.isWicket) {
          if (result.runs % 2 !== 0) {
            [strikerIdx, nonStrikerIdx] = [nonStrikerIdx, strikerIdx];
          }
        }

        overRecord.balls.push({ ...result, ballNumber: ballsThisOver, isLegal: true });
        overRecord.runsThisOver += result.runs;

        // Check if innings 2 target reached
        if (target && totalRuns >= target) break;
      }
    } // end ball loop

    // End of over — swap strike
    [strikerIdx, nonStrikerIdx] = [nonStrikerIdx, strikerIdx];

    bowlerStats[bowlerId].overs += 1;
    bowlerOverCount[bowlerId]   = (bowlerOverCount[bowlerId] || 0) + 1;
    lastBowlerId                = bowlerId;

    overs.push(overRecord);
    currentOver++;

    // Check target reached
    if (target && totalRuns >= target) break;
  }

  // ── Build batting scorecard ───────────────────────────────
  const battingScorecard = battingTeam.map(p => ({
    playerId:   p.id,
    playerName: p.name,
    runs:       batterStats[p.id].runs,
    balls:      batterStats[p.id].balls,
    fours:      batterStats[p.id].fours,
    sixes:      batterStats[p.id].sixes,
    dismissal:  batterStats[p.id].dismissal,
    notOut:     batterStats[p.id].dismissal === null
  })).filter(p => p.balls > 0 || p.notOut);

  // ── Build bowling figures ─────────────────────────────────
  const bowlingFigures = bowlingTeam
    .filter(p => bowlerStats[p.id].overs > 0)
    .map(p => ({
      playerId:   p.id,
      playerName: p.name,
      overs:      bowlerStats[p.id].overs,
      wickets:    bowlerStats[p.id].wickets,
      runs:       bowlerStats[p.id].runs,
      extras:     bowlerStats[p.id].extras
    }));

  return {
    totalRuns,
    wickets,
    oversFaced:     currentOver - 1,
    battingScorecard,
    bowlingFigures,
    fallOfWickets,
    extras,
    overs,
    // Result check for innings 2
    targetReached:  target ? totalRuns >= target : null
  };
}

// ─────────────────────────────────────────────────────────────
// simulate_match() — Full match wrapper
// ─────────────────────────────────────────────────────────────
function simulate_match(params) {
  const {
    teamA,          // { id, name, players[], battingOrder[], bowlingOrder[] }
    teamB,          // { id, name, players[], battingOrder[], bowlingOrder[] }
    format,
    venue,
    difficulty,
    seed,
    userTeamId,
    tossCoinResult, // optional override; if null, engine flips
    tossDecision    // 'bat' | 'bowl' — user's choice if they win toss
  } = params;

  const rng = new SeededRNG(seed || Math.floor(Math.random() * 999999));

  // ── Toss ──────────────────────────────────────────────────
  const tossWinner   = rng.next() < 0.5 ? teamA.id : teamB.id;
  const tossDecision_ = tossWinner === userTeamId
    ? (tossDecision || 'bat')
    : (rng.next() < 0.5 ? 'bat' : 'bowl'); // AI randomly decides

  const battingFirstId = (tossDecision_ === 'bat') ? tossWinner
    : (tossWinner === teamA.id ? teamB.id : teamA.id);

  const battingFirst  = battingFirstId === teamA.id ? teamA : teamB;
  const bowlingFirst  = battingFirstId === teamA.id ? teamB : teamA;

  // ── Innings 1 ─────────────────────────────────────────────
  const innings1 = simulate_innings({
    battingTeam:    battingFirst.battingOrder.map(id => battingFirst.players.find(p => p.id === id)),
    bowlingTeam:    bowlingFirst.players,
    bowlingOrder:   bowlingFirst.bowlingOrder,
    format,
    venue,
    difficulty,
    rng,
    target:         null,
    inningsNumber:  1,
    userTeamId,
    fieldPreset:    'balanced',
    battingIntent:  'neutral',
    bowlingIntent:  'neutral'
  });

  const target = innings1.totalRuns + 1;

  // ── Innings 2 ─────────────────────────────────────────────
  const innings2 = simulate_innings({
    battingTeam:    bowlingFirst.battingOrder.map(id => bowlingFirst.players.find(p => p.id === id)),
    bowlingTeam:    battingFirst.players,
    bowlingOrder:   battingFirst.bowlingOrder,
    format,
    venue,
    difficulty,
    rng,
    target,
    inningsNumber:  2,
    userTeamId,
    fieldPreset:    'balanced',
    battingIntent:  'neutral',
    bowlingIntent:  'neutral'
  });

  // ── Result ────────────────────────────────────────────────
  let result, winMargin;
  if (innings2.targetReached) {
    result    = bowlingFirst.id;
    winMargin = { wickets: 10 - innings2.wickets };
  } else if (innings2.totalRuns === innings1.totalRuns) {
    result    = 'tie';
    winMargin = null;
  } else {
    result    = battingFirst.id;
    winMargin = { runs: innings1.totalRuns - innings2.totalRuns };
  }

  // ── Player of the Match ───────────────────────────────────
  const potm = selectPlayerOfMatch(innings1, innings2);

  return {
    matchId:       generateMatchId(teamA, teamB, format),
    format,
    venueId:       venue?.id || null,
    seed:          rng.initialSeed,
    tossWinner,
    tossDecision:  tossDecision_,
    battingFirstId,
    innings1,
    innings2,
    result,
    winMargin,
    playerOfMatch: potm,
    teamAId:       teamA.id,
    teamBId:       teamB.id
  };
}

// ─────────────────────────────────────────────────────────────
// 2F — POST-MATCH STATS WRITER
// ─────────────────────────────────────────────────────────────
function writePostMatchStats(matchResult, db) {
  const { innings1, innings2, result, winMargin, matchId, teamAId, teamBId } = matchResult;

  // Write batting stats for both innings
  [innings1, innings2].forEach(innings => {
    innings.battingScorecard.forEach(batter => {
      const existing = db.exec(`SELECT career_stats FROM Players WHERE id = '${batter.playerId}'`);
      if (!existing[0]?.values[0]) return;

      let stats = JSON.parse(existing[0].values[0][0] || '{}');
      stats.batting = stats.batting || { runs: 0, balls: 0, fours: 0, sixes: 0, innings: 0, notOuts: 0 };
      stats.batting.runs    += batter.runs;
      stats.batting.balls   += batter.balls;
      stats.batting.fours   += batter.fours;
      stats.batting.sixes   += batter.sixes;
      stats.batting.innings += 1;
      if (batter.notOut) stats.batting.notOuts += 1;

      db.run(`UPDATE Players SET career_stats = ? WHERE id = ?`,
        [JSON.stringify(stats), batter.playerId]);
    });

    innings.bowlingFigures.forEach(bowler => {
      const existing = db.exec(`SELECT career_stats FROM Players WHERE id = '${bowler.playerId}'`);
      if (!existing[0]?.values[0]) return;

      let stats = JSON.parse(existing[0].values[0][0] || '{}');
      stats.bowling = stats.bowling || { overs: 0, wickets: 0, runs: 0, extras: 0, innings: 0 };
      stats.bowling.overs   += bowler.overs;
      stats.bowling.wickets += bowler.wickets;
      stats.bowling.runs    += bowler.runs;
      stats.bowling.extras  += bowler.extras;
      stats.bowling.innings += 1;

      db.run(`UPDATE Players SET career_stats = ? WHERE id = ?`,
        [JSON.stringify(stats), bowler.playerId]);
    });
  });

  // Write to Fixtures table
  db.run(`UPDATE Fixtures SET
    home_score = ?, away_score = ?, result = ?, match_data = ?
    WHERE match_id = ?`, [
    innings1.totalRuns + '/' + innings1.wickets,
    innings2.totalRuns + '/' + innings2.wickets,
    result === 'tie' ? 'tie' : `${result}_win`,
    JSON.stringify(matchResult),
    matchId
  ]);

  // Update SeasonPoints
  if (result !== 'tie') {
    db.run(`UPDATE SeasonPoints SET wins = wins + 1, points = points + 2 WHERE team_id = ?`, [result]);
    const loser = result === teamAId ? teamBId : teamAId;
    db.run(`UPDATE SeasonPoints SET losses = losses + 1 WHERE team_id = ?`, [loser]);
  } else {
    db.run(`UPDATE SeasonPoints SET draws = draws + 1, points = points + 1 WHERE team_id = ?`, [teamAId]);
    db.run(`UPDATE SeasonPoints SET draws = draws + 1, points = points + 1 WHERE team_id = ?`, [teamBId]);
  }
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function selectPlayerOfMatch(inn1, inn2) {
  let best = null, bestScore = -1;
  [...inn1.battingScorecard, ...inn2.battingScorecard].forEach(b => {
    const score = b.runs + (b.fours * 0.5) + (b.sixes * 1.5);
    if (score > bestScore) { bestScore = score; best = b.playerId; }
  });
  [...inn1.bowlingFigures, ...inn2.bowlingFigures].forEach(b => {
    const score = b.wickets * 25 - b.runs * 0.1;
    if (score > bestScore) { bestScore = score; best = b.playerId; }
  });
  return best;
}

function generateMatchId(teamA, teamB, format) {
  const ts = Date.now().toString(36).toUpperCase();
  return `${teamA.shortName || teamA.id}-${teamB.shortName || teamB.id}-${format}-${ts}`;
}

function generateCommentary(outcome, dismissalType, extraType, batter, bowler, delta) {
  const batterName = batter?.name || 'Batter';
  const bowlerName = bowler?.name || 'Bowler';
  const comments = {
    dot:    [`Defended solidly. Dot ball.`, `Good length, played out carefully.`, `Beats the outside edge — dot!`],
    single: [`Pushed to mid-on, quick single.`, `Worked to leg, easy single.`, `Tapped to cover, one run.`],
    double: [`Driven to the gap, they run two!`, `Misfield in the outfield — two runs!`, `Good running between the wickets, two!`],
    four:   [`FOUR! Cracked through the covers!`, `FOUR! Driven magnificently!`, `FOUR! Pulled off the hip — boundary!`],
    six:    [`SIX! Absolutely towering hit!`, `SIX! Over long-on, that's massive!`, `SIX! Cleared the rope with ease!`],
    wicket: {
      bowled:        `BOWLED! Through the gate — timber!`,
      caught:        `CAUGHT! Up in the air and taken!`,
      lbw:           `LBW! Struck on the pad, finger goes up!`,
      caught_behind: `CAUGHT BEHIND! Edge through to the keeper!`,
      stumped:       `STUMPED! Down the track and beaten — out!`,
      run_out:       `RUN OUT! Direct hit — that's out!`
    },
    extra: {
      wide:   `Wide ball — extra run awarded.`,
      no_ball: `NO BALL! Free hit on the next delivery!`
    }
  };

  if (outcome === 'wicket') return comments.wicket[dismissalType] || 'OUT!';
  if (outcome === 'extra')  return comments.extra[extraType]      || 'Extra.';

  const arr = comments[outcome] || ['Ball played.'];
  // Pick comment deterministically based on delta
  return arr[Math.floor(Math.abs(delta) * arr.length) % arr.length];
}

// ─────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SeededRNG,
    FORMAT_CONFIG,
    resolve_ball,
    resolve_drs,
    simulate_innings,
    simulate_match,
    writePostMatchStats,
    getPhase,
    getEffectivePS
  };
}

