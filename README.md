# Walter vs Dad Mancala

Flattened single-folder layout (no `public/` or `test/` directories).

## Files in root

- `index.html`
- `style.css`
- `script.js`
- `server.js`
- `game.js`
- `package.json`

## Run

```bash
npm start
```

Open `http://<your-lan-ip>:3000/` on both phones.

## Notes

- No login codes or accounts.
- First opener becomes Walter host; second becomes Dad joiner (PeerJS flow in `script.js`).
- Server API is still available for state/join/move/reset and SSE stream.
