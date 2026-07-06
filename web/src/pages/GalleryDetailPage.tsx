import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { Gallery, Photo } from '../lib/types';
import { useApp } from '../lib/store';
import { plural } from '../lib/format';
import {
  IcChevronRight, IcDownload, IcEdit, IcImages, IcLayers, IcPin, IcShare, IcTrash, IcX,
} from '../lib/icons';
import { CoverCycler } from '../components/CoverCycler';
import { Empty, Modal, ModalHead, SkeletonBlock } from '../components/ui';
import { VirtualGrid } from '../components/gallery/VirtualGrid';
import { useSelection } from '../components/gallery/useSelection';
import { SelectionBar } from '../components/gallery/SelectionBar';
import { Lightbox } from '../components/gallery/Lightbox';
import { ShareResult } from '../components/gallery/modals';
import { CoverManager } from '../components/gallery/CoverManager';

export function GalleryDetailPage() {
  const { id } = useParams();
  const { user, toast } = useApp();
  const navigate = useNavigate();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [share, setShare] = useState<{ url: string; name: string } | null>(null);
  const [coversOpen, setCoversOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ gallery: Gallery; photos: Photo[] }>(`/api/galleries/${id}`);
      setGallery(r.gallery);
      setPhotos(r.photos);
    } catch {
      toast('Gallery not found', 'err');
      navigate('/galleries');
    }
  }, [id, navigate, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const ids = useMemo(() => (photos || []).map((p) => p.id), [photos]);
  const selection = useSelection(ids);
  const isOwner = !!user && gallery?.ownerId === user.id;

  const patchPhoto = useCallback((pid: string, patch: Partial<Photo>) => {
    setPhotos((ps) => (ps ? ps.map((p) => (p.id === pid ? { ...p, ...patch } : p)) : ps));
  }, []);

  const rename = async (photo: Photo, name: string) => {
    patchPhoto(photo.id, { name, renamed: true });
    try {
      await api.patch(`/api/media/${photo.id}`, { name });
      toast('Name saved', 'ok');
    } catch {
      patchPhoto(photo.id, { name: photo.name });
      toast('Rename failed', 'err');
    }
  };

  const togglePin = async (photo: Photo) => {
    patchPhoto(photo.id, { pinned: !photo.pinned });
    try {
      await api.patch(`/api/media/${photo.id}`, { pinned: !photo.pinned });
    } catch {
      patchPhoto(photo.id, { pinned: photo.pinned });
    }
  };
  const toggleFav = async (photo: Photo) => {
    patchPhoto(photo.id, { favorite: !photo.favorite });
    try {
      await api.patch(`/api/media/${photo.id}`, { favorite: !photo.favorite });
    } catch {
      patchPhoto(photo.id, { favorite: photo.favorite });
    }
  };

  const removeSelected = async () => {
    if (!gallery) return;
    const sel = [...selection.selected];
    try {
      await api.post(`/api/galleries/${gallery.id}/photos`, { remove: sel });
      toast(`Removed ${plural(sel.length, 'photo')} from the gallery`, 'ok');
      selection.clear();
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Remove failed', 'err');
    }
  };

  const setAsCovers = async () => {
    if (!gallery) return;
    try {
      const coverIds = [...selection.selected].slice(0, 10);
      await api.patch(`/api/galleries/${gallery.id}`, { coverIds });
      toast(`Cover rotation updated — ${plural(coverIds.length, 'photo')} cycling`, 'ok');
      selection.clear();
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not set covers', 'err');
    }
  };

  const pinSelected = async () => {
    if (!gallery) return;
    try {
      const pinnedIds = [...new Set([...(gallery.pinnedIds || []), ...selection.selected])];
      await api.patch(`/api/galleries/${gallery.id}`, { pinnedIds });
      toast('Pinned to the top of this gallery', 'ok');
      selection.clear();
      load();
    } catch {
      toast('Pin failed', 'err');
    }
  };

  const shareSelection = async (all = false) => {
    if (!gallery || !photos) return;
    try {
      const photoIds = all ? photos.map((p) => p.id) : [...selection.selected];
      const { share } = await api.post<{ share: { url: string; name: string } }>('/api/shares', {
        photoIds,
        name: all ? gallery.name : `${gallery.name} — selection`,
      });
      setShare(share);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Share failed', 'err');
    }
  };

  const exportZip = (all = false) => {
    if (!photos) return;
    const list = all ? photos.map((p) => p.id) : [...selection.selected];
    window.location.href = `/api/export?ids=${list.join(',')}`;
    toast('Preparing your ZIP…', 'ok');
  };

  if (!gallery || photos === null) {
    return (
      <div className="page">
        <SkeletonBlock h={300} r={26} />
        <div style={{ height: 18 }} />
        <SkeletonBlock h={420} />
      </div>
    );
  }

  return (
    <div className="page">
      <nav className="row" style={{ gap: 6, fontSize: 13.5, marginBottom: 14 }} aria-label="Breadcrumb">
        <Link to="/galleries" className="muted" style={{ fontWeight: 600 }}>Galleries</Link>
        <IcChevronRight size={13} style={{ color: 'var(--text-3)' }} />
        <span style={{ fontWeight: 700 }}>{gallery.name}</span>
      </nav>

      <div className="hero" style={{ minHeight: 300 }}>
        <CoverCycler ids={gallery.coverIds} interval={4200} dots style={{ position: 'absolute', inset: 0 }} />
        <div className="hero-shade" />
        <div className="hero-body" style={{ padding: '30px 34px' }}>
          <span className="pill-note"><IcLayers size={13} /> {gallery.showcase ? 'Showcase gallery' : 'Private gallery'}</span>
          <h1 style={{ fontSize: 'clamp(28px, 4.4vw, 46px)' }}>{gallery.name}</h1>
          {gallery.description && <p className="lead">{gallery.description}</p>}
          <div className="hero-cta">
            <button className="btn primary" onClick={() => shareSelection(true)}>
              <IcShare size={15} /> Share gallery
            </button>
            <button className="btn" onClick={() => exportZip(true)}>
              <IcDownload size={15} /> Export all
            </button>
            {isOwner && (
              <>
                <button className="btn" onClick={() => setCoversOpen(true)}>
                  <IcImages size={15} /> Manage covers
                </button>
                <button className="btn ghost" onClick={() => setEditOpen(true)}>
                  <IcEdit size={15} /> Edit
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="spread" style={{ margin: '26px 0 14px' }}>
        <h2 style={{ fontSize: 21, fontWeight: 800 }}>{plural(photos.length, 'photo')}</h2>
        {isOwner && <span className="faint" style={{ fontSize: 12.5 }}>Double-click to open · drag to select · Ctrl+A for everything</span>}
      </div>

      <VirtualGrid
        photos={photos}
        selection={user ? selection : undefined}
        onOpen={(i) => setLightbox(i)}
        emptyNode={<Empty emoji="🖼️" title="This gallery is empty" sub="Add photos from the library page — select and hit “Add to gallery”." cta={<Link className="btn primary" to="/galleries">Open library</Link>} />}
      />

      {user && (
        <SelectionBar
          selection={selection}
          hint="Shift+click range · drag to box-select"
          actions={[
            { key: 'covers', label: 'Set as covers', icon: <IcImages size={15} />, onClick: setAsCovers, hidden: !isOwner },
            { key: 'pin', label: 'Pin here', icon: <IcPin size={15} />, onClick: pinSelected, hidden: !isOwner },
            { key: 'share', label: 'Share', icon: <IcShare size={15} />, onClick: () => shareSelection(false) },
            { key: 'export', label: 'Export ZIP', icon: <IcDownload size={15} />, onClick: () => exportZip(false) },
            { key: 'remove', label: 'Remove', icon: <IcX size={15} />, onClick: removeSelected, danger: true, hidden: !isOwner },
          ]}
        />
      )}

      {lightbox !== null && (
        <Lightbox
          photos={photos}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onIndex={setLightbox}
          canEdit={isOwner}
          onRename={rename}
          onTogglePin={togglePin}
          onToggleFavorite={toggleFav}
        />
      )}

      <Modal open={coversOpen} onClose={() => setCoversOpen(false)} wide>
        <ModalHead title="Cover rotation" sub="These photos cycle as this gallery's cover art — drag to reorder." onClose={() => setCoversOpen(false)} />
        <CoverManager
          ids={gallery.coverIds}
          source={photos}
          onChange={async (next) => {
            setGallery((g) => (g ? { ...g, coverIds: next } : g));
            try {
              await api.patch(`/api/galleries/${gallery.id}`, { coverIds: next });
            } catch {
              toast('Could not save covers', 'err');
              load();
            }
          }}
        />
      </Modal>

      {isOwner && <EditGalleryModal open={editOpen} onClose={() => setEditOpen(false)} gallery={gallery} onSaved={(g) => setGallery(g)} onDeleted={() => navigate('/galleries')} />}
      <ShareResult open={!!share} onClose={() => setShare(null)} url={share?.url || ''} name={share?.name || ''} />
    </div>
  );
}

function EditGalleryModal({ open, onClose, gallery, onSaved, onDeleted }: { open: boolean; onClose: () => void; gallery: Gallery; onSaved: (g: Gallery) => void; onDeleted: () => void }) {
  const { toast } = useApp();
  const [name, setName] = useState(gallery.name);
  const [description, setDescription] = useState(gallery.description);
  const [showcase, setShowcase] = useState(gallery.showcase);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(gallery.name);
      setDescription(gallery.description);
      setShowcase(gallery.showcase);
    }
  }, [open, gallery]);

  const save = async () => {
    setBusy(true);
    try {
      const { gallery: g } = await api.patch<{ gallery: Gallery }>(`/api/galleries/${gallery.id}`, { name, description, showcase });
      onSaved(g);
      toast('Gallery updated', 'ok');
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed', 'err');
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    if (!window.confirm(`Delete “${gallery.name}”? Photos stay in your library — only the gallery is removed.`)) return;
    try {
      await api.del(`/api/galleries/${gallery.id}`);
      toast('Gallery deleted — photos are untouched', 'ok');
      onDeleted();
    } catch {
      toast('Delete failed', 'err');
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <ModalHead title="Edit gallery" onClose={onClose} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="field">
          <label>Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>Description</label>
          <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <label className="spread" style={{ cursor: 'pointer' }}>
          <span>
            <div style={{ fontWeight: 650 }}>Showcase publicly</div>
            <div className="faint" style={{ fontSize: 12.5 }}>Visible to everyone on the galleries page</div>
          </span>
          <input type="checkbox" checked={showcase} onChange={(e) => setShowcase(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--accent)' }} />
        </label>
        <div className="spread">
          <button className="btn danger" onClick={del}>
            <IcTrash size={15} /> Delete
          </button>
          <div className="row">
            <button className="btn ghost" onClick={onClose}>Cancel</button>
            <button className="btn primary" onClick={save} disabled={busy || !name.trim()}>
              {busy ? <span className="spin" /> : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
