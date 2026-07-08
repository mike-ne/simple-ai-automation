/**
 * Input handling: mouse, touch, and keyboard events.
 * Wires canvas events to game actions and updates renderer state.
 */

import { pixelToHex, hexNeighbors } from './hex.js';
import { CELL_STATE } from './board.js';
import { GAME_STATE } from './game.js';

const LONG_PRESS_MS = 500;
const TOUCH_MOVE_THRESHOLD = 10; // px

export class InputHandler {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Game} game
   * @param {Renderer} renderer
   * @param {function} onSurprised  - callback(bool) for surprised-face state
   */
  constructor(canvas, game, renderer, onSurprised) {
    this.canvas = canvas;
    this.game = game;
    this.renderer = renderer;
    this.onSurprised = onSurprised ?? (() => {});

    // Mouse chord state
    this._mouseButtons = { left: false, right: false };
    this._pendingChordCell = null;

    // Touch state
    this._touchStartPos = null;
    this._longPressTimer = null;
    this._touchHandled = false;

    // Keyboard focus
    this._keyboardFocused = false;

    this._bindEvents();
  }

  _bindEvents() {
    const c = this.canvas;

    // Store bound handlers so they can be removed later by destroy()
    this._bound = {
      mousedown:   this._onMouseDown.bind(this),
      mouseup:     this._onMouseUp.bind(this),
      mouseleave:  this._onMouseLeave.bind(this),
      mousemove:   this._onMouseMove.bind(this),
      contextmenu: (e) => e.preventDefault(),
      touchstart:  this._onTouchStart.bind(this),
      touchend:    this._onTouchEnd.bind(this),
      touchmove:   this._onTouchMove.bind(this),
      touchcancel: this._onTouchCancel.bind(this),
      keydown:     this._onKeyDown.bind(this),
      focus: () => {
        this._keyboardFocused = true;
        // Initialize keyboard cursor to origin if not set
        if (!this.renderer._focusedCell) {
          const cell = this.game.board.getCell(0, 0);
          if (cell) this.renderer.setFocusedCell({ q: 0, r: 0 });
        }
      },
      blur: () => {
        this._keyboardFocused = false;
        this.renderer.setFocusedCell(null);
      },
    };

    // Mouse
    c.addEventListener('mousedown',   this._bound.mousedown);
    c.addEventListener('mouseup',     this._bound.mouseup);
    c.addEventListener('mouseleave',  this._bound.mouseleave);
    c.addEventListener('mousemove',   this._bound.mousemove);
    c.addEventListener('contextmenu', this._bound.contextmenu);

    // Touch
    c.addEventListener('touchstart',  this._bound.touchstart,  { passive: false });
    c.addEventListener('touchend',    this._bound.touchend,    { passive: false });
    c.addEventListener('touchmove',   this._bound.touchmove,   { passive: false });
    c.addEventListener('touchcancel', this._bound.touchcancel);

    // Keyboard
    c.addEventListener('keydown', this._bound.keydown);
    c.addEventListener('focus',   this._bound.focus);
    c.addEventListener('blur',    this._bound.blur);
  }

  /**
   * Removes all canvas event listeners attached by this InputHandler.
   * Must be called before discarding an instance to avoid ghost handlers.
   */
  destroy() {
    const c = this.canvas;
    if (!this._bound) return;

    c.removeEventListener('mousedown',   this._bound.mousedown);
    c.removeEventListener('mouseup',     this._bound.mouseup);
    c.removeEventListener('mouseleave',  this._bound.mouseleave);
    c.removeEventListener('mousemove',   this._bound.mousemove);
    c.removeEventListener('contextmenu', this._bound.contextmenu);

    c.removeEventListener('touchstart',  this._bound.touchstart);
    c.removeEventListener('touchend',    this._bound.touchend);
    c.removeEventListener('touchmove',   this._bound.touchmove);
    c.removeEventListener('touchcancel', this._bound.touchcancel);

    c.removeEventListener('keydown', this._bound.keydown);
    c.removeEventListener('focus',   this._bound.focus);
    c.removeEventListener('blur',    this._bound.blur);

    // Cancel any in-flight long-press timer
    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }

    this._bound = null;
  }

  // ─────────────────────────────── Hit testing ────────────────────────────────

  _hitTest(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;
    const { x, y } = this.renderer.canvasToBoard(canvasX, canvasY);
    const { q, r } = pixelToHex(x, y, this.renderer.cellSize);
    return this.game.board.getCell(q, r); // null if off board
  }

  // ─────────────────────────────── Mouse events ───────────────────────────────

  _onMouseDown(e) {
    if (this.game.state === GAME_STATE.WON || this.game.state === GAME_STATE.LOST) return;

    if (e.button === 0) this._mouseButtons.left = true;
    if (e.button === 2) this._mouseButtons.right = true;

    const cell = this._hitTest(e.clientX, e.clientY);
    if (!cell) return;

    // Chord: both buttons held on a revealed number cell
    if (this._mouseButtons.left && this._mouseButtons.right) {
      if (cell.state === CELL_STATE.REVEALED && cell.adjacent > 0) {
        this._pendingChordCell = cell;
        this.onSurprised(false);
        this.renderer.scheduleRedraw();
        return;
      }
    }

    // Left down on covered/question: show surprised face
    if (e.button === 0) {
      if (cell.state === CELL_STATE.COVERED || cell.state === CELL_STATE.QUESTION) {
        this.onSurprised(true);
        this.renderer.setPressedCell(cell);
        this.renderer.scheduleRedraw();
      } else if (cell.state === CELL_STATE.REVEALED && cell.adjacent > 0) {
        // Might start a chord with just left button
        this._pendingChordCell = cell;
      }
    }
  }

  _onMouseUp(e) {
    const wasSurprised = this._mouseButtons.left;
    this.onSurprised(false);
    this.renderer.setPressedCell(null);

    const cell = this._hitTest(e.clientX, e.clientY);

    if (e.button === 0) {
      this._mouseButtons.left = false;

      // Was this completing a chord?
      if (this._pendingChordCell) {
        const target = this._pendingChordCell;
        this._pendingChordCell = null;
        if (cell && cell.q === target.q && cell.r === target.r) {
          this.game.handleChord(cell.q, cell.r);
        }
        this.renderer.scheduleRedraw();
        return;
      }

      if (cell && wasSurprised) {
        this.game.handleReveal(cell.q, cell.r);
      }
    }

    if (e.button === 2) {
      this._mouseButtons.right = false;
      this._pendingChordCell = null;

      if (cell && !this._mouseButtons.left) {
        this.game.handleFlag(cell.q, cell.r);
      }
    }

    this.renderer.scheduleRedraw();
  }

  _onMouseLeave() {
    this.onSurprised(false);
    this.renderer.setPressedCell(null);
    this.renderer.setHoveredCell(null);
    this._mouseButtons.left = false;
    this._mouseButtons.right = false;
    this._pendingChordCell = null;
    this.renderer.scheduleRedraw();
  }

  _onMouseMove(e) {
    const cell = this._hitTest(e.clientX, e.clientY);
    this.renderer.setHoveredCell(cell ? { q: cell.q, r: cell.r } : null);
    this.renderer.scheduleRedraw();
  }

  // ─────────────────────────────── Touch events ───────────────────────────────

  _onTouchStart(e) {
    e.preventDefault();
    if (e.touches.length !== 1) return;

    this._touchHandled = false;
    const touch = e.touches[0];
    this._touchStartPos = { x: touch.clientX, y: touch.clientY };

    const cell = this._hitTest(touch.clientX, touch.clientY);
    if (!cell) return;

    if (cell.state === CELL_STATE.COVERED || cell.state === CELL_STATE.QUESTION) {
      this.onSurprised(true);
      this.renderer.setPressedCell(cell);
      this.renderer.scheduleRedraw();
    }

    // Start long-press timer
    this._longPressTimer = setTimeout(() => {
      this._longPressTimer = null;
      this._touchHandled = true;
      this.onSurprised(false);
      this.renderer.setPressedCell(null);
      this.game.handleFlag(cell.q, cell.r);
      this.renderer.scheduleRedraw();
      // Vibrate if supported
      if (navigator.vibrate) navigator.vibrate(30);
    }, LONG_PRESS_MS);
  }

  _onTouchEnd(e) {
    e.preventDefault();
    this.onSurprised(false);
    this.renderer.setPressedCell(null);

    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }

    if (this._touchHandled) return; // long press already handled

    const touch = e.changedTouches[0];
    const cell = this._hitTest(touch.clientX, touch.clientY);
    if (!cell) {
      this.renderer.scheduleRedraw();
      return;
    }

    // Check if finger moved too far (not a tap)
    if (this._touchStartPos) {
      const dx = touch.clientX - this._touchStartPos.x;
      const dy = touch.clientY - this._touchStartPos.y;
      if (Math.sqrt(dx * dx + dy * dy) > TOUCH_MOVE_THRESHOLD) {
        this.renderer.scheduleRedraw();
        return;
      }
    }

    // Tap on a revealed number: chord
    if (cell.state === CELL_STATE.REVEALED && cell.adjacent > 0) {
      this.game.handleChord(cell.q, cell.r);
    } else {
      this.game.handleReveal(cell.q, cell.r);
    }

    this.renderer.scheduleRedraw();
  }

  _onTouchMove(e) {
    e.preventDefault();
    if (!this._touchStartPos) return;

    const touch = e.touches[0];
    const dx = touch.clientX - this._touchStartPos.x;
    const dy = touch.clientY - this._touchStartPos.y;
    if (Math.sqrt(dx * dx + dy * dy) > TOUCH_MOVE_THRESHOLD) {
      // Cancel long press on significant movement
      if (this._longPressTimer) {
        clearTimeout(this._longPressTimer);
        this._longPressTimer = null;
      }
      this.onSurprised(false);
      this.renderer.setPressedCell(null);
    }
  }

  _onTouchCancel() {
    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }
    this.onSurprised(false);
    this.renderer.setPressedCell(null);
    this.renderer.scheduleRedraw();
  }

  // ─────────────────────────────── Keyboard events ────────────────────────────

  // Pointy-top hex direction keys: q moves right/left, r moves down/up
  // Arrow key to hex direction mapping for pointy-top:
  // ArrowRight → q+1, r=0; ArrowLeft → q-1, r=0
  // ArrowUp → depends on column parity — use q+0,r-1 and q+0,r+1
  _onKeyDown(e) {
    const fc = this.renderer._focusedCell;

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        this._moveFocus(fc, 1, 0);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this._moveFocus(fc, -1, 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        // Try q+1, r-1 first, then q+0, r-1
        if (!this._moveFocus(fc, 1, -1)) {
          this._moveFocus(fc, 0, -1);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!this._moveFocus(fc, -1, 1)) {
          this._moveFocus(fc, 0, 1);
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (fc) this.game.handleReveal(fc.q, fc.r);
        this.renderer.scheduleRedraw();
        break;
      case 'f':
      case 'F':
        e.preventDefault();
        if (fc) this.game.handleFlag(fc.q, fc.r);
        this.renderer.scheduleRedraw();
        break;
      case 'c':
      case 'C':
        e.preventDefault();
        if (fc) this.game.handleChord(fc.q, fc.r);
        this.renderer.scheduleRedraw();
        break;
    }
  }

  _moveFocus(from, dq, dr) {
    if (!from) return false;
    const newQ = from.q + dq;
    const newR = from.r + dr;
    const cell = this.game.board.getCell(newQ, newR);
    if (!cell) return false;
    this.renderer.setFocusedCell({ q: newQ, r: newR });
    return true;
  }
}
