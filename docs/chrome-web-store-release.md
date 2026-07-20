# Chrome Web Store Release Notes

## Package

- Version: `0.1.1`
- Package: `dist/youtube-music-floating-player-0.1.1.zip`
- Extension name: YouTube Music Floating Player
- Short description: Control YouTube Music from a themed always-on-top mini player.

## Assets

- Icon 16: `assets/icons/icon-16.png`
- Icon 32: `assets/icons/icon-32.png`
- Icon 48: `assets/icons/icon-48.png`
- Icon 128: `assets/icons/icon-128.png`
- Source icon: `assets/icons/icon.svg`

## Permission Justification

- `tabs`: finds or opens the existing YouTube Music tab when the extension button is clicked.
- `scripting`: injects the content script on demand if YouTube Music was already open before the extension loaded.
- `storage`: saves the selected PiP theme locally.
- `https://music.youtube.com/*`: limits extension behavior to YouTube Music pages.

## Store Listing Draft

YouTube Music Floating Player adds a modern mini player for YouTube Music with play/pause, previous/next, seek controls, Quick Picks, and configurable visual themes. It uses Chromium Document Picture-in-Picture when available so the player can stay visible above other windows.

The extension does not collect, sell, or transmit personal data. Theme preference is saved locally in the browser.

## Screenshot Checklist

- Tile theme with active song: `store-assets/screenshots/tile-theme.jpg`
- Console theme with active song: `store-assets/screenshots/console-theme.jpg`
- Glass theme with active song: `store-assets/screenshots/glass-theme.jpg`
- Stack theme with active song: `store-assets/screenshots/stack-theme.jpg`
- Signal theme with active song: `store-assets/screenshots/signal-theme.jpg`

## Automation Notes

Chrome Web Store publishing can be automated after the item exists in the Developer Dashboard.

Required values for CI:

- `CHROME_WEBSTORE_PUBLISHER_ID`
- `CHROME_WEBSTORE_EXTENSION_ID`
- `CHROME_WEBSTORE_CLIENT_ID`
- `CHROME_WEBSTORE_CLIENT_SECRET`
- `CHROME_WEBSTORE_REFRESH_TOKEN`

The automated flow should:

1. Run `npm run assets`.
2. Run `npm run typecheck`, `npm run lint`, `npm run build`, and `npm test`.
3. Run `npm run package`.
4. Request an OAuth access token.
5. Upload `dist/youtube-music-floating-player-0.1.1.zip`.
6. Publish the uploaded draft, which submits it for Chrome Web Store review.

Initial store listing, privacy fields, and first manual publishing setup still need to happen in the Chrome Web Store Developer Dashboard.
