/* ============================================================
   UCM — MATCH.JS  (fixed)
   Entry point — boots the match app, wires all modules.
   Loaded as <script type="module"> in match.html.

   FIXES:
   - Removed broken wireAllPatchedEvents() call that was placed
     outside _init() and referenced undefined variables
     (state, applyFieldPreset, resumeMatch, etc.)
   - match-events-patch.js and match-ui-patch.js fixes are now
     folded into match-events.js and match-ui.js directly
   ============================================================ */

import { bootMatchApp, live, md, cfg, saveMatchState } from './match-core.js';
import { wireAllEvents }                               from './match-events.js';
import { renderAll }                                   from './match-ui.js';


/* ============================================================
   DOM READY GUARD
   ============================================================ */

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _init);
} else {
  _init();
}


/* ============================================================
   INIT
   ============================================================ */

async function _init() {
  try {
    // 1. Wire all DOM events first (before boot mutates state)
    wireAllEvents();

    // 2. Boot match — loads sessionStorage, builds live state,
    //    detects resume, kicks off innings 1
    await bootMatchApp();

    // 3. Safety-net render — bootMatchApp already calls renderAll()
    //    on both fresh-start and resume paths. Only re-render here
    //    if live state is populated (avoids redundant double-render
    //    on every page load).
    if (live && Object.keys(live).length > 0) {
      renderAll();
    }

    // 4. Periodic auto-save every 30 seconds
    setInterval(() => {
      if (live && Object.keys(live).length > 0) {
        saveMatchState();
      }
    }, 30_000);

    // 5. Save on page visibility change (tab switch / app background)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        saveMatchState();
      }
    });

    // 6. Save on page unload
    window.addEventListener('beforeunload', () => {
      saveMatchState();
    });

    // 7. Global error boundary — catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (e) => {
      console.error('UCM unhandled rejection:', e.reason);
      _showCrashToast(e.reason?.message ?? 'An unexpected error occurred.');
    });

    // 8. Mark app as ready
    document.documentElement.dataset.ucmReady = 'true';
    console.info('UCM Match ready ✓');

  } catch (err) {
    console.error('UCM boot failed:', err);
    _showCrashToast('Failed to load match. Returning to setup…');
    setTimeout(() => {
      window.location.href = 'friendly.html';
    }, 3000);
  }
}


/* ============================================================
   CRASH TOAST
   Uses .ucm-toast + .ucm-toast--error CSS classes from base.css
   instead of duplicating inline styles
   ============================================================ */

function _showCrashToast(msg) {
  let toast = document.getElementById('ucm-crash-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id        = 'ucm-crash-toast';
    toast.className = 'ucm-toast ucm-toast--error';
    document.body.appendChild(toast);
  }
  toast.textContent   = msg;
  toast.style.opacity = '1';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    toast.style.transition = 'opacity 0.4s';
    toast.style.opacity    = '0';
  }, 4000);
}