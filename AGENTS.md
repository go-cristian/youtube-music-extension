# Agent Instructions

## Collaboration

- Work in Spanish for conversation by default. Keep code, commits, docs, and store listing artifacts in English.
- The user has opted out of tickets for this project. Do not ask for or create Linear tickets unless explicitly requested later.
- Prefer implementation over long planning when the user gives a clear instruction.
- For visual UI iterations, use the user's screenshots as ground truth and preserve the parts they explicitly call out as working.

## Git

- This repo tracks GitHub at `git@github.com:go-cristian/youtube-music-extension.git`.
- Commits and pushes are allowed only after the user explicitly asks for them.
- Before staging, run a fresh `git status --short`, list the exact files that will be staged, and avoid staging generated release artifacts unless the user specifically asks.
- `dist/` is generated output and should stay uncommitted by default.

## Validation

Before reporting implementation work as complete, run:

```bash
npm run typecheck
npm run lint
npm run build
npm test
```

The expected passing test count is currently `22 pass, 0 fail`.

## Extension Release

- `manifest.json` and `package.json` versions should stay aligned.
- Generate store icons with:

```bash
npm run assets
```

- Build the Chrome Web Store package with:

```bash
npm run package
```

- The generated upload package is `dist/youtube-music-floating-player-0.1.1.zip`.
- Store screenshots live in `store-assets/screenshots/`.
- Chrome Web Store screenshots should be `1280x800`.
- When cropping screenshots from full desktop captures, preserve the mini player in the lower-right area.
- Use `docs/chrome-web-store-release.md` for permission justifications, listing notes, and automation notes.

## Chrome Web Store Privacy

- The extension's single purpose is: provide a themed floating mini player for controlling YouTube Music playback on `music.youtube.com`.
- The extension should declare no user data collection.
- If a privacy policy URL is needed, use:

```text
https://github.com/go-cristian/youtube-music-extension/blob/main/PRIVACY.md
```

- Select "No, I am not using remote code" in Chrome Web Store privacy practices. All JavaScript, CSS, icons, themes, and assets are bundled in the package.
- Permission justifications:
  - `tabs`: find, focus, or open the YouTube Music tab when the user clicks the extension button.
  - `scripting`: inject the content script into an already-open YouTube Music tab when needed.
  - `storage`: save the selected mini player theme locally.
  - `https://music.youtube.com/*`: read playback state and send playback commands only on YouTube Music.

## Product Notes

- The extension targets Brave and Chrome through Chromium extension APIs.
- The primary flow is: click extension button, focus/open YouTube Music, show the in-page "Open mini player" recovery button, and open Document Picture-in-Picture from that user gesture.
- Document Picture-in-Picture requires user activation. Do not claim automatic PiP can always open without a user gesture.
- Theme layouts are intentionally configurable through `src/themes.json`; keep theme-specific visual decisions there when possible.
- `Tile` is the strongest baseline theme. Preserve it when exploring more experimental themes.
- Avoid overlapping controls, seekbars, metadata, or theme buttons. Screenshots are the final arbiter for visual polish.
