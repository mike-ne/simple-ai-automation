import { describe, it, expect } from 'vitest';
import {
  hexNeighbors,
  hexDistance,
  generateHexGrid,
  hexToPixel,
  pixelToHex,
} from '../src/hex.js';

describe('hexNeighbors', () => {
  it('returns exactly 6 neighbors for any cell', () => {
    expect(hexNeighbors(0, 0)).toHaveLength(6);
    expect(hexNeighbors(3, -2)).toHaveLength(6);
  });

  it('neighbors of origin are all distance-1 cells', () => {
    const origin = { q: 0, r: 0 };
    for (const n of hexNeighbors(0, 0)) {
      expect(hexDistance(origin, n)).toBe(1);
    }
  });

  it('returns correct neighbor set for origin', () => {
    const neighbors = hexNeighbors(0, 0);
    const expected = [
      { q: 1, r: 0 },
      { q: 1, r: -1 },
      { q: 0, r: -1 },
      { q: -1, r: 0 },
      { q: -1, r: 1 },
      { q: 0, r: 1 },
    ];
    for (const e of expected) {
      expect(neighbors).toContainEqual(e);
    }
  });
});

describe('hexDistance', () => {
  it('distance from a cell to itself is 0', () => {
    expect(hexDistance({ q: 2, r: -1 }, { q: 2, r: -1 })).toBe(0);
  });

  it('distance from origin to direct neighbor is 1', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 1, r: 0 })).toBe(1);
    expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 1 })).toBe(1);
  });

  it('distance is symmetric', () => {
    const a = { q: 2, r: -3 };
    const b = { q: -1, r: 2 };
    expect(hexDistance(a, b)).toBe(hexDistance(b, a));
  });

  it('computes a known distance correctly', () => {
    // (0,0) to (2,0): q diff=2, r diff=0, s diff=2 → max=2
    expect(hexDistance({ q: 0, r: 0 }, { q: 2, r: 0 })).toBe(2);
  });
});

describe('generateHexGrid', () => {
  it('radius 0 produces exactly 1 cell (just the origin)', () => {
    const cells = generateHexGrid(0);
    expect(cells).toHaveLength(1);
    expect(cells[0]).toEqual({ q: 0, r: 0 });
  });

  it('radius 1 produces exactly 7 cells', () => {
    expect(generateHexGrid(1)).toHaveLength(7);
  });

  it('radius 4 produces exactly 61 cells (Easy board)', () => {
    expect(generateHexGrid(4)).toHaveLength(61);
  });

  it('radius 6 produces exactly 127 cells (Medium board)', () => {
    expect(generateHexGrid(6)).toHaveLength(127);
  });

  it('radius 8 produces exactly 217 cells (Hard board)', () => {
    expect(generateHexGrid(8)).toHaveLength(217);
  });

  it('all cells satisfy q+r+s=0', () => {
    for (const { q, r } of generateHexGrid(4)) {
      const s = -q - r;
      expect(q + r + s).toBe(0);
    }
  });

  it('all cells are within radius distance of origin', () => {
    const radius = 4;
    for (const cell of generateHexGrid(radius)) {
      expect(hexDistance({ q: 0, r: 0 }, cell)).toBeLessThanOrEqual(radius);
    }
  });

  it('matches the formula 3N²+3N+1', () => {
    for (let n = 0; n <= 8; n++) {
      expect(generateHexGrid(n)).toHaveLength(3 * n * n + 3 * n + 1);
    }
  });
});

describe('hexToPixel / pixelToHex round-trip', () => {
  it('pixel->hex->pixel round-trip is identity for grid centers', () => {
    const size = 30;
    for (const { q, r } of generateHexGrid(3)) {
      const { x, y } = hexToPixel(q, r, size);
      const { q: q2, r: r2 } = pixelToHex(x, y, size);
      expect(q2).toBe(q);
      expect(r2).toBe(r);
    }
  });

  it('origin maps to (0, 0)', () => {
    const { x, y } = hexToPixel(0, 0, 30);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(0);
  });
});

describe('hex adjacency model', () => {
  it('interior cell (origin in radius-4 grid) has 6 valid neighbors', () => {
    const grid = generateHexGrid(4);
    const gridSet = new Set(grid.map((c) => `${c.q},${c.r}`));
    const neighbors = hexNeighbors(0, 0).filter((n) => gridSet.has(`${n.q},${n.r}`));
    expect(neighbors).toHaveLength(6);
  });

  it('edge cells (radius=4, distance=4) have fewer than 6 valid neighbors', () => {
    const radius = 4;
    const grid = generateHexGrid(radius);
    const gridSet = new Set(grid.map((c) => `${c.q},${c.r}`));
    const edgeCells = grid.filter((c) => hexDistance({ q: 0, r: 0 }, c) === radius);

    for (const cell of edgeCells) {
      const validNeighbors = hexNeighbors(cell.q, cell.r).filter((n) =>
        gridSet.has(`${n.q},${n.r}`)
      );
      expect(validNeighbors.length).toBeLessThan(6);
    }
  });

  it('no cell reports more than 6 valid neighbors', () => {
    const grid = generateHexGrid(6);
    const gridSet = new Set(grid.map((c) => `${c.q},${c.r}`));
    for (const cell of grid) {
      const count = hexNeighbors(cell.q, cell.r).filter((n) =>
        gridSet.has(`${n.q},${n.r}`)
      ).length;
      expect(count).toBeLessThanOrEqual(6);
    }
  });
});
