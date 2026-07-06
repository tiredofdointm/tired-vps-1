import fs from 'node:fs';
import path from 'node:path';
import { sha1 } from './util.js';
import { Store } from './store.js';
import { readDimensions } from './imageDims.js';

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.svg']);
const MIME = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.gif': 'image/gif', '.avif': 'image/avif', '.svg': 'image/svg+xml',
};

let sharp = null;
try {
  sharp = (await import('sharp')).default;
  sharp.cache({ files: 20, memory: 128 });
} catch {
  console.warn('[media] sharp unavailable — thumbnails will serve originals');
}

/**
 * MediaLibrary indexes images that live in user-managed folders. The folders
 * and files are NEVER modified — we only read them and layer our own metadata
 * (display names, pins, favorites, tags) on top, keyed by a stable id derived
 * from each file's location. Thumbnails are a disposable cache, not a second
 * copy of the library.
 */
export class MediaLibrary {
  constructor({ roots, dataDir }) {
    this.roots = roots.map((r) => path.resolve(r));
    this.dataDir = dataDir;
    this.thumbDir = path.join(dataDir, '.cache', 'thumbs');
    this.index = new Store(path.join(dataDir, 'media-index.json'), { entries: {} });
    this.meta = new Store(path.join(dataDir, 'media-meta.json'), { photos: {} });
    this.scanning = null;
  }

  get entries() {
    return this.index.data.entries;
  }

  entry(id) {
    return this.entries[id] || null;
  }

  absPath(entry) {
    return path.join(this.roots[entry.rootIdx] ?? this.roots[0], entry.relPath);
  }

  metaFor(id) {
    return this.meta.data.photos[id] || {};
  }

  setMeta(id, patch) {
    const cur = this.meta.data.photos[id] || {};
    const next = { ...cur, ...patch };
    for (const k of Object.keys(next)) {
      if (next[k] === null || next[k] === undefined || next[k] === false || (Array.isArray(next[k]) && !next[k].length)) delete next[k];
    }
    if (Object.keys(next).length) this.meta.data.photos[id] = next;
    else delete this.meta.data.photos[id];
    this.meta.save();
    return this.publicEntry(this.entry(id));
  }

  publicEntry(entry) {
    if (!entry) return null;
    const m = this.metaFor(entry.id);
    const base = path.basename(entry.relPath, path.extname(entry.relPath));
    return {
      id: entry.id,
      name: m.name || base,
      originalName: path.basename(entry.relPath),
      folder: entry.folder,
      relPath: entry.relPath,
      ext: entry.ext,
      size: entry.size,
      mtime: entry.mtime,
      w: entry.w || 1600,
      h: entry.h || 1066,
      pinned: !!m.pinned,
      favorite: !!m.favorite,
      hidden: !!m.hidden,
      tags: m.tags || [],
      renamed: !!m.name,
    };
  }

  list({ folder, q, includeHidden = false } = {}) {
    let items = Object.values(this.entries).map((e) => this.publicEntry(e));
    if (!includeHidden) items = items.filter((i) => !i.hidden);
    if (folder) items = items.filter((i) => i.folder === folder || i.folder.startsWith(folder + '/'));
    if (q) {
      const needle = q.toLowerCase();
      items = items.filter((i) =>
        i.name.toLowerCase().includes(needle) ||
        i.originalName.toLowerCase().includes(needle) ||
        i.folder.toLowerCase().includes(needle) ||
        i.tags.some((t) => t.toLowerCase().includes(needle)),
      );
    }
    // Default order mirrors how the folders are organised on disk: folder path,
    // then natural filename order — pins float to the top within that order.
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    items.sort((a, b) =>
      (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) ||
      collator.compare(a.folder, b.folder) ||
      collator.compare(a.originalName, b.originalName),
    );
    return items;
  }

  folders() {
    const map = new Map();
    for (const e of Object.values(this.entries)) {
      const m = this.metaFor(e.id);
      if (m.hidden) continue;
      const cur = map.get(e.folder) || { folder: e.folder, count: 0, coverId: null, bytes: 0 };
      cur.count += 1;
      cur.bytes += e.size;
      if (!cur.coverId) cur.coverId = e.id;
      map.set(e.folder, cur);
    }
    return [...map.values()].sort((a, b) => a.folder.localeCompare(b.folder));
  }

  async scan() {
    if (this.scanning) return this.scanning;
    this.scanning = this._scan().finally(() => (this.scanning = null));
    return this.scanning;
  }

  async _scan() {
    const seen = new Set();
    const prev = this.entries;
    let added = 0;
    let updated = 0;
    for (let rootIdx = 0; rootIdx < this.roots.length; rootIdx++) {
      const root = this.roots[rootIdx];
      if (!fs.existsSync(root)) continue;
      for await (const file of walk(root)) {
        const ext = path.extname(file).toLowerCase();
        if (!IMAGE_EXTS.has(ext)) continue;
        const relPath = path.relative(root, file).split(path.sep).join('/');
        const id = sha1(`${rootIdx}:${relPath}`).slice(0, 16);
        seen.add(id);
        const stat = await fs.promises.stat(file);
        const existing = prev[id];
        if (existing && existing.mtime === stat.mtimeMs && existing.size === stat.size && existing.w) {
          continue;
        }
        let dims = await readDimensions(file, ext);
        if (!dims && sharp) {
          try {
            const info = await sharp(file).metadata();
            if (info.width && info.height) dims = { w: info.width, h: info.height };
          } catch { /* unreadable image — keep placeholder dims */ }
        }
        prev[id] = {
          id,
          rootIdx,
          relPath,
          folder: path.dirname(relPath) === '.' ? '' : path.dirname(relPath).split(path.sep).join('/'),
          ext,
          size: stat.size,
          mtime: stat.mtimeMs,
          w: dims?.w || 0,
          h: dims?.h || 0,
        };
        existing ? updated++ : added++;
      }
    }
    let removed = 0;
    for (const id of Object.keys(prev)) {
      if (!seen.has(id)) {
        delete prev[id];
        removed++;
      }
    }
    this.index.save();
    return { total: seen.size, added, updated, removed };
  }

  mimeFor(entry) {
    return MIME[entry.ext] || 'application/octet-stream';
  }

  /** Serve a resized thumbnail, cached on disk. Falls back to the original. */
  async thumbPath(entry, width) {
    if (!sharp || entry.ext === '.svg' || entry.ext === '.gif') return null;
    const bucket = width <= 240 ? 240 : width <= 480 ? 480 : width <= 960 ? 960 : 1600;
    if (entry.w && entry.w <= bucket) return null; // already small enough
    const out = path.join(this.thumbDir, `${entry.id}-${bucket}.webp`);
    try {
      const st = await fs.promises.stat(out).catch(() => null);
      if (st && st.mtimeMs >= entry.mtime) return out;
      await fs.promises.mkdir(this.thumbDir, { recursive: true });
      const tmp = `${out}.${process.pid}.tmp`;
      await sharp(this.absPath(entry)).rotate().resize({ width: bucket, withoutEnlargement: true }).webp({ quality: 78 }).toFile(tmp);
      await fs.promises.rename(tmp, out);
      return out;
    } catch (err) {
      console.warn('[media] thumb failed', entry.relPath, err.message);
      return null;
    }
  }
}

async function* walk(dir) {
  let items;
  try {
    items = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const item of items) {
    if (item.name.startsWith('.')) continue;
    const full = path.join(dir, item.name);
    if (item.isDirectory()) yield* walk(full);
    else if (item.isFile()) yield full;
  }
}
