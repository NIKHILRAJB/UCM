/* ============================================================
   UCM — MATCH-UI.JS  (Fixed)
   DOM rendering layer — reads from live/md/cfg, writes to DOM
   No game logic here. Pure display functions.

   Fixes applied:
   #13–#17  Result overlay element IDs corrected
   #18–#19  Innings break element IDs corrected
   #20      data-pid injection on batter/bowler cards
   #37      opponent-intent-row show/hide from live state (not hardcoded)
   #74      devicePixelRatio scaling for both canvas elements
   ============================================================ */

import {
  live,
  md,
  cfg,
  isUserBatting,
  isUserBowling,
  getBowlingXI,
  getBowlingFigures,
  getBatterScorecard,
  getExtras
} from './match-core.js';

/* ============================================================
   HELPERS
   ============================================================ */

function _el(id) { return document.getElementById(id); }

function _setText(id, value) {
  const el = _el(id);
  if (el) el.textContent = value ?? '---';
}

function _setHTML(id, html) {
  const el = _el(id);
  if (el) el.innerHTML = html;
}

export function show(id) {
  const el = _el(id);
  if (el) el.classList.remove('hidden');
}

export function hide(id) {
  const el = _el(id);
  if (el) el.classList.add('hidden');
}

function _toggle(id, visible) {
  visible ? show(id) : hide(id);
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function teamAbbr(name) {
  if (!name) return '---';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return name.slice(0, 3).toUpperCase();
  return words.map(w => w[0]).join('').toUpperCase().slice(0, 4);
}

function _fmtOvers(legalBalls) {
  const ov  = Math.floor(legalBalls / 6);
  const bal = legalBalls % 6;
  return `${ov}.${bal}`;
}

function _cap(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ============================================================
   CANVAS — device pixel ratio scaling
   Fix #74: proper DPR scaling for both manhattan and rr canvases
   ============================================================ */

export function scaleCanvas(canvasId) {
  const canvas = _el(canvasId);
  if (!canvas) return null;

  const dpr       = window.devicePixelRatio || 1;
  const rect      = canvas.getBoundingClientRect();
  const cssWidth  = rect.width  || canvas.parentElement?.clientWidth  || 320;
  const cssHeight = rect.height || canvas.parentElement?.clientHeight || 160;

  canvas.width  = Math.round(cssWidth  * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  canvas.style.width  = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  return { canvas, ctx, w: cssWidth, h: cssHeight };
}

/* ============================================================
   MASTER RENDER
   ============================================================ */

export function renderAll() {
  renderModeBar();
  renderScoreboard();
  renderOverDots();
  renderPlayerCards();
  renderInputPanel();
  renderActionBar();
}

/* ============================================================
   MODE BAR
   ============================================================ */

export function renderModeBar() {
  _setText('pill-format', md.format ?? 'T20');
  _setText('pill-mode',   md.mode   ?? 'Friendly');
}

/* ============================================================
   SCOREBOARD
   ============================================================ */

export function renderScoreboard() {
  const battingTeam = isUserBatting()
    ? (md.userTeam ?? 'You')
    : (md.oppTeam  ?? 'CPU');

  _setText('sb-team-name',    battingTeam);
  _setText('sb-innings-pill', `INN ${live.innings ?? 1}`);
  _setText('sb-runs',         live.runs    ?? 0);
  _setText('sb-wickets',      live.wickets ?? 0);
  _setText('sb-overs',        `${_fmtOvers(live.legalBalls ?? 0)} Overs`);

  const crr = (live.legalBalls ?? 0) > 0
    ? ((live.runs / live.legalBalls) * 6).toFixed(2)
    : '---';
  _setText('sb-crr', `CRR: ${crr}`);

  if (live.innings === 2 && live.target) {
    show('sb-target-row');

    const need = live.target - live.runs;
    _setText('sb-target-text', `Target: ${live.target}`);
    _setText('sb-need-text',   `Need: ${need}`);

    const totalOvers = cfg.totalOvers ?? cfg.overs ?? 20;
    const ballsLeft  = (totalOvers * 6) - (live.legalBalls ?? 0);

    if (ballsLeft > 0 && need > 0) {
      const rrr = ((need / ballsLeft) * 6).toFixed(2);
      _setText('sb-rrr', `RRR: ${rrr}`);
      show('sb-rrr');
    } else {
      hide('sb-rrr');
    }
  } else {
    hide('sb-target-row');
    hide('sb-rrr');
  }

  // Free-hit banner
  const freeHitBanner = _el('freehit-banner');
  if (freeHitBanner) {
    freeHitBanner.classList.toggle('hidden', !live.isFreeHit);
  }
}

/* ============================================================
   OVER DOTS
   ============================================================ */

function _dotLabel(outcome, runs) {
  if (outcome === 'dot')    return '•';
  if (outcome === 'four')   return '4';
  if (outcome === 'six')    return '6';
  if (outcome === 'wicket') return 'W';
  if (outcome === 'wide')   return 'Wd';
  if (outcome === 'noball') return 'NB';
  return String(runs ?? 0);
}

export function renderOverDots() {
  const row = _el('over-dots-row');
  if (!row) return;

  const history = live.currentOverHistory ?? live.currentOverBalls ?? [];
  row.innerHTML = '';

  for (let i = 0; i < 6; i++) {
    const ball = history[i];
    const div  = document.createElement('div');
    div.className = 'ball-dot';
    div.setAttribute('aria-hidden', 'true');

    if (!ball) {
      div.classList.add('empty');
    } else {
      const outcome = ball.outcome;
      if      (outcome === 'dot')                          div.classList.add('dot');
      else if (outcome === 'four')                         div.classList.add('four');
      else if (outcome === 'six')                          div.classList.add('six');
      else if (outcome === 'wicket')                       div.classList.add('wicket');
      else if (outcome === 'wide' || outcome === 'noball') div.classList.add('extra');
      else                                                 div.classList.add('scored');

      div.textContent = _dotLabel(outcome, ball.runs);
    }

    row.appendChild(div);
  }
}

/* ============================================================
   PLAYER CARDS
   Fix #20: data-pid injected on striker, non-striker, bowler cards
   ============================================================ */

export function renderPlayerCards() {
  // Resolve current players from live state
  const striker    = live.batOrder?.[live.strikerIdx];
  const nonStriker = live.batOrder?.[live.nonStrikerIdx];
  const bowlingXI  = getBowlingXI?.() ?? [];
  const bowler     = bowlingXI.find(p => p.id === live.currentBowlerId) ?? bowlingXI[0] ?? null;

  // ── Striker ──────────────────────────────────────────────
  if (striker) {
    const bs = live.batterStats?.[striker.id] ?? {};
    const sr = (bs.balls ?? 0) > 0
      ? ((bs.runs / bs.balls) * 100).toFixed(1)
      : '---';

    _setText('striker-name',  striker.name ?? '---');
    _setText('striker-score', `${bs.runs ?? 0} (${bs.balls ?? 0})`);
    _setText('striker-sr',    `SR: ${sr}`);
    _setText('striker-form',  striker.form ?? '---');
    _setText('striker-role',  striker.roleSubtype ?? striker.role ?? '---');

    // Fix #20 — inject data-pid
    const card = _el('card-striker');
    if (card) card.dataset.pid = striker.id ?? '';
  }

  // ── Non-striker ──────────────────────────────────────────
  if (nonStriker) {
    const ns  = live.batterStats?.[nonStriker.id] ?? {};
    const nsr = (ns.balls ?? 0) > 0
      ? ((ns.runs / ns.balls) * 100).toFixed(1)
      : '---';

    _setText('nonstriker-name',  nonStriker.name ?? '---');
    _setText('nonstriker-score', `${ns.runs ?? 0} (${ns.balls ?? 0})`);
    _setText('nonstriker-sr',    `SR: ${nsr}`);
    _setText('nonstriker-form',  nonStriker.form ?? '---');
    _setText('nonstriker-role',  nonStriker.roleSubtype ?? nonStriker.role ?? '---');

    // Fix #20 — inject data-pid
    const card = _el('card-nonstriker');
    if (card) card.dataset.pid = nonStriker.id ?? '';
  }

  // ── Bowler ───────────────────────────────────────────────
  if (bowler) {
    const bw        = live.bowlerStats?.[bowler.id] ?? {};
    const legalBalls = bw.legalBalls ?? bw.balls ?? 0;
    const overs     = _fmtOvers(legalBalls);
    const econ      = legalBalls > 0
      ? ((bw.runs / legalBalls) * 6).toFixed(2)
      : '---';

    _setText('bowler-name',    bowler.name ?? '---');
    _setText('bowler-type',    (bowler.bowlingType ?? 'PACE').toUpperCase());
    _setText('bowler-figures', `${overs}-${bw.maidens ?? 0}-${bw.runs ?? 0}-${bw.wickets ?? 0}`);
    _setText('bowler-econ',    `Econ: ${econ}`);

    const maxPerBowler = cfg.maxPerBowler ?? Math.floor((cfg.totalOvers ?? cfg.overs ?? 20) / 5);
    const usedOvers    = Math.floor(legalBalls / 6);
    const left         = Math.max(0, maxPerBowler - usedOvers);
    const pct          = maxPerBowler > 0 ? ((usedOvers / maxPerBowler) * 100) : 0;

    const fill = _el('bowler-quota-fill');
    if (fill) fill.style.width = `${Math.min(100, pct)}%`;

    _setText('bowler-quota-text', `${left} ov left`);

    // Fix #20 — inject data-pid
    const card = _el('card-bowler');
    if (card) card.dataset.pid = bowler.id ?? '';
  }
}

/* ============================================================
   INPUT PANEL
   Fix #37: opponent-intent-row shown/hidden from live state
   ============================================================ */

function _syncIntentBtns(groupId, activeIntent) {
  const group = _el(groupId);
  if (!group) return;

  group.querySelectorAll('.intent-btn').forEach(btn => {
    const active = btn.dataset.intent === activeIntent;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
}

function _syncFieldPopup(preset) {
  document.querySelectorAll('.field-option').forEach(btn => {
    // Support both data-preset (new HTML) and data-field (legacy fallback)
    const val = btn.dataset.preset ?? btn.dataset.field;
    btn.classList.toggle('field-option--active', val === preset);
  });
}

export function renderInputPanel() {
  const userBats  = isUserBatting();
  const userBowls = isUserBowling();

  // Striker/non-striker intent rows — only visible when user is batting
  _toggle('intent-row-striker',    userBats);
  _toggle('intent-row-nonstriker', userBats);

  if (userBats) {
    const striker    = live.batOrder?.[live.strikerIdx];
    const nonStriker = live.batOrder?.[live.nonStrikerIdx];
    _setText('intent-name-striker',    striker?.name    ?? '---');
    _setText('intent-name-nonstriker', nonStriker?.name ?? '---');
    _syncIntentBtns('intent-btns-striker',    live.strikerIntent    ?? 'neutral');
    _syncIntentBtns('intent-btns-nonstriker', live.nonStrikerIntent ?? 'neutral');
  }

  // Bowler name
  const bowlingXI = getBowlingXI?.() ?? [];
  const bowler    = bowlingXI.find(p => p.id === live.currentBowlerId) ?? bowlingXI[0] ?? null;
  _setText('intent-name-bowler', bowler?.name ?? '---');

  if (userBowls) {
    show('intent-btns-bowler');
    hide('auto-pills-bowler');
    _syncIntentBtns('intent-btns-bowler', live.bowlerIntent ?? 'neutral');
  } else {
    hide('intent-btns-bowler');
    show('auto-pills-bowler');
    _setText('auto-pill-bowler', `AUTO: ${_cap(live.bowlerIntent ?? 'neutral')}`);
  }

  // Fix #37 — opponent-intent-row: show only when there is a live opponent player
  const opponentRow = _el('opponent-intent-row');
  if (opponentRow) {
    // When user bats, opponent = current bowler; when user bowls, opponent = current striker
    const striker = live.batOrder?.[live.strikerIdx];
    const opponentPlayer = userBats ? bowler : striker;
    const hasOpponent    = !!opponentPlayer;

    _toggle('opponent-intent-row', hasOpponent);

    if (hasOpponent) {
      _setText('intent-name-opponent', opponentPlayer.name ?? '---');
      // Show AI's last decided intent
      const aiIntent = userBats
        ? (live.aiOverDecision?.bowlingIntent ?? live.bowlerIntent ?? 'neutral')
        : (live.strikerIntent ?? 'neutral');
      _setText('auto-pill-opponent', `AUTO: ${_cap(aiIntent)}`);
    }
  }

  // Field row — only visible when user is bowling
  _toggle('field-row', userBowls);

  if (userBowls) {
    const preset = live.fieldSetting ?? live.fieldPreset ?? 'balanced';

    const btn = _el('btn-field-dropdown');
    if (btn) btn.textContent = `${_cap(preset)} ▾`;

    const maxFC = cfg.maxFieldChanges ?? live.maxFieldChanges ?? 6;
    _setText(
      'field-changes-count',
      `${live.fieldChanges ?? 0}/${maxFC} changes`
    );

    _syncFieldPopup(preset);
  }
}

/* ============================================================
   ACTION BAR
   ============================================================ */

export function renderActionBar() {
  const sim = !!live.isSimulating;
  _toggle('auto-progress-wrap', sim);

  const btnBowl = _el('btn-bowl');
  const btnNext = _el('btn-next-over');
  const disabled = sim || !!live.awaitingInput;

  if (btnBowl) btnBowl.disabled = disabled;
  if (btnNext) btnNext.disabled = disabled;
}

export function renderSimProgress(pct, label) {
  show('auto-progress-wrap');
  const fill = _el('auto-progress-fill');
  if (fill) fill.style.width = `${Math.min(100, pct ?? 0)}%`;
  _setText('auto-progress-label', label ?? 'Simulating...');
}

/* ============================================================
   COMMENTARY
   ============================================================ */

export function renderCommentary(result) {
  if (!result) return;
  const overLabel = `${live.oversDone ?? 0}.${live.ballInOver ?? 0}`;
  _setText('commentary-over', overLabel);
  _setText('commentary-text', result.commentary ?? result.text ?? '');
}

/* ============================================================
   TAB DOT NOTIFICATION
   ============================================================ */

export function showTabDot(sheetName) {
  show(`tab-dot-${sheetName}`);
}

/* ============================================================
   WICKET OVERLAY
   ============================================================ */

export function showWicketOverlay(striker, result, nextBatter) {
  if (!striker) return;

  const bs         = live.batterStats?.[striker.id] ?? {};
  const dismissal  = result?.dismissalText ?? result?.dismissalType ?? 'Out';
  const isUserBat  = isUserBatting();

  _setText('wkt-player',     `${striker.name ?? '---'} — ${dismissal}`);

  const sr = (bs.balls ?? 0) > 0
    ? (((bs.runs ?? 0) / bs.balls) * 100).toFixed(1)
    : '0.0';
  _setText('wkt-score',      `${bs.runs ?? 0} off ${bs.balls ?? 0} balls • SR ${sr}`);
  _setText('wkt-boundaries', `4s: ${bs.fours ?? 0}   6s: ${bs.sixes ?? 0}`);

  const hasNext = !!nextBatter;
  _toggle('wkt-next-section', hasNext);

  if (hasNext) {
    _setText('wkt-next-player', nextBatter.name ?? '---');
    _toggle('wkt-intent-btns', !!isUserBat);
    if (isUserBat) _syncIntentBtns('wkt-intent-btns', 'neutral');
  }

  show('scrim');
  show('wicket-overlay');
}

/* ============================================================
   DRS OVERLAY
   ============================================================ */

export function showDRSOverlay(opts = {}) {
  const {
    verdict,
    matchup,
    outPct,
    message,
    overturnPct,
    reviewsLeft,
    timerSecs
  } = opts;

  _setText('drs-verdict',            verdict  ?? 'LBW — OUT');
  _setText('drs-matchup',            matchup  ?? '');
  _setText('drs-pct',               `${outPct ?? 50}%`);
  _setText('drs-message',            message  ?? 'Could go either way');
  _setText('drs-overturn',          `Overturn chance: ${overturnPct ?? 50}%`);

  const fill = _el('drs-bar-fill');
  if (fill) fill.style.width = `${outPct ?? 50}%`;

  const total = cfg.drsReviews ?? 2;
  const left  = reviewsLeft ?? total;
  const dots  = Array.from({ length: total }, (_, i) =>
    i < (total - left) ? '○' : '🔴'
  ).join(' ');

  _setText('drs-review-indicators', dots);
  _setText('drs-reviews-left',     `Remaining: ${left}`);

  const timerFill = _el('drs-timer-fill');
  if (timerFill) timerFill.style.width = '100%';
  _setText('drs-timer-text', `⏱ ${timerSecs ?? 10} sec...`);

  show('scrim');
  show('drs-overlay');
}

/* ============================================================
   DRS RESULT OVERLAY
   ============================================================ */

export function showDRSResultOverlay(opts = {}) {
  const { overturned, reviewsLeft } = opts;

  _setText('drs-result-icon',    overturned ? '✅' : '❌');
  _setText('drs-result-title',   overturned ? 'DECISION OVERTURNED' : 'DECISION UPHELD');
  _setText(
    'drs-result-body',
    overturned
      ? 'Review successful! The batter is NOT OUT.'
      : 'Review unsuccessful. The original decision stands.'
  );
  _setText('drs-result-reviews', `Reviews remaining: ${reviewsLeft ?? 0}`);

  hide('drs-overlay');
  show('drs-result-overlay');
}

/* ============================================================
   INNINGS BREAK OVERLAY
   Fix #18–#19: IDs corrected → inn-break-score, inn-break-target
   ============================================================ */

export function showInningsBreakOverlay() {
  const battingTeam = isUserBatting()
    ? (md.userTeam ?? 'Your Team')
    : (md.oppTeam  ?? 'CPU');

  const chasingTeam = isUserBatting()
    ? (md.oppTeam  ?? 'CPU')
    : (md.userTeam ?? 'Your Team');

  const target   = (live.runs ?? 0) + 1;
  const ballsLeft = (cfg.overs ?? 20) * 6;
  const rrr       = ballsLeft > 0
    ? ((target / ballsLeft) * 6).toFixed(2)
    : '---';

  _setText('ibreak-title',       'END OF INNINGS 1');
  _setText('ibreak-team',        battingTeam);
  // Fix #18 — correct ID: inn-break-score (not ibreak-score)
  _setText('inn-break-score',    `${live.runs ?? 0} / ${live.wickets ?? 0}`);
  _setText('ibreak-overs',       `${live.oversDone ?? 0} overs`);
  _setText('ibreak-target-team', chasingTeam);
  // Fix #19 — correct ID: inn-break-target (not ibreak-target)
  _setText('inn-break-target',   String(target));
  _setText('ibreak-rrr',         rrr);

  show('scrim');
  show('innings-break-overlay');
}

/* ============================================================
   RESULT OVERLAY
   Fix #13–#17: IDs corrected →
     result-winner, result-margin, result-potm-name,
     result-inn1-team, result-inn2-team,
     result-inn1-score, result-inn2-score
   ============================================================ */

function _findPOTM() {
  let best    = null;
  let bestVal = -1;

  (live.battingScorecard ?? []).forEach(b => {
    if ((b.runs ?? 0) > bestVal) {
      bestVal = b.runs;
      best    = { name: b.playerName, stat: `${b.runs} (${b.balls})` };
    }
  });

  (getBowlingFigures?.() ?? []).forEach(b => {
    if ((b.wickets ?? 0) >= 3 && ((b.wickets ?? 0) * 20 > bestVal)) {
      best = { name: b.playerName, stat: `${b.wickets}/${b.runs}` };
    }
  });

  return best;
}

function _renderHighlights() {
  const scorecard = live.battingScorecard ?? [];
  const bowling   = getBowlingFigures?.() ?? [];

  const top = scorecard.reduce(
    (best, b) => ((b.runs ?? 0) > (best?.runs ?? -1) ? b : best), null
  );
  _setText('res-top-scorer',
    top ? `${top.playerName} — ${top.runs} (${top.balls})` : '---');

  const bestBowl = bowling.reduce(
    (best, b) => ((b.wickets ?? 0) > (best?.wickets ?? -1) ? b : best), null
  );
  _setText('res-best-bowl',
    bestBowl ? `${bestBowl.playerName} — ${bestBowl.wickets}/${bestBowl.runs}` : '---');

  const bestP = (live.partnerships ?? []).reduce(
    (best, p) => ((p.runs ?? 0) > (best?.runs ?? -1) ? p : best), null
  );
  _setText('res-best-partner',
    bestP ? `${bestP.p1} & ${bestP.p2} — ${bestP.runs}` : '---');

  const mostSixes = scorecard.reduce(
    (best, b) => ((b.sixes ?? 0) > (best?.sixes ?? -1) ? b : best), null
  );
  _setText('res-most-sixes',
    mostSixes ? `${mostSixes.playerName} — ${mostSixes.sixes} sixes` : '---');

  const bestEcon = bowling
    .filter(b => (b.legalBalls ?? b.balls ?? 0) >= 6)
    .reduce((best, b) => {
      const lb   = b.legalBalls ?? b.balls ?? 0;
      const econ = lb > 0 ? (b.runs / lb) * 6 : Infinity;
      const bestLB  = best ? (best.legalBalls ?? best.balls ?? 0) : 0;
      const bestEco = bestLB > 0 ? (best.runs / bestLB) * 6 : Infinity;
      return econ < bestEco ? b : best;
    }, null);

  if (bestEcon) {
    const lb   = bestEcon.legalBalls ?? bestEcon.balls ?? 0;
    const econ = lb > 0 ? ((bestEcon.runs / lb) * 6).toFixed(2) : '---';
    _setText('res-best-econ', `${bestEcon.playerName} — ${econ}`);
  } else {
    _setText('res-best-econ', '---');
  }
}

function _renderResultSummary(inn1Team, inn2Team) {
  _setText('res-sum-team-a', inn1Team);
  _setText('res-sum-team-b', inn2Team);

  const statsA = live.inn1Stats ?? live.stats?.[0] ?? {};
  const statsB = live.inn2Stats ?? live.stats?.[1] ?? {};

  const totalA = statsA.totalBalls ?? Math.max(statsA.runsPerOver?.length ?? 0, 1);
  const totalB = statsB.totalBalls ?? Math.max(statsB.runsPerOver?.length ?? 0, 1);

  _setText('res-sum-bound-a', `${((((statsA.fours ?? 0) + (statsA.sixes ?? 0)) / totalA) * 100).toFixed(0)}%`);
  _setText('res-sum-bound-b', `${((((statsB.fours ?? 0) + (statsB.sixes ?? 0)) / totalB) * 100).toFixed(0)}%`);
  _setText('res-sum-dot-a',   `${(((statsA.dots ?? 0) / totalA) * 100).toFixed(0)}%`);
  _setText('res-sum-dot-b',   `${(((statsB.dots ?? 0) / totalB) * 100).toFixed(0)}%`);
  _setText('res-sum-extras-a', statsA.extras ?? (statsA.wides ?? 0) + (statsA.noBalls ?? 0));
  _setText('res-sum-extras-b', statsB.extras ?? (statsB.wides ?? 0) + (statsB.noBalls ?? 0));
  _setText('res-sum-sixes-a',  statsA.sixes  ?? '—');
  _setText('res-sum-sixes-b',  statsB.sixes  ?? '—');
  _setText('res-sum-fours-a',  statsA.fours  ?? '—');
  _setText('res-sum-fours-b',  statsB.fours  ?? '—');
}

export function showResultOverlay() {
  const userBats2 = isUserBatting();
  const userTeam  = md.userTeam ?? 'User';
  const oppTeam   = md.oppTeam  ?? 'CPU';

  let winnerText = '';
  let marginText = '';

  if (live.innings === 2) {
    const chased = live.runs >= (live.target ?? Infinity);
    if (chased) {
      const winBy    = 10 - live.wickets;
      winnerText     = userBats2 ? userTeam : oppTeam;
      marginText     = `won by ${winBy} wicket${winBy !== 1 ? 's' : ''}`;
    } else {
      const winBy    = (live.target ?? 0) - live.runs - 1;
      winnerText     = userBats2 ? oppTeam : userTeam;
      marginText     = `won by ${winBy} run${winBy !== 1 ? 's' : ''}`;
    }
  }

  // Fix #13 — result-winner (not res-winner / wt-winner)
  _setText('result-winner', winnerText);
  // Fix #14 — result-margin
  _setText('result-margin', marginText);

  // Innings 1 batted first, innings 2 second
  const inn1Team = userBats2 ? teamAbbr(oppTeam) : teamAbbr(userTeam);
  const inn2Team = userBats2 ? teamAbbr(userTeam) : teamAbbr(oppTeam);

  // Fix #15 — result-inn1-team, result-inn2-team
  _setText('result-inn1-team',  inn1Team);
  _setText('result-inn2-team',  inn2Team);

  // Fix #16 — result-inn1-score, result-inn2-score
  _setText('result-inn1-score', `${live.inn1Score ?? 0}/${live.inn1Wickets ?? 0}`);
  _setText('result-inn2-score', `${live.runs ?? 0}/${live.wickets ?? 0}`);

  // Overs (optional elements — may not exist in all HTML versions)
  _setText('result-inn1-ov', `(${_fmtOvers(live.inn1LegalBalls ?? 0)} ov)`);
  _setText('result-inn2-ov', `(${_fmtOvers(live.legalBalls ?? 0)} ov)`);

  // Fix #17 — result-potm-name
  const potm = _findPOTM();
  _setText('result-potm-name', potm ? `${potm.name} — ${potm.stat}` : '---');

  _renderHighlights();
  _renderResultSummary(inn1Team, inn2Team);

  show('scrim');
  show('result-overlay');
}

/* ============================================================
   BAT ORDER SHEET
   ============================================================ */

export function renderBatOrderSheet() {
  const body = _el('sheet-bat-body');
  if (!body) return;

  const order = live.batOrder ?? [];
  if (!order.length) {
    body.innerHTML = `<div class="sheet-placeholder">No batting order set.</div>`;
    return;
  }

  const strikerId    = live.batOrder?.[live.strikerIdx]?.id;
  const nonStrikerId = live.batOrder?.[live.nonStrikerIdx]?.id;

  body.innerHTML = order.map((p, i) => {
    const bs     = live.batterStats?.[p.id] ?? {};
    const active = p.id === strikerId || p.id === nonStrikerId;
    const out    = !!bs.dismissal;

    return `
      <div class="player-row ${active ? 'player-row--active' : ''} ${out ? 'player-row--out' : ''}" data-pid="${esc(p.id)}">
        <span class="player-row__num">${i + 1}</span>
        <span class="player-row__name">${esc(p.name)}</span>
        <span class="player-row__role">${esc(p.roleSubtype ?? p.role ?? '')}</span>
        <span class="player-row__score">${bs.runs ?? '—'}(${bs.balls ?? '—'})</span>
      </div>
    `;
  }).join('');
}

/* ============================================================
   BOWL ORDER SHEET
   ============================================================ */

export function renderBowlOrderSheet() {
  const body = _el('sheet-bowl-body');
  if (!body) return;

  const xi = getBowlingXI?.() ?? [];
  if (!xi.length) {
    body.innerHTML = `<div class="sheet-placeholder">No bowling XI set.</div>`;
    return;
  }

  const maxPerBowler = cfg.maxPerBowler ?? Math.floor((cfg.totalOvers ?? cfg.overs ?? 20) / 5);

  body.innerHTML = xi.map(p => {
    const bw         = live.bowlerStats?.[p.id] ?? {};
    const legalBalls = bw.legalBalls ?? bw.balls ?? 0;
    const overs      = _fmtOvers(legalBalls);
    const active     = p.id === live.currentBowlerId;
    const used       = Math.floor(legalBalls / 6);

    return `
      <div class="player-row ${active ? 'player-row--active' : ''}" data-pid="${esc(p.id)}">
        <span class="player-row__name">${esc(p.name)}</span>
        <span class="player-row__role">${esc((p.bowlingType ?? '').toUpperCase())}</span>
        <span class="player-row__score">${overs}-${bw.maidens ?? 0}-${bw.runs ?? 0}-${bw.wickets ?? 0}</span>
        <span class="player-row__quota">${used}/${maxPerBowler} ov</span>
      </div>
    `;
  }).join('');
}

/* ============================================================
   SCORECARD SHEET
   ============================================================ */

export function renderScorecardSheet() {
  renderScorecardBatting();
  renderScorecardBowling();
}

export function renderScorecardBatting() {
  const tbody = _el('score-batting-tbody');
  if (!tbody) return;

  const rows = getBatterScorecard?.() ?? live.battingScorecard ?? [];

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="sheet-placeholder">No balls bowled yet.</td></tr>`;
    _setHTML('score-fow', '<p class="sheet-placeholder">No wickets yet.</p>');
    return;
  }

  const strikerId    = live.batOrder?.[live.strikerIdx]?.id;
  const nonStrikerId = live.batOrder?.[live.nonStrikerIdx]?.id;

  tbody.innerHTML = rows.map(b => {
    const sr          = (b.balls ?? 0) > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '—';
    const isBatting   = b.playerId === strikerId || b.playerId === nonStrikerId;
    const isDismissed = !b.notOut && b.dismissal;

    // Fix #68 — Status column (7th <td>)
    const status = isDismissed ? '🔴' : (isBatting ? '🏏' : '');

    return `
      <tr class="${isDismissed ? 'row-out' : isBatting ? 'row-batting' : ''}">
        <td>${esc(b.playerName)}</td>
        <td>${b.runs ?? 0}(${b.balls ?? 0})</td>
        <td>${b.fours ?? 0}</td>
        <td>${b.sixes ?? 0}</td>
        <td>${sr}</td>
        <td>${esc(b.dismissal ?? (isBatting ? 'batting*' : 'dnb'))}</td>
        <td>${status}</td>
      </tr>
    `;
  }).join('');

  // Fall of wickets
  const fow = live.fallOfWickets ?? [];
  if (fow.length) {
    _setHTML(
      'score-fow',
      `<p><strong>FoW:</strong> ${fow.map(f =>
        `${f.runsAtFall}/${f.wicketNumber} (${esc(f.playerName)}, ${f.over ?? '0.0'})`
      ).join(' · ')}</p>`
    );
  } else {
    _setHTML('score-fow', '<p class="sheet-placeholder">No wickets yet.</p>');
  }
}

export function renderScorecardBowling() {
  const tbody = _el('score-bowling-tbody');
  if (!tbody) return;

  const figures = getBowlingFigures?.() ?? [];
  if (!figures.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="sheet-placeholder">No balls bowled yet.</td></tr>`;
    _setText('score-extras', 'Extras: —');
    return;
  }

  tbody.innerHTML = figures.map(b => {
    const legalBalls = b.legalBalls ?? b.balls ?? 0;
    const overs      = _fmtOvers(legalBalls);
    const econ       = legalBalls > 0
      ? ((b.runs / legalBalls) * 6).toFixed(2)
      : '—';
    const isBowling  = b.playerId === live.currentBowlerId;

    // Fix #69 — NB and Wd columns (6th and 7th <td>)
    return `
      <tr class="${isBowling ? 'row-bowling' : ''}">
        <td>${esc(b.playerName)}</td>
        <td>${overs}</td>
        <td>${b.maidens ?? 0}</td>
        <td>${b.runs    ?? 0}</td>
        <td>${b.wickets ?? 0}</td>
        <td>${b.noBalls ?? b.noballs ?? 0}</td>
        <td>${b.wides   ?? 0}</td>
        <td>${econ}</td>
      </tr>
    `;
  }).join('');

  // Fix #71 — Extras from live extrasTally, default '—' not '0'
  const extras = getExtras?.() ?? {};
  const total  = extras.total ?? ((extras.wides ?? 0) + (extras.noBalls ?? 0) + (extras.byes ?? 0));
  _setText(
    'score-extras',
    total > 0
      ? `Extras: ${total} (w ${extras.wides ?? 0}, nb ${extras.noBalls ?? extras.noBalls ?? 0}, b ${extras.byes ?? 0})`
      : 'Extras: —'
  );
}

export function switchScorecardTab(tab) {
  const bat  = _el('score-tab-batting');
  const bowl = _el('score-tab-bowling');

  if (bat)  bat.classList.toggle('hidden',  tab !== 'batting');
  if (bowl) bowl.classList.toggle('hidden', tab !== 'bowling');

  document.querySelectorAll('.sheet-inner-tab').forEach(btn => {
    // Fix #4 — read data-tab (new) with data-inner-tab fallback
    const btnTab = btn.dataset.tab ?? btn.dataset.innerTab;
    const active = btnTab === tab;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', String(active));
  });
}

/* ============================================================
   STATS SHEET
   ============================================================ */

function _getPhaseStats(innFilter, side) {
  const source = innFilter === 'both'
    ? { ...(live[`${side}Inn1Stats`] ?? {}), ...(live[`${side}Inn2Stats`] ?? {}) }
    : (live[`${side}Inn${innFilter}Stats`] ?? live[`${side}InnStats`] ?? {});

  const total = source.totalBalls ?? 1;

  return {
    pp:     source.ppRuns    != null ? `${source.ppRuns}/${source.ppWickets ?? 0}`       : null,
    mid:    source.midRuns   != null ? `${source.midRuns}/${source.midWickets ?? 0}`     : null,
    death:  source.deathRuns != null ? `${source.deathRuns}/${source.deathWickets ?? 0}` : null,
    fours:  source.fours  ?? null,
    sixes:  source.sixes  ?? null,
    dotPct: source.dots   != null ? ((source.dots / total) * 100).toFixed(0) : null
  };
}

export function renderStatsSheet(innFilter = 1) {
  const a = _getPhaseStats(innFilter, 'user');
  const b = _getPhaseStats(innFilter, 'opp');

  _setText('sb-pp-a',    a.pp    ?? '—');
  _setText('sb-pp-b',    b.pp    ?? '—');
  _setText('sb-mid-a',   a.mid   ?? '—');
  _setText('sb-mid-b',   b.mid   ?? '—');
  _setText('sb-death-a', a.death ?? '—');
  _setText('sb-death-b', b.death ?? '—');
  _setText('sb-sixes-a', a.sixes != null ? String(a.sixes) : '—');
  _setText('sb-sixes-b', b.sixes != null ? String(b.sixes) : '—');
  _setText('sb-fours-a', a.fours != null ? String(a.fours) : '—');
  _setText('sb-fours-b', b.fours != null ? String(b.fours) : '—');
  _setText('sb-dots-a',  a.dotPct != null ? `${a.dotPct}%` : '—');
  _setText('sb-dots-b',  b.dotPct != null ? `${b.dotPct}%` : '—');

  _setText('stats-team-label-a', md.userTeam ?? 'Your Team');
  _setText('stats-team-label-b', md.oppTeam  ?? 'Opponent');
}

/* ============================================================
   PARTNERSHIPS
   ============================================================ */

export function renderPartnerships(side = 'user') {
  const list = _el('partnerships-list');
  if (!list) return;

  const rows = (live.partnerships ?? []).filter(p => p.side === side);

  if (!rows.length) {
    list.innerHTML = `<div class="sheet-placeholder">No partnerships yet.</div>`;
    return;
  }

  list.innerHTML = rows.map(p => `
    <div class="pship-row">
      <span class="pship-names">${esc(p.p1)} &amp; ${esc(p.p2)}</span>
      <span class="pship-runs">${p.runs} (${p.balls})</span>
    </div>
  `).join('');
}

/* ============================================================
   CHARTS
   Fix #74: both canvas functions use scaleCanvas with correct DPR
   ============================================================ */

export function drawManhattan(teamFilter = 'user') {
  const setup = scaleCanvas('manhattan-canvas');
  if (!setup) return;

  const { ctx, w, h } = setup;
  const userOvers = live.overByOver    ?? (live.stats?.[0]?.runsPerOver ?? []);
  const oppOvers  = live.oppOverByOver ?? (live.stats?.[1]?.runsPerOver ?? []);

  const dataA = teamFilter !== 'opp'  ? userOvers : [];
  const dataB = teamFilter !== 'user' ? oppOvers  : [];

  const maxRuns = Math.max(1, ...dataA, ...dataB);
  const totalOv = Math.max(dataA.length, dataB.length, 1);
  const gap     = w / totalOv;
  const barW    = gap * 0.32;

  ctx.clearRect(0, 0, w, h);

  const drawBar = (i, runs, color, offset) => {
    const x  = (i * gap) + offset;
    const bh = (runs / maxRuns) * (h - 24);
    ctx.fillStyle = color;
    ctx.fillRect(x, h - bh - 12, barW, bh);
  };

  dataA.forEach((r, i) => drawBar(i, r, '#4f98a3', gap * 0.15));
  dataB.forEach((r, i) => drawBar(i, r, '#bb653b', gap * 0.52));

  ctx.fillStyle = '#797876';
  ctx.font = '10px Inter, sans-serif';
  ctx.textAlign = 'center';

  for (let i = 0; i < totalOv; i++) {
    ctx.fillText(String(i + 1), i * gap + gap / 2, h - 1);
  }
}

export function drawRunRate(mode = 'crr') {
  const setup = scaleCanvas('rr-canvas');
  if (!setup) return;

  const { ctx, w, h } = setup;
  const crrData = live.crrHistory ?? [];
  const rrrData = live.rrrHistory ?? [];

  ctx.clearRect(0, 0, w, h);
  if (!crrData.length && !rrrData.length) return;

  const vals   = [...crrData, ...rrrData].filter(v => typeof v === 'number');
  const maxVal = Math.max(12, ...vals, 1);

  const pad    = 12;
  const chartW = w - pad * 2;
  const chartH = h - pad * 2;
  const points = Math.max(crrData.length, rrrData.length, 1);

  const toX = i => pad + (i / Math.max(1, points - 1)) * chartW;
  const toY = v => pad + chartH - (v / maxVal) * chartH;

  const drawLine = (data, color, dashed = false) => {
    if (!data.length) return;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth   = 2;
    ctx.setLineDash(dashed ? [4, 4] : []);
    data.forEach((v, i) => {
      if (i === 0) ctx.moveTo(toX(i), toY(v));
      else         ctx.lineTo(toX(i), toY(v));
    });
    ctx.stroke();
  };

  if (mode === 'crr'  || mode === 'both') drawLine(crrData, '#4f98a3', false);
  if (mode === 'rrr'  || mode === 'both') drawLine(rrrData, '#bb653b', true);
}

/* ============================================================
   FREE HIT / RESUME / TOAST
   ============================================================ */

export function showFreeHitBanner() {
  show('freehit-banner');
  setTimeout(() => hide('freehit-banner'), 3000);
}

export function showResumeOverlay() {
  show('scrim');
  show('resume-overlay');
}

export function hideResumeOverlay() {
  hide('resume-overlay');
  hide('scrim');
}

export function showToast(msg) {
  let toast = _el('ucm-toast');

  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'ucm-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--color-surface-2);
      color: var(--color-text);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-full);
      padding: 8px 16px;
      font-size: var(--text-xs);
      z-index: var(--z-toast, 9999);
      box-shadow: var(--shadow-md);
      pointer-events: none;
      opacity: 0;
      transition: opacity 180ms ease;
      white-space: nowrap;
    `;
    document.body.appendChild(toast);
  }

  toast.textContent  = msg;
  toast.style.opacity = '1';

  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.opacity = '0';
  }, 2200);
}

/* ============================================================
   MINI PLAYER POPUP
   ============================================================ */

export function showMiniPopup(pid) {
  if (!pid) return;

  const allPlayers = [...(md.userXI ?? []), ...(md.oppXI ?? [])];
  const player     = allPlayers.find(p => p.id === pid);
  if (!player) return;

  _setText('mini-popup-name', player.name ?? '---');
  _setText('mini-popup-role', player.roleSubtype ?? player.role ?? '---');

  const bs = live.batterStats?.[pid] ?? {};
  const bw = live.bowlerStats?.[pid]  ?? {};

  _setText('mini-popup-bat',
    bs.balls > 0 ? `${bs.runs ?? 0} (${bs.balls ?? 0}) SR ${((bs.runs / bs.balls) * 100).toFixed(0)}` : '—'
  );

  const lb = bw.legalBalls ?? bw.balls ?? 0;
  _setText('mini-popup-bowl',
    lb > 0
      ? `${_fmtOvers(lb)}-${bw.maidens ?? 0}-${bw.runs ?? 0}-${bw.wickets ?? 0}`
      : '—'
  );

  show('scrim');
  show('mini-popup');
}

/* ============================================================
   showInningsBreak alias (called from match-core)
   ============================================================ */
export { showInningsBreakOverlay as showInningsBreak };

/* ============================================================
   showDRS alias (called from match-core)
   ============================================================ */
export { showDRSOverlay as showDRS };
