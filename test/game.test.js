const test = require('node:test');
const assert = require('node:assert/strict');
const { createGameState, applyMove } = require('../game');

test('initial state is valid', () => {
  const state = createGameState();
  assert.equal(state.board.length, 14);
  assert.equal(state.currentPlayer, 0);
});

test('player gets extra turn when ending in own store', () => {
  const state = createGameState();
  state.board = [0, 0, 0, 0, 0, 1, 0, 4, 4, 4, 4, 4, 4, 0];
  const result = applyMove(state, 5);
  assert.equal(result.valid, true);
  assert.equal(result.state.currentPlayer, 0);
  assert.equal(result.state.board[6], 1);
});

test('capture works correctly', () => {
  const state = createGameState();
  state.board = [1, 0, 1, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0];
  const result = applyMove(state, 2);
  assert.equal(result.valid, true);
  assert.equal(result.state.board[6], 7);
  assert.equal(result.state.board[3], 0);
  assert.equal(result.state.board[9], 0);
});
