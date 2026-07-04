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
- Clicking the extension button injects the controller on demand, so an already-open YouTube Music tab should not need a page refresh after the extension is loaded.
- Clicking the extension button opens the Document Picture-in-Picture mini player when Brave/Chrome supports it.
- If another YouTube Music tab is already open, the extension button asks that tab to open the mini player.
- If no YouTube Music tab is open, clicking the extension button opens `https://music.youtube.com/`.
- If Document Picture-in-Picture is unavailable or blocked, a regular popup fallback opens with playback controls.
- If no track is loaded yet, the player shows an empty state until YouTube Music starts playback.

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
- Disable or block Document Picture-in-Picture to verify the regular popup fallback.
- Verify track metadata changes when the song changes.
- Verify the Document Picture-in-Picture player opens and stays above other app windows when the API is available.
