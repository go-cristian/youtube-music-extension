const YOUTUBE_MUSIC_URL = "https://music.youtube.com/";
const YOUTUBE_MUSIC_MATCH = "https://music.youtube.com/*";

let activeMusicTabId = 0;
let fallbackWindowId = 0;

async function findMusicTab(activeTab) {
  if (activeTab?.id && activeTab.url?.startsWith(YOUTUBE_MUSIC_URL)) {
    return activeTab;
  }

  const [musicTab] = await chrome.tabs.query({ url: YOUTUBE_MUSIC_MATCH });
  return musicTab ?? null;
}

async function ensureMusicTab(activeTab) {
  const musicTab = await findMusicTab(activeTab);

  if (musicTab?.id) {
    activeMusicTabId = musicTab.id;
    return musicTab;
  }

  const createdTab = await chrome.tabs.create({ url: YOUTUBE_MUSIC_URL, active: true });
  activeMusicTabId = createdTab.id ?? 0;
  return createdTab;
}

async function ensureContentScript(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: "PING_YTM_FLOATING_PLAYER" });
    return;
  } catch (_error) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["src/content.js"],
    });
  }
}

async function sendToMusicTab(message) {
  if (!activeMusicTabId) {
    const musicTab = await findMusicTab();
    activeMusicTabId = musicTab?.id ?? 0;
  }

  if (!activeMusicTabId) {
    throw new Error("No YouTube Music tab is available");
  }

  await ensureContentScript(activeMusicTabId);
  return chrome.tabs.sendMessage(activeMusicTabId, message);
}

async function openFallbackWindow() {
  const window = await chrome.windows.create({
    url: chrome.runtime.getURL("src/fallback.html"),
    type: "popup",
    width: 340,
    height: 430,
    focused: true,
  });

  fallbackWindowId = window.id ?? 0;
}

async function openMiniPlayer(activeTab) {
  const musicTab = await ensureMusicTab(activeTab);

  if (!musicTab.id || !musicTab.url?.startsWith(YOUTUBE_MUSIC_URL)) {
    return;
  }

  await ensureContentScript(musicTab.id);
  const response = await chrome.tabs.sendMessage(musicTab.id, { type: "OPEN_YTM_FLOATING_PLAYER" });

  if (!response?.opened) {
    await openFallbackWindow();
  }
}

chrome.action.onClicked.addListener((tab) => {
  openMiniPlayer(tab).catch((error) => {
    console.error("[YTM Floating Player] Failed to open player", error);
    openFallbackWindow();
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target !== "YTM_FLOATING_PLAYER_BACKGROUND") {
    return false;
  }

  if (message.type === "OPEN_MUSIC_TAB") {
    chrome.tabs.create({ url: YOUTUBE_MUSIC_URL, active: true })
      .then((tab) => {
        activeMusicTabId = tab.id ?? 0;
        sendResponse({ ok: true });
      });
    return true;
  }

  sendToMusicTab(message)
    .then((response) => sendResponse(response))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});

chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === fallbackWindowId) {
    fallbackWindowId = 0;
  }
});
