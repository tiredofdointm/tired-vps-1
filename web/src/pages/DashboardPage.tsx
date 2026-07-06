import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { DashboardData, EventItem } from '../lib/types';
import { useApp } from '../lib/store';
import { useCountUp, useGeo } from '../lib/hooks';
import { dateShort, dateTime, km, money, time } from '../lib/format';
import {
  IcArrowRight, IcCalendar, IcCompass, IcCrown, IcEdit, IcExternal, IcImages, IcLock,
  IcMapPin, IcPlus, IcReceipt, IcSettings, IcSparkles, IcTicket, IcUser, IcZap,
} from '../lib/icons';
import { CoverCycler } from '../components/CoverCycler';
import { EventCard } from '../components/EventCard';
import { Avatar, Empty, Modal, ModalHead, SkeletonBlock } from '../components/ui';
import { TicketQR } from '../components/QR';

type Mode = 'client' | 'host';

export function DashboardPage() {
  const { user, ready } = useApp();
  const navigate = useNavigate();
  const { pos, ask, state } = useGeo();
  const [data, setData] = useState<DashboardData | null>(null);
  const [mode, setMode] = useState<Mode>(() => (localStorage.getItem('tired.dash.mode') as Mode) || 'client');

  useEffect(() => {
    if (ready && !user) navigate('/signin');
  }, [ready, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const qs = pos ? `?lat=${pos.lat}&lng=${pos.lng}` : '';
    api.get<DashboardData>(`/api/dashboard${qs}`).then(setData).catch(() => undefined);
  }, [user?.id, pos]);

  const isHost = !!user?.roles.includes('host');
  const effectiveMode: Mode = isHost && mode === 'host' ? 'host' : 'client';

  const switchMode = (m: Mode) => {
    setMode(m);
    localStorage.setItem('tired.dash.mode', m);
  };

  if (!user) return null;

  const bannerIds = user.bannerCoverIds.length
    ? user.bannerCoverIds
    : (data?.featured.flatMap((e) => e.coverIds.slice(0, 1)) || []);

  return (
    <div className="page">
      {/* profile banner — the dashboard IS your profile */}
      <div className="dash-banner">
        <CoverCycler ids={bannerIds} interval={5600} style={{ position: 'absolute', inset: 0 }} />
        <div className="shade" />
        <Link to="/covers" className="edit-banner btn sm glass" title="Change the photos cycling behind your profile">
          <IcImages size={14} /> Edit covers
        </Link>
        <div className="dash-profile">
          <Avatar name={user.name} imageId={user.avatarId} size={92} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
              <h1>{user.name}</h1>
              <span className="role-pill">Client</span>
              {isHost && <span className="role-pill">Host</span>}
            </div>
            <div className="handle">@{user.handle} {user.location?.city ? `· ${user.location.city}` : ''}</div>
            {user.bio && <p className="bio">{user.bio}</p>}
          </div>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            {isHost && <ModeSwitch mode={effectiveMode} onSwitch={switchMode} />}
            <Link to="/settings" className="icon-btn glass" style={{ width: 42, height: 42 }} title="Customize profile">
              <IcEdit size={17} />
            </Link>
          </div>
        </div>
      </div>

      {effectiveMode === 'client'
        ? <ClientDash data={data} askGeo={ask} geoState={state} />
        : <HostDash data={data} onRefresh={() => {
            const qs = pos ? `?lat=${pos.lat}&lng=${pos.lng}` : '';
            api.get<DashboardData>(`/api/dashboard${qs}`).then(setData).catch(() => undefined);
          }} />}
    </div>
  );
}

function ModeSwitch({ mode, onSwitch }: { mode: Mode; onSwitch: (m: Mode) => void }) {
  const clientRef = useRef<HTMLButtonElement | null>(null);
  const hostRef = useRef<HTMLButtonElement | null>(null);
  const [thumb, setThumb] = useState({ left: 4, width: 0 });

  useEffect(() => {
    const el = mode === 'client' ? clientRef.current : hostRef.current;
    if (el) setThumb({ left: el.offsetLeft, width: el.offsetWidth });
  }, [mode]);

  return (
    <div className="mode-switch glass" role="tablist" aria-label="Dashboard mode">
      <span className="thumb" style={{ left: thumb.left, width: thumb.width }} />
      <button ref={clientRef} className={mode === 'client' ? 'on' : ''} role="tab" aria-selected={mode === 'client'} onClick={() => onSwitch('client')}>
        <IcUser size={14} /> Client
      </button>
      <button ref={hostRef} className={mode === 'host' ? 'on' : ''} role="tab" aria-selected={mode === 'host'} onClick={() => onSwitch('host')}>
        <IcCrown size={14} /> Host
      </button>
    </div>
  );
}

/* ================= CLIENT ================= */
function ClientDash({ data, askGeo, geoState }: { data: DashboardData | null; askGeo: () => void; geoState: string }) {
  if (!data) {
    return (
      <>
        <div className="dash-grid">{[...Array(4)].map((_, i) => <SkeletonBlock key={i} h={92} />)}</div>
        <SkeletonBlock h={300} style={{ marginTop: 22 }} />
      </>
    );
  }
  const stats = [
    { k: 'Valid tickets', v: data.stats.tickets, hint: 'in your wallet', icon: <IcTicket size={15} /> },
    { k: 'Upcoming nights', v: data.stats.upcoming, hint: 'get some rest first', icon: <IcCalendar size={15} /> },
    { k: 'Orders', v: data.stats.orders, hint: 'all time', icon: <IcReceipt size={15} /> },
    { k: 'Unread', v: data.stats.unread, hint: 'notifications', icon: <IcSparkles size={15} /> },
  ];
  return (
    <>
      <div className="dash-grid">
        {stats.map((s, i) => <StatCard key={s.k} {...s} delay={i * 0.07} />)}
      </div>

      <div className="dash-cols">
        <div>
          <div className="spread" style={{ margin: '4px 0 14px' }}>
            <h2 style={{ fontSize: 21, fontWeight: 800, display: 'flex', gap: 10, alignItems: 'center' }}>
              <IcTicket size={20} /> Your next nights
            </h2>
            <Link className="more row" style={{ gap: 5, fontSize: 13.5, fontWeight: 650, color: 'var(--text-2)' }} to="/tickets">
              Wallet <IcArrowRight size={15} />
            </Link>
          </div>
          {data.upcoming.length === 0 ? (
            <Empty emoji="🌙" title="Nothing booked" sub="The nearby list has ideas." cta={<Link to="/events" className="btn primary">Browse events</Link>} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.upcoming.map((t) => t.event && (
                <Link key={t.id} to={`/events/${t.event.slug}`} className="card event-row hover-lift" style={{ padding: 13 }}>
                  <CoverCycler ids={t.event.coverIds} interval={4800} width={480} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="er-title">{t.event.title}</div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {dateTime(t.event.startsAt)}
                    </div>
                    <div className="muted row" style={{ fontSize: 12.5, gap: 5, marginTop: 3 }}>
                      {t.event.venue.announced
                        ? <><IcMapPin size={12} /> {t.event.venuePublic.name} · {t.event.venue.city}</>
                        : <><IcLock size={12} style={{ color: 'var(--warn)' }} /> <span style={{ color: 'var(--warn)' }}>Location reveals closer to doors</span></>}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    <TicketQR code={t.code} size={56} />
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="spread" style={{ margin: '30px 0 14px' }}>
            <h2 style={{ fontSize: 21, fontWeight: 800, display: 'flex', gap: 10, alignItems: 'center' }}>
              <IcSparkles size={20} /> Featured
            </h2>
          </div>
          <div className="rail">
            {data.featured.map((e) => <EventCard key={e.id} event={e} />)}
          </div>
        </div>

        <div>
          <div className="card" style={{ padding: 20 }}>
            <div className="spread" style={{ marginBottom: 6 }}>
              <h3 style={{ fontSize: 17, display: 'flex', gap: 9, alignItems: 'center' }}><IcCompass size={17} /> Near you</h3>
              <button className="btn ghost sm" onClick={askGeo}>{geoState === 'ok' ? 'Located' : 'Locate me'}</button>
            </div>
            {data.nearby.map((e) => <MiniEvent key={e.id} event={e} />)}
            {!data.nearby.length && <p className="muted" style={{ fontSize: 13.5, padding: '10px 0' }}>Nothing close — widen your world on the Nearby page.</p>}
            <Link to="/nearby" className="btn" style={{ width: '100%', marginTop: 10 }}>
              Open nearby view
            </Link>
          </div>

          <div className="card" style={{ padding: 20, marginTop: 16 }}>
            <h3 style={{ fontSize: 17, marginBottom: 12, display: 'flex', gap: 9, alignItems: 'center' }}><IcUser size={17} /> Make it yours</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link to="/settings" className="menu-item" style={{ border: '1px solid var(--stroke)' }}>
                <IcSettings size={16} /> Customize profile <span className="mi-badge">name · bio · accent</span>
              </Link>
              <Link to="/covers" className="menu-item" style={{ border: '1px solid var(--stroke)' }}>
                <IcImages size={16} /> Cover rotation
              </Link>
              <Link to="/galleries" className="menu-item" style={{ border: '1px solid var(--stroke)' }}>
                <IcImages size={16} /> Your photo library
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ================= HOST ================= */
function HostDash({ data, onRefresh }: { data: DashboardData | null; onRefresh: () => void }) {
  const [createOpen, setCreateOpen] = useState(false);
  const host = data?.host;
  if (!data || !host) {
    return <SkeletonBlock h={420} style={{ marginTop: 22 }} />;
  }
  const days = lastNDays(14);
  const maxDay = Math.max(1, ...days.map((d) => host.salesByDay[d] || 0));

  return (
    <>
      <div className="dash-grid">
        <StatCard k="Revenue" v={host.revenue} money hint="ticket sales, all time" icon={<IcZap size={15} />} delay={0} />
        <StatCard k="Tickets sold" v={host.ticketsSold} hint="across your events" icon={<IcTicket size={15} />} delay={0.07} />
        <StatCard k="Events" v={host.events.length} hint={`${host.events.filter((e) => e.endsAt > Date.now()).length} upcoming`} icon={<IcCalendar size={15} />} delay={0.14} />
        <StatCard k="Services" v={host.services.length} hint="listed on the market" icon={<IcSparkles size={15} />} delay={0.21} />
      </div>

      <div className="dash-cols">
        <div>
          <div className="card" style={{ padding: 20 }}>
            <div className="spread">
              <h3 style={{ fontSize: 17 }}>Sales — last 14 days</h3>
              <span className="faint" style={{ fontSize: 12.5 }}>hover a bar for the day</span>
            </div>
            <div className="spark">
              {days.map((d, i) => (
                <i
                  key={d}
                  style={{ height: `${Math.max(4, ((host.salesByDay[d] || 0) / maxDay) * 100)}%`, animationDelay: `${i * 0.04}s` }}
                  title={`${d} — ${money(host.salesByDay[d] || 0)}`}
                />
              ))}
            </div>
          </div>

          <div className="spread" style={{ margin: '26px 0 14px' }}>
            <h2 style={{ fontSize: 21, fontWeight: 800 }}>Your events</h2>
            <button className="btn primary" onClick={() => setCreateOpen(true)}>
              <IcPlus size={15} /> New event
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {host.events.map((e) => <HostEventRow key={e.id} event={e} onChanged={onRefresh} />)}
            {!host.events.length && <Empty emoji="🎛️" title="No events yet" sub="Spin up your first night." cta={<button className="btn primary" onClick={() => setCreateOpen(true)}>Create event</button>} />}
          </div>
        </div>

        <div>
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 17, marginBottom: 10 }}>Recent orders</h3>
            {host.recentOrders.map((o) => (
              <div key={o.id} className="spread" style={{ padding: '9px 0', borderBottom: '1px solid var(--stroke)', fontSize: 13.5 }}>
                <span className="mono faint">#{o.id.replace('ord_', '').slice(0, 6).toUpperCase()}</span>
                <span className="muted" style={{ flex: 1, marginLeft: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {o.items.map((i) => `${i.qty}× ${i.title}`).join(', ')}
                </span>
                <strong>{money(o.total)}</strong>
              </div>
            ))}
            {!host.recentOrders.length && <p className="muted" style={{ fontSize: 13.5 }}>No orders yet.</p>}
          </div>

          <div className="card" style={{ padding: 20, marginTop: 16 }}>
            <div className="spread" style={{ marginBottom: 10 }}>
              <h3 style={{ fontSize: 17 }}>Your services</h3>
              <Link to="/services" className="btn ghost sm"><IcExternal size={13} /> Market</Link>
            </div>
            {host.services.map((s) => (
              <div key={s.id} className="spread" style={{ padding: '8px 0', fontSize: 14 }}>
                <span style={{ fontWeight: 650 }}>{s.title}</span>
                <span className="muted">{money(s.priceFrom)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <CreateEventModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={onRefresh} />
    </>
  );
}

function HostEventRow({ event, onChanged }: { event: EventItem; onChanged: () => void }) {
  const { toast } = useApp();
  const pct = event.capacity ? Math.min(100, Math.round((event.ticketsSold / event.capacity) * 100)) : 0;
  const [busy, setBusy] = useState(false);
  const toggleVenue = async () => {
    setBusy(true);
    try {
      await api.patch(`/api/host/events/${event.id}`, { venue: { ...event.venue, announced: !event.venue.announced } });
      toast(event.venue.announced ? 'Venue hidden — back to secret' : 'Venue announced to everyone', 'ok');
      onChanged();
    } catch {
      toast('Update failed', 'err');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="card event-row" style={{ padding: 13, cursor: 'default' }}>
      <CoverCycler ids={event.coverIds} interval={5000} width={480} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="row" style={{ gap: 8 }}>
          <Link to={`/events/${event.slug}`} className="er-title">{event.title}</Link>
          <span className="chip static" style={{ fontSize: 11 }}>{event.status}</span>
        </div>
        <div className="muted" style={{ fontSize: 12.5 }}>{dateShort(event.startsAt)} · {time(event.startsAt)} · {event.venue.city}</div>
        <div style={{ marginTop: 7, maxWidth: 320 }}>
          <div className="sold-bar"><i style={{ width: `${pct}%` }} /></div>
          <div className="faint" style={{ fontSize: 11.5, marginTop: 3 }}>{event.ticketsSold}/{event.capacity} sold · {money(event.ticketsSold * event.priceFrom)}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flexShrink: 0 }}>
        <button className="btn sm" onClick={toggleVenue} disabled={busy} title="Secret drops keep the address hidden until you announce it">
          {event.venue.announced ? <><IcMapPin size={13} /> Announced</> : <><IcLock size={13} /> Secret</>}
        </button>
        {event.galleryId && (
          <Link to={`/galleries/${event.galleryId}`} className="btn ghost sm">
            <IcImages size={13} /> Gallery
          </Link>
        )}
      </div>
    </div>
  );
}

function CreateEventModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { toast } = useApp();
  const [f, setF] = useState({ title: '', tagline: '', date: '', time: '21:00', price: '30', capacity: '300', city: '', venueName: '', announced: true });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string | boolean) => setF((s) => ({ ...s, [k]: v }));

  const submit = async () => {
    if (!f.title.trim() || !f.date) return toast('Title and date are required', 'err');
    setBusy(true);
    try {
      const startsAt = new Date(`${f.date}T${f.time || '21:00'}`).getTime();
      await api.post('/api/host/events', {
        title: f.title, tagline: f.tagline, startsAt, endsAt: startsAt + 6 * 36e5,
        priceFrom: parseFloat(f.price) || 0, capacity: parseInt(f.capacity, 10) || 200,
        venue: { name: f.venueName || 'TBA', address: '', city: f.city || 'Brooklyn, NY', lat: 40.7128, lng: -74.006, announced: f.announced },
        status: 'published',
      });
      toast('Event published', 'ok');
      onCreated();
      onClose();
      setF({ title: '', tagline: '', date: '', time: '21:00', price: '30', capacity: '300', city: '', venueName: '', announced: true });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Create failed', 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <ModalHead title="New event" sub="Publish a night — you can refine details after." onClose={onClose} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
        <div className="field" style={{ gridColumn: '1/-1' }}>
          <label>Title</label>
          <input className="input" value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Warehouse Frequencies vol. 2" />
        </div>
        <div className="field" style={{ gridColumn: '1/-1' }}>
          <label>Tagline</label>
          <input className="input" value={f.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="One line that sells the night" />
        </div>
        <div className="field">
          <label>Date</label>
          <input className="input" type="date" value={f.date} onChange={(e) => set('date', e.target.value)} />
        </div>
        <div className="field">
          <label>Doors</label>
          <input className="input" type="time" value={f.time} onChange={(e) => set('time', e.target.value)} />
        </div>
        <div className="field">
          <label>Price ($)</label>
          <input className="input" type="number" min="0" value={f.price} onChange={(e) => set('price', e.target.value)} />
        </div>
        <div className="field">
          <label>Capacity</label>
          <input className="input" type="number" min="10" value={f.capacity} onChange={(e) => set('capacity', e.target.value)} />
        </div>
        <div className="field">
          <label>City</label>
          <input className="input" value={f.city} onChange={(e) => set('city', e.target.value)} placeholder="Brooklyn, NY" />
        </div>
        <div className="field">
          <label>Venue</label>
          <input className="input" value={f.venueName} onChange={(e) => set('venueName', e.target.value)} placeholder="TBA" />
        </div>
      </div>
      <label className="spread" style={{ cursor: 'pointer', marginTop: 14 }}>
        <span>
          <div style={{ fontWeight: 650 }}>Announce venue now</div>
          <div className="faint" style={{ fontSize: 12.5 }}>Off = secret drop; reveal it later from the dashboard</div>
        </span>
        <input type="checkbox" checked={f.announced} onChange={(e) => set('announced', e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--accent)' }} />
      </label>
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 18 }}>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={submit} disabled={busy}>
          {busy ? <span className="spin" /> : <><IcZap size={15} /> Publish</>}
        </button>
      </div>
    </Modal>
  );
}

/* ================= shared bits ================= */
function StatCard({ k, v, hint, icon, delay = 0, money: isMoney }: { k: string; v: number; hint: string; icon: React.ReactNode; delay?: number; money?: boolean }) {
  const n = useCountUp(v);
  return (
    <div className="card stat-card hover-lift" style={{ animation: `fadeUp 0.6s var(--ease-out) ${delay}s backwards` }}>
      <span className="k row" style={{ gap: 6 }}>{icon} {k}</span>
      <span className="v grad-text">{isMoney ? money(n) : n.toLocaleString()}</span>
      <span className="hint">{hint}</span>
    </div>
  );
}

function MiniEvent({ event }: { event: EventItem }) {
  return (
    <Link to={`/events/${event.slug}`} className="mini-event">
      <CoverCycler ids={event.coverIds.slice(0, 2)} interval={5000} width={240} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="t" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</div>
        <div className="s">{dateShort(event.startsAt)} · {event.venue.city}</div>
      </div>
      {event.distanceKm != null && (
        <span style={{ color: 'var(--accent)', fontWeight: 750, fontSize: 13, flexShrink: 0 }}>{km(event.distanceKm)}</span>
      )}
    </Link>
  );
}

function lastNDays(n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    out.push(new Date(Date.now() - i * 864e5).toISOString().slice(0, 10));
  }
  return out;
}
