import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { EventItem } from '../lib/types';
import { useGeo } from '../lib/hooks';
import { dateShort, km, money } from '../lib/format';
import { IcCompass, IcMapPin, IcZap } from '../lib/icons';
import { CoverCycler } from '../components/CoverCycler';
import { Empty, SkeletonBlock } from '../components/ui';

/** Distance-sorted events with a stylised sonar view — no map tiles needed. */
export function NearbyPage() {
  const { pos, state, ask } = useGeo();
  const navigate = useNavigate();
  const [data, setData] = useState<{ origin: { lat: number; lng: number }; events: EventItem[] } | null>(null);
  const [radius, setRadius] = useState(200);
  const [hoverId, setHoverId] = useState<string | null>(null);

  useEffect(() => {
    const qs = pos ? `?lat=${pos.lat}&lng=${pos.lng}&radiusKm=${radius}` : `?radiusKm=${radius}`;
    api.get<{ origin: { lat: number; lng: number }; events: EventItem[] }>(`/api/events/nearby${qs}`)
      .then(setData)
      .catch(() => setData({ origin: { lat: 40.7128, lng: -74.006 }, events: [] }));
  }, [pos, radius]);

  const upcoming = useMemo(() => (data?.events || []).filter((e) => e.endsAt > Date.now()), [data]);
  const maxDist = Math.max(10, ...upcoming.map((e) => e.distanceKm || 0));

  return (
    <div className="page">
      <span className="pill-note"><IcCompass size={13} /> Around you</span>
      <div className="spread" style={{ flexWrap: 'wrap', gap: 14, marginTop: 10 }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900 }}>Nearby</h1>
        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <label className="row" style={{ gap: 10, fontSize: 13.5, color: 'var(--text-2)' }}>
            Radius
            <input
              type="range" min={25} max={500} step={25} value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value, 10))}
              style={{ accentColor: 'var(--accent)', width: 140 }}
            />
            <strong style={{ color: 'var(--text)', minWidth: 58 }}>{radius} km</strong>
          </label>
          <button className="btn" onClick={ask} disabled={state === 'asking'}>
            <IcMapPin size={15} />
            {state === 'ok' ? 'Location on' : state === 'asking' ? 'Locating…' : state === 'denied' ? 'Using default city' : 'Use my location'}
          </button>
        </div>
      </div>
      <p className="muted" style={{ marginTop: 6, maxWidth: 560 }}>
        {state === 'ok'
          ? 'Sorted by distance from your position.'
          : 'Showing distances from New York — allow location for your real radius.'}
      </p>

      <div className="nearby-layout" style={{ marginTop: 26 }}>
        <div className="card" style={{ padding: 22 }}>
          <Radar events={upcoming} maxDist={maxDist} hoverId={hoverId} onHover={setHoverId} onOpen={(e) => navigate(`/events/${e.slug}`)} />
          <div className="faint" style={{ textAlign: 'center', fontSize: 12, marginTop: 12 }}>
            Sonar view — every blip is a night out. Hover to identify, click to open.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data === null && <><SkeletonBlock h={110} /><SkeletonBlock h={110} /><SkeletonBlock h={110} /></>}
          {data !== null && !upcoming.length && (
            <Empty emoji="📡" title="No events in range" sub="Widen the radius — the underground is out there somewhere." />
          )}
          {upcoming.map((e) => (
            <div
              key={e.id}
              className={`card event-row hover-lift${hoverId === e.id ? ' selected' : ''}`}
              style={hoverId === e.id ? { borderColor: 'var(--accent)' } : undefined}
              onPointerEnter={() => setHoverId(e.id)}
              onPointerLeave={() => setHoverId(null)}
              onClick={() => navigate(`/events/${e.slug}`)}
            >
              <CoverCycler ids={e.coverIds} paused={hoverId !== e.id} interval={1500} kenburns={false} width={480} />
              <div style={{ minWidth: 0 }}>
                <div className="er-title">{e.title}</div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {dateShort(e.startsAt)} · {e.venue.announced ? e.venuePublic.name : 'Secret location'} · {e.venue.city}
                </div>
                <div className="row" style={{ gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                  <span className="chip static">{money(e.priceFrom)}</span>
                  {e.tags.slice(0, 2).map((t) => <span key={t} className="chip static">{t}</span>)}
                </div>
              </div>
              <div className="dist">
                <div className="km">{km(e.distanceKm || 0)}</div>
                <div className="faint" style={{ fontSize: 11.5 }}>away</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Radar({ events, maxDist, hoverId, onHover, onOpen }: {
  events: EventItem[]; maxDist: number; hoverId: string | null;
  onHover: (id: string | null) => void; onOpen: (e: EventItem) => void;
}) {
  return (
    <div className="radar">
      <div className="sweep" />
      {[0.33, 0.66, 1].map((r) => (
        <div key={r} className="ring" style={{ inset: `${(1 - r) * 50}%` }} />
      ))}
      <div className="me" title="You are here" />
      {events.map((e, i) => {
        // angle from bearing-ish hash for stable placement, radius from distance
        const angle = ((i * 137.5) % 360) * (Math.PI / 180);
        const r = Math.min(0.92, Math.sqrt((e.distanceKm || 1) / maxDist) * 0.9) * 50;
        const x = 50 + Math.cos(angle) * r;
        const y = 50 + Math.sin(angle) * r;
        const active = hoverId === e.id;
        return (
          <button
            key={e.id}
            className="blip"
            style={{
              left: `${x}%`, top: `${y}%`,
              background: active ? 'var(--accent-2)' : undefined,
              width: active ? 15 : undefined, height: active ? 15 : undefined,
            }}
            title={`${e.title} — ${km(e.distanceKm || 0)}`}
            onPointerEnter={() => onHover(e.id)}
            onPointerLeave={() => onHover(null)}
            onClick={() => onOpen(e)}
            aria-label={`${e.title}, ${km(e.distanceKm || 0)} away`}
          />
        );
      })}
      {hoverId && (
        <div
          style={{
            position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
            padding: '6px 14px', borderRadius: 99, fontSize: 12.5, fontWeight: 700,
            background: 'rgba(10,8,16,0.85)', border: '1px solid var(--stroke-2)', whiteSpace: 'nowrap', zIndex: 5,
            animation: 'popIn 0.2s var(--ease-spring)',
          }}
        >
          <IcZap size={11} style={{ color: 'var(--accent)' }} /> {events.find((e) => e.id === hoverId)?.title}
        </div>
      )}
    </div>
  );
}
