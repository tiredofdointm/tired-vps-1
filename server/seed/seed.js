import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scryptHash, uid, sha1 } from '../lib/util.js';
import { generatePhotoSvg, ASPECTS, mulberry32, hashSeed } from './svggen.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DAY = 864e5;
const HOUR = 36e5;

const photoId = (relPath) => sha1(`0:${relPath}`).slice(0, 16);

async function writePhotos(imagesDir, folder, prefix, count, { paletteName, wide } = {}) {
  const dir = path.join(imagesDir, folder);
  await fs.promises.mkdir(dir, { recursive: true });
  const rnd = mulberry32(hashSeed(folder));
  const ids = [];
  for (let i = 1; i <= count; i++) {
    const name = `${prefix}_${String(i).padStart(4, '0')}.svg`;
    const rel = `${folder}/${name}`;
    const aspect = wide ? ASPECTS[2] : ASPECTS[Math.floor(rnd() * ASPECTS.length)];
    const svg = generatePhotoSvg(rel, { aspect, paletteName });
    await fs.promises.writeFile(path.join(dir, name), svg);
    ids.push(photoId(rel));
  }
  return ids;
}

export async function ensureSeed({ dataDir, force = false } = {}) {
  dataDir = dataDir || path.resolve(__dirname, '..', '..', 'data');
  const dbFile = path.join(dataDir, 'db.json');
  if (!force && fs.existsSync(dbFile)) {
    try {
      const existing = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
      if (existing.users?.length) return false;
    } catch { /* corrupted — reseed */ }
  }
  console.log('[seed] seeding demo data into', dataDir);
  const imagesDir = path.join(dataDir, 'images');

  // --- generated "imported" photo folders (read-only library simulation) ---
  const echo = await writePhotos(imagesDir, 'imports/2026-06-echo-chamber', 'IMG', 26, { paletteName: 'violet-haze' });
  const bloom = await writePhotos(imagesDir, 'imports/2026-05-midnight-bloom', 'IMG', 20, { paletteName: 'crimson-bass' });
  const neonPromo = await writePhotos(imagesDir, 'imports/2026-07-neon-garden-promo', 'PROMO', 12, { paletteName: 'neon-club' });
  const rooftop = await writePhotos(imagesDir, 'imports/rooftop-scouting', 'SCOUT', 14, { paletteName: 'sunset-rooftop' });
  const roll = await writePhotos(imagesDir, 'imports/camera-roll', 'DSC', 264);
  const covers = await writePhotos(imagesDir, 'brand/covers', 'COVER', 10, { wide: true });

  const now = Date.now();
  const mk = scryptHash('tired123');
  const gk = scryptHash('guest123');

  const me = {
    id: 'usr_tired', email: 'tiredofdointm@gmail.com', name: 'TIRED', handle: 'tired',
    salt: mk.salt, passwordHash: mk.hash, roles: ['client', 'host'],
    bio: 'Underground events collective. Warehouses, rooftops, sunrises.',
    avatarId: covers[0], bannerCoverIds: [covers[1], covers[3], covers[5]],
    accent: 'violet', location: { city: 'Brooklyn, NY', lat: 40.6782, lng: -73.9442 },
    prefs: { reducedMotion: false, emailUpdates: true }, createdAt: now - 200 * DAY,
  };
  const guest = {
    id: 'usr_guest', email: 'guest@tired.events', name: 'Night Guest', handle: 'nightguest',
    salt: gk.salt, passwordHash: gk.hash, roles: ['client'],
    bio: 'Here for the music.', avatarId: null, bannerCoverIds: [],
    accent: 'cyan', location: { city: 'New York, NY', lat: 40.7128, lng: -74.006 },
    prefs: { reducedMotion: false, emailUpdates: false }, createdAt: now - 40 * DAY,
  };

  const galleries = [
    {
      id: 'gal_echo', name: 'Echo Chamber — June ’26', description: 'Full set from the June warehouse takeover. Shot on the floor, no flash.',
      ownerId: me.id, photoIds: echo, pinnedIds: [echo[0], echo[5]], coverIds: [echo[0], echo[3], echo[9]],
      showcase: true, createdAt: now - 20 * DAY, updatedAt: now - 20 * DAY,
    },
    {
      id: 'gal_bloom', name: 'Midnight Bloom', description: 'Closing night of the spring series.',
      ownerId: me.id, photoIds: bloom, pinnedIds: [bloom[2]], coverIds: [bloom[2], bloom[7]],
      showcase: true, createdAt: now - 42 * DAY, updatedAt: now - 41 * DAY,
    },
    {
      id: 'gal_promo', name: 'Neon Garden — Promo kit', description: 'Approved artwork + teaser stills for July.',
      ownerId: me.id, photoIds: neonPromo, pinnedIds: [], coverIds: [neonPromo[0], neonPromo[1], neonPromo[2]],
      showcase: true, createdAt: now - 9 * DAY, updatedAt: now - 2 * DAY,
    },
    {
      id: 'gal_scout', name: 'Rooftop scouting', description: 'Location options for August — internal.',
      ownerId: me.id, photoIds: rooftop, pinnedIds: [], coverIds: [rooftop[1]],
      showcase: false, createdAt: now - 15 * DAY, updatedAt: now - 15 * DAY,
    },
  ];

  const venue = (name, address, city, lat, lng, announced = true) => ({ name, address, city, lat, lng, announced });
  const ev = (o) => ({
    tagline: '', description: '', tags: [], coverIds: [], galleryId: null, featured: false,
    status: 'published', capacity: 300, ticketsSold: 0, hostId: me.id, createdAt: now - 30 * DAY, ...o,
  });

  const events = [
    ev({
      id: 'evt_neon', slug: 'neon-garden', title: 'Neon Garden', tagline: 'An overgrown warehouse, rewired.',
      description: 'Two rooms, twelve hours. The main floor runs deep house into peak-time techno while the garden room stays ambient until sunrise. Full neon install by the Bloom Collective, botanical stage design, and a listening lounge when your ears need a break.\n\nLockers, water refill stations and a quiet room are available all night. 21+.',
      startsAt: now + 12 * DAY + 21 * HOUR, endsAt: now + 13 * DAY + 6 * HOUR,
      venue: venue('Greenpoint Terminal', '2 Noble St, Brooklyn', 'Brooklyn, NY', 40.7307, -73.9579),
      priceFrom: 42, tags: ['techno', 'warehouse', 'neon'], coverIds: [neonPromo[0], neonPromo[1], neonPromo[4]],
      galleryId: 'gal_promo', featured: true, capacity: 800, ticketsSold: 512,
    }),
    ev({
      id: 'evt_freq', slug: 'warehouse-frequencies', title: 'Warehouse Frequencies', tagline: 'Location drops 24h before doors.',
      description: 'The series that started it all. Address is sent to ticket holders the day before. Heavy system, no phones on the floor, no photos except the house photographer.',
      startsAt: now + 19 * DAY + 22 * HOUR, endsAt: now + 20 * DAY + 5 * HOUR,
      venue: venue('TBA', '', 'Queens, NY', 40.7282, -73.7949, false),
      priceFrom: 35, tags: ['techno', 'secret'], coverIds: [roll[12], roll[40], roll[88]],
      capacity: 500, ticketsSold: 341,
    }),
    ev({
      id: 'evt_rooftop', slug: 'rooftop-golden-hour', title: 'Rooftop Golden Hour', tagline: 'Disco while the sun goes down.',
      description: 'Open-air rooftop with skyline views, string quartet opener, then disco and boogie until late. Dress loud.',
      startsAt: now + 26 * DAY + 17 * HOUR, endsAt: now + 26 * DAY + 23 * HOUR,
      venue: venue('The Westlight Roof', '111 N 12th St, Brooklyn', 'Brooklyn, NY', 40.7223, -73.9573),
      priceFrom: 55, tags: ['disco', 'rooftop', 'sunset'], coverIds: [rooftop[1], rooftop[4], rooftop[8]],
      featured: true, capacity: 220, ticketsSold: 147,
    }),
    ev({
      id: 'evt_bass', slug: 'bass-sanctuary', title: 'Bass Sanctuary', tagline: 'Sound-system worship, riverside.',
      description: 'A cathedral of subwoofers on the Jersey City waterfront. Dub, jungle and 140 all night.',
      startsAt: now + 40 * DAY + 20 * HOUR, endsAt: now + 41 * DAY + 4 * HOUR,
      venue: venue('Harborside Pavilion', '210 Hudson St, Jersey City', 'Jersey City, NJ', 40.7178, -74.0431),
      priceFrom: 30, tags: ['bass', 'jungle', 'outdoor'], coverIds: [roll[120], roll[121], roll[150]],
      capacity: 600, ticketsSold: 98,
    }),
    ev({
      id: 'evt_afterglow', slug: 'afterglow-closing', title: 'Afterglow: Closing Party', tagline: 'The summer ends where it began.',
      description: 'Final party of the season back at the Terminal. Every resident plays. Gallery wall of the whole summer printed large.',
      startsAt: now + 54 * DAY + 21 * HOUR, endsAt: now + 55 * DAY + 6 * HOUR,
      venue: venue('Greenpoint Terminal', '2 Noble St, Brooklyn', 'Brooklyn, NY', 40.7307, -73.9579),
      priceFrom: 45, tags: ['techno', 'warehouse', 'closing'], coverIds: [roll[30], roll[64], roll[99]],
      featured: true, capacity: 800, ticketsSold: 203,
    }),
    ev({
      id: 'evt_sunrise', slug: 'sunrise-sessions', title: 'Sunrise Sessions', tagline: 'Beach. 4am doors. Bring a blanket.',
      description: 'Ambient into melodic house as the sun comes up over Rockaway. Coffee cart and breakfast tacos at dawn.',
      startsAt: now + 61 * DAY + 4 * HOUR, endsAt: now + 61 * DAY + 11 * HOUR,
      venue: venue('Rockaway Beach 86th St', 'Beach 86th St', 'Queens, NY', 40.5884, -73.8129),
      priceFrom: 25, tags: ['sunrise', 'beach', 'ambient'], coverIds: [roll[200], roll[210], roll[220]],
      capacity: 400, ticketsSold: 61,
    }),
    ev({
      id: 'evt_circuit', slug: 'circuit-bloom', title: 'Circuit Bloom', tagline: 'Philly link-up with the Bloom crew.',
      description: 'First away game of the season. Local residents b2b with ours across two rooms.',
      startsAt: now + 68 * DAY + 21 * HOUR, endsAt: now + 69 * DAY + 4 * HOUR,
      venue: venue('The Fillmore Foundry', '29 E Allen St, Philadelphia', 'Philadelphia, PA', 39.9646, -75.1352),
      priceFrom: 28, tags: ['techno', 'tour'], coverIds: [roll[55], roll[77]],
      capacity: 450, ticketsSold: 12,
    }),
    ev({
      id: 'evt_velvet', slug: 'velvet-static', title: 'Velvet Static', tagline: 'Boston, first time out east.',
      description: 'Slow-burn grooves and static-charged visuals in a converted power station.',
      startsAt: now + 75 * DAY + 21 * HOUR, endsAt: now + 76 * DAY + 3 * HOUR,
      venue: venue('Power Station Six', '550 Harrison Ave, Boston', 'Boston, MA', 42.3417, -71.0669),
      priceFrom: 32, tags: ['house', 'tour'], coverIds: [roll[140], roll[161]],
      capacity: 350, ticketsSold: 5,
    }),
    ev({
      id: 'evt_echo', slug: 'echo-chamber', title: 'Echo Chamber', tagline: 'June warehouse takeover.',
      description: 'That night. Photos are up — tag yourself.',
      startsAt: now - 22 * DAY + 21 * HOUR, endsAt: now - 21 * DAY + 6 * HOUR,
      venue: venue('Knockdown Center', '52-19 Flushing Ave, Queens', 'Queens, NY', 40.7141, -73.9107),
      priceFrom: 38, tags: ['techno', 'warehouse'], coverIds: [echo[0], echo[3], echo[9]],
      galleryId: 'gal_echo', capacity: 700, ticketsSold: 700,
    }),
    ev({
      id: 'evt_bloomnight', slug: 'midnight-bloom', title: 'Midnight Bloom', tagline: 'Spring series finale.',
      description: 'Closed out the spring with the loudest night of the series. Gallery live now.',
      startsAt: now - 44 * DAY + 21 * HOUR, endsAt: now - 43 * DAY + 5 * HOUR,
      venue: venue('Elsewhere Rooftop', '599 Johnson Ave, Brooklyn', 'Brooklyn, NY', 40.7093, -73.9237),
      priceFrom: 33, tags: ['house', 'rooftop'], coverIds: [bloom[2], bloom[7], bloom[11]],
      galleryId: 'gal_bloom', capacity: 400, ticketsSold: 400,
    }),
  ];

  const services = [
    { id: 'svc_photo', title: 'Event photography', category: 'Media', description: 'House photographer for your night — full edited gallery delivered in 48h, shot dark-floor style with no intrusive flash.', priceFrom: 450, rating: 4.9, coverIds: [echo[4], bloom[5]], providerId: me.id },
    { id: 'svc_sound', title: 'Sound-system rental', category: 'Production', description: 'Turbosound rig with engineer, tuned to the room. Delivery, setup and teardown included.', priceFrom: 1200, rating: 4.8, coverIds: [roll[33]], providerId: me.id },
    { id: 'svc_neon', title: 'Neon & light install', category: 'Design', description: 'Custom neon signage and light programming by the Bloom Collective.', priceFrom: 800, rating: 5.0, coverIds: [neonPromo[3]], providerId: me.id },
    { id: 'svc_door', title: 'Door & guestlist crew', category: 'Operations', description: 'Experienced, friendly door staff with scanner kit and live capacity dashboard.', priceFrom: 350, rating: 4.7, coverIds: [roll[70]], providerId: me.id },
    { id: 'svc_dj', title: 'Resident DJ booking', category: 'Talent', description: 'Book a TIRED resident for your event — techno, house, disco or ambient sets.', priceFrom: 600, rating: 4.9, coverIds: [roll[91]], providerId: me.id },
  ];

  const tickets = [
    { id: 'tkt_1', userId: me.id, eventId: 'evt_neon', type: 'General admission', code: 'NG26AX7Q', purchasedAt: now - 8 * DAY, status: 'valid' },
    { id: 'tkt_2', userId: me.id, eventId: 'evt_neon', type: 'General admission', code: 'NG26AX8R', purchasedAt: now - 8 * DAY, status: 'valid' },
    { id: 'tkt_3', userId: me.id, eventId: 'evt_freq', type: 'General admission', code: 'WFQ91MZ2', purchasedAt: now - 5 * DAY, status: 'valid' },
    { id: 'tkt_4', userId: me.id, eventId: 'evt_echo', type: 'General admission', code: 'EC77KD1P', purchasedAt: now - 30 * DAY, status: 'used' },
    { id: 'tkt_5', userId: guest.id, eventId: 'evt_rooftop', type: 'General admission', code: 'RG55TY3W', purchasedAt: now - 2 * DAY, status: 'valid' },
  ];

  const orders = [
    { id: 'ord_1', userId: me.id, items: [{ kind: 'ticket', refId: 'evt_neon', title: 'Neon Garden', qty: 2, unitPrice: 42 }], total: 84, status: 'paid', createdAt: now - 8 * DAY },
    { id: 'ord_2', userId: me.id, items: [{ kind: 'ticket', refId: 'evt_freq', title: 'Warehouse Frequencies', qty: 1, unitPrice: 35 }], total: 35, status: 'paid', createdAt: now - 5 * DAY },
    { id: 'ord_3', userId: me.id, items: [{ kind: 'ticket', refId: 'evt_echo', title: 'Echo Chamber', qty: 1, unitPrice: 38 }], total: 38, status: 'paid', createdAt: now - 30 * DAY },
    { id: 'ord_4', userId: guest.id, items: [{ kind: 'ticket', refId: 'evt_rooftop', title: 'Rooftop Golden Hour', qty: 1, unitPrice: 55 }], total: 55, status: 'paid', createdAt: now - 2 * DAY },
    { id: 'ord_5', userId: guest.id, items: [{ kind: 'service', refId: 'svc_photo', title: 'Event photography', qty: 1, unitPrice: 450 }], total: 450, status: 'paid', createdAt: now - 12 * DAY },
  ];

  const notifications = [
    { id: 'ntf_1', userId: me.id, type: 'gallery', title: 'Echo Chamber gallery is live', body: '26 photos from the June takeover are ready to share.', href: '/galleries/gal_echo', createdAt: now - 19 * DAY, readAt: now - 18 * DAY },
    { id: 'ntf_2', userId: me.id, type: 'order', title: 'Order confirmed', body: '2× Neon Garden — $84.00', href: '/orders', createdAt: now - 8 * DAY, readAt: now - 7 * DAY },
    { id: 'ntf_3', userId: me.id, type: 'event', title: 'Neon Garden is 64% sold', body: '512 of 800 tickets gone. Consider announcing phase two.', href: '/events/neon-garden', createdAt: now - 2 * DAY, readAt: null },
    { id: 'ntf_4', userId: me.id, type: 'reminder', title: 'Warehouse Frequencies location drop', body: 'Address goes out to ticket holders in 18 days.', href: '/events/warehouse-frequencies', createdAt: now - DAY, readAt: null },
    { id: 'ntf_5', userId: me.id, type: 'feed', title: 'Your post is getting traction', body: '“Neon Garden phase one…” passed 40 likes.', href: '/feed', createdAt: now - 5 * HOUR, readAt: null },
    { id: 'ntf_6', userId: guest.id, type: 'welcome', title: 'Welcome to TIRED.EVENTS', body: 'Set up your profile and find your first event.', href: '/dashboard', createdAt: now - 40 * DAY, readAt: null },
  ];

  const feed = [
    { id: 'post_1', authorId: me.id, authorName: 'TIRED', text: 'Neon Garden phase one is officially 60% gone. Phase two pricing kicks in Friday — if you were waiting, this is the sign. 🌿⚡', photoIds: [neonPromo[0], neonPromo[1], neonPromo[4]], eventId: 'evt_neon', createdAt: now - 2 * DAY, likedBy: [guest.id, 'u1', 'u2', 'u3', 'u4', 'u5'] },
    { id: 'post_2', authorId: me.id, authorName: 'TIRED', text: 'Echo Chamber photo drop. 26 frames from the floor — tag yourself, share your set. Full gallery on the site.', photoIds: [echo[0], echo[3], echo[9], echo[14]], eventId: 'evt_echo', createdAt: now - 19 * DAY, likedBy: ['u1', 'u2', 'u6', 'u7'] },
    { id: 'post_3', authorId: me.id, authorName: 'TIRED', text: 'Scouting rooftops for Golden Hour. The skyline is doing the marketing for us.', photoIds: [rooftop[1], rooftop[4]], eventId: 'evt_rooftop', createdAt: now - 12 * DAY, likedBy: ['u2', 'u8'] },
    { id: 'post_4', authorId: guest.id, authorName: 'Night Guest', text: 'Still thinking about Midnight Bloom. Whoever ran the closing set — thank you.', photoIds: [bloom[7]], eventId: 'evt_bloomnight', createdAt: now - 40 * DAY, likedBy: [me.id, 'u1'] },
  ];

  const db = {
    users: [me, guest], sessions: {}, events, services, galleries,
    shares: [], orders, tickets, notifications, feed,
  };
  await fs.promises.mkdir(dataDir, { recursive: true });
  await fs.promises.writeFile(dbFile, JSON.stringify(db, null, 2));
  console.log('[seed] done — 2 users, %d events, %d galleries, %d photos', events.length, galleries.length, echo.length + bloom.length + neonPromo.length + rooftop.length + roll.length + covers.length);
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await ensureSeed({ force: true });
}
