(function loadFloatingPlayer() {
  const url = chrome.runtime.getURL("src/bootstrap.js");

  import(url).catch((error) => {
    console.error("[YTM Floating Player] Failed to start", error);
  });
})();
