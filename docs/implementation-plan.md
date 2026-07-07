# Hex Minesweeper — Implementation Plan

## Overview

This document describes the technical plan for implementing the Hex Minesweeper game as specified in `hex-minesweeper-requirements.md`. The game will be a self-contained, static, browser-based application with no build tools, no frameworks, and no backend required — plain HTML, CSS, and JavaScript.

---

## Technology Choices

| Concern          | Choice                                                         | Rationale                                                    |
|------------------|----------------------------------------------------------------|--------------------------------------------------------------|
| Language         | Vanilla JavaScript (ES2020+)                                   | No dependencies; works in all target browsers without transpile |
| Rendering        | HTML `<canvas>` element                                        | Precise hexagon rendering; avoids DOM-per-cell overhead at Hard (217 cells) |
| Styling          | Plain CSS (single file)                                        | Minimal, no preprocessor needed                              |
| Structure        | Single HTML file + separate JS/CSS files                       | Simple deployment; open the HTML file directly               |
| Testing          | Vitest (unit tests only)                                       | Fast, lightweight, runs in Node with no DOM. Playwright E2E excluded by decision. |
| Icons            | Canvas primitives (drawn triangles, circles)                   | Pixel-perfect; consistent across all browsers/OSes. No emoji. |

---

## File Structure

```
/
├── index.html            # Shell: imports CSS and JS; contains header UI elements
├── style.css             # All visual styles except canvas-drawn content
├── src/
│   ├── hex.js            # Hex coordinate math (cube coordinates, neighbor offsets, pixel conversion)
│   ├── board.js          # Board state: cell objects, mine placement, cascade logic
│   ├── game.js           # Game state machine (Ready → Playing → Won/Lost), timer, mine counter
│   ├── renderer.js       # Canvas drawing: hexagons, numbers, icons, all cell states
│   └── input.js          # Mouse and touch event handling, chording, long-press detection
├── tests/
│   ├── hex.test.js
│   ├── board.test.js
│   └── game.test.js
└── docs/
    ├── hex-minesweeper-requirements.md
    ├── minesweeper-details.md
    ├── implementation-plan.md   ← this file
    ├── product.md
    └── architecture.md
```

---

## Phase 1 — Hex Coordinate System (`src/hex.js`)

All hex math uses **cube coordinates** (q, r, s where q+r+s=0). This is the most robust system for neighbor lookup, distance, and pixel conversion.

### Key functions to implement

| Function | Signature | Description |
|---|---|---|
| `hexNeighbors` | `(q, r) → [{q,r}×6]` | Returns the 6 cube-coordinate neighbors |
| `hexDistance` | `(a, b) → int` | Chebyshev distance in cube space |
| `generateHexGrid` | `(radius) → [{q,r}]` | All cells within `radius` rings of origin |
| `hexToPixel` | `(q, r, size) → {x, y}` | Pointy-top layout pixel center |
| `pixelToHex` | `(x, y, size) → {q, r}` | Reverse: pixel → nearest hex |

**Orientation:** Pointy-top hexagons, which display better in portrait viewports and on mobile.

**Cell size:** Computed dynamically so the full board fits within the viewport minus the header height. Recalculated on `resize`.

### Acceptance criteria covered: AC-4.1, AC-4.2, AC-4.3, AC-4.4

---

## Phase 2 — Board State (`src/board.js`)

### Cell object schema

```js
{
  q: number,       // cube coordinate
  r: number,
  state: string,   // 'covered' | 'flagged' | 'question' | 'revealed' | 'exploded' | 'revealed-mine' | 'wrong-flag' | 'correct-flag'
  mine: boolean,
  adjacent: number // 0–6, computed after mine placement
}
```

### Board initialization

1. Build the full cell list from `generateHexGrid(radius)`.
2. Set all cells to `state: 'covered'`, `mine: false`, `adjacent: 0`.
3. Mine placement is **deferred** until first click.

### Mine placement (deferred, first-click safe)

1. Collect the set of forbidden cells: first-clicked cell + its 6 neighbors.
2. Randomly sample the required mine count from the remaining cells (Fisher-Yates shuffle, take N).
3. Compute `adjacent` for every cell by summing mine flags across its neighbors.

### Cascade reveal (BFS)

```
queue = [clicked cell]
while queue not empty:
  cell = dequeue
  if cell.state != 'covered': skip
  reveal cell
  if cell.adjacent == 0:
    enqueue all covered, unflagged neighbors
```

Flagged cells are never enqueued.

### Acceptance criteria covered: AC-3.1–3.5, AC-5.1–5.4, AC-6.1–6.5, AC-8.1–8.3

---

## Phase 3 — Game State Machine (`src/game.js`)

### States

```
Ready → (first click) → Playing → (all safe revealed) → Won
                                 → (mine clicked)      → Lost
Any state → (reset) → Ready
```

### Responsibilities

- Hold a reference to the `Board` instance.
- Manage the timer: `setInterval` at 1 s increments, cap at 999, clear on win/loss/reset.
- Track mine counter: `totalMines - flagsPlaced`.
- Expose `handleReveal(q, r)`, `handleFlag(q, r)`, `handleChord(q, r)` methods that board + game logic delegate through.
- Emit a `stateChange` callback so `renderer.js` and the header UI can update.

### Acceptance criteria covered: AC-7.1–7.6, AC-9.1–9.3, AC-10.1–10.5, AC-11.1–11.4, AC-12.2, AC-12.5, AC-12.6

---

## Phase 4 — Canvas Renderer (`src/renderer.js`)

### Drawing approach

- One `<canvas>` element sized to fill the board container.
- Full redraw on every state change (no partial updates needed at this board size).
- `requestAnimationFrame` used to batch redraws.

### Hex cell drawing

```
For each cell:
  1. Compute pixel center via hexToPixel.
  2. Draw hexagon path (6 vertices from center + size + angle offset for pointy-top).
  3. Fill with state-dependent color.
  4. Stroke border.
  5. Draw text/icon overlay if needed.
```

### Cell state → visual mapping

| State | Fill | Label |
|---|---|---|
| Covered | Mid-gray | — |
| Flagged | Mid-gray | Flag icon (🚩 or drawn triangle) |
| Question | Mid-gray | `?` |
| Revealed blank | Light gray | — |
| Revealed number | Light gray | Number in color per spec (§12.6) |
| Exploded mine | Red | Mine icon |
| Revealed mine | Dark gray | Mine icon |
| Wrong flag | Dark gray | Mine + X |
| Correct flag | Mid-gray | Flag icon |

Number colors (1→Blue, 2→Green, 3→Red, 4→Dark Navy, 5→Dark Red, 6→Teal) are applied via `ctx.fillStyle`.

### Reset button face icons

Rendered as text/emoji in a `<button>` element in the HTML header (not on canvas). CSS classes swap the icon:
- `.state-playing` → 🙂
- `.state-surprised` → 😮  (mousedown on covered cell)
- `.state-won` → 😎
- `.state-lost` → 😵

### Responsiveness

- On `window.resize`, recompute cell size and canvas dimensions, then redraw.
- Header UI uses flexbox; no fixed widths.

### Acceptance criteria covered: AC-6.1, AC-12.1–12.7, AC-15.1–15.3

---

## Phase 5 — Input Handling (`src/input.js`)

### Mouse events (canvas)

| Event | Action |
|---|---|
| `mousedown` (button 0) on covered/question cell | Set surprised face |
| `mouseup` (button 0) | Reveal cell; revert face |
| `contextmenu` | Prevent default; cycle flag state |
| `mousedown` (button 0) + `mousedown` (button 2) simultaneously on revealed number | Chord |

### Touch events

| Gesture | Maps to |
|---|---|
| Tap (< 500 ms) | Reveal (left-click) |
| Long-press (≥ 500 ms) | Flag/cycle (right-click) |
| Tap on revealed number when surrounding flags = number | Chord |

Long-press detection uses a `setTimeout` set on `touchstart`, cancelled on `touchend`/`touchmove` if the finger moves more than a few pixels.

### Hit testing

```
canvas.addEventListener('mouseup', e => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const {q, r} = pixelToHex(x - offsetX, y - offsetY, cellSize);
  // verify (q,r) is a valid board cell before acting
});
```

`offsetX`/`offsetY` are the canvas translation applied so the board center aligns with the canvas center.

### Acceptance criteria covered: AC-7.1–7.5, AC-13.1–13.4

---

## Phase 6 — HTML & CSS Shell (`index.html`, `style.css`)

### Header layout (flexbox row)

```
[ Mine Counter ]  [ Reset Button ]  [ Timer ]
                  [ Difficulty Selector ]
```

### Accessibility

- `<button aria-label="Reset game">` with role-appropriate aria attributes.
- `<output aria-live="polite">` for mine counter and timer.
- `<select>` for difficulty (native accessible control).
- Canvas is marked `role="application"` with `aria-label="Hex Minesweeper board"`.
- Keyboard: Tab navigates header controls; canvas receives focus and arrow keys can be wired to move a "cursor hex" for keyboard reveal/flag (Phase 7 stretch).

### Acceptance criteria covered: AC-12.1–12.7, AC-16.1–16.4

---

## Phase 7 — Keyboard Accessibility (Stretch / AC-16.1)

To make the board keyboard-accessible:

- Canvas tracks a focused cell (highlighted differently).
- Arrow keys move the focused cell through the hex grid.
- `Enter` or `Space` reveals; `F` flags; `C` chords.
- `Tab` cycles focus between header and board.

This is the most complex accessibility feature and can be deferred to after core gameplay works.

---

## Phase 8 — Testing

### Unit tests (`tests/`)

| File | What to test |
|---|---|
| `hex.test.js` | `generateHexGrid` cell counts (61/127/217), `hexNeighbors` returns 6 items, interior vs edge vs corner neighbor counts |
| `board.test.js` | Mine count after placement, first-click safety (clicked cell + neighbors mine-free), cascade stops at flags, win/loss detection |
| `game.test.js` | State transitions, timer start/stop, mine counter arithmetic, chording logic |

---

## Implementation Order

1. `src/hex.js` + unit tests — foundation everything else depends on.
2. `src/board.js` + unit tests — pure logic, no DOM.
3. `src/game.js` + unit tests — state machine over board.
4. `index.html` + `style.css` — shell with static layout; canvas placeholder.
5. `src/renderer.js` — canvas drawing connected to board/game state (icons drawn with canvas primitives).
6. `src/input.js` — wire up mouse and touch events.
7. Accessibility pass (ARIA, color contrast check; header controls only — canvas keyboard nav deferred).
8. Canvas keyboard navigation (focused-cell cursor, arrow keys, keyboard reveal/flag) — deferred Phase 7.
9. Update `docs/product.md` and `docs/architecture.md`.

---

## Decisions Log

| # | Question | Decision |
|---|----------|----------|
| 1 | Testing dependencies | Vitest only (unit tests). No Playwright. |
| 2 | Build step | None. Native ES modules (`type="module"`). Open `index.html` directly. |
| 3 | Flag / mine icons | Canvas primitives only. No Unicode emoji. |
| 4 | Keyboard nav on the board | Deferred until after core gameplay is complete. |
