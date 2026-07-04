# YouTube Music Floating Player Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Brave/Chrome extension that adds an in-page YouTube Music floating player and an optional always-on-top Document Picture-in-Picture player.

**Architecture:** A tiny Manifest V3 extension injects a classic content script that dynamically imports modular extension code. UI code renders the bubble and panel, `playerAdapter` isolates YouTube Music DOM reads/commands, and `pip` renders the always-on-top window when the browser supports Document Picture-in-Picture.

**Tech Stack:** Manifest V3, vanilla JavaScript modules, CSS, Node's built-in test runner.

---

## File Structure
- `manifest.json`: extension metadata, host permissions, content script, web accessible modules.
- `src/content.js`: classic content-script entrypoint that imports `bootstrap.js`.
- `src/bootstrap.js`: wires adapter, UI, PiP, and observers.
- `src/playerAdapter.js`: reads YouTube Music state and triggers controls.
- `src/state.js`: normalizes track/player state and formats labels.
- `src/ui.js`: creates and updates bubble, tooltip, and panel.
- `src/pip.js`: opens and updates Document Picture-in-Picture UI.
- `src/styles.css`: in-page UI styling.
- `test/state.test.js`: unit tests for state normalization and labels.
- `test/playerAdapter.test.js`: unit tests for pure DOM selection helpers.
- `README.md`: installation and validation steps for Brave/Chrome.

## Tasks
- [ ] Create failing tests for state normalization and player adapter helpers.
- [ ] Add extension manifest, package scripts, and source modules.
- [ ] Run tests until green.
- [ ] Add README installation and validation instructions.
- [ ] Run focused simplification, tests, and packaging validation.

## Self-Review
- Spec coverage: the tasks cover the in-page bubble, expanded panel, Document PiP support, fallback behavior, and core automated tests.
- Placeholder scan: no TBD/TODO placeholders are present.
- Type consistency: shared state shape is `title`, `artist`, `artworkUrl`, `isPlaying`, `progressText`, `canUseDocumentPip`.
