export function createPipController({ getState, onPlayPause, onPrevious, onNext, onSeek, onQuickPick }) {
  let pipWindow = null;
  let elements = null;
  let isSeeking = false;
  let isDrawerOpen = false;

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
    elements.seek.disabled = state.durationSeconds <= 0;
    elements.seek.max = String(Math.max(state.durationSeconds, 1));
    elements.drawer.hidden = !isDrawerOpen;
    elements.recommendations.hidden = Boolean(state.title || state.artist || state.artworkUrl);
    elements.playerControls.hidden = !elements.recommendations.hidden;

    if (!isSeeking) {
      elements.seek.value = String(state.currentSeconds);
    }

    renderQuickPicks(elements.recommendationList, state.quickPicks);
    renderQuickPicks(elements.drawerList, state.quickPicks);

    if (state.artworkUrl) {
      elements.artwork.style.backgroundImage = `url("${state.artworkUrl}")`;
      elements.artwork.textContent = "";
    } else {
      elements.artwork.style.backgroundImage = "";
      elements.artwork.textContent = "YTM";
    }
  }

  function renderQuickPicks(list, quickPicks = []) {
    list.innerHTML = quickPicks.length
      ? quickPicks
        .map((item, index) => `
          <button class="quick-pick" data-quick-pick-index="${index}">
            <span class="quick-pick-title">${item.title}</span>
            <span class="quick-pick-artist">${item.artist || "YouTube Music"}</span>
          </button>
        `)
        .join("")
      : `<p class="empty">Open YouTube Music Home to load Quick picks.</p>`;
  }

  async function open() {
    if (!isSupported()) {
      return false;
    }

    pipWindow = await window.documentPictureInPicture.requestWindow({
      width: 460,
      height: 240,
    });

    pipWindow.document.body.innerHTML = `
      <style>
        body {
          margin: 0;
          background: #111318;
          color: #f6f7fb;
          font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .player {
          box-sizing: border-box;
          display: grid;
          gap: 16px;
          grid-template-columns: minmax(0, 1fr) 176px;
          min-height: 100vh;
          padding: 16px;
        }
        .body { min-width: 0; }
        .body[hidden], .drawer[hidden], .recommendations[hidden] { display: none; }
        .art {
          align-self: center;
          aspect-ratio: 1 / 1;
          background: linear-gradient(135deg, #e94f37, #1f8a70);
          background-position: center;
          background-size: cover;
          border-radius: 8px;
          display: grid;
          place-items: center;
          color: rgba(255,255,255,.72);
          font-weight: 800;
          letter-spacing: .12em;
          height: 176px;
          width: 176px;
        }
        h1 { margin: 0 0 4px; font-size: 18px; line-height: 1.2; }
        p { margin: 0; color: #aab2bd; font-size: 13px; }
        .progress { min-height: 18px; margin-top: 12px; color: #ffcc33; font-size: 12px; }
        input[type="range"] {
          accent-color: #ffcc33;
          margin-top: 10px;
          width: 100%;
        }
        .controls { display: grid; grid-template-columns: 1fr 1.4fr 1fr; gap: 8px; margin-top: 14px; }
        .drawer-button { margin-top: 8px; width: 100%; }
        .drawer {
          background: #111318;
          box-sizing: border-box;
          inset: 0;
          overflow: auto;
          padding: 16px;
          position: fixed;
          z-index: 2;
        }
        .drawer-header {
          align-items: center;
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .drawer-header h2, .recommendations h2 {
          font-size: 16px;
          margin: 0;
        }
        .quick-picks {
          display: grid;
          gap: 8px;
          margin-top: 10px;
        }
        .quick-pick {
          display: grid;
          gap: 2px;
          justify-items: start;
          padding: 9px 10px;
          text-align: left;
        }
        .quick-pick-title {
          color: #f6f7fb;
          font-weight: 700;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          width: 100%;
        }
        .quick-pick-artist, .empty {
          color: #aab2bd;
          font-size: 12px;
        }
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
        <section class="body">
          <h1 data-role="title">Open YouTube Music</h1>
          <p data-role="artist">No track loaded</p>
          <div class="progress" data-role="progress"></div>
          <input data-role="seek" type="range" min="0" max="1" value="0" step="1" aria-label="Seek playback position">
          <div class="controls">
            <button data-role="previous">Prev</button>
            <button class="primary" data-role="playPause">Play</button>
            <button data-role="next">Next</button>
          </div>
          <button class="drawer-button" data-role="openDrawer">Quick picks</button>
        </section>
        <section class="body recommendations" data-role="recommendations" hidden>
          <h2>Quick picks</h2>
          <div class="quick-picks" data-role="recommendationList"></div>
        </section>
        <div class="art" data-role="artwork">YTM</div>
        <section class="drawer" data-role="drawer" hidden>
          <div class="drawer-header">
            <h2>Quick picks</h2>
            <button data-role="closeDrawer">Close</button>
          </div>
          <div class="quick-picks" data-role="drawerList"></div>
        </section>
      </main>
    `;

    elements = {
      artwork: pipWindow.document.querySelector("[data-role='artwork']"),
      title: pipWindow.document.querySelector("[data-role='title']"),
      artist: pipWindow.document.querySelector("[data-role='artist']"),
      progress: pipWindow.document.querySelector("[data-role='progress']"),
      seek: pipWindow.document.querySelector("[data-role='seek']"),
      playPause: pipWindow.document.querySelector("[data-role='playPause']"),
      playerControls: pipWindow.document.querySelector("[data-role='title']").closest(".body"),
      recommendations: pipWindow.document.querySelector("[data-role='recommendations']"),
      recommendationList: pipWindow.document.querySelector("[data-role='recommendationList']"),
      drawer: pipWindow.document.querySelector("[data-role='drawer']"),
      drawerList: pipWindow.document.querySelector("[data-role='drawerList']"),
    };

    pipWindow.document.querySelector("[data-role='previous']").addEventListener("click", onPrevious);
    pipWindow.document.querySelector("[data-role='playPause']").addEventListener("click", onPlayPause);
    pipWindow.document.querySelector("[data-role='next']").addEventListener("click", onNext);
    pipWindow.document.querySelector("[data-role='openDrawer']").addEventListener("click", () => {
      isDrawerOpen = true;
      update();
    });
    pipWindow.document.querySelector("[data-role='closeDrawer']").addEventListener("click", () => {
      isDrawerOpen = false;
      update();
    });
    pipWindow.document.addEventListener("click", (event) => {
      const button = event.target instanceof pipWindow.Element
        ? event.target.closest("[data-quick-pick-index]")
        : null;

      if (!button) {
        return;
      }

      onQuickPick(Number(button.dataset.quickPickIndex));
      isDrawerOpen = false;
      window.setTimeout(() => update(), 500);
    });
    elements.seek.addEventListener("input", () => {
      isSeeking = true;
    });
    elements.seek.addEventListener("change", () => {
      isSeeking = false;
      onSeek(Number(elements.seek.value));
      window.setTimeout(() => update(), 150);
    });
    pipWindow.addEventListener("pagehide", () => {
      pipWindow = null;
      elements = null;
    });

    update();
    return true;
  }

  return { isSupported, open, update };
}
