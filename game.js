function createInitialBoard() {
  return [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0];
}

function ownedPitIndexes(playerIndex) {
  return playerIndex === 0 ? [0, 1, 2, 3, 4, 5] : [7, 8, 9, 10, 11, 12];
}

function storeIndex(playerIndex) {
  return playerIndex === 0 ? 6 : 13;
}

function opponentStoreIndex(playerIndex) {
  return playerIndex === 0 ? 13 : 6;
}

function isValidMove(state, pitIndex) {
  if (state.winner) return false;
  if (pitIndex == null || Number.isNaN(pitIndex)) return false;
  if (!ownedPitIndexes(state.currentPlayer).includes(pitIndex)) return false;
  return state.board[pitIndex] > 0;
}

function collectRemainingStones(state) {
  const board = state.board;
  const p1Empty = ownedPitIndexes(0).every((i) => board[i] === 0);
  const p2Empty = ownedPitIndexes(1).every((i) => board[i] === 0);

  if (!p1Empty && !p2Empty) return;

  if (!p1Empty) {
    for (const i of ownedPitIndexes(0)) {
      board[6] += board[i];
      board[i] = 0;
    }
  }

  if (!p2Empty) {
    for (const i of ownedPitIndexes(1)) {
      board[13] += board[i];
      board[i] = 0;
    }
  }

  if (board[6] > board[13]) state.winner = 0;
  else if (board[13] > board[6]) state.winner = 1;
  else state.winner = 'tie';
}

function applyMove(state, pitIndex) {
  if (!isValidMove(state, pitIndex)) {
    return { valid: false, state };
  }

  const board = [...state.board];
  let stones = board[pitIndex];
  board[pitIndex] = 0;
  let i = pitIndex;

  while (stones > 0) {
    i = (i + 1) % 14;
    if (i === opponentStoreIndex(state.currentPlayer)) continue;
    board[i] += 1;
    stones -= 1;
  }

  const currentOwned = ownedPitIndexes(state.currentPlayer);
  if (
    currentOwned.includes(i) &&
    board[i] === 1 &&
    board[12 - i] > 0
  ) {
    const ownStore = storeIndex(state.currentPlayer);
    board[ownStore] += board[12 - i] + 1;
    board[12 - i] = 0;
    board[i] = 0;
  }

  const ownStore = storeIndex(state.currentPlayer);
  const nextPlayer = i === ownStore ? state.currentPlayer : 1 - state.currentPlayer;

  const nextState = {
    ...state,
    board,
    currentPlayer: nextPlayer,
    winner: null
  };

  collectRemainingStones(nextState);

  return { valid: true, state: nextState };
}

function createGameState() {
  return {
    board: createInitialBoard(),
    currentPlayer: 0,
    winner: null,
    players: [null, null]
  };
}

module.exports = {
  createGameState,
  applyMove,
  ownedPitIndexes
};
