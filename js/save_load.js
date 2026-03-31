  
function saveGame(slot) {
  const data = DB.export();
  const b64  = uint8ArrayToBase64(data);
  localStorage.setItem(`ucm_save_slot_${slot}`, JSON.stringify({
    b64,
    checksum: simpleChecksum(data),
    savedAt: new Date().toISOString()
  }));
  console.log(`Save: slot ${slot} written.`);
}

async function loadGame(slot) {
  const raw = localStorage.getItem(`ucm_save_slot_${slot}`);
  if (!raw) { alert('No save in slot ' + slot); return false; }
  const meta  = JSON.parse(raw);
  const bytes = base64ToUint8Array(meta.b64);
  if (simpleChecksum(bytes) !== meta.checksum) {
    alert('⚠️ Save corrupted. Loading auto-save...');
    return loadLastAutoSave();
  }
  const SQL = await initSqlJs({ locateFile: f => `lib/${f}` });
  DB = new SQL.Database(bytes);
  return true;
}

function autoSave() {
  const data = DB.export();
  localStorage.setItem('ucm_autosave', JSON.stringify({
    b64: uint8ArrayToBase64(data),
    checksum: simpleChecksum(data),
    savedAt: new Date().toISOString()
  }));
  persistSession();
  console.log('Auto-save done.');
}

async function loadLastAutoSave() {
  const raw = localStorage.getItem('ucm_autosave');
  if (!raw) return false;
  const meta  = JSON.parse(raw);
  const bytes = base64ToUint8Array(meta.b64);
  const SQL   = await initSqlJs({ locateFile: f => `lib/${f}` });
  DB = new SQL.Database(bytes);
  return true;
}

function simpleChecksum(arr) {
  let s = 0;
  for (let i = 0; i < arr.length; i++) s = (s + arr[i]) & 0xffffffff;
  return s.toString(16);
}

function getFriendlySlots() {
  return dbAll('SELECT * FROM FriendlySlots ORDER BY slot_index');
}

function saveFriendlySlot(index, slotName, userTeam, oppTeam, overs, difficulty, matchState = {}) {
  dbRun(`INSERT OR REPLACE INTO FriendlySlots
    (slot_index,slot_name,user_team,opp_team,overs,difficulty,match_state)
    VALUES(?,?,?,?,?,?,?)`,
    [index, slotName, userTeam, oppTeam, overs, difficulty, JSON.stringify(matchState)]);
  persistSession();
}

function deleteFriendlySlot(index) {
  dbRun(`UPDATE FriendlySlots SET slot_name='',user_team='',opp_team='',
    overs=20,difficulty='medium',match_state='{}' WHERE slot_index=?`, [index]);
  persistSession();
  renderFriendlySlots(getFriendlySlots());
}

function loadFriendlySlot(index) {
  const slot = dbGet('SELECT * FROM FriendlySlots WHERE slot_index=?', [index]);
  if (!slot || !slot.slot_name) return;
  console.log('Loaded friendly slot:', slot);
  // Phase 2 will wire match engine here
  showScreen('screen-match');
}