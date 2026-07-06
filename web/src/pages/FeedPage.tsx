import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { Photo, Post } from '../lib/types';
import { useApp } from '../lib/store';
import { ago } from '../lib/format';
import { IcArrowRight, IcFeed, IcHeart, IcImages, IcX } from '../lib/icons';
import { Avatar, SkeletonBlock, thumbUrl } from '../components/ui';
import { Lightbox } from '../components/gallery/Lightbox';
import { PhotoPicker } from '../components/gallery/modals';

export function FeedPage() {
  const { user, toast } = useApp();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [text, setText] = useState('');
  const [attach, setAttach] = useState<string[]>([]);
  const [pickOpen, setPickOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [viewer, setViewer] = useState<{ photos: Photo[]; index: number } | null>(null);
  const [photoCache, setPhotoCache] = useState<Map<string, Photo>>(new Map());

  useEffect(() => {
    api.get<{ posts: Post[] }>('/api/feed').then((r) => setPosts(r.posts)).catch(() => setPosts([]));
    api.get<{ items: Photo[] }>('/api/media').then((r) => {
      setPhotoCache(new Map(r.items.map((p) => [p.id, p])));
    }).catch(() => undefined);
  }, []);

  const like = async (post: Post) => {
    if (!user) return toast('Sign in to like posts', 'err');
    setPosts((ps) => ps?.map((p) => (p.id === post.id ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p)) ?? null);
    try {
      await api.post(`/api/feed/${post.id}/like`);
    } catch {
      setPosts((ps) => ps?.map((p) => (p.id === post.id ? { ...p, liked: post.liked, likes: post.likes } : p)) ?? null);
    }
  };

  const publish = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const { post } = await api.post<{ post: Post }>('/api/feed', { text, photoIds: attach });
      setPosts((ps) => [post, ...(ps || [])]);
      setText('');
      setAttach([]);
      toast('Posted to the feed', 'ok');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Post failed', 'err');
    } finally {
      setBusy(false);
    }
  };

  const openViewer = (ids: string[], index: number) => {
    const photos = ids.map((id) => photoCache.get(id)).filter(Boolean) as Photo[];
    if (photos.length) setViewer({ photos, index: Math.min(index, photos.length - 1) });
  };

  return (
    <div className="page">
      <div className="feed-col">
        <div>
          <span className="pill-note"><IcFeed size={13} /> The wire</span>
          <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, marginTop: 8 }}>Feed</h1>
        </div>

        {user && (
          <div className="card" style={{ padding: 18 }}>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <Avatar name={user.name} imageId={user.avatarId} size={40} />
              <textarea
                className="input"
                placeholder="What's happening on your floor?"
                value={text}
                onChange={(e) => setText(e.target.value)}
                style={{ minHeight: 64 }}
                maxLength={2000}
              />
            </div>
            {attach.length > 0 && (
              <div className="row" style={{ marginTop: 10, gap: 8, flexWrap: 'wrap' }}>
                {attach.map((id) => (
                  <div key={id} style={{ position: 'relative' }}>
                    <img src={thumbUrl(id, 240)} alt="" style={{ width: 74, height: 54, borderRadius: 9, objectFit: 'cover' }} />
                    <button
                      className="icon-btn"
                      style={{ position: 'absolute', top: -7, right: -7, width: 22, height: 22, background: 'var(--bg-2)', border: '1px solid var(--stroke-2)' }}
                      onClick={() => setAttach((a) => a.filter((x) => x !== id))}
                      aria-label="Remove photo"
                    >
                      <IcX size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="spread" style={{ marginTop: 12 }}>
              <button className="btn ghost sm" onClick={() => setPickOpen(true)}>
                <IcImages size={15} /> Photos {attach.length ? `(${attach.length})` : ''}
              </button>
              <button className="btn primary" onClick={publish} disabled={busy || !text.trim()}>
                {busy ? <span className="spin" /> : 'Post'}
              </button>
            </div>
          </div>
        )}

        {posts === null && <><SkeletonBlock h={180} /><SkeletonBlock h={220} /></>}
        {posts?.map((post) => (
          <article key={post.id} className="card post">
            <div className="p-head">
              <Avatar name={post.authorName} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 750 }}>{post.authorName}</div>
                <div className="faint" style={{ fontSize: 12 }}>{ago(post.createdAt)}</div>
              </div>
              {post.event && (
                <Link to={`/events/${post.event.slug}`} className="chip">
                  {post.event.title} <IcArrowRight size={12} />
                </Link>
              )}
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.6 }}>{post.text}</p>
            {post.photoIds.length > 0 && (
              <div className={`p-photos n${Math.min(4, post.photoIds.length)}`}>
                {post.photoIds.slice(0, 4).map((id, i) => (
                  <div key={id} className="pp" onClick={() => openViewer(post.photoIds, i)}>
                    <img src={thumbUrl(id, 720)} alt="" loading="lazy" />
                    {i === 3 && post.photoIds.length > 4 && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,4,10,0.6)', fontWeight: 850, fontSize: 22 }}>
                        +{post.photoIds.length - 4}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="row" style={{ marginTop: 12 }}>
              <button className={`like-btn${post.liked ? ' on' : ''}`} onClick={() => like(post)}>
                <IcHeart size={16} style={post.liked ? { fill: 'currentColor' } : undefined} />
                {post.likes}
              </button>
            </div>
          </article>
        ))}
        {posts?.length === 0 && (
          <div className="empty">
            <div className="big">📻</div>
            <div style={{ fontWeight: 750, fontSize: 17, color: 'var(--text)' }}>Silence on the wire</div>
            <div>No posts yet — be the first voice.</div>
          </div>
        )}
      </div>

      {viewer && (
        <Lightbox photos={viewer.photos} index={viewer.index} onClose={() => setViewer(null)} onIndex={(i) => setViewer((v) => (v ? { ...v, index: i } : v))} />
      )}
      <PhotoPicker open={pickOpen} onClose={() => setPickOpen(false)} initial={attach} onConfirm={setAttach} title="Attach photos" confirmLabel="Attach" />
    </div>
  );
}
