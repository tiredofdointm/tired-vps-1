import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Photo } from '../../lib/types';
import { thumbUrl } from '../../lib/api';
import { IcCheck, IcHeart, IcPin } from '../../lib/icons';
import type { SelectionApi } from './useSelection';

interface Rect { id: string; idx: number; x: number; y: number; w: number; h: number; row: number }

interface Layout { rects: Rect[]; rowTops: number[]; totalH: number }

function computeLayout(photos: Photo[], width: number, targetH: number, gap: number): Layout {
  const rects: Rect[] = [];
  const rowTops: number[] = [];
  if (!width || !photos.length) return { rects, rowTops, totalH: 0 };
  let y = 0;
  let row: { photo: Photo; aspect: number; idx: number }[] = [];
  let aspectSum = 0;
  let rowIdx = 0;

  const flush = (last: boolean) => {
    if (!row.length) return;
    const gaps = gap * (row.length - 1);
    let h = (width - gaps) / aspectSum;
    if (last) h = Math.min(h, targetH * 1.25);
    h = Math.min(h, targetH * 1.9);
    let x = 0;
    rowTops.push(y);
    for (const cell of row) {
      const w = cell.aspect * h;
      rects.push({ id: cell.photo.id, idx: cell.idx, x, y, w, h, row: rowIdx });
      x += w + gap;
    }
    y += h + gap;
    rowIdx += 1;
    row = [];
    aspectSum = 0;
  };

  photos.forEach((photo, idx) => {
    const aspect = Math.min(3, Math.max(0.42, (photo.w || 3) / (photo.h || 2)));
    row.push({ photo, aspect, idx });
    aspectSum += aspect;
    const h = (width - gap * (row.length - 1)) / aspectSum;
    if (h <= targetH) flush(false);
  });
  flush(true);
  return { rects, rowTops, totalH: Math.max(0, y - gap) };
}

const bucket = (w: number) => (w <= 240 ? 240 : w <= 480 ? 480 : w <= 960 ? 960 : 1600);

/**
 * Justified photo grid that only renders the rows in (and near) the viewport,
 * so a 10,000-photo library scrolls without ever mounting more than a couple
 * dozen images. Full Explorer-style selection when a SelectionApi is passed.
 */
export function VirtualGrid({
  photos,
  selection,
  onOpen,
  targetRowHeight = 225,
  gap = 8,
  showLabels = true,
  emptyNode,
}: {
  photos: Photo[];
  selection?: SelectionApi;
  onOpen?: (index: number) => void;
  targetRowHeight?: number;
  gap?: number;
  showLabels?: boolean;
  emptyNode?: React.ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [wrapEl, setWrapEl] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const attachWrap = useCallback((el: HTMLDivElement | null) => {
    wrapRef.current = el;
    setWrapEl(el);
  }, []);
  const [range, setRange] = useState<[number, number]>([0, 40]);
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; additive: boolean; moved: boolean; pointerId: number; fromCell: boolean } | null>(null);
  const autoScrollRef = useRef(0);
  const suppressClickRef = useRef(false);

  const layout = useMemo(
    () => computeLayout(photos, width, targetRowHeight, gap),
    [photos, width, targetRowHeight, gap],
  );
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  // ref-callback attachment: survives the wrap element mounting late or remounting
  useLayoutEffect(() => {
    if (!wrapEl) return;
    const ro = new ResizeObserver(() => setWidth(wrapEl.clientWidth));
    ro.observe(wrapEl);
    setWidth(wrapEl.clientWidth);
    return () => ro.disconnect();
  }, [wrapEl]);

  // ---- windowing: compute visible row range from window scroll ----
  const updateRange = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const { rowTops, rects } = layoutRef.current;
    if (!rects.length) return;
    const rect = el.getBoundingClientRect();
    const viewTop = -rect.top - 600; // 600px overscan each side
    const viewBottom = -rect.top + window.innerHeight + 600;
    let lo = 0;
    let hi = rowTops.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (rowTops[mid] < viewTop) lo = mid + 1;
      else hi = mid;
    }
    const firstRow = Math.max(0, lo - 1);
    let lastRow = firstRow;
    while (lastRow < rowTops.length - 1 && rowTops[lastRow + 1] < viewBottom) lastRow++;
    setRange((prev) => (prev[0] === firstRow && prev[1] === lastRow ? prev : [firstRow, lastRow]));
  }, []);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateRange);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    updateRange();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [updateRange, layout]);

  const visible = useMemo(
    () => layout.rects.filter((r) => r.row >= range[0] && r.row <= range[1]),
    [layout, range],
  );

  // ---- marquee ----
  const contentPoint = (e: { clientX: number; clientY: number }) => {
    const rect = wrapRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!selection || e.button !== 0) return;
    if ((e.target as HTMLElement).closest('.check')) return; // checkbox toggles, never drags
    const pt = contentPoint(e);
    const fromCell = !!(e.target as HTMLElement).closest('.vcell');
    dragRef.current = { startX: pt.x, startY: pt.y, additive: e.ctrlKey || e.metaKey, moved: false, pointerId: e.pointerId, fromCell };
    selection.marqueeBegin();
    // pointer capture waits until real movement so click/dblclick stay native
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || !selection) return;
    const pt = contentPoint(e);
    if (!drag.moved && Math.hypot(pt.x - drag.startX, pt.y - drag.startY) < 7) return;
    if (!drag.moved) {
      try { (e.currentTarget as HTMLElement).setPointerCapture(drag.pointerId); } catch { /* touch may refuse */ }
    }
    drag.moved = true;
    const box = {
      x: Math.min(drag.startX, pt.x),
      y: Math.min(drag.startY, pt.y),
      w: Math.abs(pt.x - drag.startX),
      h: Math.abs(pt.y - drag.startY),
    };
    setMarquee(box);
    const hits: string[] = [];
    for (const r of layoutRef.current.rects) {
      if (r.x < box.x + box.w && r.x + r.w > box.x && r.y < box.y + box.h && r.y + r.h > box.y) hits.push(r.id);
    }
    selection.marqueeSelect(hits, drag.additive);

    // edge autoscroll
    cancelAnimationFrame(autoScrollRef.current);
    const margin = 80;
    const speed = (dist: number) => Math.ceil(((margin - dist) / margin) * 22);
    const step = () => {
      if (!dragRef.current?.moved) return;
      if (e.clientY < margin) window.scrollBy(0, -speed(e.clientY));
      else if (window.innerHeight - e.clientY < margin) window.scrollBy(0, speed(window.innerHeight - e.clientY));
      else return;
      autoScrollRef.current = requestAnimationFrame(step);
    };
    step();
  };

  const endDrag = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    dragRef.current = null;
    cancelAnimationFrame(autoScrollRef.current);
    setMarquee(null);
    if (!drag || !selection) return;
    if (drag.moved) {
      suppressClickRef.current = true;
      setTimeout(() => (suppressClickRef.current = false), 0);
    } else if (!drag.additive && !drag.fromCell) {
      selection.clear(); // plain click on empty space
    }
    try { (e.currentTarget as HTMLElement).releasePointerCapture(drag.pointerId); } catch { /* released */ }
  };

  // ---- keyboard ----
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!selection) return;
    const { rects } = layout;
    if (!rects.length) return;
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && (e.key === 'a' || e.key === 'A')) {
      e.preventDefault();
      selection.selectAll();
      return;
    }
    if (e.key === 'Escape') {
      selection.clear();
      return;
    }
    const currentIdx = selection.focusId ? rects.findIndex((r) => r.id === selection.focusId) : -1;
    const current = currentIdx >= 0 ? rects[currentIdx] : null;
    if ((e.key === 'Enter' || e.key === ' ') && current) {
      e.preventDefault();
      if (e.key === ' ') selection.toggle(current.id);
      else onOpen?.(current.idx);
      return;
    }
    const move = (target: Rect | null | undefined) => {
      if (!target) return;
      e.preventDefault();
      selection.focusMove(target.id, { shift: e.shiftKey, ctrl });
      scrollToRect(target);
    };
    const nearestInRow = (row: number, cx: number) => {
      const cand = rects.filter((r) => r.row === row);
      if (!cand.length) return null;
      return cand.reduce((best, r) =>
        Math.abs(r.x + r.w / 2 - cx) < Math.abs(best.x + best.w / 2 - cx) ? r : best);
    };
    switch (e.key) {
      case 'ArrowRight': move(current ? rects[currentIdx + 1] : rects[0]); break;
      case 'ArrowLeft': move(current ? rects[currentIdx - 1] : rects[0]); break;
      case 'ArrowDown': move(current ? nearestInRow(current.row + 1, current.x + current.w / 2) : rects[0]); break;
      case 'ArrowUp': move(current ? nearestInRow(current.row - 1, current.x + current.w / 2) : rects[0]); break;
      case 'Home': move(rects[0]); break;
      case 'End': move(rects[rects.length - 1]); break;
      default: break;
    }
  };

  const scrollToRect = (r: Rect) => {
    const el = wrapRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY + r.y;
    const viewTop = window.scrollY + 90;
    const viewBottom = window.scrollY + window.innerHeight - 40;
    if (top < viewTop) window.scrollTo({ top: top - 100, behavior: 'smooth' });
    else if (top + r.h > viewBottom) window.scrollTo({ top: top + r.h - window.innerHeight + 60, behavior: 'smooth' });
  };

  const photoAt = useMemo(() => {
    const m = new Map<string, Photo>();
    photos.forEach((p) => m.set(p.id, p));
    return m;
  }, [photos]);

  return (
    <div
      ref={attachWrap}
      className={`vgrid-wrap${selection && selection.count > 0 ? ' selecting' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="grid"
      aria-label="Photo grid"
    >
      {!photos.length && emptyNode}
      <div className="vgrid" style={{ height: layout.totalH }}>
        {visible.map((r) => {
          const photo = photoAt.get(r.id);
          if (!photo) return null;
          return (
            <Cell
              key={r.id}
              rect={r}
              photo={photo}
              selected={selection?.isSelected(r.id) ?? false}
              focused={selection?.focusId === r.id}
              showLabel={showLabels}
              onClick={(e) => {
                if (suppressClickRef.current || !selection) return;
                selection.clickItem(r.id, { ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey });
              }}
              onDouble={() => onOpen?.(r.idx)}
              onCheck={() => selection?.toggle(r.id)}
            />
          );
        })}
        {marquee && <div className="marquee-box" style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h }} />}
      </div>
    </div>
  );
}

const Cell = React.memo(function Cell({
  rect, photo, selected, focused, showLabel, onClick, onDouble, onCheck,
}: {
  rect: Rect;
  photo: Photo;
  selected: boolean;
  focused: boolean;
  showLabel: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDouble: () => void;
  onCheck: () => void;
}) {
  const dpr = typeof devicePixelRatio === 'number' ? Math.min(devicePixelRatio, 2) : 1;
  return (
    <div
      className={`vcell${selected ? ' selected' : ''}${focused ? ' focused' : ''}`}
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
      onClick={onClick}
      onDoubleClick={onDouble}
      role="gridcell"
      aria-selected={selected}
      title={photo.name}
    >
      <img
        src={thumbUrl(photo.id, bucket(rect.w * dpr))}
        alt={photo.name}
        loading="lazy"
        draggable={false}
        onLoad={(e) => e.currentTarget.classList.add('loaded')}
      />
      <button
        className="check"
        onClick={(e) => { e.stopPropagation(); onCheck(); }}
        onDoubleClick={(e) => e.stopPropagation()}
        aria-label={selected ? 'Deselect' : 'Select'}
        tabIndex={-1}
      >
        {selected && <IcCheck size={13} />}
      </button>
      {photo.pinned && <span className="pin-flag" title="Pinned"><IcPin size={14} /></span>}
      {photo.favorite && <span className="fav-flag" title="Favorite"><IcHeart size={13} style={{ fill: 'currentColor' }} /></span>}
      {showLabel && (
        <span className="label">
          {photo.name}
          {photo.renamed && <span className="orig">{photo.originalName}</span>}
        </span>
      )}
    </div>
  );
});
