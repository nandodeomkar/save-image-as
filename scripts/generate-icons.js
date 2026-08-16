import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// Simple pure-JS PNG generator for extension icons
function createPng(width, height, renderPixel) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8-bit depth
  ihdrData.writeUInt8(6, 9); // RGBA color type
  ihdrData.writeUInt8(0, 10); // Deflate compression
  ihdrData.writeUInt8(0, 11); // Filter method
  ihdrData.writeUInt8(0, 12); // Interlace method
  const ihdr = createChunk('IHDR', ihdrData);

  // Raw pixel data with filter type byte (0) per row
  const rowBytes = width * 4;
  const rawData = Buffer.alloc(height * (rowBytes + 1));

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData.writeUInt8(0, offset++); // Filter byte: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = renderPixel(x, y, width, height);
      rawData.writeUInt8(r, offset++);
      rawData.writeUInt8(g, offset++);
      rawData.writeUInt8(b, offset++);
      rawData.writeUInt8(a, offset++);
    }
  }

  // Compress IDAT
  const compressed = zlib.deflateSync(rawData);
  const idat = createChunk('IDAT', compressed);

  // IEND chunk
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createChunk(type, data) {
  const length = data.length;
  const buffer = Buffer.alloc(8 + length + 4);
  buffer.writeUInt32BE(length, 0);
  buffer.write(type, 4, 4, 'ascii');
  data.copy(buffer, 8);

  const crc = calculateCrc(buffer.subarray(4, 8 + length));
  buffer.writeUInt32BE(crc, 8 + length);
  return buffer;
}

// CRC-32 lookup table
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c;
}

function calculateCrc(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// Pixel rendering math with rounded gradient background and download icon glyph
function renderIconPixel(x, y, w, h) {
  const nx = x / (w - 1);
  const ny = y / (h - 1);

  // Normalized distance from center with rounded rect boundary
  const cx = 0.5;
  const cy = 0.5;
  const radius = 0.42;
  const cornerR = 0.22;

  const dx = Math.max(0, Math.abs(nx - cx) - (radius - cornerR));
  const dy = Math.max(0, Math.abs(ny - cy) - (radius - cornerR));
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > cornerR) {
    return [0, 0, 0, 0]; // Transparent outside
  }

  // Smooth anti-aliasing edge
  const edgeDist = cornerR - dist;
  const edgeAlpha = Math.min(1, Math.max(0, edgeDist / (1 / w))) * 255;

  // Base Indigo (#4F46E5: 79, 70, 229) to Cyan (#06B6D4: 6, 182, 212) gradient
  const t = (nx + ny) / 2;
  let r = Math.round(79 * (1 - t) + 6 * t);
  let g = Math.round(70 * (1 - t) + 182 * t);
  let b = Math.round(229 * (1 - t) + 212 * t);

  // Inner image glyph - white picture mountains and download arrow
  // Image card box
  const inCard = nx >= 0.22 && nx <= 0.78 && ny >= 0.22 && ny <= 0.78;
  if (inCard) {
    // Sun circle at nx: 0.38, ny: 0.38
    const sunDist = Math.hypot(nx - 0.38, ny - 0.38);
    if (sunDist < 0.08) {
      return [253, 224, 71, Math.round(edgeAlpha)]; // Yellow sun
    }

    // Mountain 1
    const m1Y = 0.75 - Math.max(0, 0.28 - Math.abs(nx - 0.42) * 1.4);
    if (ny >= m1Y && ny <= 0.75 && nx >= 0.22 && nx <= 0.65) {
      return [255, 255, 255, Math.round(edgeAlpha * 0.9)];
    }

    // Mountain 2
    const m2Y = 0.75 - Math.max(0, 0.22 - Math.abs(nx - 0.65) * 1.5);
    if (ny >= m2Y && ny <= 0.75 && nx >= 0.45 && nx <= 0.78) {
      return [255, 255, 255, Math.round(edgeAlpha * 0.95)];
    }
  }

  // Download badge at bottom right: center (0.72, 0.72), radius 0.2
  const badgeDist = Math.hypot(nx - 0.72, ny - 0.72);
  if (badgeDist <= 0.2) {
    if (badgeDist > 0.18) {
      return [255, 255, 255, Math.round(edgeAlpha)]; // White ring
    }
    // Arrow stem
    if (Math.abs(nx - 0.72) <= 0.035 && ny >= 0.60 && ny <= 0.78) {
      return [255, 255, 255, Math.round(edgeAlpha)];
    }
    // Arrow head
    const headY = 0.76 - Math.abs(nx - 0.72) * 1.0;
    if (ny >= headY && ny <= headY + 0.06 && Math.abs(nx - 0.72) <= 0.09) {
      return [255, 255, 255, Math.round(edgeAlpha)];
    }
    // Arrow base line
    if (Math.abs(nx - 0.72) <= 0.10 && ny >= 0.82 && ny <= 0.86) {
      return [255, 255, 255, Math.round(edgeAlpha)];
    }
    return [79, 70, 229, Math.round(edgeAlpha)]; // Badge background
  }

  return [r, g, b, Math.round(edgeAlpha)];
}

const sizes = [16, 32, 48, 128];
const dirs = ['public/icons', 'src/assets/icons'];

for (const dir of dirs) {
  fs.mkdirSync(dir, { recursive: true });
}

for (const size of sizes) {
  const pngBuffer = createPng(size, size, renderIconPixel);
  for (const dir of dirs) {
    const filePath = path.join(dir, `icon-${size}.png`);
    fs.writeFileSync(filePath, pngBuffer);
    console.log(`Generated ${filePath} (${size}x${size}, ${pngBuffer.length} bytes)`);
  }
}
