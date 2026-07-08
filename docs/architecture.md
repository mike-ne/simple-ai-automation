# Hex Minesweeper — Architecture Document

## Overview

The application is a fully static, single-page web application with no build step, no framework, and no backend. It uses native ES modules and a `<canvas>` element for rendering.

## Technology Stack

| Concern      | Choice                  | Rationale                                           |
|--------------|-------------------------|-----------------------------------------------------|
| Language     | Vanilla JavaScript ES2020+ | No dependencies; runs in all target browsers    |
| Rendering    | HTML `<canvas>` 2D API  | Precise hex rendering; no DOM overhead per cell     |
| Styling      | Plain CSS               | Minimal; no preprocessor needed                     |
| Modules      | Native ES modules       | No build step; `type="module"` in HTML              |
| Testing      | Vitest                  | Fast unit testing; runs in Node without DOM         |
| Dev server   | `serve` (npm package)   | Simple static file server for local development     |

## File Structure

```
/
├── index.html            # Shell: HTML, header UI, inline bootstrap script
├── style.css             # All visual styles (no canvas-drawn content)
├── src/
│   ├── hex.js            # Hex coordinate math (cube coords, neighbor lookup, pixel conversion)
│   ├── board.js          # Board state: cell objects, mine placement, cascade logic
│   ├── game.js           # Game state machine (Ready → Playing → Won/Lost), timer, mine counter
│   ├── renderer.js       # Canvas drawing: hexagons, numbers, icons, all cell states
│   └── input.js          # Mouse, touch, and keyboard event handling
├── tests/
│   ├── hex.test.js       # Unit tests for hex coordinate math
│   ├── board.test.js     # Unit tests for board state and game logic
│   └── game.test.js      # Unit tests for game state machine
├── docs/
│   ├── hex-minesweeper-requirements.md
│   ├── minesweeper-details.md
│   ├── implementation-plan.md
│   ├── product.md        # Product feature documentation
│   └── architecture.md   # This file
└── package.json          # Dev dependencies (vitest, serve)
```

## Module Responsibilities

### `src/hex.js`
- Hex coordinate math using **cube coordinates** (q, r, s where q+r+s=0)
- **Pointy-top** hexagon orientation
- Key exports: `hexNeighbors`, `hexDistance`, `generateHexGrid`, `hexToPixel`, `pixelToHex`, `computeCellSize`
- No DOM or game dependencies; pure math

### `src/board.js`
- Owns the `Board` class and `CELL_STATE` constants
- Cell objects: `{ q, r, state, mine, adjacent }`
- Mine placement deferred to first click (Fisher-Yates shuffle)
- Cascade reveal via BFS queue
- Chord logic, flag cycling, win/loss reveal
- No DOM dependency; pure logic

### `src/game.js`
- Owns the `Game` class and `GAME_STATE` constants
- State machine: `Ready → Playing → Won | Lost`
- Manages timer (1s interval, capped at 999)
- Delegates board mutations to `Board` instance
- Fires `onStateChange(game)` callback on any state change
- No DOM dependency

### `src/renderer.js`
- Owns the `Renderer` class
- Draws the full board on every state change via `requestAnimationFrame`
- Canvas primitives only (no emoji, no images)
- Manages canvas sizing via `computeCellSize`
- Tracks hover, pressed, and keyboard-focused cells for visual feedback

### `src/input.js`
- Owns the `InputHandler` class
- Handles mouse events (left-click, right-click, chord via simultaneous buttons)
- Handles touch events (tap = reveal, long-press = flag, tap-on-number = chord)
- Handles keyboard events (arrow keys, Enter/Space, F, C)
- Hit-tests canvas pixel coordinates via `pixelToHex`
- Fires game actions: `game.handleReveal`, `game.handleFlag`, `game.handleChord`

### `index.html` (inline `<script type="module">`)
- Bootstraps the application
- Wires DOM elements (mine counter, timer, reset button, difficulty buttons) to game callbacks
- Handles window resize events
- Shows/hides win/loss overlay

## Data Flow

```
User Input
    │
    ▼
InputHandler (input.js)
    │  hit-tests pixel → hex coords
    │  calls game.handleReveal / handleFlag / handleChord
    ▼
Game (game.js)
    │  delegates to Board, manages timer
    │  fires onStateChange callback
    ▼
index.html bootstrap
    │  updates mine counter, timer, reset face
    │  calls renderer.scheduleRedraw()
    ▼
Renderer (renderer.js)
    │  reads game.board.cells
    │  draws all cells via canvas 2D API
    ▼
Canvas (HTML)
```

## Hex Coordinate System

- **Cube coordinates**: every cell is identified by `(q, r)` where `s = -q - r` is implied.
- **Pointy-top** orientation: flat edges on left/right, points on top/bottom.
- `hexToPixel(q, r, size)`: maps cube coords to pixel center relative to board origin.
- `pixelToHex(x, y, size)`: maps pixel to nearest hex via fractional coords + rounding.
- Board origin `(0,0)` is the center cell; board center maps to canvas center via `offsetX/offsetY`.

## Board Sizing

- `computeCellSize(radius, width, height)` returns the largest integer cell size (in pixels) such that the board fits within the available canvas dimensions.
- Recalculated on every `window.resize` event.
- Canvas dimensions are set to the `board-container` element's client size.

## Testing Strategy

Unit tests cover:
- `hex.test.js`: grid cell counts (61/127/217), neighbor correctness, distance, pixel round-trips
- `board.test.js`: mine counts, first-click safety, cascade behavior, flag cycling, win/loss detection
- `game.test.js`: state transitions, timer behavior (with fake timers), mine counter arithmetic, chord logic

No E2E or browser tests (by design decision). UI validation is done manually or via the validator subagent skill.

## Agents

Custom OpenCode agents are defined in `.opencode/agents/` as markdown files.

| Agent | File | Purpose |
|-------|------|---------|
| `code-quality-reviewer` | `.opencode/agents/code-quality-reviewer.md` | Read-only subagent that reviews code quality across six dimensions (metrics, SOLID, polymorphism, test coverage, readability, design patterns) and writes a dated report to `docs/reports/code_quality_YYYY-MM-DD.md`. |
