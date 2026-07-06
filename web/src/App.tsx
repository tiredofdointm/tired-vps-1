import React, { useEffect } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './lib/store';
import { Header } from './components/Header';
import { CommandPalette } from './components/CommandPalette';
import { Toasts } from './components/ui';
import { EventsPage } from './pages/EventsPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { NearbyPage } from './pages/NearbyPage';
import { ServicesPage } from './pages/ServicesPage';
import { GalleriesPage } from './pages/GalleriesPage';
import { GalleryDetailPage } from './pages/GalleryDetailPage';
import { SharedPage } from './pages/SharedPage';
import { CoversPage } from './pages/CoversPage';
import { FeedPage } from './pages/FeedPage';
import { TicketsPage } from './pages/TicketsPage';
import { OrdersPage } from './pages/OrdersPage';
import { SettingsPage } from './pages/SettingsPage';
import { DashboardPage } from './pages/DashboardPage';
import { SignInPage } from './pages/SignInPage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}

function Shell() {
  const location = useLocation();
  const bare = location.pathname === '/covers-popout';
  return (
    <>
      <div className="aurora" />
      <div className="noise" />
      {!bare && <Header />}
      <div key={location.pathname} style={{ animation: 'fadeUp 0.45s var(--ease-out)' }}>
        <Routes>
          <Route path="/" element={<EventsPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:slug" element={<EventDetailPage />} />
          <Route path="/nearby" element={<NearbyPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/galleries" element={<GalleriesPage />} />
          <Route path="/galleries/:id" element={<GalleryDetailPage />} />
          <Route path="/s/:token" element={<SharedPage />} />
          <Route path="/covers" element={<CoversPage />} />
          <Route path="/covers-popout" element={<CoversPage popout />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/tickets" element={<TicketsPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      {!bare && <Footer />}
      <CommandPalette />
      <Toasts />
    </>
  );
}

function NotFound() {
  return (
    <div className="page" style={{ textAlign: 'center', paddingTop: 180 }}>
      <div style={{ fontSize: 80, fontWeight: 900 }} className="grad-text">404</div>
      <p className="muted" style={{ marginTop: 8 }}>This room doesn't exist — or the party moved.</p>
      <Link to="/" className="btn primary" style={{ marginTop: 22 }}>Back to events</Link>
    </div>
  );
}

function Footer() {
  const { user } = useApp();
  return (
    <footer className="footer">
      <div className="footer-in">
        <span>
          <strong style={{ color: 'var(--text-2)' }}>TIRED.EVENTS</strong> — rest is a myth.
        </span>
        <span className="row" style={{ gap: 18 }}>
          <Link to="/events">Events</Link>
          <Link to="/galleries">Galleries</Link>
          <Link to="/services">Services</Link>
          {user && <Link to="/dashboard">Dashboard</Link>}
        </span>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <ScrollToTop />
        <Shell />
      </AppProvider>
    </BrowserRouter>
  );
}
