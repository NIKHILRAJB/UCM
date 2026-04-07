// ─── lineup-helpers.js ────────────────────────────────────────
export const $ = id => document.getElementById(id);
export const show = id => $(id)?.classList.remove('hidden');
export const hide = id => $(id)?.classList.add('hidden');

export const esc = v =>
  String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

export const num = v => Number(v) || 0;

export const capitalize = s =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';

export function dbOne(sql, params = []) {
  const rows = window.dbAll(sql, params);
  return rows?.length ? rows[0] : null;
}

export function pName(id, allPlayers) {
  if (!id) return '—';
  const p = allPlayers.find(pl => String(pl.id) === String(id));
  return p ? p.name : '—';
}

export function pNameFromList(id, list) {
  if (!id) return '—';
  const p = list.find(pl => String(pl.id) === String(id));
  return p ? p.name : '—';
}

export function teamName(id) {
  if (!id) return '—';
  const row = dbOne('SELECT name FROM Teams WHERE id=?', [id]);
  return row?.name || String(id);
}

export function teamFlag(id) {
  if (!id) return '🏏';
  try {
    const row = dbOne('SELECT flag FROM Teams WHERE id=?', [id]);
    return row?.flag || '🏏';
  } catch (e) {
    return '🏏';
  }
}

export function isWK(p) {
  const r = (p.role || '').toUpperCase();
  return r.includes('WK') || r.includes('WICKET');
}

export function roleEmoji(role) {
  if (!role) return '🏏';
  const r = role.toUpperCase();
  if (r.includes('WK'))   return '🧤';
  if (r.includes('ALL'))  return '⚡';
  if (r.includes('BOWL')) return '🎯';
  if (r.includes('BAT'))  return '🏏';
  return '🏏';
}

export function buildTags(p) {
  const tags = [];
  const r = (p.role || '').toUpperCase();
  if (isWK(p))              tags.push(`WK`);
  if (r.includes('ALL'))    tags.push(`ALL`);
  else if (r.includes('BAT'))  tags.push(`BAT`);
  else if (r.includes('BOWL')) tags.push(`BOWL`);
  if (num(p.ps) >= 85)     tags.push(`⭐ Elite`);
  else if (num(p.ps) >= 70) tags.push(`Good`);
  return tags.join('');
}

export function formatLabel(overs) {
  if (overs <= 5)  return 'T5';
  if (overs <= 10) return 'T10';
  if (overs <= 20) return 'T20';
  if (overs <= 50) return 'ODI';
  return 'Test';
}

export function diffEmoji(d) {
  if (!d) return '⚙️';
  switch (d.toLowerCase()) {
    case 'easy':   return '🟢';
    case 'medium': return '🟡';
    case 'hard':   return '🔴';
    case 'legend': return '💀';
    default:       return '⚙️';
  }
}

export function maxOvers(total) {
  if (total <= 5)  return 2;
  if (total <= 10) return 2;
  if (total <= 20) return 4;
  return 10;
}

let _toastTimer;
export function toast(msg) {
  let el = document.querySelector('.lu-toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'lu-toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('visible');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('visible'), 2800);
}

// ═══════════════════════════════════════════════════════════════
// ─── CAPTAIN SKILL HELPERS ─────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

// Calculates the Captain Rating (0–100) from 3 attributes
export function calcCR(p) {
  const l = num(p.captain_leadership);
  const t = num(p.captain_tactics);
  const i = num(p.captain_influence);
  if (!l && !t && !i) return 0;
  return Math.round((l * 0.40) + (t * 0.35) + (i * 0.25));
}

// Returns emoji + label for each captain mode
export function captainModeBadge(mode) {
  switch ((mode || '').toLowerCase()) {
    case 'aggressive':    return { emoji: '⚔️',  label: 'Aggressive' };
    case 'defensive':     return { emoji: '🛡️',  label: 'Defensive' };
    case 'tactical':      return { emoji: '🧠',  label: 'Tactical' };
    case 'inspirational': return { emoji: '🔥',  label: 'Inspirational' };
    case 'experienced':   return { emoji: '🎖️',  label: 'Experienced' };
    case 'impulsive':     return { emoji: '🎲',  label: 'Impulsive' };
    default:              return { emoji: '🏏',  label: 'Unknown' };
  }
}

// Returns tier rank label + icon based on CR score
export function captainTierLabel(cr) {
  const c = num(cr);
  if (c >= 90) return { icon: '🏆', label: 'World Class' };
  if (c >= 75) return { icon: '🔵', label: 'Experienced Leader' };
  if (c >= 60) return { icon: '🟡', label: 'Decent Captain' };
  if (c >= 45) return { icon: '🟠', label: 'Inexperienced' };
  return           { icon: '⚪', label: 'Not Captain Material' };
}

// Returns whether a player is captain material (CR >= 60)
export function isCaptainMaterial(p) {
  return calcCR(p) >= 60;
}