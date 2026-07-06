import fs from 'node:fs';

/**
 * Read image pixel dimensions from file headers without decoding the image.
 * Supports PNG, JPEG, GIF, WebP (VP8/VP8L/VP8X) and SVG. Returns {w,h} or null.
 */
export async function readDimensions(file, ext) {
  try {
    if (ext === '.svg') return svgDims(await fs.promises.readFile(file, 'utf8'));
    const fd = await fs.promises.open(file, 'r');
    try {
      const head = Buffer.alloc(64 * 1024);
      const { bytesRead } = await fd.read(head, 0, head.length, 0);
      const buf = head.subarray(0, bytesRead);
      if (ext === '.png') return pngDims(buf);
      if (ext === '.gif') return gifDims(buf);
      if (ext === '.webp') return webpDims(buf);
      if (ext === '.jpg' || ext === '.jpeg') return jpegDims(buf);
      return null;
    } finally {
      await fd.close();
    }
  } catch {
    return null;
  }
}

function pngDims(buf) {
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function gifDims(buf) {
  if (buf.length < 10 || buf.toString('ascii', 0, 3) !== 'GIF') return null;
  return { w: buf.readUInt16LE(6), h: buf.readUInt16LE(8) };
}

function webpDims(buf) {
  if (buf.length < 30 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null;
  const fmt = buf.toString('ascii', 12, 16);
  if (fmt === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
  if (fmt === 'VP8L') {
    const b = buf.readUInt32LE(21);
    return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 };
  }
  if (fmt === 'VP8X') {
    return { w: 1 + ((buf[26] << 16) | (buf[25] << 8) | buf[24]), h: 1 + ((buf[29] << 16) | (buf[28] << 8) | buf[27]) };
  }
  return null;
}

function jpegDims(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let off = 2;
  while (off + 9 < buf.length) {
    if (buf[off] !== 0xff) { off++; continue; }
    const marker = buf[off + 1];
    // SOF0..SOF15 except DHT(C4), JPG(C8), DAC(CC)
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { h: buf.readUInt16BE(off + 5), w: buf.readUInt16BE(off + 7) };
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd9)) { off += 2; continue; }
    off += 2 + buf.readUInt16BE(off + 2);
  }
  return null;
}

function svgDims(text) {
  const open = text.match(/<svg[^>]*>/i)?.[0];
  if (!open) return null;
  const attr = (name) => {
    const m = open.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, 'i'));
    return m ? m[1] : null;
  };
  const num = (v) => {
    if (!v) return null;
    const n = parseFloat(v);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
  };
  let w = num(attr('width'));
  let h = num(attr('height'));
  if (!w || !h) {
    const vb = attr('viewBox')?.split(/[\s,]+/).map(Number);
    if (vb && vb.length === 4 && vb[2] > 0 && vb[3] > 0) {
      w = w || Math.round(vb[2]);
      h = h || Math.round(vb[3]);
    }
  }
  return w && h ? { w, h } : { w: 1600, h: 1000 };
}
