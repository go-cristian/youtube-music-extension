import {
  getStoredThemeId,
  getTheme,
  getThemeOptions,
  saveThemeId,
  themeToCssVariables,
} from "./themeEngine.js";
import { renderIcon } from "./icons.js";

export function createPipController({ getState, onPlayPause, onPrevious, onNext, onSeek, onQuickPick }) {
  let pipWindow = null;
  let elements = null;
  let isSeeking = false;
  let isDrawerOpen = false;
  let isThemePickerOpen = false;
  let currentTheme = getTheme("tile");
  let currentArtworkUrl = "";
  let currentArtworkAccent = currentTheme.tokens.artworkAccent;

  function isSupported() {
    return "documentPictureInPicture" in window;
  }

  function update(state = getState()) {
    if (!pipWindow || !elements) {
      return;
    }

    const hasTrack = Boolean(state.title || state.artist || state.artworkUrl);
    const shouldShowQuickPicks = isDrawerOpen || !hasTrack;
    const quickPicksMode = currentTheme.blocks.quickPicks.mode;
    const controls = currentTheme.blocks.controls;
    const playPauseKey = state.isPlaying ? "pause" : "play";

    elements.title.textContent = state.title || "YouTube Music";
    elements.artist.textContent = state.artist || "";
    setControl(elements.previous, controls, "previous");
    setControl(elements.playPause, controls, playPauseKey);
    setControl(elements.next, controls, "next");
    setControl(elements.drawerButton, controls, "quickPicks");
    setControl(elements.themeButton, controls, "themes");
    setControl(elements.closeDrawer, controls, "close");
    setControl(elements.closeThemePicker, controls, "close");
    elements.progress.textContent = state.progressText || "";
    elements.seek.disabled = state.durationSeconds <= 0;
    elements.seek.max = String(Math.max(state.durationSeconds, 1));
    elements.drawer.hidden = !shouldShowQuickPicks;
    elements.drawer.dataset.mode = quickPicksMode;
    elements.themeSheet.hidden = !isThemePickerOpen;
    elements.drawerButton.hidden = false;
    elements.emptyHint.hidden = hasTrack;
    elements.playerControls.hidden = false;
    elements.themeStyle.textContent = `:root {\n${themeToCssVariables({
      ...currentTheme,
      tokens: {
        ...currentTheme.tokens,
        artworkAccent: currentArtworkAccent,
      },
    })}\n}`;
    elements.player.className = `player theme-${currentTheme.layout.variant} controls-${controls.variant}`;
    elements.player.dataset.background = currentTheme.background.kind;
    elements.player.dataset.motion = currentTheme.background.animation;

    if (!isSeeking) {
      elements.seek.value = String(state.currentSeconds);
    }

    renderQuickPicks(elements.drawerList, state.quickPicks);
    renderThemePicker();

    if (state.artworkUrl) {
      elements.artwork.style.backgroundImage = `url("${state.artworkUrl}")`;
      elements.artwork.textContent = "";
      updateArtworkAccent(state.artworkUrl);
    } else {
      currentArtworkUrl = "";
      currentArtworkAccent = currentTheme.tokens.artworkAccent;
      elements.artwork.style.backgroundImage = "";
      elements.artwork.textContent = "YTM";
    }
  }

  function getControlContent(controls, key) {
    if (controls.variant === "icon-text" && controls.labels[key]) {
      return `${renderIcon(controls.icons[key], controls.icons[key])}<span>${controls.labels[key]}</span>`;
    }

    return renderIcon(controls.icons[key], controls.icons[key] || controls.labels[key]);
  }

  function setControl(button, controls, key) {
    button.innerHTML = getControlContent(controls, key);
  }

  function getPreferredWindowSize(theme) {
    return {
      width: theme.layout.viewport.width,
      height: theme.layout.viewport.height,
    };
  }

  function applyPreferredWindowSize(theme) {
    if (!pipWindow) {
      return;
    }

    const { width, height } = getPreferredWindowSize(theme);

    try {
      pipWindow.resizeTo(width, height);
    } catch {
      // Some Chromium builds ignore PiP resize requests after creation.
    }
  }

  function renderThemePicker() {
    elements.themePicker.innerHTML = getThemeOptions()
      .map((theme) => `
        <button class="${theme.id === currentTheme.id ? "active" : ""}" data-theme-id="${theme.id}">
          ${theme.shortName}
        </button>
      `)
      .join("");
  }

  function renderQuickPicks(list, quickPicks = []) {
    list.innerHTML = quickPicks.length
      ? quickPicks
        .map((item, index) => `
          <button class="quick-pick" data-quick-pick-index="${index}">
            <span class="quick-pick-art" style="${item.artworkUrl ? `background-image: url('${item.artworkUrl}')` : ""}">${item.artworkUrl ? "" : "♪"}</span>
            <span class="quick-pick-copy">
              <span class="quick-pick-title">${item.title}</span>
              <span class="quick-pick-artist">${item.artist || "YouTube Music"}</span>
            </span>
          </button>
        `)
        .join("")
      : `<p class="empty">♪</p>`;
  }

  function updateArtworkAccent(artworkUrl) {
    if (!currentTheme.background.usesArtworkColor || artworkUrl === currentArtworkUrl) {
      return;
    }

    currentArtworkUrl = artworkUrl;

    extractArtworkAccent(artworkUrl)
      .then((color) => {
        if (!color || artworkUrl !== currentArtworkUrl) {
          return;
        }

        currentArtworkAccent = color;
        update();
      })
      .catch(() => {
        currentArtworkAccent = currentTheme.tokens.artworkAccent;
      });
  }

  function extractArtworkAccent(artworkUrl) {
    return new Promise((resolve) => {
      const image = new Image();

      image.crossOrigin = "anonymous";
      image.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const size = 24;
          const context = canvas.getContext("2d", { willReadFrequently: true });

          canvas.width = size;
          canvas.height = size;

          if (!context) {
            resolve("");
            return;
          }

          context.drawImage(image, 0, 0, size, size);

          const { data } = context.getImageData(0, 0, size, size);
          const totals = { red: 0, green: 0, blue: 0, count: 0 };

          for (let index = 0; index < data.length; index += 4) {
            const alpha = data[index + 3];

            if (alpha < 128) {
              continue;
            }

            totals.red += data[index];
            totals.green += data[index + 1];
            totals.blue += data[index + 2];
            totals.count += 1;
          }

          if (!totals.count) {
            resolve("");
            return;
          }

          resolve(`rgb(${Math.round(totals.red / totals.count)}, ${Math.round(totals.green / totals.count)}, ${Math.round(totals.blue / totals.count)})`);
        } catch {
          resolve("");
        }
      };
      image.onerror = () => resolve("");
      image.src = artworkUrl;
    });
  }

  async function open() {
    if (!isSupported()) {
      return false;
    }

    currentTheme = getTheme(await getStoredThemeId());

    pipWindow = await window.documentPictureInPicture.requestWindow(getPreferredWindowSize(currentTheme));

    pipWindow.document.body.innerHTML = `
      <style>
        body {
          display: grid;
          min-height: 100vh;
          min-width: 100vw;
          margin: 0;
          overflow: auto;
          padding: 0 0 16px;
          place-items: start center;
          background:
            radial-gradient(circle at 50% 12%, color-mix(in srgb, var(--ytmp-artwork-accent) 34%, transparent), transparent 34%),
            var(--ytmp-surface);
          color: var(--ytmp-text-primary);
          font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .player {
          box-sizing: border-box;
          display: grid;
          gap: 16px;
          grid-template-columns: var(--ytmp-columns, minmax(0, 1fr) 176px);
          height: var(--ytmp-window-height);
          margin: 0 auto 24px;
          padding: 14px 16px;
          position: relative;
          overflow: hidden;
          width: var(--ytmp-window-width);
        }
        .player > * {
          position: relative;
          z-index: 1;
        }
        .player::before {
          content: "";
          inset: 0;
          opacity: .95;
          pointer-events: none;
          position: absolute;
          z-index: 0;
        }
        .player[data-background="solid"]::before {
          background: var(--ytmp-surface);
        }
        .player[data-background="transparent"]::before {
          background:
            radial-gradient(circle at 78% 16%, color-mix(in srgb, var(--ytmp-artwork-accent) 35%, transparent), transparent 34%),
            color-mix(in srgb, var(--ytmp-surface) 76%, transparent);
        }
        .player[data-background="artworkGlow"]::before {
          background:
            radial-gradient(circle at 50% 14%, color-mix(in srgb, var(--ytmp-artwork-accent) 42%, transparent), transparent 38%),
            linear-gradient(180deg, color-mix(in srgb, var(--ytmp-surface) 86%, transparent), var(--ytmp-surface));
        }
        .player[data-background="grid"]::before {
          background:
            linear-gradient(color-mix(in srgb, var(--ytmp-artwork-accent) 16%, transparent) 1px, transparent 1px),
            linear-gradient(90deg, color-mix(in srgb, var(--ytmp-artwork-accent) 12%, transparent) 1px, transparent 1px),
            var(--ytmp-surface);
          background-size: 18px 18px;
        }
        .player[data-background="paperStack"]::before {
          background:
            linear-gradient(156deg, transparent 0 18%, color-mix(in srgb, var(--ytmp-artwork-accent) 18%, transparent) 18% 42%, transparent 42%),
            var(--ytmp-surface);
        }
        .player[data-background="signal"]::before {
          background:
            repeating-linear-gradient(90deg, color-mix(in srgb, var(--ytmp-artwork-accent) 18%, transparent) 0 1px, transparent 1px 16px),
            radial-gradient(circle at 80% 44%, color-mix(in srgb, var(--ytmp-artwork-accent) 30%, transparent), transparent 36%),
            var(--ytmp-surface);
        }
        .player[data-motion="breathe"]::before {
          animation: breathe-bg 4s ease-in-out infinite;
        }
        .player[data-motion="drift"]::before,
        .player[data-motion="scan"]::before,
        .player[data-motion="wave"]::before {
          animation: drift-bg 7s linear infinite;
        }
        .player[data-motion="float"] .art {
          animation: float-art 3.4s ease-in-out infinite;
        }
        .theme-console {
          border-left: 3px solid var(--ytmp-accent);
          position: relative;
        }
        .theme-console::before {
          color: color-mix(in srgb, var(--ytmp-accent) 45%, transparent);
          content: "LIVE";
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 10px;
          letter-spacing: .18em;
          position: absolute;
          right: 14px;
          top: 10px;
        }
        .theme-console .art {
          border: 1px solid color-mix(in srgb, var(--ytmp-accent) 44%, transparent);
          box-shadow: inset 0 0 18px rgba(124,255,138,.14);
          height: 112px;
          width: 112px;
        }
        .theme-console h1 {
          color: var(--ytmp-accent);
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 16px;
          text-transform: uppercase;
        }
        .theme-console .quick-pick {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        .theme-console .art {
          animation: pulse-soft 2.8s ease-in-out infinite;
        }
        .theme-console .body {
          padding-bottom: 76px;
          padding-right: 10px;
        }
        .theme-console .controls {
          bottom: 20px;
          grid-template-columns: 38px 48px 38px;
          left: 18px;
          margin-top: 0;
          position: absolute;
        }
        .theme-console .utility-controls {
          bottom: 20px;
          grid-template-columns: 40px 40px;
          margin-top: 0;
          position: absolute;
          right: 16px;
        }
        .theme-tile {
          grid-template-columns: 1fr;
          grid-template-rows: 132px minmax(0, 1fr);
        }
        .theme-tile .art {
          grid-row: 1;
          height: 132px;
          justify-self: center;
          width: 132px;
        }
        .theme-tile .body {
          align-self: start;
          padding-bottom: 0;
          text-align: center;
        }
        .theme-tile .controls {
          max-width: 280px;
          margin: 14px auto 0;
          position: static;
          transform: none;
          width: 260px;
        }
        .theme-tile .utility-controls {
          grid-template-columns: 38px 38px;
          justify-content: center;
          margin: 10px auto 0;
          position: static;
          transform: none;
          width: 84px;
        }
        .theme-tile .utility-controls button {
          height: 38px;
          padding: 0;
        }
        .theme-tile .art {
          animation: scale-soft 260ms ease-out;
        }
        .theme-glass {
          background:
            linear-gradient(145deg, rgba(255,255,255,.08), transparent 42%),
            var(--ytmp-surface);
        }
        .theme-glass .art {
          border-radius: 18px;
          box-shadow: 0 18px 44px rgba(0,0,0,.28);
          height: 150px;
          transform: rotate(4deg) translateY(6px);
          width: 150px;
        }
        .theme-glass .body {
          align-self: center;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 16px;
          padding: 16px 18px;
          width: 320px;
        }
        .theme-glass .drawer,
        .theme-glass .theme-sheet {
          backdrop-filter: blur(16px);
          background: color-mix(in srgb, var(--ytmp-surface) 82%, transparent);
        }
        .theme-glass .controls {
          grid-template-columns: 42px 58px 42px;
          justify-content: center;
          margin: 14px auto 0;
          position: static;
          width: 158px;
        }
        .theme-glass .controls button:first-child {
          transform: none;
        }
        .theme-glass .controls .primary {
          transform: none;
        }
        .theme-glass .controls button:last-child {
          transform: none;
        }
        .theme-glass .utility-controls {
          grid-template-columns: 42px 42px;
          justify-content: center;
          margin: 10px auto 0;
          position: static;
          width: 90px;
        }
        .theme-stack {
          align-items: center;
          gap: 18px;
        }
        .theme-stack .art {
          box-shadow:
            -8px 8px 0 color-mix(in srgb, var(--ytmp-accent) 26%, transparent),
            -16px 16px 0 color-mix(in srgb, var(--ytmp-surface-alt) 80%, transparent);
          height: 132px;
          justify-self: end;
          transform: rotate(-4deg);
          width: 132px;
        }
        .theme-stack .body {
          border-left: 0;
          min-width: 0;
          padding-left: 0;
          padding-bottom: 52px;
        }
        .theme-stack h1 {
          font-family: Georgia, "Times New Roman", serif;
          font-size: 20px;
          line-height: 1.05;
        }
        .theme-stack .progress {
          border-bottom: 1px solid color-mix(in srgb, var(--ytmp-accent) 38%, transparent);
          padding-bottom: 6px;
        }
        .theme-stack .quick-pick {
          border-left: 3px solid var(--ytmp-accent);
        }
        .theme-stack .controls {
          grid-template-columns: 48px 68px 48px;
          margin-left: 76px;
          margin-top: 18px;
        }
        .theme-stack .utility-controls {
          bottom: 20px;
          display: grid;
          grid-template-columns: 36px 36px;
          gap: 6px;
          left: 14px;
          margin-top: 0;
          position: absolute;
        }
        .theme-stack .utility-controls button {
          height: 36px;
          padding: 0;
          width: 36px;
        }
        .theme-signal {
          position: relative;
        }
        .theme-signal::after {
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 8px,
            rgba(255,255,255,.035) 9px
          );
          content: "";
          inset: 0;
          pointer-events: none;
          position: absolute;
          z-index: 0;
        }
        .theme-signal .art {
          border-radius: 999px;
          height: 136px;
          outline: 1px solid color-mix(in srgb, var(--ytmp-accent) 55%, transparent);
          outline-offset: 7px;
          width: 136px;
        }
        .theme-signal h1 {
          letter-spacing: .08em;
          text-transform: uppercase;
        }
        .theme-signal .body {
          padding-top: 76px;
          padding-bottom: 54px;
        }
        .theme-signal .controls {
          border: 1px solid color-mix(in srgb, var(--ytmp-accent) 42%, transparent);
          left: 16px;
          margin-top: 0;
          padding: 4px;
          position: absolute;
          right: 16px;
          top: 28px;
        }
        .theme-signal .utility-controls {
          bottom: 22px;
          display: flex;
          gap: 6px;
          margin-top: 0;
          position: absolute;
          right: 16px;
        }
        .theme-signal .utility-controls button {
          height: 34px;
          padding: 0;
          width: 34px;
        }
        .body { min-width: 0; }
        .body[hidden], .drawer[hidden], .empty-hint[hidden], .theme-sheet[hidden] { display: none; }
        .art {
          align-self: center;
          aspect-ratio: 1 / 1;
          background: linear-gradient(135deg, var(--ytmp-accent), #1f8a70);
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
        h1 {
          font-size: 18px;
          line-height: 1.2;
          margin: 0 0 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        p {
          color: var(--ytmp-text-muted);
          font-size: 13px;
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .progress { min-height: 18px; margin-top: 12px; color: var(--ytmp-accent); font-size: 12px; }
        input[type="range"] {
          accent-color: var(--ytmp-accent);
          margin-top: 10px;
          width: 100%;
        }
        .controls { display: grid; grid-template-columns: 1fr 1.4fr 1fr; gap: 8px; margin-top: 14px; }
        .controls-icon-buttons button,
        .controls-floating-icons button,
        .controls-console-keys button,
        .controls-orbital button,
        .controls-stacked button,
        .controls-signal-strip button {
          font-size: 18px;
          font-weight: 800;
        }
        .controls-floating-icons .controls {
          grid-template-columns: 44px 58px 44px;
          justify-content: center;
        }
        .controls-floating-icons .controls button {
          border-radius: 999px;
          min-height: 44px;
          padding: 0;
        }
        .controls-console-keys .controls button {
          border: 1px solid color-mix(in srgb, var(--ytmp-accent) 36%, transparent);
          border-radius: 3px;
          box-shadow: inset 0 -2px 0 rgba(0,0,0,.24);
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        .controls-orbital .controls {
          grid-template-columns: 40px 64px 40px;
          justify-content: start;
        }
        .controls-orbital .controls button {
          border-radius: 999px;
          min-height: 40px;
          padding: 0;
        }
        .controls-orbital .controls .primary {
          min-height: 64px;
          transform: translateY(-10px);
        }
        .controls-stacked .controls {
          grid-template-columns: 42px 58px 42px;
          justify-content: start;
          max-width: 170px;
        }
        .controls-stacked .controls button {
          border-radius: 0;
          min-height: 38px;
          padding: 0;
        }
        .controls-stacked .controls button:first-child {
          transform: translateY(8px);
        }
        .controls-stacked .controls button:last-child {
          transform: translateY(-8px);
        }
        .controls-signal-strip .controls {
          border: 1px solid color-mix(in srgb, var(--ytmp-accent) 42%, transparent);
          grid-template-columns: 1fr 1fr 1fr;
          padding: 4px;
        }
        .controls-signal-strip .controls button {
          border-radius: 2px;
          min-height: 34px;
          padding: 0;
        }
        .theme-console.controls-console-keys .controls {
          bottom: 20px;
          grid-template-columns: 38px 48px 38px;
          left: 18px;
          position: absolute;
        }
        .theme-glass.controls-orbital .controls {
          bottom: auto;
          grid-template-columns: 42px 58px 42px;
          justify-content: center;
          position: static;
          right: auto;
          width: 158px;
        }
        .theme-glass.controls-orbital .controls button:first-child {
          transform: none;
        }
        .theme-glass.controls-orbital .controls .primary {
          min-height: 48px;
          transform: none;
        }
        .theme-glass.controls-orbital .controls button:last-child {
          transform: none;
        }
        .theme-stack.controls-stacked .controls {
          grid-template-columns: 46px 62px 46px;
          max-width: 176px;
        }
        .theme-stack.controls-stacked .controls button:first-child {
          transform: translateY(7px) rotate(-8deg);
        }
        .theme-stack.controls-stacked .controls button:last-child {
          transform: translateY(-7px) rotate(8deg);
        }
        .theme-signal.controls-signal-strip .controls {
          left: 16px;
          position: absolute;
          right: 16px;
          top: 28px;
        }
        .utility-controls {
          display: grid;
          gap: 8px;
          grid-template-columns: 1fr 44px;
          margin-top: 8px;
        }
        .drawer-button { min-width: 0; }
        .theme-button { padding: 0; }
        .drawer {
          background: var(--ytmp-surface);
          box-sizing: border-box;
          overflow: auto;
          padding: 16px;
          position: absolute;
          z-index: 2;
        }
        .drawer[data-mode="drawer"] {
          animation: slide-up 180ms ease-out;
          inset: 0;
        }
        .drawer[data-mode="sidePanel"] {
          animation: slide-right 180ms ease-out;
          bottom: 0;
          right: 0;
          top: 0;
          width: 230px;
        }
        .drawer[data-mode="bottomSheet"] {
          animation: slide-up 180ms ease-out;
          border-radius: 14px 14px 0 0;
          bottom: 0;
          left: 0;
          max-height: 72vh;
          right: 0;
        }
        .drawer-header {
          align-items: center;
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .drawer-header h2 {
          font-size: 16px;
          margin: 0;
        }
        .drawer-header button {
          border-radius: 999px;
          display: grid;
          font-size: 18px;
          height: 34px;
          padding: 0;
          place-items: center;
          width: 34px;
        }
        .quick-picks {
          display: grid;
          gap: 8px;
          margin-top: 10px;
        }
        .quick-pick {
          align-items: center;
          display: grid;
          gap: 2px;
          grid-template-columns: 42px minmax(0, 1fr);
          justify-items: start;
          padding: 9px 10px;
          text-align: left;
        }
        .drawer[data-mode="bottomSheet"] .quick-picks {
          display: flex;
          overflow-x: auto;
        }
        .drawer[data-mode="bottomSheet"] .quick-pick {
          min-width: 180px;
        }
        .quick-pick-art {
          align-items: center;
          aspect-ratio: 1 / 1;
          background: linear-gradient(135deg, var(--ytmp-accent), #1f8a70);
          background-position: center;
          background-size: cover;
          border-radius: 6px;
          color: #181818;
          display: flex;
          font-weight: 800;
          justify-content: center;
          width: 34px;
        }
        .quick-pick-copy {
          display: grid;
          gap: 2px;
          min-width: 0;
        }
        .quick-pick-title {
          color: var(--ytmp-text-primary);
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
          align-items: center;
          border: 0;
          border-radius: 8px;
          padding: 10px;
          background: var(--ytmp-surface-alt);
          color: var(--ytmp-text-primary);
          font: inherit;
          cursor: pointer;
          display: inline-flex;
          justify-content: center;
        }
        .lucide-icon {
          fill: none;
          height: 18px;
          stroke: currentColor;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-width: 2;
          width: 18px;
        }
        button.primary { background: var(--ytmp-accent); color: #181818; font-weight: 800; }
        button.quick-pick {
          display: grid;
        }
        .theme-sheet {
          animation: slide-up 180ms ease-out;
          background: var(--ytmp-surface);
          border-top: 1px solid rgba(255,255,255,.12);
          bottom: 0;
          box-sizing: border-box;
          left: 0;
          padding: 12px;
          position: absolute;
          right: 0;
          z-index: 3;
        }
        .theme-picker {
          display: flex;
          gap: 6px;
          overflow-x: auto;
        }
        .theme-picker button {
          flex: 0 0 auto;
          min-width: 76px;
          padding: 7px 8px;
        }
        .theme-picker button.active {
          background: var(--ytmp-accent);
          color: #181818;
          font-weight: 800;
        }
        @keyframes pulse-soft {
          0%, 100% { box-shadow: 0 0 0 rgba(124,255,138,0); }
          50% { box-shadow: 0 0 24px rgba(124,255,138,.22); }
        }
        @keyframes scale-soft {
          from { transform: scale(.96); opacity: .85; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-right {
          from { opacity: 0; transform: translateX(18px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes breathe-bg {
          0%, 100% { opacity: .88; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.06); }
        }
        @keyframes drift-bg {
          from { background-position: 0 0, 0 0, 0 0; }
          to { background-position: 32px 18px, 16px 32px, 0 0; }
        }
        @keyframes float-art {
          0%, 100% { transform: rotate(4deg) translateY(6px); }
          50% { transform: rotate(2deg) translateY(-2px); }
        }
      </style>
      <style data-role="themeStyle"></style>
      <main class="player" data-role="player">
        <section class="body">
          <h1 data-role="title">Open YouTube Music</h1>
          <p data-role="artist">No track loaded</p>
          <p class="empty-hint" data-role="emptyHint">♪</p>
          <div class="progress" data-role="progress"></div>
          <input data-role="seek" type="range" min="0" max="1" value="0" step="1" aria-label="Seek playback position">
          <div class="controls">
            <button data-role="previous">Prev</button>
            <button class="primary" data-role="playPause">Play</button>
            <button data-role="next">Next</button>
          </div>
          <div class="utility-controls">
            <button class="drawer-button" data-role="openDrawer">♪</button>
            <button class="theme-button" data-role="openThemePicker">◐</button>
          </div>
        </section>
        <div class="art" data-role="artwork">YTM</div>
        <section class="drawer" data-role="drawer" hidden>
          <div class="drawer-header">
            <h2>♪</h2>
            <button data-role="closeDrawer">×</button>
          </div>
          <div class="quick-picks" data-role="drawerList"></div>
        </section>
        <section class="theme-sheet" data-role="themeSheet" hidden>
          <div class="drawer-header">
            <h2>◐</h2>
            <button data-role="closeThemePicker">×</button>
          </div>
          <nav class="theme-picker" data-role="themePicker" aria-label="Theme picker"></nav>
        </section>
      </main>
    `;

    elements = {
      artwork: pipWindow.document.querySelector("[data-role='artwork']"),
      player: pipWindow.document.querySelector("[data-role='player']"),
      title: pipWindow.document.querySelector("[data-role='title']"),
      artist: pipWindow.document.querySelector("[data-role='artist']"),
      progress: pipWindow.document.querySelector("[data-role='progress']"),
      seek: pipWindow.document.querySelector("[data-role='seek']"),
      previous: pipWindow.document.querySelector("[data-role='previous']"),
      playPause: pipWindow.document.querySelector("[data-role='playPause']"),
      next: pipWindow.document.querySelector("[data-role='next']"),
      playerControls: pipWindow.document.querySelector("[data-role='title']").closest(".body"),
      emptyHint: pipWindow.document.querySelector("[data-role='emptyHint']"),
      drawerButton: pipWindow.document.querySelector("[data-role='openDrawer']"),
      themeButton: pipWindow.document.querySelector("[data-role='openThemePicker']"),
      drawer: pipWindow.document.querySelector("[data-role='drawer']"),
      closeDrawer: pipWindow.document.querySelector("[data-role='closeDrawer']"),
      drawerList: pipWindow.document.querySelector("[data-role='drawerList']"),
      themeSheet: pipWindow.document.querySelector("[data-role='themeSheet']"),
      themePicker: pipWindow.document.querySelector("[data-role='themePicker']"),
      closeThemePicker: pipWindow.document.querySelector("[data-role='closeThemePicker']"),
      themeStyle: pipWindow.document.querySelector("[data-role='themeStyle']"),
    };

    pipWindow.document.querySelector("[data-role='previous']").addEventListener("click", onPrevious);
    pipWindow.document.querySelector("[data-role='playPause']").addEventListener("click", onPlayPause);
    pipWindow.document.querySelector("[data-role='next']").addEventListener("click", onNext);
    pipWindow.document.querySelector("[data-role='openDrawer']").addEventListener("click", () => {
      isDrawerOpen = true;
      isThemePickerOpen = false;
      update();
    });
    pipWindow.document.querySelector("[data-role='closeDrawer']").addEventListener("click", () => {
      isDrawerOpen = false;
      update();
    });
    pipWindow.document.querySelector("[data-role='openThemePicker']").addEventListener("click", () => {
      isDrawerOpen = false;
      isThemePickerOpen = true;
      update();
    });
    pipWindow.document.querySelector("[data-role='closeThemePicker']").addEventListener("click", () => {
      isThemePickerOpen = false;
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
    elements.themePicker.addEventListener("click", async (event) => {
      const button = event.target instanceof pipWindow.Element
        ? event.target.closest("[data-theme-id]")
        : null;

      if (!button) {
        return;
      }

      currentTheme = getTheme(await saveThemeId(chrome.storage.local, button.dataset.themeId));
      currentArtworkAccent = currentTheme.tokens.artworkAccent;
      currentArtworkUrl = "";
      applyPreferredWindowSize(currentTheme);
      isThemePickerOpen = false;
      update();
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
