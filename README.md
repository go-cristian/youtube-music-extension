# YouTube Music Floating Player

Brave/Chrome extension for controlling YouTube Music from a modern floating panel inspired by Winamp.

## Install In Brave Or Chrome

1. Open `brave://extensions` or `chrome://extensions`.
2. Enable developer mode.
3. Click **Load unpacked**.
4. Select this folder: `/Users/cristiangomez/repos/iyubinest/youtube control`.
5. Open `https://music.youtube.com`.

## MVP Behavior

- No controls are injected into the YouTube Music page.
- Clicking the extension button opens the Document Picture-in-Picture mini player when Brave/Chrome supports it.
- If another YouTube Music tab is already open, the extension button asks that tab to open the mini player.
- If no YouTube Music tab is open, clicking the extension button opens `https://music.youtube.com/`.

## Validate

Run:

```bash
npm run typecheck
npm run lint
npm run build
npm test
```

Manual checks:

- Pin the extension button in Brave/Chrome.
- Click the extension button while a `https://music.youtube.com` tab is open.
- Verify play/pause, previous, and next controls in the mini player.
- Verify track metadata changes when the song changes.
- Verify the pop-out player opens and stays above other app windows when Document Picture-in-Picture is available.
