function _uid()         { return window._ucmUID || 'guest'; }
function _key(name)     { return `UCM_${_uid()}_${name}`; }
function _slotKey(slot) { return `UCM_${_uid()}_slot_${slot}`; }
function _autoKey()     { return `UCM_${_uid()}_autosave`; }
function _sessionKey()  { return `UCM_${_uid()}_session`; }

function saveGame(slot) {
  const data = DB.export();
  const b64  = uint8ArrayToBase64(data);

  localStorage.setItem(_slotKey(slot), JSON.stringify({
    b64,
    checksum: simpleChecksum(data),
    savedAt: new Date().toISOString(),
    uid: _uid()
  }));
}

async function loadGame(slot) {
  const raw = localStorage.getItem(_slotKey(slot));
  if (!raw) {
    alert('No save found in slot ' + slot);
    return false;
  }

  const meta  = JSON.parse(raw);
  const bytes = base64ToUint8Array(meta.b64);

  if (simpleChecksum(bytes) !== meta.checksum) {
    alert('⚠️ Save corrupted. Trying auto-save...');
    return loadLastAutoSave();
  }

  const SQL = await initSqlJs({ locateFile: f => `lib/${f}` });
  DB = new SQL.Database(bytes);
  return true;
}

function deleteSaveSlot(slot) {
  localStorage.removeItem(_slotKey(slot));
}

function getSaveSlotMeta(slot) {
  const raw = localStorage.getItem(_slotKey(slot));
  if (!raw) return null;

  try {
    const m = JSON.parse(raw);
    return { savedAt: m.savedAt, uid: m.uid };
  } catch {
    return null;
  }
}

function autoSave() {
  const data = DB.export();
  localStorage.setItem(_autoKey(), JSON.stringify({
    b64: uint8ArrayToBase64(data),
    checksum: simpleChecksum(data),
    savedAt: new Date().toISOString(),
    uid: _uid()
  }));

  persistSession();
}

async function loadLastAutoSave() {
  const raw = localStorage.getItem(_autoKey());
  if (!raw) return false;

  const meta  = JSON.parse(raw);
  const bytes = base64ToUint8Array(meta.b64);
  const SQL   = await initSqlJs({ locateFile: f => `lib/${f}` });
  DB = new SQL.Database(bytes);
  return true;
}

function persistSession() {
  const data = DB.export();
  localStorage.setItem(_sessionKey(), uint8ArrayToBase64(data));
}

async function restoreSession() {
  const b64 = localStorage.getItem(_sessionKey());
  if (!b64) return false;

  try {
    const SQL   = await initSqlJs({ locateFile: f => `lib/${f}` });
    const bytes = base64ToUint8Array(b64);
    DB = new SQL.Database(bytes);
    return true;
  } catch (e) {
    console.warn('Session restore failed:', e);
    return false;
  }
}

function wipeAllUserData(uid) {
  const target = uid || _uid();
  const prefix = `UCM_${target}_`;

  Object.keys(localStorage)
    .filter(k => k.startsWith(prefix))
    .forEach(k => localStorage.removeItem(k));
}

function getFriendlySlots() {
  return dbAll('SELECT * FROM FriendlySlots ORDER BY slot_index') || [];
}

function saveFriendlySlot(index, slotName, userTeam, oppTeam, overs, difficulty, matchState) {
  dbRun(
    `UPDATE FriendlySlots
     SET slot_name=?, user_team=?, opp_team=?, overs=?, difficulty=?, match_state=?
     WHERE slot_index=?`,
    [slotName, userTeam, oppTeam, overs, difficulty, JSON.stringify(matchState || {}), index]
  );

  persistSession();

  if (typeof window.renderSlots === 'function') {
    window.renderSlots();
  }
}

function deleteFriendlySlot(index) {
  dbRun(
    `UPDATE FriendlySlots
     SET slot_name='', user_team='', opp_team='', overs=20, difficulty='medium', match_state='{}'
     WHERE slot_index=?`,
    [index]
  );

  persistSession();

  if (typeof window.renderSlots === 'function') {
    window.renderSlots();
  }
}

function loadFriendlySlot(index) {
  const slot = dbGet('SELECT * FROM FriendlySlots WHERE slot_index=?', [index]);
  if (!slot || !slot.slot_name) return;
  showScreen('screen-match');
}

function simpleChecksum(arr) {
  let s = 0;
  for (let i = 0; i < arr.length; i++) s = (s + arr[i]) & 0xffffffff;
  return s.toString(16);
}