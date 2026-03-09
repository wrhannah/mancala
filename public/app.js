let myPlayer = null;
let state = null;

const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const identityEl = document.getElementById('identity');
const joinErrorEl = document.getElementById('join-error');
const seatsEl = document.getElementById('seats');

document.querySelectorAll('[data-name]').forEach((button) => {
  button.addEventListener('click', async () => {
    const name = button.dataset.name;
    const resp = await fetch('/api/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });

    const data = await resp.json();
    if (!resp.ok) {
      joinErrorEl.textContent = data.error || 'Could not join';
      return;
    }

    myPlayer = name;
    identityEl.textContent = `You are ${name}.`;
    joinErrorEl.textContent = '';
    state = data;
    render();
  });
});

document.getElementById('reset-btn').addEventListener('click', async () => {
  await fetch('/api/reset', { method: 'POST' });
  await refreshState();
});

async function refreshState() {
  const resp = await fetch('/api/state');
  state = await resp.json();
  render();
}

setInterval(refreshState, 1000);
refreshState();

function playerIndexFromName(name) {
  return name === 'Walter' ? 0 : name === 'Dad' ? 1 : null;
}

function render() {
  if (!state) return;
  boardEl.innerHTML = '';

  seatsEl.textContent = `Walter seat: ${state.seats[0] ? 'Taken' : 'Open'} | Dad seat: ${state.seats[1] ? 'Taken' : 'Open'}`;

  const topRow = [12, 11, 10, 9, 8, 7];
  const bottomRow = [0, 1, 2, 3, 4, 5];

  const dadStore = makeStore(13, 'Dad Store');
  dadStore.style.gridColumn = '1';
  const walterStore = makeStore(6, 'Walter Store');
  walterStore.style.gridColumn = '8';

  boardEl.appendChild(dadStore);
  for (let col = 0; col < topRow.length; col += 1) boardEl.appendChild(makePit(topRow[col], col + 2, 1));
  for (let col = 0; col < bottomRow.length; col += 1) boardEl.appendChild(makePit(bottomRow[col], col + 2, 2));
  boardEl.appendChild(walterStore);

  const currentName = state.currentPlayer === 0 ? 'Walter' : 'Dad';
  if (state.winner === 'tie') statusEl.textContent = 'It is a tie!';
  else if (state.winner === 0 || state.winner === 1) statusEl.textContent = `${state.winner === 0 ? 'Walter' : 'Dad'} wins!`;
  else statusEl.textContent = `${currentName}'s turn.`;
}

function makeStore(index, label) {
  const el = document.createElement('button');
  el.className = 'store';
  el.disabled = true;
  el.textContent = `${label}: ${state.board[index]}`;
  return el;
}

function makePit(index, col, row) {
  const el = document.createElement('button');
  el.className = 'pit';
  el.style.gridColumn = String(col);
  el.style.gridRow = String(row);
  el.textContent = String(state.board[index]);

  const myIndex = playerIndexFromName(myPlayer);
  const mine = myIndex === 0 ? index <= 5 : index >= 7 && index <= 12;
  const playable = myIndex != null && mine && state.currentPlayer === myIndex && state.board[index] > 0 && !state.winner;
  if (playable) {
    el.classList.add('playable');
    el.addEventListener('click', async () => {
      await fetch('/api/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: myPlayer, pitIndex: index })
      });
      await refreshState();
    });
  }

  if (state.currentPlayer === 0 && index <= 5) el.classList.add('active');
  if (state.currentPlayer === 1 && index >= 7 && index <= 12) el.classList.add('active');

  return el;
}
