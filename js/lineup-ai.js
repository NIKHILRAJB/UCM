// ─── lineup-ai.js ─────────────────────────────────────────────
import { num, isWK, maxOvers } from './lineup-helpers.js';

// ══════════════════════════════════════════
// BATTING ORDER AI
// ══════════════════════════════════════════
export function play11AI_batting(xi, difficulty, format) {
  const diff = (difficulty || 'medium').toLowerCase();
  const fmt  = (format     || 'T20').toUpperCase();

  if (diff === 'easy') {
    return [...xi].sort((a,b) => num(b.batting) - num(a.batting)).map(p => p.id);
  }
  if (diff === 'medium') {
    return [...xi].sort((a,b) => {
      const pd = _batPosPriority(a.bat_pos) - _batPosPriority(b.bat_pos);
      return pd !== 0 ? pd : num(b.batting) - num(a.batting);
    }).map(p => p.id);
  }
  return _hardBattingOrder(xi, fmt);
}

function _batPosPriority(pos) {
  const p = (pos || '').toUpperCase();
  if (p.includes('OPEN'))                          return 1;
  if (p.includes('TOP'))                           return 2;
  if (p.includes('MIDDLE'))                        return 3;
  if (p.includes('ALL') || p.includes('ROUND'))   return 4;
  if (p.includes('FINISH') || p.includes('LOWER'))return 5;
  if (p.includes('WK') || p.includes('KEEP'))     return 6;
  if (p.includes('BOWL') || p.includes('TAIL'))   return 7;
  return 4;
}

function _hardBattingOrder(xi, fmt) {
  const tagged = xi.map(p => ({ ...p, _tag: _classifyBatter(p, fmt) }));
  let order;
  if (fmt === 'T20' || fmt === 'T10' || fmt === 'T5') {
    order = ['opener','top','anchor','allrounder','finisher','wk','lowerorder','tail'];
  } else if (fmt === 'ODI') {
    order = ['opener','anchor','top','allrounder','wk','finisher','lowerorder','tail'];
  } else {
    order = ['opener','anchor','top','allrounder','wk','lowerorder','tail','finisher'];
  }
  const groups = {};
  order.forEach(t => { groups[t] = []; });
  tagged.forEach(p => {
    const t = p._tag;
    if (groups[t]) groups[t].push(p);
    else groups['lowerorder'].push(p);
  });
  const result = [];
  order.forEach(t => {
    groups[t].sort((a,b) => num(b.batting) - num(a.batting));
    groups[t].forEach(p => result.push(p.id));
  });
  return result;
}

function _classifyBatter(p, fmt) {
  const pos  = (p.bat_pos || '').toUpperCase();
  const role = (p.role    || '').toUpperCase();
  const bat  = num(p.batting);
  if (isWK(p))                                              return 'wk';
  if (role.includes('BOWL') && !role.includes('ALL'))       return 'tail';
  if (pos.includes('OPEN'))                                 return 'opener';
  if (pos.includes('ANCHOR') || (pos.includes('TOP') && bat >= 75)) return 'anchor';
  if (pos.includes('TOP'))                                  return 'top';
  if (pos.includes('FINISH') || pos.includes('PINCH'))      return 'finisher';
  if (role.includes('ALL') || pos.includes('ALL'))          return 'allrounder';
  if (pos.includes('LOWER') || pos.includes('MIDDLE'))      return 'lowerorder';
  if (bat >= 75) return 'top';
  if (bat >= 55) return 'allrounder';
  return 'lowerorder';
}

// ══════════════════════════════════════════
// BOWLING PLAN AI
// Key rule: no bowler gets consecutive overs
// ══════════════════════════════════════════

// Check if a bowler CAN bowl a given over (consecutive rule)
function _canBowlOver(assign, pid, ov) {
  const mySet = new Set((assign[pid] || []).map(Number));
  return !mySet.has(ov - 1) && !mySet.has(ov + 1);
}

// Sync pool to reflect current assign state
function _syncPool(pool, assign, totalOvers) {
  const taken = new Set(Object.values(assign).flat().map(Number));
  pool.length = 0;
  for (let i = 1; i <= totalOvers; i++) {
    if (!taken.has(i)) pool.push(i);
  }
}

// Core assign: try to assign each over in `overs` to a bowler in `bowlers`
// Respects cap + consecutive rule
// Returns array of overs that could NOT be assigned
function _assignOversToPool(bowlers, overs, assign, cap) {
  const remaining = [];
  for (const ov of overs) {
    let assigned = false;
    for (const p of bowlers) {
      if (!assign[p.id]) assign[p.id] = [];
      if (assign[p.id].length >= cap)          continue; // over cap
      if (!_canBowlOver(assign, p.id, ov))    continue; // consecutive rule
      assign[p.id].push(ov);
      assign[p.id].sort((a,b) => a - b);
      assigned = true;
      break;
    }
    if (!assigned) remaining.push(ov);
  }
  return remaining;
}

function _getPhases(totalOvers, fmt) {
  if (totalOvers <= 5) return {
    powerplay: [1,2], middle: [3], death: [4,5]
  };
  if (totalOvers <= 10) return {
    powerplay: [1,2,3], middle: [4,5,6,7], death: [8,9,10]
  };
  if (totalOvers <= 20) return {
    powerplay: [1,2,3,4,5,6],
    middle:    Array.from({length:9}, (_,i) => i+7),   // 7–15
    death:     [16,17,18,19,20]
  };
  // ODI
  return {
    powerplay: Array.from({length:10}, (_,i) => i+1),
    middle:    Array.from({length:30}, (_,i) => i+11),
    death:     Array.from({length:10}, (_,i) => i+41)
  };
}

function _isPace(p) {
  const t = (p.bowl_type || p.bowl_phase || p.role || '').toUpperCase();
  return t.includes('PACE') || t.includes('FAST') || t.includes('MEDIUM');
}

function _isSpin(p) {
  const t = (p.bowl_type || p.bowl_phase || p.role || '').toUpperCase();
  return t.includes('SPIN') || t.includes('OFF') || t.includes('LEG') || t.includes('SLOW');
}

function _assignEasy(eligible, pool, assign, cap, totalOvers) {
  _assignOversToPool(eligible, [...pool], assign, cap);
  _syncPool(pool, assign, totalOvers);
  // Second pass for leftovers
  if (pool.length > 0) {
    _assignOversToPool([...eligible].reverse(), [...pool], assign, cap);
    _syncPool(pool, assign, totalOvers);
  }
}

function _assignMedium(eligible, pool, assign, cap, totalOvers, fmt) {
  const phases     = _getPhases(totalOvers, fmt);
  const pace       = eligible.filter(p => _isPace(p));
  const spin       = eligible.filter(p => _isSpin(p));
  const general    = eligible.filter(p => !_isPace(p) && !_isSpin(p));

  // Powerplay → pace (fallback: all)
  _assignOversToPool(pace.length ? pace : eligible,
    phases.powerplay.filter(o => pool.includes(o)), assign, cap);
  _syncPool(pool, assign, totalOvers);

  // Middle → spin (fallback: all)
  _assignOversToPool(spin.length ? spin : eligible,
    phases.middle.filter(o => pool.includes(o)), assign, cap);
  _syncPool(pool, assign, totalOvers);

  // Death → pace + general (fallback: all)
  const deathBowlers = [...pace,...general].length ? [...pace,...general] : eligible;
  _assignOversToPool(deathBowlers,
    phases.death.filter(o => pool.includes(o)), assign, cap);
  _syncPool(pool, assign, totalOvers);

  // Fill any remaining
  if (pool.length > 0) {
    _assignOversToPool(eligible, [...pool], assign, cap);
    _syncPool(pool, assign, totalOvers);
  }
}

function _assignHard(eligible, pool, assign, cap, totalOvers, fmt) {
  const phases = _getPhases(totalOvers, fmt);
  const pace   = eligible.filter(p => _isPace(p)).sort((a,b) => num(b.ps)-num(a.ps));
  const spin   = eligible.filter(p => _isSpin(p)).sort((a,b) => num(b.ps)-num(a.ps));
  const allr   = eligible.filter(p => (p.role||'').toUpperCase().includes('ALL'))
                         .sort((a,b) => num(b.ps)-num(a.ps));

  if (fmt === 'T20' || fmt === 'T10' || fmt === 'T5') {
    const deathPace  = pace.slice(0,2);
    const ppPace     = pace.length > 2 ? pace.slice(2) : pace;
    const midBowlers = [...spin,...allr].length ? [...spin,...allr] : eligible;

    // Death overs first (reserved for best 2 pacers)
    _assignOversToPool(deathPace.length ? deathPace : pace,
      phases.death.filter(o => pool.includes(o)), assign, cap);
    _syncPool(pool, assign, totalOvers);

    // Powerplay → remaining pace
    _assignOversToPool(ppPace,
      phases.powerplay.filter(o => pool.includes(o)), assign, cap);
    _syncPool(pool, assign, totalOvers);

    // Middle → spin + allrounders
    _assignOversToPool(midBowlers,
      phases.middle.filter(o => pool.includes(o)), assign, cap);
    _syncPool(pool, assign, totalOvers);

  } else if (fmt === 'ODI') {
    _assignOversToPool(pace.length ? pace : eligible,
      phases.powerplay.filter(o => pool.includes(o)), assign, cap);
    _syncPool(pool, assign, totalOvers);

    _assignOversToPool(spin.length ? spin : eligible,
      phases.middle.filter(o => pool.includes(o)), assign, cap);
    _syncPool(pool, assign, totalOvers);

    _assignOversToPool(eligible.slice(0,2),
      phases.death.filter(o => pool.includes(o)), assign, cap);
    _syncPool(pool, assign, totalOvers);

  } else {
    // Test — simple sequential
    _assignOversToPool(eligible, [...pool], assign, cap);
    _syncPool(pool, assign, totalOvers);
    return;
  }

  // Fill any remaining overs
  if (pool.length > 0) {
    _assignOversToPool(eligible, [...pool], assign, cap);
    _syncPool(pool, assign, totalOvers);
  }
}

// ── Main export — single clean export, no duplicate ───────────
export function play11AI_bowling(xi, difficulty, format, totalOvers, existingAssign = {}) {
  const diff = (difficulty || 'medium').toLowerCase();
  const fmt  = (format     || 'T20').toUpperCase();
  const cap  = maxOvers(totalOvers);

  // Deep clone existing assignments — never mutate input
  const assign = {};
  Object.entries(existingAssign).forEach(([pid, ovs]) => {
    assign[pid] = [...ovs.map(Number)];
  });

  // Build pool of unassigned overs only
  const pool = [];
  _syncPool(pool, assign, totalOvers);
  // But pool starts with ALL overs; remove already assigned
  // _syncPool does exactly that ↑

  if (!pool.length) return assign; // all overs already manually assigned

  // Eligible bowlers: no WK, sorted by bowling DESC
  const eligible = [...xi]
    .filter(p => !isWK(p))
    .sort((a,b) => num(b.bowling) - num(a.bowling));

  if (!eligible.length) return assign;

  if (diff === 'easy')   { _assignEasy(eligible, pool, assign, cap, totalOvers);          return assign; }
  if (diff === 'medium') { _assignMedium(eligible, pool, assign, cap, totalOvers, fmt);   return assign; }
  /* hard */               _assignHard(eligible, pool, assign, cap, totalOvers, fmt);     return assign;
}

// ══════════════════════════════════════════
// OPPONENT AI
// ══════════════════════════════════════════
export function play11AI_opponent(xi, difficulty, format, totalOvers) {
  const diff     = (difficulty || 'medium').toLowerCase();
  const batOrder = play11AI_batting(xi, difficulty, format);

  let bowlAssign;
  if (diff === 'easy') {
    // Intentionally suboptimal — worst bowlers get key overs
    const cap     = maxOvers(totalOvers);
    const assign  = {};
    const bowlers = [...xi]
      .filter(p => !isWK(p))
      .sort((a,b) => num(a.bowling) - num(b.bowling)); // ASC = worst first

    const pool = [];
    _syncPool(pool, assign, totalOvers);
    _assignOversToPool(bowlers, [...pool], assign, cap);
    _syncPool(pool, assign, totalOvers);
    if (pool.length > 0) {
      _assignOversToPool([...bowlers].reverse(), [...pool], assign, cap);
    }
    bowlAssign = assign;
  } else {
    bowlAssign = play11AI_bowling(xi, difficulty, format, totalOvers, {});
  }

  return { batOrder, bowlAssign };
}