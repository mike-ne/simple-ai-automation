/**
 * Game state machine: manages game flow, timer, and mine counter.
 * States: ready → playing → won | lost
 * Any state → (reset) → ready
 */

import { Board } from './board.js';

export const GAME_STATE = {
  READY:   'ready',
  PLAYING: 'playing',
  WON:     'won',
  LOST:    'lost',
};

export class Game {
  /**
   * @param {'easy'|'medium'|'hard'} difficulty
   * @param {function} onStateChange  - callback(game) fired on any state change
   */
  constructor(difficulty, onStateChange) {
    this.difficulty = difficulty;
    this.onStateChange = onStateChange ?? (() => {});
    this._reset();
  }

  _reset() {
    this.state = GAME_STATE.READY;
    this.board = new Board(this.difficulty);
    this.elapsed = 0;
    this._clearTimer();
  }

  _clearTimer() {
    if (this._timerHandle != null) {
      clearInterval(this._timerHandle);
      this._timerHandle = null;
    }
  }

  _startTimer() {
    this._clearTimer();
    this._timerHandle = setInterval(() => {
      this.elapsed = Math.min(this.elapsed + 1, 999);
      this.onStateChange(this);
    }, 1000);
  }

  _stopTimer() {
    this._clearTimer();
  }

  _endGame(won) {
    this._stopTimer();
    this.state = won ? GAME_STATE.WON : GAME_STATE.LOST;
    if (won) {
      this.board.flagAllMinesOnWin();
    } else {
      this.board.revealAllOnLoss();
    }
    this.onStateChange(this);
  }

  /**
   * Resets the game with an optional new difficulty.
   * @param {'easy'|'medium'|'hard'} [difficulty]
   */
  reset(difficulty) {
    if (difficulty) this.difficulty = difficulty;
    this._reset();
    this.onStateChange(this);
  }

  /**
   * Returns the mine counter value (totalMines - flagsPlaced).
   * @returns {number}
   */
  getMineCounter() {
    return this.board.getMineCounter();
  }

  /**
   * Returns elapsed seconds (capped at 999).
   * @returns {number}
   */
  getTimer() {
    return this.elapsed;
  }

  /**
   * Handles a reveal action (left-click / tap).
   * @param {number} q
   * @param {number} r
   * @returns {boolean} true if action was processed
   */
  handleReveal(q, r) {
    if (this.state === GAME_STATE.WON || this.state === GAME_STATE.LOST) return false;

    const cell = this.board.getCell(q, r);
    if (!cell) return false;

    // Place mines on first click
    if (this.state === GAME_STATE.READY) {
      this.board.placeMines(q, r);
      this.state = GAME_STATE.PLAYING;
      this._startTimer();
    }

    const result = this.board.reveal(q, r);

    if (result === 'mine') {
      this._endGame(false);
      return true;
    }

    if (result === 'flagged' || result === 'already-revealed' || result === 'invalid') {
      return false;
    }

    if (this.board.isWon()) {
      this._endGame(true);
      return true;
    }

    this.onStateChange(this);
    return true;
  }

  /**
   * Handles a flag/cycle action (right-click / long-press).
   * @param {number} q
   * @param {number} r
   * @returns {boolean} true if action was processed
   */
  handleFlag(q, r) {
    if (this.state === GAME_STATE.WON || this.state === GAME_STATE.LOST) return false;

    const cell = this.board.getCell(q, r);
    if (!cell) return false;

    const newState = this.board.cycleFlag(q, r);
    if (newState === null) return false;

    this.onStateChange(this);
    return true;
  }

  /**
   * Handles a chord action (simultaneous click or tap on revealed number).
   * @param {number} q
   * @param {number} r
   * @returns {boolean} true if action was processed
   */
  handleChord(q, r) {
    if (this.state !== GAME_STATE.PLAYING) return false;

    const { triggered, hitMine } = this.board.chord(q, r);
    if (!triggered) return false;

    if (hitMine) {
      this._endGame(false);
      return true;
    }

    if (this.board.isWon()) {
      this._endGame(true);
      return true;
    }

    this.onStateChange(this);
    return true;
  }
}
