# PiP Theme System Plan

## Goal

Add a configurable theme system for the YouTube Music mini player so the PiP window can switch between multiple visual designs while keeping the same playback and Quick picks functionality.

## Current Context

The extension currently:

- Opens YouTube Music from the browser extension button.
- Shows an `Open mini player` button inside YouTube Music.
- Opens a Document Picture-in-Picture mini player from that in-page button.
- Supports play/pause, previous, next, seekbar, artwork, metadata, and Quick picks.
- Shows Quick picks when no track is loaded.
- Shows a Quick picks drawer when a track is playing.

There are also pending local changes for:

- Square artwork.
- Improved seekbar behavior.
- Quick picks extraction and rendering.
- A local `design-preview.html` comparing three visual directions.

## Theme System Direction

The theme system should not allow arbitrary HTML or JavaScript in JSON. Themes should configure known safe blocks and design tokens. The renderer remains responsible for creating DOM.

Supported blocks:

- `artwork`
- `metadata`
- `progress`
- `controls`
- `quickPicks`
- `themePicker`

Supported Quick picks modes:

- `drawer`
- `sidePanel`
- `tray`

Supported animation names:

- `none`
- `fade`
- `slide-up`
- `scale-soft`

## Proposed Theme Shape

```json
{
  "id": "mini-dashboard",
  "name": "Mini Dashboard",
  "shortName": "Dashboard",
  "tokens": {
    "surface": "#111318",
    "surfaceAlt": "#171b22",
    "textPrimary": "#f6f7fb",
    "textMuted": "#aab2bd",
    "accent": "#ffcc33",
    "radius": "8px",
    "gap": "12px"
  },
  "layout": {
    "type": "grid",
    "areas": [
      "meta artwork",
      "progress artwork",
      "controls artwork",
      "quickPicks quickPicks",
      "themePicker themePicker"
    ],
    "columns": "minmax(0, 1fr) 176px"
  },
  "blocks": {
    "artwork": {
      "visible": true,
      "area": "artwork",
      "shape": "square"
    },
    "metadata": {
      "visible": true,
      "area": "meta"
    },
    "progress": {
      "visible": true,
      "area": "progress"
    },
    "controls": {
      "visible": true,
      "area": "controls",
      "variant": "buttons"
    },
    "quickPicks": {
      "visible": true,
      "area": "quickPicks",
      "mode": "drawer"
    },
    "themePicker": {
      "visible": true,
      "area": "themePicker"
    }
  },
  "animations": {
    "drawer": "slide-up",
    "themeSwitch": "fade"
  }
}
```

## Task 1: Add Theme Definitions

Create `src/themes.json`.

Initial themes:

- `command-deck`
- `album-tile`
- `mini-dashboard`

Each theme should define:

- identity: `id`, `name`, `shortName`
- color and spacing tokens
- layout grid
- block visibility and placement
- Quick picks mode
- animation names

## Task 2: Add Theme Engine

Create `src/themeEngine.js`.

Responsibilities:

- Load theme definitions.
- Resolve a theme by id.
- Fall back to `mini-dashboard`.
- Normalize missing theme fields with defaults.
- Convert tokens into CSS variables.
- Reject unknown block names by ignoring them.
- Expose a small API:

```js
export function getTheme(themeId);
export function getDefaultTheme();
export function getThemeOptions();
export function themeToCssVariables(theme);
```

## Task 3: Persist Selected Theme

Use `chrome.storage.local`.

Behavior:

- On PiP open, read `selectedThemeId`.
- If missing, use `mini-dashboard`.
- When user picks a theme, save it immediately.
- Theme changes should not restart playback, close PiP, or reset current state.

Manifest change:

- Add `storage` permission.

## Task 4: Refactor PiP Rendering

Modify `src/pip.js`.

Separate these responsibilities:

- Shell creation.
- Theme application.
- Block rendering.
- Event binding.
- State update.

The PiP should render known blocks:

- metadata block
- artwork block
- progress/seek block
- controls block
- Quick picks block
- theme picker block

The current hardcoded layout becomes the `mini-dashboard` theme.

## Task 5: Add Theme Picker Inside PiP

Add a theme picker at the bottom of the PiP.

Presentation:

```text
Deck | Tile | Dashboard
```

Behavior:

- Always visible when `themePicker.visible` is true.
- Active theme uses the theme accent color.
- Click changes theme immediately.
- Selection persists through `chrome.storage.local`.
- Picker does not affect playback.

Implementation sketch:

```html
<nav class="theme-picker" data-block="themePicker">
  <button data-theme-id="command-deck">Deck</button>
  <button data-theme-id="album-tile">Tile</button>
  <button data-theme-id="mini-dashboard">Dashboard</button>
</nav>
```

## Task 6: Implement Theme Layouts

### Command Deck

Intent:

- Dense.
- Slightly retro.
- Tool-like.
- Quick scanning.

Layout:

- Metadata in a terminal-like display.
- Controls as prominent command buttons.
- Quick picks as compact stacked rows.
- Artwork is optional or small.

Quick picks mode:

- `sidePanel` or compact list.

### Album Tile

Intent:

- Visual and music-first.
- Artwork dominates.
- Controls are secondary.

Layout:

- Large square artwork.
- Metadata near or over artwork.
- Controls below artwork.
- Quick picks as a tray.

Quick picks mode:

- `tray`.

### Mini Dashboard

Intent:

- Most practical.
- Balanced between controls and recommendations.

Layout:

- Player controls and metadata on one side.
- Square artwork on the other.
- Quick picks available through drawer or visible side panel.

Quick picks mode:

- `drawer` initially.

## Task 7: Keep Quick Picks Functional Across Themes

The current Quick picks behavior must remain:

- If no song is loaded, show Quick picks as the primary content.
- If a song is loaded, show normal player controls.
- Quick picks are still accessible according to the selected theme mode.
- Clicking a Quick pick attempts playback through the real YouTube Music DOM.

Avoid duplicating Quick picks parsing per theme. Theme only controls presentation.

## Task 8: Add Tests

Add tests for:

- default theme selection
- unknown theme fallback
- token normalization
- CSS variable generation
- theme picker options
- Quick picks state remains available regardless of theme

Existing tests should continue passing:

- player adapter timing and seek behavior
- Quick picks extraction
- state normalization

## Task 9: Update Preview Artifact

Update `design-preview.html` only if useful after the real theme implementation.

Preferred outcome:

- Preview reflects the same theme definitions from `src/themes.json`, or
- Preview is removed once the real PiP theme picker exists.

Do not let preview-only code become part of the runtime extension path.

## Task 10: Validation

Run:

```bash
npm run typecheck
npm run lint
npm run build
npm test
```

Manual checks:

- Reload extension in Brave.
- Open YouTube Music.
- Click extension button.
- Click `Open mini player`.
- Switch between Deck, Tile, and Dashboard.
- Confirm playback controls still work.
- Confirm seek still works.
- Confirm Quick picks render when no song is loaded.
- Confirm Quick picks remain accessible when a song is playing.
- Confirm selected theme persists after closing and reopening PiP.

## Acceptance Criteria

- PiP has a visible theme picker at the bottom.
- Theme picker switches between `Deck`, `Tile`, and `Dashboard`.
- Selected theme persists through `chrome.storage.local`.
- Theme definitions live in JSON.
- JSON controls colors, layout placement, block visibility, Quick picks mode, icons/labels, and animation names.
- JSON does not allow arbitrary HTML or JavaScript.
- All themes preserve play/pause, previous, next, seekbar, artwork, metadata, and Quick picks.
- `npm run typecheck`, `npm run lint`, `npm run build`, and `npm test` pass.

## Suggested Commits

1. `feat: add pip theme schema and picker`
2. `feat: add deck tile dashboard themes`
