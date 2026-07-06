import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { FolderInfo, Gallery, Photo } from '../lib/types';
import { useApp } from '../lib/store';
import { useDebounced } from '../lib/hooks';
import { bytes, plural } from '../lib/format';
import {
  IcDownload, IcEye, IcEyeOff, IcFolder, IcHeart, IcImages, IcLayers, IcPin, IcPlus, IcRefresh, IcSearch, IcShare, IcX,
} from '../lib/icons';
import { CoverCycler } from '../components/CoverCycler';
import { Empty, SectionHead, SkeletonBlock } from '../components/ui';
import { VirtualGrid } from '../components/gallery/VirtualGrid';
import { useSelection } from '../components/gallery/useSelection';
import { SelectionBar } from '../components/gallery/SelectionBar';
import { Lightbox } from '../components/gallery/Lightbox';
import { GalleryChooser, ShareResult } from '../components/gallery/modals';

/**
 * The photo library hub: your imported folders (read-only on disk), overlay
 * metadata on top, galleries built from any selection.
 */
export function GalleriesPage() {
  const { user, toast } = useApp();
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [folder, setFolder] = useState<string>('');
  const [view, setView] = useState<'' | 'favorites' | 'pinned' | 'hidden'>('');
  const [sort, setSort] = useState<'folder' | 'name' | 'newest' | 'largest'>('folder');
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 220);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [share, setShare] = useState<{ url: string; name: string } | null>(null);
  const [scanning, setScanning] = useState(false);

  const load = useCallback(async () => {
    const hidden = view === 'hidden' ? '&hidden=1' : '';
    const [m, f, g] = await Promise.all([
      api.get<{ items: Photo[] }>(`/api/media?folder=${encodeURIComponent(folder)}&q=${encodeURIComponent(dq)}${hidden}`),
      api.get<{ folders: FolderInfo[] }>('/api/media/folders'),
      api.get<{ galleries: Gallery[] }>('/api/galleries'),
    ]);
    setPhotos(m.items);
    setFolders(f.folders);
    setGalleries(g.galleries);
  }, [folder, dq, view]);

  useEffect(() => {
    load().catch(() => toast('Could not load the photo library', 'err'));
  }, [load, toast]);

  // smart views + sort are pure lens layers over the indexed library
  const shown = useMemo(() => {
    let list = photos || [];
    if (view === 'favorites') list = list.filter((p) => p.favorite);
    else if (view === 'pinned') list = list.filter((p) => p.pinned);
    else if (view === 'hidden') list = list.filter((p) => p.hidden);
    if (sort !== 'folder') {
      const collator = new Intl.Collator(undefined, { numeric: true });
      list = [...list].sort((a, b) =>
        sort === 'name' ? collator.compare(a.name, b.name)
        : sort === 'newest' ? b.mtime - a.mtime
        : b.size - a.size);
    }
    return list;
  }, [photos, view, sort]);

  const ids = useMemo(() => shown.map((p) => p.id), [shown]);
  const selection = useSelection(ids);

  const patchPhoto = useCallback((id: string, patch: Partial<Photo>) => {
    setPhotos((ps) => (ps ? ps.map((p) => (p.id === id ? { ...p, ...patch } : p)) : ps));
  }, []);

  const rename = async (photo: Photo, name: string) => {
    patchPhoto(photo.id, { name, renamed: true });
    try {
      await api.patch(`/api/media/${photo.id}`, { name });
      toast('Name saved — the file on disk is untouched', 'ok');
    } catch {
      patchPhoto(photo.id, { name: photo.name, renamed: photo.renamed });
      toast('Rename failed', 'err');
    }
  };

  const batch = async (patch: { pinned?: boolean; favorite?: boolean; hidden?: boolean }, label: string) => {
    const sel = [...selection.selected];
    sel.forEach((id) => patchPhoto(id, patch));
    try {
      await api.post('/api/media/batch', { ids: sel, patch });
      toast(`${label} — ${plural(sel.length, 'photo')}`, 'ok');
      if ('hidden' in patch) {
        // the photo leaves the current lens either way (hidden from normal views, unhidden from the hidden view)
        setPhotos((ps) => (ps ? ps.filter((p) => !selection.selected.has(p.id)) : ps));
        selection.clear();
      }
    } catch {
      toast('Update failed', 'err');
      load();
    }
  };

  const togglePin = (photo: Photo) => {
    patchPhoto(photo.id, { pinned: !photo.pinned });
    api.patch(`/api/media/${photo.id}`, { pinned: !photo.pinned }).catch(() => patchPhoto(photo.id, { pinned: photo.pinned }));
  };
  const toggleFav = (photo: Photo) => {
    patchPhoto(photo.id, { favorite: !photo.favorite });
    api.patch(`/api/media/${photo.id}`, { favorite: !photo.favorite }).catch(() => patchPhoto(photo.id, { favorite: photo.favorite }));
  };

  const shareSelection = async () => {
    try {
      const { share } = await api.post<{ share: { url: string; name: string } }>('/api/shares', {
        photoIds: [...selection.selected],
        name: folder ? `${folder.split('/').pop()} — selection` : 'Selected photos',
      });
      setShare(share);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Share failed', 'err');
    }
  };

  const exportSelection = () => {
    const idsParam = [...selection.selected].join(',');
    window.location.href = `/api/export?ids=${idsParam}`;
    toast('Preparing your ZIP…', 'ok');
  };

  const addToGallery = async (gallery: Gallery) => {
    try {
      await api.post(`/api/galleries/${gallery.id}/photos`, { add: [...selection.selected] });
      toast(`Added ${plural(selection.count, 'photo')} to “${gallery.name}”`, 'ok');
      selection.clear();
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not add photos', 'err');
    }
  };

  const rescan = async () => {
    setScanning(true);
    try {
      const r = await api.post<{ total: number; added: number; removed: number }>('/api/media/rescan');
      toast(`Rescan complete — ${r.total} photos (${r.added} new, ${r.removed} removed)`, 'ok');
      load();
    } catch {
      toast('Rescan failed', 'err');
    } finally {
      setScanning(false);
    }
  };

  const totalBytes = folders.reduce((s, f) => s + f.bytes, 0);

  return (
    <div className="page">
      <div className="spread" style={{ flexWrap: 'wrap', gap: 14 }}>
        <div>
          <span className="pill-note"><IcImages size={13} /> Photo library</span>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, marginTop: 10 }}>Galleries</h1>
          <p className="muted" style={{ marginTop: 6, maxWidth: 620 }}>
            Your imported folders, exactly as they are on disk — we only layer names, pins and galleries on top.
            Double-click opens. Click, <kbd>Ctrl</kbd>+click, <kbd>Shift</kbd>+click and drag to select, just like your desktop.
          </p>
        </div>
        {user && (
          <button className="btn" onClick={rescan} disabled={scanning}>
            {scanning ? <span className="spin" /> : <IcRefresh size={15} />} Rescan folders
          </button>
        )}
      </div>

      {/* showcase galleries */}
      <SectionHead title="Showcases" icon={<IcLayers size={21} />} right={<span className="faint" style={{ fontSize: 13 }}>{plural(galleries.length, 'gallery')}</span>} />
      <div className="event-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {galleries.filter((g) => g.showcase || g.ownerId === user?.id).map((g) => (
          <Link key={g.id} to={`/galleries/${g.id}`} className="card gal-card hover-lift">
            <CoverCycler ids={g.coverIds} interval={3400} width={720} />
            {!g.showcase && <span className="g-badge chip static"><IcEyeOff size={12} /> Private</span>}
            <div className="g-info">
              <div className="n">{g.name}</div>
              <div className="c">{plural(g.count, 'photo')}</div>
            </div>
          </Link>
        ))}
        {user && (
          <button className="card gal-card hover-lift" style={{ minHeight: 170, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, color: 'var(--text-2)' }} onClick={() => setChooserOpen(true)}>
            <IcPlus size={26} />
            <span style={{ fontWeight: 700 }}>New gallery</span>
            <span className="faint" style={{ fontSize: 12 }}>select photos below, or start empty</span>
          </button>
        )}
      </div>

      {/* library */}
      <SectionHead
        title="All photos"
        icon={<IcFolder size={21} />}
        right={
          <span className="faint" style={{ fontSize: 13 }}>
            {photos ? `${plural(photos.length, 'photo')} · ${bytes(totalBytes)} indexed` : 'loading…'}
          </span>
        }
      />
      <div className="row" style={{ alignItems: 'flex-start', gap: 22 }}>
        <aside style={{ width: 230, flexShrink: 0, position: 'sticky', top: 'calc(var(--header-h) + 16px)' }} className="hide-mobile">
          <button className={`folder-item${folder === '' && view === '' ? ' on' : ''}`} onClick={() => { setFolder(''); setView(''); }}>
            <IcImages size={15} /> Everything
            <span className="cnt">{folders.reduce((s, f) => s + f.count, 0)}</span>
          </button>
          {user && (
            <>
              <button className={`folder-item${view === 'favorites' ? ' on' : ''}`} onClick={() => setView(view === 'favorites' ? '' : 'favorites')}>
                <IcHeart size={15} /> Favorites
              </button>
              <button className={`folder-item${view === 'pinned' ? ' on' : ''}`} onClick={() => setView(view === 'pinned' ? '' : 'pinned')}>
                <IcPin size={15} /> Pinned
              </button>
              <button className={`folder-item${view === 'hidden' ? ' on' : ''}`} onClick={() => setView(view === 'hidden' ? '' : 'hidden')}>
                <IcEyeOff size={15} /> Hidden
              </button>
            </>
          )}
          <div className="faint" style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.13em', textTransform: 'uppercase', padding: '12px 12px 5px' }}>Folders</div>
          {folders.map((f) => (
            <button key={f.folder} className={`folder-item${folder === f.folder ? ' on' : ''}`} onClick={() => setFolder(f.folder === folder ? '' : f.folder)} title={f.folder}>
              <IcFolder size={15} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.folder.split('/').pop()}</span>
              <span className="cnt">{f.count}</span>
            </button>
          ))}
        </aside>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row" style={{ marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
            <div className="search-wrap">
              <IcSearch size={16} />
              <input className="input" placeholder="Search photos, folders, tags…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <select className="input" style={{ width: 'auto', borderRadius: 999, padding: '9px 14px' }} value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort photos">
              <option value="folder">Folder order</option>
              <option value="name">Name A–Z</option>
              <option value="newest">Newest first</option>
              <option value="largest">Largest first</option>
            </select>
            {folder && (
              <span className="chip on" onClick={() => setFolder('')}>
                {folder} <IcX size={12} />
              </span>
            )}
            {view && (
              <span className="chip on" onClick={() => setView('')}>
                {view} <IcX size={12} />
              </span>
            )}
          </div>

          {photos === null ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <SkeletonBlock h={200} />
              <SkeletonBlock h={200} />
            </div>
          ) : (
            <VirtualGrid
              photos={shown}
              selection={user ? selection : undefined}
              onOpen={(i) => setLightbox(i)}
              emptyNode={
                view === 'hidden'
                  ? <Empty emoji="🫥" title="Nothing hidden" sub="Photos you hide land here — select them and unhide any time." />
                  : view
                    ? <Empty emoji="✨" title={`No ${view} yet`} sub="Select photos and use the action bar to add some." />
                    : <Empty emoji="🗂️" title="No photos here" sub="Drop image folders into the library directory on the server, then hit Rescan." />
              }
            />
          )}
        </div>
      </div>

      {user && (
        <SelectionBar
          selection={selection}
          hint="Ctrl+A all · Shift+click range · drag to box-select"
          actions={[
            { key: 'gal', label: 'Add to gallery', icon: <IcPlus size={15} />, onClick: () => setChooserOpen(true) },
            { key: 'pin', label: view === 'pinned' ? 'Unpin' : 'Pin', icon: <IcPin size={15} />, onClick: () => batch({ pinned: view !== 'pinned' }, view === 'pinned' ? 'Unpinned' : 'Pinned') },
            { key: 'fav', label: view === 'favorites' ? 'Unfavorite' : 'Favorite', icon: <IcHeart size={15} />, onClick: () => batch({ favorite: view !== 'favorites' }, view === 'favorites' ? 'Removed from favorites' : 'Favorited') },
            { key: 'share', label: 'Share', icon: <IcShare size={15} />, onClick: shareSelection },
            { key: 'export', label: 'Export ZIP', icon: <IcDownload size={15} />, onClick: exportSelection },
            view === 'hidden'
              ? { key: 'unhide', label: 'Unhide', icon: <IcEye size={15} />, onClick: () => batch({ hidden: false }, 'Back in the library') }
              : { key: 'hide', label: 'Hide', icon: <IcEyeOff size={15} />, onClick: () => batch({ hidden: true }, 'Hidden'), danger: true },
          ]}
        />
      )}

      {lightbox !== null && photos && (
        <Lightbox
          photos={shown}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onIndex={setLightbox}
          canEdit={!!user}
          onRename={rename}
          onTogglePin={togglePin}
          onToggleFavorite={toggleFav}
        />
      )}

      <GalleryChooser open={chooserOpen} onClose={() => setChooserOpen(false)} photoCount={selection.count} onDone={(g) => {
        if (selection.count) addToGallery(g);
        else navigate(`/galleries/${g.id}`);
      }} />
      <ShareResult open={!!share} onClose={() => setShare(null)} url={share?.url || ''} name={share?.name || ''} />
    </div>
  );
}
