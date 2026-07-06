import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { EventItem, Gallery } from '../lib/types';
import { useDebounced, useRevealAll } from '../lib/hooks';
import { IcCalendar, IcSearch, IcSparkles, IcZap } from '../lib/icons';
import { CoverCycler } from '../components/CoverCycler';
import { EventCard } from '../components/EventCard';
import { SectionHead, SkeletonBlock } from '../components/ui';

export function EventsPage() {
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('');
  const dq = useDebounced(q, 200);

  useEffect(() => {
    api.get<{ events: EventItem[] }>('/api/events').then((r) => setEvents(r.events)).catch(() => setEvents([]));
    api.get<{ galleries: Gallery[] }>('/api/galleries').then((r) => setGalleries(r.galleries.filter((g) => g.showcase))).catch(() => undefined);
  }, []);

  const now = Date.now();
  const upcoming = useMemo(() => (events || []).filter((e) => e.endsAt > now), [events, now]);
  const past = useMemo(() => (events || []).filter((e) => e.endsAt <= now), [events, now]);
  const featured = useMemo(() => upcoming.filter((e) => e.featured), [upcoming]);

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    upcoming.forEach((e) => e.tags.forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t);
  }, [upcoming]);

  const filtered = useMemo(() => {
    let list = upcoming;
    if (tag) list = list.filter((e) => e.tags.includes(tag));
    if (dq.trim()) {
      const needle = dq.toLowerCase();
      list = list.filter((e) => [e.title, e.tagline, e.venue.city, ...e.tags].join(' ').toLowerCase().includes(needle));
    }
    return list;
  }, [upcoming, tag, dq]);

  const heroIds = useMemo(() => {
    const next = featured[0] || upcoming[0];
    const ids = [...(next?.coverIds || [])];
    galleries.forEach((g) => ids.push(...g.coverIds.slice(0, 1)));
    return ids.slice(0, 6);
  }, [featured, upcoming, galleries]);

  const heroEvent = featured[0] || upcoming[0];
  const listRef = useRevealAll('.reveal', [filtered, past]);

  return (
    <div className="page" ref={listRef}>
      {/* hero */}
      {events === null ? (
        <SkeletonBlock h={380} r={30} />
      ) : heroEvent ? (
        <div className="hero">
          <CoverCycler ids={heroIds} interval={5600} style={{ position: 'absolute', inset: 0 }} />
          <div className="hero-shade" />
          <div className="hero-body">
            <span className="pill-note">
              <IcSparkles size={13} /> Next up · {new Date(heroEvent.startsAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
            </span>
            <h1>{heroEvent.title}</h1>
            <p className="lead">{heroEvent.tagline || heroEvent.description.slice(0, 130)}</p>
            <div className="hero-cta">
              <Link to={`/events/${heroEvent.slug}`} className="btn primary lg">
                <IcZap size={17} /> Get tickets
              </Link>
              <Link to="/nearby" className="btn lg">Find events near you</Link>
            </div>
          </div>
        </div>
      ) : null}

      {/* featured rail */}
      {featured.length > 1 && (
        <>
          <SectionHead title="Featured" icon={<IcSparkles size={21} />} />
          <div className="rail">
            {featured.map((e, i) => (
              <EventCard key={e.id} event={e} className="reveal" style={{ ['--reveal-delay' as string]: `${i * 0.06}s` }} />
            ))}
          </div>
        </>
      )}

      {/* all events + filters */}
      <SectionHead
        title="All events"
        icon={<IcCalendar size={21} />}
        right={<span className="faint" style={{ fontSize: 13 }}>{filtered.length} upcoming</span>}
      />
      <div className="filter-bar">
        <div className="search-wrap">
          <IcSearch size={16} />
          <input className="input" placeholder="Search events, cities, vibes…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="chips">
          {tags.map((t) => (
            <button key={t} className={`chip${tag === t ? ' on' : ''}`} onClick={() => setTag(tag === t ? '' : t)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {events === null ? (
        <div className="event-grid">
          {[...Array(6)].map((_, i) => <SkeletonBlock key={i} h={300} r={22} />)}
        </div>
      ) : (
        <div className="event-grid">
          {filtered.map((e, i) => (
            <EventCard key={e.id} event={e} className="reveal" style={{ ['--reveal-delay' as string]: `${(i % 3) * 0.07}s` }} />
          ))}
          {!filtered.length && (
            <div className="empty" style={{ gridColumn: '1/-1' }}>
              <div className="big">🌒</div>
              <div style={{ fontWeight: 750, fontSize: 17, color: 'var(--text)' }}>Nothing matches</div>
              <div>Try a different search — or clear the tag filter.</div>
            </div>
          )}
        </div>
      )}

      {/* past events w/ galleries */}
      {past.length > 0 && (
        <>
          <SectionHead title="Past nights" moreTo="/galleries" moreLabel="Browse galleries" />
          <div className="event-grid">
            {past.map((e) => (
              <EventCard key={e.id} event={e} className="reveal" style={{ opacity: 0.9 }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
