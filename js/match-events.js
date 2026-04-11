// UCM — MATCH-EVENTS.JS  (fixed)


import {
  live, cfg, md,
  bowlOneBall, simNextOver, simRemaining,
  initInnings2, checkInningsEnd,
  markIntentConfirmed, updateBowlBtnState,
  disableActionBtns, saveMatchState,
  pickNextBowler
} from './match-core.js';

import {
  renderAll, renderInputPanel, renderActionBar,
  renderBatOrderSheet, renderBowlOrderSheet,
  renderScorecardSheet, renderScorecardBatting, renderScorecardBowling,
  switchScorecardTab,
  renderStatsSheet,
  renderPartnerships,
  drawManhattan, drawRunRate,
  show, hide,
  showWicketOverlay, showDRSOverlay, showDRSResultOverlay,
  showInningsBreakOverlay, showResultOverlay,
  showToast
} from './match-ui.js';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function el(id) { return document.getElementById(id); }

function on(id, event, fn) {
  const node = el(id);
  if (node) node.addEventListener(event, fn);
  else console.warn(`[events] element not found: #${id}`);
}

function onAll(selector, event, fn) {
  document.querySelectorAll(selector).forEach(n => n.addEventListener(event, fn));
}

// ─── SHEET MANAGEMENT ────────────────────────────────────────────────────────
// FIX A: Bottom sheets use .hidden class in CSS/HTML (not .sheet--open).
// All open/close logic uses classList.remove('hidden') / classList.add('hidden').

function _openSheet(name) {
  const sheetEl = el(`sheet-${name}`);
  if (!sheetEl) return;

  // Close any other open sheets first
  _closeAllSheets(false);

  sheetEl.classList.remove('hidden');
  show('scrim');

  // Render correct content on open
  switch (name) {
    case 'bat':
      renderBatOrderSheet();
      break;
    case 'bowl':
      renderBowlOrderSheet();
      break;
    case 'score':
      renderScorecardSheet();
      break;
    case 'stats': {
      const raw       = document.querySelector('.inn-toggle-btn.active')?.dataset.inn ?? '1';
      const innFilter = raw === 'both' ? 'both' : parseInt(raw, 10);
      renderStatsSheet(innFilter);
      drawManhattan(document.querySelector('.mann-toggle-btn.active')?.dataset.team ?? 'user');
      drawRunRate(document.querySelector('.rr-toggle-btn.active')?.dataset.rr ?? 'crr');
      break;
    }
    case 'settings': {
      const chk = el('chk-auto-pick');
      if (chk) chk.checked = live.autoPick ?? true;
      document.querySelectorAll('.speed-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.speed === (live.commentarySpeed ?? 'normal')));
      break;
    }
  }

  // Clear tab notification dot
  hide(`tab-dot-${name}`);

  // Focus management for accessibility
  const heading = sheetEl.querySelector('h2');
  if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus(); }
}

function _closeSheet(name, hideScrimIfClear = true) {
  const sheetEl = el(`sheet-${name}`);
  if (!sheetEl) return;
  sheetEl.classList.add('hidden');

  if (hideScrimIfClear) {
    // Only hide scrim if no other persistent overlay is open
    if (!_anyOverlayOpen()) hide('scrim');
  }

  // Restore default active tab (BAT)
  document.querySelectorAll('.tab-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.sheet === 'bat'));
}

function _closeAllSheets(hideScrimIfClear = true) {
  ['bat', 'bowl', 'score', 'stats', 'settings'].forEach(name => {
    el(`sheet-${name}`)?.classList.add('hidden');
  });
  if (hideScrimIfClear && !_anyOverlayOpen()) hide('scrim');
}

/** Returns true if any non-sheet overlay that needs the scrim is still visible */
function _anyOverlayOpen() {
  const persistentOverlays = [
    'result-overlay', 'wicket-overlay', 'drs-overlay',
    'innings-break-overlay', 'drs-result-overlay',
    'abandon-overlay', 'abandon-type-overlay', 'resume-overlay'
  ];
  return persistentOverlays.some(id => !el(id)?.classList.contains('hidden'));
}

function _closeFieldPopup() {
  hide('field-popup');
  if (!_anyOverlayOpen() && _allSheetsClosed()) hide('scrim');
  el('btn-field-dropdown')?.setAttribute('aria-expanded', 'false');
}

function _allSheetsClosed() {
  return ['bat', 'bowl', 'score', 'stats', 'settings'].every(
    name => el(`sheet-${name}`)?.classList.contains('hidden') !== false
  );
}

// ─── WIRE ALL EVENTS (entry point called by match.js) ────────────────────────

export function wireAllEvents() {

  // ── 1. BACK BUTTON ─────────────────────────────────────────────────────────
  on('btn-back', 'click', () => {
    show('abandon-overlay');
    show('scrim');
  });

  // ── 2. ACTION BAR ──────────────────────────────────────────────────────────

  on('btn-bowl', 'click', async () => {
    if (live.simRunning) {
      // STOP mid-sim
      live.stopSim = true;
      const btn = el('btn-bowl');
      if (btn) btn.textContent = 'BOWL';
      return;
    }
    await bowlOneBall();
  });

  on('btn-next-over', 'click', async () => {
    if (live.simRunning) return;
    await simNextOver();
  });

  // ── 3. INTENT BUTTONS ──────────────────────────────────────────────────────

  on('intent-btns-striker', 'click', e => {
    const btn = e.target.closest('.intent-btn');
    if (!btn) return;
    live.strikerIntent = btn.dataset.intent;
    markIntentConfirmed();
    renderInputPanel();
    updateBowlBtnState();
  });

  on('intent-btns-nonstriker', 'click', e => {
    const btn = e.target.closest('.intent-btn');
    if (!btn) return;
    live.nonStrikerIntent = btn.dataset.intent;
    renderInputPanel();
  });

  // FIX C: was live.bowlingIntent (typo) — correct field is live.bowlerIntent
  on('intent-btns-bowler', 'click', e => {
    const btn = e.target.closest('.intent-btn');
    if (!btn) return;
    live.bowlerIntent = btn.dataset.intent;   // ← FIX C
    markIntentConfirmed();
    renderInputPanel();
    updateBowlBtnState();
  });

  on('wkt-intent-btns', 'click', e => {
    const btn = e.target.closest('.intent-btn');
    if (!btn) return;
    live.strikerIntent = btn.dataset.intent;
    el('wkt-intent-btns')?.querySelectorAll('.intent-btn').forEach(b => {
      const active = b.dataset.intent === live.strikerIntent;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', String(active));
    });
  });

  // ── 4. FIELD POPUP ─────────────────────────────────────────────────────────

  on('btn-field-dropdown', 'click', () => {
    show('field-popup');
    show('scrim');
    el('btn-field-dropdown')?.setAttribute('aria-expanded', 'true');

    // FIX #3: read data-preset (not data-field)
    const preset = live.fieldSetting ?? live.fieldPreset ?? 'balanced';
    document.querySelectorAll('.field-option').forEach(btn => {
      const val = btn.dataset.preset ?? btn.dataset.field; // data-preset first, fallback
      btn.classList.toggle('field-option--active', val === preset);
    });

    const changesEl = el('field-popup-changes');
    if (changesEl) {
      const used = live.fieldChanges ?? 0;
      const max  = cfg.maxFieldChanges ?? live.maxFieldChanges ?? 6;
      changesEl.textContent = `Changes used: ${used} of ${max}`;
    }
  });

  // FIX #34: dedicated close button for field popup
  on('btn-close-field-popup', 'click', _closeFieldPopup);

  // FIX #3: field option selection reads data-preset
  onAll('.field-option', 'click', e => {
    const btn    = e.currentTarget;
    const preset = btn.dataset.preset ?? btn.dataset.field; // FIX #3
    if (!preset) return;

    const max     = cfg.maxFieldChanges ?? live.maxFieldChanges ?? 6;
    const current = live.fieldSetting ?? live.fieldPreset ?? 'balanced';

    if (preset !== current) {
      if ((live.fieldChanges ?? 0) >= max) {
        showToast('No field changes remaining!');
        return;
      }
      live.fieldSetting  = preset;
      live.fieldPreset   = preset;
      live.fieldChanges  = (live.fieldChanges ?? 0) + 1;
    }

    _closeFieldPopup();
    renderInputPanel();
    saveMatchState();
  });

  // ── 5. TAB BAR — open bottom sheets ────────────────────────────────────────

  onAll('.tab-btn', 'click', e => {
    const btn   = e.currentTarget;
    const sheet = btn.dataset.sheet;
    if (!sheet) return;

    const sheetEl = el(`sheet-${sheet}`);
    const isOpen  = sheetEl && !sheetEl.classList.contains('hidden');

    if (isOpen) {
      // Toggle off
      _closeSheet(sheet);
      btn.classList.remove('active');
      return;
    }

    _openSheet(sheet);
    document.querySelectorAll('.tab-btn').forEach(b =>
      b.classList.toggle('active', b === btn));
  });

  // Sheet close buttons (each has data-sheet="name")
  onAll('.sheet-close', 'click', e => {
    const sheet = e.currentTarget.dataset.sheet;
    if (sheet) _closeSheet(sheet);
  });

  // ── 6. SCORECARD INNER TABS ────────────────────────────────────────────────
  // FIX #4: reads data-tab (not data-inner-tab)

  onAll('.sheet-inner-tab', 'click', e => {
    const btn = e.currentTarget;
    const tab = btn.dataset.tab ?? btn.dataset.innerTab; // FIX #4: data-tab first
    if (!tab) return;
    switchScorecardTab(tab);
    if (tab === 'batting') renderScorecardBatting();
    else                   renderScorecardBowling();
  });

  // ── 7. STATS INNINGS TOGGLE ────────────────────────────────────────────────
  // FIX #36: handles data-inn="both" as well as "1" / "2"

  onAll('.inn-toggle-btn', 'click', e => {
    const btn = e.currentTarget;
    const raw = btn.dataset.inn;                                   // "1", "2", or "both"
    const innFilter = raw === 'both' ? 'both' : parseInt(raw, 10); // FIX #36

    document.querySelectorAll('.inn-toggle-btn').forEach(b => {
      const active = b === btn;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', String(active));
    });

    renderStatsSheet(innFilter);

    const activeTeam = document.querySelector('.mann-toggle-btn.active')?.dataset.team ?? 'user';
    drawManhattan(activeTeam);

    const activeRR = document.querySelector('.rr-toggle-btn.active')?.dataset.rr ?? 'crr';
    drawRunRate(activeRR);
  });

  // ── 8. PARTNERSHIPS TOGGLE ─────────────────────────────────────────────────

  onAll('.pship-toggle-btn', 'click', e => {
    const btn  = e.currentTarget;
    const side = btn.dataset.team ?? 'user';
    document.querySelectorAll('.pship-toggle-btn').forEach(b =>
      b.classList.toggle('active', b === btn));
    renderPartnerships(side);
  });

  // ── 9. MANHATTAN TOGGLE ────────────────────────────────────────────────────

  onAll('.mann-toggle-btn', 'click', e => {
    const btn  = e.currentTarget;
    const team = btn.dataset.team ?? 'user';
    document.querySelectorAll('.mann-toggle-btn').forEach(b =>
      b.classList.toggle('active', b === btn));
    drawManhattan(team);
  });

  // ── 10. RUN RATE TOGGLE ────────────────────────────────────────────────────

  onAll('.rr-toggle-btn', 'click', e => {
    const btn  = e.currentTarget;
    const mode = btn.dataset.rr ?? 'crr';
    document.querySelectorAll('.rr-toggle-btn').forEach(b =>
      b.classList.toggle('active', b === btn));
    drawRunRate(mode);
  });

  // ── 11. MINI INFO POPUP (player name tap) ──────────────────────────────────

  // FIX #20: cards now have data-pid injected by renderPlayerCards()
  ['card-striker', 'card-nonstriker', 'card-bowler'].forEach(cardId => {
    on(cardId, 'click', e => {
      const pid = e.currentTarget.dataset.pid;
      if (!pid) return;
      import('./match-ui.js').then(({ showMiniPopup }) => showMiniPopup(pid));
    });
  });

  on('btn-mini-close', 'click', () => {
    hide('mini-popup');
    if (!_anyOverlayOpen() && _allSheetsClosed()) hide('scrim');
  });

  // ── 12. WICKET OVERLAY — Continue ──────────────────────────────────────────

  on('btn-wkt-continue', 'click', () => {
    hide('wicket-overlay');
    if (!_anyOverlayOpen()) hide('scrim');
    live.intentConfirmed = false;
    updateBowlBtnState();
    checkInningsEnd();
    renderAll();
    saveMatchState();
  });

  // ── 13. DRS OVERLAY ────────────────────────────────────────────────────────

  on('btn-drs-yes', 'click', () => {
    if (!live.drsWaiting) return;
    clearInterval(live.drsTimer);
    live.drsReviews = Math.max(0, (live.drsReviews ?? 2) - 1);

    import('./match_engine.js').then(({ reviewDRSResult }) => {
      const { overturned } = reviewDRSResult(live.pendingDRS, live);
      live.drsWaiting = false;

      if (overturned) {
        live.wickets = Math.max(0, live.wickets - 1);
        live.fallOfWickets?.pop();
        const last = live.battingScorecard?.[live.battingScorecard.length - 1];
        if (last) { last.notOut = true; last.dismissal = null; }
      }

      showDRSResultOverlay({ overturned, reviewsLeft: live.drsReviews ?? 0 });
      live.pendingDRS = null;
      renderAll();
      saveMatchState();
    });
  });

  on('btn-drs-no', 'click', () => {
    if (!live.drsWaiting) return;
    clearInterval(live.drsTimer);
    live.drsWaiting = false;
    live.pendingDRS  = null;
    hide('drs-overlay');
    if (!_anyOverlayOpen()) hide('scrim');
    renderAll();
    saveMatchState();
  });

  // ── 14. DRS RESULT OVERLAY — Dismiss ───────────────────────────────────────

  // FIX #6: correct ID btn-drs-result-dismiss (already correct in HTML)
  on('btn-drs-result-dismiss', 'click', () => {
    hide('drs-result-overlay');
    if (!_anyOverlayOpen()) hide('scrim');
    checkInningsEnd();
    renderAll();
  });

  on('drs-result-overlay', 'click', e => {
    if (e.target === el('drs-result-overlay')) {
      hide('drs-result-overlay');
      if (!_anyOverlayOpen()) hide('scrim');
      checkInningsEnd();
      renderAll();
    }
  });

  // ── 15. INNINGS BREAK — Start Innings 2 ────────────────────────────────────

  on('btn-innings-start', 'click', () => {
    hide('innings-break-overlay');
    if (!_anyOverlayOpen()) hide('scrim');
    initInnings2();
    renderAll();
    saveMatchState();
  });

  // ── 16. RESULT OVERLAY BUTTONS ─────────────────────────────────────────────

  // FIX #32: view scorecard / stats from result screen
  on('btn-view-scorecard', 'click', () => {
    hide('result-overlay');
    _openSheet('score');
  });

  on('btn-view-stats', 'click', () => {
    hide('result-overlay');
    _openSheet('stats');
  });

  // FIX #33: btn-result-home and btn-result-again
  on('btn-result-home', 'click', () => {
    hide('result-overlay');
    hide('scrim');
    window.location.href = '../index.html';
  });

  on('btn-result-again', 'click', () => {
    hide('result-overlay');
    hide('scrim');
    // FIX B: correct sessionStorage key = UCMCURRENTMATCH (no underscores)
    try {
      const snap = JSON.parse(sessionStorage.getItem('UCMCURRENTMATCH') ?? '{}');
      delete snap.liveState;
      snap.matchCompleted = false;
      sessionStorage.setItem('UCMCURRENTMATCH', JSON.stringify(snap));
    } catch (_) {}
    window.location.reload();
  });

  // Legacy alias — old HTML had btn-result-continue
  on('btn-result-continue', 'click', () => {
    hide('result-overlay');
    hide('scrim');
    window.location.href = '../index.html';
  });

  // ── 17. RESUME OVERLAY ─────────────────────────────────────────────────────
  // FIX D: correct IDs are btn-resume-yes / btn-resume-no (match-core also
  // binds these with { once: true }; these bindings act as a safety net).

  on('btn-resume-yes', 'click', () => {
    hide('resume-overlay');
    if (!_anyOverlayOpen()) hide('scrim');
    renderAll();
    updateBowlBtnState();
  });

  on('btn-resume-no', 'click', () => {
    hide('resume-overlay');
    if (!_anyOverlayOpen()) hide('scrim');
    // FIX B: correct sessionStorage key
    try {
      const snap = JSON.parse(sessionStorage.getItem('UCMCURRENTMATCH') ?? '{}');
      delete snap.liveState;
      snap.matchCompleted = false;
      sessionStorage.setItem('UCMCURRENTMATCH', JSON.stringify(snap));
    } catch (_) {}
    window.location.reload();
  });

  // ── 18. ABANDON OVERLAY (back-button flow) ─────────────────────────────────

  on('btn-abandon-cancel', 'click', () => {
    hide('abandon-overlay');
    if (!_anyOverlayOpen()) hide('scrim');
  });

  on('btn-abandon-confirm', 'click', () => {
    hide('abandon-overlay');
    hide('scrim');
    // FIX B: correct sessionStorage key
    try { sessionStorage.removeItem('UCMCURRENTMATCH'); } catch (_) {}
    window.location.href = '../index.html';
  });

  // ── 19. SETTINGS SHEET ─────────────────────────────────────────────────────

  on('chk-auto-pick', 'change', e => {
    live.autoPick = e.target.checked;
    if (live.autoPick) pickNextBowler?.();
    renderAll();
    saveMatchState();
  });

  onAll('.speed-btn', 'click', e => {
    const speed = e.currentTarget.dataset.speed ?? 'normal';
    live.commentarySpeed = speed;
    document.querySelectorAll('.speed-btn').forEach(b =>
      b.classList.toggle('active', b === e.currentTarget));
    saveMatchState();
  });

  on('btn-sim-remaining', 'click', async () => {
    _closeSheet('settings');
    await simRemaining();
  });

  on('btn-sim-full', 'click', async () => {
    _closeSheet('settings');
    live.stopSim = false;
    await simRemaining();
    if (live.innings === 1) {
      initInnings2();
      renderAll();
      await simRemaining();
    }
  });

  // FIX #79: btn-settings-restart → restart from toss
  on('btn-settings-restart', 'click', () => {
    _closeSheet('settings');
    // FIX B: correct sessionStorage key
    try {
      const snap = JSON.parse(sessionStorage.getItem('UCMCURRENTMATCH') ?? '{}');
      delete snap.liveState;
      snap.matchCompleted = false;
      sessionStorage.setItem('UCMCURRENTMATCH', JSON.stringify(snap));
    } catch (_) {}
    window.location.reload();
  });

  on('btn-settings-abandon', 'click', () => {
    _closeSheet('settings');
    const inp     = el('abandon-type-input');
    const confirm = el('btn-atype-confirm');
    if (inp)     inp.value = '';
    if (confirm) confirm.disabled = true;
    show('abandon-type-overlay');
    show('scrim');
    inp?.focus();
  });

  // ── 20. ABANDON TYPE-TO-CONFIRM OVERLAY ────────────────────────────────────

  on('abandon-type-input', 'input', e => {
    const confirmBtn = el('btn-atype-confirm');
    if (confirmBtn) {
      confirmBtn.disabled = e.target.value.trim().toUpperCase() !== 'ABANDON';
    }
  });

  on('btn-atype-cancel', 'click', () => {
    hide('abandon-type-overlay');
    if (!_anyOverlayOpen()) hide('scrim');
  });

  on('btn-atype-confirm', 'click', () => {
    hide('abandon-type-overlay');
    hide('scrim');
    // FIX B: correct sessionStorage key
    try { sessionStorage.removeItem('UCMCURRENTMATCH'); } catch (_) {}
    window.location.href = '../index.html';
  });

  // ── 21. SCRIM CLICK — dismiss topmost overlay or sheet ─────────────────────

  on('scrim', 'click', () => {
    // Priority: field popup > mini popup > sheets > scrim itself

    if (!el('field-popup')?.classList.contains('hidden')) {
      _closeFieldPopup();
      return;
    }

    if (!el('mini-popup')?.classList.contains('hidden')) {
      hide('mini-popup');
      if (!_anyOverlayOpen() && _allSheetsClosed()) hide('scrim');
      return;
    }

    // Close any open sheet
    const openSheetName = ['bat', 'bowl', 'score', 'stats', 'settings']
      .find(name => !el(`sheet-${name}`)?.classList.contains('hidden'));

    if (openSheetName) {
      _closeSheet(openSheetName);
      return;
    }

    // Nothing matched — fallback: just hide scrim
    hide('scrim');
  });

  // ── 22. KEYBOARD ESCAPE ────────────────────────────────────────────────────

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;

    // Priority order: type-confirm > abandon > mini popup > field popup > sheets
    const priorityOverlays = [
      'abandon-type-overlay', 'abandon-overlay', 'mini-popup', 'field-popup'
    ];
    for (const id of priorityOverlays) {
      if (!el(id)?.classList.contains('hidden')) {
        el(id).classList.add('hidden');
        if (!_anyOverlayOpen() && _allSheetsClosed()) hide('scrim');
        return;
      }
    }

    const openSheetName = ['bat', 'bowl', 'score', 'stats', 'settings']
      .find(name => !el(`sheet-${name}`)?.classList.contains('hidden'));
    if (openSheetName) _closeSheet(openSheetName);
  });
}