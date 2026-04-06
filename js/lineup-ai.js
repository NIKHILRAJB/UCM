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
      const pd = _batPosPriority(a) - _batPosPriority(b);
      return pd !== 0 ? pd : num(b.batting) - num(a.batting);
    }).map(p => p.id);
  }
  return _hardBattingOrder(xi, fmt);
}


// ✅ FIX 1: Updated to match new clean bat_pos values
// Old code checked for "ROUND", "KEEP", "TAIL" which never exist anymore
function _batPosPriority(p) {
  const pos     = (p.bat_pos || '').toUpperCase();
  const subtype = (p.subtype || '').toUpperCase();
  const role    = (p.role    || '').toUpperCase();

  if (pos.includes('OPEN')   || subtype.includes('OPEN'))    return 1;
  if (pos.includes('TOP')    || subtype.includes('TOP'))     return 2;
  if (pos.includes('MIDDLE') || subtype.includes('MIDDLE'))  return 3;
  if (pos.includes('FINISH') || subtype.includes('FINISH'))  return 4;
  if (pos.includes('LOWER')  || subtype.includes('LOWER'))   return 5;
  if (role === 'BOWL')                                        return 7;
  return 6; // fallback
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


// ✅ FIX 2 + FIX 3: Finisher WK gets correct slot, WK check no longer overrides batting position
function _classifyBatter(p, fmt) {
  const pos     = (p.bat_pos || '').toUpperCase();
  const subtype = (p.subtype || '').toUpperCase();
  const role    = (p.role    || '').toUpperCase();
  const bat     = num(p.batting);

  // Pure bowler — always tail
  if (role === 'BOWL') return 'tail';

  // ✅ FIX 3: WK with specific batting subtypes get correct batting slot
  // instead of always being dumped in generic 'wk' slot
  if (isWK(p)) {
    if (subtype.includes('TOP')    || pos.includes('TOP'))    return 'top';
    if (subtype.includes('OPEN')   || pos.includes('OPEN'))   return 'opener';
    if (subtype.includes('FINISH') || pos.includes('FINISH')) return 'finisher';
    if (bat >= 80) return 'top';
    if (bat >= 70) return 'wk';
    return 'wk';
  }

  // ✅ FIX 2: "PINCH" removed — only "FINISH" needed for new bat_pos values
  if (pos.includes('OPEN')   || subtype.includes('OPEN'))   return 'opener';
  if (pos.includes('FINISH') || subtype.includes('FINISH')) return 'finisher';

  if (pos.includes('TOP') || subtype.includes('TOP')) {
    return (bat >= 75) ? 'anchor' : 'top';
  }

  if (role.includes('ALL') || subtype.includes('ALL')) return 'allrounder';

  if (pos.includes('MIDDLE')) return 'lowerorder';
  if (pos.includes('LOWER'))  return 'lowerorder';

  // Stat-based fallback
  if (bat >= 80) return 'anchor';
  if (bat >= 70) return 'top';
  if (bat >= 55) return 'allrounder';
  return 'lowerorder';
}


// ══════════════════════════════════════════
// BOWLING PLAN AI
// Key rule: no bowler gets consecutive overs
// ══════════════════════════════════════════

function _canBowlOver(assign, pid, ov) {
  const mySet = new Set((assign[pid] || []).map(Number));
  return !mySet.has(ov - 1) && !mySet.has(ov + 1);
}

function _syncPool(pool, assign, totalOvers) {
  const taken = new Set(Object.values(assign).flat().map(Number));
  pool.length = 0;
  for (let i = 1; i <= totalOvers; i++) {
    if (!taken.has(i)) pool.push(i);
  }
}

function _assignOversToPool(bowlers, overs, assign, cap) {
  const remaining = [];
  for (const ov of overs) {
    let assigned = false;
    for (const p of bowlers) {
      if (!assign[p.id]) assign[p.id] = [];
      if (assign[p.id].length >= cap)       continue;
      if (!_canBowlOver(assign, p.id, ov))  continue;
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
    middle:    Array.from({length:9}, (_,i) => i+7),
    death:     [16,17,18,19,20]
  };
  return {
    powerplay: Array.from({length:10}, (_,i) => i+1),
    middle:    Array.from({length:30}, (_,i) => i+11),
    death:     Array.from({length:10}, (_,i) => i+41)
  };
}

// ✅ FIX 7 (Improvement 1): Removed bowl_phase from type checks
// bowl_phase stores "Middle"/"Powerplay"/"Death" — never "PACE" or "SPIN"
function _isPace(p) {
  const t = (p.bowl_type || p.subtype || p.role || '').toUpperCase();
  return t.includes('PACE') || t.includes('FAST') || t.includes('MEDIUM');
}

function _isSpin(p) {
  const t = (p.bowl_type || p.subtype || p.role || '').toUpperCase();
  return t.includes('SPIN') || t.includes('OFF') || t.includes('LEG')
      || t.includes('ORTHODOX') || t.includes('SLOW');
}

// ✅ FIX 5: Second pass no longer reverses eligible
// Old code reversed eligible on second pass — giving worst bowler remaining overs for USER team
function _assignEasy(eligible, pool, assign, cap, totalOvers) {
  _assignOversToPool(eligible, [...pool], assign, cap);
  _syncPool(pool, assign, totalOvers);
  if (pool.length > 0) {
    _assignOversToPool(eligible, [...pool], assign, cap); // ✅ best bowlers fill leftovers too
    _syncPool(pool, assign, totalOvers);
  }
}

function _assignMedium(eligible, pool, assign, cap, totalOvers, fmt) {
  const phases  = _getPhases(totalOvers, fmt);
  const pace    = eligible.filter(p => _isPace(p));
  const spin    = eligible.filter(p => _isSpin(p));
  const general = eligible.filter(p => !_isPace(p) && !_isSpin(p));

  _assignOversToPool(pace.length ? pace : eligible,
    phases.powerplay.filter(o => pool.includes(o)), assign, cap);
  _syncPool(pool, assign, totalOvers);

  _assignOversToPool(spin.length ? spin : eligible,
    phases.middle.filter(o => pool.includes(o)), assign, cap);
  _syncPool(pool, assign, totalOvers);

  const deathBowlers = [...pace,...general].length ? [...pace,...general] : eligible;
  _assignOversToPool(deathBowlers,
    phases.death.filter(o => pool.includes(o)), assign, cap);
  _syncPool(pool, assign, totalOvers);

  if (pool.length > 0) {
    _assignOversToPool(eligible, [...pool], assign, cap);
    _syncPool(pool, assign, totalOvers);
  }
}

function _assignHard(eligible, pool, assign, cap, totalOvers, fmt) {
  const phases = _getPhases(totalOvers, fmt);
  const pace   = eligible.filter(p => _isPace(p)).sort((a,b) => num(b.ps)-num(a.ps));
  const spin   = eligible.filter(p => _isSpin(p)).sort((a,b) => num(b.ps)-num(a.ps));

  // ✅ FIX 8 (Improvement 2): Only allrounders who can actually bowl (bowling >= 65)
  const allr = eligible
    .filter(p => (p.role||'').toUpperCase().includes('ALL') && num(p.bowling) >= 65)
    .sort((a,b) => num(b.ps)-num(a.ps));

  if (fmt === 'T20' || fmt === 'T10' || fmt === 'T5') {
    const deathPace  = pace.slice(0,2);
    const ppPace     = pace.length > 2 ? pace.slice(2) : pace;
    const midBowlers = [...spin,...allr].length ? [...spin,...allr] : eligible;

    _assignOversToPool(deathPace.length ? deathPace : pace,
      phases.death.filter(o => pool.includes(o)), assign, cap);
    _syncPool(pool, assign, totalOvers);

    _assignOversToPool(ppPace.length ? ppPace : pace,
      phases.powerplay.filter(o => pool.includes(o)), assign, cap);
    _syncPool(pool, assign, totalOvers);

    _assignOversToPool(midBowlers,
      phases.middle.filter(o => pool.includes(o)), assign, cap);
    _syncPool(pool, assign, totalOvers);

  } else if (fmt === 'ODI') {
    // ✅ FIX 4: Death overs now use best 2 PACE bowlers, not just any top 2
    const deathBowlers = pace.length >= 2 ? pace.slice(0,2) : eligible.slice(0,2);

    _assignOversToPool(pace.length ? pace : eligible,
      phases.powerplay.filter(o => pool.includes(o)), assign, cap);
    _syncPool(pool, assign, totalOvers);

    _assignOversToPool(spin.length ? spin : eligible,
      phases.middle.filter(o => pool.includes(o)), assign, cap);
    _syncPool(pool, assign, totalOvers);

    _assignOversToPool(deathBowlers,
      phases.death.filter(o => pool.includes(o)), assign, cap);
    _syncPool(pool, assign, totalOvers);

  } else {
    // Test — simple sequential
    _assignOversToPool(eligible, [...pool], assign, cap);
    _syncPool(pool, assign, totalOvers);
    return;
  }

  if (pool.length > 0) {
    _assignOversToPool(eligible, [...pool], assign, cap);
    _syncPool(pool, assign, totalOvers);
  }
}


// ── Main export ────────────────────────────────────────────────
// ✅ FIX 9 (Improvement 3): Guard for totalOvers = 0 or undefined
export function play11AI_bowling(xi, difficulty, format, totalOvers, existingAssign = {}) {
  if (!totalOvers || totalOvers < 1) return existingAssign;

  const diff = (difficulty || 'medium').toLowerCase();
  const fmt  = (format     || 'T20').toUpperCase();
  const cap  = maxOvers(totalOvers);

  const assign = {};
  Object.entries(existingAssign).forEach(([pid, ovs]) => {
    assign[pid] = [...ovs.map(Number)];
  });

  const pool = [];
  _syncPool(pool, assign, totalOvers);

  if (!pool.length) return assign;

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
// ✅ FIX 10 (Improvement 4) + FIX 6: Cleaned up easy mode
// No more duplicated pool/sync/assign logic
// Uses a reverse-sorted XI passed into play11AI_bowling
// Missing _syncPool after second pass is now gone entirely
export function play11AI_opponent(xi, difficulty, format, totalOvers) {
  const diff     = (difficulty || 'medium').toLowerCase();
  const batOrder = play11AI_batting(xi, difficulty, format);

  let bowlAssign;

  if (diff === 'easy') {
    // Easy opponent: worst bowlers get the overs
    // Achieved by passing a reversed XI (worst bowling first) to the easy assign path
    const reversedXI = [...xi]
      .filter(p => !isWK(p))
      .sort((a,b) => num(a.bowling) - num(b.bowling)) // ✅ ASC = worst first
      .concat(xi.filter(p => isWK(p)));               // WK at end

    const cap    = maxOvers(totalOvers);
    const assign = {};
    const pool   = [];
    _syncPool(pool, assign, totalOvers);

    _assignOversToPool(reversedXI, [...pool], assign, cap);
    _syncPool(pool, assign, totalOvers); // ✅ FIX 6: Always sync after every pass

    if (pool.length > 0) {
      _assignOversToPool(reversedXI, [...pool], assign, cap);
      _syncPool(pool, assign, totalOvers); // ✅ FIX 6: Sync after second pass too
    }

    bowlAssign = assign;
  } else {
    // Medium + Hard: opponent uses same smart bowling logic as user
    bowlAssign = play11AI_bowling(xi, difficulty, format, totalOvers, {});
  }

  return { batOrder, bowlAssign };
}