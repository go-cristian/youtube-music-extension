export function createPipController({ getState, onPlayPause, onPrevious, onNext }) {
  let pipWindow = null;
  let elements = null;

  function isSupported() {
    return "documentPictureInPicture" in window;
  }

  function update(state = getState()) {
    if (!pipWindow || !elements) {
      return;
    }

    elements.title.textContent = state.title || "Open YouTube Music";
    elements.artist.textContent = state.artist || "No track loaded";
    elements.playPause.textContent = state.isPlaying ? "Pause" : "Play";
    elements.progress.textContent = state.progressText || "";

    if (state.artworkUrl) {
      elements.artwork.style.backgroundImage = `url("${state.artworkUrl}")`;
      elements.artwork.textContent = "";
    } else {
      elements.artwork.style.backgroundImage = "";
      elements.artwork.textContent = "YTM";
    }
  }

  async function open() {
    if (!isSupported()) {
      return false;
    }

    pipWindow = await window.documentPictureInPicture.requestWindow({
      width: 320,
      height: 420,
    });

    pipWindow.document.body.innerHTML = `
      <style>
        body {
          margin: 0;
          background: #111318;
          color: #f6f7fb;
          font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .player { min-height: 100vh; display: flex; flex-direction: column; }
        .art {
          height: 180px;
          background: linear-gradient(135deg, #e94f37, #1f8a70);
          background-position: center;
          background-size: cover;
          display: grid;
          place-items: center;
          color: rgba(255,255,255,.72);
          font-weight: 800;
          letter-spacing: .12em;
        }
        .body { padding: 16px; }
        h1 { margin: 0 0 4px; font-size: 18px; line-height: 1.2; }
        p { margin: 0; color: #aab2bd; font-size: 13px; }
        .progress { min-height: 18px; margin-top: 12px; color: #ffcc33; font-size: 12px; }
        .controls { display: grid; grid-template-columns: 1fr 1.4fr 1fr; gap: 8px; margin-top: 14px; }
        button {
          border: 0;
          border-radius: 8px;
          padding: 10px;
          background: #262b34;
          color: #f6f7fb;
          font: inherit;
          cursor: pointer;
        }
        button.primary { background: #ffcc33; color: #181818; font-weight: 800; }
      </style>
      <main class="player">
        <div class="art" data-role="artwork">YTM</div>
        <section class="body">
          <h1 data-role="title">Open YouTube Music</h1>
          <p data-role="artist">No track loaded</p>
          <div class="progress" data-role="progress"></div>
          <div class="controls">
            <button data-role="previous">Prev</button>
            <button class="primary" data-role="playPause">Play</button>
            <button data-role="next">Next</button>
          </div>
        </section>
      </main>
    `;

    elements = {
      artwork: pipWindow.document.querySelector("[data-role='artwork']"),
      title: pipWindow.document.querySelector("[data-role='title']"),
      artist: pipWindow.document.querySelector("[data-role='artist']"),
      progress: pipWindow.document.querySelector("[data-role='progress']"),
      playPause: pipWindow.document.querySelector("[data-role='playPause']"),
    };

    pipWindow.document.querySelector("[data-role='previous']").addEventListener("click", onPrevious);
    pipWindow.document.querySelector("[data-role='playPause']").addEventListener("click", onPlayPause);
    pipWindow.document.querySelector("[data-role='next']").addEventListener("click", onNext);
    pipWindow.addEventListener("pagehide", () => {
      pipWindow = null;
      elements = null;
    });

    update();
    return true;
  }

  return { isSupported, open, update };
}
