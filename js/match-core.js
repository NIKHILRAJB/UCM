/* ============================================================
   UCM — MATCH-CORE.JS
   Central state, boot logic, ball engine, innings control
   All 8 fixes applied
   ============================================================ */

import { resolveBall, reviewDRSResult, generateCommentary } from './match_engine.js';
import {
  aipickbattingintent,
  aipickbowlingintent,
  aipickfieldsetting,
  aidecideover,
  aipromotebatter,
  AIPatternTracker
} from './ai_engine.js';
import {
  renderAll,
  renderCommentary,
  renderScoreboard,
  renderPlayerCards,
  renderInputPanel,
  showWicketOverlay,
  showInningsBreakOverlay,
  showResultOverlay,
  showTabDot
} from './match-ui.js';


/* ============================================================
   EXPORTS — shared read-only references for ui + events
   ============================================================ */

export let md   = {};   // match data from sessionStorage
export let cfg  = {};   // format config (overs, maxPerBowler etc.)
export let live = {};   // full live game state


/* ============================================================
   UTILITIES
   ============================================================ */

export function show(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

export function hide(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

export function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function cap(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const delay = ms => new Promise(r => setTimeout(r, ms));

export function teamAbbr(name) {
  if (!name) return '???';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return name.slice(0, 3).toUpperCase();
  return words.map(w => w[0]).join('').toUpperCase().slice(0, 4);
}

// Fix 6 — Corrected isUserBatting() logic for Innings 2
export function isUserBatting() {
  if (live.innings === 1) {
    return md.tossWinner === md.userTeam
      ? md.tossChoice === 'bat'
      : md.tossChoice === 'bowl';
  }
  if (live.innings === 2) {
    // Innings 2: user bats if they didn't bat in innings 1
    return md.tossWinner === md.userTeam
      ? md.tossChoice === 'bowl'   // won toss, chose bowl → bat 2nd
      : md.tossChoice === 'bat';   // lost toss → bat if opponent chose to bat
  }
  return false;
}
export function isUserBowling() {
  return !isUserBatting();
}

export function getBattingXI() {
  return isUserBatting() ? md.userXI : md.oppXI;
}

export function getBowlingXI() {
  return isUserBatting() ? md.oppXI : md.userXI;
}

export function getBatterScorecard() {
  return getBattingXI().map(p => {
    const bs = live.batterStats[p.id] || {};
    const alreadyOut = live.battingScorecard.find(e => e.playerId === p.id);
    return {
      playerId:   p.id,
      playerName: p.name,
      runs:       bs.runs    ?? 0,
      balls:      bs.balls   ?? 0,
      fours:      bs.fours   ?? 0,
      sixes:      bs.sixes   ?? 0,
      sr:         bs.balls > 0 ? ((bs.runs / bs.balls) * 100).toFixed(1) : '0.0',
      dismissal:  alreadyOut ? alreadyOut.dismissal : null,
      notOut:     alreadyOut ? alreadyOut.notOut : true,
      didBat:     (bs.balls ?? 0) > 0
    };
  });
}

export function getExtras() {
  return {
    total:  live.extrasTally?.total  ?? 0,
    wides:  live.extrasTally?.wides  ?? 0,
    noBalls: live.extrasTally?.noBalls ?? 0,
    byes:   live.extrasTally?.byes   ?? 0,
    legByes: live.extrasTally?.legByes ?? 0
  };
}

export function getBowlingFigures() {
  return getBowlingXI().map(p => {
    const bs = live.bowlerStats[p.id] || {};
    const oc = live.bowlerOverCount[p.id] || 0;
    return {
      playerId:   p.id,
      playerName: p.name,
      overs:      oc,
      balls:      bs.balls || 0,
      runs:       bs.runs  || 0,
      wickets:    bs.wickets || 0,
      maidens:    bs.maidens || 0
    };
  });
}

export function buildAIContext() {
  return {
    innings:      live.innings,
    oversDone:    live.oversDone,
    ballInOver:   live.ballInOver,
    legalBalls:   live.legalBalls,
    runs:         live.runs,
    wickets:      live.wickets,
    target:       live.target,
    totalOvers:   cfg.overs,
    difficulty:   md.difficulty || 'medium',
    phase:        getPhase()
  };
}

function getPhase() {
  const o = live.oversDone;
  if (o < cfg.powerplayOvers)  return 'powerplay';
  if (o < cfg.overs - cfg.deathOvers) return 'middle';
  return 'death';
}



/* ============================================================
   FORMAT CONFIG
   ============================================================ */

const FORMAT_CONFIGS = {
  T20: {
    overs: 20,
    maxPerBowler: 4,
    powerplayOvers: 6,
    deathOvers: 4,
    drsReviews: 2
  },
  ODI: {
    overs: 50,
    maxPerBowler: 10,
    powerplayOvers: 10,
    deathOvers: 10,
    drsReviews: 2
  },
  T10: {
    overs: 10,
    maxPerBowler: 2,
    powerplayOvers: 2,
    deathOvers: 2,
    drsReviews: 1
  }
};


/* ============================================================
   SEEDED RNG
   ============================================================ */

class SeededRNG {
  constructor(seed) {
    this.seed = seed >>> 0;
  }
  next() {
    this.seed = (this.seed ^ (this.seed << 13)) >>> 0;
    this.seed = (this.seed ^ (this.seed >> 17)) >>> 0;
    this.seed = (this.seed ^ (this.seed << 5))  >>> 0;
    return (this.seed >>> 0) / 0xFFFFFFFF;
  }
}

export let rng = null;


/* ============================================================
   LIVE STATE INITIALISATION
   ============================================================ */

function buildFreshLiveState() {
  const battingXI = getBattingXI();
  const bowlingXI = getBowlingXI();

  const batterStats = {};
  battingXI.forEach(p => {
    batterStats[p.id] = {
      runs: 0, balls: 0, fours: 0, sixes: 0,
      dismissal: null, dotBalls: 0
    };
  });

  const bowlerStats = {};
  bowlingXI.forEach(p => {
    bowlerStats[p.id] = {
      balls: 0, runs: 0, wickets: 0, maidens: 0, dots: 0
    };
  });

  const bowlerOverCount = {};
  bowlingXI.forEach(p => { bowlerOverCount[p.id] = 0; });

  return {
    // Innings identifier
    innings:          1,
    target:           null,
    inn1Score:        null,
    inn1Wickets:      null,
    inn1Overs:        null,

    // Ball-by-ball counters
    runs:             0,
    wickets:          0,
    legalBalls:       0,
    oversDone:        0,
    ballInOver:       0,
    extras:           0,

    // Batter pointers
    batOrder:         [...battingXI],
    strikerIdx:       0,
    nonStrikerIdx:    1,
    nextBatterIdx:    2,

    // Bowler pointers
    bowlOrder:        [...bowlingXI],
    currentBowlerId:  bowlingXI[0]?.id ?? null,
    lastBowlerId:     null,

    // Stats objects
    batterStats,
    bowlerStats,
    bowlerOverCount,

    // Intent state
    strikerIntent:    null,
    nonStrikerIntent: 'neutral',
    bowlerIntent:     null,
    intentConfirmed:  false,

    // AI over decision (set by aidecideover in finishOver)
    aiOverDecision:   null,

    // Field
    fieldPreset:      'balanced',
    fieldChanges:     0,
    maxFieldChanges:  6,

    // Free hit
    isFreeHit:        false,

    // DRS
    drsReviews:       cfg.drsReviews,
    drsWaiting:       false,
    drsTimer:         null,
    pendingDRS:       null,

    // Auto sim
    autoPick:         true,
    simRunning:       false,
    stopSim:          false,

    // Over ball log (current over)
    currentOverBalls: [],

    // History
    fallOfWickets:    [],
    overLog:          [],
    battingScorecard: [],
    partnerships:     [],
    currentPartnership: { runs: 0, balls: 0, batter1: battingXI[0]?.id, batter2: battingXI[1]?.id },

    // Per-innings stats
    stats: [
      { sixes: 0, fours: 0, dots: 0, wides: 0, noBalls: 0, runsPerOver: [], wicketsPerOver: [] },
      { sixes: 0, fours: 0, dots: 0, wides: 0, noBalls: 0, runsPerOver: [], wicketsPerOver: [] }
    ],

    // Extras tally
    extrasTally: { total: 0, wides: 0, noBalls: 0 },

    // AI pattern tracker
    patternTracker: new AIPatternTracker(),

    // Innings stats index
    statsIdx: 0
  };
}


/* ============================================================
   BOOT — ENTRY POINT
   ============================================================ */

export async function bootMatchApp() {
  // 1. Load match data
  const raw = sessionStorage.getItem('UCMCURRENTMATCH');
  if (!raw) {
    window.location.href = 'friendly.html';
    return;
  }

  try {
    md = JSON.parse(raw);
  } catch {
    window.location.href = 'friendly.html';
    return;
  }

  // 2. Set format config
  cfg = FORMAT_CONFIGS[md.format] ?? FORMAT_CONFIGS['T20'];

  // 3. Init RNG
  const seed = md.seed ?? Math.floor(Math.random() * 0xFFFFFFFF);
  rng = new SeededRNG(seed);
  if (!md.seed) {
    md.seed = seed;
    sessionStorage.setItem('UCMCURRENTMATCH', JSON.stringify(md));
  }

  // 4. Update mode bar pills
  const pillFormat = document.getElementById('pill-format');
  const pillMode   = document.getElementById('pill-mode');
  if (pillFormat) pillFormat.textContent = md.format ?? 'T20';
  if (pillMode)   pillMode.textContent   = md.mode   ?? 'Friendly';

  // 5. Check for resume
  if (md.liveState) {
    showResumePrompt();
    return;
  }

  // 6. Fresh start
  initInnings(1);
}


/* ============================================================
   RESUME SESSION
   Fix 1 — Correct button IDs: btn-resume-yes / btn-resume-no
   ============================================================ */

function showResumePrompt() {
  show('resume-overlay');
  show('scrim');

  // Yes — restore saved state
  const btnYes = document.getElementById('btn-resume-yes');
  if (btnYes) {
    btnYes.addEventListener('click', () => {
      hide('resume-overlay');
      hide('scrim');
      restoreLiveState(md.liveState);
      renderAll();
    }, { once: true });
  }

  // No — discard saved state and start fresh
  const btnNo = document.getElementById('btn-resume-no');
  if (btnNo) {
    btnNo.addEventListener('click', () => {
      hide('resume-overlay');
      hide('scrim');
      delete md.liveState;
      sessionStorage.setItem('UCMCURRENTMATCH', JSON.stringify(md));
      initInnings(1);
    }, { once: true });
  }
}

function restoreLiveState(saved) {
  live = saved;
  // Restore AIPatternTracker instance (plain object after JSON parse)
  if (!(live.patternTracker instanceof AIPatternTracker)) {
    const tracker = new AIPatternTracker();
    if (saved.patternTracker?._history) {
      tracker._history        = saved.patternTracker._history;
      tracker.aggressionScore = saved.patternTracker.aggressionScore  ?? 0;
      tracker.spinWeakness    = saved.patternTracker.spinWeakness     ?? 0;
      tracker.bounceWeakness  = saved.patternTracker.bounceWeakness   ?? 0;
    }
    live.patternTracker = tracker;
  }
}


/* ============================================================
   INNINGS INIT
   ============================================================ */

export function initInnings(num) {
  const inn1Score   = num === 2 ? live.runs    : null;
  const inn1Wickets = num === 2 ? live.wickets : null;
  const inn1Overs   = num === 2 ? live.oversDone + (live.ballInOver > 0 ? 1 : 0) : null;

  live = buildFreshLiveState();

  live.innings = num;

  if (num === 2) {
    live.target       = inn1Score + 1;
    live.inn1Score    = inn1Score;
    live.inn1Wickets  = inn1Wickets;
    live.inn1Overs    = inn1Overs;
    live.statsIdx     = 1;
  }

  // Reset intent confirmed flag for fresh innings
  live.intentConfirmed = false;

  // Fix 5 — Set scoreboard team name on innings init
  const teamNameEl = document.getElementById('sb-team-name');
  if (teamNameEl) teamNameEl.textContent = teamAbbr(isUserBatting() ? md.userTeam : md.oppTeam);

  disableActionBtns(true);
  updateBowlBtnState();

  saveMatchState();
}


/* ============================================================
   BOWL BUTTON STATE
   ============================================================ */

export function updateBowlBtnState() {
  const btn = document.getElementById('btn-bowl');
  if (!btn) return;

  const needsIntent = !live.intentConfirmed && live.legalBalls === 0 && live.ballInOver === 0;
  const userBats    = isUserBatting();

  let intentReady = false;
  if (needsIntent) {
    if (userBats) {
      intentReady = live.strikerIntent !== null;
    } else {
      intentReady = live.bowlerIntent !== null && live.fieldPreset !== null;
    }
  } else {
    intentReady = true;
  }

  btn.disabled = !intentReady || live.simRunning;
}

export function markIntentConfirmed() {
  live.intentConfirmed = true;
  updateBowlBtnState();
}


/* ============================================================
   CORE ENGINE — bowlOneBall
   ============================================================ */

export async function bowlOneBall() {
  if (live.simRunning) return;
  if (live.stopSim)    return;

  // Guard: first ball intent check
  if (!live.intentConfirmed && live.legalBalls === 0 && live.ballInOver === 0) {
    updateBowlBtnState();
    return;
  }

  live.simRunning = true;
  disableActionBtns(true);

  const striker    = live.batOrder[live.strikerIdx];
  const nonStriker = live.batOrder[live.nonStrikerIdx];
  const bowlingXI  = getBowlingXI();
  const bowler     = bowlingXI.find(p => p.id === live.currentBowlerId) ?? bowlingXI[0];

  if (!striker || !bowler) {
    live.simRunning = false;
    disableActionBtns(false);
    return;
  }

  const userBats = isUserBatting();
  const ctx      = buildAIContext();

  // Determine intents
  let battingIntent = live.strikerIntent  ?? 'neutral';
  let bowlingIntent = live.bowlerIntent   ?? 'neutral';
  let fieldSetting  = live.fieldPreset    ?? 'balanced';

  if (userBats) {
    // User batting → AI bowls
    const aiDecision = aipickbowlingintent(
      bowler,
      striker,
      { ...ctx, patternTracker: live.patternTracker }
    );
    bowlingIntent = aiDecision;
    fieldSetting  = aipickfieldsetting(
      { ...ctx, patternTracker: live.patternTracker }
    );

    // Fix 2 — Apply aiOverDecision set by aidecideover in finishOver
    if (live.aiOverDecision) {
      bowlingIntent = live.aiOverDecision.bowlingIntent ?? bowlingIntent;
      fieldSetting  = live.aiOverDecision.fieldSetting  ?? fieldSetting;
    }
  } else {
    // User bowling → AI bats
    battingIntent = aipickbattingintent(
      striker,
      bowler,
      { ...ctx, patternTracker: live.patternTracker }
    );
  }

  // Build matchState for engine
  const matchState = {
    batterPS:      striker.ps     ?? 50,
    bowlerPS:      bowler.ps      ?? 50,
    batterForm:    striker.form   ?? 'average',
    bowlerForm:    bowler.form    ?? 'average',
    batterFatigue: striker.fatigue ?? 0,
    bowlerFatigue: bowler.fatigue  ?? 0,
    batterRole:    striker.roleSubtype ?? striker.role ?? 'batsman',
    bowlerType:    bowler.bowlingType  ?? 'pace',
    battingIntent,
    bowlingIntent,
    fieldSetting,
    isFreeHit:     live.isFreeHit,
    phase:         getPhase(),
    oversDone:     live.oversDone,
    ballInOver:    live.ballInOver,
    innings:       live.innings,
    runs:          live.runs,
    wickets:       live.wickets,
    target:        live.target,
    totalOvers:    cfg.overs,
    difficulty:    md.difficulty ?? 'medium',
    venue:         md.venue      ?? 'neutral',
    rng
  };

  const result = resolveBall(matchState);

  // ── Apply result to live state ──────────────────────────

  const isExtra = result.outcome === 'wide' || result.outcome === 'noball';
  const isLegal = !isExtra;

  // Runs
  live.runs += result.runs;

  // Extras tally
  if (result.outcome === 'wide') {
    live.extrasTally.wides++;
    live.extrasTally.total++;
    live.extras++;
  }
  if (result.outcome === 'noball') {
    live.extrasTally.noBalls++;
    live.extrasTally.total++;
    live.extras++;
  }

  // Legal ball counters
  if (isLegal) {
    live.legalBalls++;
    live.ballInOver++;

    const bs = live.batterStats[striker.id];
    if (bs) {
      bs.balls++;
      bs.runs += result.runs;
      if (result.outcome === 'four') bs.fours++;
      if (result.outcome === 'six')  bs.sixes++;
      if (result.runs === 0 && !result.isWicket) bs.dotBalls++;
    }

    const bwl = live.bowlerStats[bowler.id];
    if (bwl) {
      bwl.balls++;
      bwl.runs += result.runs;
      if (result.isWicket && result.outcome !== 'noball') bwl.wickets++;
      if (result.runs === 0 && !result.isWicket) bwl.dots++;
    }
  }

  // Per-innings stats
  const si = live.stats[live.statsIdx];
  if (result.outcome === 'six')  si.sixes++;
  if (result.outcome === 'four') si.fours++;
  if (result.runs === 0 && isLegal && !result.isWicket) si.dots++;
  if (result.outcome === 'wide')   si.wides++;
  if (result.outcome === 'noball') si.noBalls++;

  // Current partnership
  live.currentPartnership.runs += result.runs;
  if (isLegal) live.currentPartnership.balls++;

  // Free hit next ball
  live.isFreeHit = result.outcome === 'noball';

  // Push ball to current over
  live.currentOverBalls.push({
    outcome:    result.outcome,
    runs:       result.runs ?? 0,
    isWicket:   result.isWicket ?? false,
    commentary: result.commentary ?? ''
  });

  // Pattern tracker update
  live.patternTracker.recordBall(
    battingIntent,
    result.outcome,
    result.runs,
    result.isWicket ? (result.dismissalType ?? null) : null
  );

  // ── Render ─────────────────────────────────────────────

  renderCommentary(result);
  renderScoreboard();
  renderPlayerCards();

  // ── Strike rotation ───────────────────────────────────

  if (!result.isWicket && isLegal) {
    if (result.runs % 2 === 1) rotateStrike();
  }

  // ── Wicket ────────────────────────────────────────────

  if (result.isWicket && result.outcome !== 'noball') {
    await applyWicket(striker, bowler, result);
    live.simRunning = false;
    disableActionBtns(false);
    return;
  }

  // ── Over end ──────────────────────────────────────────

  if (live.ballInOver >= 6) {
    finishOver(bowler);
  }

  // ── Innings end check ─────────────────────────────────

  checkInningsEnd();

  // ── Save state ────────────────────────────────────────

  saveMatchState();

  live.simRunning = false;
  if (!live.stopSim) {
    disableActionBtns(false);
  }
}


/* ============================================================
   WICKET HANDLER
   Fix 4 — Catcher/stumper name injected for caught/stumped
   ============================================================ */

export async function applyWicket(striker, bowler, result) {
  live.wickets++;

  // Fix 4 — Attach fielder name for caught / stumped dismissals
  if (!result.catcherName && (result.dismissalType === 'caught' || result.dismissalType === 'caught behind')) {
    const fieldingXI = isUserBatting() ? md.oppXI : md.userXI;
    const candidates = fieldingXI.filter(p => p.id !== bowler.id);
    const catcher    = candidates[Math.floor(rng.next() * candidates.length)];
    if (catcher) result.catcherName = catcher.name;
  }
  if (!result.catcherName && result.dismissalType === 'stumped') {
    const fieldingXI = isUserBatting() ? md.oppXI : md.userXI;
    const wk = fieldingXI.find(p =>
      (p.roleSubtype ?? p.role ?? '').toLowerCase().includes('keeper')
    ) ?? fieldingXI[fieldingXI.length - 1];
    if (wk) result.catcherName = wk.name;
  }

  // Build dismissal text
  const dismissalText = result.catcherName
    ? `c ${result.catcherName} b ${bowler.name}`
    : result.dismissalType ?? 'out';

  // Record dismissal
  const bs = live.batterStats[striker.id];
  if (bs) bs.dismissal = dismissalText;

  // Fall of wicket
  live.fallOfWickets.push({
    wicketNumber: live.wickets,
    runsAtFall:   live.runs,
    over:         `${live.oversDone}.${live.ballInOver}`,
    playerId:     striker.id,
    playerName:   striker.name
  });

  // End current partnership
  const pship = { ...live.currentPartnership, endWicket: live.wickets };
  live.partnerships.push(pship);

  // Push final batter scorecard entry
  const alreadyIn = live.battingScorecard.find(e => e.playerId === striker.id);
  if (!alreadyIn) {
    live.battingScorecard.push({
      playerId:   striker.id,
      playerName: striker.name,
      runs:       bs?.runs    ?? 0,
      balls:      bs?.balls   ?? 0,
      fours:      bs?.fours   ?? 0,
      sixes:      bs?.sixes   ?? 0,
      dismissal:  dismissalText,
      notOut:     false
    });
  } else {
    alreadyIn.notOut    = false;
    alreadyIn.dismissal = dismissalText;
    alreadyIn.runs      = bs?.runs  ?? 0;
    alreadyIn.balls     = bs?.balls ?? 0;
    alreadyIn.fours     = bs?.fours ?? 0;
    alreadyIn.sixes     = bs?.sixes ?? 0;
  }

  // Advance to next batter (nextBatterIdx incremented after use)
  const nextBatterIdx = live.nextBatterIdx;
  const nextBatter    = live.batOrder[nextBatterIdx];

  live.strikerIdx    = nextBatterIdx;
  live.nextBatterIdx = nextBatterIdx + 1;

  // Reset current partnership
  live.currentPartnership = {
    runs:    0,
    balls:   0,
    batter1: nextBatter?.id ?? null,
    batter2: live.batOrder[live.nonStrikerIdx]?.id ?? null
  };

  // AI promote batter check
  if (!isUserBatting() && nextBatter) {
    const promoted = aipromotebatter({
      nextBatterIdx: live.nextBatterIdx,
      batOrder:      live.batOrder,
      ...buildAIContext()
    });
    if (promoted) {
      const currentPos = live.batOrder.findIndex(p => p.id === promoted.id);
      const strikerPos = live.strikerIdx;
      if (currentPos > strikerPos) {
        [live.batOrder[strikerPos], live.batOrder[currentPos]] =
        [live.batOrder[currentPos], live.batOrder[strikerPos]];
      }
    }
  }

  // Tab dot notification
  showTabDot('score');

  // Show wicket overlay
  showWicketOverlay(striker, result, nextBatter);

  saveMatchState();
}


/* ============================================================
   OVER FINISH
   Fix 2 — aiOverDecision stored from aidecideover
   Fix 3 — intentConfirmed reset per over
   Fix 7 — bowlerIntent / fieldPreset reset per over
   Fix 8 — Over dots row cleared in DOM
   ============================================================ */

function finishOver(bowler) {
  const overRuns    = live.currentOverBalls.reduce((s, b) => s + (b.runs ?? 0), 0);
  const overWickets = live.currentOverBalls.filter(b => b.isWicket).length;

  // Check maiden
  const isMaiden = overRuns === 0 &&
    live.currentOverBalls.every(b => b.outcome !== 'wide' && b.outcome !== 'noball');
  if (isMaiden) {
    const bwl = live.bowlerStats[bowler.id];
    if (bwl) bwl.maidens++;
  }

  // Store over log
  live.overLog.push({
    over:     live.oversDone + 1,
    runs:     overRuns,
    wickets:  overWickets,
    bowlerId: bowler.id
  });

  // Per-innings stats
  const si = live.stats[live.statsIdx];
  si.runsPerOver.push(overRuns);
  si.wicketsPerOver.push(overWickets);

  // Advance over counters
  live.oversDone++;
  live.ballInOver = 0;
  live.bowlerOverCount[bowler.id] = (live.bowlerOverCount[bowler.id] ?? 0) + 1;
  live.lastBowlerId = bowler.id;

  // Reset over ball log
  live.currentOverBalls = [];

  // Rotate strike at end of over
  rotateStrike();

  // Tab dot on bowl sheet
  showTabDot('bowl');

  // Fix 3 — Reset intent confirmed so user must set intent for new over
  // Fix 7 — Reset bowler intent and field preset for new over
  live.intentConfirmed = false;
  live.bowlerIntent    = null;
  live.fieldPreset     = 'balanced';
  updateBowlBtnState();

  // Fix 8 — Clear over dots row in DOM for new over
  const dotsRow = document.getElementById('over-dots-row');
  if (dotsRow) {
    dotsRow.innerHTML = Array(6).fill(
      '<div class="ball-dot empty" aria-hidden="true"></div>'
    ).join('');
  }

  // AI: decide full over setup
  if (live.autoPick) {
    if (!isUserBatting()) {
      // User is bowling — pick next bowler (user controls intent + field)
      pickNextBowler();
    } else {
      // AI is bowling — use aidecideover for bowler + intent + field together
      // Fix 2 — Store result into live.aiOverDecision
      const aiDecision = aidecideover({
        bowlingXI:       getBowlingXI(),
        bowlerStats:     live.bowlerStats,
        bowlerOverCount: live.bowlerOverCount,
        lastBowlerId:    live.lastBowlerId,
        striker:         live.batOrder[live.strikerIdx],
        ...buildAIContext(),
        patternTracker:  live.patternTracker
      });
      if (aiDecision?.bowlerId) {
        live.currentBowlerId = aiDecision.bowlerId;
      }
      live.aiOverDecision = {
        bowlingIntent: aiDecision?.bowlingIntent ?? 'neutral',
        fieldSetting:  aiDecision?.fieldSetting  ?? 'balanced'
      };
    }
  }
}


/* ============================================================
   ROTATION + NEXT BOWLER
   ============================================================ */

export function rotateStrike() {
  [live.strikerIdx, live.nonStrikerIdx] = [live.nonStrikerIdx, live.strikerIdx];
}

export function pickNextBowler() {
  const xi  = getBowlingXI();
  const last = live.lastBowlerId;
  const max  = cfg.maxPerBowler;

  // First pass: skip last bowler and quota-full
  for (const p of xi) {
    if (p.id === last) continue;
    if ((live.bowlerOverCount[p.id] ?? 0) >= max) continue;
    live.currentBowlerId = p.id;
    return;
  }

  // Fallback: anyone with quota remaining
  for (const p of xi) {
    if ((live.bowlerOverCount[p.id] ?? 0) < max) {
      live.currentBowlerId = p.id;
      return;
    }
  }
}


/* ============================================================
   INNINGS END CHECK
   ============================================================ */

export function checkInningsEnd() {
  const allOut       = live.wickets >= 10;
  const oversDone    = live.oversDone >= cfg.overs;
  const targetChased = live.innings === 2 && live.target !== null && live.runs >= live.target;

  if (!allOut && !oversDone && !targetChased) return;

  disableActionBtns(true);
  live.stopSim = true;

  buildScorecardSnapshot();

  if (live.innings === 1) {
    setTimeout(() => showInningsBreakOverlay(), 800);
  } else {
    setTimeout(() => {
      writePostMatchIfPossible();
      showResultOverlay();
    }, 800);
  }
}


/* ============================================================
   INNINGS 2 INIT (called from btn-innings-start event)
   ============================================================ */

export function initInnings2() {
  initInnings(2);
  renderAll();
}


/* ============================================================
   SCORECARD SNAPSHOT
   ============================================================ */

function buildScorecardSnapshot() {
  [live.strikerIdx, live.nonStrikerIdx].forEach(idx => {
    const p = live.batOrder[idx];
    if (!p) return;
    const bs = live.batterStats[p.id];
    const alreadyIn = live.battingScorecard.find(e => e.playerId === p.id);
    if (!alreadyIn) {
      live.battingScorecard.push({
        playerId:   p.id,
        playerName: p.name,
        runs:       bs?.runs  ?? 0,
        balls:      bs?.balls ?? 0,
        fours:      bs?.fours ?? 0,
        sixes:      bs?.sixes ?? 0,
        dismissal:  null,
        notOut:     true
      });
    } else {
      alreadyIn.notOut = true;
    }
  });
}


/* ============================================================
   SIMULATION HELPERS
   ============================================================ */

export async function simNextOver() {
  if (live.simRunning) return;
  const startOver = live.oversDone;

  while (
    live.ballInOver < 6 &&
    live.oversDone === startOver &&
    live.wickets < 10 &&
    !live.stopSim &&
    !(live.innings === 2 && live.target !== null && live.runs >= live.target)
  ) {
    if (live.drsWaiting) { await delay(200); continue; }
    const wicketOverlay = document.getElementById('wicket-overlay');
    if (wicketOverlay && !wicketOverlay.classList.contains('hidden')) {
      await delay(200); continue;
    }
    await bowlOneBall();
    await delay(220);
  }
}

export async function simRemaining() {
  if (live.simRunning) return;
  live.stopSim = false;

  show('auto-progress-wrap');
  const fill  = document.getElementById('auto-progress-fill');
  const label = document.getElementById('auto-progress-label');

  const totalBalls = cfg.overs * 6;

  const updateProgress = () => {
    const pct = Math.min(100, (live.legalBalls / totalBalls) * 100);
    if (fill)  fill.style.width    = pct + '%';
    if (label) label.textContent   = `${live.oversDone}.${live.ballInOver} / ${cfg.overs}.0`;
  };

  const btnBowl = document.getElementById('btn-bowl');
  if (btnBowl) btnBowl.textContent = 'STOP';

  while (
    !live.stopSim &&
    live.wickets < 10 &&
    live.oversDone < cfg.overs &&
    !(live.innings === 2 && live.target !== null && live.runs >= live.target)
  ) {
    if (live.drsWaiting) { await delay(200); continue; }
    const wicketOverlay = document.getElementById('wicket-overlay');
    if (wicketOverlay && !wicketOverlay.classList.contains('hidden')) {
      live.stopSim = true; break;
    }
    await bowlOneBall();
    updateProgress();
    await delay(160);
  }

  hide('auto-progress-wrap');
  if (btnBowl) btnBowl.textContent = 'BOWL';
}

export function waitForDRS() {
  return new Promise(resolve => {
    const interval = setInterval(() => {
      if (!live.drsWaiting) {
        clearInterval(interval);
        resolve();
      }
    }, 100);
  });
}

export function disableActionBtns(bool) {
  const btnBowl     = document.getElementById('btn-bowl');
  const btnNextOver = document.getElementById('btn-next-over');
  if (btnBowl)     btnBowl.disabled     = bool;
  if (btnNextOver) btnNextOver.disabled = bool;
}


/* ============================================================
   SAVE MATCH STATE
   ============================================================ */

export function saveMatchState() {
  try {
    const snap = JSON.parse(sessionStorage.getItem('UCMCURRENTMATCH') ?? '{}');

    const liveToSave = {
      ...live,
      patternTracker: {
        _history:        live.patternTracker._history        ?? [],
        aggressionScore: live.patternTracker.aggressionScore ?? 0,
        spinWeakness:    live.patternTracker.spinWeakness    ?? 0,
        bounceWeakness:  live.patternTracker.bounceWeakness  ?? 0
      },
      simRunning: false,
      drsTimer:   null
    };

    snap.liveState = liveToSave;
    sessionStorage.setItem('UCMCURRENTMATCH', JSON.stringify(snap));
  } catch (e) {
    console.warn('UCM: saveMatchState failed', e);
  }
}


/* ============================================================
   POST-MATCH WRITE
   ============================================================ */

export function writePostMatchIfPossible() {
  try {
    const snap = JSON.parse(sessionStorage.getItem('UCMCURRENTMATCH') ?? '{}');
    snap.matchCompleted   = true;
    snap.finalScore       = { runs: live.runs, wickets: live.wickets, overs: live.oversDone };
    snap.inn1Score        = live.inn1Score;
    snap.inn1Wickets      = live.inn1Wickets;
    snap.battingScorecard = live.battingScorecard;
    snap.bowlingFigures   = getBowlingFigures();
    snap.fallOfWickets    = live.fallOfWickets;
    snap.partnerships     = live.partnerships;
    snap.stats            = live.stats;
    delete snap.liveState;
    sessionStorage.setItem('UCMCURRENTMATCH', JSON.stringify(snap));
  } catch (e) {
    console.warn('UCM: writePostMatchIfPossible failed', e);
  }
}
