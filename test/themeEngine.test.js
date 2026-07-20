import assert from "node:assert/strict";
import test from "node:test";

import {
  getDefaultTheme,
  getStoredThemeId,
  getTheme,
  getThemeOptions,
  saveThemeId,
  themeToCssVariables,
} from "../src/themeEngine.js";

test("returns tile as the default theme", () => {
  const theme = getDefaultTheme();

  assert.equal(theme.id, "tile");
  assert.equal(theme.name, "Tile");
});

test("falls back to default theme for unknown theme id", () => {
  const theme = getTheme("missing-theme");

  assert.equal(theme.id, "tile");
});

test("returns picker options for all bundled themes", () => {
  assert.deepEqual(getThemeOptions(), [
    { id: "console", name: "Console", shortName: "Console" },
    { id: "tile", name: "Tile", shortName: "Tile" },
    { id: "glass", name: "Glass", shortName: "Glass" },
    { id: "stack", name: "Stack", shortName: "Stack" },
    { id: "signal", name: "Signal", shortName: "Signal" },
  ]);
});

test("converts theme tokens into css variables", () => {
  const css = themeToCssVariables(getTheme("tile"));

  assert.match(css, /--ytmp-surface: #120f14;/);
  assert.match(css, /--ytmp-accent: #ef476f;/);
  assert.match(css, /--ytmp-window-width: 380px;/);
  assert.match(css, /--ytmp-window-height: 390px;/);
});

test("normalizes control icons and labels for themes", () => {
  const theme = getTheme("console");

  assert.equal(theme.blocks.controls.variant, "console-keys");
  assert.equal(theme.blocks.controls.icons.pause, "pause");
  assert.equal(theme.blocks.controls.labels.quickPicks, "");
});

test("normalizes dynamic background definitions for themes", () => {
  assert.deepEqual(getTheme("tile").background, {
    kind: "artworkGlow",
    usesArtworkColor: true,
    animation: "breathe",
  });
  assert.deepEqual(getTheme("glass").background, {
    kind: "transparent",
    usesArtworkColor: true,
    animation: "float",
  });
});

test("defines preferred PiP viewport sizes per theme", () => {
  assert.deepEqual(getTheme("console").layout.viewport, { width: 500, height: 280 });
  assert.deepEqual(getTheme("tile").layout.viewport, { width: 380, height: 390 });
  assert.deepEqual(getTheme("glass").layout.viewport, { width: 540, height: 340 });
  assert.deepEqual(getTheme("stack").layout.viewport, { width: 520, height: 300 });
  assert.deepEqual(getTheme("signal").layout.viewport, { width: 520, height: 300 });
});

test("defines animated quick pick overlay modes for all themes", () => {
  assert.equal(getTheme("console").blocks.quickPicks.mode, "sidePanel");
  assert.equal(getTheme("tile").blocks.quickPicks.mode, "bottomSheet");
  assert.equal(getTheme("glass").blocks.quickPicks.mode, "drawer");
  assert.equal(getTheme("stack").blocks.quickPicks.mode, "bottomSheet");
  assert.equal(getTheme("signal").blocks.quickPicks.mode, "sidePanel");
});

test("loads and saves selected theme id through storage", async () => {
  const values = {};
  const storage = {
    async get(key) {
      return { [key]: values[key] };
    },
    async set(nextValues) {
      Object.assign(values, nextValues);
    },
  };

  assert.equal(await getStoredThemeId(storage), "tile");

  await saveThemeId(storage, "glass");

  assert.equal(await getStoredThemeId(storage), "glass");
});
