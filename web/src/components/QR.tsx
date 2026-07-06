import React, { useMemo } from 'react';

/** Decorative scan-style code rendered from a ticket string (stable per code). */
export function TicketQR({ code, size = 84 }: { code: string; size?: number }) {
  const cells = useMemo(() => {
    // xorshift from code chars → deterministic 21×21 pattern with finder squares
    let s = [...code].reduce((h, c) => (Math.imul(h, 33) + c.charCodeAt(0)) >>> 0, 5381) || 1;
    const rnd = () => {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
    const n = 21;
    const grid: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false));
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) grid[y][x] = rnd() > 0.52;
    const finder = (ox: number, oy: number) => {
      for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
        const edge = x === 0 || y === 0 || x === 6 || y === 6;
        const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        grid[oy + y][ox + x] = edge || core;
      }
      for (let i = -1; i <= 7; i++) {
        const gx = ox + i, gy1 = oy - 1, gy2 = oy + 7;
        if (grid[gy1]?.[gx] !== undefined) grid[gy1][gx] = false;
        if (grid[gy2]?.[gx] !== undefined) grid[gy2][gx] = false;
        const gy = oy + i, gx1 = ox - 1, gx2 = ox + 7;
        if (grid[gy]?.[gx1] !== undefined) grid[gy][gx1] = false;
        if (grid[gy]?.[gx2] !== undefined) grid[gy][gx2] = false;
      }
    };
    finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
    return grid;
  }, [code]);

  const n = cells.length;
  return (
    <svg className="qr" width={size} height={size} viewBox={`0 0 ${n} ${n}`} role="img" aria-label={`Ticket code ${code}`}>
      <rect width={n} height={n} fill="#fff" />
      {cells.flatMap((row, y) =>
        row.map((on, x) => (on ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#0b0714" /> : null)),
      )}
    </svg>
  );
}
