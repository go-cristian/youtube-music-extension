import { normalizePlayerState, parseTimeText } from "./state.js";

const SELECTORS = {
  title: [
    "ytmusic-player-bar .title",
    ".ytmusic-player-bar .title",
    "yt-formatted-string.title",
  ],
  artist: [
    "ytmusic-player-bar .byline",
    ".ytmusic-player-bar .byline",
    "yt-formatted-string.byline",
  ],
  artwork: [
    "ytmusic-player-bar img.image",
    "ytmusic-player-bar #thumbnail img",
    ".ytmusic-player-bar img",
  ],
  playPause: [
    "#play-pause-button",
    "ytmusic-player-bar .play-pause-button",
    "tp-yt-paper-icon-button[title='Play']",
    "tp-yt-paper-icon-button[title='Pause']",
    "tp-yt-paper-icon-button[aria-label='Play']",
    "tp-yt-paper-icon-button[aria-label='Pause']",
  ],
  previous: [
    ".previous-button",
    "tp-yt-paper-icon-button[title='Previous']",
    "tp-yt-paper-icon-button[aria-label='Previous']",
  ],
  next: [
    ".next-button",
    "tp-yt-paper-icon-button[title='Next']",
    "tp-yt-paper-icon-button[aria-label='Next']",
  ],
  progress: [
    "ytmusic-player-bar .time-info",
    ".ytmusic-player-bar .time-info",
  ],
  lyrics: [
    "ytmusic-lyrics-renderer",
    "ytmusic-tab-renderer[page-type='MUSIC_PAGE_TYPE_TRACK_LYRICS']",
    "#lyrics",
  ],
  lyricLine: [
    "[start-time]",
    "[data-start-time]",
    "[data-start-time-ms]",
    "[data-time]",
    "[data-time-ms]",
    ".lyrics-line",
    ".line",
    "yt-formatted-string",
  ],
  currentSongLink: [
    "ytmusic-player-bar a[href*='watch?v=']",
    ".ytmusic-player-bar a[href*='watch?v=']",
  ],
  currentSongHosts: [
    "ytmusic-player-bar",
    "ytmusic-app",
  ],
  playerPageActivation: [
    "ytmusic-player-bar .content-info-wrapper",
    "ytmusic-player-bar .song-info",
    "ytmusic-player-bar #thumbnail",
    "ytmusic-player-bar img.image",
  ],
};

const MUSIC_ORIGIN = "https://music.youtube.com";
const ANDROID_MUSIC_CLIENT_VERSION = "8.05.51";

export function readFirstText(doc, selectors) {
  for (const selector of selectors) {
    const text = doc.querySelector(selector)?.textContent?.trim();

    if (text) {
      return text;
    }
  }

  return "";
}

export function readFirstAttribute(doc, selectors, attribute) {
  for (const selector of selectors) {
    const value = doc.querySelector(selector)?.getAttribute(attribute)?.trim();

    if (value) {
      return value;
    }
  }

  return "";
}

function findFirst(doc, selectors) {
  for (const selector of selectors) {
    const element = doc.querySelector(selector);

    if (element) {
      return element;
    }
  }

  return null;
}

function findAll(doc, selectors) {
  return selectors.flatMap((selector) => [...doc.querySelectorAll(selector)]);
}

function readText(element, selector) {
  return element.querySelector(selector)?.textContent?.trim() ?? "";
}

function readAttribute(element, selector, attribute) {
  return element.querySelector(selector)?.getAttribute(attribute)?.trim() ?? "";
}

function findQuickPicksShelf(doc) {
  return [...doc.querySelectorAll("ytmusic-carousel-shelf-renderer")]
    .find((shelf) => readText(shelf, ".title text, .title").toLowerCase() === "quick picks");
}

function cleanArtist(value) {
  return value.split("•")[0].trim();
}

function parseTimeAttribute(value) {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    return null;
  }

  if (rawValue.includes(":")) {
    return parseTimeText(rawValue);
  }

  const numberValue = Number.parseFloat(rawValue);

  if (!Number.isFinite(numberValue)) {
    return null;
  }

  return numberValue > 1000 ? numberValue / 1000 : numberValue;
}

function readLineStartSeconds(element) {
  const values = [
    element.getAttribute?.("start-time"),
    element.getAttribute?.("data-start-time"),
    element.getAttribute?.("data-start-time-ms"),
    element.getAttribute?.("data-time"),
    element.getAttribute?.("data-time-ms"),
  ];

  for (const value of values) {
    const seconds = parseTimeAttribute(value);

    if (Number.isFinite(seconds)) {
      return seconds;
    }
  }

  return null;
}

function textLooksLikeLyrics(text) {
  const normalized = text.toLowerCase();

  return text.length > 1
    && !normalized.includes("lyrics unavailable")
    && !normalized.includes("lyrics not available")
    && !normalized.includes("no lyrics");
}

function readLyricsFromContainer(container) {
  const lineElements = SELECTORS.lyricLine
    .flatMap((selector) => [...container.querySelectorAll(selector)]);
  const candidates = lineElements.length ? lineElements : [container];

  const lines = candidates
    .flatMap((lineElement) => String(lineElement.textContent ?? "")
      .split("\n")
      .map((text) => ({
        text: text.trim(),
        startSeconds: readLineStartSeconds(lineElement),
      })))
    .filter((line) => textLooksLikeLyrics(line.text) && Number.isFinite(line.startSeconds));

  return {
    lines,
  };
}

export function readLyrics(doc) {
  const container = findFirst(doc, SELECTORS.lyrics);

  if (!container) {
    return { lines: [] };
  }

  return readLyricsFromContainer(container);
}

function readVideoIdFromUrl(value) {
  try {
    return new URL(value, MUSIC_ORIGIN).searchParams.get("v") ?? "";
  } catch {
    return "";
  }
}

function findVideoIdInObject(value, depth = 0, seen = new Set()) {
  if (!value || depth > 6 || seen.has(value)) {
    return "";
  }

  if (typeof value === "string") {
    return /^[a-zA-Z0-9_-]{11}$/.test(value) ? value : readVideoIdFromUrl(value);
  }

  if (typeof value !== "object") {
    return "";
  }

  seen.add(value);

  const directKeys = ["videoId", "currentVideoId", "playlistItemVideoId"];

  for (const key of directKeys) {
    const videoId = findVideoIdInObject(value[key], depth + 1, seen);

    if (videoId) {
      return videoId;
    }
  }

  for (const key of Object.keys(value)) {
    if (key.startsWith("__") || key === "parentNode" || key === "parentElement" || key === "ownerDocument") {
      continue;
    }

    const videoId = findVideoIdInObject(value[key], depth + 1, seen);

    if (videoId) {
      return videoId;
    }
  }

  return "";
}

function readCurrentVideoIdFromElementState(doc) {
  for (const element of findAll(doc, SELECTORS.currentSongHosts)) {
    const videoId = findVideoIdInObject({
      data: element.data,
      playerPageInfo: element.playerPageInfo,
      queue: element.queue,
      selectedItem: element.selectedItem,
      watchEndpoint: element.watchEndpoint,
    });

    if (videoId) {
      return videoId;
    }
  }

  return "";
}

export function readCurrentVideoId(doc, locationValue = globalThis.location) {
  const urlVideoId = readVideoIdFromUrl(locationValue?.href ?? "");

  if (urlVideoId) {
    return urlVideoId;
  }

  for (const link of findAll(doc, SELECTORS.currentSongLink)) {
    const videoId = readVideoIdFromUrl(link.getAttribute?.("href") ?? "");

    if (videoId) {
      return videoId;
    }
  }

  const stateVideoId = readCurrentVideoIdFromElementState(doc);

  if (stateVideoId) {
    return stateVideoId;
  }

  return "";
}

function parseInnertubeConfig(text = "") {
  const readConfigValue = (key) => {
    const match = text.match(new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`));

    return match?.[1] ?? "";
  };

  return {
    apiKey: readConfigValue("INNERTUBE_API_KEY"),
    clientVersion: readConfigValue("INNERTUBE_CLIENT_VERSION"),
    visitorData: readConfigValue("VISITOR_DATA"),
  };
}

function readInnertubeConfigFromDocument(doc) {
  const scriptText = [...doc.querySelectorAll("script")]
    .map((script) => script.textContent ?? "")
    .find((text) => text.includes("INNERTUBE_API_KEY")) ?? "";

  return parseInnertubeConfig(scriptText || (doc.documentElement?.innerHTML ?? ""));
}

function hasInnertubeConfig(config) {
  return Boolean(config.apiKey && config.clientVersion && config.visitorData);
}

async function fetchInnertubeConfig(fetchImpl) {
  const response = await fetchImpl("/", {
    credentials: "include",
    headers: { "accept-language": "en-US,en;q=0.9" },
  });
  const html = await response.text();

  return parseInnertubeConfig(html);
}

async function postInnertube(fetchImpl, endpoint, apiKey, body) {
  const response = await fetchImpl(`${MUSIC_ORIGIN}/youtubei/v1/${endpoint}?key=${apiKey}`, {
    body: JSON.stringify(body),
    credentials: "include",
    headers: {
      "content-type": "application/json",
      "x-origin": MUSIC_ORIGIN,
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`YouTube Music ${endpoint} failed with ${response.status}`);
  }

  return response.json();
}

function walkObject(value, callback) {
  if (!value || typeof value !== "object") {
    return;
  }

  callback(value);

  for (const child of Object.values(value)) {
    walkObject(child, callback);
  }
}

function findLyricsBrowseId(response) {
  let browseId = "";

  walkObject(response, (value) => {
    if (!browseId && typeof value.browseId === "string" && value.browseId.startsWith("MPLYt_")) {
      browseId = value.browseId;
    }
  });

  return browseId;
}

function readLyricsBrowseIdFromElementState(doc) {
  for (const element of findAll(doc, SELECTORS.currentSongHosts)) {
    const browseId = findLyricsBrowseId({
      data: element.data,
      playerPageInfo: element.playerPageInfo,
      queue: element.queue,
      selectedItem: element.selectedItem,
      tabs: element.tabs,
    });

    if (browseId) {
      return browseId;
    }
  }

  return "";
}

function findTimedLyricsData(response) {
  let timedLyricsData = [];

  walkObject(response, (value) => {
    if (!timedLyricsData.length && Array.isArray(value.timedLyricsData)) {
      timedLyricsData = value.timedLyricsData;
    }
  });

  return timedLyricsData;
}

export function timedLyricsDataToLines(timedLyricsData = []) {
  return timedLyricsData
    .map((item) => ({
      text: String(item.lyricLine ?? "").trim(),
      startSeconds: Number.parseInt(item.cueRange?.startTimeMilliseconds ?? "", 10) / 1000,
      endSeconds: Number.parseInt(item.cueRange?.endTimeMilliseconds ?? "", 10) / 1000,
    }))
    .filter((line) => line.text && Number.isFinite(line.startSeconds));
}

function createTimedLyricsLoader(doc, fetchImpl = globalThis.fetch?.bind(globalThis)) {
  let configPromise = null;
  let cache = { videoId: "", lyrics: { lines: [] }, isLoading: false };

  async function getConfig() {
    const documentConfig = readInnertubeConfigFromDocument(doc);

    if (hasInnertubeConfig(documentConfig)) {
      return documentConfig;
    }

    configPromise ??= fetchInnertubeConfig(fetchImpl);
    return configPromise;
  }

  async function load(videoId) {
    const config = await getConfig();

    if (!hasInnertubeConfig(config)) {
      return { lines: [] };
    }

    const webContext = {
      client: {
        clientName: "WEB_REMIX",
        clientVersion: config.clientVersion,
        visitorData: config.visitorData,
      },
    };
    const nextResponse = await postInnertube(fetchImpl, "next", config.apiKey, {
      context: webContext,
      videoId,
    });
    const browseId = readLyricsBrowseIdFromElementState(doc) || findLyricsBrowseId(nextResponse);

    if (!browseId) {
      return { lines: [] };
    }

    const androidContext = {
      client: {
        androidSdkVersion: 35,
        clientName: "ANDROID_MUSIC",
        clientVersion: ANDROID_MUSIC_CLIENT_VERSION,
        visitorData: config.visitorData,
      },
    };
    const lyricsResponse = await postInnertube(fetchImpl, "browse", config.apiKey, {
      browseId,
      context: androidContext,
    });

    return { lines: timedLyricsDataToLines(findTimedLyricsData(lyricsResponse)) };
  }

  function get(videoId) {
    if (!fetchImpl || !videoId) {
      return { lines: [] };
    }

    if (videoId !== cache.videoId) {
      cache = { videoId, lyrics: { lines: [] }, isLoading: true };
      load(videoId)
        .then((lyrics) => {
          if (cache.videoId === videoId) {
            cache = { videoId, lyrics, isLoading: false };
          }
        })
        .catch(() => {
          if (cache.videoId === videoId) {
            cache = { videoId, lyrics: { lines: [] }, isLoading: false };
          }
        });
    }

    return cache.lyrics;
  }

  return { get };
}

export function readQuickPicks(doc) {
  const shelf = findQuickPicksShelf(doc);

  if (!shelf) {
    return [];
  }

  return [...shelf.querySelectorAll("ytmusic-responsive-list-item-renderer")]
    .map((item) => ({
      title: readText(item, ".title a, .title"),
      artist: cleanArtist(readText(item, ".secondary-flex-columns .flex-column yt-formatted-string")),
      artworkUrl: readAttribute(item, "img", "src"),
    }))
    .filter((item) => item.title)
    .slice(0, 8);
}

function playQuickPick(doc, index) {
  const shelf = findQuickPicksShelf(doc);
  const item = shelf?.querySelectorAll("ytmusic-responsive-list-item-renderer")?.[index];
  const playButton = item?.querySelector("ytmusic-play-button-renderer#play-button");
  const fallbackTarget = item?.querySelector(".thumbnail-overlay, .title a");

  playButton?.click?.();

  if (playButton) {
    return true;
  }

  fallbackTarget?.click?.();
  return Boolean(fallbackTarget);
}

function readPlaybackState(doc) {
  const button = findFirst(doc, SELECTORS.playPause);
  const title = button?.getAttribute("title") ?? "";
  const aria = button?.getAttribute("aria-label") ?? "";
  const label = `${title} ${aria}`.toLowerCase();

  if (label.includes("pause")) {
    return true;
  }

  if (label.includes("play")) {
    return false;
  }

  return button?.getAttribute("aria-pressed") === "true";
}

function readTimes(doc) {
  const progress = readFirstText(doc, SELECTORS.progress);
  const match = progress.match(/([0-9:]+)\s*\/\s*([0-9:]+)/);
  const media = findMediaElement(doc);
  const currentTime = match?.[1] ?? "";
  const duration = match?.[2] ?? "";

  return {
    currentTime,
    duration,
    currentSeconds: currentTime ? parseTimeText(currentTime) : media?.currentTime ?? 0,
    durationSeconds: duration ? parseTimeText(duration) : Number.isFinite(media?.duration) ? media.duration : 0,
  };
}

function clickFirst(doc, selectors) {
  const element = findFirst(doc, selectors);
  element?.click();
  return Boolean(element);
}

export function revealPlayerPageForLyrics(doc) {
  return clickFirst(doc, SELECTORS.playerPageActivation);
}

function findMediaElement(doc) {
  return doc.querySelector("video,audio");
}

export function seekMediaToSeconds(doc, seconds) {
  const media = findMediaElement(doc);

  if (!media || !Number.isFinite(media.duration) || media.duration <= 0) {
    return false;
  }

  const wasPlaying = media.paused === false;
  media.currentTime = Math.max(0, Math.min(seconds, media.duration));

  if (wasPlaying) {
    media.play?.();
  }

  return true;
}

export function createPlayerAdapter(doc = document, options = {}) {
  const timedLyrics = createTimedLyricsLoader(doc, options.fetchImpl);
  let activatedPlayerPageFor = "";

  return {
    getState() {
      const times = readTimes(doc);
      const videoId = readCurrentVideoId(doc, options.location);
      const title = readFirstText(doc, SELECTORS.title);
      const artist = readFirstText(doc, SELECTORS.artist);
      const trackKey = videoId || `${title}|${artist}`;

      if (!videoId && trackKey !== "|" && trackKey !== activatedPlayerPageFor) {
        activatedPlayerPageFor = trackKey;
        revealPlayerPageForLyrics(doc);
      }

      const syncedLyrics = timedLyrics.get(videoId);
      const fallbackLyrics = readLyrics(doc);

      return normalizePlayerState({
        title,
        artist,
        artworkUrl: readFirstAttribute(doc, SELECTORS.artwork, "src"),
        isPlaying: readPlaybackState(doc),
        currentTime: times.currentTime,
        duration: times.duration,
        currentSeconds: times.currentSeconds,
        durationSeconds: times.durationSeconds,
        quickPicks: readQuickPicks(doc),
        lyrics: syncedLyrics.lines.length ? syncedLyrics : fallbackLyrics,
        canUseDocumentPip: typeof window !== "undefined" && "documentPictureInPicture" in window,
      });
    },
    togglePlayPause() {
      return clickFirst(doc, SELECTORS.playPause);
    },
    previous() {
      return clickFirst(doc, SELECTORS.previous);
    },
    next() {
      return clickFirst(doc, SELECTORS.next);
    },
    seekTo(seconds) {
      return seekMediaToSeconds(doc, seconds);
    },
    playQuickPick(index) {
      return playQuickPick(doc, index);
    },
    subscribe(callback) {
      let timeoutId = 0;
      const observer = new MutationObserver(() => {
        window.clearTimeout(timeoutId);
        timeoutId = window.setTimeout(callback, 100);
      });

      observer.observe(doc.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["title", "aria-label", "src"],
      });

      return () => observer.disconnect();
    },
  };
}
