import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ─── Firebase Init ─────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCsmoyzfLBxdACck8jkV245t8AAoDE7GN8",
  authDomain: "ultimate-cricket-manager.firebaseapp.com",
  projectId: "ultimate-cricket-manager",
  storageBucket: "ultimate-cricket-manager.firebasestorage.app",
  messagingSenderId: "939330999487",
  appId: "1:939330999487:web:eeaa137fa6b104e18ea20a"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ─── Auth Guard ────────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = 'auth.html';
    return;
  }

  // ── Show username in badge
  const badge = document.getElementById('user-badge-name');
  if (badge) {
    const name = user.displayName || user.email.split('@')[0];
    badge.textContent = '👤 ' + name;
  }

  // ── Multi-device check
  // Look for ANY save slot for this user in localStorage
  const uid      = user.uid;
  const name     = user.displayName || user.email.split('@')[0];
  const hasSave  =
    localStorage.getItem(`UCM_${uid}_slot_1`) ||
    localStorage.getItem(`UCM_${uid}_slot_2`) ||
    localStorage.getItem(`UCM_${uid}_slot_3`) ||
    localStorage.getItem(`UCM_${uid}_friendly_slot_1`);

  if (!hasSave) {
    // Personalise the title with their name
    const titleEl = document.getElementById('no-save-title');
    if (titleEl) titleEl.textContent = `Welcome back, ${name}!`;

    // Show the overlay
    const overlay = document.getElementById('no-save-overlay');
    if (overlay) overlay.classList.remove('hidden');
  }
});

// ─── Navigate ──────────────────────────────────────────────────
window.navigate = function(page) {
  window.location.href = page;
};

// ─── Sign Out Confirmation ─────────────────────────────────────
window.confirmSignOut = function() {
  const overlay = document.getElementById('signout-overlay');
  if (overlay) overlay.classList.remove('hidden');
};

window.closeSignOutOverlay = function() {
  const overlay = document.getElementById('signout-overlay');
  if (overlay) overlay.classList.add('hidden');
};

window.doSignOut = async function() {
  try {
    await signOut(auth);
    window.location.href = 'auth.html';
  } catch (e) {
    console.error('Sign out failed:', e.message);
  }
};

// ─── Close No-Save Overlay ─────────────────────────────────────
window.closeNoSaveOverlay = function() {
  const overlay = document.getElementById('no-save-overlay');
  if (overlay) overlay.classList.add('hidden');
};