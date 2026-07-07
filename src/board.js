/**
 * Board state: cell objects, mine placement, cascade logic.
 */

import { generateHexGrid, hexNeighbors } from './hex.js';

// Difficulty presets
export const DIFFICULTY = {
  easy:   { radius: 4, mines: 7   },
  medium: { radius: 6, mines: 20  },
  hard:   { radius: 8, mines: 45  },
};

/**
 * Cell state constants.
 * @enum {string}
 */
export const CELL_STATE = {
  COVERED:       'covered',
  FLAGGED:       'flagged',
  QUESTION:      'question',
  REVEALED:      'revealed',
  EXPLODED:      'exploded',
  REVEALED_MINE: 'revealed-mine',
  WRONG_FLAG:    'wrong-flag',
  CORRECT_FLAG:  'correct-flag',
};

/**
 * Creates a fresh Board for the given difficulty level.
 * @param {'easy'|'medium'|'hard'} difficulty
 */
export class Board {
  constructor(difficulty) {
    const preset = DIFFICULTY[difficulty];
    if (!preset) throw new Error(`Unknown difficulty: ${difficulty}`);

    this.difficulty = difficulty;
    this.radius = preset.radius;
    this.totalMines = preset.mines;
    this.minesPlaced = false;
    this.flagCount = 0;

    // Build cell map: key = "q,r"
    this.cells = new Map();
    for (const { q, r } of generateHexGrid(this.radius)) {
      this.cells.set(`${q},${r}`, {
        q,
        r,
        state: CELL_STATE.COVERED,
        mine: false,
        adjacent: 0,
      });
    }
  }

  /**
   * Returns cell by coordinates, or null if not on board.
   * @param {number} q
   * @param {number} r
   * @returns {object|null}
   */
  getCell(q, r) {
    return this.cells.get(`${q},${r}`) ?? null;
  }

  /**
   * Returns all neighboring cells that exist on the board.
   * @param {number} q
   * @param {number} r
   * @returns {object[]}
   */
  getNeighbors(q, r) {
    return hexNeighbors(q, r)
      .map(({ q: nq, r: nr }) => this.getCell(nq, nr))
      .filter(Boolean);
  }

  /**
   * Places mines randomly, avoiding firstQ/firstR and their neighbors.
   * Computes adjacent counts for all cells.
   * @param {number} firstQ
   * @param {number} firstR
   */
  placeMines(firstQ, firstR) {
    // Build the forbidden set: first cell + its neighbors
    const forbidden = new Set();
    forbidden.add(`${firstQ},${firstR}`);
    for (const { q, r } of hexNeighbors(firstQ, firstR)) {
      forbidden.add(`${q},${r}`);
    }

    // Candidate cells: all board cells not in forbidden
    const candidates = Array.from(this.cells.values()).filter(
      (c) => !forbidden.has(`${c.q},${c.r}`)
    );

    // Fisher-Yates shuffle, take totalMines from the front
    const count = Math.min(this.totalMines, candidates.length);
    for (let i = 0; i < count; i++) {
      const j = i + Math.floor(Math.random() * (candidates.length - i));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      candidates[i].mine = true;
    }

    // Compute adjacent counts
    for (const cell of this.cells.values()) {
      if (cell.mine) continue;
      cell.adjacent = this.getNeighbors(cell.q, cell.r).filter((n) => n.mine).length;
    }

    this.minesPlaced = true;
  }

  /**
   * Reveals a cell. Returns the result of the action.
   * @param {number} q
   * @param {number} r
   * @returns {'mine'|'blank'|'number'|'already-revealed'|'flagged'|'invalid'}
   */
  reveal(q, r) {
    const cell = this.getCell(q, r);
    if (!cell) return 'invalid';
    if (cell.state === CELL_STATE.FLAGGED) return 'flagged';
    if (
      cell.state === CELL_STATE.REVEALED ||
      cell.state === CELL_STATE.EXPLODED ||
      cell.state === CELL_STATE.REVEALED_MINE ||
      cell.state === CELL_STATE.WRONG_FLAG ||
      cell.state === CELL_STATE.CORRECT_FLAG
    ) {
      return 'already-revealed';
    }

    if (cell.mine) {
      cell.state = CELL_STATE.EXPLODED;
      return 'mine';
    }

    // BFS cascade
    this._cascadeReveal(q, r);

    return cell.adjacent === 0 ? 'blank' : 'number';
  }

  /**
   * BFS cascade reveal starting from (q, r).
   * Reveals the cell and recursively reveals all connected blank cells.
   * @param {number} q
   * @param {number} r
   */
  _cascadeReveal(q, r) {
    const queue = [];
    const visited = new Set();

    const enqueue = (q, r) => {
      const key = `${q},${r}`;
      if (visited.has(key)) return;
      visited.add(key);
      queue.push({ q, r });
    };

    enqueue(q, r);

    while (queue.length > 0) {
      const { q: cq, r: cr } = queue.shift();
      const cell = this.getCell(cq, cr);
      if (!cell) continue;
      if (cell.state !== CELL_STATE.COVERED && cell.state !== CELL_STATE.QUESTION) continue;
      if (cell.mine) continue;

      cell.state = CELL_STATE.REVEALED;

      if (cell.adjacent === 0) {
        for (const neighbor of this.getNeighbors(cq, cr)) {
          if (
            neighbor.state === CELL_STATE.COVERED ||
            neighbor.state === CELL_STATE.QUESTION
          ) {
            enqueue(neighbor.q, neighbor.r);
          }
        }
      }
    }
  }

  /**
   * Cycles the marker state of a covered cell:
   *   covered → flagged → question → covered
   * Returns the new state, or null if action was invalid.
   * @param {number} q
   * @param {number} r
   * @returns {string|null}
   */
  cycleFlag(q, r) {
    const cell = this.getCell(q, r);
    if (!cell) return null;

    if (cell.state === CELL_STATE.COVERED) {
      cell.state = CELL_STATE.FLAGGED;
      this.flagCount++;
      return CELL_STATE.FLAGGED;
    }
    if (cell.state === CELL_STATE.FLAGGED) {
      cell.state = CELL_STATE.QUESTION;
      this.flagCount--;
      return CELL_STATE.QUESTION;
    }
    if (cell.state === CELL_STATE.QUESTION) {
      cell.state = CELL_STATE.COVERED;
      return CELL_STATE.COVERED;
    }
    return null; // revealed cells cannot be flagged
  }

  /**
   * Chord action on a revealed number cell.
   * If surrounding flag count equals cell's adjacent count, reveals all
   * unflagged neighbors. Returns array of results.
   * @param {number} q
   * @param {number} r
   * @returns {{triggered: boolean, hitMine: boolean, revealed: object[]}}
   */
  chord(q, r) {
    const cell = this.getCell(q, r);
    if (!cell || cell.state !== CELL_STATE.REVEALED || cell.adjacent === 0) {
      return { triggered: false, hitMine: false, revealed: [] };
    }

    const neighbors = this.getNeighbors(q, r);
    const flaggedCount = neighbors.filter((n) => n.state === CELL_STATE.FLAGGED).length;

    if (flaggedCount !== cell.adjacent) {
      return { triggered: false, hitMine: false, revealed: [] };
    }

    let hitMine = false;
    const revealed = [];

    for (const neighbor of neighbors) {
      if (
        neighbor.state === CELL_STATE.COVERED ||
        neighbor.state === CELL_STATE.QUESTION
      ) {
        if (neighbor.mine) {
          neighbor.state = CELL_STATE.EXPLODED;
          hitMine = true;
        } else {
          this._cascadeReveal(neighbor.q, neighbor.r);
          revealed.push(neighbor);
        }
      }
    }

    return { triggered: true, hitMine, revealed };
  }

  /**
   * Checks whether the game is won (all non-mine cells are revealed).
   * @returns {boolean}
   */
  isWon() {
    for (const cell of this.cells.values()) {
      if (!cell.mine && cell.state !== CELL_STATE.REVEALED) {
        return false;
      }
    }
    return true;
  }

  /**
   * Exposes all mines and wrong flags at game over (loss).
   * The exploded cell keeps its 'exploded' state.
   */
  revealAllOnLoss() {
    for (const cell of this.cells.values()) {
      if (cell.state === CELL_STATE.EXPLODED) continue; // keep exploded

      if (cell.mine && cell.state !== CELL_STATE.FLAGGED) {
        cell.state = CELL_STATE.REVEALED_MINE;
      } else if (!cell.mine && cell.state === CELL_STATE.FLAGGED) {
        cell.state = CELL_STATE.WRONG_FLAG;
      }
    }
  }

  /**
   * Flags all un-flagged mines at game win.
   */
  flagAllMinesOnWin() {
    for (const cell of this.cells.values()) {
      if (cell.mine && cell.state === CELL_STATE.COVERED) {
        cell.state = CELL_STATE.CORRECT_FLAG;
        this.flagCount++;
      } else if (cell.mine && cell.state === CELL_STATE.FLAGGED) {
        cell.state = CELL_STATE.CORRECT_FLAG;
      }
    }
  }

  /**
   * Returns total mine count minus flags placed.
   * @returns {number}
   */
  getMineCounter() {
    return this.totalMines - this.flagCount;
  }
}
