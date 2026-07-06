# TIRED.EVENTS

Underground events platform — tickets, photo galleries, host tools. Dark, loud, fast.

![node](https://img.shields.io/badge/node-%E2%89%A522-8b5cf6) ![license](https://img.shields.io/badge/license-private-ec4899)

## Quick start

```bash
npm install
npm run build     # build the SPA
npm start         # serve app + API on :8787
```

First boot seeds demo data (users, events, galleries and a few hundred generated
photos) into `data/`. Sign in with:

| Account | Email | Password | Roles |
| --- | --- | --- | --- |
| Host | `tiredofdointm@gmail.com` | `tired123` | client + host |
| Client | `guest@tired.events` | `guest123` | client |

For development with hot reload:

```bash
npm run dev       # vite on :5173 proxying to the API on :8787
```

## Your photos, untouched

Point the server at the folders where your imports already live:

```bash
TIRED_IMAGES_DIRS=/mnt/photos/imports,/mnt/photos/brand npm start
```

The indexer walks those folders read-only and layers *our* metadata on top —
display names, pins, favorites, galleries, cover rotations. Nothing is renamed,
moved, or re-uploaded. Delete `data/.cache` any time; thumbnails regenerate.

- **Rename** a photo → stored as an overlay; the file on disk keeps its name.
- **Galleries** are lists of photo ids — a photo can live in many galleries.
- **Covers** cycle: events, galleries and your profile take multiple photos
  and crossfade through them.
- **Share** a selection → public link (`/s/…`). **Export** → streamed ZIP named
  with your display names.
- **Rescan** from the Galleries page picks up new files instantly.

## The grid

The photo grid is windowed: it renders only the rows in (and near) the
viewport, so thousand-photo libraries scroll without loading everything —
the crash-proofing for big galleries. Selection works like a desktop:

| Gesture | Result |
| --- | --- |
| Click | select one |
| Ctrl/Cmd + click | toggle |
| Shift + click | range from anchor |
| Ctrl + Shift + click | add range |
| Drag anywhere | rubber-band marquee (Ctrl = additive) |
| Ctrl/Cmd + A / Escape | all / none |
| Arrows / Shift+arrows | move focus / extend |
| Enter / double-click | open lightbox |

Plus: **Ctrl/Cmd+K** opens a command palette from anywhere (events, galleries,
pages, actions); the library sidebar has Favorites / Pinned / Hidden smart
views (hide is always reversible from the Hidden view) and sort by name,
newest or size; the lightbox does click-to-zoom and slideshow, and every
gallery has a one-click Slideshow button.

## Layout

```
server/        Express API — JSON store, media indexer, thumbs, zip export
server/seed/   demo data + generated SVG "photography"
web/           React + Vite SPA
e2e/           Playwright suite (layout overflow checks across viewports + flows)
data/          runtime state (gitignored): db.json, media index/meta, thumbs cache
```

## Deploying

**One command on a fresh Debian/Ubuntu VPS** (installs Node 22, clones, builds,
sets up a hardened systemd service):

```bash
curl -fsSL https://raw.githubusercontent.com/tiredofdointm/tired-vps-1/main/deploy/deploy.sh | sudo bash
```

Re-running the same command updates to the latest `main`. Point the photo
indexer at your real folders by uncommenting `TIRED_IMAGES_DIRS` in
`/etc/systemd/system/tired-events.service`. For HTTPS put `deploy/Caddyfile`
behind [Caddy](https://caddyserver.com) — automatic certificates included.

**Docker** (state lives in the `tired-data` volume):

```bash
docker compose up -d --build
```

**Auto-deploy from GitHub**: `.github/workflows/deploy.yml` runs typecheck,
build and the full Playwright suite on every push, then — if you add the
`VPS_HOST`, `VPS_SSH_KEY` (and optionally `VPS_USER`) repository secrets —
ships `main` to your VPS automatically.

## Config

| Env | Default | Meaning |
| --- | --- | --- |
| `PORT` | `8787` | HTTP port |
| `TIRED_DATA_DIR` | `./data` | where state lives |
| `TIRED_IMAGES_DIRS` | `./data/images` | comma-separated photo roots (read-only) |

## Tests

```bash
npm run typecheck
npm run e2e       # builds nothing — run `npm run build` first
```

The e2e suite asserts zero horizontal overflow on every page at desktop,
laptop, tablet and phone widths, plus the profile-menu consolidation, gallery
virtualization, Explorer-style selection, marquee, rename overlay, share/export,
checkout and secret-venue flows.
