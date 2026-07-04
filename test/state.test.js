import assert from "node:assert/strict";
import test from "node:test";

import {
  EMPTY_TRACK_LABEL,
  formatHoverLabel,
  formatProgressText,
  normalizePlayerState,
} from "../src/state.js";

test("normalizes missing track metadata into an empty player state", () => {
  const state = normalizePlayerState({});

  assert.equal(state.title, "");
  assert.equal(state.artist, "");
  assert.equal(state.artworkUrl, "");
  assert.equal(state.isPlaying, false);
  assert.equal(state.progressText, "");
  assert.equal(formatHoverLabel(state), EMPTY_TRACK_LABEL);
});

test("trims track metadata and keeps playback fields", () => {
  const state = normalizePlayerState({
    title: "  Midnight City  ",
    artist: "  M83  ",
    artworkUrl: " https://example.test/art.jpg ",
    isPlaying: true,
    currentTime: "1:12",
    duration: "4:03",
  });

  assert.equal(state.title, "Midnight City");
  assert.equal(state.artist, "M83");
  assert.equal(state.artworkUrl, "https://example.test/art.jpg");
  assert.equal(state.isPlaying, true);
  assert.equal(state.progressText, "1:12 / 4:03");
  assert.equal(formatHoverLabel(state), "Midnight City - M83");
});

test("formats progress only when both times are available", () => {
  assert.equal(formatProgressText("1:12", "4:03"), "1:12 / 4:03");
  assert.equal(formatProgressText("1:12", ""), "");
  assert.equal(formatProgressText("", "4:03"), "");
});
