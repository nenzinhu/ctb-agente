// Generates the PWA icons referenced by public/manifest.json.
// Dependency-free PNG encoder so the repo does not carry binary blobs blindly.
// Usage: node scripts/generate-icons.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const CTB_GREEN = [26, 95, 63];
const WHITE = [255, 255, 255];

/**
 * Build the raw RGB pixels of the icon
 * @param {number} size - Icon side in pixels
 * @returns {Buffer} Raw RGB bytes
 */
function buildPixels(size) {
  const pixels = Buffer.alloc(size * size * 3);
  const center = (size - 1) / 2;
  const outer = size * 0.42;
  const inner = size * 0.33;
  const barHalf = size * 0.045;
  const barStart = size * 0.3;
  const barEnd = size * 0.7;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // White ring (traffic sign outline) with a white crossbar
      const naBorda = dist <= outer && dist >= inner;
      const naBarra = Math.abs(y - center) <= barHalf && x >= barStart && x <= barEnd;
      const cor = naBorda || naBarra ? WHITE : CTB_GREEN;

      const offset = (y * size + x) * 3;
      pixels[offset] = cor[0];
      pixels[offset + 1] = cor[1];
      pixels[offset + 2] = cor[2];
    }
  }

  return pixels;
}

/**
 * Encode raw RGB pixels as a PNG buffer
 * @param {Buffer} pixels - Raw RGB bytes
 * @param {number} size - Icon side in pixels
 * @returns {Buffer} PNG file contents
 */
function encodePng(pixels, size) {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0; // filter type: none
    pixels.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Build a PNG chunk with its CRC
 * @param {string} type - Chunk type
 * @param {Buffer} data - Chunk payload
 * @returns {Buffer} Serialized chunk
 */
function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([length, typeAndData, crc]);
}

/**
 * CRC32 as required by the PNG specification
 * @param {Buffer} buffer - Input buffer
 * @returns {number} CRC value
 */
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const outputDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(outputDir, { recursive: true });

for (const size of [192, 512]) {
  const file = path.join(outputDir, `icon-${size}x${size}.png`);
  fs.writeFileSync(file, encodePng(buildPixels(size), size));
  console.log(`✅ ${path.relative(process.cwd(), file)}`);
}

// A favicon keeps the browser tab consistent with the manifest
const favicon = path.join(__dirname, '..', 'public', 'favicon.ico');
if (!fs.existsSync(favicon)) {
  fs.writeFileSync(favicon, encodePng(buildPixels(64), 64));
  console.log('✅ public/favicon.ico');
}
