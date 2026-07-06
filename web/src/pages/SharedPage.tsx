import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { Photo } from '../lib/types';
import { ago, plural } from '../lib/format';
import { IcDownload, IcShare } from '../lib/icons';
import { Empty, SkeletonBlock } from '../components/ui';
import { VirtualGrid } from '../components/gallery/VirtualGrid';
import { Lightbox } from '../components/gallery/Lightbox';

interface ShareData {
  name: string;
  creatorName: string;
  createdAt: number;
  photos: Photo[];
}

/** Public, no-auth view of a shared photo selection. */
export function SharedPage() {
  const { token } = useParams();
  const [share, setShare] = useState<ShareData | null>(null);
  const [missing, setMissing] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    api.get<{ share: ShareData }>(`/api/shares/${token}`)
      .then((r) => setShare(r.share))
      .catch(() => setMissing(true));
  }, [token]);

  const photos = useMemo(() => share?.photos || [], [share]);

  if (missing) {
    return (
      <div className="page">
        <Empty emoji="🔗" title="Share link not found" sub="It may have been removed by its creator." />
      </div>
    );
  }

  return (
    <div className="page">
      {!share ? (
        <>
          <SkeletonBlock h={90} />
          <div style={{ height: 16 }} />
          <SkeletonBlock h={420} />
        </>
      ) : (
        <>
          <div className="share-hero">
            <span className="pill-note"><IcShare size={13} /> Shared by {share.creatorName}</span>
            <h1 style={{ fontSize: 'clamp(28px, 4.4vw, 44px)', fontWeight: 900, marginTop: 10 }}>{share.name}</h1>
            <div className="spread" style={{ marginTop: 8, flexWrap: 'wrap', gap: 12 }}>
              <p className="muted">{plural(photos.length, 'photo')} · shared {ago(share.createdAt)}</p>
              <a className="btn primary" href={`/api/export?ids=${photos.map((p) => p.id).join(',')}`}>
                <IcDownload size={15} /> Download all
              </a>
            </div>
          </div>
          <VirtualGrid photos={photos} onOpen={(i) => setLightbox(i)} showLabels />
          {lightbox !== null && (
            <Lightbox photos={photos} index={lightbox} onClose={() => setLightbox(null)} onIndex={setLightbox} />
          )}
        </>
      )}
    </div>
  );
}
