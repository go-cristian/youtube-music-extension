export const EMPTY_TRACK_LABEL = "Open YouTube Music";

export function formatProgressText(currentTime = "", duration = "") {
  const current = String(currentTime).trim();
  const total = String(duration).trim();

  if (!current || !total) {
    return "";
  }

  return `${current} / ${total}`;
}

export function normalizePlayerState(input = {}) {
  const title = String(input.title ?? "").trim();
  const artist = String(input.artist ?? "").trim();
  const artworkUrl = String(input.artworkUrl ?? "").trim();
  const currentTime = String(input.currentTime ?? "").trim();
  const duration = String(input.duration ?? "").trim();

  return {
    title,
    artist,
    artworkUrl,
    isPlaying: Boolean(input.isPlaying),
    progressText: formatProgressText(currentTime, duration),
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
