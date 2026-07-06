import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { User } from '../lib/types';
import { useApp } from '../lib/store';
import { IcCheck, IcImages, IcSettings, IcUser, IcZap } from '../lib/icons';
import { Avatar, Toggle } from '../components/ui';
import { PhotoPicker } from '../components/gallery/modals';

const ACCENTS: { key: string; color: string }[] = [
  { key: 'violet', color: '#a855f7' },
  { key: 'magenta', color: '#ec4899' },
  { key: 'cyan', color: '#22d3ee' },
  { key: 'lime', color: '#a3e635' },
  { key: 'amber', color: '#fbbf24' },
];

export function SettingsPage() {
  const { user, setUser, ready, toast } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', handle: '', bio: '', city: '' });
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (ready && !user) navigate('/signin');
  }, [ready, user, navigate]);

  useEffect(() => {
    if (user) setForm({ name: user.name, handle: user.handle, bio: user.bio, city: user.location?.city || '' });
  }, [user?.id]);

  if (!user) return null;

  const patch = async (body: Record<string, unknown>, quiet = false) => {
    setSaving(true);
    try {
      const { user: fresh } = await api.patch<{ user: User }>('/api/me', body);
      setUser(fresh);
      if (!quiet) toast('Saved', 'ok');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed', 'err');
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = () =>
    patch({
      name: form.name.trim() || user.name,
      handle: form.handle.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '') || user.handle,
      bio: form.bio,
      location: form.city.trim() ? { ...(user.location || { lat: 40.7128, lng: -74.006 }), city: form.city.trim() } : user.location,
    });

  return (
    <div className="page" style={{ maxWidth: 1060 }}>
      <span className="pill-note"><IcSettings size={13} /> Your space</span>
      <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, marginTop: 10 }}>Settings</h1>

      <div className="settings-grid" style={{ marginTop: 26 }}>
        <nav className="set-nav">
          {[['#profile', 'Profile', <IcUser key="i" size={15} />], ['#appearance', 'Appearance', <IcZap key="i" size={15} />], ['#covers', 'Covers', <IcImages key="i" size={15} />]].map(([href, label, icon]) => (
            <a key={href as string} href={href as string} className="folder-item">
              {icon} {label}
            </a>
          ))}
        </nav>

        <div>
          <section id="profile" className="card set-panel">
            <h3><IcUser size={17} /> Profile</h3>
            <div className="row" style={{ marginBottom: 18, gap: 16 }}>
              <Avatar name={user.name} imageId={user.avatarId} size={72} clickable />
              <div>
                <button className="btn sm" onClick={() => setAvatarOpen(true)}>
                  <IcImages size={14} /> Choose avatar from library
                </button>
                {user.avatarId && (
                  <button className="btn ghost sm" style={{ marginLeft: 8 }} onClick={() => patch({ avatarId: null })}>
                    Remove
                  </button>
                )}
                <div className="faint" style={{ fontSize: 12, marginTop: 8 }}>Any photo from your imported folders works.</div>
              </div>
            </div>
            <div className="form-2col">
              <div className="field">
                <label>Display name</label>
                <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="field">
                <label>Handle</label>
                <input className="input" value={form.handle} onChange={(e) => setForm((f) => ({ ...f, handle: e.target.value }))} />
              </div>
              <div className="field span-2">
                <label>Bio</label>
                <textarea className="input" value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} maxLength={300} />
              </div>
              <div className="field">
                <label>City</label>
                <input className="input" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="Brooklyn, NY" />
              </div>
              <div className="field">
                <label>Email</label>
                <input className="input" value={user.email} disabled style={{ opacity: 0.6 }} />
              </div>
            </div>
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn primary" onClick={saveProfile} disabled={saving}>
                {saving ? <span className="spin" /> : <IcCheck size={15} />} Save profile
              </button>
            </div>
          </section>

          <section id="appearance" className="card set-panel">
            <h3><IcZap size={17} /> Appearance & motion</h3>
            <div className="spread" style={{ marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 650 }}>Accent color</div>
                <div className="faint" style={{ fontSize: 12.5 }}>Tints buttons, glows and gradients across the site</div>
              </div>
              <div className="accent-dots">
                {ACCENTS.map((a) => (
                  <button
                    key={a.key}
                    className={`accent-dot${user.accent === a.key ? ' on' : ''}`}
                    style={{ background: a.color }}
                    onClick={() => patch({ accent: a.key }, true)}
                    aria-label={`${a.key} accent`}
                  />
                ))}
              </div>
            </div>
            <div className="spread">
              <div>
                <div style={{ fontWeight: 650 }}>Reduce motion</div>
                <div className="faint" style={{ fontSize: 12.5 }}>Calms animations, Ken Burns drifts and hover physics</div>
              </div>
              <Toggle on={!!user.prefs?.reducedMotion} onChange={(v) => patch({ prefs: { ...user.prefs, reducedMotion: v } }, true)} label="Reduce motion" />
            </div>
            <div className="spread" style={{ marginTop: 16 }}>
              <div>
                <div style={{ fontWeight: 650 }}>Email updates</div>
                <div className="faint" style={{ fontSize: 12.5 }}>Drops, venue reveals and gallery publishes</div>
              </div>
              <Toggle on={!!user.prefs?.emailUpdates} onChange={(v) => patch({ prefs: { ...user.prefs, emailUpdates: v } }, true)} label="Email updates" />
            </div>
          </section>

          <section id="covers" className="card set-panel">
            <h3><IcImages size={17} /> Profile covers</h3>
            <p className="muted" style={{ fontSize: 14, marginBottom: 14 }}>
              The photos cycling behind your dashboard. Manage the rotation — reorder, add, remove — in its own window if you like.
            </p>
            <div className="row">
              <Link to="/covers" className="btn primary">
                <IcImages size={15} /> Manage cover rotation
              </Link>
              <span className="faint" style={{ fontSize: 12.5 }}>{user.bannerCoverIds.length} in rotation</span>
            </div>
          </section>
        </div>
      </div>

      <PhotoPicker
        open={avatarOpen}
        onClose={() => setAvatarOpen(false)}
        initial={user.avatarId ? [user.avatarId] : []}
        title="Choose your avatar"
        confirmLabel="Set avatar"
        onConfirm={(ids) => ids[0] && patch({ avatarId: ids[0] })}
      />
    </div>
  );
}
