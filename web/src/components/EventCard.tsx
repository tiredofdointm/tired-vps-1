import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { EventItem } from '../lib/types';
import { dateShort, km, money } from '../lib/format';
import { IcLock, IcMapPin, IcZap } from '../lib/icons';
import { CoverCycler } from './CoverCycler';

export function EventCard({ event, style, className = '' }: { event: EventItem; style?: React.CSSProperties; className?: string }) {
  const [hover, setHover] = useState(false);
  const d = new Date(event.startsAt);
  const pct = event.capacity ? Math.min(100, Math.round((event.ticketsSold / event.capacity) * 100)) : 0;
  const secret = !event.venue.announced;

  return (
    <Link
      to={`/events/${event.slug}`}
      className={`card event-card hover-lift ${className}`}
      style={style}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      <div className="ec-media">
        <CoverCycler ids={event.coverIds} paused={!hover} interval={1600} kenburns={false} width={720} alt={event.title} />
        <div className="ec-date">
          <span className="m">{d.toLocaleDateString(undefined, { month: 'short' })}</span>
          <span className="d">{d.getDate()}</span>
        </div>
        <span className="ec-price chip static" style={{ background: 'rgba(8,6,14,0.7)', backdropFilter: 'blur(8px)' }}>
          {event.priceFrom === 0 ? 'Free' : `from ${money(event.priceFrom)}`}
        </span>
      </div>
      <div className="ec-body">
        <div className="ec-title">{event.title}</div>
        {event.tagline && <div className="ec-tagline">{event.tagline}</div>}
        <div className="ec-meta">
          {secret ? (
            <span className="row" style={{ gap: 5, color: 'var(--warn)' }}>
              <IcLock size={13} /> Secret location · {event.venue.city}
            </span>
          ) : (
            <span className="row" style={{ gap: 5 }}>
              <IcMapPin size={13} /> {event.venuePublic.name} · {event.venue.city}
            </span>
          )}
          {event.distanceKm != null && (
            <span className="row" style={{ gap: 4, color: 'var(--accent)' }}>
              <IcZap size={12} /> {km(event.distanceKm)}
            </span>
          )}
          <span className="going-dots" title={`${event.going} going`}>
            <i /><i /><i />
            <span style={{ marginLeft: 6 }}>{event.going} going</span>
          </span>
        </div>
        {pct >= 55 && (
          <div title={`${pct}% sold`} style={{ marginTop: 6 }}>
            <div className="sold-bar"><i style={{ width: `${pct}%` }} /></div>
            <div className="faint" style={{ fontSize: 11, marginTop: 4 }}>
              {pct >= 90 ? 'Nearly gone' : `${pct}% sold`} · {dateShort(event.startsAt)}
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
