import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { EventItem, Gallery, Photo } from '../lib/types';
import { useApp } from '../lib/store';
import { dateTime, money, untilParts } from '../lib/format';
import {
  IcArrowRight, IcCalendar, IcCart, IcImages, IcLock, IcMapPin, IcTicket, IcUser, IcZap,
} from '../lib/icons';
import { CoverCycler } from '../components/CoverCycler';
import { Empty, SkeletonBlock } from '../components/ui';
import { VirtualGrid } from '../components/gallery/VirtualGrid';
import { Lightbox } from '../components/gallery/Lightbox';

export function EventDetailPage() {
  const { slug } = useParams();
  const { addToCart } = useApp();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [missing, setMissing] = useState(false);
  const [qty, setQty] = useState(1);
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    setEvent(null);
    setGallery(null);
    setPhotos([]);
    api.get<{ event: EventItem; gallery: Gallery | null }>(`/api/events/${slug}`)
      .then((r) => {
        setEvent(r.event);
        setGallery(r.gallery);
        if (r.gallery) {
          api.get<{ photos: Photo[] }>(`/api/galleries/${r.gallery.id}`).then((g) => setPhotos(g.photos)).catch(() => undefined);
        }
      })
      .catch(() => setMissing(true));
  }, [slug]);

  if (missing) {
    return (
      <div className="page">
        <Empty emoji="🌫️" title="Event not found" cta={<Link className="btn primary" to="/events">All events</Link>} />
      </div>
    );
  }
  if (!event) {
    return (
      <div className="page">
        <SkeletonBlock h={420} r={30} />
        <div style={{ height: 22 }} />
        <SkeletonBlock h={300} />
      </div>
    );
  }

  const upcoming = event.endsAt > Date.now();
  const pct = event.capacity ? Math.min(100, Math.round((event.ticketsSold / event.capacity) * 100)) : 0;
  const secret = !event.venue.announced;

  return (
    <div className="page">
      <div className="detail-hero">
        <CoverCycler ids={event.coverIds} interval={5200} dots style={{ position: 'absolute', inset: 0 }} />
        <div className="hero-shade" />
        <div className="hero-body" style={{ maxWidth: 820 }}>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {event.tags.map((t) => <span key={t} className="chip static">{t}</span>)}
            {!upcoming && <span className="chip static" style={{ color: 'var(--warn)' }}>Past event</span>}
          </div>
          <h1>{event.title}</h1>
          <p className="lead">{event.tagline}</p>
          <div className="row" style={{ gap: 18, marginTop: 16, flexWrap: 'wrap', fontSize: 14.5 }}>
            <span className="row" style={{ gap: 7 }}><IcCalendar size={16} /> {dateTime(event.startsAt)}</span>
            <span className="row" style={{ gap: 7 }}>
              {secret ? <IcLock size={16} style={{ color: 'var(--warn)' }} /> : <IcMapPin size={16} />}
              {event.venuePublic.name} · {event.venue.city}
            </span>
            <span className="row" style={{ gap: 7 }}><IcUser size={16} /> {event.hostName}</span>
          </div>
        </div>
      </div>

      <div className="detail-grid">
        <div>
          {upcoming && <Countdown at={event.startsAt} />}
          <div className="card" style={{ padding: '24px 26px', marginTop: 18 }}>
            <h2 style={{ fontSize: 20, marginBottom: 12 }}>About this night</h2>
            {event.description.split('\n\n').map((p, i) => (
              <p key={i} className="muted" style={{ marginBottom: 12, lineHeight: 1.7 }}>{p}</p>
            ))}
          </div>

          <div className={`venue-box${secret ? ' secret' : ''}`} style={{ marginTop: 18 }}>
            <div className="vb-ic">{secret ? <IcLock size={19} /> : <IcMapPin size={19} />}</div>
            <div>
              <div style={{ fontWeight: 750 }}>{event.venuePublic.name}</div>
              <div className="muted" style={{ fontSize: 13.5 }}>
                {secret
                  ? `The exact address drops to ticket holders before doors. City: ${event.venue.city}.`
                  : `${event.venuePublic.address} · ${event.venue.city}`}
              </div>
            </div>
          </div>

          {gallery && photos.length > 0 && (
            <>
              <div className="spread" style={{ margin: '30px 0 14px' }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, display: 'flex', gap: 10, alignItems: 'center' }}>
                  <IcImages size={20} /> {gallery.name}
                </h2>
                <Link to={`/galleries/${gallery.id}`} className="more row" style={{ gap: 5, fontSize: 13.5, fontWeight: 650, color: 'var(--text-2)' }}>
                  Open gallery <IcArrowRight size={15} />
                </Link>
              </div>
              <VirtualGrid photos={photos.slice(0, 12)} onOpen={(i) => setLightbox(i)} targetRowHeight={170} />
            </>
          )}
        </div>

        <aside className="card buy-box glass">
          <div className="spread">
            <div className="price">
              {money(event.priceFrom)} <small>/ ticket</small>
            </div>
            <span className="chip static">{event.going} going</span>
          </div>
          {pct > 0 && (
            <div>
              <div className="sold-bar"><i style={{ width: `${pct}%` }} /></div>
              <div className="faint" style={{ fontSize: 12, marginTop: 5 }}>
                {event.ticketsSold} of {event.capacity} sold{pct >= 85 ? ' — nearly gone' : ''}
              </div>
            </div>
          )}
          {upcoming ? (
            <>
              <div className="spread">
                <span className="muted" style={{ fontSize: 14 }}>Quantity</span>
                <div className="qty-step">
                  <button onClick={() => setQty((v) => Math.max(1, v - 1))} aria-label="Fewer">−</button>
                  <span>{qty}</span>
                  <button onClick={() => setQty((v) => Math.min(10, v + 1))} aria-label="More">+</button>
                </div>
              </div>
              <button
                className="btn primary lg"
                style={{ width: '100%' }}
                onClick={() => addToCart({ kind: 'ticket', refId: event.id, title: event.title, unitPrice: event.priceFrom, coverId: event.coverIds[0] || null }, qty)}
              >
                <IcCart size={17} /> Add to cart — {money(event.priceFrom * qty)}
              </button>
              <div className="faint" style={{ fontSize: 12, textAlign: 'center' }}>
                {secret ? 'Address is sent to ticket holders before doors.' : 'E-ticket lands in your wallet instantly.'}
              </div>
            </>
          ) : (
            <div className="empty" style={{ padding: 22 }}>
              <IcTicket size={22} />
              <div style={{ fontWeight: 700, color: 'var(--text)' }}>Sales closed</div>
              <div style={{ fontSize: 13 }}>This night already happened{gallery ? ' — the gallery is live above.' : '.'}</div>
            </div>
          )}
        </aside>
      </div>

      {lightbox !== null && (
        <Lightbox photos={photos.slice(0, 12)} index={lightbox} onClose={() => setLightbox(null)} onIndex={setLightbox} />
      )}
    </div>
  );
}

function Countdown({ at }: { at: number }) {
  const [parts, setParts] = useState(() => untilParts(at));
  useEffect(() => {
    const t = setInterval(() => setParts(untilParts(at)), 1000);
    return () => clearInterval(t);
  }, [at]);
  const cells = [
    { n: parts.days, l: 'days' },
    { n: parts.hours, l: 'hours' },
    { n: parts.mins, l: 'mins' },
    { n: parts.secs, l: 'secs' },
  ];
  return (
    <div className="countdown" role="timer" aria-label="Time until doors">
      {cells.map((c) => (
        <div key={c.l} className="count-cell glass">
          <div className="n grad-text">{String(c.n).padStart(2, '0')}</div>
          <div className="l">{c.l}</div>
        </div>
      ))}
      <div className="count-cell glass" style={{ flex: 1.6, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="l" style={{ color: 'var(--accent)' }}><IcZap size={11} /> until doors</div>
      </div>
    </div>
  );
}
