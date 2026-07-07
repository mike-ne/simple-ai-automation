/**
 * Hex coordinate system using cube coordinates (q, r, s where q+r+s=0).
 * Pointy-top hexagon orientation.
 */

// The 6 neighbor direction vectors in cube coordinates (pointy-top)
const HEX_DIRECTIONS = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

/**
 * Returns the 6 cube-coordinate neighbors of (q, r).
 * @param {number} q
 * @param {number} r
 * @returns {{q: number, r: number}[]}
 */
export function hexNeighbors(q, r) {
  return HEX_DIRECTIONS.map((d) => ({ q: q + d.q, r: r + d.r }));
}

/**
 * Chebyshev distance in cube space between two hex cells.
 * @param {{q: number, r: number}} a
 * @param {{q: number, r: number}} b
 * @returns {number}
 */
export function hexDistance(a, b) {
  return Math.max(
    Math.abs(a.q - b.q),
    Math.abs(a.r - b.r),
    Math.abs((-a.q - a.r) - (-b.q - b.r))
  );
}

/**
 * Generates all hex cells within `radius` rings of the origin.
 * A radius-N hex grid contains 3N² + 3N + 1 cells.
 * @param {number} radius
 * @returns {{q: number, r: number}[]}
 */
export function generateHexGrid(radius) {
  const cells = [];
  for (let q = -radius; q <= radius; q++) {
    const rMin = Math.max(-radius, -q - radius);
    const rMax = Math.min(radius, -q + radius);
    for (let r = rMin; r <= rMax; r++) {
      // Use +0 to avoid -0 from Math.max/min on negative radius values
      cells.push({ q: q || 0, r: r || 0 });
    }
  }
  return cells;
}

/**
 * Converts hex cube coordinates to pixel center (pointy-top layout).
 * @param {number} q
 * @param {number} r
 * @param {number} size  - hex "radius" (center to vertex)
 * @returns {{x: number, y: number}}
 */
export function hexToPixel(q, r, size) {
  const x = size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
  const y = size * (3 / 2) * r;
  return { x, y };
}

/**
 * Converts pixel coordinates to the nearest hex (pointy-top layout).
 * Returns cube coordinates {q, r}.
 * @param {number} x
 * @param {number} y
 * @param {number} size
 * @returns {{q: number, r: number}}
 */
export function pixelToHex(x, y, size) {
  const r = (2 / 3) * (y / size);
  const q = (Math.sqrt(3) / 3) * (x / size) - (1 / 3) * (y / size);
  return hexRound(q, r);
}

/**
 * Rounds fractional cube coordinates to the nearest integer hex.
 * @param {number} q
 * @param {number} r
 * @returns {{q: number, r: number}}
 */
function hexRound(q, r) {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);

  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);

  if (dq > dr && dq > ds) {
    rq = -rr - rs;
  } else if (dr > ds) {
    rr = -rq - rs;
  }
  // else rs = -rq - rr; (not needed since we only return q, r)

  return { q: rq, r: rr };
}

/**
 * Computes the cell size (hex radius in pixels) so the full board
 * (radius rings) fits within the given width/height.
 * @param {number} radius  - board radius
 * @param {number} width   - available canvas width in px
 * @param {number} height  - available canvas height in px
 * @param {number} padding - extra padding in px (default 8)
 * @returns {number}
 */
export function computeCellSize(radius, width, height, padding = 8) {
  // The board spans (2*radius + 1) cells wide and tall.
  // For pointy-top hexagons:
  //   Total width  ≈ sqrt(3) * size * (2*radius + 1)
  //   Total height ≈ size * (3/2 * (2*radius) + 2)   (first/last row adds 1 full height)
  const maxSizeByWidth = (width - padding * 2) / (Math.sqrt(3) * (2 * radius + 1));
  const maxSizeByHeight = (height - padding * 2) / ((3 / 2) * (2 * radius) + 2);
  return Math.floor(Math.min(maxSizeByWidth, maxSizeByHeight));
}
