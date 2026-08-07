import assert from "node:assert/strict";
import test from "node:test";

import {
  EMPTY_TRACK_LABEL,
  formatHoverLabel,
  formatProgressText,
  hasTrackMetadata,
  normalizePlayerState,
  parseTimeText,
} from "../src/state.js";

test("normalizes missing track metadata into an empty player state", () => {
  const state = normalizePlayerState({});

  assert.equal(state.title, "");
  assert.equal(state.artist, "");
  assert.equal(state.album, "");
  assert.equal(state.byline, "");
  assert.equal(state.artworkUrl, "");
  assert.equal(state.isPlaying, false);
  assert.equal(state.progressText, "");
  assert.equal(state.currentSeconds, 0);
  assert.equal(state.durationSeconds, 0);
  assert.deepEqual(state.quickPicks, []);
  assert.equal(formatHoverLabel(state), EMPTY_TRACK_LABEL);
  assert.equal(hasTrackMetadata(state), false);
});

test("normalizes quick picks into player state", () => {
  const state = normalizePlayerState({
    quickPicks: [
      {
        title: "  my mind is a mountain  ",
        artist: "  Deftones  ",
        artworkUrl: " https://example.test/deftones.jpg ",
      },
    ],
  });

  assert.deepEqual(state.quickPicks, [
    {
      title: "my mind is a mountain",
      artist: "Deftones",
      artworkUrl: "https://example.test/deftones.jpg",
    },
  ]);
});

test("normalizes synced lyrics into previous current and next lines", () => {
  const state = normalizePlayerState({
    currentSeconds: 42,
    durationSeconds: 120,
    lyrics: {
      lines: [
        { text: "First line", startSeconds: 0 },
        { text: "Current line", startSeconds: 40 },
        { text: "Next line", startSeconds: 55 },
      ],
    },
  });

  assert.equal(state.lyrics.previous, "First line");
  assert.equal(state.lyrics.current, "Current line");
  assert.equal(state.lyrics.next, "Next line");
  assert.equal(state.lyrics.isSynced, true);
});

test("keeps repeated synced lyric lines because each timestamp is meaningful", () => {
  const state = normalizePlayerState({
    currentSeconds: 63,
    durationSeconds: 120,
    lyrics: {
      lines: [
        { text: "Same chorus", startSeconds: 10 },
        { text: "Bridge", startSeconds: 40 },
        { text: "Same chorus", startSeconds: 60 },
        { text: "Outro", startSeconds: 80 },
      ],
    },
  });

  assert.equal(state.lyrics.previous, "Bridge");
  assert.equal(state.lyrics.current, "Same chorus");
  assert.equal(state.lyrics.next, "Outro");
  assert.equal(state.lyrics.lines.length, 4);
});

test("estimates current lyrics when timestamps are unavailable", () => {
  const state = normalizePlayerState({
    currentSeconds: 50,
    durationSeconds: 100,
    lyrics: {
      lines: [
        { text: "First line" },
        { text: "Second line" },
        { text: "Third line" },
        { text: "Fourth line" },
      ],
    },
  });

  assert.equal(state.lyrics.previous, "Second line");
  assert.equal(state.lyrics.current, "Third line");
  assert.equal(state.lyrics.next, "Fourth line");
  assert.equal(state.lyrics.isSynced, false);
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
  assert.equal(state.album, "");
  assert.equal(state.byline, "M83");
  assert.equal(state.artworkUrl, "https://example.test/art.jpg");
  assert.equal(state.isPlaying, true);
  assert.equal(state.progressText, "1:12 / 4:03");
  assert.equal(state.currentSeconds, 72);
  assert.equal(state.durationSeconds, 243);
  assert.equal(formatHoverLabel(state), "Midnight City - M83");
  assert.equal(hasTrackMetadata(state), true);
});

test("extracts artist and album from a YouTube Music byline", () => {
  const state = normalizePlayerState({
    title: "Timeless",
    artist: "Of Mice & Men • Timeless • 2021",
  });

  assert.equal(state.artist, "Of Mice & Men");
  assert.equal(state.album, "Timeless");
  assert.equal(state.byline, "Of Mice & Men • Timeless • 2021");
  assert.equal(formatHoverLabel(state), "Timeless - Of Mice & Men");
});

test("formats progress only when both times are available", () => {
  assert.equal(formatProgressText("1:12", "4:03"), "1:12 / 4:03");
  assert.equal(formatProgressText("1:12", ""), "");
  assert.equal(formatProgressText("", "4:03"), "");
});

test("parses music time labels into seconds", () => {
  assert.equal(parseTimeText("1:12"), 72);
  assert.equal(parseTimeText("1:02:03"), 3723);
  assert.equal(parseTimeText(""), 0);
});
