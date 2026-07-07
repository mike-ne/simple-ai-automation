/**
 * Canvas renderer for the hex minesweeper board.
 * Draws all cell states using canvas 2D primitives.
 */

import { hexToPixel, computeCellSize } from './hex.js';
import { CELL_STATE } from './board.js';
import { GAME_STATE } from './game.js';

// Number colors per requirements §12.6
const NUMBER_COLORS = {
  1: '#0000ff', // Blue
  2: '#007800', // Green
  3: '#ff0000', // Red
  4: '#00008b', // Dark Navy
  5: '#8b0000', // Dark Red
  6: '#008080', // Teal
};

// Cell fill colors
const COLORS = {
  covered:       '#bdbdbd',
  coveredHover:  '#cacaca',
  coveredFocused:'#d0d8e8',
  flagged:       '#bdbdbd',
  question:      '#bdbdbd',
  revealed:      '#e8e8e8',
  exploded:      '#ff4444',
  revealedMine:  '#555555',
  wrongFlag:     '#555555',
  correctFlag:   '#bdbdbd',
  border:        '#888888',
  revealedBorder:'#cccccc',
};

export class Renderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Game} game
   */
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = game;
    this.cellSize = 20;
    this.offsetX = 0;
    this.offsetY = 0;
    this._rafPending = false;
    this._focusedCell = null; // {q, r} for keyboard nav
    this._hoveredCell = null; // {q, r} for hover highlight
    this._pressedCell = null; // {q, r} for surprised face
  }

  /**
   * Recomputes cell size and canvas dimensions to fit the container.
   */
  resize() {
    const container = this.canvas.parentElement;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || (window.innerHeight - 120);

    this.canvas.width = width;
    this.canvas.height = height;

    const radius = this.game.board.radius;
    this.cellSize = computeCellSize(radius, width, height, 12);
    this.offsetX = width / 2;
    this.offsetY = height / 2;
  }

  /**
   * Schedules a redraw via requestAnimationFrame.
   */
  scheduleRedraw() {
    if (this._rafPending) return;
    this._rafPending = true;
    requestAnimationFrame(() => {
      this._rafPending = false;
      this.draw();
    });
  }

  /**
   * Immediately draws the entire board.
   */
  draw() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const cell of this.game.board.cells.values()) {
      this._drawCell(cell);
    }

    // Draw focused cell highlight on top
    if (this._focusedCell) {
      const cell = this.game.board.getCell(this._focusedCell.q, this._focusedCell.r);
      if (cell) this._drawFocusRing(cell);
    }
  }

  /**
   * Converts canvas pixel to board pixel (accounting for offset).
   */
  canvasToBoard(cx, cy) {
    return {
      x: cx - this.offsetX,
      y: cy - this.offsetY,
    };
  }

  /**
   * Sets which cell is currently "pressed" (for surprised face).
   */
  setPressedCell(cell) {
    this._pressedCell = cell;
  }

  /**
   * Sets the hovered cell.
   */
  setHoveredCell(cell) {
    this._hoveredCell = cell;
  }

  /**
   * Sets the keyboard-focused cell.
   */
  setFocusedCell(cell) {
    this._focusedCell = cell;
    this.scheduleRedraw();
  }

  // ───────────────────────────── private drawing helpers ──────────────────────

  /**
   * Returns the 6 vertex coordinates of a pointy-top hexagon centered at (cx, cy).
   */
  _hexVertices(cx, cy, size) {
    const verts = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i - 30);
      verts.push({
        x: cx + size * Math.cos(angle),
        y: cy + size * Math.sin(angle),
      });
    }
    return verts;
  }

  _hexPath(cx, cy, size) {
    const verts = this._hexVertices(cx, cy, size);
    this.ctx.beginPath();
    this.ctx.moveTo(verts[0].x, verts[0].y);
    for (let i = 1; i < 6; i++) this.ctx.lineTo(verts[i].x, verts[i].y);
    this.ctx.closePath();
  }

  _drawCell(cell) {
    const { ctx, cellSize, offsetX, offsetY } = this;
    const { x, y } = hexToPixel(cell.q, cell.r, cellSize);
    const cx = x + offsetX;
    const cy = y + offsetY;
    const size = cellSize - 1; // slight gap between cells

    // --- Fill ---
    let fillColor = this._getCellFill(cell);

    // Hover highlight for covered/question cells during playing
    if (
      this._hoveredCell &&
      this._hoveredCell.q === cell.q &&
      this._hoveredCell.r === cell.r &&
      (cell.state === CELL_STATE.COVERED || cell.state === CELL_STATE.QUESTION)
    ) {
      fillColor = COLORS.coveredHover;
    }

    this._hexPath(cx, cy, size);
    ctx.fillStyle = fillColor;
    ctx.fill();

    // --- Stroke ---
    ctx.strokeStyle =
      cell.state === CELL_STATE.REVEALED ? COLORS.revealedBorder : COLORS.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    // --- Overlay content ---
    this._drawCellContent(cell, cx, cy, size);
  }

  _getCellFill(cell) {
    switch (cell.state) {
      case CELL_STATE.COVERED:       return COLORS.covered;
      case CELL_STATE.FLAGGED:       return COLORS.flagged;
      case CELL_STATE.QUESTION:      return COLORS.question;
      case CELL_STATE.REVEALED:      return COLORS.revealed;
      case CELL_STATE.EXPLODED:      return COLORS.exploded;
      case CELL_STATE.REVEALED_MINE: return COLORS.revealedMine;
      case CELL_STATE.WRONG_FLAG:    return COLORS.wrongFlag;
      case CELL_STATE.CORRECT_FLAG:  return COLORS.correctFlag;
      default:                       return COLORS.covered;
    }
  }

  _drawCellContent(cell, cx, cy, size) {
    switch (cell.state) {
      case CELL_STATE.FLAGGED:
      case CELL_STATE.CORRECT_FLAG:
        this._drawFlag(cx, cy, size);
        break;
      case CELL_STATE.QUESTION:
        this._drawText(cx, cy, size, '?', '#333333');
        break;
      case CELL_STATE.REVEALED:
        if (cell.adjacent > 0) {
          this._drawText(cx, cy, size, String(cell.adjacent), NUMBER_COLORS[cell.adjacent] || '#000');
        }
        break;
      case CELL_STATE.EXPLODED:
      case CELL_STATE.REVEALED_MINE:
        this._drawMine(cx, cy, size, cell.state === CELL_STATE.EXPLODED);
        break;
      case CELL_STATE.WRONG_FLAG:
        this._drawMineWithX(cx, cy, size);
        break;
    }
  }

  /** Draws a number centered in the cell. */
  _drawText(cx, cy, size, text, color) {
    const { ctx } = this;
    const fontSize = Math.max(8, Math.floor(size * 0.9));
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, cy);
  }

  /** Draws a flag icon (triangle on pole). */
  _drawFlag(cx, cy, size) {
    const { ctx } = this;
    const s = size * 0.5;

    // Pole
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.8);
    ctx.lineTo(cx, cy + s * 0.7);
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = Math.max(1.5, size * 0.06);
    ctx.stroke();

    // Flag triangle (red)
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.8);
    ctx.lineTo(cx + s * 0.75, cy - s * 0.3);
    ctx.lineTo(cx, cy + s * 0.1);
    ctx.closePath();
    ctx.fillStyle = '#cc0000';
    ctx.fill();
  }

  /** Draws a mine icon (circle with spikes). */
  _drawMine(cx, cy, size, isExploded) {
    const { ctx } = this;
    const r = size * 0.3;
    const spikeLen = size * 0.18;

    // 8 spikes (4 cardinal + 4 diagonal)
    ctx.strokeStyle = isExploded ? '#ffffff' : '#dddddd';
    ctx.lineWidth = Math.max(1, size * 0.05);
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI / 4) * i;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
      ctx.lineTo(cx + Math.cos(angle) * (r + spikeLen), cy + Math.sin(angle) * (r + spikeLen));
      ctx.stroke();
    }

    // Circle body
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = isExploded ? '#ffffff' : '#222222';
    ctx.fill();

    // Shine dot
    ctx.beginPath();
    ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = isExploded ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.6)';
    ctx.fill();
  }

  /** Draws a mine with a red X overlay (wrong flag). */
  _drawMineWithX(cx, cy, size) {
    this._drawMine(cx, cy, size, false);
    const { ctx } = this;
    const d = size * 0.4;
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = Math.max(2, size * 0.1);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - d, cy - d);
    ctx.lineTo(cx + d, cy + d);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + d, cy - d);
    ctx.lineTo(cx - d, cy + d);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  /** Draws a focus ring around the cell for keyboard navigation. */
  _drawFocusRing(cell) {
    const { ctx, cellSize, offsetX, offsetY } = this;
    const { x, y } = hexToPixel(cell.q, cell.r, cellSize);
    const cx = x + offsetX;
    const cy = y + offsetY;
    const size = cellSize - 1;

    this._hexPath(cx, cy, size + 2);
    ctx.strokeStyle = '#0077ff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
}
