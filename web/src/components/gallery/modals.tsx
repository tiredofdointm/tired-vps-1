import React, { useEffect, useMemo, useState } from 'react';
import { api, thumbUrl } from '../../lib/api';
import type { Gallery, Photo } from '../../lib/types';
import { useApp } from '../../lib/store';
import { IcCheck, IcCopy, IcExternal, IcPlus, IcSearch } from '../../lib/icons';
import { Modal, ModalHead } from '../ui';

/** Multi-select photo chooser (search + click/ctrl toggles). */
export function PhotoPicker({
  open, onClose, onConfirm, initial = [], title = 'Choose photos', confirmLabel = 'Use selected', source,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
  initial?: string[];
  title?: string;
  confirmLabel?: string;
  source?: Photo[]; // limit choices (e.g. photos already in a gallery)
}) {
  const [all, setAll] = useState<Photo[]>([]);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Set<string>>(new Set(initial));

  useEffect(() => {
    if (!open) return;
    setSel(new Set(initial));
    if (source) {
      setAll(source);
    } else {
      api.get<{ items: Photo[] }>('/api/media').then((r) => setAll(r.items)).catch(() => setAll([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filtered = useMemo(() => {
    if (!q.trim()) return all;
    const needle = q.toLowerCase();
    return all.filter((p) => p.name.toLowerCase().includes(needle) || p.folder.toLowerCase().includes(needle));
  }, [all, q]);

  return (
    <Modal open={open} onClose={onClose} wide>
      <ModalHead title={title} sub={`${sel.size} selected`} onClose={onClose} />
      <div className="search-wrap" style={{ marginBottom: 14, maxWidth: '100%' }}>
        <IcSearch size={16} />
        <input className="input" placeholder="Search by name or folder…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="pick-grid">
        {filtered.map((p) => {
          const on = sel.has(p.id);
          return (
            <div
              key={p.id}
              className={`pick-cell${on ? ' on' : ''}`}
              onClick={() => setSel((s) => { const n = new Set(s); on ? n.delete(p.id) : n.add(p.id); return n; })}
              title={p.name}
            >
              <img src={thumbUrl(p.id, 240)} alt={p.name} loading="lazy" />
            </div>
          );
        })}
        {!filtered.length && <div className="muted" style={{ gridColumn: '1/-1', padding: 30, textAlign: 'center' }}>No photos match.</div>}
      </div>
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 18, gap: 10 }}>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn primary" disabled={!sel.size} onClick={() => { onConfirm([...sel]); onClose(); }}>
          <IcCheck size={15} /> {confirmLabel} ({sel.size})
        </button>
      </div>
    </Modal>
  );
}

/** Pick an existing gallery or create a new one; resolves with the gallery id. */
export function GalleryChooser({ open, onClose, onDone, photoCount }: { open: boolean; onClose: () => void; onDone: (gallery: Gallery) => void; photoCount: number }) {
  const { toast } = useApp();
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) api.get<{ galleries: Gallery[] }>('/api/galleries').then((r) => setGalleries(r.galleries)).catch(() => undefined);
  }, [open]);

  const createNew = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const { gallery } = await api.post<{ gallery: Gallery }>('/api/galleries', { name: name.trim() });
      onDone(gallery);
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not create gallery', 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <ModalHead title="Add to gallery" sub={`${photoCount} photo${photoCount === 1 ? '' : 's'} will be added`} onClose={onClose} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '38vh', overflow: 'auto' }}>
        {galleries.map((g) => (
          <button key={g.id} className="menu-item" style={{ border: '1px solid var(--stroke)' }} onClick={() => { onDone(g); onClose(); }}>
            {g.coverIds[0] && <img src={thumbUrl(g.coverIds[0], 240)} alt="" style={{ width: 44, height: 32, borderRadius: 7, objectFit: 'cover' }} />}
            <span style={{ fontWeight: 650 }}>{g.name}</span>
            <span className="mi-badge">{g.count}</span>
          </button>
        ))}
        {!galleries.length && <div className="muted" style={{ padding: '14px 4px' }}>No galleries yet — create your first below.</div>}
      </div>
      <hr className="divider" />
      <div className="row">
        <input className="input" placeholder="New gallery name…" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createNew()} />
        <button className="btn primary" onClick={createNew} disabled={busy || !name.trim()}>
          <IcPlus size={15} /> Create
        </button>
      </div>
    </Modal>
  );
}

/** Result modal after creating a share link. */
export function ShareResult({ open, onClose, url, name }: { open: boolean; onClose: () => void; url: string; name: string }) {
  const { toast } = useApp();
  const full = `${window.location.origin}${url}`;
  return (
    <Modal open={open} onClose={onClose}>
      <ModalHead title="Share link ready" sub={name} onClose={onClose} />
      <div className="row" style={{ gap: 10 }}>
        <input className="input mono" readOnly value={full} onFocus={(e) => e.currentTarget.select()} style={{ fontSize: 13 }} />
        <button
          className="btn primary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(full);
              toast('Link copied to clipboard', 'ok');
            } catch {
              toast('Copy failed — select and copy manually', 'err');
            }
          }}
        >
          <IcCopy size={15} /> Copy
        </button>
      </div>
      <a className="btn ghost" style={{ marginTop: 12 }} href={url} target="_blank" rel="noreferrer">
        <IcExternal size={15} /> Open preview
      </a>
    </Modal>
  );
}
