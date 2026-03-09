const http = require('http');
const fs = require('fs');
const path = require('path');
const { createGameState, applyMove } = require('./game');

const PORT = process.env.PORT || 3000;
const ALLOWED_NAMES = ['Walter', 'Dad'];
const nameToIndex = { Walter: 0, Dad: 1 };

let gameState = createGameState();

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function serveStatic(req, res) {
  const file = req.url === '/' ? '/index.html' : req.url;
  const clean = file.replace(/\.\./g, '');
  const filePath = path.join(__dirname, 'public', clean);

  if (!filePath.startsWith(path.join(__dirname, 'public'))) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath);
    const types = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8'
    };

    res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain; charset=utf-8' });
    res.end(data);
  });
}

function publicState() {
  return {
    board: gameState.board,
    currentPlayer: gameState.currentPlayer,
    winner: gameState.winner,
    seats: [gameState.players[0]?.name || null, gameState.players[1]?.name || null]
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url.startsWith('/styles.css') || req.url.startsWith('/app.js'))) {
    serveStatic(req, res);
    return;
  }

  if (req.method === 'GET' && req.url === '/api/state') {
    sendJson(res, 200, publicState());
    return;
  }

  if (req.method === 'POST' && req.url === '/api/join') {
    try {
      const body = await readBody(req);
      const name = body.name;
      if (!ALLOWED_NAMES.includes(name)) {
        sendJson(res, 400, { error: 'Please choose Walter or Dad.' });
        return;
      }

      const idx = nameToIndex[name];
      gameState.players[idx] = { name };
      sendJson(res, 200, publicState());
    } catch {
      sendJson(res, 400, { error: 'Bad JSON' });
    }
    return;
  }

  if (req.method === 'POST' && req.url === '/api/move') {
    try {
      const body = await readBody(req);
      const { playerName, pitIndex } = body;
      const playerIndex = nameToIndex[playerName];
      if (typeof playerIndex !== 'number') {
        sendJson(res, 400, { error: 'Invalid player.' });
        return;
      }
      if (gameState.currentPlayer !== playerIndex) {
        sendJson(res, 400, { error: 'Not your turn.' });
        return;
      }

      const result = applyMove(gameState, Number(pitIndex));
      if (!result.valid) {
        sendJson(res, 400, { error: 'Invalid move.' });
        return;
      }

      gameState = result.state;
      sendJson(res, 200, publicState());
    } catch {
      sendJson(res, 400, { error: 'Bad request.' });
    }
    return;
  }

  if (req.method === 'POST' && req.url === '/api/reset') {
    gameState = createGameState();
    sendJson(res, 200, publicState());
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Mancala listening on http://localhost:${PORT}`);
});
