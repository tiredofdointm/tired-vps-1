// Generates aesthetic abstract "event photography" SVGs so the media library
// has something real to index. Deterministic per seed string.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const hashSeed = (s) => [...String(s)].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);

const PALETTES = [
  { name: 'neon-club', bg: '#0b0614', lights: ['#a855f7', '#ec4899', '#22d3ee', '#8b5cf6'] },
  { name: 'sunset-rooftop', bg: '#160a12', lights: ['#fb7185', '#f97316', '#facc15', '#e879f9'] },
  { name: 'blue-hour', bg: '#050b1a', lights: ['#38bdf8', '#6366f1', '#a5b4fc', '#0ea5e9'] },
  { name: 'acid-garden', bg: '#07130a', lights: ['#a3e635', '#34d399', '#22d3ee', '#facc15'] },
  { name: 'crimson-bass', bg: '#150507', lights: ['#f43f5e', '#fb923c', '#e11d48', '#fda4af'] },
  { name: 'violet-haze', bg: '#0d0618', lights: ['#c084fc', '#818cf8', '#f472b6', '#7c3aed'] },
  { name: 'chrome-night', bg: '#0a0a10', lights: ['#94a3b8', '#67e8f9', '#c4b5fd', '#f0abfc'] },
];

export const ASPECTS = [
  { w: 1620, h: 1080 }, { w: 1080, h: 1350 }, { w: 1920, h: 1080 },
  { w: 1080, h: 1080 }, { w: 1440, h: 1080 }, { w: 1080, h: 1620 },
];

export function generatePhotoSvg(seedStr, { aspect, paletteName } = {}) {
  const rnd = mulberry32(hashSeed(seedStr));
  const palette = paletteName
    ? PALETTES.find((p) => p.name === paletteName) || PALETTES[0]
    : PALETTES[Math.floor(rnd() * PALETTES.length)];
  const { w, h } = aspect || ASPECTS[Math.floor(rnd() * ASPECTS.length)];
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const between = (a, b) => a + rnd() * (b - a);

  let defs = '';
  let body = '';

  // layered radial glows — stage lights / bokeh
  const glowCount = 3 + Math.floor(rnd() * 4);
  for (let i = 0; i < glowCount; i++) {
    const color = pick(palette.lights);
    const gid = `g${i}`;
    defs += `<radialGradient id="${gid}"><stop offset="0%" stop-color="${color}" stop-opacity="${between(0.55, 0.95).toFixed(2)}"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/></radialGradient>`;
    const cx = between(-0.1, 1.1) * w;
    const cy = between(-0.1, 1.1) * h;
    const r = between(0.2, 0.65) * Math.max(w, h);
    body += `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${r.toFixed(0)}" fill="url(#${gid})"/>`;
  }

  // laser beams
  const beams = Math.floor(rnd() * 4);
  for (let i = 0; i < beams; i++) {
    const color = pick(palette.lights);
    const x = between(0, w);
    const angle = between(-50, 50);
    body += `<rect x="${x.toFixed(0)}" y="${(-h * 0.2).toFixed(0)}" width="${between(4, 18).toFixed(0)}" height="${(h * 1.4).toFixed(0)}" fill="${color}" opacity="${between(0.15, 0.5).toFixed(2)}" transform="rotate(${angle.toFixed(1)} ${x.toFixed(0)} ${(h / 2).toFixed(0)})"/>`;
  }

  // rings / arcs — architectural accents
  const rings = Math.floor(rnd() * 3);
  for (let i = 0; i < rings; i++) {
    const color = pick(palette.lights);
    body += `<circle cx="${between(0.1, 0.9) * w}" cy="${between(0.1, 0.9) * h}" r="${between(0.08, 0.3) * w}" fill="none" stroke="${color}" stroke-width="${between(2, 10).toFixed(1)}" opacity="${between(0.2, 0.6).toFixed(2)}"/>`;
  }

  // horizon / floor glow band
  if (rnd() > 0.4) {
    const color = pick(palette.lights);
    const y = between(0.55, 0.85) * h;
    defs += `<linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity="0"/><stop offset="50%" stop-color="${color}" stop-opacity="${between(0.2, 0.45).toFixed(2)}"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/></linearGradient>`;
    body += `<rect x="0" y="${(y - h * 0.12).toFixed(0)}" width="${w}" height="${(h * 0.24).toFixed(0)}" fill="url(#floor)"/>`;
  }

  // crowd silhouette (simple wave of dark humps) for landscape shots
  if (w >= h && rnd() > 0.45) {
    let d = `M0 ${h}`;
    let x = 0;
    while (x < w) {
      const humpW = between(60, 160) * (w / 1600);
      const humpH = between(0.12, 0.3) * h;
      d += ` Q ${(x + humpW / 2).toFixed(0)} ${(h - humpH).toFixed(0)} ${(x + humpW).toFixed(0)} ${(h - between(0, 0.06) * h).toFixed(0)}`;
      x += humpW;
    }
    d += ` L ${w} ${h} Z`;
    body += `<path d="${d}" fill="#03020a" opacity="0.9"/>`;
  }

  // film grain + vignette
  defs += `<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="0.14"/></feComponentTransfer><feComposite operator="over" in2="SourceGraphic"/></filter>`;
  defs += `<radialGradient id="vig" cx="50%" cy="45%" r="75%"><stop offset="60%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.55"/></radialGradient>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<defs>${defs}</defs>` +
    `<rect width="${w}" height="${h}" fill="${palette.bg}"/>` +
    `<g filter="url(#grain)">${body}</g>` +
    `<rect width="${w}" height="${h}" fill="url(#vig)"/>` +
    `</svg>`;
}

export function generateAvatarSvg(seedStr) {
  const rnd = mulberry32(hashSeed(seedStr));
  const palette = PALETTES[Math.floor(rnd() * PALETTES.length)];
  const c1 = palette.lights[0];
  const c2 = palette.lights[1 % palette.lights.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">` +
    `<defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient></defs>` +
    `<rect width="240" height="240" fill="${palette.bg}"/>` +
    `<circle cx="${120 + (rnd() - 0.5) * 60}" cy="${110 + (rnd() - 0.5) * 40}" r="${70 + rnd() * 30}" fill="url(#a)" opacity="0.9"/>` +
    `<circle cx="${120 + (rnd() - 0.5) * 90}" cy="${140 + (rnd() - 0.5) * 60}" r="${30 + rnd() * 25}" fill="${palette.lights[2 % palette.lights.length]}" opacity="0.7"/>` +
    `</svg>`;
}
