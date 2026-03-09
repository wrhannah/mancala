# Walter vs Dad Mancala

Cleaned-up, static peer-to-peer version.

## Files

- `index.html`
- `style.css`
- `script.js`
- `README.md`

## Run

Use any simple static file server:

```bash
python3 -m http.server 4173
```

Then open `http://<your-lan-ip>:4173/` on both phones.

## Connection flow

- No login codes or accounts.
- First opener becomes Walter host.
- Second opener becomes Dad joiner.
- Devices sync directly via PeerJS.
