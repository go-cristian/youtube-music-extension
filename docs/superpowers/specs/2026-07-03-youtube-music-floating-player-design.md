# YouTube Music Floating Player Design

## Overview
Build a Brave/Chrome extension that controls YouTube Music with a modern floating control inspired by Winamp. The MVP has two surfaces: an in-page bubble on `music.youtube.com` and a global always-on-top mini player using Document Picture-in-Picture when available.

## User Story
As a YouTube Music listener, I want quick playback controls and current song context in a floating player, so that I can control music without returning to the full YouTube Music tab.

## Planned Changes

### Extension
- Add a Manifest V3 extension targeting `https://music.youtube.com/*`.
- Inject an in-page floating bubble with play/pause.
- Show current song and artist on hover.
- Expand to a larger panel on click with artwork, progress, previous/play-next controls, and pop-out.
- Open a Document Picture-in-Picture player for always-on-top global controls when supported.
- Show a graceful unavailable state when Document Picture-in-Picture is not available.

### Implementation
- Keep the MVP framework-free with modular JavaScript, CSS, and static extension files.
- Encapsulate YouTube Music DOM reads and controls in a `playerAdapter`.
- Use `MutationObserver` to refresh metadata after YouTube Music updates.
- Avoid drag-and-drop in the MVP.

## Acceptance Criteria
- [ ] Loading the unpacked extension in Brave or Chrome injects the bubble on `music.youtube.com`.
- [ ] The bubble toggles play/pause.
- [ ] Hovering the bubble shows the current song and artist.
- [ ] Clicking the bubble opens a larger panel with controls and track context.
- [ ] The panel can open a Document Picture-in-Picture mini player when supported.
- [ ] The UI handles empty or unavailable metadata without breaking.
- [ ] Core formatting/state logic has automated tests.
