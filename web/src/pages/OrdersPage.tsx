import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { Order } from '../lib/types';
import { useApp } from '../lib/store';
import { dateTime, money } from '../lib/format';
import { IcReceipt } from '../lib/icons';
import { Empty, SkeletonBlock } from '../components/ui';

export function OrdersPage() {
  const { user, ready } = useApp();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    if (ready && !user) navigate('/signin');
  }, [ready, user, navigate]);

  useEffect(() => {
    if (user) api.get<{ orders: Order[] }>('/api/orders').then((r) => setOrders(r.orders)).catch(() => setOrders([]));
  }, [user?.id]);

  if (!user) return null;

  return (
    <div className="page" style={{ maxWidth: 880 }}>
      <span className="pill-note"><IcReceipt size={13} /> Receipts</span>
      <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, marginTop: 10 }}>Orders</h1>

      <div style={{ marginTop: 26 }}>
        {orders === null && <><SkeletonBlock h={120} r={22} style={{ marginBottom: 14 }} /><SkeletonBlock h={120} r={22} /></>}
        {orders !== null && !orders.length && (
          <Empty emoji="🧾" title="No orders yet" cta={<Link to="/events" className="btn primary">Find something loud</Link>} />
        )}
        {orders?.map((o) => (
          <div key={o.id} className="card order-card hover-lift">
            <div className="spread" style={{ flexWrap: 'wrap', gap: 8 }}>
              <div className="row" style={{ gap: 10 }}>
                <strong className="mono" style={{ fontSize: 13, color: 'var(--text-2)' }}>#{o.id.replace('ord_', '').toUpperCase()}</strong>
                <span className="chip static" style={{ color: 'var(--good)' }}>{o.status}</span>
              </div>
              <span className="faint" style={{ fontSize: 13 }}>{dateTime(o.createdAt)}</span>
            </div>
            <table className="table" style={{ marginTop: 10 }}>
              <tbody>
                {o.items.map((line, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 650 }}>{line.title}</td>
                    <td className="muted">{line.kind}</td>
                    <td className="mono">{line.qty} × {money(line.unitPrice)}</td>
                    <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{money(line.qty * line.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="spread" style={{ marginTop: 12 }}>
              <span className="muted" style={{ fontSize: 13.5 }}>{o.items.reduce((s, i) => s + i.qty, 0)} items</span>
              <strong style={{ fontSize: 18 }}>{money(o.total)}</strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
