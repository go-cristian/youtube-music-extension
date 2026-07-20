import { createPipController } from "./pip.js";
import { createPlayerAdapter } from "./playerAdapter.js";

if (!window.__ytmFloatingPlayerLoaded) {
  window.__ytmFloatingPlayerLoaded = true;

  const adapter = createPlayerAdapter(document);
  const pip = createPipController({
    getState: adapter.getState,
    onPlayPause: adapter.togglePlayPause,
    onPrevious: adapter.previous,
    onNext: adapter.next,
    onSeek: adapter.seekTo,
    onQuickPick: adapter.playQuickPick,
  });

  const refresh = () => {
    const state = adapter.getState();
    pip.update(state);
  };

  function removeOpenButton() {
    document.querySelector("[data-ytm-pip-recovery]")?.remove();
  }

  function showOpenButton() {
    removeOpenButton();

    const button = document.createElement("button");
    button.dataset.ytmPipRecovery = "true";
    button.textContent = "Open mini player";
    button.style.cssText = [
      "position: fixed",
      "right: 24px",
      "bottom: 24px",
      "z-index: 2147483647",
      "border: 0",
      "border-radius: 999px",
      "padding: 12px 16px",
      "background: #ffcc33",
      "color: #181818",
      "box-shadow: 0 12px 30px rgba(0, 0, 0, 0.28)",
      "font: 700 14px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      "cursor: pointer",
    ].join(";");

    button.addEventListener("click", async () => {
      const opened = await pip.open().catch((error) => {
        console.error("[YTM Floating Player] Failed to open mini player from page", error);
        return false;
      });

      if (opened) {
        removeOpenButton();
      }
    });

    document.documentElement.append(button);
    button.focus({ preventScroll: true });
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "PING_YTM_FLOATING_PLAYER") {
      sendResponse({ ok: true });
      return false;
    }

    if (message?.type === "SHOW_YTM_FLOATING_PLAYER_BUTTON") {
      showOpenButton();
      sendResponse({ ok: true });
      return false;
    }

    if (message?.type === "GET_YTM_PLAYER_STATE") {
      sendResponse({ ok: true, state: adapter.getState() });
      return false;
    }

    if (message?.type === "YTM_PLAYER_COMMAND") {
      if (message.command === "playPause") {
        adapter.togglePlayPause();
      }

      if (message.command === "previous") {
        adapter.previous();
      }

      if (message.command === "next") {
        adapter.next();
      }

      if (message.command === "seek") {
        adapter.seekTo(message.positionSeconds);
      }

      window.setTimeout(() => sendResponse({ ok: true, state: adapter.getState() }), 150);
      return true;
    }

    if (message?.type !== "OPEN_YTM_FLOATING_PLAYER") {
      return false;
    }

    pip.open()
      .then((opened) => sendResponse({ opened }))
      .catch((error) => {
        console.error("[YTM Floating Player] Failed to open mini player from page", error);
        showOpenButton();
        sendResponse({ opened: false, recoveryShown: true, error: error?.message ?? String(error) });
      });

    return true;
  });

  adapter.subscribe(refresh);
  window.setInterval(refresh, 1000);
}
