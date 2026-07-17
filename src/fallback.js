import { hasTrackMetadata } from "./state.js";

const elements = {
  artwork: document.querySelector("[data-role='artwork']"),
  title: document.querySelector("[data-role='title']"),
  artist: document.querySelector("[data-role='artist']"),
  hint: document.querySelector("[data-role='hint']"),
  progress: document.querySelector("[data-role='progress']"),
  seek: document.querySelector("[data-role='seek']"),
  playPause: document.querySelector("[data-command='playPause']"),
  openMusic: document.querySelector("[data-role='openMusic']"),
};

let isSeeking = false;

function send(message) {
  return chrome.runtime.sendMessage({
    target: "YTM_FLOATING_PLAYER_BACKGROUND",
    ...message,
  });
}

function render(state) {
  elements.title.textContent = state.title || "Open YouTube Music";
  elements.artist.textContent = state.artist || "No track loaded";
  elements.playPause.textContent = state.isPlaying ? "Pause" : "Play";
  elements.progress.textContent = state.progressText || "";
  elements.seek.disabled = state.durationSeconds <= 0;
  elements.seek.max = String(Math.max(state.durationSeconds, 1));

  if (!isSeeking) {
    elements.seek.value = String(state.currentSeconds);
  }

  elements.hint.textContent = hasTrackMetadata(state)
    ? "Document Picture-in-Picture is unavailable, so this regular popup window is controlling your YouTube Music tab."
    : "Start a song in YouTube Music, then this window will update with controls and track info.";

  if (state.artworkUrl) {
    elements.artwork.style.backgroundImage = `url("${state.artworkUrl}")`;
    elements.artwork.textContent = "";
  } else {
    elements.artwork.style.backgroundImage = "";
    elements.artwork.textContent = "YTM";
  }
}

async function refresh() {
  const response = await send({ type: "GET_YTM_PLAYER_STATE" });

  if (response?.state) {
    render(response.state);
  }
}

for (const button of document.querySelectorAll("[data-command]")) {
  button.addEventListener("click", async () => {
    await send({
      type: "YTM_PLAYER_COMMAND",
      command: button.dataset.command,
    });
    await refresh();
  });
}

elements.openMusic.addEventListener("click", () => {
  send({ type: "OPEN_MUSIC_TAB" });
});

elements.seek.addEventListener("input", () => {
  isSeeking = true;
});

elements.seek.addEventListener("change", async () => {
  isSeeking = false;
  await send({
    type: "YTM_PLAYER_COMMAND",
    command: "seek",
    positionSeconds: Number(elements.seek.value),
  });
  await refresh();
});

await refresh();
window.setInterval(refresh, 1000);
