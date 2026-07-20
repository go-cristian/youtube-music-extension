import { mkdir, writeFile } from "node:fs/promises";
import { deflateSync } from "node:zlib";

const iconSizes = [16, 32, 48, 128];
const outputDir = new URL("../assets/icons/", import.meta.url);

const crcTable = new Uint32Array(256).map((_, tableIndex) => {
  let value = tableIndex;

  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  return value >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  const checksum = Buffer.alloc(4);
  const body = Buffer.concat([typeBuffer, data]);

  length.writeUInt32BE(data.length);
  checksum.writeUInt32BE(crc32(body));

  return Buffer.concat([length, body, checksum]);
}

function isInsideCircle(x, y, centerX, centerY, radius) {
  return Math.hypot(x - centerX, y - centerY) <= radius;
}

function isInsideRoundedRect(x, y, left, top, width, height, radius) {
  const right = left + width;
  const bottom = top + height;

  if (x < left || x > right || y < top || y > bottom) {
    return false;
  }

  const cornerX = x < left + radius ? left + radius : x > right - radius ? right - radius : x;
  const cornerY = y < top + radius ? top + radius : y > bottom - radius ? bottom - radius : y;

  return Math.hypot(x - cornerX, y - cornerY) <= radius;
}

function drawIcon(size) {
  const rowLength = size * 4 + 1;
  const raw = Buffer.alloc(rowLength * size);

  for (let y = 0; y < size; y += 1) {
    raw[y * rowLength] = 0;

    for (let x = 0; x < size; x += 1) {
      const pixel = y * rowLength + 1 + x * 4;
      const glow = Math.max(0, 1 - Math.hypot(x - size * 0.68, y - size * 0.28) / (size * 0.8));
      let red = Math.round(12 + glow * 44);
      let green = Math.round(10 + glow * 28);
      let blue = Math.round(16 + glow * 48);
      let alpha = 255;

      if (isInsideRoundedRect(x, y, size * 0.16, size * 0.22, size * 0.68, size * 0.56, size * 0.12)) {
        red = 31;
        green = 25;
        blue = 39;
      }

      if (isInsideRoundedRect(x, y, size * 0.27, size * 0.32, size * 0.27, size * 0.27, size * 0.07)) {
        red = 239;
        green = 71;
        blue = 111;
      }

      if (isInsideRoundedRect(x, y, size * 0.6, size * 0.35, size * 0.15, size * 0.08, size * 0.04)) {
        red = 200;
        green = 184;
        blue = 200;
      }

      if (isInsideRoundedRect(x, y, size * 0.27, size * 0.67, size * 0.46, size * 0.06, size * 0.03)) {
        red = 239;
        green = 71;
        blue = 111;
      }

      if (isInsideCircle(x, y, size * 0.5, size * 0.7, size * 0.055)) {
        red = 255;
        green = 247;
        blue = 251;
      }

      raw[pixel] = red;
      raw[pixel + 1] = green;
      raw[pixel + 2] = blue;
      raw[pixel + 3] = alpha;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

await mkdir(outputDir, { recursive: true });

for (const size of iconSizes) {
  await writeFile(new URL(`icon-${size}.png`, outputDir), drawIcon(size));
}

await writeFile(new URL("icon.svg", outputDir), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <radialGradient id="bg" cx="64%" cy="34%" r="70%">
      <stop offset="0" stop-color="#39203f"/>
      <stop offset="1" stop-color="#120f14"/>
    </radialGradient>
    <linearGradient id="art" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#ff6f91"/>
      <stop offset="1" stop-color="#ef476f"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="28" fill="url(#bg)"/>
  <rect x="21" y="28" width="86" height="72" rx="16" fill="#211927"/>
  <rect x="35" y="41" width="35" height="35" rx="9" fill="url(#art)"/>
  <rect x="78" y="45" width="20" height="10" rx="5" fill="#c8b8c8"/>
  <rect x="35" y="86" width="58" height="8" rx="4" fill="#ef476f"/>
  <circle cx="64" cy="90" r="7" fill="#fff7fb"/>
</svg>
`);

console.log("Store icon assets generated.");
