const state = {
  players: [],
  bets: {},
  history: [],
  roundNumber: 1,
  nextId: 1,
};

window.addEventListener('DOMContentLoaded', () => {
  renderPlayers();
  renderWinners();
  renderBalances();
  renderHistory();
  updatePot();
});

function addPlayer() {
  const nameInput    = document.getElementById('newPlayerName');
  const balanceInput = document.getElementById('newPlayerBalance');
  const name    = nameInput.value.trim();
  const balance = parseInt(balanceInput.value, 10);

  if (!name) { showToast('Enter a player name.', 'error'); return; }
  if (isNaN(balance) || balance <= 0) { showToast('Enter a valid starting balance.', 'error'); return; }

  const duplicate = state.players.some(p => p.name.toLowerCase() === name.toLowerCase());
  if (duplicate) { showToast('A player with that name already exists.', 'error'); return; }

  const player = { id: state.nextId++, name, balance, startBalance: balance, active: true };
  state.players.push(player);
  state.bets[player.id] = 0;

  nameInput.value    = '';
  balanceInput.value = '';
  nameInput.focus();

  renderPlayers();
  renderWinners();
  renderBalances();
  updatePot();
}

function removePlayer(id) {
  const inHistory = state.history.some(r => r.results.some(res => res.id === id));
  if (inHistory) {
    showToast("Can't delete — player has game history. Set them inactive instead.", 'error');
    return;
  }
  state.players = state.players.filter(p => p.id !== id);
  delete state.bets[id];
  renderPlayers();
  renderWinners();
  renderBalances();
  updatePot();
}

function toggleActive(id) {
  const player = state.players.find(p => p.id === id);
  if (!player) return;
  player.active = !player.active;
  if (!player.active) state.bets[id] = 0;
  renderPlayers();
  renderWinners();
  updatePot();
}

function onBetInput(id, value) {
  const raw = parseInt(value, 10);
  state.bets[id] = (!isNaN(raw) && raw >= 0) ? raw : 0;
  updatePot();
  renderWinners();
}

function getPot() {
  return Object.entries(state.bets)
    .filter(([id]) => {
      const p = state.players.find(p => p.id === parseInt(id));
      return p && p.active;
    })
    .reduce((sum, [, bet]) => sum + (bet > 0 ? bet : 0), 0);
}

function updatePot() {
  const pot = getPot();
  document.getElementById('potDisplay').textContent = pot.toLocaleString();
  const activeBettors = getActiveBettors();
  const sub = activeBettors.length > 0
    ? `${activeBettors.length} player${activeBettors.length !== 1 ? 's' : ''} in the pot`
    : 'Place bets to see the pot';
  document.getElementById('potSub').textContent = sub;
}

function settleRound() {
  const bettors = getActiveBettors();
  if (bettors.length === 0) { showToast('No bets placed. Nothing to settle.', 'error'); return; }

  const winnerIds = getSelectedWinnerIds();
  if (winnerIds.length === 0) { showToast('Select at least one winner.', 'error'); return; }

  for (const wid of winnerIds) {
    if (!bettors.some(b => b.id === wid)) {
      showToast('Winner(s) must have placed a bet.', 'error');
      return;
    }
  }

  const pot = bettors.reduce((s, b) => s + b.bet, 0);
  const n = winnerIds.length;
  const baseShare = Math.floor(pot / n);
  const remainder = pot - baseShare * n;

  const results = [];

  for (const bettor of bettors) {
    const isWinner = winnerIds.includes(bettor.id);
    let delta;

    if (isWinner) {
      const winnerIndex = winnerIds.indexOf(bettor.id);
      const share = baseShare + (winnerIndex === 0 ? remainder : 0);
      delta = share - bettor.bet;
    } else {
      delta = -bettor.bet;
    }

    const player = state.players.find(p => p.id === bettor.id);
    player.balance += delta;
    results.push({ id: bettor.id, name: bettor.name, bet: bettor.bet, delta, isWinner });
  }

  state.history.unshift({ round: state.roundNumber, pot, results });
  state.roundNumber++;

  for (const id in state.bets) { state.bets[id] = 0; }

  document.getElementById('roundNumber').textContent = state.roundNumber;
  renderPlayers();
  renderWinners();
  renderBalances();
  renderHistory();
  updatePot();
  renderLastRoundResult(state.history[0]);
  showToast('Round settled! ♠', 'success');
}

function resetBets() {
  for (const id in state.bets) { state.bets[id] = 0; }
  renderPlayers();
  updatePot();
  renderWinners();
  showToast('Bets cleared.', '');
}

function getActiveBettors() {
  return state.players
    .filter(p => p.active && state.bets[p.id] > 0)
    .map(p => ({ id: p.id, name: p.name, bet: state.bets[p.id] }));
}

function getSelectedWinnerIds() {
  const checkboxes = document.querySelectorAll('#winnerList input[type="checkbox"]:checked');
  return Array.from(checkboxes).map(cb => parseInt(cb.value));
}

function renderPlayers() {
  const container = document.getElementById('playerList');
  container.innerHTML = '';

  if (state.players.length === 0) {
    container.innerHTML = '<p class="empty-state">Add players to start.</p>';
    return;
  }

  for (const player of state.players) {
    const bet = state.bets[player.id] || 0;
    const row = document.createElement('div');
    row.className = 'player-row' + (player.active ? '' : ' inactive');
    row.innerHTML = `
      <span class="player-name ${!player.active ? 'inactive-label' : ''}">${escHtml(player.name)}</span>
      <input
        class="bet-input"
        type="number"
        min="0"
        placeholder="Bet"
        value="${bet > 0 ? bet : ''}"
        ${!player.active ? 'disabled' : ''}
        onchange="onBetInput(${player.id}, this.value)"
        oninput="onBetInput(${player.id}, this.value)"
      />
      <span class="player-balance-chip">${player.balance.toLocaleString()}</span>
      <button class="btn-toggle ${!player.active ? 'reactivate' : ''}" onclick="toggleActive(${player.id})">
        ${player.active ? 'Out' : 'In'}
      </button>
      <button class="btn-remove" onclick="removePlayer(${player.id})">✕</button>
    `;
    container.appendChild(row);
  }
}

function renderWinners() {
  const container = document.getElementById('winnerList');
  container.innerHTML = '';
  const bettors = getActiveBettors();

  if (bettors.length === 0) {
    container.innerHTML = '<p class="empty-winner">No active players with bets yet.</p>';
    return;
  }

  const prevSelected = getSelectedWinnerIds();

  for (const bettor of bettors) {
    const isChecked = prevSelected.includes(bettor.id);
    const row = document.createElement('label');
    row.className = 'winner-row' + (isChecked ? ' selected' : '');
    row.setAttribute('for', `winner_${bettor.id}`);
    row.innerHTML = `
      <input type="checkbox" id="winner_${bettor.id}" value="${bettor.id}"
        ${isChecked ? 'checked' : ''} onchange="onWinnerToggle(this, ${bettor.id})" />
      <span class="winner-name">${escHtml(bettor.name)}</span>
      <span class="winner-bet">Bet: ${bettor.bet.toLocaleString()}</span>
    `;
    container.appendChild(row);
  }
}

function onWinnerToggle(checkbox, id) {
  const row = checkbox.closest('.winner-row');
  checkbox.checked ? row.classList.add('selected') : row.classList.remove('selected');
}

function renderBalances() {
  const container = document.getElementById('balanceTable');
  container.innerHTML = '';

  if (state.players.length === 0) {
    container.innerHTML = '<p class="empty-state">No players yet.</p>';
    return;
  }

  for (const player of state.players) {
    const delta = player.balance - player.startBalance;
    const chip  = document.createElement('div');
    chip.className = 'balance-chip';

    let amtClass  = delta > 0 ? 'in-profit' : delta < 0 ? 'in-loss' : '';
    let deltaStr  = delta > 0 ? `+${delta.toLocaleString()}` : delta < 0 ? delta.toLocaleString() : '±0';
    let deltaClass = delta > 0 ? 'up' : delta < 0 ? 'down' : '';

    chip.innerHTML = `
      <span class="balance-chip-name">${escHtml(player.name)}</span>
      <span class="balance-chip-amount ${amtClass}">${player.balance.toLocaleString()}</span>
      <span class="balance-chip-delta ${deltaClass}">${deltaStr} from start</span>
    `;
    container.appendChild(chip);
  }
}

function renderLastRoundResult(round) {
  const card = document.getElementById('resultCard');
  const body = document.getElementById('resultBody');
  card.style.display = 'block';
  body.innerHTML = '';

  for (const r of round.results) {
    const div = document.createElement('div');
    div.className = 'result-row';
    const amountClass = r.delta > 0 ? 'positive' : r.delta < 0 ? 'negative' : 'neutral';
    const sign  = r.delta > 0 ? '+' : '';
    const crown = r.isWinner ? '<span class="result-crown">👑</span>' : '';
    div.innerHTML = `
      <span class="result-player">${crown}${escHtml(r.name)}</span>
      <span class="result-amount ${amountClass}">${sign}${r.delta.toLocaleString()}</span>
    `;
    body.appendChild(div);
  }
}

function renderHistory() {
  const container = document.getElementById('historyLog');
  container.innerHTML = '';

  if (state.history.length === 0) {
    container.innerHTML = '<p class="empty-state">No rounds played yet.</p>';
    return;
  }

  for (const entry of state.history) {
    const div = document.createElement('div');
    div.className = 'history-entry';

    const pillsHtml = entry.results.map(r => {
      const cls   = r.delta > 0 ? 'win' : r.delta < 0 ? 'loss' : 'zero';
      const sign  = r.delta >= 0 ? '+' : '';
      const crown = r.isWinner ? '👑 ' : '';
      return `<span class="history-pill ${cls}">${crown}${escHtml(r.name)} ${sign}${r.delta.toLocaleString()}</span>`;
    }).join('');

    div.innerHTML = `
      <div class="history-entry-header">
        <span class="history-round-label">ROUND ${entry.round}</span>
        <span class="history-pot">Pot: ${entry.pot.toLocaleString()}</span>
      </div>
      <div class="history-rows">${pillsHtml}</div>
    `;
    container.appendChild(div);
  }
}

let toastTimer = null;
function showToast(message, type) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show' + (type ? ` ${type}` : '');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
