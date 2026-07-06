import React, { useRef, useState } from 'react';
import type { Photo } from '../../lib/types';
import { thumbUrl } from '../../lib/api';
import { IcChevronDown, IcGrip, IcPlus, IcTrash } from '../../lib/icons';
import { CoverCycler } from '../CoverCycler';
import { PhotoPicker } from './modals';

/**
 * Manage a cover rotation: live cycling preview, drag to reorder,
 * add / remove photos. Purely metadata — files never move.
 */
export function CoverManager({
  ids,
  onChange,
  source,
  max = 10,
  emptyHint = 'No covers yet — add a few photos and they will cycle automatically.',
}: {
  ids: string[];
  onChange: (ids: string[]) => void;
  source?: Photo[];
  max?: number;
  emptyHint?: string;
}) {
  const [pickOpen, setPickOpen] = useState(false);
  const dragIdx = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<{ idx: number; below: boolean } | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= ids.length) return;
    const next = [...ids];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  const onDrop = (idx: number, below: boolean) => {
    const from = dragIdx.current;
    setDragOver(null);
    setDraggingIdx(null);
    dragIdx.current = null;
    if (from === null || from === undefined) return;
    let to = idx + (below ? 1 : 0);
    if (from < to) to -= 1;
    move(from, to);
  };

  return (
    <div>
      <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--stroke)', marginBottom: 16 }}>
        <CoverCycler ids={ids} interval={2600} dots style={{ aspectRatio: '21/8' }} />
        {!ids.length && (
          <div className="muted" style={{ padding: '34px 20px', textAlign: 'center', fontSize: 13.5 }}>{emptyHint}</div>
        )}
      </div>

      {ids.map((id, i) => (
        <div
          key={id}
          className={`cover-row${draggingIdx === i ? ' dragging' : ''}${dragOver?.idx === i ? (dragOver.below ? ' drop-below' : ' drop-above') : ''}`}
          draggable
          onDragStart={(e) => {
            dragIdx.current = i;
            setDraggingIdx(i);
            e.dataTransfer.effectAllowed = 'move';
          }}
          onDragEnd={() => { setDraggingIdx(null); setDragOver(null); dragIdx.current = null; }}
          onDragOver={(e) => {
            e.preventDefault();
            const rect = e.currentTarget.getBoundingClientRect();
            setDragOver({ idx: i, below: e.clientY > rect.top + rect.height / 2 });
          }}
          onDragLeave={() => setDragOver((d) => (d?.idx === i ? null : d))}
          onDrop={(e) => { e.preventDefault(); onDrop(i, e.clientY > e.currentTarget.getBoundingClientRect().top + e.currentTarget.getBoundingClientRect().height / 2); }}
        >
          <span className="grip"><IcGrip size={16} /></span>
          <span className="ord">{i + 1}</span>
          <img src={thumbUrl(id, 240)} alt="" />
          <div style={{ flex: 1 }} />
          <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => move(i, i - 1)} disabled={i === 0} aria-label="Move up">
            <IcChevronDown size={14} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => move(i, i + 1)} disabled={i === ids.length - 1} aria-label="Move down">
            <IcChevronDown size={14} />
          </button>
          <button className="icon-btn" style={{ width: 30, height: 30, color: 'var(--bad)' }} onClick={() => onChange(ids.filter((x) => x !== id))} aria-label="Remove">
            <IcTrash size={14} />
          </button>
        </div>
      ))}

      <button className="btn" style={{ width: '100%', marginTop: 6 }} onClick={() => setPickOpen(true)} disabled={ids.length >= max}>
        <IcPlus size={15} /> Add photos {ids.length >= max ? `(max ${max})` : ''}
      </button>

      <PhotoPicker
        open={pickOpen}
        onClose={() => setPickOpen(false)}
        initial={ids}
        source={source}
        title="Choose cover photos"
        confirmLabel="Set covers"
        onConfirm={(sel) => onChange(sel.slice(0, max))}
      />
    </div>
  );
}
