# Walter vs Dad Mancala

This version uses the same architecture style as a typical local multiplayer checkers app:
- Node server keeps shared game state in memory.
- Browser clients join as `Walter` or `Dad`.
- Clients receive live updates over Server-Sent Events (SSE).

## Run locally

```bash
npm start
```

Open `http://localhost:3000` on two phones on the same network.

## API

- `GET /api/state`
- `POST /api/join` with `{ "name": "Walter" | "Dad" }`
- `POST /api/move` with `{ "playerName": "Walter" | "Dad", "pitIndex": number }`
- `POST /api/reset`
- `GET /api/stream` for live state updates (SSE)

## Notes

- No login codes or accounts.
- Seats are fixed to `Walter` and `Dad`.
- Game state resets when server restarts.
