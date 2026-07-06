import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Photo } from '../../lib/types';
import { fileUrl, thumbUrl } from '../../lib/api';
import { bytes, dateShort } from '../../lib/format';
import {
  IcChevronRight, IcDownload, IcEdit, IcHeart, IcPause, IcPin, IcPlay, IcX,
} from '../../lib/icons';

export function Lightbox({
  photos,
  index,
  onClose,
  onIndex,
  onRename,
  onTogglePin,
  onToggleFavorite,
  canEdit,
  autoPlay,
}: {
  photos: Photo[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
  onRename?: (photo: Photo, name: string) => void;
  onTogglePin?: (photo: Photo) => void;
  onToggleFavorite?: (photo: Photo) => void;
  canEdit?: boolean;
  autoPlay?: boolean;
}) {
  const photo = photos[index];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [playing, setPlaying] = useState(!!autoPlay);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);

  const go = useCallback(
    (dir: number) => {
      if (!photos.length) return;
      onIndex((index + dir + photos.length) % photos.length);
      setEditing(false);
    },
    [index, photos.length, onIndex],
  );

  // slideshow — auto-advance until paused or closed
  useEffect(() => {
    if (!playing || photos.length < 2) return;
    const t = setInterval(() => go(1), 3600);
    return () => clearInterval(t);
  }, [playing, go, photos.length]);

  // zoom resets when the frame changes
  useEffect(() => setZoom(null), [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editing) return;
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [go, onClose, editing]);

  // keep filmstrip centered on current frame
  useEffect(() => {
    const strip = stripRef.current;
    const active = strip?.querySelector<HTMLElement>('.fr.on');
    active?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [index]);

  // preload neighbours so arrows feel instant
  useEffect(() => {
    [index + 1, index - 1].forEach((i) => {
      const p = photos[(i + photos.length) % photos.length];
      if (p) new Image().src = thumbUrl(p.id, 1600);
    });
  }, [index, photos]);

  if (!photo) return null;

  const commitRename = () => {
    setEditing(false);
    const name = draft.trim();
    if (name && name !== photo.name) onRename?.(photo, name);
  };

  return createPortal(
    <div className="lightbox">
      <div className="lb-top">
        <span className="lb-count mono">{index + 1} / {photos.length}</span>
        <div style={{ flex: 1 }} />
        {photos.length > 1 && (
          <button className="icon-btn" onClick={() => setPlaying((p) => !p)} title={playing ? 'Pause slideshow' : 'Play slideshow'} style={playing ? { color: 'var(--accent)' } : undefined}>
            {playing ? <IcPause size={17} /> : <IcPlay size={17} />}
          </button>
        )}
        {canEdit && onTogglePin && (
          <button className={`icon-btn${photo.pinned ? ' on' : ''}`} style={photo.pinned ? { color: 'var(--warn)' } : undefined} onClick={() => onTogglePin(photo)} title={photo.pinned ? 'Unpin' : 'Pin'}>
            <IcPin size={18} />
          </button>
        )}
        {canEdit && onToggleFavorite && (
          <button className="icon-btn" style={photo.favorite ? { color: 'var(--bad)' } : undefined} onClick={() => onToggleFavorite(photo)} title="Favorite">
            <IcHeart size={18} style={photo.favorite ? { fill: 'currentColor' } : undefined} />
          </button>
        )}
        <a className="icon-btn" href={fileUrl(photo.id)} download={`${photo.name}${photo.ext}`} title="Download original">
          <IcDownload size={18} />
        </a>
        <button className="icon-btn" onClick={onClose} aria-label="Close viewer">
          <IcX size={20} />
        </button>
      </div>

      <div className="lb-stage" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <button className="lb-nav prev" onClick={() => go(-1)} aria-label="Previous">
          <IcChevronRight size={20} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <img
          key={photo.id}
          src={thumbUrl(photo.id, 1600)}
          alt={photo.name}
          draggable={false}
          onClick={(e) => {
            if (zoom) {
              setZoom(null);
            } else {
              const r = e.currentTarget.getBoundingClientRect();
              setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
            }
          }}
          style={{
            cursor: zoom ? 'zoom-out' : 'zoom-in',
            transform: zoom ? 'scale(2.3)' : undefined,
            transformOrigin: zoom ? `${zoom.x}% ${zoom.y}%` : undefined,
            transition: 'transform 0.35s var(--ease-out)',
          }}
        />
        <button className="lb-nav next" onClick={() => go(1)} aria-label="Next">
          <IcChevronRight size={20} />
        </button>
      </div>

      <div className="lb-foot">
        <div style={{ minWidth: 0 }}>
          <div className="lb-name row" style={{ gap: 9 }}>
            {editing ? (
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename();
                  if (e.key === 'Escape') setEditing(false);
                }}
                aria-label="Photo name"
              />
            ) : (
              <>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{photo.name}</span>
                {canEdit && onRename && (
                  <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => { setDraft(photo.name); setEditing(true); }} title="Rename (display name only — the file is untouched)">
                    <IcEdit size={14} />
                  </button>
                )}
              </>
            )}
          </div>
          <div className="lb-meta">
            {photo.folder || 'library'} / {photo.originalName} · {photo.w}×{photo.h} · {bytes(photo.size)} · {dateShort(photo.mtime)}
          </div>
        </div>
      </div>

      <div className="lb-strip" ref={stripRef}>
        {photos.map((p, i) => (
          <div key={p.id} className={`fr${i === index ? ' on' : ''}`} onClick={() => onIndex(i)}>
            <img src={thumbUrl(p.id, 240)} alt="" loading="lazy" />
          </div>
        ))}
      </div>
    </div>,
    document.body,
  );
}
