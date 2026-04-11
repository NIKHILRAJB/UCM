/**
 * UCM — MATCH-EVENTS-PATCH.JS
 *
 * HOW TO USE:
 * In your match.js init function, after the DOM is ready, call:
 *
 *   import { wireAllPatchedEvents } from './match-events-patch.js';
 *
 *   wireAllPatchedEvents(state, {
 *     onFieldPreset:       (preset) => { ... },
 *     onResumeYes:         ()       => { ... },
 *     onResumeNo:          ()       => { ... },
 *     onDrsResultDismiss:  ()       => { ... },
 *     onResultHome:        ()       => { ... },
 *     onResultAgain:       ()       => { ... },
 *     onInningsToggle:     (inn)    => { ... },  // inn = "1"|"2"|"both"
 *     onRestartFromToss:   ()       => { ... },
 *     onAbandon:           ()       => { ... },
 *   });
 *
 * FIX #3   Field option buttons — reads data-preset (not data-field)
 * FIX #4   Scorecard inner tabs — reads data-tab (not data-inner-tab)
 * FIX #5   resume-overlay Yes / No buttons
 * FIX #6   drs-result-overlay Dismiss button
 * FIX #32  btn-view-scorecard / btn-view-stats from result screen
 * FIX #33  btn-result-home / btn-result-again
 * FIX #34  btn-close-field-popup
 * FIX #36  innings toggle handles data-inn="both"
 * FIX #79  btn-settings-restart → restart from toss
 */

/* ── helpers ──────────────────────────────────────────────── */

/** Wire a single element by ID */
function on(id, event, handler) {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener(event, handler);
  } else {
    console.warn(`[events-patch] element not found: #${id}`);
  }
}

/** Event delegation on a parent element */
function delegate(parentId, selector, event, handler) {
  const parent = document.getElementById(parentId);
  if (!parent) {
    console.warn(`[events-patch] parent not found: #${parentId}`);
    return;
  }
  parent.addEventListener(event, (e) => {
    const target = e.target.closest(selector);
    if (target && parent.contains(target)) {
      handler(e, target);
    }
  });
}

/** Show a sheet (bottom sheet) */
function openSheet(sheetId) {
  const scrim = document.getElementById('scrim');
  const sheet = document.getElementById(sheetId);
  scrim?.classList.remove('hidden');
  sheet?.classList.remove('hidden');
}

/** Hide a sheet */
function closeSheet(sheetId) {
  const sheet = document.getElementById(sheetId);
  sheet?.classList.add('hidden');
  // hide scrim only if no other sheets are open
  const anyOpen = document.querySelectorAll(
    '.bottom-sheet:not(.hidden), .field-popup:not(.hidden)'
  ).length > 0;
  if (!anyOpen) {
    document.getElementById('scrim')?.classList.add('hidden');
  }
}

/* ── main export ──────────────────────────────────────────── */

/**
 * Wire all patched events.
 * @param {object} state    - your match state object (passed through to handlers)
 * @param {object} handlers - callback map (all optional)
 */
export function wireAllPatchedEvents(state, handlers = {}) {

  /* ── FIX #3 — field options use data-preset ────────────── */
  delegate('field-popup', '[data-preset]', 'click', (e, btn) => {
    const preset = btn.dataset.preset;
    if (!preset) return;

    // Clear active class from all options, set on clicked one
    document.querySelectorAll('#field-popup .field-option')
      .forEach(b => b.classList.remove('field-option--active'));
    btn.classList.add('field-option--active');

    // Update the dropdown button label
    const label = document.getElementById('btn-field-dropdown');
    if (label) {
      label.textContent = `${btn.textContent.trim()} ▾`;
    }

    handlers.onFieldPreset?.(preset);
  });

  /* ── FIX #4 — scorecard inner tabs use data-tab ─────────── */
  delegate('sheet-score', '[data-tab]', 'click', (e, btn) => {
    const tab = btn.dataset.tab;
    if (!tab) return;

    // Toggle active state on tab buttons
    document.querySelectorAll('#sheet-score .sheet-inner-tab')
      .forEach(b => {
        const isActive = b.dataset.tab === tab;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });

    // Show / hide tab panels
    document.getElementById('score-tab-batting')
      ?.classList.toggle('hidden', tab !== 'batting');
    document.getElementById('score-tab-bowling')
      ?.classList.toggle('hidden', tab !== 'bowling');
  });

  /* ── FIX #5 — resume overlay ────────────────────────────── */
  on('btn-resume-yes', 'click', () => {
    document.getElementById('resume-overlay')?.classList.add('hidden');
    handlers.onResumeYes?.();
  });

  on('btn-resume-no', 'click', () => {
    document.getElementById('resume-overlay')?.classList.add('hidden');
    handlers.onResumeNo?.();
  });

  /* ── FIX #6 — DRS result overlay dismiss ────────────────── */
  on('btn-drs-result-dismiss', 'click', () => {
    document.getElementById('drs-result-overlay')?.classList.add('hidden');
    handlers.onDrsResultDismiss?.();
  });

  /* ── FIX #32 — view scorecard / stats from result screen ── */
  on('btn-view-scorecard', 'click', () => {
    document.getElementById('result-overlay')?.classList.add('hidden');
    openSheet('sheet-score');
  });

  on('btn-view-stats', 'click', () => {
    document.getElementById('result-overlay')?.classList.add('hidden');
    openSheet('sheet-stats');
  });

  /* ── FIX #33 — result action buttons ────────────────────── */
  on('btn-result-home', 'click', () => {
    document.getElementById('result-overlay')?.classList.add('hidden');
    handlers.onResultHome?.();
  });

  on('btn-result-again', 'click', () => {
    document.getElementById('result-overlay')?.classList.add('hidden');
    handlers.onResultAgain?.();
  });

  /* ── FIX #34 — close field popup ────────────────────────── */
  on('btn-close-field-popup', 'click', () => {
    document.getElementById('field-popup')?.classList.add('hidden');
    document.getElementById('scrim')?.classList.add('hidden');
    const dropdown = document.getElementById('btn-field-dropdown');
    if (dropdown) dropdown.setAttribute('aria-expanded', 'false');
  });

  /* ── FIX #36 — innings toggle including "both" ───────────── */
  delegate('sheet-stats', '[data-inn]', 'click', (e, btn) => {
    const inn = btn.dataset.inn; // "1", "2", or "both"

    document.querySelectorAll('.inn-toggle-btn')
      .forEach(b => b.classList.toggle('active', b.dataset.inn === inn));

    // Pass "both" straight through — handler decides how to aggregate
    handlers.onInningsToggle?.(inn);
  });

  /* ── FIX #79 — restart from toss ────────────────────────── */
  on('btn-settings-restart', 'click', () => {
    closeSheet('sheet-settings');
    handlers.onRestartFromToss?.();
  });

  /* ── Abandon settings flow (type-to-confirm) ────────────── */
  on('btn-settings-abandon', 'click', () => {
    closeSheet('sheet-settings');
    // Reset input before showing
    const input   = document.getElementById('abandon-type-input');
    const confirm = document.getElementById('btn-atype-confirm');
    if (input)   input.value = '';
    if (confirm) confirm.disabled = true;
    document.getElementById('abandon-type-overlay')?.classList.remove('hidden');
  });

  on('abandon-type-input', 'input', (e) => {
    const confirmBtn = document.getElementById('btn-atype-confirm');
    if (confirmBtn) {
      confirmBtn.disabled =
        e.target.value.trim().toUpperCase() !== 'ABANDON';
    }
  });

  on('btn-atype-confirm', 'click', () => {
    document.getElementById('abandon-type-overlay')?.classList.add('hidden');
    handlers.onAbandon?.();
  });

  on('btn-atype-cancel', 'click', () => {
    document.getElementById('abandon-type-overlay')?.classList.add('hidden');
  });

  /* ── Back-button abandon overlay (btn-abandon-cancel) ───── */
  on('btn-abandon-cancel', 'click', () => {
    document.getElementById('abandon-overlay')?.classList.add('hidden');
    document.getElementById('scrim')?.classList.add('hidden');
  });

  on('btn-abandon-confirm', 'click', () => {
    document.getElementById('abandon-overlay')?.classList.add('hidden');
    handlers.onAbandon?.();
  });
}
