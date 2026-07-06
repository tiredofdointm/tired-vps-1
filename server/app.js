import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from './lib/store.js';
import { MediaLibrary } from './lib/media.js';
import { createAuth, publicUser } from './lib/auth.js';
import { aw, haversineKm, httpError, scryptHash, token, uid, verifyPassword } from './lib/util.js';
import { streamZip } from './lib/zip.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp({ dataDir = path.resolve(__dirname, '..', 'data') } = {}) {
  const db = new Store(path.join(dataDir, 'db.json'), {
    users: [], sessions: {}, events: [], services: [], galleries: [],
    shares: [], orders: [], tickets: [], notifications: [], feed: [],
  });
  const imageRoots = (process.env.TIRED_IMAGES_DIRS || path.join(dataDir, 'images'))
    .split(',').map((s) => s.trim()).filter(Boolean);
  const media = new MediaLibrary({ roots: imageRoots, dataDir });

  const auth = createAuth(db);
  const app = express();
  app.locals.db = db;
  app.locals.media = media;
  app.use(express.json({ limit: '2mb' }));
  app.use(auth.attach);

  const api = express.Router();
  app.use('/api', api);

  // ---------- helpers ----------
  const eventById = (idOrSlug) =>
    db.data.events.find((e) => e.id === idOrSlug || e.slug === idOrSlug) || null;

  const enrichEvent = (e, user) => {
    if (!e) return null;
    const host = db.data.users.find((u) => u.id === e.hostId);
    const going = db.data.tickets.filter((t) => t.eventId === e.id && t.status === 'valid').length;
    return {
      ...e,
      hostName: host?.name || 'TIRED Collective',
      going,
      isMine: !!user && e.hostId === user.id,
      venuePublic: e.venue?.announced
        ? e.venue
        : { ...e.venue, name: 'Secret location', address: 'Revealed closer to the date', announced: false, lat: null, lng: null },
    };
  };

  const enrichTicket = (t) => ({ ...t, event: enrichEvent(eventById(t.eventId), null) });

  const notify = (userId, n) => {
    db.data.notifications.unshift({ id: uid('ntf_'), userId, createdAt: Date.now(), readAt: null, ...n });
    db.save();
  };

  // ---------- auth ----------
  api.post('/auth/signin', aw(async (req, res) => {
    const { email, password } = req.body || {};
    const user = db.data.users.find((u) => u.email.toLowerCase() === String(email || '').toLowerCase());
    if (!user || !verifyPassword(String(password || ''), user.salt, user.passwordHash)) {
      throw httpError(401, 'Invalid email or password');
    }
    auth.signIn(res, user.id);
    res.json({ user: publicUser(user) });
  }));

  api.post('/auth/register', aw(async (req, res) => {
    const { email, password, name } = req.body || {};
    if (!email || !/.+@.+\..+/.test(email)) throw httpError(400, 'Valid email required');
    if (!password || String(password).length < 6) throw httpError(400, 'Password must be at least 6 characters');
    if (db.data.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) throw httpError(409, 'Account already exists');
    const { salt, hash } = scryptHash(String(password));
    const user = {
      id: uid('usr_'), email, name: name || email.split('@')[0], handle: email.split('@')[0],
      salt, passwordHash: hash, roles: ['client'], bio: '', avatarId: null, bannerCoverIds: [],
      accent: 'violet', location: null, prefs: { reducedMotion: false, emailUpdates: true },
      createdAt: Date.now(),
    };
    db.data.users.push(user);
    db.save();
    auth.signIn(res, user.id);
    notify(user.id, { type: 'welcome', title: 'Welcome to TIRED.EVENTS', body: 'Set up your profile and find your first event.', href: '/dashboard' });
    res.json({ user: publicUser(user) });
  }));

  api.post('/auth/signout', (req, res) => {
    auth.signOut(req, res);
    res.json({ ok: true });
  });

  api.get('/auth/me', (req, res) => {
    res.json({ user: publicUser(req.user) });
  });

  api.patch('/me', auth.requireUser, aw(async (req, res) => {
    const allowed = ['name', 'handle', 'bio', 'avatarId', 'bannerCoverIds', 'accent', 'location', 'prefs'];
    for (const key of allowed) {
      if (key in req.body) req.user[key] = req.body[key];
    }
    db.save();
    res.json({ user: publicUser(req.user) });
  }));

  // ---------- events ----------
  api.get('/events', (req, res) => {
    const { q, tag, featured } = req.query;
    let events = db.data.events.filter((e) => e.status === 'published');
    if (featured === '1') events = events.filter((e) => e.featured);
    if (tag) events = events.filter((e) => e.tags.includes(String(tag)));
    if (q) {
      const needle = String(q).toLowerCase();
      events = events.filter((e) =>
        [e.title, e.tagline, e.description, e.venue?.city, ...(e.tags || [])].join(' ').toLowerCase().includes(needle));
    }
    events.sort((a, b) => a.startsAt - b.startsAt);
    res.json({ events: events.map((e) => enrichEvent(e, req.user)) });
  });

  api.get('/events/nearby', (req, res) => {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = Math.min(parseFloat(req.query.radiusKm) || 100, 20000);
    const origin = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : { lat: 40.7128, lng: -74.006 };
    const events = db.data.events
      .filter((e) => e.status === 'published' && e.venue?.lat != null)
      .map((e) => ({ ...enrichEvent(e, req.user), distanceKm: Math.round(haversineKm(origin, e.venue) * 10) / 10 }))
      .filter((e) => e.distanceKm <= radius)
      .sort((a, b) => a.distanceKm - b.distanceKm);
    res.json({ origin, events });
  });

  api.get('/events/:id', (req, res) => {
    const event = eventById(req.params.id);
    if (!event || (event.status !== 'published' && event.hostId !== req.user?.id)) throw httpError(404, 'Event not found');
    const gallery = db.data.galleries.find((g) => g.id === event.galleryId) || null;
    res.json({ event: enrichEvent(event, req.user), gallery });
  });

  // ---------- services ----------
  api.get('/services', (req, res) => {
    const services = db.data.services.map((s) => ({
      ...s,
      providerName: db.data.users.find((u) => u.id === s.providerId)?.name || 'TIRED Partner',
    }));
    res.json({ services });
  });

  // ---------- feed ----------
  api.get('/feed', (req, res) => {
    const posts = [...db.data.feed]
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((p) => ({
        ...p,
        liked: !!req.user && p.likedBy.includes(req.user.id),
        likes: p.likedBy.length,
        likedBy: undefined,
        event: p.eventId ? enrichEvent(eventById(p.eventId), req.user) : null,
      }));
    res.json({ posts });
  });

  api.post('/feed', auth.requireUser, aw(async (req, res) => {
    const { text, photoIds = [], eventId = null } = req.body || {};
    if (!text || !String(text).trim()) throw httpError(400, 'Post text required');
    const post = {
      id: uid('post_'), authorId: req.user.id, authorName: req.user.name,
      text: String(text).slice(0, 2000), photoIds: photoIds.slice(0, 12), eventId,
      createdAt: Date.now(), likedBy: [],
    };
    db.data.feed.unshift(post);
    db.save();
    res.json({ post: { ...post, likes: 0, liked: false, likedBy: undefined } });
  }));

  api.post('/feed/:id/like', auth.requireUser, (req, res) => {
    const post = db.data.feed.find((p) => p.id === req.params.id);
    if (!post) throw httpError(404, 'Post not found');
    const idx = post.likedBy.indexOf(req.user.id);
    idx === -1 ? post.likedBy.push(req.user.id) : post.likedBy.splice(idx, 1);
    db.save();
    res.json({ likes: post.likedBy.length, liked: idx === -1 });
  });

  // ---------- tickets & orders ----------
  api.get('/tickets', auth.requireUser, (req, res) => {
    const tickets = db.data.tickets
      .filter((t) => t.userId === req.user.id)
      .map(enrichTicket)
      .sort((a, b) => (a.event?.startsAt || 0) - (b.event?.startsAt || 0));
    res.json({ tickets });
  });

  api.get('/orders', auth.requireUser, (req, res) => {
    const orders = db.data.orders
      .filter((o) => o.userId === req.user.id)
      .sort((a, b) => b.createdAt - a.createdAt);
    res.json({ orders });
  });

  api.post('/orders', auth.requireUser, aw(async (req, res) => {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) throw httpError(400, 'Cart is empty');
    const lines = [];
    let total = 0;
    for (const item of items) {
      const qty = Math.max(1, Math.min(10, parseInt(item.qty, 10) || 1));
      if (item.kind === 'ticket') {
        const event = eventById(item.refId);
        if (!event) throw httpError(400, 'Unknown event in cart');
        lines.push({ kind: 'ticket', refId: event.id, title: event.title, qty, unitPrice: event.priceFrom });
        total += event.priceFrom * qty;
      } else if (item.kind === 'service') {
        const service = db.data.services.find((s) => s.id === item.refId);
        if (!service) throw httpError(400, 'Unknown service in cart');
        lines.push({ kind: 'service', refId: service.id, title: service.title, qty, unitPrice: service.priceFrom });
        total += service.priceFrom * qty;
      }
    }
    const order = {
      id: uid('ord_'), userId: req.user.id, items: lines, total: Math.round(total * 100) / 100,
      status: 'paid', createdAt: Date.now(),
    };
    db.data.orders.unshift(order);
    for (const line of lines) {
      if (line.kind !== 'ticket') continue;
      for (let i = 0; i < line.qty; i++) {
        db.data.tickets.push({
          id: uid('tkt_'), userId: req.user.id, eventId: line.refId, type: 'General admission',
          code: token(6).toUpperCase().replace(/[^A-Z0-9]/g, 'X').slice(0, 8),
          purchasedAt: Date.now(), status: 'valid',
        });
      }
      const event = eventById(line.refId);
      if (event) event.ticketsSold = (event.ticketsSold || 0) + line.qty;
    }
    db.save();
    notify(req.user.id, {
      type: 'order', title: 'Order confirmed',
      body: `${lines.map((l) => `${l.qty}× ${l.title}`).join(', ')} — $${order.total.toFixed(2)}`,
      href: '/orders',
    });
    res.json({ order });
  }));

  // ---------- notifications ----------
  api.get('/notifications', auth.requireUser, (req, res) => {
    const list = db.data.notifications.filter((n) => n.userId === req.user.id).slice(0, 50);
    res.json({ notifications: list, unread: list.filter((n) => !n.readAt).length });
  });

  api.post('/notifications/read-all', auth.requireUser, (req, res) => {
    for (const n of db.data.notifications) if (n.userId === req.user.id && !n.readAt) n.readAt = Date.now();
    db.save();
    res.json({ ok: true });
  });

  api.post('/notifications/:id/read', auth.requireUser, (req, res) => {
    const n = db.data.notifications.find((n) => n.id === req.params.id && n.userId === req.user.id);
    if (n && !n.readAt) { n.readAt = Date.now(); db.save(); }
    res.json({ ok: true });
  });

  // ---------- dashboard aggregate ----------
  api.get('/dashboard', auth.requireUser, (req, res) => {
    const user = req.user;
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const origin = Number.isFinite(lat) && Number.isFinite(lng)
      ? { lat, lng }
      : user.location && user.location.lat != null ? { lat: user.location.lat, lng: user.location.lng } : { lat: 40.7128, lng: -74.006 };

    const myTickets = db.data.tickets.filter((t) => t.userId === user.id).map(enrichTicket);
    const now = Date.now();
    const upcoming = myTickets
      .filter((t) => t.event && t.event.endsAt > now && t.status === 'valid')
      .sort((a, b) => a.event.startsAt - b.event.startsAt);
    const published = db.data.events.filter((e) => e.status === 'published' && e.endsAt > now);
    const nearby = published
      .filter((e) => e.venue?.lat != null)
      .map((e) => ({ ...enrichEvent(e, user), distanceKm: Math.round(haversineKm(origin, e.venue) * 10) / 10 }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 6);
    const featured = published.filter((e) => e.featured).slice(0, 6).map((e) => enrichEvent(e, user));
    const unread = db.data.notifications.filter((n) => n.userId === user.id && !n.readAt).length;

    let host = null;
    if (user.roles.includes('host')) {
      const myEvents = db.data.events.filter((e) => e.hostId === user.id).map((e) => enrichEvent(e, user));
      const eventIds = new Set(myEvents.map((e) => e.id));
      const orders = db.data.orders.filter((o) => o.items.some((i) => i.kind === 'ticket' && eventIds.has(i.refId)));
      // revenue mirrors the per-event figures: total tickets sold × price
      const revenue = myEvents.reduce((s, e) => s + (e.ticketsSold || 0) * (e.priceFrom || 0), 0);
      const ticketsSold = myEvents.reduce((s, e) => s + (e.ticketsSold || 0), 0);
      const salesByDay = {};
      for (const o of orders) {
        const day = new Date(o.createdAt).toISOString().slice(0, 10);
        const amount = o.items.filter((i) => i.kind === 'ticket' && eventIds.has(i.refId)).reduce((s, i) => s + i.qty * i.unitPrice, 0);
        salesByDay[day] = (salesByDay[day] || 0) + amount;
      }
      host = {
        events: myEvents.sort((a, b) => a.startsAt - b.startsAt),
        revenue: Math.round(revenue * 100) / 100,
        ticketsSold,
        recentOrders: orders.slice(0, 8),
        salesByDay,
        services: db.data.services.filter((s) => s.providerId === user.id),
      };
    }

    res.json({
      user: publicUser(user),
      stats: {
        tickets: myTickets.filter((t) => t.status === 'valid').length,
        upcoming: upcoming.length,
        orders: db.data.orders.filter((o) => o.userId === user.id).length,
        unread,
      },
      upcoming: upcoming.slice(0, 8),
      nearby,
      featured,
      host,
    });
  });

  // ---------- host event management ----------
  api.post('/host/events', auth.requireHost, aw(async (req, res) => {
    const b = req.body || {};
    if (!b.title) throw httpError(400, 'Title required');
    const slugBase = String(b.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'event';
    let slug = slugBase; let n = 2;
    while (db.data.events.some((e) => e.slug === slug)) slug = `${slugBase}-${n++}`;
    const event = {
      id: uid('evt_'), slug, hostId: req.user.id, title: String(b.title).slice(0, 120),
      tagline: String(b.tagline || '').slice(0, 200), description: String(b.description || '').slice(0, 5000),
      startsAt: b.startsAt || Date.now() + 14 * 864e5, endsAt: b.endsAt || (b.startsAt || Date.now() + 14 * 864e5) + 6 * 36e5,
      venue: { name: '', address: '', city: '', lat: null, lng: null, announced: false, ...(b.venue || {}) },
      priceFrom: Math.max(0, parseFloat(b.priceFrom) || 0), tags: (b.tags || []).slice(0, 8),
      coverIds: (b.coverIds || []).slice(0, 10), galleryId: b.galleryId || null,
      featured: false, status: b.status === 'published' ? 'published' : 'draft',
      capacity: parseInt(b.capacity, 10) || 200, ticketsSold: 0, createdAt: Date.now(),
    };
    db.data.events.push(event);
    db.save();
    res.json({ event: enrichEvent(event, req.user) });
  }));

  api.patch('/host/events/:id', auth.requireHost, aw(async (req, res) => {
    const event = db.data.events.find((e) => e.id === req.params.id);
    if (!event) throw httpError(404, 'Event not found');
    if (event.hostId !== req.user.id) throw httpError(403, 'Not your event');
    const allowed = ['title', 'tagline', 'description', 'startsAt', 'endsAt', 'venue', 'priceFrom', 'tags', 'coverIds', 'galleryId', 'status', 'capacity', 'featured'];
    for (const key of allowed) if (key in req.body) event[key] = req.body[key];
    db.save();
    res.json({ event: enrichEvent(event, req.user) });
  }));

  // ---------- media library ----------
  api.get('/media', (req, res) => {
    const items = media.list({ folder: req.query.folder, q: req.query.q, includeHidden: req.query.hidden === '1' });
    res.json({ items, total: items.length });
  });

  api.get('/media/folders', (req, res) => {
    res.json({ folders: media.folders(), roots: media.roots });
  });

  api.post('/media/rescan', auth.requireUser, aw(async (req, res) => {
    res.json(await media.scan());
  }));

  api.patch('/media/:id', auth.requireUser, aw(async (req, res) => {
    if (!media.entry(req.params.id)) throw httpError(404, 'Photo not found');
    const patch = {};
    if ('name' in req.body) patch.name = String(req.body.name || '').slice(0, 120) || null;
    for (const key of ['pinned', 'favorite', 'hidden']) if (key in req.body) patch[key] = !!req.body[key];
    if ('tags' in req.body) patch.tags = (req.body.tags || []).map(String).slice(0, 16);
    res.json({ item: media.setMeta(req.params.id, patch) });
  }));

  api.post('/media/batch', auth.requireUser, aw(async (req, res) => {
    const { ids = [], patch = {} } = req.body || {};
    const items = [];
    for (const id of ids.slice(0, 500)) {
      if (!media.entry(id)) continue;
      const p = {};
      for (const key of ['pinned', 'favorite', 'hidden']) if (key in patch) p[key] = !!patch[key];
      items.push(media.setMeta(id, p));
    }
    res.json({ items });
  }));

  // ---------- galleries ----------
  const publicGallery = (g) => ({
    ...g,
    count: g.photoIds.length,
    coverIds: g.coverIds.length ? g.coverIds : g.photoIds.slice(0, 5),
  });

  api.get('/galleries', (req, res) => {
    res.json({ galleries: db.data.galleries.map(publicGallery) });
  });

  api.post('/galleries', auth.requireUser, aw(async (req, res) => {
    const { name, description = '', photoIds = [] } = req.body || {};
    if (!name || !String(name).trim()) throw httpError(400, 'Gallery name required');
    const gallery = {
      id: uid('gal_'), name: String(name).slice(0, 80), description: String(description).slice(0, 500),
      ownerId: req.user.id, photoIds: [...new Set(photoIds)].filter((id) => media.entry(id)),
      pinnedIds: [], coverIds: [], showcase: true, createdAt: Date.now(), updatedAt: Date.now(),
    };
    db.data.galleries.push(gallery);
    db.save();
    res.json({ gallery: publicGallery(gallery) });
  }));

  api.get('/galleries/:id', (req, res) => {
    const gallery = db.data.galleries.find((g) => g.id === req.params.id);
    if (!gallery) throw httpError(404, 'Gallery not found');
    const photos = gallery.photoIds.map((id) => media.publicEntry(media.entry(id))).filter(Boolean);
    const pinnedSet = new Set(gallery.pinnedIds);
    photos.sort((a, b) => (pinnedSet.has(b.id) ? 1 : 0) - (pinnedSet.has(a.id) ? 1 : 0));
    res.json({ gallery: publicGallery(gallery), photos });
  });

  api.patch('/galleries/:id', auth.requireUser, aw(async (req, res) => {
    const gallery = db.data.galleries.find((g) => g.id === req.params.id);
    if (!gallery) throw httpError(404, 'Gallery not found');
    if (gallery.ownerId !== req.user.id) throw httpError(403, 'Not your gallery');
    const b = req.body || {};
    if ('name' in b) gallery.name = String(b.name).slice(0, 80);
    if ('description' in b) gallery.description = String(b.description).slice(0, 500);
    if ('showcase' in b) gallery.showcase = !!b.showcase;
    if ('coverIds' in b) gallery.coverIds = (b.coverIds || []).filter((id) => gallery.photoIds.includes(id)).slice(0, 10);
    if ('pinnedIds' in b) gallery.pinnedIds = (b.pinnedIds || []).filter((id) => gallery.photoIds.includes(id));
    if ('order' in b && Array.isArray(b.order)) {
      const valid = b.order.filter((id) => gallery.photoIds.includes(id));
      const rest = gallery.photoIds.filter((id) => !valid.includes(id));
      gallery.photoIds = [...valid, ...rest];
    }
    gallery.updatedAt = Date.now();
    db.save();
    res.json({ gallery: publicGallery(gallery) });
  }));

  api.post('/galleries/:id/photos', auth.requireUser, aw(async (req, res) => {
    const gallery = db.data.galleries.find((g) => g.id === req.params.id);
    if (!gallery) throw httpError(404, 'Gallery not found');
    if (gallery.ownerId !== req.user.id) throw httpError(403, 'Not your gallery');
    const { add = [], remove = [] } = req.body || {};
    const removeSet = new Set(remove);
    gallery.photoIds = gallery.photoIds.filter((id) => !removeSet.has(id));
    gallery.pinnedIds = gallery.pinnedIds.filter((id) => !removeSet.has(id));
    gallery.coverIds = gallery.coverIds.filter((id) => !removeSet.has(id));
    for (const id of add) {
      if (media.entry(id) && !gallery.photoIds.includes(id)) gallery.photoIds.push(id);
    }
    gallery.updatedAt = Date.now();
    db.save();
    res.json({ gallery: publicGallery(gallery) });
  }));

  api.delete('/galleries/:id', auth.requireUser, aw(async (req, res) => {
    const idx = db.data.galleries.findIndex((g) => g.id === req.params.id);
    if (idx === -1) throw httpError(404, 'Gallery not found');
    if (db.data.galleries[idx].ownerId !== req.user.id) throw httpError(403, 'Not your gallery');
    db.data.galleries.splice(idx, 1);
    db.save();
    res.json({ ok: true });
  }));

  // ---------- shares & export ----------
  api.post('/shares', auth.requireUser, aw(async (req, res) => {
    const { photoIds = [], name = 'Shared photos' } = req.body || {};
    const valid = [...new Set(photoIds)].filter((id) => media.entry(id)).slice(0, 500);
    if (!valid.length) throw httpError(400, 'Select at least one photo');
    const share = {
      token: token(12), name: String(name).slice(0, 120), photoIds: valid,
      createdBy: req.user.id, creatorName: req.user.name, createdAt: Date.now(),
    };
    db.data.shares.push(share);
    db.save();
    res.json({ share: { ...share, url: `/s/${share.token}` } });
  }));

  api.get('/shares/:token', (req, res) => {
    const share = db.data.shares.find((s) => s.token === req.params.token);
    if (!share) throw httpError(404, 'Share link not found or expired');
    res.json({
      share: {
        name: share.name, creatorName: share.creatorName, createdAt: share.createdAt,
        photos: share.photoIds.map((id) => media.publicEntry(media.entry(id))).filter(Boolean),
      },
    });
  });

  app.get('/api/export', auth.requireUser, aw(async (req, res) => {
    const ids = String(req.query.ids || '').split(',').filter(Boolean).slice(0, 500);
    const files = [];
    for (const id of ids) {
      const entry = media.entry(id);
      if (!entry) continue;
      const pub = media.publicEntry(entry);
      files.push({ path: media.absPath(entry), name: `${pub.name}${entry.ext}`, mtime: entry.mtime });
    }
    if (!files.length) throw httpError(400, 'Nothing to export');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="tired-photos-${new Date().toISOString().slice(0, 10)}.zip"`);
    await streamZip(files, res);
  }));

  // ---------- media file serving (read-only, cached) ----------
  app.get('/media/file/:id', aw(async (req, res) => {
    const entry = media.entry(req.params.id);
    if (!entry) throw httpError(404, 'Not found');
    const abs = media.absPath(entry);
    const etag = `"${entry.id}-${entry.mtime}-${entry.size}"`;
    if (req.headers['if-none-match'] === etag) return res.status(304).end();
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Content-Type', media.mimeFor(entry));
    fs.createReadStream(abs).on('error', () => res.status(404).end()).pipe(res);
  }));

  app.get('/media/thumb/:id', aw(async (req, res) => {
    const entry = media.entry(req.params.id);
    if (!entry) throw httpError(404, 'Not found');
    const width = Math.max(64, Math.min(1600, parseInt(req.query.w, 10) || 480));
    const etag = `"t-${entry.id}-${entry.mtime}-${width <= 240 ? 240 : width <= 480 ? 480 : width <= 960 ? 960 : 1600}"`;
    if (req.headers['if-none-match'] === etag) return res.status(304).end();
    const thumb = await media.thumbPath(entry, width);
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    if (thumb) {
      res.setHeader('Content-Type', 'image/webp');
      fs.createReadStream(thumb).on('error', () => res.status(404).end()).pipe(res);
    } else {
      res.setHeader('Content-Type', media.mimeFor(entry));
      fs.createReadStream(media.absPath(entry)).on('error', () => res.status(404).end()).pipe(res);
    }
  }));

  // ---------- static SPA (production) ----------
  const dist = path.resolve(__dirname, '..', 'web', 'dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist, { maxAge: '1h', index: false }));
    app.get(/^(?!\/(api|media)\/).*/, (req, res) => {
      res.sendFile(path.join(dist, 'index.html'));
    });
  }

  // ---------- errors ----------
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || 500;
    if (status >= 500) console.error('[api]', err);
    res.status(status).json({ error: err.message || 'Server error' });
  });

  return { app, db, media };
}
