# Walter vs Dad Mancala (Peer-to-Peer)

This app is rearchitected to match the checkers style you shared:

- Static `index.html` + `script.js` + `style.css`
- PeerJS auto-role assignment with no codes
  - First opener becomes **Walter** (host)
  - Second opener becomes **Dad** (joiner)
- Direct browser-to-browser sync (no Firebase)

## Run locally

```bash
python3 -m http.server 4173
```

Open `http://<your-lan-ip>:4173/` on both phones.

## Notes

- No accounts and no login codes.
- Restart button is available to Dad (same control pattern as the sample).
- Existing Node game logic/tests are still present in repo for rule validation.
