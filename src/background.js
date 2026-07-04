chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id && tab.url?.startsWith("https://music.youtube.com/")) {
    await chrome.tabs.sendMessage(tab.id, { type: "OPEN_YTM_FLOATING_PLAYER" });
    return;
  }

  const [musicTab] = await chrome.tabs.query({ url: "https://music.youtube.com/*" });

  if (musicTab?.id) {
    await chrome.tabs.sendMessage(musicTab.id, { type: "OPEN_YTM_FLOATING_PLAYER" });
    return;
  }

  if (!tab.id) {
    await chrome.tabs.create({ url: "https://music.youtube.com/" });
    return;
  }

  await chrome.tabs.create({ url: "https://music.youtube.com/" });
});
