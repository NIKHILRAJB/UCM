// ─── lineup-popups.js ─────────────────────────────────────────
import {
  $, show, hide, esc, num, toast,
  isWK, roleEmoji, buildTags, pName, pNameFromList,
  teamName, maxOvers,
  calcCR, captainModeBadge, captainTierLabel
} from './lineup-helpers.js';
import { play11AI_batting, play11AI_bowling } from './lineup-ai.js';

// ── Module-level state refs ───────────────────────────────────
let _state, _slot, _allPlayers, _allVenues;
let _xiSelected = [];
let _xiFilter   = 'ALL';

export function initPopups(state, slot, allPlayers, allVenues) {
  _state      = state;
  _slot       = slot;
  _allPlayers = allPlayers;
  _allVenues  = allVenues;
}

export function updatePopupRefs(allPlayers, allVenues) {
  if (allPlayers) _allPlayers = allPlayers;
  if (allVenues)  _allVenues  = allVenues;
}

// ═══════════════════════════════════════════
// XI POPUP
// ═══════════════════════════════════════════
export function openXIPopup(onConfirm) {
  _xiSelected = _state.userXI.map(p => p.id);
  _xiFilter   = 'ALL';

  _allPlayers = window.dbAll(
    'SELECT * FROM Players WHERE team_id=? ORDER BY ps DESC', [_slot.userTeam]) || [];

  $('xi-filters').querySelectorAll('.lu-filter-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.role === 'ALL'));

  $('xi-popup-title').textContent = `Your XI — ${teamName(_slot.userTeam)}`;
  $('xi-search').value = '';

  $('xi-filters').querySelectorAll('.lu-filter-btn').forEach(btn => {
    const fresh = btn.cloneNode(true);
    btn.parentNode.replaceChild(fresh, btn);
    fresh.addEventListener('click', () => {
      _xiFilter = fresh.dataset.role;
      $('xi-filters').querySelectorAll('.lu-filter-btn')
        .forEach(b => b.classList.toggle('active', b === fresh));
      renderXIList();
    });
  });

  renderXIList();
  show('scrim-xi');
  show('sheet-xi');

  window.closeXIPopup = () => { hide('scrim-xi'); hide('sheet-xi'); };
  window.filterXIList = () => renderXIList();
  window.confirmXI    = () => _confirmXI(onConfirm);
}

function renderXIList() {
  const query = ($('xi-search')?.value || '').trim().toLowerCase();
  let   list  = [..._allPlayers];

  if (_xiFilter && _xiFilter !== 'ALL') {
    list = list.filter(p => {
      const r = (p.role || '').toUpperCase();
      switch (_xiFilter) {
        case 'WK':        return isWK(p);
        case 'BAT':       return r.includes('BAT') && !r.includes('ALL') && !isWK(p);
        case 'BOWL':      return r.includes('BOWL') && !r.includes('ALL') && !isWK(p);
        case 'ALL-ROUND': return r.includes('ALL');
        default:          return true;
      }
    });
  }

  if (query) {
    list = list.filter(p => p.name.toLowerCase().includes(query));
  }

  const wkCount = _xiSelected.filter(id => {
    const p = _allPlayers.find(pl => String(pl.id) === String(id));
    return p && isWK(p);
  }).length;

  $('xi-count-bar').textContent = `${_xiSelected.length} / 11 selected`;

  const rules = $('xi-rules-bar');
  if (rules) {
    rules.textContent = wkCount >= 1 ? '✅ Wicketkeeper included' : '⚠️ At least 1 Wicketkeeper required';
    rules.className   = 'lu-xi-rules' + (wkCount >= 1 ? ' ok' : '');
  }

  const container = $('xi-player-list');
  container.innerHTML = '';

  if (!list.length) {
    container.innerHTML =
      `<div style="text-align:center;padding:32px;color:rgba(255,255,255,.35);font-size:.85rem">
        No players found for this filter
      </div>`;
    return;
  }

  list.forEach(p => {
    const sel   = _xiSelected.includes(p.id);
    const maxed = _xiSelected.length >= 11 && !sel;
    const card  = document.createElement('div');
    card.className =
      `lu-player-card${sel ? ' selected' : ''}${maxed ? ' disabled' : ''}`;

    card.innerHTML = `
      <div class="lu-player-avatar">${roleEmoji(p.role)}</div>
      <div class="lu-player-info">
        <div class="lu-player-name">${esc(p.name)}</div>
        <div class="lu-player-tags">${buildTags(p)}</div>
      </div>
      <div class="lu-player-scores">
        <div class="lu-score-row">BAT <span>${p.batting ?? '—'}</span></div>
        <div class="lu-score-row">BWL <span>${p.bowling ?? '—'}</span></div>
        <div class="lu-score-row">PS&nbsp;<span>${p.ps    ?? '—'}</span></div>
      </div>
      <div class="lu-check-icon">✓</div>
    `;

    let pressTimer;
    card.addEventListener('pointerdown',  () => { pressTimer = setTimeout(() => openPlayerDetail(p), 500); });
    card.addEventListener('pointerup',    () => clearTimeout(pressTimer));
    card.addEventListener('pointerleave', () => clearTimeout(pressTimer));

    card.addEventListener('click', e => {
      if (e.defaultPrevented) return;
      clearTimeout(pressTimer);
      const idx = _xiSelected.indexOf(p.id);
      if (idx > -1) {
        _xiSelected.splice(idx, 1);
      } else {
        if (_xiSelected.length >= 11) { toast('11 players already selected.'); return; }
        _xiSelected.push(p.id);
      }
      renderXIList();
    });

    const infoBtn = document.createElement('button');
    infoBtn.innerHTML     = 'ℹ️';
    infoBtn.style.cssText =
      'background:none;border:none;cursor:pointer;font-size:.9rem;padding:2px 5px;flex-shrink:0';
    infoBtn.addEventListener('click', e => { e.stopPropagation(); openPlayerDetail(p); });
    card.appendChild(infoBtn);
    container.appendChild(card);
  });
}

function _confirmXI(onConfirm) {
  if (_xiSelected.length !== 11) { toast('Select exactly 11 players.'); return; }
  const hasWK = _xiSelected.some(id => {
    const p = _allPlayers.find(pl => String(pl.id) === String(id));
    return p && isWK(p);
  });
  if (!hasWK) { toast('You need at least 1 Wicketkeeper.'); return; }

  _state.userXI       = _xiSelected.map(id => _allPlayers.find(p => p.id === id)).filter(Boolean);
  _state.userBatOrder = _state.userXI.map(p => p.id);

  // ✅ Auto-captain: pick highest CR first, fallback to highest PS
  const bestCap = [..._state.userXI].sort((a, b) => calcCR(b) - calcCR(a))[0];
  _state.userCaptain = bestCap?.id ||
    _state.userXI.reduce((b, p) => num(p.ps) > num(b?.ps) ? p : b, _state.userXI[0])?.id;

  const totalOvers  = Number(_slot.overs) || 20;
  _state.bowlAssign = play11AI_bowling(
    _state.userXI, _slot.difficulty, _formatFromOvers(), totalOvers, {});

  hide('scrim-xi'); hide('sheet-xi');
  if (onConfirm) onConfirm();
}

//  ════════════════════════════════════════
// PLAYER DETAIL  ✅ batInfo / bowlInfo fix
// ═══════════════════════════════════════════
export function openPlayerDetail(p) {
  document.getElementById('pd-title').textContent = p.name;

  const natDisplay = (p.nationality || p.team_id || p.teamid || '').toUpperCase();

  // ── Resolve DB column names (support both camelCase and snake_case) ──
  const batHand  = p.bat_hand  || p.bathand  || 'Right Hand';
  const batPos   = p.bat_position || p.batpos || p.bat_pos || null;
  const bowlHand = p.bowl_hand || p.bowlhand || null;
  const bowlType = p.bowl_type || p.bowltype || null;

  // ── Batting info ──────────────────────────────────────────
  const batParts = [
    batHand ? `${batHand} Bat` : null,
    batPos  ? batPos           : null,
  ].filter(Boolean);
  const batInfo = batParts.join(' · ');   // e.g. "Right Hand Bat · Top Order"

  // ── Bowling info ──────────────────────────────────────────
  const isBatter  = !bowlType && !bowlHand;
  const bowlParts = [
    bowlHand ? bowlHand : null,
    bowlType ? bowlType : null,
  ].filter(Boolean);
  const bowlInfo = bowlParts.join(' · '); // e.g. "Right Arm · Fast"

  // ── Resolve stat columns ──────────────────────────────────
  const batRating   = p.bat_rating   ?? p.batting   ?? p.bat  ?? '---';
  const bowlRating  = p.bowl_rating  ?? p.bowling   ?? p.bowl ?? '---';
  const fieldRating = p.field_rating ?? p.fielding  ?? p.field ?? '---';
  const wkRating    = p.wk_rating    ?? p.wicket    ?? p.wk   ?? '---';
  const psVal       = p.power_score  ?? p.ps        ?? '---';

  // ── Captain info ──────────────────────────────────────────
  const cr    = calcCR(p);
  const tier  = captainTierLabel(cr);
  const mode  = captainModeBadge(p.captain_mode || p.captainmode);
  const isMat = cr >= 60;


  document.getElementById('pd-body').innerHTML = `
    <div class="lu-pd-hero">
      <div class="lu-pd-avatar">${roleEmoji(p.role)}</div>
      <div class="lu-pd-hero-right">
        <div class="lu-pd-name">${esc(p.name)} <span class="lu-pd-age">(${p.age ?? '?'})</span></div>
        <div class="lu-pd-role-nat">
          <span class="lu-pd-role-pill">${esc(p.role)}</span>
          ${natDisplay ? `<span class="lu-pd-nat">${esc(natDisplay)}</span>` : ''}
        </div>

        <!-- 🏏 Batting row -->
        <div class="lu-pd-style-row">
          <span class="lu-pd-style-icon">🏏</span>
          <span class="lu-pd-style-txt">
            ${batInfo.length > 0 ? esc(batInfo) : esc(batHand + ' Bat')}
          </span>
        </div>

        <!-- ⚾ Bowling row — shows bowl info or "---" for pure batters/WKs -->
        <div class="lu-pd-style-row">
          <span class="lu-pd-style-icon">⚾</span>
          <span class="lu-pd-style-txt ${isBatter ? 'lu-pd-style-na' : ''}">
            ${isBatter ? '---' : (bowlInfo.length > 0 ? esc(bowlInfo) : '---')}
          </span>
        </div>
      </div>
    </div>

    <div class="lu-pd-stats-grid">
      <div class="lu-pd-stat">
        <div class="lu-pd-stat-val">${batRating}</div>
        <div class="lu-pd-stat-lbl">Batting</div>
      </div>
      <div class="lu-pd-stat">
        <div class="lu-pd-stat-val">${bowlRating}</div>
        <div class="lu-pd-stat-lbl">Bowling</div>
      </div>
      <div class="lu-pd-stat">
        <div class="lu-pd-stat-val">${fieldRating}</div>
        <div class="lu-pd-stat-lbl">Fielding</div>
      </div>
      <div class="lu-pd-stat">
        <div class="lu-pd-stat-val">${wkRating}</div>
        <div class="lu-pd-stat-lbl">Wkt Keeping</div>
      </div>
      <div class="lu-pd-stat">
        <div class="lu-pd-stat-val">${psVal}</div>
        <div class="lu-pd-stat-lbl">Prof Score</div>
      </div>
      <div class="lu-pd-stat lu-pd-stat--cr">
        <div class="lu-pd-stat-val lu-pd-cr-val ${cr >= 90 ? 'wc' : cr >= 75 ? 'exp' : cr >= 60 ? 'decent' : 'weak'}">${cr}</div>
        <div class="lu-pd-stat-lbl">Captain CR</div>
      </div>
    </div>

    <div class="lu-pd-tags-wrap">
      ${buildTags(p)}
      ${isWK(p)      ? '<span class="lu-tag blue">Wicketkeeper</span>' : ''}
      ${p.isoverseas ? '<span class="lu-tag red">Overseas</span>'      : ''}
      ${p.isyouth    ? '<span class="lu-tag green">Youth</span>'       : ''}
    </div>

    <div class="lu-pd-captain-block">
      <div class="lu-pd-captain-title">
        <span>Captain Profile</span>
        <span class="lu-pd-cr-badge ${cr >= 90 ? 'wc' : cr >= 75 ? 'exp' : cr >= 60 ? 'decent' : 'weak'}">CR ${cr}</span>
      </div>
      <div class="lu-pd-captain-meta">
        <span class="lu-cap-mode ${esc((p.captain_mode || p.captainmode || '').toLowerCase())}">${mode.emoji} ${esc(mode.label)}</span>
        <span class="lu-pd-tier-pill">${tier.icon} ${esc(tier.label)}</span>
        ${isMat ? '<span class="lu-pd-capmat-pill">✅ Captain Material</span>' : ''}
      </div>
    </div>

    ${p.bio ? `<div class="lu-pd-bio">${esc(p.bio)}</div>` : ''}
  `;


  // ── Safe selBtn block ──────────────────────────────────────
  const selBtn = document.getElementById('pd-select-btn');
  if (selBtn) {
    const already = _xiSelected.includes(p.id);

    selBtn.textContent       = already ? 'Remove from XI' : 'Add to XI';
    selBtn.style.background  = already ? 'rgba(224,85,85,.25)' : '';
    selBtn.style.borderColor = already ? 'rgba(224,85,85,.5)'  : '';

    selBtn.onclick = () => {
      const idx = _xiSelected.indexOf(p.id);
      if (idx !== -1) {
        _xiSelected.splice(idx, 1);
      } else {
        if (_xiSelected.length >= 11) { toast('11 players already selected.'); return; }
        _xiSelected.push(p.id);
      }
      hide('scrim-player-detail');
      hide('sheet-player-detail');
      renderXIList();
    };
  }
  // ──────────────────────────────────────────────────────────


  show('scrim-player-detail');
  show('sheet-player-detail');

  window.closePlayerDetail = () => {
    hide('scrim-player-detail');
    hide('sheet-player-detail');
  };
}

// ═══════════════════════════════════════════
// BATTING ORDER
// ═══════════════════════════════════════════
export function openBatOrder(onConfirm, locked = false) {
  _renderBatOrderList(_state.userBatOrder);
  show('scrim-bat-order'); show('sheet-bat-order');

  const autoBtn  = $('btn-bat-auto');
  const clearBtn = $('btn-bat-clear');

  if (locked) {
    if (autoBtn)  { autoBtn.disabled  = true; autoBtn.style.opacity  = '.35'; }
    if (clearBtn) { clearBtn.disabled = true; clearBtn.style.opacity = '.35'; }
    $('bat-order-list').style.pointerEvents = 'none';
    $('bat-order-list').style.opacity       = '.65';
  } else {
    if (autoBtn)  { autoBtn.disabled  = false; autoBtn.style.opacity  = '1'; }
    if (clearBtn) { clearBtn.disabled = false; clearBtn.style.opacity = '1'; }
    $('bat-order-list').style.pointerEvents = '';
    $('bat-order-list').style.opacity       = '';

    if (autoBtn) {
      autoBtn.onclick = () => {
        const ordered = play11AI_batting(_state.userXI, _slot.difficulty, _formatFromOvers());
        _renderBatOrderList(ordered);
        toast('Auto arranged by Play11 AI ✨');
      };
    }
    if (clearBtn) {
      clearBtn.onclick = () => {
        _renderBatOrderList(_state.userXI.map(p => p.id));
        toast('Reset to XI order');
      };
    }
  }

  window.closeBatOrder   = () => { hide('scrim-bat-order'); hide('sheet-bat-order'); };
  window.confirmBatOrder = () => {
    if (!locked) {
      _state.userBatOrder = _getOrderIds('bat-order-list');
    }
    hide('scrim-bat-order'); hide('sheet-bat-order');
    if (onConfirm) onConfirm();
  };
}

function _renderBatOrderList(order) {
  renderOrderList('bat-order-list', order, _state.userXI, 'batting');
}

// ═══════════════════════════════════════════
// BOWLING ASSIGN
// ═══════════════════════════════════════════
export function openBowlAssign(onConfirm, locked = false) {
  const totalOvers = Number(_slot.overs) || 20;
  const cap        = maxOvers(totalOvers);
  $('bowl-assign-title').textContent = `Bowling Plan — ${totalOvers} Overs`;
  $('bowl-assign-info').textContent  =
    `Max ${cap} overs per bowler · No consecutive overs · Tap chips to assign`;

  renderBowlAssign(totalOvers, cap, locked);
  show('scrim-bowl-assign'); show('sheet-bowl-assign');

  const autoBtn  = $('btn-bowl-auto');
  const clearBtn = $('btn-bowl-clear');

  if (locked) {
    if (autoBtn)  { autoBtn.disabled  = true; autoBtn.style.opacity  = '.35'; }
    if (clearBtn) { clearBtn.disabled = true; clearBtn.style.opacity = '.35'; }
  } else {
    if (autoBtn)  { autoBtn.disabled  = false; autoBtn.style.opacity  = '1'; }
    if (clearBtn) { clearBtn.disabled = false; clearBtn.style.opacity = '1'; }

    if (autoBtn) {
      autoBtn.onclick = () => {
        _state.bowlAssign = play11AI_bowling(
          _state.userXI, _slot.difficulty, _formatFromOvers(),
          totalOvers, _state.bowlAssign);
        renderBowlAssign(totalOvers, cap, false);
        toast('Bowling plan auto-filled by Play11 AI ✨');
      };
    }
    if (clearBtn) {
      clearBtn.onclick = () => {
        _state.bowlAssign = {};
        renderBowlAssign(totalOvers, cap, false);
        toast('Bowling plan cleared');
      };
    }
  }

  window.closeBowlAssign   = () => { hide('scrim-bowl-assign'); hide('sheet-bowl-assign'); };
  window.confirmBowlAssign = () => {
    const assigned = Object.values(_state.bowlAssign).flat().length;
    if (!locked && assigned < totalOvers) {
      toast(`Saved. ${totalOvers - assigned} overs will auto-fill at match start.`);
    }
    hide('scrim-bowl-assign'); hide('sheet-bowl-assign');
    if (onConfirm) onConfirm();
  };
}

export function renderBowlAssign(totalOvers, cap, locked = false) {
  const body = $('bowl-assign-body');
  body.innerHTML = '';
  _updateBowlProgress(totalOvers);

  const getTakenOvers = exceptPid => {
    const taken = new Set();
    Object.entries(_state.bowlAssign).forEach(([pid, ovs]) => {
      if (String(pid) !== String(exceptPid)) ovs.forEach(o => taken.add(Number(o)));
    });
    return taken;
  };

  const allXI = [..._state.userXI].sort((a, b) => num(b.bowling) - num(a.bowling));

  allXI.forEach(p => {
    if (isWK(p)) {
      const rowEl = document.createElement('div');
      rowEl.className = 'lu-bowler-row lu-bowler-wk-disabled';
      rowEl.innerHTML = `
        <div class="lu-bowler-row-head">
          <span class="lu-bowler-name">
            🧤 ${esc(p.name)}
            <span style="font-size:.65rem;color:rgba(255,255,255,.3);margin-left:6px">
              Keeper — cannot bowl
            </span>
          </span>
        </div>`;
      body.appendChild(rowEl);
      return;
    }

    const myOvers  = (_state.bowlAssign[p.id] || []).map(Number);
    const takenSet = getTakenOvers(p.id);
    const mySet    = new Set(myOvers);
    const atCap    = myOvers.length >= cap;

    let chips = '';
    for (let ov = 1; ov <= totalOvers; ov++) {
      const isMine       = mySet.has(ov);
      const isTakenOther = takenSet.has(ov);
      const isConsec     = !isMine && !isTakenOther && (mySet.has(ov - 1) || mySet.has(ov + 1));
      const isBlocked    = isTakenOther || isConsec || (!isMine && atCap) || locked;

      let cls = 'lu-over-chip';
      if (isMine)            cls += ' selected';
      else if (isTakenOther) cls += ' taken';
      else if (isConsec)     cls += ' consecutive';

      const title = isConsec     ? 'Consecutive overs not allowed'
                  : isTakenOther ? 'Assigned to another bowler' : '';

      chips += `<div class="${cls}"
        data-over="${ov}" data-pid="${p.id}"
        ${isBlocked && !isMine ? 'data-blocked="1"' : ''}
        title="${title}">${ov}</div>`;
    }

    const rowEl = document.createElement('div');
    rowEl.className = 'lu-bowler-row';
    rowEl.innerHTML = `
      <div class="lu-bowler-row-head">
        <span class="lu-bowler-name">
          ${esc(p.name)}
          ${num(p.bowling) > 0
            ? `<span style="font-size:.64rem;color:#F5A623;margin-left:4px">BWL ${num(p.bowling)}</span>`
            : `<span style="font-size:.62rem;color:rgba(255,255,255,.35);margin-left:4px">Batter</span>`}
        </span>
        <span class="lu-bowler-cap"><span>${myOvers.length}</span> / ${cap} overs</span>
      </div>
      <div class="lu-over-grid">${chips}</div>
    `;

    if (!locked) {
      rowEl.querySelectorAll('.lu-over-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          if (chip.dataset.blocked === '1') return;
          const ov  = Number(chip.dataset.over);
          const pid = chip.dataset.pid;
          if (!_state.bowlAssign[pid]) _state.bowlAssign[pid] = [];
          const arr = _state.bowlAssign[pid].map(Number);
          const idx = arr.indexOf(ov);
          if (idx > -1) {
            arr.splice(idx, 1);
          } else {
            if (arr.length >= cap) { toast(`Max ${cap} overs per bowler.`); return; }
            const s = new Set(arr);
            if (s.has(ov - 1) || s.has(ov + 1)) {
              toast('No consecutive overs allowed.'); return;
            }
            arr.push(ov);
            arr.sort((a, b) => a - b);
          }
          _state.bowlAssign[pid] = arr;
          renderBowlAssign(totalOvers, cap, false);
        });
      });
    }

    body.appendChild(rowEl);
  });
}

function _updateBowlProgress(totalOvers) {
  const assigned = Object.values(_state.bowlAssign).flat().length;
  const prog     = $('bowl-progress-row');
  if (!prog) return;
  const pct = Math.min(100, (assigned / totalOvers) * 100);
  prog.innerHTML = `
    <span>${assigned} / ${totalOvers}</span>
    <div class="lu-bowl-prog-bar">
      <div class="lu-bowl-prog-fill" style="width:${pct}%"></div>
    </div>
    <span style="color:${assigned >= totalOvers ? '#6fcf6f' : '#F5A623'}">
      ${assigned >= totalOvers ? '✅ Complete' : '⚠️ Partial (OK to save)'}
    </span>`;
}

// ═══════════════════════════════════════════
// CAPTAIN  ✅ Full CR + Mode + Tier upgrade
// ═══════════════════════════════════════════
export function openCaptain(onConfirm, locked = false) {
  const grid = $('captain-grid');
  grid.innerHTML = '';

  // ✅ Sort by CR descending so best captains appear first
  const sorted = [..._state.userXI].sort((a, b) => calcCR(b) - calcCR(a));

  sorted.forEach(p => {
    const cr    = calcCR(p);
    const tier  = captainTierLabel(cr);
    const mode  = captainModeBadge(p.captain_mode);
    const isCap = String(_state.userCaptain) === String(p.id);
    const isMat = cr >= 60;

    const tile = document.createElement('div');
    tile.className =
      `lu-captain-tile${isCap ? ' selected' : ''}${!isMat ? ' lu-captain-dim' : ''}`;

    tile.innerHTML = `
      <div class="lu-cap-top-row">
        <div class="lu-cap-avatar">${roleEmoji(p.role)}</div>
        <div class="lu-cap-info">
          <div class="lu-cap-name">
            ${esc(p.name)}
            ${isCap ? '<span class="lu-cap-badge-c">© Captain</span>' : ''}
          </div>
           <div class="lu-cap-ps">${esc(p.role)} · CR ${cr}</div>
    `;

    if (!locked) {
      tile.addEventListener('click', () => {
        _state.userCaptain = p.id;
        grid.querySelectorAll('.lu-captain-tile').forEach(t => {
          t.classList.remove('selected');
          const badge = t.querySelector('.lu-cap-badge-c');
          if (badge) badge.remove();
        });
        tile.classList.add('selected');
        const nameEl = tile.querySelector('.lu-cap-name');
        if (nameEl && !nameEl.querySelector('.lu-cap-badge-c')) {
          const badge = document.createElement('span');
          badge.className   = 'lu-cap-badge-c';
          badge.textContent = '© Captain';
          nameEl.appendChild(badge);
        }
      });
    } else {
      tile.style.pointerEvents = 'none';
      tile.style.opacity       = '0.7';
    }

    grid.appendChild(tile);
  });

  show('scrim-captain'); show('sheet-captain');
  window.closeCaptain   = () => { hide('scrim-captain'); hide('sheet-captain'); };
  window.confirmCaptain = () => {
    if (!locked && !_state.userCaptain) { toast('Please select a captain.'); return; }
    hide('scrim-captain'); hide('sheet-captain');
    if (onConfirm) onConfirm();
  };
}

// ═══════════════════════════════════════════
// VENUE
// ═══════════════════════════════════════════
export function openVenue(onConfirm, locked = false) {
  const list = $('venue-list');
  list.innerHTML = '';

  const userTeamRow = window.dbAll('SELECT country FROM Teams WHERE id=?', [_slot.userTeam])[0];
  const oppTeamRow  = window.dbAll('SELECT country FROM Teams WHERE id=?', [_slot.oppTeam])[0];
  const userCountry = (userTeamRow?.country || '').toLowerCase();
  const oppCountry  = (oppTeamRow?.country  || '').toLowerCase();

  const classify = v => {
    if (v.team_id) {
      if (String(v.team_id) === String(_slot.userTeam)) return 'home';
      if (String(v.team_id) === String(_slot.oppTeam))  return 'away';
      return 'neutral';
    }
    const vc = (v.country || '').toLowerCase();
    if (userCountry && vc.includes(userCountry)) return 'home';
    if (oppCountry  && vc.includes(oppCountry))  return 'away';
    return 'neutral';
  };

  const home    = _allVenues.filter(v => classify(v) === 'home').slice(0, 3);
  const away    = _allVenues.filter(v => classify(v) === 'away').slice(0, 3);
  const neutral = _allVenues.filter(v => classify(v) === 'neutral').slice(0, 3);

  const fallbackNeutrals = [
    { id:'neu1', name:"Lord's Cricket Ground", country:'England',   pitch_type:'Batting', team_id:null },
    { id:'neu2', name:'MCG — Melbourne',        country:'Australia', pitch_type:'Pace',    team_id:null },
    { id:'neu3', name:'Eden Gardens',           country:'India',     pitch_type:'Spin',    team_id:null },
  ];

  const sections = [
    { label:'🏠 Home Venues',    cls:'home',    items:home.length    ? home    : [], empty:`No home venues found for ${teamName(_slot.userTeam)}` },
    { label:'✈️ Away Venues',    cls:'away',    items:away.length    ? away    : [], empty:`No away venues found for ${teamName(_slot.oppTeam)}`  },
    { label:'⚖️ Neutral Venues', cls:'neutral', items:neutral.length ? neutral : fallbackNeutrals, empty:'' },
  ];

  sections.forEach(sec => {
    const hdr = document.createElement('div');
    hdr.className   = `lu-venue-section-hdr ${sec.cls}`;
    hdr.textContent = sec.label;
    list.appendChild(hdr);

    if (!sec.items.length) {
      const empty = document.createElement('div');
      empty.style.cssText =
        'padding:10px 16px;font-size:.78rem;color:rgba(255,255,255,.3);font-style:italic';
      empty.textContent = sec.empty;
      list.appendChild(empty);
      return;
    }

    sec.items.forEach(v => {
      const card = document.createElement('div');
      card.className = `lu-venue-card${_state.venueId === v.id ? ' selected' : ''}`;
      card.innerHTML = `
        <div>
          <div class="lu-venue-name">${esc(v.name)}</div>
          <div class="lu-venue-country">${esc(v.country || '—')}</div>
        </div>
        <div class="lu-venue-pitch">${esc(v.pitch_type || 'Balanced')} · ${esc(v.pitch_condition || 'Good')}</div>
      `;
      if (!locked) {
        card.addEventListener('click', () => {
          _state.venueId = v.id;
          list.querySelectorAll('.lu-venue-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
        });
      }
      list.appendChild(card);
    });
  });

  show('scrim-venue'); show('sheet-venue');
  window.closeVenue   = () => { hide('scrim-venue'); hide('sheet-venue'); };
  window.confirmVenue = () => {
    if (!locked && !_state.venueId) { toast('Please select a venue.'); return; }
    hide('scrim-venue'); hide('sheet-venue');
    if (onConfirm) onConfirm();
  };
}

// ═══════════════════════════════════════════
// OPPONENT DETAIL
// ═══════════════════════════════════════════
export function openOppDetail() {
  const oName = teamName(_slot.oppTeam);
  $('opp-detail-title').textContent = `${oName} — Details`;
  const body = $('opp-detail-body');
  body.innerHTML = '';
  // ── Playing XI ────────────────────────────────────────────
  const xiSec = document.createElement('div');
  xiSec.className = 'lu-opp-section';
  xiSec.innerHTML = `
    <div class="lu-opp-section-label">👥 Playing XI</div>
    <div class="lu-opp-section-val">
      ${_state.oppXI.map((p, i) => `
        <div class="lu-opp-player-row">
          <span class="lu-opp-num">${i + 1}.</span>
          <span class="lu-opp-pname">${esc(p.name)}</span>
          <span style="margin-left:4px">${roleEmoji(p.role)}</span>
          ${String(p.id) === String(_state.oppCaptain)
            ? '<span class="lu-opp-cap-badge">C</span>' : ''}
          ${isWK(p) ? '<span class="lu-opp-wk-badge">WK</span>' : ''}
        </div>`).join('')}
    </div>`;
  body.appendChild(xiSec);
// ── Batting Order ─────────────────────────────────────────
  const batSec = document.createElement('div');
  batSec.className = 'lu-opp-section';
  batSec.innerHTML = `
    <div class="lu-opp-section-label">🏏 Batting Order</div>
    <div class="lu-opp-section-val">
      ${_state.oppBatOrder.map((pid, i) => {
        const p = _state.oppXI.find(pl => String(pl.id) === String(pid));
        if (!p) return '';
        return `
          <div class="lu-opp-player-row">
            <span class="lu-opp-num">${i + 1}.</span>
            <span class="lu-opp-pname">${esc(p.name)}</span>
            ${String(p.id) === String(_state.oppCaptain)
              ? '<span class="lu-opp-cap-badge">C</span>' : ''}
            ${isWK(p) ? '<span class="lu-opp-wk-badge">WK</span>' : ''}
          </div>`;
      }).join('')}
    </div>`;
  body.appendChild(batSec);
  // ── Opponent Captain info ──────────────────────────────────
  const oppCap = _state.oppXI.find(p => String(p.id) === String(_state.oppCaptain));
  if (oppCap) {
    const cr   = calcCR(oppCap);
    const mode = captainModeBadge(oppCap.captain_mode);
    const tier = captainTierLabel(cr);
    const capInfoSec = document.createElement('div');
    capInfoSec.className = 'lu-opp-section';
    capInfoSec.innerHTML = `
      <div class="lu-opp-section-label">🎖️ Their Captain</div>
      <div class="lu-opp-section-val">
        <div class="lu-opp-player-row">
          <span class="lu-opp-pname">${esc(oppCap.name)}</span>
          <span class="lu-opp-cap-badge">C</span>
          <span style="margin-left:8px;font-size:.75rem;color:#F5A623">CR ${cr}</span>
          <span style="margin-left:6px;font-size:.75rem;color:rgba(255,255,255,.6)">${mode.emoji} ${esc(mode.label)}</span>
          <span style="margin-left:6px;font-size:.7rem;color:rgba(255,255,255,.4)">${tier.icon} ${esc(tier.label)}</span>
        </div>
      </div>`;
    body.appendChild(capInfoSec);
  }

  

  // ── Bowling Plan ──────────────────────────────────────────
  const bowlEntries = Object.entries(_state.oppBowlAssign).filter(([, ov]) => ov.length > 0);
  const bowlSec = document.createElement('div');
  bowlSec.className = 'lu-opp-section';
  bowlSec.innerHTML = `
    <div class="lu-opp-section-label">⚡ Bowling Plan</div>
    <div class="lu-opp-section-val">
      ${bowlEntries.length
        ? bowlEntries.map(([pid, ov]) => {
            const p = _state.oppXI.find(pl => String(pl.id) === String(pid));
            return p ? `
              <div class="lu-opp-player-row">
                <span class="lu-opp-pname">${esc(p.name)}</span>
                <span class="lu-opp-ovs">${ov.join(', ')}</span>
              </div>` : '';
          }).join('')
        : '<span style="color:rgba(255,255,255,.35)">— Auto-assigned —</span>'}
    </div>`;
  body.appendChild(bowlSec);



  show('scrim-opp-detail'); show('sheet-opp-detail');
  window.closeOppDetail = () => {
    hide('scrim-opp-detail'); hide('sheet-opp-detail');
  };
}

// ═══════════════════════════════════════════
// SHARED ORDER LIST (drag + arrow)
// ═══════════════════════════════════════════
export function renderOrderList(listId, order, xi, scoreKey) {
  const list = $(listId);
  list.innerHTML = '';
  let dragSrc = null;

  order.forEach((pid, idx) => {
    const p = xi.find(pl => String(pl.id) === String(pid));
    if (!p) return;

    const row = document.createElement('div');
    row.className   = 'lu-order-row';
    row.draggable   = true;
    row.dataset.pid = String(pid);

    row.innerHTML = `
      <span class="lu-order-num">${idx + 1}</span>
      <span class="lu-order-name">${esc(p.name)}</span>
      <span class="lu-order-meta">
        ${scoreKey === 'batting' ? `BAT ${p.batting ?? '—'}` : `BWL ${p.bowling ?? '—'}`}
        · PS ${p.ps ?? '—'}
      </span>
      <div class="lu-order-arrows">
        <button class="lu-arr-btn" data-dir="up">▲</button>
        <button class="lu-arr-btn" data-dir="down">▼</button>
      </div>
      <span class="lu-drag-handle">⠿</span>
    `;

    row.querySelectorAll('.lu-arr-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const rows = [...list.querySelectorAll('.lu-order-row')];
        const i    = rows.indexOf(row);
        if (btn.dataset.dir === 'up'   && i > 0)              list.insertBefore(row, rows[i - 1]);
        if (btn.dataset.dir === 'down' && i < rows.length - 1) list.insertBefore(rows[i + 1], row);
        list.querySelectorAll('.lu-order-row').forEach((r, ri) =>
          r.querySelector('.lu-order-num').textContent = ri + 1);
      });
    });

    row.addEventListener('dragstart', e => {
      dragSrc = row;
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => row.classList.add('dragging'), 0);
    });
    row.addEventListener('dragend', () => {
      row.classList.remove('dragging');
      list.querySelectorAll('.lu-order-row').forEach((r, i) =>
        r.querySelector('.lu-order-num').textContent = i + 1);
    });
    row.addEventListener('dragover', e => {
      e.preventDefault();
      if (row === dragSrc) return;
      list.querySelectorAll('.lu-order-row').forEach(r => r.classList.remove('drag-over'));
      row.classList.add('drag-over');
      const all = [...list.querySelectorAll('.lu-order-row')];
      const si = all.indexOf(dragSrc), ti = all.indexOf(row);
      if (si < ti) list.insertBefore(dragSrc, row.nextSibling);
      else         list.insertBefore(dragSrc, row);
    });
    row.addEventListener('drop', e => e.preventDefault());

    _addTouchDrag(row, list);
    list.appendChild(row);
  });
}

function _addTouchDrag(row, list) {
  const handle = row.querySelector('.lu-drag-handle');
  if (!handle) return;
  let startY = 0, clone = null;

  handle.addEventListener('touchstart', e => {
    e.preventDefault();
    startY = e.touches[0].clientY;
    row.classList.add('dragging');
    const rect = row.getBoundingClientRect();
    clone = row.cloneNode(true);
    clone.style.cssText =
      `position:fixed;left:${rect.left}px;top:${rect.top}px;
       width:${rect.width}px;opacity:.82;z-index:9999;pointer-events:none;
       border-radius:13px;background:rgba(245,166,35,.15);border:1.5px solid #F5A623;`;
    document.body.appendChild(clone);
  }, { passive: false });

  handle.addEventListener('touchmove', e => {
    e.preventDefault();
    if (!clone) return;
    const dy = e.touches[0].clientY - startY;
    clone.style.top = (row.getBoundingClientRect().top + dy) + 'px';
    const midY   = e.touches[0].clientY;
    const rows   = [...list.querySelectorAll('.lu-order-row')];
    const target = rows.find(r => {
      if (r === row) return false;
      const br = r.getBoundingClientRect();
      return midY >= br.top && midY <= br.bottom;
    });
    if (target) {
      const si = rows.indexOf(row), ti = rows.indexOf(target);
      if (si < ti) list.insertBefore(row, target.nextSibling);
      else         list.insertBefore(row, target);
      list.querySelectorAll('.lu-order-row').forEach((r, i) =>
        r.querySelector('.lu-order-num').textContent = i + 1);
    }
  }, { passive: false });

  handle.addEventListener('touchend', () => {
    row.classList.remove('dragging');
    if (clone) { clone.remove(); clone = null; }
    list.querySelectorAll('.lu-order-row').forEach((r, i) =>
      r.querySelector('.lu-order-num').textContent = i + 1);
  });
}

function _getOrderIds(listId) {
  return [...$(listId).querySelectorAll('.lu-order-row')].map(r => r.dataset.pid);
}

function _formatFromOvers() {
  const o = Number(_slot?.overs) || 20;
  if (o <= 5)  return 'T5';
  if (o <= 10) return 'T10';
  if (o <= 20) return 'T20';
  if (o <= 50) return 'ODI';
  return 'Test';
}