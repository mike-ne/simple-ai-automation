# Known Bugs

This file tracks known bugs found during validation. Each entry includes the related acceptance criterion, a description of the issue, and the recommended fix.

---

## BUG-1: Timer Interval Leak on Mid-Game Difficulty Switch

**Severity:** High
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
