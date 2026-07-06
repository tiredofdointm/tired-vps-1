import React, { useEffect, useMemo, useRef, useState } from 'react';
import { thumbUrl } from '../lib/api';

/**
 * Crossfades through multiple cover photos with an optional Ken Burns drift.
 * Only mounts the current + next image, so a rotation of 10 covers never
 * loads more than two files at a time.
 */
export function CoverCycler({
  ids,
  interval = 5200,
  kenburns = true,
  dots = false,
  width = 960,
  className = '',
  style,
  paused,
  alt = '',
}: {
  ids: string[];
  interval?: number;
  kenburns?: boolean;
  dots?: boolean;
  width?: number;
  className?: string;
  style?: React.CSSProperties;
  paused?: boolean;
  alt?: string;
}) {
  const list = useMemo(() => [...new Set(ids)].filter(Boolean), [ids.join(',')]);
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const hostRef = useRef<HTMLDivElement | null>(null);

  // pause rotation entirely while off-screen — no work for what you can't see
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '80px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (list.length < 2 || paused || !visible) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % list.length), interval);
    return () => clearInterval(t);
  }, [list.length, interval, paused, visible]);

  useEffect(() => {
    if (idx >= list.length) setIdx(0);
  }, [list.length, idx]);

  if (!list.length) {
    return <div className={`cycler ${className}`} style={style} ref={hostRef} />;
  }

  const next = (idx + 1) % list.length;
  return (
    <div className={`cycler ${kenburns ? 'kb ' : ''}${className}`} style={style} ref={hostRef}>
      {list.map((id, i) => {
        if (i !== idx && i !== next && list.length > 2) return null;
        return (
          <img
            key={id}
            className={`cy-img${i === idx ? ' on' : ''}`}
            src={thumbUrl(id, width)}
            alt={i === idx ? alt : ''}
            loading={i === idx ? 'eager' : 'lazy'}
            draggable={false}
          />
        );
      })}
      {dots && list.length > 1 && (
        <div className="cy-dots">
          {list.map((id, i) => (
            <i key={id} className={i === idx ? 'on' : ''} onClick={(e) => { e.stopPropagation(); setIdx(i); }} />
          ))}
        </div>
      )}
    </div>
  );
}
