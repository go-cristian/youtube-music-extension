export const EMPTY_TRACK_LABEL = "Open YouTube Music";

export function formatProgressText(currentTime = "", duration = "") {
  const current = String(currentTime).trim();
  const total = String(duration).trim();

  if (!current || !total) {
    return "";
  }

  return `${current} / ${total}`;
}

export function parseTimeText(value = "") {
  const parts = String(value)
    .trim()
    .split(":")
    .map((part) => Number.parseInt(part, 10));

  if (parts.some((part) => Number.isNaN(part))) {
    return 0;
  }

  return parts.reduce((total, part) => total * 60 + part, 0);
}

function readSeconds(numberValue, textValue) {
  if (Number.isFinite(numberValue) && numberValue > 0) {
    return Math.floor(numberValue);
  }

  return parseTimeText(textValue);
}

function normalizeQuickPicks(input = []) {
  return input
    .map((item) => ({
      title: String(item.title ?? "").trim(),
      artist: String(item.artist ?? "").trim(),
      artworkUrl: String(item.artworkUrl ?? "").trim(),
    }))
    .filter((item) => item.title);
}

export function normalizePlayerState(input = {}) {
  const title = String(input.title ?? "").trim();
  const artist = String(input.artist ?? "").trim();
  const artworkUrl = String(input.artworkUrl ?? "").trim();
  const currentTime = String(input.currentTime ?? "").trim();
  const duration = String(input.duration ?? "").trim();
  const currentSeconds = readSeconds(input.currentSeconds, currentTime);
  const durationSeconds = readSeconds(input.durationSeconds, duration);

  return {
    title,
    artist,
    artworkUrl,
    isPlaying: Boolean(input.isPlaying),
    progressText: formatProgressText(currentTime, duration),
    currentSeconds,
    durationSeconds,
    quickPicks: normalizeQuickPicks(input.quickPicks),
    canUseDocumentPip: Boolean(input.canUseDocumentPip),
  };
}

export function formatHoverLabel(state) {
  if (!state.title && !state.artist) {
    return EMPTY_TRACK_LABEL;
  }

  if (state.title && state.artist) {
    return `${state.title} - ${state.artist}`;
  }

  return state.title || state.artist;
}

export function hasTrackMetadata(state) {
  return Boolean(state.title || state.artist || state.artworkUrl);
}
