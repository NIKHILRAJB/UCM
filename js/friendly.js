import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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

function waitForAuthUser() {
  return new Promise(resolve => {
    const unsub = onAuthStateChanged(auth, user => {
      if (!user) {
        window.location.href = 'auth.html';
        resolve(null);
        unsub();
        return;
      }
      window._ucmUID = user.uid;
      resolve(user);
      unsub();
    });
  });
}

let _allTeams  = [];
let _deleteIdx = null;

const wiz = { step:1, userTeam:null, oppTeam:null, overs:null, diff:null };

window.addEventListener('DOMContentLoaded', async () => {
  const user = await waitForAuthUser();
  if (!user) return;

  await initDB();
  _allTeams = loadAllTeams();
  renderSlots();

  $('btn-open-settings').addEventListener('click', openSettings);
  $('btn-close-settings').addEventListener('click', closeSettings);
  $('btn-settings-close2').addEventListener('click', closeSettings);
  $('scrim-settings').addEventListener('click', closeSettings);

  $('btn-del-cancel').addEventListener('click', cancelDelete);
  $('btn-del-confirm').addEventListener('click', doDelete);
  $('scrim-delete').addEventListener('click', cancelDelete);

  $('btn-new-match').addEventListener('click', openWizard);
  $('btn-wizard-close').addEventListener('click', closeWizard);
  $('scrim-wizard').addEventListener('click', closeWizard);
  $('btn-wizard-back').addEventListener('click', wizBack);
  $('btn-wizard-ok').addEventListener('click', wizNext);
});

function renderSlots() {
  const wrap  = $('fm-slots-wrap');
  const bar   = $('fm-bottom-bar');
  const slots = getSlots();
  wrap.replaceChildren();
  let hasEmpty = false;

  for (let i = 0; i < 3; i++) {
    const s    = slots[i];
    const card = document.createElement('div');

    if (s.slot_name) {
      card.className = 'fm-card-filled';
      card.addEventListener('click', () => resumeSlot(i));

      const diffDot = { easy:'🟢', medium:'🟡', hard:'🔴' }[s.difficulty] || '🟡';
      const diffCls = 'fm-card-diff-' + (s.difficulty || 'medium');
      const overTx  = Number(s.overs) > 0 ? `T20 · ${s.overs} ov` : 'Test';

      const info = el('div','fm-card-info',`
        <div class="fm-card-match-id">${x(s.slot_name)}</div>
        <div class="fm-card-teams">${x(teamName(s.user_team))} vs ${x(teamName(s.opp_team))}</div>
        <div class="fm-card-sub">
          <span>${x(overTx)}</span>
          <span class="${diffCls}">${diffDot} ${x(capitalize(s.difficulty))}</span>
        </div>`);

      const btn = el('button','fm-resume-btn','Resume →');
      btn.addEventListener('click', e => {
        e.stopPropagation();
        resumeSlot(i);
      });

      card.appendChild(info);
      card.appendChild(btn);
    } else {
      hasEmpty = true;
      card.className = 'fm-card-empty';
      card.innerHTML = `<span class="fm-empty-plus">＋</span><span>Start New Match</span>`;
      card.addEventListener('click', openWizard);
    }

    wrap.appendChild(card);
  }

  bar.classList.toggle('hidden', !hasEmpty);
}

function openSettings() {
  renderSettingsList();
  show('scrim-settings');
  show('fm-settings-sheet');
}

function closeSettings() {
  hide('scrim-settings');
  hide('fm-settings-sheet');
}

function renderSettingsList() {
  const list  = $('fm-settings-list');
  const slots = getSlots();
  list.replaceChildren();

  for (let i = 0; i < 3; i++) {
    const s   = slots[i];
    const row = document.createElement('div');
    row.className = 'fm-settings-row';

    if (s.slot_name) {
      const overTx = Number(s.overs) > 0 ? `${s.overs} Overs` : 'Test';
      const info = el('div','',`
        <div class="fm-slot-label">Slot ${i+1}</div>
        <div class="fm-slot-name">${x(s.slot_name)}</div>
        <div class="fm-slot-meta">${x(teamName(s.user_team))} vs ${x(teamName(s.opp_team))} · ${x(overTx)}</div>`);

      const delBtn = el('button','fm-del-row-btn','🗑 Delete');
      delBtn.addEventListener('click', () => askDelete(i, s.slot_name));

      row.appendChild(info);
      row.appendChild(delBtn);
    } else {
      row.innerHTML = `<div><div class="fm-slot-label">Slot ${i+1}</div><div class="fm-slot-empty-txt">— Empty —</div></div>`;
    }

    list.appendChild(row);
  }
}

function askDelete(idx, name) {
  _deleteIdx = idx;
  $('fm-del-name').textContent = name;
  show('scrim-delete');
  show('fm-del-popup');
}

function cancelDelete() {
  _deleteIdx = null;
  hide('scrim-delete');
  hide('fm-del-popup');
}

function doDelete() {
  if (_deleteIdx === null) return;
  deleteFriendlySlot(_deleteIdx);
  cancelDelete();
  closeSettings();
  renderSlots();
}

function openWizard() {
  const slots = getSlots();
  if ([0,1,2].every(i => !!slots[i].slot_name)) {
    alert('All 3 slots are full.\nOpen ⚙️ Settings to delete one first.');
    return;
  }

  wiz.step = 1;
  wiz.userTeam = null;
  wiz.oppTeam = null;
  wiz.overs = null;
  wiz.diff = null;

  show('scrim-wizard');
  show('fm-wizard');
  renderWizStep();
}

function closeWizard() {
  hide('scrim-wizard');
  hide('fm-wizard');
  clearWizErr();
}

function wizBack() {
  if (wiz.step <= 1) {
    closeWizard();
    return;
  }
  wiz.step--;
  renderWizStep();
}

function wizNext() {
  clearWizErr();

  switch (wiz.step) {
    case 1:
      if (!wiz.userTeam) { wizErr('Please select your team.'); return; }
      wiz.step = 2;
      break;
    case 2:
      if (!wiz.oppTeam) { wizErr('Please select an opponent.'); return; }
      wiz.step = 3;
      break;
    case 3:
      if (!wiz.overs) { wizErr('Please select overs.'); return; }
      wiz.step = 4;
      break;
    case 4:
      if (!wiz.diff) { wizErr('Please select difficulty.'); return; }
      wiz.step = 5;
      break;
    case 5:
      commitMatch();
      return;
  }

  renderWizStep();
}

function renderWizStep() {
  clearWizErr();

  $('wizard-step-lbl').textContent = `Step ${wiz.step} of 5`;
  $('btn-wizard-back').classList.toggle('hidden', wiz.step === 1);

  const titles = ['', 'Select Your Team', 'Select Opponent', 'Select Overs', 'Select Difficulty', 'Match Summary'];
  $('wizard-title').textContent = titles[wiz.step];
  $('btn-wizard-ok').textContent = wiz.step === 5 ? '🏏 Start Match →' : 'OK →';

  ['panel-teams','panel-overs','panel-diff','panel-confirm'].forEach(id => hide(id));

  if (wiz.step <= 2) {
    show('panel-teams');
    buildTeamGrid();
  } else if (wiz.step === 3) {
    show('panel-overs');
    syncOversGrid();
  } else if (wiz.step === 4) {
    show('panel-diff');
    syncDiffList();
  } else {
    show('panel-confirm');
    buildConfirmPanel();
  }
}

function buildTeamGrid() {
  const grid = $('fm-team-grid');
  grid.replaceChildren();

  _allTeams.forEach(t => {
    const tile = document.createElement('div');
    tile.className = 'fm-team-tile';

    if (wiz.step === 2 && t.id === wiz.userTeam) tile.classList.add('disabled');
    if ((wiz.step === 1 && t.id === wiz.userTeam) || (wiz.step === 2 && t.id === wiz.oppTeam)) tile.classList.add('selected');

    tile.innerHTML = `<span class="fm-team-flag">${t.flag || '🏏'}</span><span class="fm-team-code">${x(t.code)}</span>`;

    tile.addEventListener('click', () => {
      grid.querySelectorAll('.fm-team-tile').forEach(c => c.classList.remove('selected'));
      tile.classList.add('selected');

      if (wiz.step === 1) wiz.userTeam = t.id;
      else wiz.oppTeam = t.id;

      $('team-selected-bar').textContent = `${t.flag || '🏏'} ${t.name} ✅`;
    });

    grid.appendChild(tile);
  });

  const cur = wiz.step === 1 ? wiz.userTeam : wiz.oppTeam;
  const t   = _allTeams.find(t => t.id === cur);
  $('team-selected-bar').textContent = t ? `${t.flag || '🏏'} ${t.name} ✅` : 'Tap a team to select';
}

function syncOversGrid() {
  $('fm-overs-grid').querySelectorAll('.fm-overs-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.val === String(wiz.overs));
    btn.onclick = () => {
      $('fm-overs-grid').querySelectorAll('.fm-overs-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      wiz.overs = btn.dataset.val;
      $('overs-selected-bar').textContent = `${btn.dataset.val} overs selected ✅`;
    };
  });

  $('overs-selected-bar').textContent = wiz.overs ? `${wiz.overs} overs selected ✅` : 'Tap to select overs';
}

function syncDiffList() {
  $('fm-diff-list').querySelectorAll('.fm-diff-row').forEach(row => {
    const sel = row.dataset.val === wiz.diff;
    row.classList.toggle('selected', sel);
    row.querySelector('.fm-diff-check').classList.toggle('hidden', !sel);

    row.onclick = () => {
      $('fm-diff-list').querySelectorAll('.fm-diff-row').forEach(r => {
        r.classList.remove('selected');
        r.querySelector('.fm-diff-check').classList.add('hidden');
      });

      row.classList.add('selected');
      row.querySelector('.fm-diff-check').classList.remove('hidden');
      wiz.diff = row.dataset.val;
    };
  });
}

function buildConfirmPanel() {
  const ta = _allTeams.find(t => t.id === wiz.userTeam);
  const tb = _allTeams.find(t => t.id === wiz.oppTeam);
  const diffLabel = {easy:'🟢 Easy', medium:'🟡 Medium', hard:'🔴 Hard'}[wiz.diff];
  const matchId   = makeMatchId(wiz.userTeam, wiz.oppTeam, wiz.overs);

  $('cf-team-a').innerHTML = `<span class="fm-confirm-flag">${ta?.flag || '🏏'}</span>${x(ta?.name || wiz.userTeam)}`;
  $('cf-team-b').innerHTML = `<span class="fm-confirm-flag">${tb?.flag || '🏏'}</span>${x(tb?.name || wiz.oppTeam)}`;
  $('cf-overs-fmt').textContent = `T20 · ${wiz.overs} Overs`;
  $('cf-diff').textContent = `${diffLabel} Difficulty`;
  $('cf-match-id').textContent = matchId;
}

function commitMatch() {
  const slots = getSlots();
  let emptyIdx = -1;

  for (let i = 0; i < 3; i++) {
    if (!slots[i].slot_name) {
      emptyIdx = i;
      break;
    }
  }

  if (emptyIdx === -1) {
    wizErr('All 3 slots are full.');
    return;
  }

  const matchId = makeMatchId(wiz.userTeam, wiz.oppTeam, wiz.overs);
  saveFriendlySlot(emptyIdx, matchId, wiz.userTeam, wiz.oppTeam, parseInt(wiz.overs, 10), wiz.diff, {});
  closeWizard();
  renderSlots();
}

function resumeSlot(i) {
  const s = getSlots()[i];
  if (!s || !s.slot_name) {
    openWizard();
    return;
  }

  alert(`▶ Resume coming in Phase 2!\n\n${s.slot_name}\n${teamName(s.user_team)} vs ${teamName(s.opp_team)}`);
}

function getSlots() {
  const raw = getFriendlySlots() || [];
  const map = {0: emptyRow(0), 1: emptyRow(1), 2: emptyRow(2)};

  raw.forEach(r => {
    const i = Number(r.slot_index);
    if (i >= 0 && i <= 2) map[i] = { ...emptyRow(i), ...r, slot_index: i };
  });

  return map;
}

function emptyRow(i) {
  return { slot_index: i, slot_name: '', user_team: '', opp_team: '', overs: 20, difficulty: 'medium', match_state: '{}' };
}

function loadAllTeams() {
  const rows = getIntlTeams() || [];
  return rows.map(r => ({ ...r, code: teamCode(r.id), flag: r.flag || flagFromId(r.id) }));
}

function teamName(tid) {
  if (!tid) return '—';
  const t = _allTeams.find(t => t.id === tid);
  if (t) return t.name;
  const row = dbGet('SELECT name FROM Teams WHERE id=?', [tid]);
  return row ? row.name : tid;
}

function teamCode(id) {
  return id ? id.replace(/^t_/, '').toUpperCase() : '?';
}

function flagFromId(id) {
  const m = {
    t_ind:'🇮🇳', t_aus:'🇦🇺', t_eng:'🏴', t_pak:'🇵🇰', t_sa:'🇿🇦', t_nz:'🇳🇿',
    t_wi:'🏏', t_sl:'🇱🇰', t_ban:'🇧🇩', t_afg:'🇦🇫', t_zim:'🇿🇼', t_ire:'🇮🇪',
    t_sco:'🏴', t_ned:'🇳🇱', t_uae:'🇦🇪', t_nep:'🇳🇵', t_usa:'🇺🇸',
    t_can:'🇨🇦', t_png:'🇵🇬', t_nam:'🇳🇦'
  };
  return m[id] || '🏏';
}

function makeMatchId(teamA, teamB, overs) {
  const ca = teamCode(teamA), cb = teamCode(teamB);
  const fmt = Number(overs) >= 40 ? 'ODI' : Number(overs) === 0 ? 'TEST' : 'T20';
  const pfx = `${ca}-${cb}-${fmt}`;
  const all = getFriendlySlots() || [];
  const cnt = all.filter(s => s.slot_name && s.slot_name.startsWith(pfx)).length;
  return `${pfx}-${String(cnt + 1).padStart(3,'0')}`;
}

const $ = id => document.getElementById(id);
const show = id => $(id)?.classList.remove('hidden');
const hide = id => $(id)?.classList.add('hidden');
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  e.innerHTML = html;
  return e;
};
const x = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const capitalize = s => s ? s[0].toUpperCase() + s.slice(1) : '';
const wizErr = msg => {
  const e = $('fm-wizard-err');
  if (!e) return;
  e.textContent = msg;
  e.classList.remove('hidden');
};
const clearWizErr = () => $('fm-wizard-err')?.classList.add('hidden');