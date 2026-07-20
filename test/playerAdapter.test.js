import assert from "node:assert/strict";
import test from "node:test";

import {
  createPlayerAdapter,
  readQuickPicks,
  readFirstAttribute,
  readFirstText,
  seekMediaToSeconds,
} from "../src/playerAdapter.js";

function element(text = "", attributes = {}) {
  return {
    textContent: text,
    getAttribute(name) {
      return attributes[name] ?? null;
    },
  };
}

function documentWithMatches(matches) {
  return {
    querySelector(selector) {
      return matches[selector] ?? null;
    },
    querySelectorAll(selector) {
      const match = matches[selector] ?? [];
      return Array.isArray(match) ? match : [match];
    },
  };
}

function quickPickItem({ title, artist, artworkUrl }) {
  return {
    querySelector(selector) {
      const matches = {
        ".title a, .title": element(title),
        ".secondary-flex-columns .flex-column yt-formatted-string": element(artist),
        "img": element("", { src: artworkUrl }),
      };

      return matches[selector] ?? null;
    },
  };
}

test("readFirstText returns the first non-empty selector match", () => {
  const doc = documentWithMatches({
    ".empty": element("   "),
    ".title": element("  Midnight City  "),
    ".other": element("Other"),
  });

  assert.equal(readFirstText(doc, [".empty", ".title", ".other"]), "Midnight City");
});

test("readFirstText returns an empty string when no selector has text", () => {
  const doc = documentWithMatches({
    ".empty": element("   "),
  });

  assert.equal(readFirstText(doc, [".missing", ".empty"]), "");
});

test("readFirstAttribute returns the first non-empty attribute match", () => {
  const doc = documentWithMatches({
    ".missing-src": element("", { src: "" }),
    ".art": element("", { src: " https://example.test/art.jpg " }),
  });

  assert.equal(readFirstAttribute(doc, [".missing-src", ".art"], "src"), "https://example.test/art.jpg");
});

test("seekMediaToSeconds moves the media element inside its duration", () => {
  const media = { currentTime: 0, duration: 240 };
  const doc = documentWithMatches({ "video,audio": media });

  assert.equal(seekMediaToSeconds(doc, 72), true);
  assert.equal(media.currentTime, 72);

  assert.equal(seekMediaToSeconds(doc, 999), true);
  assert.equal(media.currentTime, 240);
});

test("seekMediaToSeconds resumes playback when media was already playing", async () => {
  let playCalls = 0;
  const media = {
    currentTime: 0,
    duration: 240,
    paused: false,
    play() {
      playCalls += 1;
      return Promise.resolve();
    },
  };
  const doc = documentWithMatches({ "video,audio": media });

  assert.equal(seekMediaToSeconds(doc, 72), true);

  await Promise.resolve();
  assert.equal(media.currentTime, 72);
  assert.equal(playCalls, 1);
});

test("seekMediaToSeconds keeps paused media paused", async () => {
  let playCalls = 0;
  const media = {
    currentTime: 0,
    duration: 240,
    paused: true,
    play() {
      playCalls += 1;
      return Promise.resolve();
    },
  };
  const doc = documentWithMatches({ "video,audio": media });

  assert.equal(seekMediaToSeconds(doc, 72), true);

  await Promise.resolve();
  assert.equal(media.currentTime, 72);
  assert.equal(playCalls, 0);
});

test("adapter prefers visible progress labels over media timing", () => {
  const media = { currentTime: 9999, duration: 99999, paused: false };
  const doc = documentWithMatches({
    "ytmusic-player-bar .time-info": element("1:12 / 4:03"),
    "video,audio": media,
  });
  const state = createPlayerAdapter(doc).getState();

  assert.equal(state.currentSeconds, 72);
  assert.equal(state.durationSeconds, 243);
});

test("readQuickPicks extracts recommendations from the Quick picks shelf", () => {
  const shelf = {
    querySelector(selector) {
      const matches = {
        ".title text, .title": element("Quick picks"),
      };

      return matches[selector] ?? null;
    },
    querySelectorAll(selector) {
      if (selector !== "ytmusic-responsive-list-item-renderer") {
        return [];
      }

      return [
        quickPickItem({
          title: "my mind is a mountain",
          artist: "Deftones • 14M plays",
          artworkUrl: "https://example.test/deftones.jpg",
        }),
      ];
    },
  };
  const doc = documentWithMatches({
    "ytmusic-carousel-shelf-renderer": [shelf],
  });

  assert.deepEqual(readQuickPicks(doc), [
    {
      title: "my mind is a mountain",
      artist: "Deftones",
      artworkUrl: "https://example.test/deftones.jpg",
    },
  ]);
});
