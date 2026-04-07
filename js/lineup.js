// ─── lineup.js ──────────────────────────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { $, show, hide, esc, num, toast, isWK, teamName, teamFlag, pName, pNameFromList, roleEmoji, formatLabel, capitalize, diffEmoji, maxOvers } from './lineup-helpers.js';
import { play11AI_batting, play11AI_bowling, play11AI_opponent } from './lineup-ai.js';
import { initPopups, updatePopupRefs, openXIPopup, openBatOrder, openBowlAssign, openCaptain, openVenue, openOppDetail, renderBowlAssign } from './lineup-popups.js';



// ─── FIREBASE ───────────────────────────────────────────────────────────────
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



// ─── STATE ──────────────────────────────────────────────────────────────────
let _slot = null;
let _step = 1;
const TOTAL = 5;
let _allPlayers = [];
let _allVenues   = [];
let _tossDone    = false;



export const state = {
  userXI: [], oppXI: [],
  userBatOrder: [], oppBatOrder: [],
  bowlAssign: {}, oppBowlAssign: {},
  userCaptain: null, oppCaptain: null,
  venueId: null
};



// ─── TOSS STATE ─────────────────────────────────────────────────────────────
let _tossVenueSide = 'neutral';
let _userChoice    = null;
let _tossOutcome   = null;
let _userWonToss   = false;
let _userDecision  = null;



// ─── BOOT ───────────────────────────────────────────────────────────────────
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
  _allVenues  = window.dbAll('SELECT * FROM Venues ORDER BY name')    || [];

  initPopups(state, _slot, _allPlayers, _allVenues);
  autoFillState();

  $('btn-lu-back').addEventListener('click', stepBack);
  $('btn-lu-next').addEventListener('click', stepNext);

  const cancelBtn = $('btn-lu-cancel');
  if (cancelBtn) cancelBtn.addEventListener('click', _cancelLineup);

  const xiFilters = document.getElementById('xi-filters');
  if (xiFilters) {
    xiFilters.querySelectorAll('.lu-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        xiFilters.querySelectorAll('.lu-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  renderStep();
});



// ─── AUTO FILL STATE ────────────────────────────────────────────────────────
function autoFillState() {
  const fmt  = _formatFromOvers();
  const diff = _slot.difficulty || 'medium';
  const overs = Number(_slot.overs) || 20;

  const uPlayers = _allPlayers.filter(p => p.team_id === _slot.userTeam);
  if (!state.userXI.length && uPlayers.length >= 11) {
    const wks  = uPlayers.filter(p => isWK(p));
    const rest = uPlayers.filter(p => !isWK(p));
    const xi   = wks.length ? [wks[0], ...rest].slice(0, 11) : uPlayers.slice(0, 11);
    state.userXI       = xi;
    state.userBatOrder = play11AI_batting(xi, diff, fmt);
    state.userCaptain  = xi.reduce((b,p) => num(p.ps) > num(b?.ps) ? p : b, xi[0])?.id;
    state.bowlAssign   = play11AI_bowling(xi, diff, fmt, overs, {});
  }

  const oPlayers = _allPlayers.filter(p => p.team_id === _slot.oppTeam);
  if (!state.oppXI.length && oPlayers.length >= 11) {
    const wks  = oPlayers.filter(p => isWK(p));
    const rest = oPlayers.filter(p => !isWK(p));
    const xi   = wks.length ? [wks[0], ...rest].slice(0, 11) : oPlayers.slice(0, 11);
    state.oppXI      = xi;
    state.oppCaptain = xi.reduce((b,p) => num(p.ps) > num(b?.ps) ? p : b, xi[0])?.id;
    const { batOrder, bowlAssign } = play11AI_opponent(xi, diff, fmt, overs);
    state.oppBatOrder   = batOrder;
    state.oppBowlAssign = bowlAssign;
  }
}



// ─── NAVIGATION ─────────────────────────────────────────────────────────────
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

function _cancelLineup() {
  sessionStorage.removeItem('ucm_lineup_slot');
  sessionStorage.removeItem('ucm_match_data');
  window.location.href = 'friendly.html';
}

function validateStep(s) {
  if (s === 1) {
    if (state.userXI.length < 11)  { toast('Select your 11 players first.'); return false; }
    if (!state.userXI.some(isWK))  { toast('At least 1 Wicketkeeper is required.'); return false; }
  }
  if (s === 2) {
    if (!state.userCaptain) { toast('Please select a captain.'); return false; }
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



// ─── RENDER STEP ────────────────────────────────────────────────────────────
function renderStep() {
  const main = document.getElementById('lu-main-content') || document.getElementById('lu-main');
  if (!main) { console.error('[lineup.js] renderStep: main content element not found'); return; }
  main.innerHTML = '';

  const nextBtn   = $('btn-lu-next');
  const backBtn   = $('btn-lu-back');
  const cancelBtn = $('btn-lu-cancel');

  if (nextBtn) {
    nextBtn.textContent = _step === TOTAL ? '🏏 Play Match' : 'Next →';
    nextBtn.disabled    = (_step === TOTAL && !_userDecision);
  }
  if (backBtn) backBtn.textContent = _step === 1 ? '✕ Cancel' : '← Back';
  if (cancelBtn) cancelBtn.style.display = _step === TOTAL ? '' : 'none';

  if      (_step === 1) renderStep1(main);
  else if (_step === 2) renderStep2(main);
  else if (_step === 3) renderStep3(main);
  else if (_step === 4) renderStep4(main);
  else if (_step === 5) renderStep5(main);
}



// ═══════════════════════════════════════════════════════
// STEP 1 – PLAYING XI
// ═══════════════════════════════════════════════════════
function renderStep1(main) {
  const done   = state.userXI.length === 11;
  const hasWK  = state.userXI.some(isWK);
  const uName  = teamName(_slot.userTeam);
  const locked = _tossDone;

  main.innerHTML = `
    <div class="lu-step-title">Playing XI${locked ? ' <span class="lu-locked-badge">Locked</span>' : ''}</div>
    <div class="lu-step-sub">Select 11 players for ${esc(uName)}</div>
    <div class="lu-section-card ${done && hasWK ? 'complete' : ''}">
      <div class="lu-section-info">
        <div class="lu-section-label">Your Team – ${esc(uName)}</div>
        <div class="lu-section-value">${done
          ? state.userXI.slice(0,3).map(p => esc(p.name)).join(', ') + '…'
          : 'No players selected yet'}</div>
        <div class="lu-section-sub">${done
          ? `11 / 11 &nbsp;&nbsp; WK: ${state.userXI.filter(isWK).map(p => esc(p.name)).join(', ') || 'None'}`
          : `${state.userXI.length} / 11 selected`}</div>
      </div>
      <button class="lu-edit-btn" id="btn-open-xi"
        ${locked ? 'disabled style="opacity:.4;cursor:not-allowed"' : ''}>
        ${locked ? 'Locked' : done ? 'Edit' : 'Select'}
      </button>
    </div>
    ${done ? `
    <div class="lu-section-card complete">
      <div class="lu-section-info">
        <div class="lu-section-label">Full Squad</div>
        <div class="lu-section-value" style="white-space:normal;font-size:.85rem;line-height:2;color:rgba(255,255,255,.8)">
          ${state.userXI.map((p,i) =>
            `<span style="color:#F5A623;font-weight:800">${i+1}.</span> ${esc(p.name)}${isWK(p)
              ? ' <span style="font-size:.62rem;color:#60a5fa;font-weight:700">WK</span>' : ''}`
          ).join('&nbsp;&nbsp;')}
        </div>
      </div>
    </div>` : ''}
  `;
  if (!locked) $('btn-open-xi').addEventListener('click', () => openXIPopup(renderStep));
}



// ═══════════════════════════════════════════════════════
// STEP 2 – ORDERS + CAPTAIN
// ═══════════════════════════════════════════════════════
function renderStep2(main) {
  const locked   = _tossDone;
  const capName  = state.userCaptain ? pName(state.userCaptain, _allPlayers) : 'Not set';
  const batTop   = state.userBatOrder.slice(0,3).map(id => pName(id, _allPlayers)).join(', ');
  const bowlSum  = _buildBowlSummary();
  const overs    = Number(_slot.overs) || 20;
  const assigned = Object.values(state.bowlAssign).flat().length;
  const bowlOk   = assigned >= overs;

  main.innerHTML = `
    <div class="lu-step-title">Orders &amp; Captain${locked ? ' <span class="lu-locked-badge">Locked</span>' : ''}</div>
    <div class="lu-step-sub">Batting lineup · Bowling plan · Captain</div>
    <div class="lu-section-card complete">
      <div class="lu-section-info">
        <div class="lu-section-label">Batting Order</div>
        <div class="lu-section-value">1. ${esc(batTop)}</div>
      </div>
      <button class="lu-edit-btn" id="btn-bat-order">${locked ? 'View' : 'Edit'}</button>
    </div>
    <div class="lu-section-card ${bowlOk ? 'complete' : ''}">
      <div class="lu-section-info">
        <div class="lu-section-label">Bowling Plan
          <span style="font-size:.7rem;color:${bowlOk ? '#6fcf6f' : '#F5A623'};margin-left:6px">
            ${assigned}/${overs}${!bowlOk ? ' · auto-fills on Next' : ''}
          </span>
        </div>
        <div class="lu-section-value" style="font-size:.84rem;white-space:normal;line-height:1.7">${bowlSum}</div>
      </div>
      <button class="lu-edit-btn" id="btn-bowl-assign">${locked ? 'View' : 'Edit'}</button>
    </div>
    <div class="lu-section-card ${state.userCaptain ? 'complete' : ''}">
      <div class="lu-section-info">
        <div class="lu-section-label">Captain</div>
        <div class="lu-section-value">${esc(capName)}</div>
      </div>
      <button class="lu-edit-btn" id="btn-captain">${locked ? 'View' : 'Select'}</button>
    </div>
  `;
  $('btn-bat-order').addEventListener('click',   () => openBatOrder(renderStep, locked));
  $('btn-bowl-assign').addEventListener('click', () => openBowlAssign(renderStep, locked));
  $('btn-captain').addEventListener('click',     () => openCaptain(renderStep, locked));
}

function _buildBowlSummary() {
  const entries = Object.entries(state.bowlAssign);
  if (!entries.length) return '<em style="color:rgba(255,255,255,.35)">Auto-assign on Next</em>';
  const filled = entries.filter(([,ov]) => ov.length > 0);
  if (!filled.length) return '<em style="color:rgba(255,255,255,.35)">Auto-assign on Next</em>';
  return filled
    .map(([id, ov]) =>
      `<span style="color:#fff;font-weight:700">${esc(pName(id, _allPlayers))}</span> <span style="color:#F5A623">${ov.join(',')}</span>`)
    .join('<br>');
}



// ═══════════════════════════════════════════════════════
// STEP 3 – VENUE
// ═══════════════════════════════════════════════════════
function renderStep3(main) {
  const locked = _tossDone;
  const venue  = _allVenues.find(v => v.id === state.venueId);

  main.innerHTML = `
    <div class="lu-step-title">Venue${locked ? ' <span class="lu-locked-badge">Locked</span>' : ''}</div>
    <div class="lu-step-sub">Home · Away · Neutral options</div>
    <div class="lu-section-card ${venue ? 'complete' : ''}">
      <div class="lu-section-info">
        <div class="lu-section-label">Selected Venue</div>
        <div class="lu-section-value">${venue ? esc(venue.name) : 'Not selected'}</div>
        <div class="lu-section-sub">${venue
          ? `${esc(venue.country)} · Pitch: ${esc(venue.pitch_type || 'Balanced')} · Condition: ${esc(venue.pitch_condition || 'Good')} · ${_venueSideLabel(venue)}`
          : 'Tap Choose to browse'}</div>
      </div>
      <button class="lu-edit-btn" id="btn-choose-venue" ${locked ? 'style="opacity:.5"' : ''}>
        ${locked ? 'View' : venue ? 'Change' : 'Choose'}
      </button>
    </div>
  `;
  $('btn-choose-venue').addEventListener('click', () => openVenue(renderStep, locked));
}



// ═══════════════════════════════════════════════════════
// STEP 4 – MATCH SUMMARY  ✨ REDESIGNED
// ═══════════════════════════════════════════════════════
function renderStep4(main) {
  const venue  = _allVenues.find(v => v.id === state.venueId);
  const uName  = teamName(_slot.userTeam);
  const oName  = teamName(_slot.oppTeam);
  const uFlag  = teamFlag(_slot.userTeam);
  const oFlag  = teamFlag(_slot.oppTeam);
  const uAbbr  = (uName || 'YOU').slice(0, 3).toUpperCase();
  const oAbbr  = (oName || 'OPP').slice(0, 3).toUpperCase();
  const uCap   = pName(state.userCaptain, _allPlayers);
  const oCap   = pNameFromList(state.oppCaptain, state.oppXI);
  const uCapP  = state.userXI.find(p => p.id === state.userCaptain);
  const oCapP  = state.oppXI.find(p => p.id === state.oppCaptain);
  const fmt    = formatLabel(Number(_slot.overs));
  const diff   = capitalize(_slot.difficulty || 'medium');

  const vSide      = _getVenueSide(venue);
  const vSideEmoji = vSide === 'home' ? '🏠' : vSide === 'away' ? '✈️' : '⚖️';
  const vSideText  = vSide === 'home' ? 'Home' : vSide === 'away' ? 'Away' : 'Neutral';

  const xiTiles = (xi, side) => xi.map((p, i) => {
    const isCap = p.id === (side === 'user' ? state.userCaptain : state.oppCaptain);
    const isWk  = isWK(p);
    return `<div class="lu-xi-tile${isCap ? ' lu-xi-tile--cap' : isWk ? ' lu-xi-tile--wk' : ''}">
      <span class="lu-xi-tile-role">${roleEmoji(p.role)}</span>
      <span class="lu-xi-tile-name">${esc(p.name)}</span>
      ${isCap ? '<span class="lu-xi-tile-capbadge">©</span>' : ''}
    </div>`;
  }).join('');

  const keyBatter   = [...state.oppXI].sort((a,b) => num(b.bat)  - num(a.bat))[0];
  const keyBowler   = [...state.oppXI].sort((a,b) => num(b.bowl) - num(a.bowl))[0];
  const avgOppPS    = state.oppXI.length
    ? Math.round(state.oppXI.reduce((s,p) => s + num(p.ps), 0) / state.oppXI.length) : 0;
  const strengthPct = Math.min(100, Math.round((avgOppPS / 99) * 100));
  const pitchBullets = _pitchBullets(venue);

  main.innerHTML = `
    <div class="lu-step4-wrap">

      <div class="lu-s4-info-strip">
        <span class="lu-s4-chip lu-s4-chip--format">${esc(fmt)}</span>
        <span class="lu-s4-chip lu-chip--${(_slot.difficulty||'medium')}">${diffEmoji(_slot.difficulty)} ${esc(diff)}</span>

      </div>

      <div class="lu-s4-vs-block">
        <div class="lu-s4-team-card lu-s4-team-card--user">
          <div class="lu-s4-flag">${uFlag}</div>
          <div class="lu-s4-team-abbr">${uAbbr}</div>
          <div class="lu-s4-team-fullname">${esc(uName)}</div>
          ${uCapP ? `<div class="lu-s4-cap-badge">© ${esc(uCap)}</div>` : ''}
        </div>
        <div class="lu-s4-vs-glow">
          <span class="lu-s4-vs-ring"></span>
          <span class="lu-s4-vs-text">VS</span>
        </div>
        <div class="lu-s4-team-card lu-s4-team-card--opp">
          <div class="lu-s4-flag">${oFlag}</div>
          <div class="lu-s4-team-abbr">${oAbbr}</div>
          <div class="lu-s4-team-fullname">${esc(oName)}</div>
          ${oCapP ? `<div class="lu-s4-cap-badge">© ${esc(oCap)}</div>` : ''}
        </div>
      </div>

      ${venue ? `
      <div class="lu-s4-venue-strip">
        <span class="lu-toss-side-badge ${vSide}">${vSideEmoji} ${vSideText}</span>
        <span class="lu-s4-venue-name">${esc(venue.name)}</span>
        <span class="lu-s4-venue-pitch" data-pitch="${esc(venue.pitchtype)}">${esc(venue.pitchtype)} · ${esc(venue.pitchcondition || 'Good')}</span>
      </div>` : ''}

      <div class="lu-xi-columns">
        <div class="lu-xi-col">
          <div class="lu-xi-col-label">${uFlag} ${uAbbr} XI</div>
          <div class="lu-xi-col-tiles lu-xi-col-tiles--user">${xiTiles(state.userXI, 'user')}</div>
        </div>
        <div class="lu-xi-col">
          <div class="lu-xi-col-label">${oFlag} ${oAbbr} XI</div>
          <div class="lu-xi-col-tiles lu-xi-col-tiles--opp">${xiTiles(state.oppXI, 'opp')}</div>
        </div>
      </div>

      <!-- ── OPPONENT INTEL — collapsible ── -->
      <div class="lu-s4-opp-intel">

        <!-- Clickable header — toggles .is-open on the card -->
        <div class="lu-s4-intel-head">
          <div class="lu-s4-intel-title">🎯 Opponent Intel</div>
          <span class="lu-s4-intel-chevron">▼</span>
        </div>

        <!-- Collapsible body -->
        <div class="lu-s4-intel-body">

          <div class="lu-s4-strength-wrap">
            <div class="lu-s4-strength-label">
              Squad Strength
              <span class="lu-s4-strength-score">Avg PS ${avgOppPS}</span>
            </div>
            <div class="lu-s4-strength-track">
              <div class="lu-s4-strength-fill" style="width:0%" data-pct="${strengthPct}"></div>
            </div>
          </div>

          

          ${pitchBullets.length ? `
          <div class="lu-s4-pitch-report">
            <div class="lu-s4-intel-card-title">⛏ Pitch Report</div>
            <div class="lu-s4-pitch-bullets">
              ${pitchBullets.map(b => `<div class="lu-s4-pitch-bullet">${esc(b)}</div>`).join('')}
            </div>
          </div>` : ''}

          <div class="lu-s4-prediction">${_matchPrediction()}</div>

          <button class="lu-opp-detail-btn" id="btn-opp-detail">View Opponent Details →</button>

        </div><!-- end lu-s4-intel-body -->
      </div><!-- end lu-s4-opp-intel -->

    </div>
  `;

  // ── Event listeners ──────────────────────────────────────────────────────

  // Opponent detail popup button
  $('btn-opp-detail').addEventListener('click', openOppDetail);

  // Collapsible Opponent Intel toggle
  const intelCard = document.querySelector('.lu-s4-opp-intel');
  const intelHead = document.querySelector('.lu-s4-intel-head');
  if (intelHead && intelCard) {
    intelHead.addEventListener('click', () => {
      intelCard.classList.toggle('is-open');
      // Trigger strength bar fill when opening
      if (intelCard.classList.contains('is-open')) {
        setTimeout(() => {
          const fill = document.querySelector('.lu-s4-strength-fill');
          if (fill) fill.style.width = (fill.dataset.pct ?? '0') + '%';
        }, 100);
      }
    });
  }

  // ── ANIMATION TRIGGER ────────────────────────────────────────────────────
  // setTimeout gives browser 80ms to fully paint innerHTML before querying tiles
  setTimeout(() => {
    const tiles = document.querySelectorAll('.lu-xi-tile');

    if (!tiles.length) {
      console.warn('[lineup.js] lu-xi-tile: 0 tiles found — check xiTiles() output');
    }

    // Stagger each tile — user slides from left, opp from right (via CSS class)
    tiles.forEach((tile, i) => {
      setTimeout(() => {
        tile.classList.add('lu-xi-tile--visible');
      }, 80 + i * 55);
    });

    // Opp intel card fades in after all tiles finish
    const intelDelay = 80 + tiles.length * 55 + 180;
    setTimeout(() => {
      document.querySelector('.lu-s4-opp-intel')?.classList.add('lu-s4-opp-intel--visible');
    }, intelDelay);

    // NOTE: strength bar now fills on expand click, not on page load

  }, 80);
}

function _pitchBullets(venue) {
  if (!venue) return [];
  const bullets = [];
  const pt = (venue.pitch_type      || '').toLowerCase();
  const pc = (venue.pitch_condition || '').toLowerCase();
  if      (pt.includes('bat'))                        bullets.push('Batting-friendly surface — expect high scores.');
  else if (pt.includes('bowl') || pt.includes('seam')) bullets.push('Bowler-friendly — seam movement likely.');
  else if (pt.includes('spin'))                        bullets.push('Spin-friendly track — spinners will be key.');
  else if (pt.includes('balan'))                       bullets.push('Balanced pitch — even contest expected.');
  if (pc === 'worn')  bullets.push('Worn surface — deterioration expected as match progresses.');
  if (pc === 'dry')   bullets.push('Dry conditions — spinners may dominate later overs.');
  if (pc === 'fresh') bullets.push('Fresh pitch — expect early pace and bounce.');
  if (pc === 'good')  bullets.push('Good playing surface — conditions suit batting.');
  if (pc === 'rank')  bullets.push('Rank turner — spin could be unplayable.');
  return bullets;
}

function _matchPrediction() {
  const uAvg = state.userXI.length ? state.userXI.reduce((s,p) => s + num(p.ps), 0) / state.userXI.length : 0;
  const oAvg = state.oppXI.length  ? state.oppXI.reduce((s,p)  => s + num(p.ps), 0) / state.oppXI.length  : 0;
  const diff = uAvg - oAvg;
  if (diff > 8)  return '📈 Your squad looks significantly stronger. Favour your team to win.';
  if (diff > 3)  return '📊 Slight edge to your team — a competitive match expected.';
  if (diff < -8) return '⚠️ Tough challenge ahead — opponent squad is considerably stronger.';
  if (diff < -3) return '🔥 Opponent has a slight edge — play to your strengths.';
  return '⚖️ Very evenly matched squads — could go either way!';
}



// ═══════════════════════════════════════════════════════
// STEP 5 – TOSS
// ═══════════════════════════════════════════════════════
function renderStep5(main) {
  const venue = _allVenues.find(v => v.id === state.venueId);
  _tossVenueSide = _getVenueSide(venue);

  const uName = teamName(_slot.userTeam);
  const oName = teamName(_slot.oppTeam);

  const userCalls = _tossVenueSide !== 'away';
  const badgeLabel =
    _tossVenueSide === 'home'  ? `🏠 Home venue · You call the toss` :
    _tossVenueSide === 'away'  ? `✈️ Away venue · ${esc(oName)} calls` :
                                 `⚖️ Neutral · You call the toss`;

  main.innerHTML = `
    <div class="lu-toss-wrap">
      <div class="lu-step-title" style="text-align:center;margin-bottom:4px">Toss</div>
      <div class="lu-toss-side-badge ${_tossVenueSide}">${badgeLabel}</div>

      <div id="ht-section" ${!userCalls ? 'style="display:none"' : ''}>
        <div class="lu-toss-choose-label">Your call</div>
        <div class="lu-ht-row">
          <button class="lu-ht-btn ${_userChoice === 'heads' ? 'selected' : ''}"
            id="btn-heads" ${_tossDone ? 'disabled' : ''} onclick="pickHT('heads')">Heads 🌕</button>
          <button class="lu-ht-btn ${_userChoice === 'tails' ? 'selected' : ''}"
            id="btn-tails" ${_tossDone ? 'disabled' : ''} onclick="pickHT('tails')">Tails 🪙</button>
        </div>
      </div>

      <div class="lu-toss-hint" id="toss-hint">
        ${_tossDone
          ? (!userCalls ? `${esc(oName)} called automatically` : '')
          : (!userCalls
              ? `Tap the coin – ${esc(oName)} will call automatically`
              : (_userChoice ? 'Tap the coin to flip!' : 'Pick Heads or Tails first'))}
      </div>

      <div class="lu-toss-coin-wrap ${_tossDone ? 'done' : ''}" id="coin-wrap" onclick="doToss()">
        <div class="lu-coin-inner ${_tossOutcome
            ? (_tossOutcome === 'heads' ? 'show-heads' : 'show-tails') : ''}"
          id="lu-coin-inner">
          <div class="lu-coin-face">🌕</div>
          <div class="lu-coin-back">🪙</div>
        </div>
      </div>

      <div class="lu-toss-result-card ${_tossOutcome ? 'visible' : ''}" id="toss-result-card">
        <div class="lu-toss-winner" id="toss-winner-txt"></div>
        <div class="lu-toss-decision" id="toss-decision-txt"></div>
      </div>

      <div id="batbowl-section" style="display:none;width:100%;max-width:320px;margin:0 auto">
        <div class="lu-toss-choose-label">Choose</div>
        <div class="lu-batbowl-row">
          <button class="lu-batbowl-btn ${_userDecision === 'bat'  ? 'selected' : ''}"
            id="btn-bat"  onclick="pickBatBowl('bat')">🏏 Bat</button>
          <button class="lu-batbowl-btn ${_userDecision === 'bowl' ? 'selected' : ''}"
            id="btn-bowl" onclick="pickBatBowl('bowl')">🎳 Bowl</button>
        </div>
      </div>
    </div>
  `;

  if (_tossOutcome) _showTossResult();
}

function _showTossResult() {
  const uName  = teamName(_slot.userTeam);
  const oName  = teamName(_slot.oppTeam);
  const card   = $('toss-result-card');
  const winTxt = $('toss-winner-txt');
  const decTxt = $('toss-decision-txt');
  if (!card) return;

  const outcomeLabel = _tossOutcome
    ? _tossOutcome.charAt(0).toUpperCase() + _tossOutcome.slice(1) : '';

  if (winTxt) winTxt.textContent =
    `It's ${outcomeLabel}! ${_userWonToss ? uName : oName} won the toss`;

  if (_userWonToss) {
    if (decTxt) decTxt.textContent = 'You won! Choose to bat or bowl';
    const bb = $('batbowl-section');
    if (bb) bb.style.display = '';
  } else {
    if (!_userDecision) {
      const oppDecision = Math.random() < 0.5 ? 'bat' : 'bowl';
      _userDecision     = oppDecision === 'bat' ? 'bowl' : 'bat';
      const oppDid      = _userDecision === 'bat' ? 'bowl' : 'bat';
      if (decTxt) decTxt.textContent =
        `${oName} chose to ${oppDid} first. You will ${_userDecision} first.`;
    }
    const nb = $('btn-lu-next');
    if (nb) nb.disabled = false;
  }

  card.classList.add('visible');
  const nb = $('btn-lu-next');
  if (nb) nb.disabled = !_userDecision;
}



// ─── PERSIST MATCH DATA ─────────────────────────────────────────────────────
function _persistMatchData() {
  const overs    = Number(_slot.overs) || 20;
  const assigned = Object.values(state.bowlAssign).flat().length;
  if (assigned < overs) {
    state.bowlAssign = play11AI_bowling(
      state.userXI, _slot.difficulty, _formatFromOvers(), overs, state.bowlAssign);
  }

  const venueObj = _allVenues.find(v => v.id === state.venueId) || null;

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
    venue:         venueObj,
    toss: {
      outcome:      _tossOutcome,
      userWon:      _userWonToss,
      userCall:     _userChoice,
      userDecision: _userDecision,
      venueSide:    _tossVenueSide
    }
  }));
}



// ─── GO TO MATCH ─────────────────────────────────────────────────────────────
function goToMatch() {
  if (!_slot || _slot.slotIndex === undefined) {
    toast("Error: Match slot not found.");
    return;
  }

  const venueObj = _allVenues.find(v => v.id === state.venueId) || null;

  const matchData = {
    userTeam: _slot.userTeam,
    oppTeam:  _slot.oppTeam,
    overs:    _slot.overs,
    diff:     _slot.difficulty,
    venueId:  state.venueId,
    venue:    venueObj,
    userXI:   state.userXI,
    oppXI:    state.oppXI,
    toss: {
      outcome:      _tossOutcome,
      userWon:      _userWonToss,
      userDecision: _userDecision
    }
  };

  sessionStorage.setItem('UCM_CURRENT_MATCH', JSON.stringify(matchData));

  if (window.saveMatchData) {
    try {
      window.saveMatchData(_slot.slotIndex, matchData);
      window.location.href = 'match.html';
    } catch (e) {
      console.error("Save Failed:", e);
      toast("Failed to save match.");
    }
  }
}



// ─── VENUE HELPERS ───────────────────────────────────────────────────────────
function _getVenueSide(v) {
  if (!v) return 'neutral';
  if (v.team_id) {
    if (String(v.team_id) === String(_slot.userTeam)) return 'home';
    if (String(v.team_id) === String(_slot.oppTeam))  return 'away';
    return 'neutral';
  }
  const vc          = (v.country || '').toLowerCase();
  const userTeamRow = window.dbAll('SELECT country FROM Teams WHERE id=?', [_slot.userTeam])?.[0];
  const oppTeamRow  = window.dbAll('SELECT country FROM Teams WHERE id=?', [_slot.oppTeam])?.[0];
  const userCountry = (userTeamRow?.country || '').toLowerCase();
  const oppCountry  = (oppTeamRow?.country  || '').toLowerCase();
  if (userCountry && vc.includes(userCountry)) return 'home';
  if (oppCountry  && vc.includes(oppCountry))  return 'away';
  return 'neutral';
}

function _venueSideLabel(v) {
  const s = _getVenueSide(v);
  return s === 'home' ? '🏠 Your Home' : s === 'away' ? '✈️ Away' : '⚖️ Neutral';
}



// ─── FORMAT HELPER ───────────────────────────────────────────────────────────
function _formatFromOvers() {
  const o = Number(_slot?.overs) || 20;
  if (o <= 5)  return 'T5';
  if (o <= 10) return 'T10';
  if (o <= 20) return 'T20';
  if (o <= 50) return 'ODI';
  return 'Test';
}



// ─── EXPOSE TO HTML (onclick) ────────────────────────────────────────────────
window.pickHT = function(choice) {
  if (_tossDone) return;
  _userChoice = choice;
  document.querySelectorAll('.lu-ht-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById(`btn-${choice}`)?.classList.add('selected');
  const hint = $('toss-hint');
  if (hint) hint.textContent = 'Tap the coin to flip!';
};

window.doToss = function() {
  if (_tossDone) return;
  const userCalls = _tossVenueSide !== 'away';
  if (userCalls && !_userChoice) { toast('Pick Heads or Tails first!'); return; }

  const coinInner = document.getElementById('lu-coin-inner');
  if (!coinInner) return;

  coinInner.classList.remove('show-heads', 'show-tails', 'flipping');
  void coinInner.offsetWidth;
  coinInner.classList.add('flipping');

  setTimeout(() => {
    _tossOutcome = Math.random() < 0.5 ? 'heads' : 'tails';

    if (userCalls) {
      _userWonToss = (_userChoice === _tossOutcome);
    } else {
      const oppCall = Math.random() < 0.5 ? 'heads' : 'tails';
      _userWonToss  = (oppCall !== _tossOutcome);
    }

    coinInner.classList.remove('flipping');
    coinInner.classList.add(_tossOutcome === 'heads' ? 'show-heads' : 'show-tails');
    _tossDone = true;
    _showTossResult();
    _persistMatchData();
  }, 1400);
};

window.pickBatBowl = function(choice) {
  if (!_tossDone) return;
  _userDecision = choice;
  document.querySelectorAll('.lu-batbowl-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById(`btn-${choice}`)?.classList.add('selected');
  const decTxt = $('toss-decision-txt');
  if (decTxt) decTxt.textContent = `You chose to ${choice} first!`;
  const nb = $('btn-lu-next');
  if (nb) nb.disabled = false;
  _persistMatchData();
};