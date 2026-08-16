/**
 * Production Extension Packager & Manifest Validator
 * Validates Chrome Extensions Manifest V3 build integrity,
 * verifies assets and permissions, and bundles dist/ into a release zip archive.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.resolve(ROOT_DIR, 'dist');

// CRC32 table calculation
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c >>> 0;
}

function calculateCrc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Minimal, zero-dependency ZIP archive builder for Node.js
 */
class SimpleZip {
  constructor() {
    this.entries = [];
  }

  addFile(relativePath, buffer) {
    const normalizedPath = relativePath.replace(/\\/g, '/');
    const pathBuffer = Buffer.from(normalizedPath, 'utf-8');
    const crc = calculateCrc32(buffer);
    const compressed = zlib.deflateRawSync(buffer, { level: 9 });

    this.entries.push({
      path: normalizedPath,
      pathBuffer,
      uncompressedSize: buffer.length,
      compressedSize: compressed.length,
      crc,
      compressedData: compressed
    });
  }

  build() {
    const buffers = [];
    const cdEntries = [];
    let offset = 0;

    const now = new Date();
    const dosTime =
      ((now.getHours() << 11) | (now.getMinutes() << 5) | (Math.floor(now.getSeconds() / 2))) & 0xffff;
    const dosDate =
      (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff;

    // 1. Write Local File Headers + Data
    for (const entry of this.entries) {
      const localHeader = Buffer.alloc(30);
      localHeader.writeUInt32LE(0x04034b50, 0); // Local file header signature
      localHeader.writeUInt16LE(20, 4);         // Version needed to extract (2.0)
      localHeader.writeUInt16LE(0, 6);          // General purpose bit flag
      localHeader.writeUInt16LE(8, 8);          // Compression method (Deflate)
      localHeader.writeUInt16LE(dosTime, 10);
      localHeader.writeUInt16LE(dosDate, 12);
      localHeader.writeUInt32LE(entry.crc, 14);
      localHeader.writeUInt32LE(entry.compressedSize, 18);
      localHeader.writeUInt32LE(entry.uncompressedSize, 22);
      localHeader.writeUInt16LE(entry.pathBuffer.length, 26);
      localHeader.writeUInt16LE(0, 28);         // Extra field length

      buffers.push(localHeader, entry.pathBuffer, entry.compressedData);

      cdEntries.push({
        entry,
        localHeaderOffset: offset,
        dosTime,
        dosDate
      });

      offset += localHeader.length + entry.pathBuffer.length + entry.compressedData.length;
    }

    const cdStartOffset = offset;
    let cdSize = 0;

    // 2. Write Central Directory Headers
    for (const { entry, localHeaderOffset, dosTime, dosDate } of cdEntries) {
      const cdHeader = Buffer.alloc(46);
      cdHeader.writeUInt32LE(0x02014b50, 0); // Central directory header signature
      cdHeader.writeUInt16LE(20, 4);         // Version made by
      cdHeader.writeUInt16LE(20, 6);         // Version needed to extract
      cdHeader.writeUInt16LE(0, 8);          // General purpose bit flag
      cdHeader.writeUInt16LE(8, 10);         // Compression method (Deflate)
      cdHeader.writeUInt16LE(dosTime, 12);
      cdHeader.writeUInt16LE(dosDate, 14);
      cdHeader.writeUInt32LE(entry.crc, 16);
      cdHeader.writeUInt32LE(entry.compressedSize, 20);
      cdHeader.writeUInt32LE(entry.uncompressedSize, 24);
      cdHeader.writeUInt16LE(entry.pathBuffer.length, 28);
      cdHeader.writeUInt16LE(0, 30);         // Extra field length
      cdHeader.writeUInt16LE(0, 32);         // File comment length
      cdHeader.writeUInt16LE(0, 34);         // Disk number start
      cdHeader.writeUInt16LE(0, 36);         // Internal file attributes
      cdHeader.writeUInt32LE(0, 38);         // External file attributes
      cdHeader.writeUInt32LE(localHeaderOffset, 42); // Relative offset of local header

      buffers.push(cdHeader, entry.pathBuffer);
      cdSize += cdHeader.length + entry.pathBuffer.length;
    }

    // 3. Write End of Central Directory Record (EOCD)
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);       // EOCD signature
    eocd.writeUInt16LE(0, 4);                // Number of this disk
    eocd.writeUInt16LE(0, 6);                // Disk where CD starts
    eocd.writeUInt16LE(this.entries.length, 8);  // Number of CD records on disk
    eocd.writeUInt16LE(this.entries.length, 10); // Total number of CD records
    eocd.writeUInt32LE(cdSize, 12);          // Size of CD
    eocd.writeUInt32LE(cdStartOffset, 16);   // Offset of start of CD
    eocd.writeUInt16LE(0, 20);               // Comment length

    buffers.push(eocd);

    return Buffer.concat(buffers);
  }
}

/**
 * Recursively scans directory and returns relative paths
 */
function getAllFiles(dir, baseDir = dir) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getAllFiles(fullPath, baseDir));
    } else {
      const relPath = path.relative(baseDir, fullPath);
      files.push({ fullPath, relPath });
    }
  }

  return files;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function packageExtension() {
  console.log('\n📦 Save Image As — Extension Packaging & Manifest Validator\n');

  if (!fs.existsSync(DIST_DIR)) {
    console.error('❌ Error: dist/ directory does not exist. Run "npm run build" first.');
    process.exit(1);
  }

  const manifestPath = path.join(DIST_DIR, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('❌ Error: dist/manifest.json not found.');
    process.exit(1);
  }

  // 1. Manifest Validation
  const rawManifest = fs.readFileSync(manifestPath, 'utf-8');
  let manifest;
  try {
    manifest = JSON.parse(rawManifest);
  } catch (err) {
    console.error('❌ Error: Failed to parse manifest.json as valid JSON:', err.message);
    process.exit(1);
  }

  const errors = [];
  if (manifest.manifest_version !== 3) {
    errors.push('Manifest version must be 3.');
  }
  if (!manifest.name) errors.push('Missing "name" field.');
  if (!manifest.version) errors.push('Missing "version" field.');

  // Validate background service worker
  if (!manifest.background?.service_worker) {
    errors.push('Missing background.service_worker.');
  } else if (!fs.existsSync(path.join(DIST_DIR, manifest.background.service_worker))) {
    errors.push(`Background script not found: ${manifest.background.service_worker}`);
  }

  // Validate action popup
  if (!manifest.action?.default_popup) {
    errors.push('Missing action.default_popup.');
  } else if (!fs.existsSync(path.join(DIST_DIR, manifest.action.default_popup))) {
    errors.push(`Popup HTML not found: ${manifest.action.default_popup}`);
  }

  // Validate offscreen document
  const offscreenHtmlPath = path.join(DIST_DIR, 'src/offscreen/offscreen.html');
  if (!fs.existsSync(offscreenHtmlPath)) {
    errors.push('Offscreen HTML not found: src/offscreen/offscreen.html');
  }

  // Validate content scripts
  if (manifest.content_scripts) {
    for (const cs of manifest.content_scripts) {
      if (cs.js) {
        for (const jsFile of cs.js) {
          if (!fs.existsSync(path.join(DIST_DIR, jsFile))) {
            errors.push(`Content script file not found: ${jsFile}`);
          }
        }
      }
    }
  }

  // Validate icons
  if (manifest.icons) {
    for (const [size, iconPath] of Object.entries(manifest.icons)) {
      if (!fs.existsSync(path.join(DIST_DIR, iconPath))) {
        errors.push(`Icon (${size}px) not found: ${iconPath}`);
      }
    }
  }

  if (errors.length > 0) {
    console.error('❌ Manifest Validation Errors:');
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  console.log('✅ Manifest V3 validation passed successfully.');
  console.log(`   Name: ${manifest.name}`);
  console.log(`   Version: ${manifest.version}`);
  console.log(`   Permissions: ${(manifest.permissions || []).join(', ')}`);
  console.log(`   Host Permissions: ${(manifest.host_permissions || []).join(', ')}`);

  // 2. Package into ZIP
  const allFiles = getAllFiles(DIST_DIR);
  const zip = new SimpleZip();
  let totalRawBytes = 0;

  for (const { fullPath, relPath } of allFiles) {
    const data = fs.readFileSync(fullPath);
    totalRawBytes += data.length;
    zip.addFile(relPath, data);
  }

  const zipBuffer = zip.build();
  const zipFilename = `save-image-as-v${manifest.version}.zip`;
  const zipOutputPath = path.join(ROOT_DIR, zipFilename);

  fs.writeFileSync(zipOutputPath, zipBuffer);

  // 3. Compute Checksum
  const sha256 = crypto.createHash('sha256').update(zipBuffer).digest('hex');

  console.log('\n📁 Package Summary:');
  console.log(`   Total files:       ${allFiles.length}`);
  console.log(`   Uncompressed size: ${formatBytes(totalRawBytes)}`);
  console.log(`   Archive size:      ${formatBytes(zipBuffer.length)}`);
  console.log(`   Output artifact:   ${zipFilename}`);
  console.log(`   SHA-256:           ${sha256}`);
  console.log('\n🎉 Extension packaging complete and verified for distribution!\n');
}

packageExtension();
