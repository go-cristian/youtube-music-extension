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

function normalizeLyricLines(input = []) {
  return input
    .map((line) => ({
      text: String(line.text ?? "").trim(),
      startSeconds: Number.isFinite(line.startSeconds) ? Math.max(0, line.startSeconds) : null,
      endSeconds: Number.isFinite(line.endSeconds) ? Math.max(0, line.endSeconds) : null,
    }))
    .filter((line) => line.text);
}

function splitTrackByline(value = "") {
  const parts = String(value)
    .split("•")
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    artist: parts[0] ?? String(value).trim(),
    album: parts[1] ?? "",
  };
}

function findCurrentLyricIndex(lines, currentSeconds, durationSeconds) {
  if (!lines.length) {
    return -1;
  }

  const timedIndex = lines.findIndex((line, index) => {
    if (!Number.isFinite(line.startSeconds)) {
      return false;
    }

    const nextStart = lines[index + 1]?.startSeconds;
    const endSeconds = Number.isFinite(line.endSeconds) ? line.endSeconds : nextStart;
    const upperBound = Number.isFinite(endSeconds) ? endSeconds : Number.POSITIVE_INFINITY;

    return currentSeconds >= line.startSeconds && currentSeconds < upperBound;
  });

  if (timedIndex >= 0) {
    return timedIndex;
  }

  if (durationSeconds > 0) {
    return Math.min(lines.length - 1, Math.floor((currentSeconds / durationSeconds) * lines.length));
  }

  return 0;
}

function normalizeLyrics(input = {}, currentSeconds = 0, durationSeconds = 0) {
  const lines = normalizeLyricLines(input.lines);
  const currentIndex = findCurrentLyricIndex(lines, currentSeconds, durationSeconds);

  return {
    lines,
    currentIndex,
    isSynced: lines.some((line) => Number.isFinite(line.startSeconds)),
    previous: currentIndex > 0 ? lines[currentIndex - 1]?.text ?? "" : "",
    current: currentIndex >= 0 ? lines[currentIndex]?.text ?? "" : "",
    next: currentIndex >= 0 ? lines[currentIndex + 1]?.text ?? "" : "",
  };
}

export function normalizePlayerState(input = {}) {
  const title = String(input.title ?? "").trim();
  const byline = String(input.artist ?? "").trim();
  const metadata = splitTrackByline(byline);
  const artist = String(input.artistName ?? metadata.artist).trim();
  const album = String(input.album ?? metadata.album).trim();
  const artworkUrl = String(input.artworkUrl ?? "").trim();
  const currentTime = String(input.currentTime ?? "").trim();
  const duration = String(input.duration ?? "").trim();
  const currentSeconds = readSeconds(input.currentSeconds, currentTime);
  const durationSeconds = readSeconds(input.durationSeconds, duration);

  return {
    title,
    artist,
    album,
    byline,
    artworkUrl,
    isPlaying: Boolean(input.isPlaying),
    progressText: formatProgressText(currentTime, duration),
    currentSeconds,
    durationSeconds,
    quickPicks: normalizeQuickPicks(input.quickPicks),
    lyrics: normalizeLyrics(input.lyrics, currentSeconds, durationSeconds),
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
