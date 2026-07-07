import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Game, GAME_STATE } from '../src/game.js';
import { CELL_STATE } from '../src/board.js';

describe('Game construction', () => {
  it('starts in Ready state', () => {
    const g = new Game('easy');
    expect(g.state).toBe(GAME_STATE.READY);
  });

  it('timer starts at 0 in Ready state', () => {
    const g = new Game('easy');
    expect(g.getTimer()).toBe(0);
  });

  it('mine counter equals total mines in Ready state', () => {
    const easy = new Game('easy');
    expect(easy.getMineCounter()).toBe(7);
    const medium = new Game('medium');
    expect(medium.getMineCounter()).toBe(20);
    const hard = new Game('hard');
    expect(hard.getMineCounter()).toBe(45);
  });
});

describe('State transitions', () => {
  it('Ready → Playing on first reveal', () => {
    const g = new Game('easy');
    g.handleReveal(0, 0);
    // If first click was not a mine (guaranteed), state should be Playing or Won
    expect([GAME_STATE.PLAYING, GAME_STATE.WON]).toContain(g.state);
  });

  it('first click never causes Lost state', () => {
    for (let i = 0; i < 30; i++) {
      const g = new Game('easy');
      g.handleReveal(0, 0);
      expect(g.state).not.toBe(GAME_STATE.LOST);
    }
  });

  it('transition to Lost when mine is revealed', () => {
    const g = new Game('easy');
    g.handleReveal(0, 0); // place mines, start playing
    // Find a mine and reveal it
    const mine = Array.from(g.board.cells.values()).find((c) => c.mine);
    if (mine) {
      g.handleReveal(mine.q, mine.r);
      expect(g.state).toBe(GAME_STATE.LOST);
    }
  });

  it('transition to Won when all safe cells revealed', () => {
    const g = new Game('easy');
    g.handleReveal(0, 0);
    // Reveal all non-mine cells manually through handleReveal
    for (const cell of g.board.cells.values()) {
      if (!cell.mine && cell.state === CELL_STATE.COVERED) {
        g.handleReveal(cell.q, cell.r);
      }
    }
    expect(g.state).toBe(GAME_STATE.WON);
  });

  it('no input accepted after Won', () => {
    const g = new Game('easy');
    g.handleReveal(0, 0);
    for (const cell of g.board.cells.values()) {
      if (!cell.mine && cell.state === CELL_STATE.COVERED) {
        g.handleReveal(cell.q, cell.r);
      }
    }
    expect(g.state).toBe(GAME_STATE.WON);
    // Try to flag in Won state
    const covered = Array.from(g.board.cells.values()).find((c) => c.mine);
    const result = g.handleFlag(covered.q, covered.r);
    expect(result).toBe(false);
  });

  it('no input accepted after Lost', () => {
    const g = new Game('easy');
    g.handleReveal(0, 0);
    const mine = Array.from(g.board.cells.values()).find((c) => c.mine);
    if (mine) {
      g.handleReveal(mine.q, mine.r);
      expect(g.state).toBe(GAME_STATE.LOST);
      const result = g.handleReveal(0, 0);
      expect(result).toBe(false);
    }
  });
});

describe('Reset', () => {
  it('reset from Playing returns to Ready', () => {
    const g = new Game('easy');
    g.handleReveal(0, 0);
    g.reset();
    expect(g.state).toBe(GAME_STATE.READY);
  });

  it('reset clears timer', () => {
    const g = new Game('easy');
    g.handleReveal(0, 0);
    g.elapsed = 42;
    g.reset();
    expect(g.getTimer()).toBe(0);
  });

  it('reset creates fresh board', () => {
    const g = new Game('easy');
    g.handleReveal(0, 0);
    const oldBoard = g.board;
    g.reset();
    expect(g.board).not.toBe(oldBoard);
  });

  it('reset with new difficulty changes mine count', () => {
    const g = new Game('easy');
    expect(g.getMineCounter()).toBe(7);
    g.reset('hard');
    expect(g.getMineCounter()).toBe(45);
  });

  it('reset from Won state works', () => {
    const g = new Game('easy');
    g.handleReveal(0, 0);
    for (const cell of g.board.cells.values()) {
      if (!cell.mine && cell.state === CELL_STATE.COVERED) {
        g.handleReveal(cell.q, cell.r);
      }
    }
    g.reset();
    expect(g.state).toBe(GAME_STATE.READY);
  });
});

describe('Timer behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('timer does not advance in Ready state', () => {
    const g = new Game('easy');
    vi.advanceTimersByTime(3000);
    expect(g.getTimer()).toBe(0);
  });

  it('timer advances in Playing state', () => {
    const g = new Game('easy');
    g.handleReveal(0, 0);
    if (g.state === GAME_STATE.PLAYING) {
      vi.advanceTimersByTime(3000);
      expect(g.getTimer()).toBe(3);
    }
  });

  it('timer is capped at 999', () => {
    const g = new Game('easy');
    g.handleReveal(0, 0);
    if (g.state === GAME_STATE.PLAYING) {
      vi.advanceTimersByTime(1100 * 1000); // 1100 seconds
      expect(g.getTimer()).toBe(999);
    }
  });

  it('timer stops on loss', () => {
    const g = new Game('easy');
    g.handleReveal(0, 0);
    if (g.state === GAME_STATE.PLAYING) {
      vi.advanceTimersByTime(2000);
      const mine = Array.from(g.board.cells.values()).find((c) => c.mine);
      if (mine) {
        g.handleReveal(mine.q, mine.r);
        const stoppedAt = g.getTimer();
        vi.advanceTimersByTime(5000);
        expect(g.getTimer()).toBe(stoppedAt); // should not have advanced
      }
    }
  });
});

describe('Mine counter', () => {
  it('decrements when a flag is placed', () => {
    const g = new Game('easy');
    expect(g.getMineCounter()).toBe(7);
    g.handleFlag(0, 0);
    expect(g.getMineCounter()).toBe(6);
  });

  it('increments when flag is cycled to question', () => {
    const g = new Game('easy');
    g.handleFlag(0, 0); // covered → flagged
    g.handleFlag(0, 0); // flagged → question
    expect(g.getMineCounter()).toBe(7);
  });

  it('stays at total mines when cycling through all states', () => {
    const g = new Game('easy');
    g.handleFlag(0, 0); // flagged, counter = 6
    g.handleFlag(0, 0); // question, counter = 7
    g.handleFlag(0, 0); // covered, counter = 7
    expect(g.getMineCounter()).toBe(7);
  });

  it('can display negative values', () => {
    const g = new Game('easy'); // 7 mines
    // Flag 8 cells
    let flagged = 0;
    for (const cell of g.board.cells.values()) {
      if (flagged >= 8) break;
      g.handleFlag(cell.q, cell.r);
      flagged++;
    }
    expect(g.getMineCounter()).toBeLessThan(0);
  });
});

describe('Chord via game', () => {
  it('chord does not work in Ready state', () => {
    const g = new Game('easy');
    const result = g.handleChord(0, 0);
    expect(result).toBe(false);
  });

  it('chord triggers loss if incorrect flag', () => {
    const g = new Game('medium');
    g.handleReveal(0, 0);
    if (g.state !== GAME_STATE.PLAYING) return; // skip if immediately won

    // Find a revealed number cell with adjacent mines
    let numberCell = null;
    for (const cell of g.board.cells.values()) {
      if (cell.state === CELL_STATE.REVEALED && cell.adjacent > 0) {
        // Get a non-mine neighbor to flag incorrectly
        const nonMineNeighbors = g.board.getNeighbors(cell.q, cell.r).filter(
          (n) => !n.mine && n.state === CELL_STATE.COVERED
        );
        const mineNeighbors = g.board.getNeighbors(cell.q, cell.r).filter(
          (n) => n.mine
        );

        // We need to flag exactly cell.adjacent neighbors, but at least one is wrong
        if (nonMineNeighbors.length > 0 && mineNeighbors.length + nonMineNeighbors.length >= cell.adjacent) {
          numberCell = cell;
          // Flag (adjacent - 1) correct mine neighbors + 1 incorrect non-mine neighbor
          let flagged = 0;
          for (const mn of mineNeighbors) {
            if (flagged >= cell.adjacent - 1) break;
            if (mn.state === CELL_STATE.COVERED) {
              g.handleFlag(mn.q, mn.r);
              flagged++;
            }
          }
          // Flag a non-mine neighbor to make it incorrect
          const wrongTarget = nonMineNeighbors[0];
          if (wrongTarget.state === CELL_STATE.COVERED) {
            g.handleFlag(wrongTarget.q, wrongTarget.r);
            flagged++;
          }

          if (flagged === cell.adjacent) break;
          // Reset if we didn't get the right count
          numberCell = null;
          // Unwind flags
          for (const mn of mineNeighbors) {
            if (mn.state === CELL_STATE.FLAGGED) {
              g.handleFlag(mn.q, mn.r); // to question
              g.handleFlag(mn.q, mn.r); // to covered
            }
          }
          if (wrongTarget.state === CELL_STATE.FLAGGED) {
            g.handleFlag(wrongTarget.q, wrongTarget.r);
            g.handleFlag(wrongTarget.q, wrongTarget.r);
          }
        }
      }
    }

    if (numberCell) {
      g.handleChord(numberCell.q, numberCell.r);
      expect(g.state).toBe(GAME_STATE.LOST);
    }
  });
});

describe('onStateChange callback', () => {
  it('fires when game state changes', () => {
    const cb = vi.fn();
    const g = new Game('easy', cb);
    g.handleReveal(0, 0);
    expect(cb).toHaveBeenCalled();
  });

  it('fires on reset', () => {
    const cb = vi.fn();
    const g = new Game('easy', cb);
    g.reset();
    expect(cb).toHaveBeenCalled();
  });

  it('fires on flag', () => {
    const cb = vi.fn();
    const g = new Game('easy', cb);
    g.handleFlag(0, 0);
    expect(cb).toHaveBeenCalled();
  });
});
