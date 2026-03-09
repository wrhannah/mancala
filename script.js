const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const restartBtn = document.getElementById('restartBtn');
const connectionText = document.getElementById('connectionText');

const PLAYER_NAME = { 0: 'Walter', 1: 'Dad' };
const ROOM_ID = 'walter-vs-dad-mancala-room';

let state = createInitialState();
let peer = null;
let connection = null;
let myPlayerIndex = null;
let audioContext = null;
let lastMyTurnState = null;
let lastMoveSource = null;
let lastMoveTargets = new Set();

function createInitialState() {
  return { board: [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0], currentPlayer: 0, winner: null };
}
function ownedPitIndexes(playerIndex) { return playerIndex === 0 ? [0, 1, 2, 3, 4, 5] : [7, 8, 9, 10, 11, 12]; }
function storeIndex(playerIndex) { return playerIndex === 0 ? 6 : 13; }
function opponentStoreIndex(playerIndex) { return playerIndex === 0 ? 13 : 6; }
function isMyTurn() { return myPlayerIndex != null && state.currentPlayer === myPlayerIndex && !state.winner; }

function ensureAudioContext() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
}
function playTurnDing() {
  try {
    ensureAudioContext();
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, now);
    oscillator.frequency.exponentialRampToValueAtTime(1320, now + 0.1);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.25);
  } catch (_) {}
}
function startTurnFlash() { document.body.classList.add('turn-flash'); }
function stopTurnFlash() { document.body.classList.remove('turn-flash'); }
function speakTurnAlert() {
  if (!('speechSynthesis' in window) || myPlayerIndex == null) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(`It's your turn, ${PLAYER_NAME[myPlayerIndex]}`);
    utterance.rate = 1.1;
    window.speechSynthesis.speak(utterance);
  } catch (_) {}
}
function triggerTurnAlert() { playTurnDing(); startTurnFlash(); speakTurnAlert(); }

function applyMove(gameState, pitIndex) {
  const current = gameState.currentPlayer;
  if (gameState.winner) return null;
  if (!ownedPitIndexes(current).includes(pitIndex) || gameState.board[pitIndex] <= 0) return null;

  const board = [...gameState.board];
  const touched = [];
  let stones = board[pitIndex];
  board[pitIndex] = 0;
  let i = pitIndex;

  while (stones > 0) {
    i = (i + 1) % 14;
    if (i === opponentStoreIndex(current)) continue;
    board[i] += 1;
    touched.push(i);
    stones -= 1;
  }

  if (ownedPitIndexes(current).includes(i) && board[i] === 1 && board[12 - i] > 0) {
    const ownStore = storeIndex(current);
    board[ownStore] += board[12 - i] + 1;
    board[12 - i] = 0;
    board[i] = 0;
    touched.push(ownStore);
  }

  const next = {
    board,
    currentPlayer: i === storeIndex(current) ? current : 1 - current,
    winner: null,
    _lastMove: { source: pitIndex, targets: [...new Set(touched)] }
  };

  const p1Empty = ownedPitIndexes(0).every((idx) => next.board[idx] === 0);
  const p2Empty = ownedPitIndexes(1).every((idx) => next.board[idx] === 0);
  if (p1Empty || p2Empty) {
    for (const idx of ownedPitIndexes(0)) { next.board[6] += next.board[idx]; next.board[idx] = 0; }
    for (const idx of ownedPitIndexes(1)) { next.board[13] += next.board[idx]; next.board[idx] = 0; }
    if (next.board[6] > next.board[13]) next.winner = 0;
    else if (next.board[13] > next.board[6]) next.winner = 1;
    else next.winner = 'tie';
  }

  return next;
}

function updateStatus() {
  if (!connection || !connection.open || myPlayerIndex == null) {
    lastMyTurnState = null;
    stopTurnFlash();
    statusEl.textContent = 'Auto-connecting players...';
    return;
  }

  if (state.winner === 'tie') { statusEl.textContent = 'It is a tie!'; stopTurnFlash(); return; }
  if (state.winner === 0 || state.winner === 1) { statusEl.textContent = `${PLAYER_NAME[state.winner]} wins!`; stopTurnFlash(); return; }

  const myTurnNow = isMyTurn();
  if (myTurnNow && lastMyTurnState !== true) triggerTurnAlert();
  if (!myTurnNow) stopTurnFlash();
  lastMyTurnState = myTurnNow;

  const currentName = PLAYER_NAME[state.currentPlayer];
  statusEl.textContent = myTurnNow ? `${currentName}'s turn (your move)` : `${currentName}'s turn (waiting)`;
}

function drawBoard() {
  boardEl.innerHTML = '';
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

  updateStatus();
}

function addStonesVisual(container, count, jumping = false) {
  const stonesWrap = document.createElement('div');
  stonesWrap.className = 'stones';
  const visibleCount = Math.min(count, 12);
  for (let i = 0; i < visibleCount; i += 1) {
    const stone = document.createElement('span');
    stone.className = `stone${jumping ? ' jump' : ''}`;
    stone.style.animationDelay = `${i * 25}ms`;
    stonesWrap.appendChild(stone);
  }
  container.appendChild(stonesWrap);
}

function makeStore(index, label) {
  const el = document.createElement('button');
  el.className = 'store';
  el.disabled = true;
  el.setAttribute('aria-label', `${label}: ${state.board[index]} stones`);

  const text = document.createElement('div');
  text.className = 'pit-label';
  text.textContent = `${label}: ${state.board[index]}`;
  el.appendChild(text);
  const isTarget = lastMoveTargets.has(index);
  addStonesVisual(el, state.board[index], isTarget);

  if (isTarget) el.classList.add('move-target');
  return el;
}

function makePit(index, col, row) {
  const el = document.createElement('button');
  el.className = 'pit';
  el.style.gridColumn = String(col);
  el.style.gridRow = String(row);
  el.setAttribute('aria-label', `Pit ${index} with ${state.board[index]} stones`);

  const text = document.createElement('div');
  text.className = 'pit-label';
  text.textContent = String(state.board[index]);
  el.appendChild(text);
  const isTarget = lastMoveTargets.has(index);
  addStonesVisual(el, state.board[index], isTarget);

  const mine = myPlayerIndex === 0 ? index <= 5 : myPlayerIndex === 1 ? (index >= 7 && index <= 12) : false;
  const playable = mine && isMyTurn() && state.board[index] > 0;
  if (playable) {
    el.classList.add('playable');
    el.addEventListener('click', () => {
      const next = applyMove(state, index);
      if (!next) return;
      state = next;
      syncMoveHighlights();
      drawBoard();
      sendMessage({ type: 'state', state });
    });
  }

  if (lastMoveSource === index) el.classList.add('move-source');
  if (isTarget) el.classList.add('move-target');
  if (state.currentPlayer === 0 && index <= 5) el.classList.add('active');
  if (state.currentPlayer === 1 && index >= 7 && index <= 12) el.classList.add('active');
  return el;
}

function syncMoveHighlights() {
  const move = state._lastMove;
  lastMoveSource = move?.source ?? null;
  lastMoveTargets = new Set(move?.targets || []);
}

function clearMoveHighlights() {
  lastMoveSource = null;
  lastMoveTargets = new Set();
}

function restartGame(sendRestart = false) {
  state = createInitialState();
  clearMoveHighlights();
  lastMyTurnState = null;
  stopTurnFlash();
  drawBoard();
  if (sendRestart) sendMessage({ type: 'restart', state });
}

function sendMessage(payload) {
  if (connection && connection.open) connection.send(payload);
}

function setConnectedState() {
  restartBtn.style.display = myPlayerIndex === 1 ? 'inline-block' : 'none';
  restartBtn.disabled = myPlayerIndex !== 1;
}

function bindConnectionHandlers(conn) {
  connection = conn;

  connection.on('open', () => {
    setConnectedState();
    connectionText.textContent = `Connected: You are ${PLAYER_NAME[myPlayerIndex]}.`;
    drawBoard();
    if (myPlayerIndex === 0) sendMessage({ type: 'state', state });
  });

  connection.on('data', (data) => {
    if (data.type === 'state' || data.type === 'restart') {
      state = data.state;
      syncMoveHighlights();
      lastMyTurnState = null;
      drawBoard();
    }
  });

  connection.on('close', () => {
    stopTurnFlash();
    statusEl.textContent = 'Connection closed. Refresh to auto-reconnect.';
    connectionText.textContent = 'Disconnected.';
    restartBtn.disabled = true;
  });

  connection.on('error', () => {
    statusEl.textContent = 'Connection error. Refresh and try again.';
  });
}

function becomeWalterHost() {
  myPlayerIndex = 0;
  peer = new Peer(ROOM_ID);
  connectionText.textContent = 'You are Walter. Waiting for Dad to auto-join...';
  peer.on('open', () => {
    statusEl.textContent = 'Waiting for Dad to join...';
  });
  peer.on('connection', (incomingConnection) => {
    bindConnectionHandlers(incomingConnection);
    restartGame(false);
  });
  peer.on('error', (error) => {
    if (error.type === 'peer-unavailable') return;
    statusEl.textContent = 'Network error. Refresh and retry.';
  });
}

function becomeDadJoiner() {
  myPlayerIndex = 1;
  peer = new Peer();
  connectionText.textContent = 'You are Dad. Auto-joining Walter...';
  peer.on('open', () => {
    const conn = peer.connect(ROOM_ID, { reliable: true });
    bindConnectionHandlers(conn);
  });
  peer.on('error', () => {
    statusEl.textContent = 'Unable to auto-join. Refresh both devices and retry.';
  });
}

function autoJoinGame() {
  const probe = new Peer(ROOM_ID);
  probe.on('open', () => {
    probe.destroy();
    becomeWalterHost();
  });
  probe.on('error', (error) => {
    probe.destroy();
    if (error.type === 'unavailable-id') {
      becomeDadJoiner();
      return;
    }
    statusEl.textContent = 'Auto-join failed. Refresh and retry.';
  });
}

restartBtn.addEventListener('click', () => {
  if (!connection || !connection.open || myPlayerIndex !== 1) return;
  restartGame(true);
});

document.addEventListener('pointerdown', ensureAudioContext, { passive: true });
document.addEventListener('keydown', ensureAudioContext);

restartBtn.style.display = 'none';
restartBtn.disabled = true;
clearMoveHighlights();
drawBoard();
autoJoinGame();
