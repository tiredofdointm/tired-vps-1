import React from 'react';
import { IcX } from '../../lib/icons';
import type { SelectionApi } from './useSelection';

export interface SelAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  hidden?: boolean;
}

/** Floating action bar that appears while photos are selected. */
export function SelectionBar({ selection, actions, hint }: { selection: SelectionApi; actions: SelAction[]; hint?: string }) {
  if (selection.count === 0) return null;
  return (
    <div className="selbar" role="toolbar" aria-label="Selection actions">
      <span className="count">{selection.count} selected</span>
      {actions.filter((a) => !a.hidden).map((a) => (
        <button key={a.key} className={`sb-btn${a.danger ? ' danger' : ''}`} onClick={a.onClick} disabled={a.disabled}>
          {a.icon}
          {a.label}
        </button>
      ))}
      <span className="sb-sep" />
      {hint && <span className="faint" style={{ fontSize: 11.5, padding: '0 6px', whiteSpace: 'nowrap' }}>{hint}</span>}
      <button className="sb-btn" onClick={selection.clear} aria-label="Clear selection">
        <IcX size={15} />
      </button>
    </div>
  );
}
