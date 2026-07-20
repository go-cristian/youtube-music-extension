import themes from "./themes.json" with { type: "json" };

const DEFAULT_THEME_ID = "tile";
const STORAGE_KEY = "selectedThemeId";

const defaultTokens = {
  surface: "#111318",
  surfaceAlt: "#171b22",
  textPrimary: "#f6f7fb",
  textMuted: "#aab2bd",
  accent: "#ffcc33",
  artworkAccent: "#ffcc33",
  radius: "8px",
  gap: "12px",
};

function normalizeTheme(theme) {
  return {
    ...theme,
    tokens: {
      ...defaultTokens,
      ...theme.tokens,
    },
    layout: {
      type: "grid",
      columns: "minmax(0, 1fr) 176px",
      viewport: { width: 460, height: 240 },
      ...theme.layout,
    },
    background: {
      kind: "solid",
      usesArtworkColor: false,
      animation: "none",
      ...theme.background,
    },
    blocks: {
      controls: {
        variant: "icon-text",
        icons: {
          previous: "skip-back",
          play: "play",
          pause: "pause",
          next: "skip-forward",
          quickPicks: "list-music",
          themes: "palette",
          close: "x",
        },
        labels: { previous: "", play: "", pause: "", next: "", quickPicks: "", themes: "", close: "" },
      },
      quickPicks: { visible: true, mode: "drawer" },
      themePicker: { visible: true },
      ...theme.blocks,
    },
    animations: {
      drawer: "none",
      themeSwitch: "none",
      ...theme.animations,
    },
  };
}

export function getDefaultTheme() {
  return normalizeTheme(themes.find((theme) => theme.id === DEFAULT_THEME_ID));
}

export function getTheme(themeId) {
  return normalizeTheme(themes.find((theme) => theme.id === themeId) ?? getDefaultTheme());
}

export function getThemeOptions() {
  return themes.map((theme) => ({
    id: theme.id,
    name: theme.name,
    shortName: theme.shortName,
  }));
}

export function themeToCssVariables(theme) {
  return Object.entries({
    ...theme.tokens,
    columns: theme.layout.columns,
    windowWidth: `${theme.layout.viewport.width}px`,
    windowHeight: `${theme.layout.viewport.height}px`,
  })
    .map(([name, value]) => `--ytmp-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}: ${value};`)
    .join("\n");
}

export async function getStoredThemeId(storage = chrome.storage.local) {
  const result = await storage.get(STORAGE_KEY);
  const themeId = result[STORAGE_KEY];

  return themes.some((theme) => theme.id === themeId) ? themeId : DEFAULT_THEME_ID;
}

export async function saveThemeId(storage = chrome.storage.local, themeId) {
  const nextThemeId = themes.some((theme) => theme.id === themeId) ? themeId : DEFAULT_THEME_ID;

  await storage.set({ [STORAGE_KEY]: nextThemeId });
  return nextThemeId;
}
