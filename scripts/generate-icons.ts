import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const iconDir = path.join(process.cwd(), 'src-tauri', 'icons');
fs.mkdirSync(iconDir, { recursive: true });

// Generate a valid 32-bit RGBA PNG (width x height) with a nice Blue (#2563EB) square icon
function createSolidPng(width: number, height: number, r: number, g: number, b: number): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function crc32(buf: Buffer): number {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const combined = Buffer.concat([typeBuf, data]);
    crcBuf.writeUInt32BE(crc32(combined), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth 8
  ihdr[9] = 6; // color type 6 = RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Raw scanlines: each row starts with filter byte 0, followed by width * 4 RGBA bytes
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    const rowStart = y * rowSize;
    rawData[rowStart] = 0; // No filter
    for (let x = 0; x < width; x++) {
      const p = rowStart + 1 + x * 4;
      // Add a crisp white inner border/sigma accent
      const isCenter =
        x > width * 0.28 &&
        x < width * 0.72 &&
        y > height * 0.25 &&
        y < height * 0.75 &&
        (y < height * 0.35 || y > height * 0.65 || Math.abs(x - y) < width * 0.12);
      rawData[p] = isCenter ? 255 : r;
      rawData[p + 1] = isCenter ? 255 : g;
      rawData[p + 2] = isCenter ? 255 : b;
      rawData[p + 3] = 255;
    }
  }

  const idatData = zlib.deflateSync(rawData);
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idatData),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

// Wrap a PNG buffer inside a valid Windows .ICO container
function createIcoFromPng(pngBuf: Buffer, width: number, height: number): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(1, 4); // 1 image

  const dir = Buffer.alloc(16);
  dir[0] = width >= 256 ? 0 : width;
  dir[1] = height >= 256 ? 0 : height;
  dir[2] = 0; // Palette
  dir[3] = 0; // Reserved
  dir.writeUInt16LE(1, 4); // Color planes
  dir.writeUInt16LE(32, 6); // Bits per pixel
  dir.writeUInt32LE(pngBuf.length, 8); // Size of PNG data
  dir.writeUInt32LE(22, 12); // Offset (6 + 16 = 22)

  return Buffer.concat([header, dir, pngBuf]);
}

const png32 = createSolidPng(32, 32, 37, 99, 235);
const png128 = createSolidPng(128, 128, 37, 99, 235);
const png256 = createSolidPng(256, 256, 37, 99, 235);
const ico = createIcoFromPng(png256, 256, 256);

fs.writeFileSync(path.join(iconDir, '32x32.png'), png32);
fs.writeFileSync(path.join(iconDir, '128x128.png'), png128);
fs.writeFileSync(path.join(iconDir, '128x128@2x.png'), png256);
fs.writeFileSync(path.join(iconDir, 'icon.png'), png256);
fs.writeFileSync(path.join(iconDir, 'icon.ico'), ico);

console.log('✅ Generated valid Windows .ico & .png icons in src-tauri/icons/');
