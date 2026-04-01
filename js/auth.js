import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ─── Firebase Init ────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCsmoyzfLBxdACck8jkV245t8AAoDE7GN8",
  authDomain: "ultimate-cricket-manager.firebaseapp.com",
  projectId: "ultimate-cricket-manager",
  storageBucket: "ultimate-cricket-manager.firebasestorage.app",
  messagingSenderId: "939330999487",
  appId: "1:939330999487:web:eeaa137fa6b104e18ea20a"
};

const app      = initializeApp(firebaseConfig);
const auth     = getAuth(app);
const db       = getFirestore(app);
const provider = new GoogleAuthProvider();

// ─── If already logged in → skip to menu ─────────────────────
// Guard flag prevents redirect firing mid-login/register flow
let _redirecting = false;

onAuthStateChanged(auth, user => {
  if (user && !_redirecting) window.location.href = 'menu.html';
});

// ─── Tab Switcher ─────────────────────────────────────────────
window.switchTab = function(tab) {
  document.getElementById('form-login').classList.add('hidden');
  document.getElementById('form-register').classList.add('hidden');
  document.getElementById('form-forgot').classList.add('hidden');

  document.getElementById('tab-login')?.classList.remove('active');
  document.getElementById('tab-register')?.classList.remove('active');

  if (tab === 'login') {
    document.getElementById('form-login').classList.remove('hidden');
    document.getElementById('tab-login').classList.add('active');
  } else if (tab === 'register') {
    document.getElementById('form-register').classList.remove('hidden');
    document.getElementById('tab-register').classList.add('active');
  } else if (tab === 'forgot') {
    document.getElementById('form-forgot').classList.remove('hidden');
  }
};

// ─── Show / Hide Helpers ──────────────────────────────────────
function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.remove('hidden');
}
function hideError(id) {
  const el = document.getElementById(id);
  el.textContent = '';
  el.classList.add('hidden');
}
function showSuccess(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.remove('hidden');
}

// ─── Friendly Firebase Error Messages ────────────────────────
function friendlyError(code) {
  const map = {
    'auth/user-not-found':         'No account found with this email.',
    'auth/wrong-password':         'Incorrect password. Try again.',
    'auth/invalid-email':          'Please enter a valid email address.',
    'auth/email-already-in-use':   'This email is already registered.',
    'auth/weak-password':          'Password must be at least 6 characters.',
    'auth/too-many-requests':      'Too many attempts. Please try later.',
    'auth/popup-closed-by-user':   'Google sign-in was cancelled.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/invalid-credential':     'Invalid email or password.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}

// ─── Loading State ────────────────────────────────────────────
function setLoading(btn, loading) {
  btn.disabled      = loading;
  btn.style.opacity = loading ? '0.7' : '1';
  btn.textContent   = loading ? 'Please wait...' : btn.dataset.label;
}

// ─── Save User Profile to Firestore ──────────────────────────
async function saveUserProfile(user, username = null) {
  const ref  = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid:       user.uid,
      email:     user.email,
      username:  username || user.displayName || 'Manager',
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    });
  } else {
    await setDoc(ref, { lastLogin: serverTimestamp() }, { merge: true });
  }
}

// ─── LOGIN ────────────────────────────────────────────────────
window.doLogin = async function() {
  hideError('login-error');
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn      = document.querySelector('#form-login .btn-primary');

  if (!email || !password) {
    showError('login-error', 'Please fill in all fields.');
    return;
  }

  btn.dataset.label = btn.textContent;
  setLoading(btn, true);
  _redirecting = true;

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await saveUserProfile(cred.user);
    window.location.href = 'menu.html';
  } catch (e) {
    _redirecting = false;
    showError('login-error', friendlyError(e.code));
    setLoading(btn, false);
  }
};

// ─── REGISTER ─────────────────────────────────────────────────
window.doRegister = async function() {
  hideError('reg-error');
  const username = document.getElementById('reg-username').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const btn      = document.querySelector('#form-register .btn-primary');

  if (!username || !email || !password) {
    showError('reg-error', 'Please fill in all fields.');
    return;
  }
  if (username.length < 3) {
    showError('reg-error', 'Username must be at least 3 characters.');
    return;
  }
  if (password.length < 6) {
    showError('reg-error', 'Password must be at least 6 characters.');
    return;
  }

  btn.dataset.label = btn.textContent;
  setLoading(btn, true);
  _redirecting = true;

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: username });
    await saveUserProfile(cred.user, username);
    window.location.href = 'menu.html';
  } catch (e) {
    _redirecting = false;
    showError('reg-error', friendlyError(e.code));
    setLoading(btn, false);
  }
};

// ─── GOOGLE SIGN-IN ───────────────────────────────────────────
window.doGoogle = async function() {
  _redirecting = true;
  try {
    const cred = await signInWithPopup(auth, provider);
    await saveUserProfile(cred.user);
    window.location.href = 'menu.html';
  } catch (e) {
    _redirecting = false;
    const activeForm = document.querySelector('.auth-form:not(.hidden)');
    const errorEl    = activeForm?.querySelector('.auth-error');
    if (errorEl) {
      errorEl.textContent = friendlyError(e.code);
      errorEl.classList.remove('hidden');
    }
  }
};

// ─── FORGOT PASSWORD ──────────────────────────────────────────
window.doForgot = async function() {
  hideError('forgot-error');
  document.getElementById('forgot-success').classList.add('hidden');

  const email = document.getElementById('forgot-email').value.trim();
  const btn   = document.querySelector('#form-forgot .btn-primary');

  if (!email) {
    showError('forgot-error', 'Please enter your email address.');
    return;
  }

  btn.dataset.label = btn.textContent;
  setLoading(btn, true);

  try {
    await sendPasswordResetEmail(auth, email);
    showSuccess('forgot-success', '✅ Reset link sent! Check your inbox.');
    document.getElementById('forgot-email').value = '';
    setLoading(btn, false);
    btn.textContent = 'Send Reset Link';
  } catch (e) {
    showError('forgot-error', friendlyError(e.code));
    setLoading(btn, false);
  }
};