import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const distDir = new URL("../dist/", import.meta.url);
const packageName = "youtube-music-floating-player-0.1.1.zip";
const packagePath = new URL(packageName, distDir);
const entries = [
  "manifest.json",
  "assets",
  "src",
];

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

function writeLocalHeader(name, content) {
  const nameBuffer = Buffer.from(name);
  const header = Buffer.alloc(30);
  const checksum = crc32(content);

  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt32LE(checksum, 14);
  header.writeUInt32LE(content.length, 18);
  header.writeUInt32LE(content.length, 22);
  header.writeUInt16LE(nameBuffer.length, 26);
  header.writeUInt16LE(0, 28);

  return {
    checksum,
    buffer: Buffer.concat([header, nameBuffer, content]),
  };
}

function writeCentralDirectory(entry) {
  const nameBuffer = Buffer.from(entry.name);
  const header = Buffer.alloc(46);

  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt16LE(0, 14);
  header.writeUInt32LE(entry.checksum, 16);
  header.writeUInt32LE(entry.size, 20);
  header.writeUInt32LE(entry.size, 24);
  header.writeUInt16LE(nameBuffer.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(entry.offset, 42);

  return Buffer.concat([header, nameBuffer]);
}

function writeEndOfCentralDirectory(entryCount, centralDirectorySize, centralDirectoryOffset) {
  const header = Buffer.alloc(22);

  header.writeUInt32LE(0x06054b50, 0);
  header.writeUInt16LE(0, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(entryCount, 8);
  header.writeUInt16LE(entryCount, 10);
  header.writeUInt32LE(centralDirectorySize, 12);
  header.writeUInt32LE(centralDirectoryOffset, 16);
  header.writeUInt16LE(0, 20);

  return header;
}

async function collectFiles(entry) {
  const fileUrl = new URL(entry, root);
  const fileStat = await stat(fileUrl);

  if (fileStat.isFile()) {
    return [entry];
  }

  const children = await readdir(fileUrl);
  const files = await Promise.all(children.map((child) => collectFiles(`${entry}/${child}`)));

  return files.flat();
}

await mkdir(distDir, { recursive: true });
await rm(packagePath, { force: true });

const fileNames = (await Promise.all(entries.map(collectFiles))).flat().sort();
const localFiles = [];
const centralDirectoryEntries = [];
let offset = 0;

for (const name of fileNames) {
  const content = await readFile(new URL(name, root));
  const localFile = writeLocalHeader(name, content);

  localFiles.push(localFile.buffer);
  centralDirectoryEntries.push({
    name,
    checksum: localFile.checksum,
    size: content.length,
    offset,
  });
  offset += localFile.buffer.length;
}

const centralDirectory = Buffer.concat(centralDirectoryEntries.map(writeCentralDirectory));
const endOfCentralDirectory = writeEndOfCentralDirectory(
  centralDirectoryEntries.length,
  centralDirectory.length,
  offset,
);

await writeFile(packagePath, Buffer.concat([...localFiles, centralDirectory, endOfCentralDirectory]));

console.log(`Extension package created at dist/${packageName}`);
