let myPlayer = null;
let state = null;

const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const identityEl = document.getElementById('identity');
const joinErrorEl = document.getElementById('join-error');
const seatsEl = document.getElementById('seats');

function playerIndexFromName(name) {
  return name === 'Walter' ? 0 : name === 'Dad' ? 1 : null;
}

async function api(path, body) {
  const resp = await fetch(path, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || 'Request failed');
  return data;
}

document.querySelectorAll('[data-name]').forEach((button) => {
  button.addEventListener('click', async () => {
    try {
      const name = button.dataset.name;
      state = await api('/api/join', { name });
      myPlayer = name;
      identityEl.textContent = `You are ${name}.`;
      joinErrorEl.textContent = '';
      render();
    } catch (err) {
      joinErrorEl.textContent = err.message;
    }
  });
});

document.getElementById('reset-btn').addEventListener('click', async () => {
  try {
    state = await api('/api/reset', {});
    render();
  } catch (err) {
    joinErrorEl.textContent = err.message;
  }
});

function connectStream() {
  const events = new EventSource('/api/stream');
  events.onmessage = (event) => {
    state = JSON.parse(event.data);
    render();
  };
  events.onerror = async () => {
    events.close();
    setTimeout(connectStream, 1000);
    try {
      state = await api('/api/state');
      render();
    } catch {
      // ignore while reconnecting
    }
  };
}

async function loadInitialState() {
  try {
    state = await api('/api/state');
    render();
  } catch (err) {
    joinErrorEl.textContent = err.message;
  }
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
      try {
        state = await api('/api/move', { playerName: myPlayer, pitIndex: index });
        render();
      } catch (err) {
        joinErrorEl.textContent = err.message;
      }
    });
  }

  if (state.currentPlayer === 0 && index <= 5) el.classList.add('active');
  if (state.currentPlayer === 1 && index >= 7 && index <= 12) el.classList.add('active');

  return el;
}

loadInitialState();
connectStream();
