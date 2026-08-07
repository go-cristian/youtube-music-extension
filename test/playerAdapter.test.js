import assert from "node:assert/strict";
import test from "node:test";

import {
  createPlayerAdapter,
  readCurrentVideoId,
  readLyrics,
  readQuickPicks,
  readFirstAttribute,
  readFirstText,
  revealPlayerPageForLyrics,
  seekMediaToSeconds,
  timedLyricsDataToLines,
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

function lyricLine(text, attributes = {}) {
  return {
    textContent: text,
    getAttribute(name) {
      return attributes[name] ?? null;
    },
  };
}

function clickableElement() {
  let clicks = 0;

  return {
    get clicks() {
      return clicks;
    },
    click() {
      clicks += 1;
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

test("readCurrentVideoId prefers the active music URL", () => {
  const doc = documentWithMatches({});

  assert.equal(readCurrentVideoId(doc, { href: "https://music.youtube.com/watch?v=abc123" }), "abc123");
});

test("readCurrentVideoId falls back to the player bar song link", () => {
  const doc = documentWithMatches({
    "ytmusic-player-bar a[href*='watch?v=']": element("", { href: "/watch?v=xyz789&list=RDAMVM" }),
  });

  assert.equal(readCurrentVideoId(doc, { href: "https://music.youtube.com/" }), "xyz789");
});

test("readCurrentVideoId falls back to YouTube Music element state", () => {
  const playerBar = {
    data: {
      playerPageInfo: {
        playerPageSongInfo: {
          endpoint: {
            watchEndpoint: {
              videoId: "stateabc123",
            },
          },
        },
      },
    },
  };
  const doc = documentWithMatches({
    "ytmusic-player-bar": playerBar,
  });

  assert.equal(readCurrentVideoId(doc, { href: "https://music.youtube.com/" }), "stateabc123");
});

test("revealPlayerPageForLyrics clicks the player metadata area", () => {
  const target = clickableElement();
  const doc = documentWithMatches({
    "ytmusic-player-bar .content-info-wrapper": target,
  });

  assert.equal(revealPlayerPageForLyrics(doc), true);
  assert.equal(target.clicks, 1);
});

test("readLyrics extracts timed lines from a lyrics renderer", () => {
  const lyricsRenderer = {
    querySelectorAll(selector) {
      if (selector !== "[start-time]") {
        return [];
      }

      return [
        lyricLine("Previous line", { "start-time": "0:12" }),
        lyricLine("Current line", { "start-time": "0:30" }),
      ];
    },
  };
  const doc = documentWithMatches({
    "ytmusic-lyrics-renderer": lyricsRenderer,
  });

  assert.deepEqual(readLyrics(doc), {
    lines: [
      { text: "Previous line", startSeconds: 12 },
      { text: "Current line", startSeconds: 30 },
    ],
  });
});

test("readLyrics ignores non-lyrics description shelves", () => {
  const descriptionShelf = {
    querySelectorAll() {
      return [
        lyricLine("Song title"),
        lyricLine("3:42"),
        lyricLine("Another recommendation"),
      ];
    },
  };
  const doc = documentWithMatches({
    "ytmusic-player-page ytmusic-description-shelf-renderer": descriptionShelf,
  });

  assert.deepEqual(readLyrics(doc), { lines: [] });
});

test("readLyrics ignores untimed text from lyrics containers", () => {
  const lyricsRenderer = {
    querySelectorAll(selector) {
      if (selector !== "yt-formatted-string") {
        return [];
      }

      return [
        lyricLine("Song title"),
        lyricLine("3:42"),
        lyricLine("Related track"),
      ];
    },
  };
  const doc = documentWithMatches({
    "ytmusic-lyrics-renderer": lyricsRenderer,
  });

  assert.deepEqual(readLyrics(doc), { lines: [] });
});

test("timedLyricsDataToLines converts YouTube Music timed lyrics", () => {
  assert.deepEqual(timedLyricsDataToLines([
    {
      lyricLine: "Current line",
      cueRange: {
        startTimeMilliseconds: "18250",
        endTimeMilliseconds: "20090",
      },
    },
  ]), [
    {
      text: "Current line",
      startSeconds: 18.25,
      endSeconds: 20.09,
    },
  ]);
});

test("adapter prefers synced lyrics from YouTube Music endpoints", async () => {
  const doc = documentWithMatches({
    "script": [
      element('"INNERTUBE_API_KEY":"test-key","INNERTUBE_CLIENT_VERSION":"1.0","VISITOR_DATA":"visitor"'),
    ],
    "ytmusic-player-bar a[href*='watch?v=']": element("", { href: "/watch?v=song123" }),
    "ytmusic-player-bar .time-info": element("0:19 / 3:00"),
  });
  const requests = [];
  const fetchImpl = async (url, init) => {
    requests.push({ url, body: JSON.parse(init.body) });

    if (String(url).includes("/next")) {
      return {
        ok: true,
        async json() {
          return { tabs: [{ endpoint: { browseEndpoint: { browseId: "MPLYt_song123" } } }] };
        },
      };
    }

    return {
      ok: true,
      async json() {
        return {
          timedLyricsModel: {
            lyricsData: {
              timedLyricsData: [
                { lyricLine: "Before", cueRange: { startTimeMilliseconds: "0", endTimeMilliseconds: "18000" } },
                { lyricLine: "Now", cueRange: { startTimeMilliseconds: "18000", endTimeMilliseconds: "21000" } },
                { lyricLine: "After", cueRange: { startTimeMilliseconds: "21000", endTimeMilliseconds: "25000" } },
              ],
            },
          },
        };
      },
    };
  };
  const adapter = createPlayerAdapter(doc, {
    fetchImpl,
    location: { href: "https://music.youtube.com/" },
  });

  adapter.getState();
  await new Promise((resolve) => setTimeout(resolve, 0));
  const state = adapter.getState();

  assert.equal(requests.length, 2);
  assert.equal(requests[0].body.videoId, "song123");
  assert.equal(requests[1].body.browseId, "MPLYt_song123");
  assert.equal(state.lyrics.previous, "Before");
  assert.equal(state.lyrics.current, "Now");
  assert.equal(state.lyrics.next, "After");
  assert.equal(state.lyrics.isSynced, true);
});

test("adapter reveals the full player once when track metadata has no video id yet", () => {
  const target = clickableElement();
  const doc = documentWithMatches({
    "ytmusic-player-bar .title": element("A song"),
    "ytmusic-player-bar .byline": element("An artist"),
    "ytmusic-player-bar .content-info-wrapper": target,
  });
  const adapter = createPlayerAdapter(doc, {
    fetchImpl: null,
    location: { href: "https://music.youtube.com/" },
  });

  adapter.getState();
  adapter.getState();

  assert.equal(target.clicks, 1);
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
