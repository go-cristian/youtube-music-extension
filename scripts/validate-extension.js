import { access, readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile(new URL("../manifest.json", import.meta.url), "utf8"));

const declaredRequiredFiles = [
  "src/background.js",
  "src/content.js",
  "src/bootstrap.js",
  "src/playerAdapter.js",
  "src/pip.js",
  "src/state.js",
];

const internalRequiredFiles = [
  "src/fallback.css",
  "src/fallback.html",
  "src/fallback.js",
];

const declaredFiles = new Set([
  manifest.background.service_worker,
  ...manifest.content_scripts.flatMap((script) => [...(script.js ?? []), ...(script.css ?? [])]),
  ...manifest.web_accessible_resources.flatMap((resource) => resource.resources),
]);

for (const file of declaredRequiredFiles) {
  if (!declaredFiles.has(file)) {
    throw new Error(`${file} is not declared in manifest.json`);
  }

  await access(new URL(`../${file}`, import.meta.url));
}

for (const file of internalRequiredFiles) {
  await access(new URL(`../${file}`, import.meta.url));
}

if (manifest.manifest_version !== 3) {
  throw new Error("manifest_version must be 3");
}

console.log("Extension manifest looks valid.");
