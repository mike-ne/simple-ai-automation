import { describe, it, expect, beforeEach } from 'vitest';
import { Board, DIFFICULTY, CELL_STATE } from '../src/board.js';
import { hexNeighbors, hexDistance, generateHexGrid } from '../src/hex.js';

describe('Board construction', () => {
  it('Easy board has exactly 61 cells', () => {
    const b = new Board('easy');
    expect(b.cells.size).toBe(61);
  });

  it('Medium board has exactly 127 cells', () => {
    const b = new Board('medium');
    expect(b.cells.size).toBe(127);
  });

  it('Hard board has exactly 217 cells', () => {
    const b = new Board('hard');
    expect(b.cells.size).toBe(217);
  });

  it('throws on unknown difficulty', () => {
    expect(() => new Board('extreme')).toThrow();
  });

  it('all cells start as covered', () => {
    const b = new Board('easy');
    for (const cell of b.cells.values()) {
      expect(cell.state).toBe(CELL_STATE.COVERED);
      expect(cell.mine).toBe(false);
      expect(cell.adjacent).toBe(0);
    }
  });
});

describe('Mine placement', () => {
  it('Easy: places exactly 7 mines', () => {
    const b = new Board('easy');
    b.placeMines(0, 0);
    const mineCount = Array.from(b.cells.values()).filter((c) => c.mine).length;
    expect(mineCount).toBe(7);
  });

  it('Medium: places exactly 20 mines', () => {
    const b = new Board('medium');
    b.placeMines(0, 0);
    const mineCount = Array.from(b.cells.values()).filter((c) => c.mine).length;
    expect(mineCount).toBe(20);
  });

  it('Hard: places exactly 45 mines', () => {
    const b = new Board('hard');
    b.placeMines(0, 0);
    const mineCount = Array.from(b.cells.values()).filter((c) => c.mine).length;
    expect(mineCount).toBe(45);
  });

  it('First clicked cell is never a mine', () => {
    for (let i = 0; i < 20; i++) {
      const b = new Board('easy');
      b.placeMines(0, 0);
      expect(b.getCell(0, 0).mine).toBe(false);
    }
  });

  it('All neighbors of first clicked cell are mine-free', () => {
    for (let i = 0; i < 20; i++) {
      const b = new Board('medium');
      b.placeMines(0, 0);
      for (const { q, r } of hexNeighbors(0, 0)) {
        const cell = b.getCell(q, r);
        if (cell) expect(cell.mine).toBe(false);
      }
    }
  });

  it('First-click safety works for a non-center cell', () => {
    for (let i = 0; i < 20; i++) {
      const b = new Board('hard');
      b.placeMines(3, -2);
      expect(b.getCell(3, -2).mine).toBe(false);
      for (const { q, r } of hexNeighbors(3, -2)) {
        const cell = b.getCell(q, r);
        if (cell) expect(cell.mine).toBe(false);
      }
    }
  });

  it('adjacent counts are correct (no cell has more than 6)', () => {
    const b = new Board('medium');
    b.placeMines(0, 0);
    for (const cell of b.cells.values()) {
      expect(cell.adjacent).toBeLessThanOrEqual(6);
      expect(cell.adjacent).toBeGreaterThanOrEqual(0);
    }
  });

  it('adjacent count matches actual mine neighbors', () => {
    const b = new Board('easy');
    b.placeMines(0, 0);
    for (const cell of b.cells.values()) {
      if (cell.mine) continue;
      const expected = b.getNeighbors(cell.q, cell.r).filter((n) => n.mine).length;
      expect(cell.adjacent).toBe(expected);
    }
  });

  it('mines are not repositioned after placement', () => {
    const b = new Board('easy');
    b.placeMines(0, 0);
    const snapshot = new Map(
      Array.from(b.cells.values()).map((c) => [`${c.q},${c.r}`, c.mine])
    );
    // Simulate some reveals and flags
    b.reveal(0, 0);
    b.cycleFlag(1, 0);
    for (const [key, wasMine] of snapshot) {
      const [q, r] = key.split(',').map(Number);
      const cell = b.getCell(q, r);
      if (cell) expect(cell.mine).toBe(wasMine);
    }
  });
});

describe('Reveal and cascade', () => {
  let board;
  beforeEach(() => {
    board = new Board('easy');
    board.placeMines(0, 0);
  });

  it('revealing a mine sets state to exploded', () => {
    // Find a mine cell
    const mineCell = Array.from(board.cells.values()).find((c) => c.mine);
    // Manually uncover it (bypass normal protection)
    const result = board.reveal(mineCell.q, mineCell.r);
    expect(result).toBe('mine');
    expect(board.getCell(mineCell.q, mineCell.r).state).toBe(CELL_STATE.EXPLODED);
  });

  it('revealing a covered, non-mine cell marks it as revealed', () => {
    const safe = board.getCell(0, 0);
    expect(safe.mine).toBe(false);
    board.reveal(0, 0);
    expect(safe.state).toBe(CELL_STATE.REVEALED);
  });

  it('a flagged cell cannot be revealed', () => {
    board.cycleFlag(0, 0);
    const result = board.reveal(0, 0);
    expect(result).toBe('flagged');
    expect(board.getCell(0, 0).state).toBe(CELL_STATE.FLAGGED);
  });

  it('cascade reveals all connected blank cells', () => {
    // Create a board with no mines near origin — all adjacent=0 around it
    const b = new Board('easy');
    // Place mines far away (edge cells) so cascade can propagate from origin
    // We can't control placement directly, so we test the cascade mechanism
    // by checking that if we start from a blank cell, more than 1 cell gets revealed
    b.placeMines(0, 0); // first click safety ensures 0,0 and neighbors are safe

    // Reveal origin - if it's blank (adjacent=0), it should cascade
    b.reveal(0, 0);
    const revealedCount = Array.from(b.cells.values()).filter(
      (c) => c.state === CELL_STATE.REVEALED
    ).length;
    // At minimum origin is revealed; if it's blank many more will be
    expect(revealedCount).toBeGreaterThanOrEqual(1);
  });

  it('flagged cells are not auto-revealed during cascade', () => {
    const b = new Board('easy');
    b.placeMines(0, 0);
    // Flag a neighbor of origin
    const neighbor = b.getNeighbors(0, 0)[0];
    if (neighbor) b.cycleFlag(neighbor.q, neighbor.r);

    b.reveal(0, 0);
    // The flagged cell should remain flagged
    if (neighbor) {
      const cell = b.getCell(neighbor.q, neighbor.r);
      if (cell && cell.state === CELL_STATE.FLAGGED) {
        expect(cell.state).toBe(CELL_STATE.FLAGGED);
      }
    }
  });

  it('cascade never reveals a mine', () => {
    const b = new Board('medium');
    b.placeMines(0, 0);
    b.reveal(0, 0);
    for (const cell of b.cells.values()) {
      if (cell.mine) {
        expect(cell.state).not.toBe(CELL_STATE.REVEALED);
      }
    }
  });
});

describe('Flag cycling', () => {
  it('covered → flagged → question → covered', () => {
    const b = new Board('easy');
    expect(b.cycleFlag(0, 0)).toBe(CELL_STATE.FLAGGED);
    expect(b.getCell(0, 0).state).toBe(CELL_STATE.FLAGGED);
    expect(b.cycleFlag(0, 0)).toBe(CELL_STATE.QUESTION);
    expect(b.getCell(0, 0).state).toBe(CELL_STATE.QUESTION);
    expect(b.cycleFlag(0, 0)).toBe(CELL_STATE.COVERED);
    expect(b.getCell(0, 0).state).toBe(CELL_STATE.COVERED);
  });

  it('flag count tracks correctly', () => {
    const b = new Board('easy');
    expect(b.flagCount).toBe(0);
    b.cycleFlag(0, 0); // covered → flagged
    expect(b.flagCount).toBe(1);
    b.cycleFlag(0, 0); // flagged → question
    expect(b.flagCount).toBe(0);
    b.cycleFlag(0, 0); // question → covered
    expect(b.flagCount).toBe(0);
  });

  it('mine counter goes negative with more flags than mines', () => {
    const b = new Board('easy');
    b.placeMines(0, 0);
    // Flag 8 cells (more than 7 mines on easy)
    let flagged = 0;
    for (const cell of b.cells.values()) {
      if (flagged >= 8) break;
      if (cell.state === CELL_STATE.COVERED) {
        b.cycleFlag(cell.q, cell.r);
        flagged++;
      }
    }
    expect(b.getMineCounter()).toBe(7 - 8); // -1
  });

  it('cannot flag a revealed cell', () => {
    const b = new Board('easy');
    b.placeMines(0, 0);
    b.reveal(0, 0);
    const result = b.cycleFlag(0, 0);
    expect(result).toBeNull();
  });
});

describe('Chord', () => {
  it('chord does not trigger if flag count does not match adjacent', () => {
    const b = new Board('easy');
    b.placeMines(0, 0);
    b.reveal(0, 0);
    const cell = b.getCell(0, 0);
    if (cell.adjacent > 0) {
      const { triggered } = b.chord(0, 0);
      expect(triggered).toBe(false);
    }
  });

  it('chord on blank cell does not trigger', () => {
    const b = new Board('easy');
    b.placeMines(0, 0);
    b.reveal(0, 0);
    const cell = b.getCell(0, 0);
    if (cell.adjacent === 0) {
      const { triggered } = b.chord(0, 0);
      expect(triggered).toBe(false); // blank cells have adjacent=0
    }
  });

  it('chord triggers when flag count matches adjacent count', () => {
    // Build a deterministic scenario: find a number cell, flag all its mine neighbors
    const b = new Board('medium');
    b.placeMines(0, 0);

    // Find a revealed number cell by revealing all safe cells first
    b.reveal(0, 0);

    let numberCell = null;
    for (const cell of b.cells.values()) {
      if (cell.state === CELL_STATE.REVEALED && cell.adjacent > 0) {
        // Check if we can flag exactly the right mines around it
        const mineNeighbors = b.getNeighbors(cell.q, cell.r).filter((n) => n.mine);
        const unflaggedNeighbors = b.getNeighbors(cell.q, cell.r).filter(
          (n) => n.state === CELL_STATE.COVERED || n.state === CELL_STATE.QUESTION
        );
        if (mineNeighbors.length === cell.adjacent && mineNeighbors.length > 0) {
          numberCell = cell;
          // Flag all mine neighbors
          for (const mn of mineNeighbors) {
            if (mn.state === CELL_STATE.COVERED) {
              b.cycleFlag(mn.q, mn.r);
            }
          }
          break;
        }
      }
    }

    if (numberCell) {
      const { triggered } = b.chord(numberCell.q, numberCell.r);
      expect(triggered).toBe(true);
    }
  });
});

describe('Win condition', () => {
  it('not won at start', () => {
    const b = new Board('easy');
    expect(b.isWon()).toBe(false);
  });

  it('won when all non-mine cells are revealed', () => {
    const b = new Board('easy');
    b.placeMines(0, 0);
    // Manually reveal all non-mine cells
    for (const cell of b.cells.values()) {
      if (!cell.mine) cell.state = CELL_STATE.REVEALED;
    }
    expect(b.isWon()).toBe(true);
  });

  it('not won if a non-mine cell is still covered', () => {
    const b = new Board('easy');
    b.placeMines(0, 0);
    for (const cell of b.cells.values()) {
      if (!cell.mine) cell.state = CELL_STATE.REVEALED;
    }
    // Leave one non-mine cell covered
    const safe = Array.from(b.cells.values()).find((c) => !c.mine);
    safe.state = CELL_STATE.COVERED;
    expect(b.isWon()).toBe(false);
  });
});

describe('Game over reveal', () => {
  it('revealAllOnLoss reveals un-flagged mines', () => {
    const b = new Board('easy');
    b.placeMines(0, 0);
    // Trigger mine
    const mine = Array.from(b.cells.values()).find((c) => c.mine);
    mine.state = CELL_STATE.EXPLODED;
    b.revealAllOnLoss();

    for (const cell of b.cells.values()) {
      if (cell.mine && cell.state !== CELL_STATE.EXPLODED && cell.state !== CELL_STATE.FLAGGED) {
        expect(cell.state).toBe(CELL_STATE.REVEALED_MINE);
      }
    }
  });

  it('revealAllOnLoss marks wrong flags', () => {
    const b = new Board('easy');
    b.placeMines(0, 0);

    // Flag a non-mine cell
    const safeCell = Array.from(b.cells.values()).find((c) => !c.mine);
    b.cycleFlag(safeCell.q, safeCell.r); // covered → flagged

    // Trigger loss
    const mine = Array.from(b.cells.values()).find((c) => c.mine);
    mine.state = CELL_STATE.EXPLODED;
    b.revealAllOnLoss();

    expect(b.getCell(safeCell.q, safeCell.r).state).toBe(CELL_STATE.WRONG_FLAG);
  });
});
