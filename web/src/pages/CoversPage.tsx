import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { User } from '../lib/types';
import { useApp } from '../lib/store';
import { IcExternal, IcImages, IcX } from '../lib/icons';
import { Empty } from '../components/ui';

import { CoverManager } from '../components/gallery/CoverManager';

/**
 * Your profile background rotation, in its own page — also openable as a
 * separate pop-out window so you can arrange covers while browsing.
 */
export function CoversPage({ popout }: { popout?: boolean }) {
  const { user, setUser, toast, ready } = useApp();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  if (ready && !user) {
    return (
      <div className="page">
        <Empty emoji="🔒" title="Sign in to manage your covers" cta={<button className="btn primary" onClick={() => navigate('/signin')}>Sign in</button>} />
      </div>
    );
  }
  if (!user) return null;

  const save = async (ids: string[]) => {
    setUser({ ...user, bannerCoverIds: ids });
    setSaving(true);
    try {
      const { user: fresh } = await api.patch<{ user: User }>('/api/me', { bannerCoverIds: ids });
      setUser(fresh);
    } catch {
      toast('Could not save covers', 'err');
    } finally {
      setSaving(false);
    }
  };

  const openPopout = () => {
    window.open('/covers-popout', 'tired-covers', 'width=760,height=900,noopener');
  };

  return (
    <div className="page" style={popout ? { paddingTop: 26, maxWidth: 760 } : { maxWidth: 860 }}>
      <div className="spread" style={{ marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <span className="pill-note"><IcImages size={13} /> Profile background</span>
          <h1 style={{ fontSize: 30, fontWeight: 900, marginTop: 8 }}>Cover rotation</h1>
          <p className="muted" style={{ marginTop: 4, maxWidth: 520 }}>
            These photos cycle behind your dashboard profile. Drag to reorder — the order is the play order.
            {saving && ' Saving…'}
          </p>
        </div>
        <div className="row">
          {!popout && (
            <button className="btn" onClick={openPopout}>
              <IcExternal size={15} /> Pop out window
            </button>
          )}
          {popout && (
            <button className="btn" onClick={() => window.close()}>
              <IcX size={15} /> Close window
            </button>
          )}
        </div>
      </div>

      <CoverManager ids={user.bannerCoverIds} onChange={save} emptyHint="Pick photos from your library — they will cycle behind your profile." />
    </div>
  );
}
