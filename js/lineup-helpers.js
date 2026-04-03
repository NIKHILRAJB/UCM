// ─── lineup-helpers.js ────────────────────────────────────────
export const $    = id => document.getElementById(id);
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

// ── Safe teamFlag — gracefully handles missing flag column ────
export function teamFlag(id) {
  if (!id) return '🏏';
  try {
    const row = dbOne('SELECT flag FROM Teams WHERE id=?', [id]);
    return row?.flag || '🏏';
  } catch (e) {
    // Column doesn't exist yet in restored session — return default
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
  const r    = (p.role || '').toUpperCase();
  if (isWK(p))                 tags.push(`<span class="lu-tag blue">WK</span>`);
  if (r.includes('ALL'))       tags.push(`<span class="lu-tag gold">ALL</span>`);
  else if (r.includes('BAT'))  tags.push(`<span class="lu-tag green">BAT</span>`);
  else if (r.includes('BOWL')) tags.push(`<span class="lu-tag">BOWL</span>`);
  if (num(p.ps) >= 85)         tags.push(`<span class="lu-tag gold">⭐ Elite</span>`);
  else if (num(p.ps) >= 70)    tags.push(`<span class="lu-tag green">Good</span>`);
  return tags.join('');
}

export function formatLabel(overs) {
  if (overs <=  5) return 'T5';
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
  if (total <=  5) return 2;
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