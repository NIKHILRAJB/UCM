// ─── lineup.js ────────────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  $, show, hide, esc, num, toast,
  isWK, teamName, teamFlag, pName, pNameFromList,
  roleEmoji, formatLabel, capitalize, diffEmoji, maxOvers
} from './lineup-helpers.js';

import { play11AI_batting, play11AI_bowling, play11AI_opponent } from './lineup-ai.js';

import {
  initPopups, updatePopupRefs,
  openXIPopup, openBatOrder, openBowlAssign,
  openCaptain, openVenue, openOppDetail,
  renderBowlAssign
} from './lineup-popups.js';

// ─── FIREBASE ─────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCsmoyzfLBxdACck8jkV245t8AAoDE7GN8",
  authDomain: "ultimate-cricket-manager.firebaseapp.com",
  projectId: "ultimate-cricket-manager",
  storageBucket: "ultimate-cricket-manager.firebasestorage.app",
  messagingSenderId: "939330999487",
  appId: "1:939330999487:web:eeaa137fa6b104e18ea20a"
};
initializeApp(firebaseConfig);
const auth = getAuth();

// ─── STATE ────────────────────────────────────────────────────
let _slot       = null;
let _step       = 1;
const TOTAL     = 5;
let _allPlayers = [];
let _allVenues  = [];
let _tossDone   = false;  // true after toss → steps 1–3 become read-only

export const state = {
  userXI:        [],
  oppXI:         [],
  userBatOrder:  [],
  oppBatOrder:   [],
  bowlAssign:    {},
  oppBowlAssign: {},
  userCaptain:   null,
  oppCaptain:    null,
  venueId:       null
};

// ─── TOSS STATE ───────────────────────────────────────────────
let _tossVenueSide = 'neutral';
let _userChoice    = null;
let _tossOutcome   = null;
let _userWonToss   = false;
let _userDecision  = null;

// ─── BOOT ─────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  const raw = sessionStorage.getItem('ucm_lineup_slot');
  if (!raw) { window.location.href = 'friendly.html'; return; }
  _slot = JSON.parse(raw);

  await new Promise(resolve => {
    const unsub = onAuthStateChanged(auth, user => {
      if (!user) { window.location.href = 'auth.html'; return; }
      window._ucmUID = user.uid;
      resolve(); unsub();
    });
  });

  await window.initDB();
  _allPlayers = window.dbAll('SELECT * FROM Players ORDER BY ps DESC') || [];
  _allVenues  = window.dbAll('SELECT * FROM Venues ORDER BY name')     || [];

  initPopups(state, _slot, _allPlayers, _allVenues);
  autoFillState();

  $('btn-lineup-back').addEventListener('click', () => window.location.href = 'friendly.html');
  $('btn-lu-back').addEventListener('click', stepBack);
  $('btn-lu-next').addEventListener('click', stepNext);

  $('xi-filters').querySelectorAll('.lu-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $('xi-filters').querySelectorAll('.lu-filter-btn')
        .forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  renderStep();
});

// ─── AUTO FILL STATE ──────────────────────────────────────────
function autoFillState() {
  const fmt   = _formatFromOvers();
  const diff  = _slot.difficulty || 'medium';
  const overs = Number(_slot.overs) || 20;

  // User XI
  const uPlayers = _allPlayers.filter(p => p.team_id === _slot.userTeam);
  if (!state.userXI.length && uPlayers.length >= 11) {
    const wks = uPlayers.filter(p => isWK(p));
    const rest = uPlayers.filter(p => !isWK(p));
    const xi  = wks.length ? [wks[0], ...rest].slice(0, 11) : uPlayers.slice(0, 11);
    state.userXI       = xi;
    state.userBatOrder = play11AI_batting(xi, diff, fmt);
    state.userCaptain  = xi.reduce((b,p) => num(p.ps) > num(b?.ps) ? p : b, xi[0])?.id;
    state.bowlAssign   = play11AI_bowling(xi, diff, fmt, overs, {});
  }

  // Opponent XI
  const oPlayers = _allPlayers.filter(p => p.team_id === _slot.oppTeam);
  if (!state.oppXI.length && oPlayers.length >= 11) {
    const wks = oPlayers.filter(p => isWK(p));
    const rest = oPlayers.filter(p => !isWK(p));
    const xi  = wks.length ? [wks[0], ...rest].slice(0, 11) : oPlayers.slice(0, 11);
    state.oppXI      = xi;
    state.oppCaptain = xi.reduce((b,p) => num(p.ps) > num(b?.ps) ? p : b, xi[0])?.id;
    const { batOrder, bowlAssign } = play11AI_opponent(xi, diff, fmt, overs);
    state.oppBatOrder   = batOrder;
    state.oppBowlAssign = bowlAssign;
  }
}

// ─── NAVIGATION ───────────────────────────────────────────────
function stepNext() {
  if (!validateStep(_step)) return;
  if (_step === TOTAL) { goToMatch(); return; }
  _step++;
  renderStep();
}

function stepBack() {
  if (_step === 1) { window.location.href = 'friendly.html'; return; }
  _step--;
  renderStep();
}

function validateStep(s) {
  if (s === 1) {
    if (state.userXI.length < 11)   { toast('Select your 11 players first.'); return false; }
    if (!state.userXI.some(isWK))   { toast('At least 1 Wicketkeeper is required.'); return false; }
  }
  if (s === 2) {
    if (!state.userCaptain) { toast('Please select a captain.'); return false; }
    // Auto-fill any missing bowling overs silently
    const overs    = Number(_slot.overs) || 20;
    const assigned = Object.values(state.bowlAssign).flat().length;
    if (assigned < overs) {
      state.bowlAssign = play11AI_bowling(
        state.userXI, _slot.difficulty, _formatFromOvers(), overs, state.bowlAssign);
    }
  }
  if (s === 3) {
    if (!state.venueId) { toast('Please choose a venue.'); return false; }
  }
  if (s === 5) {
    if (!_userDecision) { toast('Complete the toss first.'); return false; }
  }
  return true;
}

// ─── RENDER STEP ──────────────────────────────────────────────
function renderStep() {
  updateProgress();
  const main = $('lu-main-content');
  main.innerHTML = '';
  $('btn-lu-next').textContent = _step === TOTAL ? '🏏 Play Match' : 'Next →';
  $('btn-lu-next').disabled    = (_step === TOTAL && !_userDecision);
  $('btn-lu-back').textContent = _step === 1 ? '✕ Cancel' : '← Back';

  if      (_step === 1) renderStep1(main);
  else if (_step === 2) renderStep2(main);
  else if (_step === 3) renderStep3(main);
  else if (_step === 4) renderStep4(main);
  else if (_step === 5) renderStep5(main);
}

function updateProgress() {
  $('lu-progress-fill').style.width = ((_step / TOTAL) * 100) + '%';
  document.querySelectorAll('.lu-step-lbl').forEach(el => {
    const s = Number(el.dataset.step);
    el.classList.remove('active', 'done');
    if (s === _step)    el.classList.add('active');
    else if (s < _step) el.classList.add('done');
  });
}

// ═══════════════════════════════════════════
// STEP 1 — PLAYING XI
// ═══════════════════════════════════════════
function renderStep1(main) {
  const done   = state.userXI.length === 11;
  const hasWK  = state.userXI.some(isWK);
  const uName  = teamName(_slot.userTeam);
  const locked = _tossDone;

  main.innerHTML = `
    <div class="lu-step-title">
      Playing XI
      ${locked ? '<span class="lu-locked-badge">🔒 Locked</span>' : ''}
    </div>
    <div class="lu-step-sub">Select 11 players for ${esc(uName)}</div>

    <div class="lu-section-card ${done && hasWK ? 'complete' : ''}">
      <div class="lu-section-info">
        <div class="lu-section-label">Your Team · ${esc(uName)}</div>
        <div class="lu-section-value">${done
          ? state.userXI.slice(0, 3).map(p => esc(p.name)).join(', ') + '…'
          : 'No players selected yet'}</div>
        <div class="lu-section-sub">${done
          ? `✅ 11 / 11 &nbsp;·&nbsp; WK: ${
              state.userXI.filter(isWK).map(p => esc(p.name)).join(', ') || '⚠️ None'
            }`
          : `${state.userXI.length} / 11 selected`}</div>
      </div>
      <button class="lu-edit-btn" id="btn-open-xi"
        ${locked ? 'disabled style="opacity:.4;cursor:not-allowed"' : ''}>
        ${locked ? '🔒 Locked' : done ? '✏️ Edit' : '＋ Select'}
      </button>
    </div>

    ${done ? `
    <div class="lu-section-card complete">
      <div class="lu-section-info">
        <div class="lu-section-label">Full Squad</div>
        <div class="lu-section-value"
          style="white-space:normal;font-size:.85rem;line-height:2;color:rgba(255,255,255,.8)">
          ${state.userXI.map((p, i) => `
            <span style="color:#F5A623;font-weight:800">${i + 1}.</span>
            ${esc(p.name)}
            ${isWK(p) ? '<span style="font-size:.62rem;color:#60a5fa;font-weight:700">(WK)</span>' : ''}
          `).join('&nbsp;&nbsp;')}
        </div>
      </div>
    </div>` : ''}
  `;

  if (!locked) {
    $('btn-open-xi').addEventListener('click', () => openXIPopup(renderStep));
  }
}

// ═══════════════════════════════════════════
// STEP 2 — ORDERS + CAPTAIN
// ═══════════════════════════════════════════
function renderStep2(main) {
  const locked   = _tossDone;
  const capName  = state.userCaptain ? pName(state.userCaptain, _allPlayers) : '— Not set —';
  const batTop   = state.userBatOrder.slice(0, 3).map(id => pName(id, _allPlayers)).join(', ');
  const bowlSum  = _buildBowlSummary();
  const overs    = Number(_slot.overs) || 20;
  const assigned = Object.values(state.bowlAssign).flat().length;
  const bowlOk   = assigned >= overs;

  main.innerHTML = `
    <div class="lu-step-title">
      Orders &amp; Captain
      ${locked ? '<span class="lu-locked-badge">🔒 Locked</span>' : ''}
    </div>
    <div class="lu-step-sub">Batting lineup · Bowling plan · Captain</div>

    <div class="lu-section-card complete">
      <div class="lu-section-info">
        <div class="lu-section-label">Batting Order</div>
        <div class="lu-section-value">1. ${esc(batTop)}…</div>
      </div>
      <button class="lu-edit-btn" id="btn-bat-order">
        ${locked ? '👁 View' : 'Edit'}
      </button>
    </div>

    <div class="lu-section-card ${bowlOk ? 'complete' : ''}">
      <div class="lu-section-info">
        <div class="lu-section-label">
          Bowling Plan
          <span style="font-size:.7rem;color:${bowlOk ? '#6fcf6f' : '#F5A623'};margin-left:6px">
            ${assigned}/${overs} overs
            ${!bowlOk ? ' · auto-fills on Next' : ''}
          </span>
        </div>
        <div class="lu-section-value"
          style="font-size:.84rem;white-space:normal;line-height:1.7">
          ${bowlSum}
        </div>
      </div>
      <button class="lu-edit-btn" id="btn-bowl-assign">
        ${locked ? '👁 View' : 'Edit'}
      </button>
    </div>

    <div class="lu-section-card ${state.userCaptain ? 'complete' : ''}">
      <div class="lu-section-info">
        <div class="lu-section-label">Captain</div>
        <div class="lu-section-value">${esc(capName)}</div>
      </div>
      <button class="lu-edit-btn" id="btn-captain">
        ${locked ? '👁 View' : 'Select'}
      </button>
    </div>
  `;

  $('btn-bat-order').addEventListener('click',   () => openBatOrder(renderStep, locked));
  $('btn-bowl-assign').addEventListener('click', () => openBowlAssign(renderStep, locked));
  $('btn-captain').addEventListener('click',     () => openCaptain(renderStep, locked));
}

function _buildBowlSummary() {
  const entries = Object.entries(state.bowlAssign);
  if (!entries.length) return '— Auto-assign on Next →';
  const filled = entries.filter(([, ov]) => ov.length > 0);
  if (!filled.length) return '— Auto-assign on Next →';
  return filled
    .map(([pid, ov]) =>
      `<span style="color:#fff;font-weight:700">${esc(pName(pid, _allPlayers))}</span>: ` +
      `<span style="color:#F5A623">${ov.join(', ')}</span>`)
    .join('<br>');
}

// ═══════════════════════════════════════════
// STEP 3 — VENUE
// ═══════════════════════════════════════════
function renderStep3(main) {
  const locked = _tossDone;
  const venue  = _allVenues.find(v => v.id === state.venueId);

  main.innerHTML = `
    <div class="lu-step-title">
      Venue
      ${locked ? '<span class="lu-locked-badge">🔒 Locked</span>' : ''}
    </div>
    <div class="lu-step-sub">Home · Away · Neutral options</div>

    <div class="lu-section-card ${venue ? 'complete' : ''}">
      <div class="lu-section-info">
        <div class="lu-section-label">Selected Venue</div>
        <div class="lu-section-value">
          ${venue ? esc(venue.name) : '— Not selected —'}
        </div>
        <div class="lu-section-sub">
          ${venue
            ? `${esc(venue.country || '—')} · Pitch: ${esc(venue.pitch_type || 'Standard')} · ${_venueSideLabel(venue)}`
            : 'Tap Choose to browse'}
        </div>
      </div>
      <button class="lu-edit-btn" id="btn-choose-venue"
        ${locked ? 'style="opacity:.5"' : ''}>
        ${locked ? '👁 View' : venue ? 'Change' : 'Choose'}
      </button>
    </div>
  `;

  $('btn-choose-venue').addEventListener('click', () => openVenue(renderStep, locked));
}

// ═══════════════════════════════════════════
// STEP 4 — SUMMARY
// ═══════════════════════════════════════════
function renderStep4(main) {
  const venue = _allVenues.find(v => v.id === state.venueId);
  const uName = teamName(_slot.userTeam);
  const oName = teamName(_slot.oppTeam);
  const uFlag = teamFlag(_slot.userTeam);
  const oFlag = teamFlag(_slot.oppTeam);
  const uCap  = pName(state.userCaptain, _allPlayers);
  const oCap  = pNameFromList(state.oppCaptain, state.oppXI);
  const fmt   = formatLabel(Number(_slot.overs));
  const diff  = capitalize(_slot.difficulty || 'medium');

  const xiRows = xi => xi.map((p, i) => `
    <div class="lu-summary-xi-player">
      <span class="lu-summary-xi-num">${i + 1}</span>
      <span class="lu-summary-xi-pname">${esc(p.name)}</span>
      <span class="lu-summary-xi-role">${roleEmoji(p.role)}</span>
    </div>`).join('');

  main.innerHTML = `
    <div class="lu-step-title">Match Summary</div>
    <div class="lu-step-sub">Locked in — review before toss</div>

    <div class="lu-summary-hero">
      <div class="lu-summary-matchid">⚡ ${esc(_slot.slotName || 'Friendly Match')}</div>

      <div class="lu-summary-vs-row">
        <div class="lu-summary-team-block">
          <div class="lu-summary-flag">${uFlag}</div>
          <div class="lu-summary-tname">${esc(uName)}</div>
          <div class="lu-summary-captain-tag">🎖 ${esc(uCap)}</div>
        </div>
        <div class="lu-summary-vs-sep">VS</div>
        <div class="lu-summary-team-block">
          <div class="lu-summary-flag">${oFlag}</div>
          <div class="lu-summary-tname">${esc(oName)}</div>
          <div class="lu-summary-captain-tag">🎖 ${esc(oCap)}</div>
        </div>
      </div>

      <div class="lu-summary-divider"></div>

      <div class="lu-summary-xi-wrap">
        <div class="lu-summary-xi-col">
          <div class="lu-summary-xi-label">🏏 Your XI</div>
          ${xiRows(state.userXI)}
        </div>
        <div class="lu-summary-xi-col">
          <div class="lu-summary-xi-label">⚔️ Their XI</div>
          ${xiRows(state.oppXI)}
        </div>
      </div>

      <div class="lu-summary-meta-row">
        <span class="lu-summary-meta-pill">🏏 ${esc(fmt)}</span>
        <span class="lu-summary-meta-pill">
          ${diffEmoji(_slot.difficulty)} ${esc(diff)}
        </span>
      </div>

      <div class="lu-summary-venue-row">
        <div class="lu-summary-venue-left">
          <div class="lu-summary-venue-name">
            🏟 ${venue ? esc(venue.name) : '—'}
          </div>
          <div class="lu-summary-venue-meta">
            ${venue
              ? `${esc(venue.country || '—')} · ${_venueSideLabel(venue)}`
              : '—'}
          </div>
        </div>
        <div class="lu-summary-venue-pitch">
          ${venue ? esc(venue.pitch_type || 'Standard') : '—'}
        </div>
      </div>
    </div>

    <button class="lu-opp-detail-btn" id="btn-opp-detail">
      👁 View Opponent Details ›
    </button>
  `;

  $('btn-opp-detail').addEventListener('click', openOppDetail);
}

// ═══════════════════════════════════════════
// STEP 5 — TOSS
// ═══════════════════════════════════════════
function renderStep5(main) {
  const venue    = _allVenues.find(v => v.id === state.venueId);
  _tossVenueSide = _getVenueSide(venue);
  const uName    = teamName(_slot.userTeam);
  const oName    = teamName(_slot.oppTeam);
  const userCalls = _tossVenueSide !== 'away';

  const badgeLabel = _tossVenueSide === 'home'
    ? '🏠 Home venue — You call the toss'
    : _tossVenueSide === 'away'
    ? `✈️ Away venue — ${esc(oName)} calls`
    : '⚖️ Neutral — You call the toss';

  main.innerHTML = `
    <div class="lu-toss-wrap">

      <div class="lu-step-title" style="text-align:center;margin-bottom:4px">Toss</div>
      <div class="lu-toss-side-badge ${_tossVenueSide}">${badgeLabel}</div>

      <!-- Heads / Tails choice — only shown when user calls -->
      <div id="ht-section" ${!userCalls ? 'style="display:none"' : ''}>
        <div class="lu-toss-choose-label">Your call:</div>
        <div class="lu-ht-row">
          <button
            class="lu-ht-btn ${_userChoice === 'heads' ? 'selected' : ''}"
            id="btn-heads"
            ${_tossDone ? 'disabled' : ''}
            onclick="pickHT('heads')">
            🪙 Heads
          </button>
          <button
            class="lu-ht-btn ${_userChoice === 'tails' ? 'selected' : ''}"
            id="btn-tails"
            ${_tossDone ? 'disabled' : ''}
            onclick="pickHT('tails')">
            🎱 Tails
          </button>
        </div>
      </div>

      <!-- Hint text -->
      <div class="lu-toss-hint" id="toss-hint">
        ${_tossDone
          ? ''
          : !userCalls
          ? `Tap the coin — ${esc(oName)} will call automatically`
          : _userChoice
          ? 'Tap the coin to flip!'
          : 'Pick Heads or Tails first'}
      </div>

      <!-- Coin — clean, no text on face -->
      <div class="lu-toss-coin-wrap${_tossDone ? ' done' : ''}"
        id="coin-wrap"
        onclick="doToss()">
        <div class="lu-coin" id="lu-coin">
          <div class="lu-coin-front">🪙</div>
          <div class="lu-coin-back">🎱</div>
        </div>
      </div>

      <!-- Result card — hidden until toss done -->
      <div class="lu-toss-result-card${_tossOutcome ? ' visible' : ''}"
        id="toss-result-card">
        <div class="lu-toss-winner"   id="toss-winner-txt"></div>
        <div class="lu-toss-decision" id="toss-decision-txt"></div>
      </div>

      <!-- Bat / Bowl choice — shown after user wins toss -->
      <div id="batbowl-section" style="display:none;width:100%;max-width:320px;margin:0 auto">
        <div class="lu-toss-choose-label">Choose:</div>
        <div class="lu-batbowl-row">
          <button
            class="lu-batbowl-btn ${_userDecision === 'bat'  ? 'selected' : ''}"
            id="btn-bat"
            onclick="pickBatBowl('bat')">🏏 Bat</button>
          <button
            class="lu-batbowl-btn ${_userDecision === 'bowl' ? 'selected' : ''}"
            id="btn-bowl"
            onclick="pickBatBowl('bowl')">⚡ Bowl</button>
        </div>
      </div>

    </div>
  `;

  // If toss already done (came back then forward), restore UI
  if (_tossOutcome) _showTossResult();
  $('btn-lu-next').disabled = !_userDecision;
}

// ── Toss helpers (window-scoped for onclick) ──────────────────
window.pickHT = function(choice) {
  if (_tossDone) return;
  _userChoice = choice;
  document.querySelectorAll('.lu-ht-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('btn-' + choice)?.classList.add('selected');
  const hint = $('toss-hint');
  if (hint) hint.textContent = 'Tap the coin to flip!';
};

window.doToss = function() {
  if (_tossDone) return;
  const userCalls = _tossVenueSide !== 'away';
  if (userCalls && !_userChoice) { toast('Pick Heads or Tails first! 🪙'); return; }

  // Animate
  const coin = $('lu-coin');
  if (coin) coin.classList.add('flipping');

  setTimeout(() => {
    _tossOutcome = Math.random() > 0.5 ? 'heads' : 'tails';

    // Did user win the toss?
    if (userCalls) {
      _userWonToss = (_userChoice === _tossOutcome);
    } else {
      // Opponent calls randomly
      const oppCall = Math.random() > 0.5 ? 'heads' : 'tails';
      _userWonToss  = (oppCall !== _tossOutcome); // opp called wrong → user wins
    }

    if (coin) {
      coin.classList.remove('flipping');
      coin.classList.add(_tossOutcome === 'heads' ? 'show-heads' : 'show-tails');
    }

    _tossDone = true;
    _showTossResult();

    // ── Persist all match data to sessionStorage on toss complete ──
    _persistMatchData();

  }, 1200);
};

function _showTossResult() {
  const uName  = teamName(_slot.userTeam);
  const oName  = teamName(_slot.oppTeam);
  const card   = $('toss-result-card');
  const winTxt = $('toss-winner-txt');
  const decTxt = $('toss-decision-txt');
  if (!card) return;

  const outcomeLabel = _tossOutcome
    ? _tossOutcome.charAt(0).toUpperCase() + _tossOutcome.slice(1) : '';

  if (winTxt) {
    winTxt.textContent = `It's ${outcomeLabel}! — ${_userWonToss ? uName : oName} won the toss`;
  }

  if (_userWonToss) {
    if (decTxt) decTxt.textContent = 'You won! Choose to bat or bowl:';
    const bb = $('batbowl-section');
    if (bb) bb.style.display = '';
    if (_userDecision) {
      document.getElementById('btn-bat') ?.classList.toggle('selected', _userDecision==='bat');
      document.getElementById('btn-bowl')?.classList.toggle('selected', _userDecision==='bowl');
    }
    // Disable HT buttons — toss locked
    document.querySelectorAll('.lu-ht-btn').forEach(b => { b.disabled = true; });
  } else {
    // Opponent decides — randomly pick bat or bowl
    if (!_userDecision) {
      const oppDecision = Math.random() > 0.5 ? 'bat' : 'bowl';
      _userDecision     = oppDecision === 'bat' ? 'bowl' : 'bat'; // user does opposite
    }
    const oName2 = teamName(_slot.oppTeam);
    const oppDid = _userDecision === 'bat' ? 'bowl' : 'bat';
    if (decTxt) {
      decTxt.textContent =
        `${oName2} chose to ${oppDid} first. You will ${_userDecision} first.`;
    }
    $('btn-lu-next').disabled = false;
  }

  card.classList.add('visible');
  $('btn-lu-next').disabled = !_userDecision;
}

window.pickBatBowl = function(choice) {
  if (!_tossDone) return;
  _userDecision = choice;
  document.querySelectorAll('.lu-batbowl-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('btn-' + choice)?.classList.add('selected');
  const decTxt = $('toss-decision-txt');
  if (decTxt) decTxt.textContent = `You chose to ${choice} first! 🏏`;
  $('btn-lu-next').disabled = false;
  // Persist updated decision
  _persistMatchData();
};

// ─── PERSIST MATCH DATA (called on toss complete) ─────────────
function _persistMatchData() {
  const overs    = Number(_slot.overs) || 20;
  const assigned = Object.values(state.bowlAssign).flat().length;
  if (assigned < overs) {
    state.bowlAssign = play11AI_bowling(
      state.userXI, _slot.difficulty, _formatFromOvers(), overs, state.bowlAssign);
  }

  sessionStorage.setItem('ucm_match_data', JSON.stringify({
    slot:          _slot,
    userXI:        state.userXI,
    oppXI:         state.oppXI,
    userBatOrder:  state.userBatOrder,
    oppBatOrder:   state.oppBatOrder,
    bowlAssign:    state.bowlAssign,
    oppBowlAssign: state.oppBowlAssign,
    userCaptain:   state.userCaptain,
    oppCaptain:    state.oppCaptain,
    venueId:       state.venueId,
    toss: {
      outcome:      _tossOutcome,
      userWon:      _userWonToss,
      userCall:     _userChoice,
      userDecision: _userDecision,
      venueSide:    _tossVenueSide
    }
  }));
}

// ─── GO TO MATCH ──────────────────────────────────────────────
function goToMatch() {
  _persistMatchData(); // final save before navigate
  window.location.href = 'match.html';
}

// ─── VENUE HELPERS ────────────────────────────────────────────
function _getVenueSide(v) {
  if (!v) return 'neutral';
  if (String(v.team_id) === String(_slot.userTeam)) return 'home';
  if (String(v.team_id) === String(_slot.oppTeam))  return 'away';
  return 'neutral';
}

function _venueSideLabel(v) {
  const s = _getVenueSide(v);
  return s === 'home' ? '🏠 Your Home' : s === 'away' ? '✈️ Away' : '⚖️ Neutral';
}

// ─── FORMAT HELPER ────────────────────────────────────────────
function _formatFromOvers() {
  const o = Number(_slot?.overs) || 20;
  if (o <= 5)  return 'T5';
  if (o <= 10) return 'T10';
  if (o <= 20) return 'T20';
  if (o <= 50) return 'ODI';
  return 'Test';
}