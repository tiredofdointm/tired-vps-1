import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../lib/store';
import { useOutsideClose } from '../lib/hooks';
import { ago, money } from '../lib/format';
import { thumbUrl } from '../lib/api';
import { Avatar } from './ui';
import {
  IcBell, IcCart, IcChevronDown, IcChevronRight, IcFeed, IcImages, IcMenu, IcReceipt,
  IcSettings, IcSignOut, IcSparkles, IcTicket, IcTrash, IcUser, IcX,
} from '../lib/icons';

const NAV = [
  { to: '/events', label: 'Events' },
  { to: '/nearby', label: 'Nearby' },
  { to: '/services', label: 'Services' },
  { to: '/galleries', label: 'Galleries' },
  { to: '/dashboard', label: 'Dashboard' },
];

export function Header() {
  const { user, cart } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <header className={`header${scrolled ? ' scrolled' : ''}`}>
      <div className="header-in">
        <button className="icon-btn burger" aria-label="Menu" onClick={() => setMobileOpen(true)}>
          <IcMenu size={20} />
        </button>
        <Link to="/" className="logo" aria-label="TIRED.EVENTS home">
          <span className="t1">TIRED.</span>
          <span className="t2">EVENTS</span>
        </Link>
        <nav className="nav" aria-label="Primary">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="header-actions">
          <CartButton count={cartCount} />
          {user ? (
            <ProfileButton />
          ) : (
            <Link to="/signin" className="btn primary sm">
              Sign in
            </Link>
          )}
        </div>
      </div>
      {mobileOpen && <MobileSheet onClose={() => setMobileOpen(false)} />}
    </header>
  );
}

/* ------------ cart dropdown ------------ */
function CartButton({ count }: { count: number }) {
  const { cart, setQty, removeFromCart, checkout, user } = useApp();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useOutsideClose(open, close);
  const navigate = useNavigate();
  const total = cart.reduce((s, i) => s + i.qty * i.unitPrice, 0);

  const onCheckout = async () => {
    if (!user) {
      setOpen(false);
      navigate('/signin');
      return;
    }
    setBusy(true);
    const ok = await checkout();
    setBusy(false);
    if (ok) {
      setOpen(false);
      navigate('/tickets');
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button className="icon-btn" aria-label={`Cart, ${count} items`} onClick={() => setOpen((o) => !o)}>
        <IcCart size={19} />
        {count > 0 && <span className="badge">{count}</span>}
      </button>
      {open && (
        <div className="menu cart-panel">
          <div className="spread" style={{ padding: '6px 10px 10px' }}>
            <strong>Your cart</strong>
            <span className="faint" style={{ fontSize: 12.5 }}>{count} item{count === 1 ? '' : 's'}</span>
          </div>
          {cart.length === 0 ? (
            <div style={{ padding: '18px 12px 12px', textAlign: 'center' }} className="muted">
              Cart is empty — go find a night out.
            </div>
          ) : (
            <>
              {cart.map((item) => (
                <div className="cart-line" key={item.refId}>
                  {item.coverId ? <img src={thumbUrl(item.coverId, 240)} alt="" /> : <div className="skeleton" style={{ width: 46, height: 46 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 650, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                    <div className="faint" style={{ fontSize: 12 }}>{money(item.unitPrice)} each</div>
                  </div>
                  <div className="qty-step">
                    <button onClick={() => setQty(item.refId, item.qty - 1)} aria-label="Decrease">−</button>
                    <span>{item.qty}</span>
                    <button onClick={() => setQty(item.refId, item.qty + 1)} aria-label="Increase">+</button>
                  </div>
                  <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => removeFromCart(item.refId)} aria-label="Remove">
                    <IcTrash size={14} />
                  </button>
                </div>
              ))}
              <hr className="menu-sep" />
              <div className="spread" style={{ padding: '4px 10px 10px' }}>
                <span className="muted" style={{ fontSize: 13 }}>Total</span>
                <strong style={{ fontSize: 17 }}>{money(total)}</strong>
              </div>
              <button className="btn primary" style={{ width: '100%' }} onClick={onCheckout} disabled={busy}>
                {busy ? <span className="spin" /> : user ? 'Checkout' : 'Sign in to checkout'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------ profile dropdown: everything past the cart lives here ------------ */
function ProfileButton() {
  const { user, unread, signOut, notifications, markAllRead } = useApp();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'menu' | 'notifications'>('menu');
  const close = useCallback(() => { setOpen(false); setView('menu'); }, []);
  const ref = useOutsideClose(open, close);
  const navigate = useNavigate();
  if (!user) return null;

  const isHost = user.roles.includes('host');

  const items = [
    { to: '/feed', label: 'Feed', icon: <IcFeed /> },
    { to: '/tickets', label: 'My tickets', icon: <IcTicket /> },
    { to: '/orders', label: 'Orders', icon: <IcReceipt /> },
    { to: '/galleries', label: 'Galleries', icon: <IcImages /> },
    { to: '/settings', label: 'Settings', icon: <IcSettings /> },
  ];

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button className="profile-btn" data-open={open} onClick={() => setOpen((o) => !o)} aria-label="Account menu" aria-expanded={open}>
        <Avatar name={user.name} imageId={user.avatarId} size={34} />
        {unread > 0 && <span className="badge">{unread > 9 ? '9+' : unread}</span>}
        <span className="chev"><IcChevronDown size={15} /></span>
      </button>
      {open && (
        <div className="menu profile-menu" role="menu">
          {view === 'menu' ? (
            <>
              <button
                className="menu-head"
                style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
                onClick={() => { close(); navigate('/dashboard'); }}
                title="Open your dashboard"
              >
                <Avatar name={user.name} imageId={user.avatarId} size={44} />
                <div className="who">
                  <div className="n">{user.name}</div>
                  <div className="e">{user.email}</div>
                  <div className="row" style={{ gap: 5, marginTop: 5 }}>
                    <span className="role-pill">Client</span>
                    {isHost && <span className="role-pill">Host</span>}
                  </div>
                </div>
              </button>
              <button className="menu-item" onClick={() => setView('notifications')}>
                <IcBell />
                Notifications
                {unread > 0 && <span className="mi-badge">{unread}</span>}
              </button>
              {items.map((item) => (
                <Link key={item.to} to={item.to} className="menu-item" onClick={close}>
                  {item.icon}
                  {item.label}
                </Link>
              ))}
              <hr className="menu-sep" />
              <Link to="/dashboard" className="menu-item" onClick={close}>
                <IcUser />
                View profile
              </Link>
              <button className="menu-item danger" onClick={() => { close(); signOut(); }}>
                <IcSignOut />
                Sign out
              </button>
            </>
          ) : (
            <>
              <div className="spread" style={{ padding: '8px 10px' }}>
                <button className="btn ghost sm" onClick={() => setView('menu')}>
                  <IcChevronRight size={14} style={{ transform: 'rotate(180deg)' }} /> Back
                </button>
                <button className="btn ghost sm" onClick={markAllRead} disabled={unread === 0}>
                  Mark all read
                </button>
              </div>
              <div style={{ maxHeight: '46vh', overflow: 'auto' }}>
                {notifications.length === 0 && (
                  <div className="muted" style={{ padding: 18, textAlign: 'center', fontSize: 13.5 }}>
                    Nothing yet — notifications land here.
                  </div>
                )}
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`notif${n.readAt ? '' : ' unread'}`}
                    onClick={() => { close(); if (n.href) navigate(n.href); }}
                  >
                    <div className="ic"><IcSparkles size={17} /></div>
                    <div style={{ minWidth: 0 }}>
                      <div className="t">{n.title}</div>
                      <div className="b">{n.body}</div>
                      <div className="when">{ago(n.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------ mobile sheet ------------ */
function MobileSheet({ onClose }: { onClose: () => void }) {
  const { user } = useApp();
  const links = useMemo(() => {
    const base = [...NAV];
    if (user) base.push({ to: '/feed', label: 'Feed' }, { to: '/tickets', label: 'My tickets' }, { to: '/orders', label: 'Orders' }, { to: '/settings', label: 'Settings' });
    return base;
  }, [user]);
  return (
    <div className="mobile-sheet">
      <button className="icon-btn" style={{ position: 'absolute', top: 14, right: 16 }} onClick={onClose} aria-label="Close menu">
        <IcX size={22} />
      </button>
      {links.map((n, i) => (
        <NavLink key={n.to} to={n.to} className="nav-link" style={{ animationDelay: `${i * 0.045}s` }}>
          {n.label}
        </NavLink>
      ))}
      {!user && (
        <Link to="/signin" className="btn primary lg" style={{ marginTop: 18, alignSelf: 'flex-start' }}>
          Sign in
        </Link>
      )}
    </div>
  );
}
