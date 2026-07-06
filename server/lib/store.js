import fs from 'node:fs';
import path from 'node:path';

/**
 * Tiny JSON document store with atomic, debounced persistence.
 * Each Store instance owns one file. Mutate `store.data` then call `store.save()`.
 */
export class Store {
  constructor(file, fallback) {
    this.file = file;
    this.data = fallback;
    this._timer = null;
    this._saving = Promise.resolve();
    try {
      if (fs.existsSync(file)) {
        this.data = JSON.parse(fs.readFileSync(file, 'utf8'));
      }
    } catch (err) {
      console.error(`[store] failed to read ${file}, starting fresh:`, err.message);
    }
  }

  save({ flush = false } = {}) {
    if (flush) {
      clearTimeout(this._timer);
      this._timer = null;
      return this._write();
    }
    if (this._timer) return;
    this._timer = setTimeout(() => {
      this._timer = null;
      this._write();
    }, 150);
  }

  _write() {
    const run = async () => {
      const dir = path.dirname(this.file);
      await fs.promises.mkdir(dir, { recursive: true });
      const tmp = `${this.file}.${process.pid}.tmp`;
      await fs.promises.writeFile(tmp, JSON.stringify(this.data, null, 2));
      await fs.promises.rename(tmp, this.file);
    };
    this._saving = this._saving.then(run, run);
    return this._saving;
  }
}
