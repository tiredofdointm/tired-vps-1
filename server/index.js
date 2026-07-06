import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { ensureSeed } from './seed/seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.TIRED_DATA_DIR
  ? path.resolve(process.env.TIRED_DATA_DIR)
  : path.resolve(__dirname, '..', 'data');

await ensureSeed({ dataDir });

const { app, media } = createApp({ dataDir });
const scan = await media.scan();
console.log(`[media] indexed ${scan.total} photos (+${scan.added} new, -${scan.removed} gone)`);

const port = parseInt(process.env.PORT, 10) || 8787;
app.listen(port, () => {
  console.log(`tired.events server → http://localhost:${port}`);
});
