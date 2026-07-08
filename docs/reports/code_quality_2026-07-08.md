# Code Quality Report — 2026-07-08

## Summary

The Hex Minesweeper codebase is compact, well-structured, and largely follows the architectural intent described in `docs/architecture.md`. Each source module has a clear, single responsibility and dependencies flow in the correct direction. The test suite is solid (79/79 passing), covering the core logic modules thoroughly, though the renderer and input handler are entirely untested by design. Readability is high throughout — naming is consistent, JSDoc comments are present, and control flow is straightforward. The main areas for improvement are a few minor coupling issues in `input.js`, the absence of event listener teardown (a potential memory-leak risk on difficulty change), and the lack of any coverage for the UI wiring code in `index.html`.

---

## 1. Standard Code Quality Metrics

**Rating:** Good

**Cyclomatic complexity:** All functions are short and focused. The highest complexity is in `Board._cascadeReveal` (BFS loop, ~15 lines) and `InputHandler._onMouseDown`/`_onMouseUp` (a few nested conditionals), but neither approaches a problematic threshold.

**Function/method length:** No function exceeds ~35 lines. The longest, `Renderer._drawMine` (src/renderer.js:265–292), is ~27 lines, which is reasonable given it encodes graphical geometry.

**File length and cohesion:** Files are appropriately sized (hex.js: 129 lines, board.js: 308 lines, game.js: 173 lines, renderer.js: 326 lines, input.js: 332 lines). Each file maps directly to one architectural concern.

**Code duplication:** Minimal. The `Math.sqrt(dx * dx + dy * dy) > TOUCH_MOVE_THRESHOLD` expression is computed twice in `input.js` (lines 227 and 250). Extracting a small `_hasTouchMoved(touch)` helper would eliminate this.

**Naming:** Consistently clear. Public methods use camelCase verbs (`handleReveal`, `cycleFlag`, `scheduleRedraw`), private helpers are prefixed with `_`, and constants use UPPER_SNAKE_CASE. `enqueue` as an inner closure name inside `_cascadeReveal` is a bit generic but readable in context.

**Dead code:** None identified. The comment on `src/hex.js:107` (`// else rs = -rq - rr; (not needed since we only return q, r)`) is informative rather than dead code.

**Error handling:** `Board.getCell` returns `null` for off-board coordinates and all callers check for it. `Board` constructor throws on unknown difficulty (src/board.js:36). No silent swallowing of errors. The `onStateChange` callback in `Game` defaults to a no-op rather than null-guarding on every call (src/game.js:23) — a clean pattern.

**Magic numbers / literals:** Most numeric constants are well-named (`LONG_PRESS_MS`, `TOUCH_MOVE_THRESHOLD`). A few raw pixel/ratio values appear in `renderer.js` (e.g., `size * 0.5`, `size * 0.3`, `size * 0.18`) — these are drawing proportions and are reasonable without naming given their local graphical context. The hardcoded `'#0077ff'` focus ring color (src/renderer.js:322) and the inline `'#333333'` question mark color (src/renderer.js:213) are inconsistent with the `COLORS` and `NUMBER_COLORS` objects defined at the top of the file.

---

## 2. SOLID Principles

### Single Responsibility
**Satisfied**

Each module owns exactly one concern: `hex.js` is pure coordinate math, `board.js` owns cell state and game logic, `game.js` owns the state machine and timer, `renderer.js` owns canvas drawing, and `input.js` owns event handling. The inline `<script>` in `index.html` acts as a thin wiring layer, which is the appropriate place for bootstrapping in a no-build-step project.

### Open/Closed
**Partially Satisfied**

Adding a new difficulty level requires editing the `DIFFICULTY` object in `board.js` (src/board.js:8–12). This is a straightforward data change rather than a logic change, which is acceptable. Adding a new cell state, however, would require changes across `board.js` (adding the constant), `renderer.js` (`_getCellFill` and `_drawCellContent` switches), and potentially `input.js` — a mild violation. The `switch` statements in `renderer.js:193–228` are the primary extension point that cannot be extended without modification.

### Liskov Substitution
**N/A**

No inheritance is used. All types are concrete classes or plain objects. There are no substitution relationships to evaluate.

### Interface Segregation
**Satisfied**

Consumers depend only on what they use. `InputHandler` calls only `game.handleReveal`, `game.handleFlag`, `game.handleChord`, `game.state`, and `game.board.getCell`; it does not depend on timer or mine counter logic. `Renderer` reads only `game.board.cells` and `game.board.radius`; it does not call game action methods.

### Dependency Inversion
**Satisfied with one caveat**

High-level modules (`game.js`, `board.js`, `hex.js`) have zero DOM or browser dependencies — they are pure logic. `renderer.js` and `input.js` correctly depend on the `Game` abstraction rather than directly on `Board`. The one caveat is that `InputHandler` directly reads `this.renderer._focusedCell` (src/input.js:278), bypassing the `Renderer`'s public `setFocusedCell`/getter interface and coupling to an internal field name.

---

## 3. Polymorphism Opportunities

**One genuine opportunity identified:**

The `_getCellFill` switch in `renderer.js:193–203` and the `_drawCellContent` switch in `renderer.js:207–228` both dispatch on `cell.state`. If the set of cell states were to expand, these two switches would both need updating. A **Strategy pattern** (e.g., a map from `CELL_STATE` value → `{ fill, drawContent }` descriptor object) could centralize all per-state rendering decisions in one place. This is not urgent at the current scale, but would be a clean improvement if more states were added.

No other significant polymorphism opportunities exist. The `GAME_STATE` transitions in `game.js` are clean `if` chains rather than switches, and the game logic is simple enough that a State pattern object hierarchy would add unnecessary ceremony.

---

## 4. Test Coverage

**Rating:** Good

**Test run summary:** 79 tests across 3 test files — all passing (0 failures).

**Coverage by module:**

| Module | Test file | Assessment |
|---|---|---|
| `src/hex.js` | `tests/hex.test.js` (20 tests) | Excellent — grid generation, neighbor correctness, distance, pixel round-trips, edge cell counts all covered |
| `src/board.js` | `tests/board.test.js` (32 tests) | Excellent — construction, mine placement, first-click safety, cascade, flag cycling, chord, win, loss reveal all covered |
| `src/game.js` | `tests/game.test.js` (27 tests) | Good — all state transitions, timer with fake timers, mine counter, reset, callback firing |
| `src/renderer.js` | None | Untested (by design — canvas rendering is not unit-testable without a browser) |
| `src/input.js` | None | Untested (by design — requires DOM events) |
| `index.html` (bootstrap script) | None | Untested — wiring logic such as `formatCounter`, `setFace`, overlay show/hide, and difficulty change recreation are not tested |

**Edge cases and boundaries:**
- First-click safety is tested with 20 randomised runs (board.test.js:57–86) — good probabilistic coverage.
- Timer cap at 999 is explicitly tested (game.test.js:160–167).
- Negative mine counter is tested (game.test.js:208–218, board.test.js:222–235).
- Cascade correctness (never reveals mines) is tested (board.test.js:188–198).
- Chord with incorrect flag causing loss is tested (game.test.js:228–286), though the test has a `return` early exit that could silently skip the assertion (line 231).

**Untested behaviors worth noting:**
- `computeCellSize` in `hex.js` is imported by `renderer.js` but not tested directly.
- The `formatCounter` helper in `index.html` (handles negative display with `-XX` format) is untested.
- The difficulty-change recreation path in `index.html:191–200` (which fixes BUG-3) is untested — this is the most critical untested path given its bug history.

---

## 5. Readability

**Rating:** Good

**Intent clarity:** Every module opens with a short JSDoc module-level comment stating its purpose. Every public method has a `@param`/`@returns` JSDoc block. Private helpers are clearly prefixed with `_`. The BFS cascade algorithm in `board.js:152–185` is readable and the inner `enqueue` closure is well-explained by context.

**Comments:** Inline comments are used judiciously — explaining the Fisher-Yates shuffle bound (`src/board.js:98–104`), the `+0` workaround for `-0` in hex generation (`src/hex.js:52–53`), and the `hexRound` omission (`src/hex.js:107`). These are exactly the places where comments add value.

**Formatting:** Consistent throughout — 2-space indentation, aligned object literals (e.g., `DIFFICULTY` and `COLORS`), and section dividers in `input.js` and `renderer.js` for mouse/touch/keyboard groupings.

**Minor issues:**
- `src/input.js:278` directly accesses `this.renderer._focusedCell` (a private field), which is surprising at a read. A `renderer.getFocusedCell()` getter would make this more readable and correct.
- The `onSurprised` callback in `InputHandler` (src/input.js:18) is not documented with JSDoc, unlike the other constructor params.
- In `game.js:_endGame`, the ternary logic is clear, but a brief comment noting that `flagAllMinesOnWin`/`revealAllOnLoss` are called here for visual feedback (not game logic) would help a new reader understand why the board is mutated at game end.

---

## 6. Anti-patterns

**Rating:** Good

**Memory leak risk (Shotgun Surgery / missing teardown):** When difficulty changes, `index.html:191–200` recreates `game`, `renderer`, and `input` as new instances, but the previous `InputHandler` instance's event listeners are never removed from the canvas. Since all three objects share the same canvas element, the old listeners remain attached to the DOM and hold references to the replaced game/renderer objects. This prevents GC and causes the old input handler to still respond to events (e.g., `mouseleave` clearing hover on the old renderer, which is harmless but wasteful). This is the most significant defect identified.

**Private field access across class boundary:** `input.js:278` reads `this.renderer._focusedCell` directly. This is a mild form of **feature envy** — `InputHandler` is reaching into `Renderer`'s internal state rather than using a public accessor.

**No other significant anti-patterns identified.** The codebase avoids God objects, spaghetti code, copy-paste programming, and hardcoded configuration. The `DIFFICULTY` presets and `COLORS`/`NUMBER_COLORS` maps are clean examples of keeping configuration in one place.

---

## 7. Design Patterns

### Patterns in Use

| Pattern | Location | Assessment |
|---|---|---|
| **State Machine** | `src/game.js` — `GAME_STATE` enum + transitions in `handleReveal`, `handleFlag`, `handleChord` | Appropriately used; transitions are explicit and exhaustive |
| **Observer / Callback** | `Game.onStateChange` callback (src/game.js:23,45,61,71,125,144,170) | Clean single-callback observer; appropriate for the scale |
| **Strategy (data-driven)** | `COLORS` and `NUMBER_COLORS` maps in `renderer.js:11–33` | Good use of lookup tables to avoid conditional chains for simple value dispatch |
| **Facade** | `Game` class wrapping `Board` — callers never directly call `Board` methods | Appropriately used; keeps the public API surface minimal |
| **RAF Debounce** | `Renderer.scheduleRedraw` with `_rafPending` guard (src/renderer.js:74–81) | Correct and efficient; prevents redundant draw calls |

### Recommended Patterns

**Strategy for cell rendering (renderer.js:193–228):** The two `switch` blocks in `_getCellFill` and `_drawCellContent` are currently the only places where adding a new `CELL_STATE` requires editing two locations. Replacing them with a single `CELL_RENDERERS` map (`state → { fill, drawContent }`) would co-locate all per-state rendering decisions, making additions touch one line rather than two switch cases:

```js
// Illustrative — not a required change at current scale
const CELL_RENDERERS = {
  [CELL_STATE.FLAGGED]: { fill: COLORS.flagged, draw: (ctx, cx, cy, size) => drawFlag(ctx, cx, cy, size) },
  // ...
};
```

Only recommended if new cell states are anticipated.

---

## 8. Priority Recommendations

1. **Fix missing event listener teardown on difficulty change**
   - **Where:** `index.html:191–200`
   - **Why it matters:** Every difficulty change leaves orphaned event listeners on the canvas, holding references to stale `game`/`renderer` objects. Over multiple resets this accumulates garbage and causes the old input handler to still fire events. This was also the root area where BUG-3 (ghost game) was introduced.
   - **Suggestion:** Add a `destroy()` method to `InputHandler` that calls `removeEventListener` for each bound handler. Store the bound functions as instance properties during `_bindEvents` so they can be removed by reference. Call `input.destroy()` before reassigning.

2. **Expose `_focusedCell` via a public accessor on `Renderer`**
   - **Where:** `src/input.js:278`, `src/renderer.js`
   - **Why it matters:** Direct private field access across class boundaries creates hidden coupling. If the field is renamed or its semantics change, the bug will be silent.
   - **Suggestion:** Add `getFocusedCell() { return this._focusedCell; }` to `Renderer` and update `input.js:278` to call `this.renderer.getFocusedCell()`.

3. **Add unit tests for `index.html` helper functions**
   - **Where:** `index.html:94–132` (`padNum`, `formatCounter`, `setFace`, `showOverlay`, `hideOverlay`)
   - **Why it matters:** The difficulty-change recreation path was where BUG-3 lived. The `formatCounter` function handles a non-trivial negative-number display format. Neither is currently tested.
   - **Suggestion:** Extract the helper functions from the inline script into a `src/ui.js` module and add a `tests/ui.test.js`. This also aligns with the existing module-per-concern architecture.

4. **Add the two inline color literals to the `COLORS` constant map**
   - **Where:** `src/renderer.js:213` (`'#333333'` for question mark) and `src/renderer.js:322` (`'#0077ff'` for focus ring)
   - **Why it matters:** These values are inconsistent with the `COLORS` map that holds all other cell colors. Changing the color scheme requires knowing to look in two places.
   - **Suggestion:** Add `questionText: '#333333'` and `focusRing: '#0077ff'` to the `COLORS` object and reference them by name.

5. **Harden the chord integration test's conditional skip**
   - **Where:** `tests/game.test.js:231` (`if (g.state !== GAME_STATE.PLAYING) return;`)
   - **Why it matters:** If the game immediately reaches WON state (unlikely but possible), the test silently passes without exercising any assertions. This is a flaky-by-design test.
   - **Suggestion:** Use a difficulty/seed that guarantees a PLAYING state, or use `expect.assertions(1)` to fail the test if no assertions are reached.
