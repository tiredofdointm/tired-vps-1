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

## Layout

```
server/        Express API — JSON store, media indexer, thumbs, zip export
server/seed/   demo data + generated SVG "photography"
web/           React + Vite SPA
e2e/           Playwright suite (layout overflow checks across viewports + flows)
data/          runtime state (gitignored): db.json, media index/meta, thumbs cache
```

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
