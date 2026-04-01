import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = 'auth.html';
    return;
  }

  window._ucmUID = user.uid;

  const name   = user.displayName || user.email.split('@')[0];
  const letter = name.charAt(0).toUpperCase();
  const uid    = user.uid;

  const badge = document.getElementById('user-badge-name');
  if (badge) badge.textContent = '👤 ' + name;

  const avatar = document.getElementById('menu-user-avatar');
  if (avatar) avatar.textContent = letter;

  const hasSave =
    localStorage.getItem(`UCM_${uid}_slot_1`) ||
    localStorage.getItem(`UCM_${uid}_slot_2`) ||
    localStorage.getItem(`UCM_${uid}_slot_3`) ||
    localStorage.getItem(`UCM_${uid}_autosave`) ||
    localStorage.getItem(`UCM_${uid}_session`);

  if (!hasSave) {
    const titleEl = document.getElementById('no-save-title');
    if (titleEl) titleEl.textContent = `Welcome back, ${name}!`;

    const overlay = document.getElementById('no-save-overlay');
    if (overlay) overlay.classList.remove('hidden');
  }
});

window.navigate = function(page) {
  window.location.href = page;
};

window.confirmSignOut = function() {
  document.getElementById('signout-overlay').classList.remove('hidden');
};

window.closeSignOutOverlay = function() {
  document.getElementById('signout-overlay').classList.add('hidden');
};

window.doSignOut = async function() {
  try {
    await signOut(auth);
    window.location.href = 'auth.html';
  } catch (e) {
    console.error('Sign out failed:', e.message);
  }
};

window.closeNoSaveOverlay = function() {
  document.getElementById('no-save-overlay').classList.add('hidden');
};