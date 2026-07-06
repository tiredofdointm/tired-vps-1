import { useCallback, useMemo, useRef, useState } from 'react';

export interface SelectionApi {
  selected: Set<string>;
  focusId: string | null;
  anchorId: string | null;
  isSelected: (id: string) => boolean;
  clickItem: (id: string, mods: { ctrl: boolean; shift: boolean }) => void;
  toggle: (id: string) => void;
  selectAll: () => void;
  clear: () => void;
  setFocus: (id: string | null) => void;
  focusMove: (id: string, mods: { shift: boolean; ctrl: boolean }) => void;
  marqueeSelect: (ids: string[], additive: boolean) => void;
  marqueeBegin: () => void;
  count: number;
}

/**
 * Windows-Explorer selection semantics over an ordered list of ids:
 *  - click            → select only that item, set anchor
 *  - ctrl/cmd+click   → toggle item, move anchor
 *  - shift+click      → select range anchor→item (replaces)
 *  - ctrl+shift+click → add range anchor→item to selection
 *  - drag on empty    → rubber-band marquee (ctrl = additive)
 *  - ctrl+A / Escape  → all / none
 *  - arrows move focus; shift+arrows extend range from the anchor
 */
export function useSelection(orderedIds: string[]): SelectionApi {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const baseRef = useRef<Set<string>>(new Set());
  const indexOf = useMemo(() => {
    const m = new Map<string, number>();
    orderedIds.forEach((id, i) => m.set(id, i));
    return m;
  }, [orderedIds]);

  const range = useCallback(
    (a: string, b: string) => {
      const ia = indexOf.get(a);
      const ib = indexOf.get(b);
      if (ia === undefined || ib === undefined) return [b];
      const [lo, hi] = ia < ib ? [ia, ib] : [ib, ia];
      return orderedIds.slice(lo, hi + 1);
    },
    [indexOf, orderedIds],
  );

  const clickItem = useCallback(
    (id: string, mods: { ctrl: boolean; shift: boolean }) => {
      setFocusId(id);
      if (mods.shift && anchorId) {
        const ids = range(anchorId, id);
        setSelected((prev) => {
          const next = mods.ctrl ? new Set(prev) : new Set<string>();
          ids.forEach((x) => next.add(x));
          return next;
        });
        return; // anchor stays put for successive shift-clicks
      }
      if (mods.ctrl) {
        setAnchorId(id);
        setSelected((prev) => {
          const next = new Set(prev);
          next.has(id) ? next.delete(id) : next.add(id);
          return next;
        });
        return;
      }
      setAnchorId(id);
      setSelected(new Set([id]));
    },
    [anchorId, range],
  );

  const toggle = useCallback((id: string) => {
    setAnchorId(id);
    setFocusId(id);
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const focusMove = useCallback(
    (id: string, mods: { shift: boolean; ctrl: boolean }) => {
      setFocusId(id);
      if (mods.shift) {
        const a = anchorId ?? id;
        if (!anchorId) setAnchorId(id);
        setSelected(new Set(range(a, id)));
      } else if (!mods.ctrl) {
        setAnchorId(id);
        setSelected(new Set([id]));
      }
    },
    [anchorId, range],
  );

  const selectAll = useCallback(() => {
    setSelected(new Set(orderedIds));
    if (orderedIds.length) {
      setAnchorId(orderedIds[0]);
      setFocusId(orderedIds[orderedIds.length - 1]);
    }
  }, [orderedIds]);

  const clear = useCallback(() => {
    setSelected(new Set());
    setAnchorId(null);
    setFocusId(null);
  }, []);

  const marqueeBegin = useCallback(() => {
    baseRef.current = new Set(selected);
  }, [selected]);

  const marqueeSelect = useCallback((ids: string[], additive: boolean) => {
    setSelected(() => {
      const next = additive ? new Set(baseRef.current) : new Set<string>();
      ids.forEach((id) => next.add(id));
      return next;
    });
    if (ids.length) {
      setAnchorId(ids[0]);
      setFocusId(ids[ids.length - 1]);
    }
  }, []);

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  return {
    selected, focusId, anchorId, isSelected, clickItem, toggle, selectAll, clear,
    setFocus: setFocusId, focusMove, marqueeSelect, marqueeBegin, count: selected.size,
  };
}
