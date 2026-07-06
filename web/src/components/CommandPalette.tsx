import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { EventItem, Gallery } from '../lib/types';
import { useApp } from '../lib/store';
import {
  IcCalendar, IcCompass, IcFeed, IcImages, IcLayers, IcReceipt, IcSearch, IcSettings,
  IcSparkles, IcTicket, IcUser, IcZap,
} from '../lib/icons';

interface Cmd {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  keywords: string;
  run: () => void;
  group: string;
}

/** Global Ctrl/Cmd+K palette: jump to events, galleries and pages instantly. */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const navigate = useNavigate();
  const { user, toast } = useApp();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpenEvent = () => setOpen(true);
    document.addEventListener('keydown', onKey);
    window.addEventListener('tired:palette', onOpenEvent);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('tired:palette', onOpenEvent);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setQ('');
    setIdx(0);
    inputRef.current?.focus();
    api.get<{ events: EventItem[] }>('/api/events').then((r) => setEvents(r.events)).catch(() => undefined);
    api.get<{ galleries: Gallery[] }>('/api/galleries').then((r) => setGalleries(r.galleries)).catch(() => undefined);
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  const go = useCallback(
    (to: string) => {
      close();
      navigate(to);
    },
    [close, navigate],
  );

  const commands = useMemo<Cmd[]>(() => {
    const pages: Cmd[] = [
      { id: 'p-events', label: 'Events', icon: <IcCalendar size={16} />, keywords: 'events browse home', run: () => go('/events'), group: 'Pages' },
      { id: 'p-nearby', label: 'Nearby', icon: <IcCompass size={16} />, keywords: 'nearby location radar distance', run: () => go('/nearby'), group: 'Pages' },
      { id: 'p-services', label: 'Services', icon: <IcSparkles size={16} />, keywords: 'services booking dj sound', run: () => go('/services'), group: 'Pages' },
      { id: 'p-galleries', label: 'Galleries', icon: <IcImages size={16} />, keywords: 'galleries photos library pictures', run: () => go('/galleries'), group: 'Pages' },
      { id: 'p-dash', label: 'Dashboard', icon: <IcUser size={16} />, keywords: 'dashboard profile', run: () => go('/dashboard'), group: 'Pages' },
      { id: 'p-feed', label: 'Feed', icon: <IcFeed size={16} />, keywords: 'feed posts wire', run: () => go('/feed'), group: 'Pages' },
      { id: 'p-tickets', label: 'My tickets', icon: <IcTicket size={16} />, keywords: 'tickets wallet codes', run: () => go('/tickets'), group: 'Pages' },
      { id: 'p-orders', label: 'Orders', icon: <IcReceipt size={16} />, keywords: 'orders receipts purchases', run: () => go('/orders'), group: 'Pages' },
      { id: 'p-settings', label: 'Settings', icon: <IcSettings size={16} />, keywords: 'settings profile accent appearance', run: () => go('/settings'), group: 'Pages' },
      { id: 'p-covers', label: 'Cover rotation', icon: <IcImages size={16} />, keywords: 'covers banner background rotation', run: () => go('/covers'), group: 'Pages' },
    ];
    const evs: Cmd[] = events.map((e) => ({
      id: `e-${e.id}`,
      label: e.title,
      hint: `${new Date(e.startsAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${e.venue.city}`,
      icon: <IcZap size={16} />,
      keywords: `${e.title} ${e.tagline} ${e.venue.city} ${e.tags.join(' ')}`,
      run: () => go(`/events/${e.slug}`),
      group: 'Events',
    }));
    const gals: Cmd[] = galleries.map((g) => ({
      id: `g-${g.id}`,
      label: g.name,
      hint: `${g.count} photos`,
      icon: <IcLayers size={16} />,
      keywords: `${g.name} ${g.description} gallery`,
      run: () => go(`/galleries/${g.id}`),
      group: 'Galleries',
    }));
    const actions: Cmd[] = user
      ? [{
          id: 'a-rescan',
          label: 'Rescan photo folders',
          icon: <IcImages size={16} />,
          keywords: 'rescan reindex refresh photos import',
          run: async () => {
            close();
            const r = await api.post<{ total: number; added: number }>('/api/media/rescan').catch(() => null);
            toast(r ? `Rescan complete — ${r.total} photos (${r.added} new)` : 'Rescan failed', r ? 'ok' : 'err');
          },
          group: 'Actions',
        }]
      : [];
    return [...pages, ...evs, ...gals, ...actions];
  }, [events, galleries, go, user, close, toast]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return commands.slice(0, 12);
    return commands
      .map((c) => {
        const hay = `${c.label} ${c.keywords}`.toLowerCase();
        let score = 0;
        if (c.label.toLowerCase().startsWith(needle)) score = 3;
        else if (c.label.toLowerCase().includes(needle)) score = 2;
        else if (hay.includes(needle)) score = 1;
        return { c, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.c)
      .slice(0, 14);
  }, [commands, q]);

  useEffect(() => setIdx(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('.cp-item.on')?.scrollIntoView({ block: 'nearest' });
  }, [idx]);

  if (!open) return null;

  const groups: { name: string; items: Cmd[] }[] = [];
  for (const c of filtered) {
    const g = groups.find((x) => x.name === c.group);
    if (g) g.items.push(c);
    else groups.push({ name: c.group, items: [c] });
  }
  const flat = groups.flatMap((g) => g.items);

  return createPortal(
    <div className="modal-backdrop" style={{ alignItems: 'flex-start', paddingTop: '14vh' }} onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <div className="modal" style={{ maxWidth: 620, padding: 12 }} role="dialog" aria-label="Command palette">
        <div className="search-wrap" style={{ maxWidth: '100%' }}>
          <IcSearch size={17} />
          <input
            ref={inputRef}
            className="input"
            placeholder="Jump to an event, gallery, page… (Esc to close)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') close();
              else if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(flat.length - 1, i + 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
              else if (e.key === 'Enter') { e.preventDefault(); flat[idx]?.run(); }
            }}
            aria-label="Search commands"
          />
        </div>
        <div ref={listRef} style={{ maxHeight: '46vh', overflow: 'auto', marginTop: 8 }}>
          {groups.map((g) => (
            <div key={g.name}>
              <div className="faint" style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '10px 12px 4px' }}>{g.name}</div>
              {g.items.map((c) => {
                const i = flat.indexOf(c);
                return (
                  <button
                    key={c.id}
                    className={`menu-item cp-item${i === idx ? ' on' : ''}`}
                    style={i === idx ? { background: 'var(--accent-soft)', color: 'var(--text)', paddingLeft: 16 } : undefined}
                    onClick={() => c.run()}
                    onPointerEnter={() => setIdx(i)}
                  >
                    {c.icon}
                    <span style={{ flex: 1, textAlign: 'left' }}>{c.label}</span>
                    {c.hint && <span className="faint" style={{ fontSize: 12 }}>{c.hint}</span>}
                  </button>
                );
              })}
            </div>
          ))}
          {!flat.length && <div className="muted" style={{ padding: 22, textAlign: 'center', fontSize: 13.5 }}>Nothing matches “{q}”.</div>}
        </div>
        <div className="row" style={{ justifyContent: 'center', gap: 14, padding: '10px 0 4px', fontSize: 11.5, color: 'var(--text-3)' }}>
          <span><kbd>↑↓</kbd> navigate</span>
          <span><kbd>Enter</kbd> open</span>
          <span><kbd>Esc</kbd> close</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
