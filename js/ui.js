  
let _history = [];

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) { el.classList.add('active'); _history.push(id); window.scrollTo(0,0); }
  else console.warn('Unknown screen:', id);
}

function goBack() {
  if (_history.length > 1) { _history.pop(); showScreen(_history[_history.length-1]); }
  else showScreen('screen-main-menu');
}

function setProgress(pct, msg) {
  const bar = document.getElementById('progress-bar');
  const lbl = document.getElementById('loading-status');
  if (bar) bar.style.width = pct + '%';
  if (lbl && msg) lbl.textContent = msg;
}

function showOverlay(message, onConfirm) {
  const ov = document.getElementById('global-overlay');
  document.getElementById('overlay-message').textContent = message;
  ov.classList.remove('hidden');
  document.getElementById('overlay-confirm').onclick = () => { ov.classList.add('hidden'); if(onConfirm) onConfirm(); };
  document.getElementById('overlay-cancel').onclick  = () => ov.classList.add('hidden');
}

function openModal(id)  { document.getElementById(id)?.classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }

// ── Badges ────────────────────────────────────────────────────────
function formBadge(form) {
  const m = { Low:'badge-low', Medium:'badge-medium', High:'badge-high', Consistent:'badge-consistent' };
  return `<span class="badge ${m[form]||'badge-medium'}">${form}</span>`;
}
function fatigueBadge(level) {
  const m = { High:['badge-fresh','Fresh'], Average:['badge-average','Average'], Low:['badge-fatigued','Tired'] };
  const [cls,lbl] = m[level] || ['badge-average', level];
  return `<span class="badge ${cls}">${lbl}</span>`;
}
function injuryBadge(status) {
  if (!status || status === 'none') return '—';
  return `<span class="badge badge-injured">🚑 ${status}</span>`;
}

// ── Squad table ───────────────────────────────────────────────────
function renderSquadTable(players) {
  const tbody = document.getElementById('squad-tbody');
  if (!tbody) return;
  tbody.innerHTML = players.map(p => `
    <tr onclick="openPlayerModal('${p.id}')" style="cursor:pointer">
      <td>${p.name}${p.is_youth ? ' <span class="badge badge-consistent">Y</span>':''}</td>
      <td>${p.role}</td><td>${p.age}</td>
      <td><strong>${parseFloat(p.ps).toFixed(1)}</strong></td>
      <td>${formBadge(p.form)}</td>
      <td>${fatigueBadge(p.fatigue_level||'High')}</td>
      <td>${injuryBadge(p.injury_status)}</td>
    </tr>`).join('');
}

function openPlayerModal(playerId) {
  const p = getPlayerById(playerId);
  if (!p) return;
  document.getElementById('modal-player-name').textContent = p.name;
  document.getElementById('modal-stat-grid').innerHTML = `
    <div class="stat-box"><div class="stat-val">${parseFloat(p.bat).toFixed(0)}</div><div class="stat-lbl">BAT</div></div>
    <div class="stat-box"><div class="stat-val">${parseFloat(p.bowl).toFixed(0)}</div><div class="stat-lbl">BWL</div></div>
    <div class="stat-box"><div class="stat-val">${parseFloat(p.field).toFixed(0)}</div><div class="stat-lbl">FLD</div></div>
    <div class="stat-box"><div class="stat-val">${parseFloat(p.wk).toFixed(0)}</div><div class="stat-lbl">WK</div></div>
    <div class="stat-box"><div class="stat-val">${parseFloat(p.ps).toFixed(1)}</div><div class="stat-lbl">PS</div></div>
    <div class="stat-box"><div class="stat-val">${p.age}</div><div class="stat-lbl">Age</div></div>
    <div class="stat-box"><div class="stat-val" style="font-size:1rem">${p.subtype||'—'}</div><div class="stat-lbl">Subtype</div></div>
    <div class="stat-box"><div class="stat-val">${p.contract_yrs}y</div><div class="stat-lbl">Contract</div></div>`;
  openModal('player-modal');
}

// ── Friendly slots ────────────────────────────────────────────────
function renderFriendlySlots(slots) {
  const wrap = document.getElementById('friendly-slots');
  if (!wrap) return;
  wrap.innerHTML = [0,1,2].map(i => {
    const s = slots[i];
    if (s && s.slot_name) return `
      <div class="save-slot" onclick="loadFriendlySlot(${i})">
        <div>
          <div class="save-slot-name">${s.slot_name}</div>
          <div class="save-slot-meta">${s.user_team} vs ${s.opp_team} · ${s.overs}ov · ${s.difficulty}</div>
        </div>
        <button class="save-slot-del" onclick="event.stopPropagation();deleteFriendlySlot(${i})">🗑</button>
      </div>`;
    return `
      <div class="save-slot empty">
        <div class="save-slot-name">— Empty Slot ${i+1} —</div>
        <div class="save-slot-meta">Use New Friendly below</div>
      </div>`;
  }).join('');
}

// ── Populate team dropdowns ───────────────────────────────────────
function populateTeamDropdowns() {
  const teams = getIntlTeams();
  const opts  = teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
  const selA  = document.getElementById('friendly-team-a');
  const selB  = document.getElementById('friendly-team-b');
  if (selA) selA.innerHTML = opts;
  if (selB) selB.innerHTML = opts;
}

// ── League table ──────────────────────────────────────────────────
function renderLeagueTable(teams, userTeamId) {
  const tbody = document.getElementById('league-tbody');
  if (!tbody) return;
  tbody.innerHTML = teams.map((t,i) => {
    let cls = '';
    if (i < 2) cls = 'promoted';
    if (i >= teams.length-2) cls = 'relegation';
    if (t.id === userTeamId) cls += ' user-row';
    return `<tr class="${cls}">
      <td>${i+1}</td><td><strong>${t.name}</strong></td>
      <td>${t.played||0}</td><td>${t.wins||0}</td><td>${t.losses||0}</td>
      <td>${t.ties||0}</td><td><strong>${t.points||0}</strong></td>
      <td>${(t.nrr||0)>=0?'+':''}${(t.nrr||0).toFixed(3)}</td>
    </tr>`;
  }).join('');
}

// ── Reset all data ────────────────────────────────────────────────
function confirmResetAll() {
  showOverlay('Reset ALL game data? This cannot be undone.', () => {
    localStorage.clear(); location.reload();
  });
}

// ── Sort squad ────────────────────────────────────────────────────
function sortSquad(by) {
  const players = getTeamPlayers(window._activeTeamId || '');
  if (by === 'age')  players.sort((a,b) => a.age - b.age);
  if (by === 'role') players.sort((a,b) => a.role.localeCompare(b.role));
  renderSquadTable(players);
  document.querySelectorAll('.squad-controls .btn-tab').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
}

// ── Scorecard tab switch ──────────────────────────────────────────
function switchScorecard(type) {
  document.querySelectorAll('.scorecard-tabs .btn-tab').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  if (window._lastScorecard) renderScorecard(window._lastScorecard, type);
}

function switchRankings(format) {
  document.querySelectorAll('#screen-rankings .btn-option').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
}

// ── Option group auto-toggle ──────────────────────────────────────
document.addEventListener('click', e => {
  if (e.target.classList.contains('btn-option')) {
    const group = e.target.closest('.btn-group');
    if (group) {
      group.querySelectorAll('.btn-option').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
    }
  }
});

// ── New Friendly toggle ───────────────────────────────────────────
document.getElementById('btn-new-friendly')?.addEventListener('click', () => {
  const panel = document.getElementById('friendly-setup-panel');
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) populateTeamDropdowns();
});

// ── Confirm new friendly ──────────────────────────────────────────
document.getElementById('btn-confirm-friendly')?.addEventListener('click', () => {
  const slotName = document.getElementById('friendly-slot-name').value.trim();
  if (!slotName) { alert('Enter a slot name (max 6 chars)'); return; }
  const userTeam   = document.getElementById('friendly-team-a').value;
  const oppTeam    = document.getElementById('friendly-team-b').value;
  const overs      = parseInt(document.getElementById('friendly-overs').value);
  const difficulty = document.querySelector('#friendly-difficulty .btn-option.active')?.dataset.val || 'medium';

  // Find first empty slot
  const slots = getFriendlySlots();
  const empty = slots.find(s => !s.slot_name);
  if (!empty) { alert('All 3 slots are full. Delete one first.'); return; }

  saveFriendlySlot(empty.slot_index, slotName, userTeam, oppTeam, overs, difficulty);
  document.getElementById('friendly-setup-panel').classList.add('hidden');
  renderFriendlySlots(getFriendlySlots());
});