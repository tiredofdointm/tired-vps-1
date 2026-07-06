import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import type { Service } from '../lib/types';
import { useApp } from '../lib/store';
import { useRevealAll } from '../lib/hooks';
import { money } from '../lib/format';
import { IcCart, IcSparkles, IcStar } from '../lib/icons';
import { CoverCycler } from '../components/CoverCycler';
import { SkeletonBlock } from '../components/ui';

export function ServicesPage() {
  const { addToCart } = useApp();
  const [services, setServices] = useState<Service[] | null>(null);
  const [cat, setCat] = useState('');

  useEffect(() => {
    api.get<{ services: Service[] }>('/api/services').then((r) => setServices(r.services)).catch(() => setServices([]));
  }, []);

  const cats = useMemo(() => [...new Set((services || []).map((s) => s.category))], [services]);
  const filtered = useMemo(() => (services || []).filter((s) => !cat || s.category === cat), [services, cat]);
  const ref = useRevealAll('.reveal', [filtered]);

  return (
    <div className="page" ref={ref}>
      <span className="pill-note"><IcSparkles size={13} /> For hosts & planners</span>
      <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, marginTop: 10 }}>Services</h1>
      <p className="muted" style={{ marginTop: 6, maxWidth: 620 }}>
        The crew behind TIRED nights — book them for yours. Photography, sound, lights, door.
      </p>

      <div className="filter-bar">
        <div className="chips">
          <button className={`chip${cat === '' ? ' on' : ''}`} onClick={() => setCat('')}>All</button>
          {cats.map((c) => (
            <button key={c} className={`chip${cat === c ? ' on' : ''}`} onClick={() => setCat(cat === c ? '' : c)}>{c}</button>
          ))}
        </div>
      </div>

      {services === null ? (
        <div className="svc-grid">{[...Array(4)].map((_, i) => <SkeletonBlock key={i} h={300} r={22} />)}</div>
      ) : (
        <div className="svc-grid">
          {filtered.map((s, i) => (
            <div key={s.id} className="card svc-card hover-lift reveal" style={{ ['--reveal-delay' as string]: `${(i % 3) * 0.07}s` }}>
              <CoverCycler ids={s.coverIds} interval={4200} width={720} />
              <div className="s-body">
                <div className="spread">
                  <span className="chip static">{s.category}</span>
                  <span className="rating"><IcStar size={13} style={{ fill: 'currentColor' }} /> {s.rating.toFixed(1)}</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>{s.title}</div>
                <p className="muted" style={{ fontSize: 13.5, flex: 1 }}>{s.description}</p>
                <div className="spread" style={{ marginTop: 8 }}>
                  <div>
                    <div className="faint" style={{ fontSize: 11.5 }}>from</div>
                    <div style={{ fontWeight: 850, fontSize: 20 }}>{money(s.priceFrom)}</div>
                  </div>
                  <button
                    className="btn primary"
                    onClick={() => addToCart({ kind: 'service', refId: s.id, title: s.title, unitPrice: s.priceFrom, coverId: s.coverIds[0] || null })}
                  >
                    <IcCart size={15} /> Book
                  </button>
                </div>
                <div className="faint" style={{ fontSize: 12 }}>by {s.providerName}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
