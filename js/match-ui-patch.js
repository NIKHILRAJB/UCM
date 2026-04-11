/**
 * UCM — MATCH-UI-PATCH.JS
 *
 * HOW TO USE:
 * In your match-ui.js, replace the following functions with
 * the exported versions below, or import and re-export them:
 *
 *   import {
 *     showResultOverlay,
 *     showInningsBreak,
 *     renderBatterCard,
 *     showOpponentIntentRow,
 *     hideOpponentIntentRow,
 *     scaleCanvas
 *   } from './match-ui-patch.js';
 *
 * FIX #13-17  showResultOverlay  — corrected element IDs
 * FIX #18-19  showInningsBreak   — corrected element IDs
 * FIX #20     renderBatterCard   — injects data-pid on card
 * FIX #37     showOpponentIntentRow / hideOpponentIntentRow
 * FIX #74     scaleCanvas        — devicePixelRatio scaling
 */

/* ─────────────────────────────────────────────────────────────
   UTILITY
   ───────────────────────────────────────────────────────────── */
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val ?? '—';
}

/* ─────────────────────────────────────────────────────────────
   FIX #13–17 — showResultOverlay(result)
   Corrected IDs:
     result-winner, result-margin, result-potm-name,
     result-inn1-team, result-inn2-team,
     result-inn1-score, result-inn2-score
   ───────────────────────────────────────────────────────────── */
export function showResultOverlay(result) {
  // Core result
  setText('result-winner',    result.winner);
  setText('result-margin',    result.margin);
  setText('result-potm-name', result.potm);

  // Innings scores
  setText('result-inn1-team',  result.inn1Team);
  setText('result-inn2-team',  result.inn2Team);
  setText('result-inn1-score', result.inn1Score);
  setText('result-inn2-score', result.inn2Score);
  setText('result-inn1-ov',    result.inn1Ov  ? `(${result.inn1Ov} ov)` : '');
  setText('result-inn2-ov',    result.inn2Ov  ? `(${result.inn2Ov} ov)` : '');

  // Highlights
  setText('res-top-scorer',   result.topScorer);
  setText('res-best-bowl',    result.bestBowl);
  setText('res-best-partner', result.bestPartner);
  setText('res-most-sixes',   result.mostSixes);
  setText('res-best-econ',    result.bestEcon);

  // Summary grid
  setText('res-sum-team-a',   result.teamA);
  setText('res-sum-team-b',   result.teamB);
  setText('res-sum-bound-a',  result.boundA);
  setText('res-sum-bound-b',  result.boundB);
  setText('res-sum-dot-a',    result.dotA);
  setText('res-sum-dot-b',    result.dotB);
  setText('res-sum-extras-a', result.extrasA);
  setText('res-sum-extras-b', result.extrasB);
  setText('res-sum-sixes-a',  result.sixesA);
  setText('res-sum-sixes-b',  result.sixesB);
  setText('res-sum-fours-a',  result.foursA);
  setText('res-sum-fours-b',  result.foursB);

  document.getElementById('result-overlay')?.classList.remove('hidden');
}

/* ─────────────────────────────────────────────────────────────
   FIX #18–19 — showInningsBreak(data)
   Corrected IDs: inn-break-score, inn-break-target
   ───────────────────────────────────────────────────────────── */
export function showInningsBreak(data) {
  setText('ibreak-title',       data.title       ?? 'END OF INNINGS 1');
  setText('ibreak-team',        data.team);
  setText('inn-break-score',    data.score);          // FIX #18
  setText('ibreak-overs',       data.overs ? `${data.overs} overs` : '');
  setText('ibreak-target-team', data.targetTeam);
  setText('inn-break-target',   data.target);         // FIX #19
  setText('ibreak-rrr',         data.rrr);

  document.getElementById('innings-break-overlay')?.classList.remove('hidden');
}

/* ─────────────────────────────────────────────────────────────
   FIX #20 — renderBatterCard(cardId, player)
   Stamps data-pid on the card element, then populates stats.

   cardId: 'card-striker' | 'card-nonstriker' | 'card-bowler'
   player: {
     id, name, runs, balls, sr, form, role,        // batters
     type, figures, econ, ovLeft, maxOv             // bowler
   }
   ───────────────────────────────────────────────────────────── */
export function renderBatterCard(cardId, player) {
  const card = document.getElementById(cardId);
  if (!card || !player) return;

  // FIX #20 — inject player ID on card element
  card.dataset.pid = player.id ?? '';

  const prefixMap = {
    'card-striker':    'striker',
    'card-nonstriker': 'nonstriker',
    'card-bowler':     'bowler',
  };
  const prefix = prefixMap[cardId];
  if (!prefix) return;

  if (prefix === 'bowler') {
    setText('bowler-name',       player.name);
    setText('bowler-type',       player.type    ?? 'PACE');
    setText('bowler-figures',    player.figures ?? '0-0-0-0');
    setText('bowler-econ',
      player.econ != null ? `Econ: ${Number(player.econ).toFixed(2)}` : 'Econ: —'
    );
    setText('bowler-quota-text',
      player.ovLeft != null ? `${player.ovLeft} ov left` : '— ov left'
    );

    // Quota bar fill
    const fill = document.getElementById('bowler-quota-fill');
    if (fill && player.maxOv) {
      const used = player.maxOv - (player.ovLeft ?? 0);
      fill.style.width = `${Math.min(100, (used / player.maxOv) * 100)}%`;
    }

  } else {
    // Batter (striker or non-striker)
    setText(`${prefix}-name`, player.name);
    setText(`${prefix}-sr`,
      player.sr != null ? `SR: ${Number(player.sr).toFixed(1)}` : 'SR: —'
    );
    setText(`${prefix}-form`,  player.form ?? '');
    setText(`${prefix}-role`,  player.role ?? '');

    // Runs + balls in one element: "42 (30)"
    const scoreEl = document.getElementById(`${prefix}-score`);
    if (scoreEl) {
      // Text node is runs, <span class="batter-balls"> is balls
      const ballsSpan = scoreEl.querySelector('.batter-balls');
      // Update only the text node (first child) for runs
      const runsText = scoreEl.childNodes[0];
      if (runsText && runsText.nodeType === Node.TEXT_NODE) {
        runsText.textContent = String(player.runs ?? 0) + ' ';
      } else {
        // fallback — prepend
        scoreEl.insertBefore(
          document.createTextNode(String(player.runs ?? 0) + ' '),
          scoreEl.firstChild
        );
      }
      if (ballsSpan) ballsSpan.textContent = `(${player.balls ?? 0})`;
    }
  }
}

/* ─────────────────────────────────────────────────────────────
   FIX #37 — showOpponentIntentRow(name, intent)
              hideOpponentIntentRow()
   ───────────────────────────────────────────────────────────── */
export function showOpponentIntentRow(name, intent) {
  const row    = document.getElementById('opponent-intent-row');
  const nameEl = document.getElementById('intent-name-opponent');
  const pillEl = document.getElementById('auto-pill-opponent');

  if (nameEl) nameEl.textContent = name   ?? '';
  if (pillEl) pillEl.textContent = `AUTO: ${intent ?? 'Neutral'}`;
  row?.classList.remove('hidden');
}

export function hideOpponentIntentRow() {
  document.getElementById('opponent-intent-row')?.classList.add('hidden');
}

/* ─────────────────────────────────────────────────────────────
   FIX #74 — scaleCanvas(canvasId)
   Call once after the canvas is in the DOM and has a CSS width.
   Re-call on window resize to keep the canvas crisp.

   Returns the 2D context (already scaled), or null if not found.

   Usage:
     const ctx = scaleCanvas('manhattan-canvas');
     if (ctx) drawManhattan(ctx);

     window.addEventListener('resize', () => {
       scaleCanvas('manhattan-canvas');
       scaleCanvas('rr-canvas');
     });
   ───────────────────────────────────────────────────────────── */
export function scaleCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const dpr  = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  const cssW = Math.round(rect.width)  || 300;
  const cssH = Math.round(rect.height) || Math.round(cssW * 0.45);

  // Only rescale if dimensions have actually changed (avoids flicker)
  if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
    canvas.width  = cssW * dpr;
    canvas.height = cssH * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
  }

  return canvas.getContext('2d');
}
