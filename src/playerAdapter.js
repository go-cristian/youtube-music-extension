import { normalizePlayerState } from "./state.js";

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
};

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

  return {
    currentTime: match?.[1] ?? "",
    duration: match?.[2] ?? "",
    currentSeconds: media?.currentTime ?? 0,
    durationSeconds: Number.isFinite(media?.duration) ? media.duration : 0,
  };
}

function clickFirst(doc, selectors) {
  const element = findFirst(doc, selectors);
  element?.click();
  return Boolean(element);
}

function findMediaElement(doc) {
  return doc.querySelector("video,audio");
}

export function seekMediaToSeconds(doc, seconds) {
  const media = findMediaElement(doc);

  if (!media || !Number.isFinite(media.duration) || media.duration <= 0) {
    return false;
  }

  media.currentTime = Math.max(0, Math.min(seconds, media.duration));
  return true;
}

export function createPlayerAdapter(doc = document) {
  return {
    getState() {
      const times = readTimes(doc);

      return normalizePlayerState({
        title: readFirstText(doc, SELECTORS.title),
        artist: readFirstText(doc, SELECTORS.artist),
        artworkUrl: readFirstAttribute(doc, SELECTORS.artwork, "src"),
        isPlaying: readPlaybackState(doc),
        currentTime: times.currentTime,
        duration: times.duration,
        currentSeconds: times.currentSeconds,
        durationSeconds: times.durationSeconds,
        canUseDocumentPip: "documentPictureInPicture" in window,
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
