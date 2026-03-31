import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ─── Firebase Init ────────────────────────────────────────────
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

// ─── Auth Guard — runs on every page that loads menu.js ───────
// If user is NOT logged in → redirect to auth.html immediately
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = 'auth.html';
    return;
  }
  // Show username in badge (menu.html only)
  const badge = document.getElementById('user-badge-name');
  if (badge) {
    const name = user.displayName || user.email.split('@')[0];
    badge.textContent = '👤 ' + name;
  }
});

// ─── Navigate to page ─────────────────────────────────────────
// Simple wrapper — kept global so onclick in HTML works
window.navigate = function(page) {
  window.location.href = page;
};

// ─── Sign Out Confirmation ────────────────────────────────────
window.confirmSignOut = function() {
  const overlay = document.getElementById('signout-overlay');
  if (overlay) overlay.classList.remove('hidden');
};

window.closeSignOutOverlay = function() {
  const overlay = document.getElementById('signout-overlay');
  if (overlay) overlay.classList.add('hidden');
};

// ─── Do Sign Out ──────────────────────────────────────────────
window.doSignOut = async function() {
  try {
    await signOut(auth);
    window.location.href = 'auth.html';
  } catch (e) {
    console.error('Sign out failed:', e.message);
  }
};