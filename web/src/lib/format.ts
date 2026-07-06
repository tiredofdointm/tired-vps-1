export const money = (n: number) =>
  n === 0 ? 'Free' : `$${n.toLocaleString(undefined, { minimumFractionDigits: n % 1 ? 2 : 0 })}`;

export const dateShort = (ms: number) =>
  new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export const dateLong = (ms: number) =>
  new Date(ms).toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });

export const time = (ms: number) =>
  new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

export const dateTime = (ms: number) => `${dateLong(ms)} · ${time(ms)}`;

export function ago(ms: number): string {
  const s = Math.max(1, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return dateShort(ms - 0);
}

export function untilParts(ms: number) {
  const diff = Math.max(0, ms - Date.now());
  return {
    days: Math.floor(diff / 864e5),
    hours: Math.floor((diff % 864e5) / 36e5),
    mins: Math.floor((diff % 36e5) / 6e4),
    secs: Math.floor((diff % 6e4) / 1e3),
  };
}

export const bytes = (n: number) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
};

export const km = (n: number) => (n < 1 ? `${Math.round(n * 1000)} m` : `${n.toFixed(n < 20 ? 1 : 0)} km`);

export const initials = (name: string) =>
  name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
