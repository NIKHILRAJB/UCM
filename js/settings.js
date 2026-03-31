import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
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
  const name = user.displayName || user.email.split('@')[0];
  const nameEl  = document.getElementById('acc-name');
  const emailEl = document.getElementById('acc-email');
  if (nameEl)  nameEl.textContent  = name;
  if (emailEl) emailEl.textContent = user.email;
});

// ─── Toast Helper ──────────────────────────────────────────────
function showToast(msg) {
  const toast = document.getElementById('toast-msg');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2500);
}

// ─── Modal Helpers ─────────────────────────────────────────────
window.openModal = function(id) {
  document.getElementById(id).classList.remove('hidden');
};

window.closeModal = function(id) {
  document.getElementById(id).classList.add('hidden');
};

// ─── Sign Out ──────────────────────────────────────────────────
window.openSignOutModal = function() {
  window.openModal('modal-signout');
};

window.doSignOut = async function() {
  try {
    await signOut(auth);
    window.location.href = 'auth.html';
  } catch (e) {
    console.error('Sign out failed:', e.message);
  }
};

// ─── Reset Game Data ───────────────────────────────────────────
window.openResetModal = function() {
  document.getElementById('reset-state-confirm').classList.remove('hidden');
  document.getElementById('reset-state-loading').classList.add('hidden');
  document.getElementById('reset-state-success').classList.add('hidden');
  window.openModal('modal-reset');
};

window.doReset = function() {
  document.getElementById('reset-state-confirm').classList.add('hidden');
  document.getElementById('reset-state-loading').classList.remove('hidden');

  setTimeout(() => {
    localStorage.clear();
    document.getElementById('reset-state-loading').classList.add('hidden');
    document.getElementById('reset-state-success').classList.remove('hidden');
  }, 2000);
};

// ─── Change Password ───────────────────────────────────────────
window.openChangePassword = function() {
  document.getElementById('pw-current').value = '';
  document.getElementById('pw-new').value     = '';
  document.getElementById('pw-confirm').value = '';
  document.getElementById('pw-error').classList.add('hidden');
  window.openModal('modal-change-pw');
};

window.doChangePassword = async function() {
  const pwCurrent = document.getElementById('pw-current').value;
  const pwNew     = document.getElementById('pw-new').value;
  const pwConfirm = document.getElementById('pw-confirm').value;
  const errEl     = document.getElementById('pw-error');

  if (!pwCurrent || !pwNew || !pwConfirm) {
    errEl.textContent = 'All fields are required.';
    errEl.classList.remove('hidden');
    return;
  }
  if (pwNew !== pwConfirm) {
    errEl.textContent = 'New passwords do not match.';
    errEl.classList.remove('hidden');
    return;
  }
  if (pwNew.length < 6) {
    errEl.textContent = 'New password must be at least 6 characters.';
    errEl.classList.remove('hidden');
    return;
  }

  errEl.classList.add('hidden');

  try {
    const user       = auth.currentUser;
    const credential = EmailAuthProvider.credential(user.email, pwCurrent);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, pwNew);

    window.closeModal('modal-change-pw');
    showToast('✅ Password updated successfully!');

  } catch (e) {
    console.error('Change password failed:', e.message);
    if (e.code === 'auth/wrong-password') {
      errEl.textContent = 'Current password is incorrect.';
    } else if (e.code === 'auth/weak-password') {
      errEl.textContent = 'New password is too weak.';
    } else {
      errEl.textContent = 'Failed to update. Try again.';
    }
    errEl.classList.remove('hidden');
  }
};

// ─── Load & Save General Settings ─────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const speed   = localStorage.getItem('setting-commentary-speed') || 'normal';
  const speedEl = document.getElementById('setting-commentary-speed');
  if (speedEl) speedEl.value = speed;

  ['setting-autosim', 'setting-debug', 'setting-sound', 'setting-haptics'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = localStorage.getItem(id) === 'true';
  });

  if (speedEl) {
    speedEl.addEventListener('change', e =>
      localStorage.setItem('setting-commentary-speed', e.target.value));
  }

  ['setting-autosim', 'setting-debug', 'setting-sound', 'setting-haptics'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', e =>
      localStorage.setItem(id, e.target.checked));
  });
});