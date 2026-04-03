// ─── sql-wasm DB ───────────────────────────────────────────────
let DB = null;

async function initDB() {
  const SQL = await initSqlJs({ locateFile: f => `lib/${f}` });

  const uid        = window._ucmUID || 'guest';
  const sessionKey = `UCM_${uid}_session`;
  const sessionB64 = localStorage.getItem(sessionKey);

  if (sessionB64) {
    try {
      const bytes = base64ToUint8Array(sessionB64);
      DB = new SQL.Database(bytes);
      console.log('DB: Session restored ✅');
      _migrateSchema(); // ← safe migration for restored sessions
      return;
    } catch (e) {
      console.warn('DB: Session restore failed, creating fresh DB:', e);
    }
  }

  DB = new SQL.Database();
  createSchema();

  if (typeof loadSeedData === 'function') {
    loadSeedData();
    console.log('DB: Seeded ✅');
  } else {
    console.error('DB: loadSeedData not found — check script order in HTML');
  }

  const data = DB.export();
  localStorage.setItem(sessionKey, uint8ArrayToBase64(data));
  console.log('DB: Fresh DB persisted ✅');
}

// ─── Safe migration: adds missing columns to existing sessions ──
function _migrateSchema() {
  const migrations = [
    // Teams
    { table: 'Teams',   col: 'flag',        sql: "ALTER TABLE Teams   ADD COLUMN flag        TEXT DEFAULT '🏏'" },
    // Players
    { table: 'Players', col: 'batting',      sql: "ALTER TABLE Players ADD COLUMN batting     REAL DEFAULT 0"    },
    { table: 'Players', col: 'bowling',      sql: "ALTER TABLE Players ADD COLUMN bowling     REAL DEFAULT 0"    },
    { table: 'Players', col: 'fielding',     sql: "ALTER TABLE Players ADD COLUMN fielding    REAL DEFAULT 0"    },
    { table: 'Players', col: 'wicket',       sql: "ALTER TABLE Players ADD COLUMN wicket      REAL DEFAULT 0"    },
    { table: 'Players', col: 'bat_pos',      sql: "ALTER TABLE Players ADD COLUMN bat_pos     TEXT DEFAULT ''"   },
    { table: 'Players', col: 'bat_hand',     sql: "ALTER TABLE Players ADD COLUMN bat_hand    TEXT DEFAULT ''"   },
    { table: 'Players', col: 'bowl_type',    sql: "ALTER TABLE Players ADD COLUMN bowl_type   TEXT DEFAULT ''"   },
    { table: 'Players', col: 'bowl_phase',   sql: "ALTER TABLE Players ADD COLUMN bowl_phase  TEXT DEFAULT ''"   },
    { table: 'Players', col: 'bio',          sql: "ALTER TABLE Players ADD COLUMN bio         TEXT DEFAULT ''"   },
    // Venues
    { table: 'Venues',  col: 'team_id',      sql: "ALTER TABLE Venues  ADD COLUMN team_id     TEXT DEFAULT NULL" },
  ];

  migrations.forEach(({ table, col, sql }) => {
    try {
      // Check if column already exists via PRAGMA
      const cols = dbAll(`PRAGMA table_info(${table})`);
      const exists = cols.some(c => c.name === col);
      if (!exists) {
        DB.run(sql);
        console.log(`DB: Migrated ${table}.${col} ✅`);
      }
    } catch (e) {
      console.warn(`DB: Migration skipped ${table}.${col}:`, e.message);
    }
  });

  // Copy old column values to new columns for Players if old names exist
  try {
    const cols = dbAll('PRAGMA table_info(Players)').map(c => c.name);
    if (cols.includes('bat')   && cols.includes('batting'))  DB.run('UPDATE Players SET batting  = bat   WHERE batting  = 0 AND bat   > 0');
    if (cols.includes('bowl')  && cols.includes('bowling'))  DB.run('UPDATE Players SET bowling  = bowl  WHERE bowling  = 0 AND bowl  > 0');
    if (cols.includes('field') && cols.includes('fielding')) DB.run('UPDATE Players SET fielding = field WHERE fielding = 0 AND field > 0');
    if (cols.includes('wk')    && cols.includes('wicket'))   DB.run('UPDATE Players SET wicket   = wk    WHERE wicket   = 0 AND wk    > 0');
  } catch(e) {
    console.warn('DB: Column copy skipped:', e.message);
  }

  persistSession();
  console.log('DB: Migration complete ✅');
}

function createSchema() {
  DB.run(`
    CREATE TABLE IF NOT EXISTS Teams (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      country     TEXT,
      type        TEXT CHECK(type IN ('international','club')),
      division    INTEGER DEFAULT 0,
      gt_tier     INTEGER DEFAULT 0,
      balance     REAL    DEFAULT 0,
      fanbase     INTEGER DEFAULT 100000,
      reputation  INTEGER DEFAULT 50,
      flag        TEXT    DEFAULT '🏏'
    );

    CREATE TABLE IF NOT EXISTS Players (
      id              TEXT PRIMARY KEY,
      team_id         TEXT REFERENCES Teams(id),
      name            TEXT NOT NULL,
      nationality     TEXT,
      age             INTEGER,
      role            TEXT,
      subtype         TEXT,
      batting         REAL    DEFAULT 0,
      bowling         REAL    DEFAULT 0,
      fielding        REAL    DEFAULT 0,
      wicket          REAL    DEFAULT 0,
      ps              REAL    DEFAULT 0,
      bat_pos         TEXT    DEFAULT '',
      bat_hand        TEXT    DEFAULT '',
      bowl_type       TEXT    DEFAULT '',
      bowl_phase      TEXT    DEFAULT '',
      bio             TEXT    DEFAULT '',
      form            TEXT    DEFAULT 'Medium',
      fatigue         INTEGER DEFAULT 0,
      fatigue_level   TEXT    DEFAULT 'High',
      injury_status   TEXT    DEFAULT 'none',
      injury_return   INTEGER DEFAULT 0,
      contract_yrs    INTEGER DEFAULT 2,
      wage            REAL    DEFAULT 50000,
      is_youth        INTEGER DEFAULT 0,
      is_overseas     INTEGER DEFAULT 0,
      is_talent       INTEGER DEFAULT 0,
      career_stats    TEXT    DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS Fixtures (
      id          TEXT PRIMARY KEY,
      home_id     TEXT REFERENCES Teams(id),
      away_id     TEXT REFERENCES Teams(id),
      season      INTEGER,
      date_slot   INTEGER,
      format      TEXT,
      type        TEXT,
      venue_id    TEXT REFERENCES Venues(id),
      status      TEXT DEFAULT 'scheduled',
      home_score  INTEGER DEFAULT 0,
      away_score  INTEGER DEFAULT 0,
      result      TEXT    DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS SeasonPoints (
      team_id TEXT REFERENCES Teams(id),
      season  INTEGER,
      format  TEXT,
      wins    INTEGER DEFAULT 0,
      losses  INTEGER DEFAULT 0,
      ties    INTEGER DEFAULT 0,
      points  INTEGER DEFAULT 0,
      nrr     REAL    DEFAULT 0.0,
      PRIMARY KEY(team_id, season, format)
    );

    CREATE TABLE IF NOT EXISTS Rankings (
      team_id  TEXT REFERENCES Teams(id),
      season   INTEGER,
      format   TEXT,
      rank_pts REAL    DEFAULT 0,
      position INTEGER DEFAULT 0,
      PRIMARY KEY(team_id, season, format)
    );

    CREATE TABLE IF NOT EXISTS Venues (
      id         TEXT PRIMARY KEY,
      name       TEXT,
      country    TEXT,
      capacity   INTEGER,
      pitch_type TEXT,
      team_id    TEXT DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS FriendlySlots (
      slot_index  INTEGER PRIMARY KEY,
      slot_name   TEXT DEFAULT '',
      user_team   TEXT DEFAULT '',
      opp_team    TEXT DEFAULT '',
      overs       INTEGER DEFAULT 20,
      difficulty  TEXT    DEFAULT 'medium',
      match_state TEXT    DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS FieldPresets (
      id           TEXT PRIMARY KEY,
      team_id      TEXT,
      name         TEXT,
      p_dot_mod    REAL DEFAULT 0,
      boundary_mod REAL DEFAULT 0
    );
  `);

  DB.run(`CREATE INDEX IF NOT EXISTS idx_players_team    ON Players(team_id);`);
  DB.run(`CREATE INDEX IF NOT EXISTS idx_fixtures_season ON Fixtures(season, date_slot);`);
  DB.run(`CREATE INDEX IF NOT EXISTS idx_points_season   ON SeasonPoints(season, format, points);`);
  DB.run(`CREATE INDEX IF NOT EXISTS idx_rankings_format ON Rankings(format, season, position);`);
  DB.run(`INSERT OR IGNORE INTO FriendlySlots(slot_index) VALUES(0),(1),(2);`);

  console.log('DB: Schema created ✅');
}

// ─── Query Helpers ─────────────────────────────────────────────
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

// ─── Convenience Queries ───────────────────────────────────────
function getPlayerById(id)       { return dbGet('SELECT * FROM Players WHERE id=?', [id]); }
function getTeamPlayers(tid)     { return dbAll('SELECT * FROM Players WHERE team_id=? ORDER BY ps DESC', [tid]); }
function getAllTeams()            { return dbAll('SELECT * FROM Teams ORDER BY name'); }
function getIntlTeams()          { return dbAll("SELECT * FROM Teams WHERE type='international' ORDER BY name"); }
function getVenuesByCountry(c)   { return dbAll('SELECT * FROM Venues WHERE country=?', [c]); }
function getFriendlySlots()      { return dbAll('SELECT * FROM FriendlySlots ORDER BY slot_index'); }

// ─── Persist / Restore ─────────────────────────────────────────
function persistSession() {
  const uid  = window._ucmUID || 'guest';
  const key  = `UCM_${uid}_session`;
  const data = DB.export();
  localStorage.setItem(key, uint8ArrayToBase64(data));
}

function uint8ArrayToBase64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToUint8Array(b64) {
  const bin   = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// ─── Global exposure for ES modules ───────────────────────────
window.dbAll            = dbAll;
window.dbGet            = dbGet;
window.dbRun            = dbRun;
window.initDB           = initDB;
window.persistSession   = persistSession;
window.getPlayerById    = getPlayerById;
window.getTeamPlayers   = getTeamPlayers;
window.getAllTeams       = getAllTeams;
window.getIntlTeams     = getIntlTeams;
window.getFriendlySlots = getFriendlySlots;