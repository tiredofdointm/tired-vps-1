import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { fileUrl, thumbUrl } from '../lib/api';
import { initials } from '../lib/format';
import { useApp } from '../lib/store';
import { IcArrowRight, IcX } from '../lib/icons';

export function Avatar({ name, imageId, size = 36, clickable }: { name: string; imageId?: string | null; size?: number; clickable?: boolean }) {
  return (
    <div className={`avatar${clickable ? ' clickable' : ''}`} style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {imageId ? <img src={thumbUrl(imageId, 240)} alt={name} loading="lazy" /> : initials(name)}
    </div>
  );
}

export function Modal({ open, onClose, wide, xwide, children }: { open: boolean; onClose: () => void; wide?: boolean; xwide?: boolean; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="modal-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal${wide ? ' wide' : ''}${xwide ? ' xwide' : ''}`} role="dialog" aria-modal>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function ModalHead({ title, sub, onClose }: { title: React.ReactNode; sub?: React.ReactNode; onClose: () => void }) {
  return (
    <div className="spread" style={{ marginBottom: 18, alignItems: 'flex-start' }}>
      <div>
        <h3>{title}</h3>
        {sub && <div className="sub">{sub}</div>}
      </div>
      <button className="icon-btn" onClick={onClose} aria-label="Close">
        <IcX />
      </button>
    </div>
  );
}

export function Toasts() {
  const { toasts } = useApp();
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind === 'ok' ? 'ok' : t.kind === 'err' ? 'err' : ''}`}>
          <span className="dot" />
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function SectionHead({ title, icon, moreTo, moreLabel, right }: { title: React.ReactNode; icon?: React.ReactNode; moreTo?: string; moreLabel?: string; right?: React.ReactNode }) {
  return (
    <div className="sec-head">
      <h2>
        {icon}
        {title}
      </h2>
      {right}
      {moreTo && (
        <Link className="more" to={moreTo}>
          {moreLabel || 'View all'} <IcArrowRight size={15} />
        </Link>
      )}
    </div>
  );
}

export function Empty({ emoji, title, sub, cta }: { emoji: string; title: string; sub?: string; cta?: React.ReactNode }) {
  return (
    <div className="empty">
      <div className="big">{emoji}</div>
      <div style={{ fontWeight: 750, fontSize: 17, color: 'var(--text)' }}>{title}</div>
      {sub && <div style={{ maxWidth: 420 }}>{sub}</div>}
      {cta}
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" className={`toggle${on ? ' on' : ''}`} role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}>
      <i />
    </button>
  );
}

export function SkeletonBlock({ h = 120, r = 16, style }: { h?: number; r?: number; style?: React.CSSProperties }) {
  return <div className="skeleton" style={{ height: h, borderRadius: r, ...style }} />;
}

export function CoverImg({ id, w = 480, alt = '', ...rest }: { id: string; w?: number; alt?: string } & React.ImgHTMLAttributes<HTMLImageElement>) {
  return <img src={thumbUrl(id, w)} alt={alt} loading="lazy" {...rest} />;
}

export { fileUrl, thumbUrl };
