let DB = null;

async function initDB() {
  const SQL = await initSqlJs({ locateFile: file => `lib/${file}` });

  const saved = localStorage.getItem('ucm_db_session');
  if (saved) {
    try {
      const buf = base64ToUint8Array(saved);
      DB = new SQL.Database(buf);
      console.log('DB: Restored from session.');
      return;
    } catch (e) {
      console.warn('DB: Session restore failed, starting fresh.', e);
    }
  }

  DB = new SQL.Database();
  createSchema();
  loadSeedData();
  console.log('DB: Fresh database created.');
}

function createSchema() {
  DB.run(`
    CREATE TABLE IF NOT EXISTS Teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      country TEXT,
      type TEXT CHECK(type IN ('international','club')),
      division INTEGER DEFAULT 0,
      gt_tier INTEGER DEFAULT 0,
      balance REAL DEFAULT 0,
      fanbase INTEGER DEFAULT 100000,
      reputation INTEGER DEFAULT 50
    );
    CREATE TABLE IF NOT EXISTS Players (
      id TEXT PRIMARY KEY,
      team_id TEXT REFERENCES Teams(id),
      name TEXT NOT NULL,
      nationality TEXT,
      age INTEGER,
      role TEXT,
      subtype TEXT,
      bat REAL DEFAULT 0,
      bowl REAL DEFAULT 0,
      field REAL DEFAULT 0,
      wk REAL DEFAULT 0,
      ps REAL DEFAULT 0,
      form TEXT DEFAULT 'Medium',
      fatigue INTEGER DEFAULT 0,
      fatigue_level TEXT DEFAULT 'High',
      injury_status TEXT DEFAULT 'none',
      injury_return INTEGER DEFAULT 0,
      contract_yrs INTEGER DEFAULT 2,
      wage REAL DEFAULT 50000,
      is_youth INTEGER DEFAULT 0,
      is_overseas INTEGER DEFAULT 0,
      is_talent INTEGER DEFAULT 0,
      career_stats TEXT DEFAULT '{}'
    );
    CREATE TABLE IF NOT EXISTS Fixtures (
      id TEXT PRIMARY KEY,
      home_id TEXT REFERENCES Teams(id),
      away_id TEXT REFERENCES Teams(id),
      season INTEGER,
      date_slot INTEGER,
      format TEXT,
      type TEXT,
      venue_id TEXT REFERENCES Venues(id),
      status TEXT DEFAULT 'scheduled',
      home_score INTEGER DEFAULT 0,
      away_score INTEGER DEFAULT 0,
      result TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS SeasonPoints (
      team_id TEXT REFERENCES Teams(id),
      season INTEGER,
      format TEXT,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      ties INTEGER DEFAULT 0,
      points INTEGER DEFAULT 0,
      nrr REAL DEFAULT 0.0,
      PRIMARY KEY(team_id, season, format)
    );
    CREATE TABLE IF NOT EXISTS Rankings (
      team_id TEXT REFERENCES Teams(id),
      season INTEGER,
      format TEXT,
      rank_pts REAL DEFAULT 0,
      position INTEGER DEFAULT 0,
      PRIMARY KEY(team_id, season, format)
    );
    CREATE TABLE IF NOT EXISTS Venues (
      id TEXT PRIMARY KEY,
      name TEXT,
      country TEXT,
      capacity INTEGER,
      pitch_type TEXT
    );
    CREATE TABLE IF NOT EXISTS FriendlySlots (
      slot_index INTEGER PRIMARY KEY,
      slot_name TEXT DEFAULT '',
      user_team TEXT DEFAULT '',
      opp_team TEXT DEFAULT '',
      overs INTEGER DEFAULT 20,
      difficulty TEXT DEFAULT 'medium',
      match_state TEXT DEFAULT '{}'
    );
    CREATE TABLE IF NOT EXISTS FieldPresets (
      id TEXT PRIMARY KEY,
      team_id TEXT,
      name TEXT,
      p_dot_mod REAL DEFAULT 0,
      boundary_mod REAL DEFAULT 0
    );
  `);

  DB.run(`CREATE INDEX IF NOT EXISTS idx_players_team    ON Players(team_id);`);
  DB.run(`CREATE INDEX IF NOT EXISTS idx_fixtures_season ON Fixtures(season, date_slot);`);
  DB.run(`CREATE INDEX IF NOT EXISTS idx_points_season   ON SeasonPoints(season, format, points);`);
  DB.run(`CREATE INDEX IF NOT EXISTS idx_rankings_format ON Rankings(format, season, position);`);
  DB.run(`INSERT OR IGNORE INTO FriendlySlots(slot_index) VALUES(0),(1),(2);`);

  console.log('DB: Schema created.');
}

function dbRun(sql, params = []) { DB.run(sql, params); }

function dbAll(sql, params = []) {
  const stmt = DB.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function dbGet(sql, params = []) { return dbAll(sql, params)[0] || null; }

function getPlayerById(id)    { return dbGet('SELECT * FROM Players WHERE id=?', [id]); }
function getTeamPlayers(tid)  { return dbAll('SELECT * FROM Players WHERE team_id=? ORDER BY ps DESC', [tid]); }
function getAllTeams()         { return dbAll('SELECT * FROM Teams ORDER BY name'); }
function getIntlTeams()       { return dbAll("SELECT * FROM Teams WHERE type='international' ORDER BY name"); }

function persistSession() {
  const data = DB.export();
  localStorage.setItem('ucm_db_session', uint8ArrayToBase64(data));
}

function uint8ArrayToBase64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToUint8Array(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// ── Boot sequence ─────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  showScreen('screen-loading');

  setProgress(0, 'Loading...');
  await delay(400);

  setProgress(15, 'Loading...');
  await delay(500);

  setProgress(30, 'Loading libraries...');
  await initDB();
  await delay(600);

  setProgress(50, 'Loading...');
  await delay(700);

  setProgress(70, 'Loading game data...');
  await delay(600);

  setProgress(85, 'Loading...');
  await delay(500);

  setProgress(100, 'READY! ');
  await delay(800);

  const btn = document.getElementById('btn-start');
  btn.classList.remove('hidden');
  btn.addEventListener('click', () => {
    showScreen('screen-main-menu');
    renderFriendlySlots(getFriendlySlots());
  });
});

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }