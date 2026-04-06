// ─── sql-wasm DB ───────────────────────────────────────────────────────────────
let DB = null;

async function initDB() {
  const SQL = await initSqlJs({ locateFile: f => `lib/${f}` });

  const uid = window._ucmUID || 'guest';
  const sessionKey = `UCM_${uid}_session`;
  const sessionB64 = localStorage.getItem(sessionKey);

  if (sessionB64) {
    try {
      const bytes = base64ToUint8Array(sessionB64);
      DB = new SQL.Database(bytes);
      console.log('DB: Session restored ✅');
      _migrateSchema();
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

// ─── Safe migration ────────────────────────────────────────────────────────────
function _migrateSchema() {
  const migrations = [
    { table:'Teams',   col:'flag',         sql:"ALTER TABLE Teams ADD COLUMN flag TEXT DEFAULT '🏳'" },
    { table:'Players', col:'batting',       sql:"ALTER TABLE Players ADD COLUMN batting REAL DEFAULT 0" },
    { table:'Players', col:'bowling',       sql:"ALTER TABLE Players ADD COLUMN bowling REAL DEFAULT 0" },
    { table:'Players', col:'fielding',      sql:"ALTER TABLE Players ADD COLUMN fielding REAL DEFAULT 0" },
    { table:'Players', col:'wicket',        sql:"ALTER TABLE Players ADD COLUMN wicket REAL DEFAULT 0" },
    { table:'Players', col:'bat_pos',       sql:"ALTER TABLE Players ADD COLUMN bat_pos TEXT DEFAULT ''" },
    { table:'Players', col:'bat_hand',      sql:"ALTER TABLE Players ADD COLUMN bat_hand TEXT DEFAULT ''" },
    { table:'Players', col:'bowl_type',     sql:"ALTER TABLE Players ADD COLUMN bowl_type TEXT DEFAULT ''" },
    { table:'Players', col:'bowl_phase',    sql:"ALTER TABLE Players ADD COLUMN bowl_phase TEXT DEFAULT ''" },
    { table:'Players', col:'bowl_hand',     sql:"ALTER TABLE Players ADD COLUMN bowl_hand TEXT DEFAULT ''" },
    { table:'Players', col:'bio',           sql:"ALTER TABLE Players ADD COLUMN bio TEXT DEFAULT ''" },
    { table:'Players', col:'subtype',       sql:"ALTER TABLE Players ADD COLUMN subtype TEXT DEFAULT ''" },
    { table:'Players', col:'in_match_form', sql:"ALTER TABLE Players ADD COLUMN in_match_form TEXT DEFAULT 'Good'" },
    { table:'Players', col:'form_pts',      sql:"ALTER TABLE Players ADD COLUMN form_pts INTEGER DEFAULT 0" },
    { table:'Venues',  col:'team_id',       sql:"ALTER TABLE Venues ADD COLUMN team_id TEXT DEFAULT NULL" },
    { table:'FieldPresets', col:'p_dot_mod',    sql:"ALTER TABLE FieldPresets ADD COLUMN p_dot_mod REAL DEFAULT 0" },
    { table:'FieldPresets', col:'boundary_mod', sql:"ALTER TABLE FieldPresets ADD COLUMN boundary_mod REAL DEFAULT 0" },
  ];

  migrations.forEach(({ table, col, sql }) => {
    try {
      const cols = dbAll(`PRAGMA table_info(${table})`);
      if (!cols.some(c => c.name === col)) {
        DB.run(sql);
        console.log(`DB: Migrated ${table}.${col} ✅`);
      }
    } catch (e) {
      console.warn(`DB: Migration skipped ${table}.${col}:`, e.message);
    }
  });

  // ── Copy old stat column values → new column names ──────────────
  try {
    const cols = dbAll('PRAGMA table_info(Players)').map(c => c.name);
    if (cols.includes('bat')   && cols.includes('batting'))  DB.run('UPDATE Players SET batting  = bat   WHERE batting  = 0 AND bat   > 0');
    if (cols.includes('bowl')  && cols.includes('bowling'))  DB.run('UPDATE Players SET bowling  = bowl  WHERE bowling  = 0 AND bowl  > 0');
    if (cols.includes('field') && cols.includes('fielding')) DB.run('UPDATE Players SET fielding = field WHERE fielding = 0 AND field > 0');
    if (cols.includes('wk')    && cols.includes('wicket'))   DB.run('UPDATE Players SET wicket   = wk    WHERE wicket   = 0 AND wk    > 0');
  } catch(e) { console.warn('DB: Column copy skipped:', e.message); }

  // ── FieldPresets column rename: pdot_mod → p_dot_mod ────────────
  try {
    const fpCols = dbAll('PRAGMA table_info(FieldPresets)').map(c => c.name);
    if (fpCols.includes('pdot_mod') && fpCols.includes('p_dot_mod'))
      DB.run('UPDATE FieldPresets SET p_dot_mod = pdot_mod WHERE p_dot_mod = 0 AND pdot_mod != 0');
  } catch(e) { console.warn('DB: FieldPresets column copy skipped:', e.message); }

  // ── ✅ BACKFILL: Player metadata ─────────────────────────────────
  try {
    // bat_hand — default Right Hand if empty
    DB.run(`UPDATE Players SET bat_hand = 'Right Hand' WHERE (bat_hand IS NULL OR bat_hand = '')`);

    // bowl_type — role-aware for bowlers/allrounders
    DB.run(`UPDATE Players SET bowl_type = CASE
      WHEN bowling >= 88 THEN 'Fast'
      WHEN bowling >= 78 THEN 'Medium Fast'
      WHEN bowl_hand = 'Left Arm' THEN 'Left Arm Orthodox'
      ELSE 'Off Spin'
    END WHERE (bowl_type IS NULL OR bowl_type = '') AND (role = 'BOWL' OR role = 'ALL')`);

    // bowl_hand — default Right Arm for bowlers/allrounders
    DB.run(`UPDATE Players SET bowl_hand = 'Right Arm'
      WHERE (bowl_hand IS NULL OR bowl_hand = '') AND (role = 'BOWL' OR role = 'ALL')`);

    // bowl_phase — default Middle for bowlers/allrounders
    DB.run(`UPDATE Players SET bowl_phase = 'Middle'
      WHERE (bowl_phase IS NULL OR bowl_phase = '') AND (role = 'BOWL' OR role = 'ALL')`);

    // ✅ UPDATED bat_pos — clean 5-value system
    DB.run(`UPDATE Players SET bat_pos = CASE
      WHEN role = 'BAT'  AND batting >= 86 THEN 'Opener'
      WHEN role = 'BAT'  AND batting >= 78 THEN 'Top Order'
      WHEN role = 'BAT'  AND batting >= 68 THEN 'Middle Order'
      WHEN role = 'BAT'                     THEN 'Lower Order'
      WHEN role = 'ALL'  AND batting >= 78 THEN 'Middle Order'
      WHEN role = 'ALL'  AND batting >= 65 THEN 'Finisher'
      WHEN role = 'ALL'                     THEN 'Lower Order'
      WHEN role = 'WK'   AND batting >= 82 THEN 'Top Order'
      WHEN role = 'WK'   AND batting >= 74 THEN 'Middle Order'
      WHEN role = 'WK'   AND batting >= 64 THEN 'Finisher'
      WHEN role = 'WK'                      THEN 'Lower Order'
      WHEN role = 'BOWL'                    THEN 'Lower Order'
      ELSE 'Middle Order'
    END WHERE (bat_pos IS NULL OR bat_pos = '')`);

    // ✅ UPDATED subtype — full detailed system including WK batting position
    DB.run(`UPDATE Players SET subtype = CASE
      WHEN role = 'BAT'  AND batting >= 86                  THEN 'Opener'
      WHEN role = 'BAT'  AND batting >= 78                  THEN 'Top Order'
      WHEN role = 'BAT'  AND batting >= 68                  THEN 'Middle Order'
      WHEN role = 'BAT'                                     THEN 'Lower Order'
      WHEN role = 'WK'   AND batting >= 82                  THEN 'Wicketkeeper Top Order'
      WHEN role = 'WK'   AND batting >= 74                  THEN 'Wicketkeeper Middle Order'
      WHEN role = 'WK'   AND batting >= 64                  THEN 'Wicketkeeper Finisher'
      WHEN role = 'WK'                                      THEN 'Wicketkeeper Lower Order'
      WHEN role = 'BOWL' AND bowling >= 85                  THEN 'Pace'
      WHEN role = 'BOWL' AND bowling <  85                  THEN 'Spin'
      WHEN role = 'ALL'  AND batting >= bowling             THEN 'Batting Allrounder'
      WHEN role = 'ALL'  AND bowling >= 74                  THEN 'Bowling Allrounder'
      WHEN role = 'ALL'  AND bowling >= 74                  THEN 'Pace Allrounder'
      WHEN role = 'ALL'                                     THEN 'Spin Allrounder'
      ELSE subtype
    END WHERE (subtype IS NULL OR subtype = '')`);

    // ✅ FIX: fatigue_level — always reset to 'Fresh' on migration
    // (bug fix: old default was 'High' which is wrong for a fresh session)
    DB.run(`UPDATE Players SET
      fatigue = 0,
      fatigue_level = 'Fresh'
      WHERE fatigue_level = 'High' OR fatigue_level IS NULL OR fatigue_level = ''`);

    // Recalculate PS based on role
    DB.run(`UPDATE Players SET ps = CASE
      WHEN role = 'BAT'  THEN ROUND((batting*0.70)+(fielding*0.20)+(bowling*0.10), 1)
      WHEN role = 'BOWL' THEN ROUND((bowling*0.70)+(fielding*0.20)+(batting*0.10), 1)
      WHEN role = 'ALL'  THEN ROUND((batting*0.45)+(bowling*0.45)+(fielding*0.10), 1)
      WHEN role = 'WK'   THEN ROUND((batting*0.50)+(wicket*0.30) +(fielding*0.20), 1)
      ELSE ps
    END WHERE batting > 0 OR bowling > 0`);

    // in_match_form reset to Good if blank
    DB.run(`UPDATE Players SET in_match_form = 'Good', form_pts = 0
      WHERE (in_match_form IS NULL OR in_match_form = '')`);

    console.log('DB: Player metadata backfilled ✅');
  } catch(e) { console.warn('DB: Player backfill skipped:', e.message); }

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
  flag        TEXT    DEFAULT '🏳'
);

CREATE TABLE IF NOT EXISTS Players (
  id             TEXT PRIMARY KEY,
  team_id        TEXT REFERENCES Teams(id),
  name           TEXT NOT NULL,
  nationality    TEXT DEFAULT '',
  age            INTEGER DEFAULT 0,
  role           TEXT DEFAULT '',
  subtype        TEXT DEFAULT '',
  batting        REAL DEFAULT 0,
  bowling        REAL DEFAULT 0,
  fielding       REAL DEFAULT 0,
  wicket         REAL DEFAULT 0,
  ps             REAL DEFAULT 0,
  bat_pos        TEXT DEFAULT '',
  bat_hand       TEXT DEFAULT '',
  bowl_type      TEXT DEFAULT '',
  bowl_phase     TEXT DEFAULT '',
  bowl_hand      TEXT DEFAULT '',
  bio            TEXT DEFAULT '',
  form           TEXT DEFAULT 'Medium',
  in_match_form  TEXT DEFAULT 'Good',
  form_pts       INTEGER DEFAULT 0,
  fatigue        INTEGER DEFAULT 0,
  fatigue_level  TEXT DEFAULT 'Fresh',
  injury_status  TEXT DEFAULT 'none',
  injury_return  INTEGER DEFAULT 0,
  contract_yrs   INTEGER DEFAULT 2,
  wage           REAL    DEFAULT 50000,
  is_youth       INTEGER DEFAULT 0,
  is_overseas    INTEGER DEFAULT 0,
  is_talent      INTEGER DEFAULT 0,
  career_stats   TEXT DEFAULT '{}'
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
  result      TEXT DEFAULT ''
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
  difficulty  TEXT DEFAULT 'medium',
  match_state TEXT DEFAULT '{}'
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

// ─── Query Helpers ──────────────────────────────────────────────────────────────
function dbRun(sql, params = []) {
  const safeParams = params.map(p => (p === undefined ? null : p));
  try {
    return DB.run(sql, safeParams);
  } catch (e) {
    console.error("SQL Execution Error:", e, "Query:", sql, "Params:", safeParams);
    throw e;
  }
}

function dbAll(sql, params = []) {
  const stmt = DB.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function dbGet(sql, params = []) { return dbAll(sql, params)[0] || null; }

// ─── Convenience Queries ────────────────────────────────────────────────────────
function getPlayerById(id)     { return dbGet('SELECT * FROM Players WHERE id=?', [id]); }
function getTeamPlayers(tid)   { return dbAll('SELECT * FROM Players WHERE team_id=? ORDER BY ps DESC', [tid]); }
function getAllTeams()          { return dbAll('SELECT * FROM Teams ORDER BY name'); }
function getIntlTeams()        { return dbAll("SELECT * FROM Teams WHERE type='international' ORDER BY name"); }
function getVenuesByCountry(c) { return dbAll('SELECT * FROM Venues WHERE country=?', [c]); }
function getFriendlySlots()    { return dbAll('SELECT * FROM FriendlySlots ORDER BY slot_index'); }

// ─── ✅ Player Card Helpers ──────────────────────────────────────────────────────

function getPlayerTier(ps) {
  if (ps >= 90) return { label:'Legend',      icon:'👑' };
  if (ps >= 80) return { label:'Elite',       icon:'⭐' };
  if (ps >= 70) return { label:'Experienced', icon:'🔵' };
  if (ps >= 60) return { label:'Developing',  icon:'🟡' };
  if (ps >= 50) return { label:'Prospect',    icon:'🟠' };
  return             { label:'Rookie',       icon:'⚪' };
}

function calcPS(p, formBonus = 0) {
  const bat  = (p.batting  || 0) + formBonus;
  const bowl = (p.bowling  || 0) + formBonus;
  const fld  = p.fielding  || 0;
  const wk   = p.wicket    || 0;
  switch (p.role) {
    case 'BAT':  return Math.min(100, Math.round(bat*0.70 + fld*0.20 + bowl*0.10));
    case 'BOWL': return Math.min(100, Math.round(bowl*0.70 + fld*0.20 + bat*0.10));
    case 'ALL':  return Math.min(100, Math.round(bat*0.45 + bowl*0.45 + fld*0.10));
    case 'WK':   return Math.min(100, Math.round(bat*0.50 + wk*0.30  + fld*0.20));
    default:     return p.ps || 0;
  }
}

function getFormState(pts) {
  if (pts >=  10) return { label:'On Fire',     icon:'🔥', bonus: +5 };
  if (pts >=   4) return { label:'Good',        icon:'🟢', bonus: +2 };
  if (pts >=  -3) return { label:'Average',     icon:'🟡', bonus:  0 };
  if (pts >= -10) return { label:'Poor',        icon:'🔴', bonus: -4 };
  return               { label:'Out of Form', icon:'⛔', bonus: -8 };
}

function updatePlayerForm(playerId, ballOutcome) {
  const delta = {
    dot:               -1,
    '1':                0,
    '2':                0,
    '3':               +1,
    '4':               +1,
    '6':               +3,
    wicket_taken:      +4,
    wide:              -2,
    noball:            -2,
    boundary_conceded: -1,
    wicket_lost:       -3,
  }[ballOutcome] ?? 0;

  const p = dbGet('SELECT form_pts FROM Players WHERE id=?', [playerId]);
  if (!p) return;
  const newPts = (p.form_pts || 0) + delta;
  const state  = getFormState(newPts);
  dbRun('UPDATE Players SET form_pts=?, in_match_form=? WHERE id=?',
        [newPts, state.label, playerId]);
}

function resetMatchForm(teamAId, teamBId) {
  const ids = [
    ...dbAll('SELECT id FROM Players WHERE team_id=?', [teamAId]),
    ...dbAll('SELECT id FROM Players WHERE team_id=?', [teamBId]),
  ].map(r => r.id);
  ids.forEach(id =>
    dbRun(`UPDATE Players SET in_match_form='Good', form_pts=0,
           fatigue=0, fatigue_level='Fresh', injury_status='none'
           WHERE id=?`, [id])
  );
}

// ─── Persist / Restore ──────────────────────────────────────────────────────────
function persistSession() {
  const uid = window._ucmUID || 'guest';
  const key = `UCM_${uid}_session`;
  localStorage.setItem(key, uint8ArrayToBase64(DB.export()));
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

// ─── Global exposure ────────────────────────────────────────────────────────────
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
window.getPlayerTier    = getPlayerTier;
window.calcPS           = calcPS;
window.getFormState     = getFormState;
window.updatePlayerForm = updatePlayerForm;
window.resetMatchForm   = resetMatchForm;