import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { Ticket } from '../lib/types';
import { useApp } from '../lib/store';
import { dateTime } from '../lib/format';
import { IcCalendar, IcLock, IcMapPin, IcTicket } from '../lib/icons';
import { CoverCycler } from '../components/CoverCycler';
import { Empty, SkeletonBlock } from '../components/ui';
import { TicketQR } from '../components/QR';

export function TicketsPage() {
  const { user, ready } = useApp();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[] | null>(null);

  useEffect(() => {
    if (ready && !user) navigate('/signin');
  }, [ready, user, navigate]);

  useEffect(() => {
    if (user) api.get<{ tickets: Ticket[] }>('/api/tickets').then((r) => setTickets(r.tickets)).catch(() => setTickets([]));
  }, [user?.id]);

  const now = Date.now();
  const upcoming = useMemo(() => (tickets || []).filter((t) => (t.event?.endsAt || 0) > now), [tickets, now]);
  const past = useMemo(() => (tickets || []).filter((t) => (t.event?.endsAt || 0) <= now), [tickets, now]);

  if (!user) return null;

  return (
    <div className="page" style={{ maxWidth: 980 }}>
      <span className="pill-note"><IcTicket size={13} /> Your wallet</span>
      <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, marginTop: 10 }}>My tickets</h1>
      <p className="muted" style={{ marginTop: 6 }}>Show the code at the door. Secret venues unlock closer to the night.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 26 }}>
        {tickets === null && <><SkeletonBlock h={150} r={22} /><SkeletonBlock h={150} r={22} /></>}
        {tickets !== null && !tickets.length && (
          <Empty
            emoji="🎟️"
            title="No tickets yet"
            sub="Your next night out is one click away."
            cta={<Link to="/events" className="btn primary">Browse events</Link>}
          />
        )}
        {upcoming.map((t) => <TicketCard key={t.id} ticket={t} />)}
        {past.length > 0 && (
          <>
            <h2 style={{ fontSize: 19, fontWeight: 800, marginTop: 18, color: 'var(--text-2)' }}>Past</h2>
            {past.map((t) => <TicketCard key={t.id} ticket={t} past />)}
          </>
        )}
      </div>
    </div>
  );
}

function TicketCard({ ticket, past }: { ticket: Ticket; past?: boolean }) {
  const e = ticket.event;
  if (!e) return null;
  const secret = !e.venue.announced;
  return (
    <div className={`ticket hover-lift card${past ? ' past' : ''}`} style={{ borderRadius: 22 }}>
      <div className="tk-media">
        <CoverCycler ids={e.coverIds} interval={4600} width={480} />
      </div>
      <div className="tk-body">
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <span className="chip static">{ticket.type}</span>
          <span className={`chip static`} style={{ color: ticket.status === 'valid' ? 'var(--good)' : 'var(--text-3)' }}>
            {ticket.status === 'valid' ? '● Valid' : ticket.status === 'used' ? 'Used' : 'Refunded'}
          </span>
        </div>
        <Link to={`/events/${e.slug}`} style={{ fontWeight: 850, fontSize: 20, marginTop: 4 }} className="er-title">
          {e.title}
        </Link>
        <div className="muted row" style={{ gap: 7, fontSize: 13.5 }}>
          <IcCalendar size={14} /> {dateTime(e.startsAt)}
        </div>
        <div className="muted row" style={{ gap: 7, fontSize: 13.5 }}>
          {secret ? (
            <>
              <IcLock size={14} style={{ color: 'var(--warn)' }} />
              <span style={{ color: 'var(--warn)' }}>Secret — address drops before doors ({e.venue.city})</span>
            </>
          ) : (
            <>
              <IcMapPin size={14} /> {e.venuePublic.name}, {e.venuePublic.address} · {e.venue.city}
            </>
          )}
        </div>
      </div>
      <div className="tk-stub">
        <TicketQR code={ticket.code} />
        <span className="code">{ticket.code}</span>
      </div>
    </div>
  );
}
