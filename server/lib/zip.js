import fs from 'node:fs';

// CRC32 (IEEE) lookup table
const TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf, crc = 0xffffffff) {
  for (let i = 0; i < buf.length; i++) crc = TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return crc >>> 0;
}

const dosDateTime = (ms) => {
  const d = new Date(ms);
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = (((d.getFullYear() - 1980) & 0x7f) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
};

/**
 * Stream a ZIP archive (stored, no compression — images are already compressed)
 * to a writable stream. `files` is [{ path, name, mtime }]. Duplicate names get
 * numeric suffixes. Uses ZIP64-free format: fine below 4GB / 65k entries.
 */
export async function streamZip(files, out) {
  const central = [];
  let offset = 0;
  const used = new Set();
  const write = (buf) =>
    new Promise((resolve, reject) => {
      out.write(buf, (err) => (err ? reject(err) : resolve()));
      offset += buf.length;
    });

  for (const file of files) {
    let name = sanitizeZipName(file.name);
    if (used.has(name.toLowerCase())) {
      const dot = name.lastIndexOf('.');
      const stem = dot > 0 ? name.slice(0, dot) : name;
      const ext = dot > 0 ? name.slice(dot) : '';
      let n = 2;
      while (used.has(`${stem} (${n})${ext}`.toLowerCase())) n++;
      name = `${stem} (${n})${ext}`;
    }
    used.add(name.toLowerCase());

    const nameBuf = Buffer.from(name, 'utf8');
    const stat = await fs.promises.stat(file.path);
    const { time, date } = dosDateTime(file.mtime || stat.mtimeMs);
    const localOffset = offset;

    // local header with data-descriptor flag (crc/size streamed after data)
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0808, 6); // utf8 + data descriptor
    local.writeUInt16LE(0, 8); // stored
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt16LE(nameBuf.length, 26);
    await write(local);
    await write(nameBuf);

    let crc = 0xffffffff;
    let size = 0;
    await new Promise((resolve, reject) => {
      const rs = fs.createReadStream(file.path);
      rs.on('data', (chunk) => {
        crc = crc32(chunk, crc);
        size += chunk.length;
        if (!out.write(chunk)) {
          rs.pause();
          out.once('drain', () => rs.resume());
        }
      });
      rs.on('end', resolve);
      rs.on('error', reject);
    });
    offset += size;
    crc = (crc ^ 0xffffffff) >>> 0;

    const desc = Buffer.alloc(16);
    desc.writeUInt32LE(0x08074b50, 0);
    desc.writeUInt32LE(crc, 4);
    desc.writeUInt32LE(size, 8);
    desc.writeUInt32LE(size, 12);
    await write(desc);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0x0808, 8);
    cd.writeUInt16LE(0, 10);
    cd.writeUInt16LE(time, 12);
    cd.writeUInt16LE(date, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(size, 20);
    cd.writeUInt32LE(size, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt32LE(localOffset, 42);
    central.push(Buffer.concat([cd, nameBuf]));
  }

  const cdStart = offset;
  for (const buf of central) await write(buf);
  const cdSize = offset - cdStart;

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(central.length, 8);
  end.writeUInt16LE(central.length, 10);
  end.writeUInt32LE(cdSize, 12);
  end.writeUInt32LE(cdStart, 16);
  await write(end);
  out.end();
}

function sanitizeZipName(name) {
  const clean = String(name || 'photo')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/[\u0000-\u001f]/g, '')
    .trim();
  return clean || 'photo';
}
