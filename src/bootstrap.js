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
  });

  const refresh = () => {
    const state = adapter.getState();
    pip.update(state);
  };

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "PING_YTM_FLOATING_PLAYER") {
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

      window.setTimeout(() => sendResponse({ ok: true, state: adapter.getState() }), 150);
      return true;
    }

    if (message?.type !== "OPEN_YTM_FLOATING_PLAYER") {
      return false;
    }

    pip.open()
      .then((opened) => sendResponse({ opened }))
      .catch((error) => {
        console.error("[YTM Floating Player] Failed to open mini player", error);
        sendResponse({ opened: false, error: error.message });
      });

    return true;
  });

  adapter.subscribe(refresh);
  window.setInterval(refresh, 3000);
}
