const http = require('http');
const fs = require('fs');
const path = require('path');
const { createGameState, applyMove } = require('./game');

const PORT = process.env.PORT || 3000;
const ALLOWED_NAMES = ['Walter', 'Dad'];
const nameToIndex = { Walter: 0, Dad: 1 };

let gameState = createGameState();
const clients = new Set();

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

function publicState() {
  return {
    board: gameState.board,
    currentPlayer: gameState.currentPlayer,
    winner: gameState.winner,
    seats: [gameState.players[0]?.name || null, gameState.players[1]?.name || null]
  };
}

function broadcastState() {
  const payload = `data: ${JSON.stringify(publicState())}\n\n`;
  for (const client of clients) client.write(payload);
}

function serveRootStatic(req, res) {
  const file = req.url === '/' ? '/index.html' : req.url;
  const clean = file.replace(/\.\./g, '');
  const filePath = path.join(__dirname, clean);
  const allowed = ['/index.html', '/style.css', '/script.js'];
  if (!allowed.includes(clean)) {
    res.writeHead(404);
    res.end('Not found');
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

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/api/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });
    res.write(`data: ${JSON.stringify(publicState())}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  if ((req.method === 'GET' || req.method === 'HEAD') && (req.url === '/' || req.url === '/style.css' || req.url === '/script.js')) {
    serveRootStatic(req, res);
    return;
  }

  if (req.method === 'GET' && req.url === '/api/state') {
    sendJson(res, 200, publicState());
    return;
  }

  if (req.method === 'POST' && req.url === '/api/join') {
    try {
      const body = await readBody(req);
      if (!ALLOWED_NAMES.includes(body.name)) {
        sendJson(res, 400, { error: 'Please choose Walter or Dad.' });
        return;
      }
      gameState.players[nameToIndex[body.name]] = { name: body.name };
      const state = publicState();
      broadcastState();
      sendJson(res, 200, state);
    } catch {
      sendJson(res, 400, { error: 'Bad JSON' });
    }
    return;
  }

  if (req.method === 'POST' && req.url === '/api/move') {
    try {
      const body = await readBody(req);
      const playerIndex = nameToIndex[body.playerName];
      if (typeof playerIndex !== 'number') {
        sendJson(res, 400, { error: 'Invalid player.' });
        return;
      }
      if (gameState.currentPlayer !== playerIndex) {
        sendJson(res, 400, { error: 'Not your turn.' });
        return;
      }

      const result = applyMove(gameState, Number(body.pitIndex));
      if (!result.valid) {
        sendJson(res, 400, { error: 'Invalid move.' });
        return;
      }

      gameState = result.state;
      const state = publicState();
      broadcastState();
      sendJson(res, 200, state);
    } catch {
      sendJson(res, 400, { error: 'Bad request.' });
    }
    return;
  }

  if (req.method === 'POST' && req.url === '/api/reset') {
    gameState = createGameState();
    const state = publicState();
    broadcastState();
    sendJson(res, 200, state);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Mancala listening on http://localhost:${PORT}`);
});
