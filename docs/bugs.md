# Known Bugs

This file tracks known bugs found during validation. Each entry includes the related acceptance criterion, a description of the issue, and the recommended fix.

---

## BUG-1: Timer Interval Leak on Mid-Game Difficulty Switch

**Severity:** High
**Status:** Open
**Related AC:** AC-11.2, AC-11.3
**Found by:** Validator subagent (automated smoke test)

### Description

When a player starts a game (causing the timer to begin counting) and then switches difficulty without first clicking the reset button, the old `Game` object's `setInterval` is never cleared. The stale interval continues running in the background and keeps updating the timer display, meaning the timer on the new board starts immediately and at the wrong value — corrupting the game state display before the player has made their first move.

### Steps to Reproduce

1. Start the app and select any difficulty.
2. Click a cell to start the timer.
3. Without resetting, click a different difficulty button.
4. Observe: the timer is already running on the new board before any click.

### Expected Behavior

Switching difficulty should reset the game completely. The timer should not start until the player clicks their first cell on the new board.

### Recommended Fix

In `index.html`, inside the difficulty-switch handler (around line 191), call `game._clearTimer()` before reassigning `game` to a new `Game` instance:

```js
game._clearTimer(); // stop the old interval
game = new Game(currentDifficulty, onStateChange);
```

---

## BUG-2: Mobile Touch Target Size Below 44×44px Minimum (AC-13.1)

**Severity:** Medium
**Status:** Open
**Related AC:** AC-13.1
**Found by:** Validator subagent (code review + viewport analysis)

### Description

At a 375px viewport width (e.g. iPhone SE), hex cells do not meet the 44×44 CSS pixel minimum touch target size required by AC-13.1. Specifically:

- **Easy** board: cells are approximately 38px wide × 44px tall — width is below minimum.
- **Medium** board: cells are approximately 26px wide — significantly below minimum.
- **Hard** board: cells are approximately 19px wide — well below minimum.

The height may meet the requirement in some cases, but the width consistently falls short at narrow viewports.

### Steps to Reproduce

1. Open the app in a browser with a 375px viewport (or use DevTools device emulation for iPhone SE).
2. Start a Medium or Hard game.
3. Observe: cells are very small and difficult to tap accurately.

### Expected Behavior

All cell touch targets should be at least 44×44 CSS px on mobile viewports per AC-13.1.

### Recommended Fix

Options (pick one or combine):

1. Add `overflow-x: auto` on the board container and enforce a minimum board width so cells never shrink below 44px.
2. Clamp the computed cell size to a minimum (e.g., `size = Math.max(computedSize, 24)`) and allow the board to scroll horizontally when it overflows the viewport.
3. Document the minimum supported viewport width in `README.md` if full mobile support is descoped.

---

## BUG-3: Old Game State Persists Underneath New Game on Difficulty Switch

**Severity:** High
**Status:** Fixed
**Related AC:** AC-6.1, AC-6.2
**Found by:** Manual testing (user report)

### Description

When the player changes difficulty, the previous `Game` instance is not fully torn down. The old game's board state (including mine positions) remains active beneath the new game's rendering. As a result, a click on a cell that appears safe in the new game can trigger a loss because the underlying old game object registers the click against its own mine layout — which may have a mine at that coordinate.

### Steps to Reproduce

1. Start the app and select any difficulty (e.g. Easy).
2. Make a few moves so a game is in progress.
3. Without resetting, click a different difficulty button (e.g. Hard).
4. Click cells on the new board.
5. Observe: it is possible to lose on a cell that shows no mine in the new game's visible state.

### Expected Behavior

Selecting a new difficulty should completely destroy the previous game instance and create a fresh one. No state, event listeners, or data from the old game should persist or influence the new game.

### Recommended Fix

When the difficulty-switch handler fires, fully reset all game state before constructing a new `Game` instance. This should include:

- Clearing any active timers (see also BUG-1).
- Removing or replacing all event listeners attached by the old game.
- Ensuring the new `Game` instance generates a fresh board with its own mine positions, with no reference to the old instance remaining.

### Fix Applied

Added a `destroy()` method to `InputHandler` (`src/input.js`) that removes all canvas event listeners. Bound handler references are now stored as instance properties (`this._bound`) so they can be passed to `removeEventListener`. The difficulty-switch handler in `index.html` now calls `input.destroy()` and `game._clearTimer()` before replacing both instances, fully severing the old game from the canvas.
