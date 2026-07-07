# Minesweeper — Complete Implementation Reference

This document describes all rules, states, mechanics, and UI elements required to implement a faithful Minesweeper game.

---

## 1. Overview

Minesweeper is a single-player logic puzzle game played on a rectangular grid. A fixed number of mines are hidden beneath the tiles. The player's goal is to reveal every tile that does not contain a mine without accidentally clicking one. Numbers on revealed tiles tell the player how many mines are in the immediately surrounding tiles, allowing logical deduction of mine locations.

---

## 2. Grid & Difficulty Levels

The board is a rectangular grid of cells (also called tiles or squares). Standard difficulty presets:

| Difficulty   | Grid Size    | Total Cells | Mines | Mine Density |
|--------------|--------------|-------------|-------|--------------|
| Beginner     | 9 × 9        | 81          | 10    | ~12.3%       |
| Intermediate | 16 × 16      | 256         | 40    | ~15.6%       |
| Expert       | 30 × 16      | 480         | 99    | ~20.6%       |

Custom difficulty allows the player to specify arbitrary width, height, and mine count. The mine count must be less than the total number of cells (at minimum, leave at least one safe cell).

---

## 3. Mine Placement

- Mines are placed **randomly** across the grid before (or just after) the first click.
- **First-click safety guarantee:** The cell the player clicks first is **never** a mine. Mines are either placed after the first click (deferring generation) or, if pre-placed, any mine on the first-clicked cell is moved to another random empty cell.
- **Extended first-click safety (common modern variant):** The first clicked cell AND all of its neighbors are guaranteed to be mine-free, ensuring the player always starts with an "opening" (see Section 6).
- Each cell holds at most one mine.
- Mine positions are fixed for the duration of a game — they do not move after placement.

---

## 4. Cell / Tile States

Every cell on the board is in exactly one of the following states at any point in time:

### 4.1 Unrevealed (Covered)
- The default state for all cells at game start.
- The cell appears as a raised/blank square.
- The player does not know what is underneath.
- The player can **left-click** to reveal or **right-click** to flag.

### 4.2 Flagged
- The player has right-clicked an unrevealed cell, placing a flag marker (🚩).
- Indicates the player believes a mine is here.
- A flagged cell **cannot** be accidentally revealed by a left-click — the flag acts as protection.
- Right-clicking a flagged cell cycles to the next state (either Question Mark or back to Unrevealed, depending on implementation).
- The mine counter decrements by 1 when a flag is placed (even if the flag is wrong).
- The mine counter increments by 1 when a flag is removed.

### 4.3 Question Mark (Optional State)
- An intermediate marker for cells the player is uncertain about.
- Applied by right-clicking a flagged cell a second time.
- The cell is still unrevealed and can be left-clicked to reveal.
- Right-clicking a question-mark cell returns it to Unrevealed.
- Question marks do **not** affect the mine counter.
- Cycling order: Unrevealed → Flagged → Question Mark → Unrevealed.
- Some implementations omit this state and cycle directly: Unrevealed → Flagged → Unrevealed.

### 4.4 Revealed — Blank (Empty / Zero)
- The cell has been revealed and has **zero** adjacent mines.
- Displayed as an empty, flat (depressed) square with no number.
- Triggers an automatic **cascade** (flood fill) — see Section 6.

### 4.5 Revealed — Number (1 through 8)
- The cell has been revealed and has 1–8 adjacent mines.
- Displays the count as a colored digit.
- Standard number colors (classic Windows Minesweeper):
  - 1 → Blue
  - 2 → Green
  - 3 → Red
  - 4 → Dark Blue / Navy
  - 5 → Dark Red / Maroon
  - 6 → Cyan / Teal
  - 7 → Black
  - 8 → Gray
- A number cell can be used for **chording** (see Section 7).

### 4.6 Revealed — Mine / Exploded (Game Over)
- The player left-clicked a cell containing a mine.
- The clicked mine cell is shown with a special "exploded" or highlighted mine icon (often displayed with a red background to distinguish it from other mines).
- This immediately ends the game in a loss.

### 4.7 Revealed — Mine (Game Over, Other Mines)
- Upon a loss, all other hidden mines that were **not flagged** are revealed, showing a plain mine icon.
- These are displayed differently from the exploded mine to indicate they were not the cause of the loss.

### 4.8 Revealed — Wrong Flag (Game Over)
- Upon a loss, any cell the player had **flagged incorrectly** (i.e., it did not contain a mine) is shown with a mine icon crossed out or marked with an X.
- This helps the player see where they made logical errors.

### 4.9 Revealed — Correctly Flagged Mine (Game Won / Game Over)
- At game end (win or loss), all correctly flagged mines remain displaying their flag icon (or are visually confirmed as correct).

---

## 5. Adjacency & Number Calculation

- Every cell has up to **8 neighbors**: the cells directly above, below, left, right, and the four diagonals.
- Edge cells have 5 neighbors; corner cells have 3 neighbors.
- The number displayed on a revealed cell equals the **exact count of mines among all 8 (or fewer, on edges) neighboring cells**.
- Numbers range from 1 to 8. Zero is displayed as blank (no number).
- Numbers are always accurate — they never change and are never wrong.
- A number counts **all** neighboring mines regardless of whether those neighboring cells are revealed or unrevealed, flagged or unflagged.

```
Example adjacency for cell (row=1, col=1) on a 3×3 grid:
  [0,0] [0,1] [0,2]
  [1,0] [1,1] [1,2]   <- (1,1) has 8 neighbors: all surrounding cells
  [2,0] [2,1] [2,2]

Example adjacency for cell (row=0, col=0) — corner:
  [0,0] [0,1]
  [1,0] [1,1]         <- (0,0) has only 3 neighbors: (0,1), (1,0), (1,1)
```

---

## 6. Cascade / Flood Fill (Auto-Reveal)

When a cell with **zero adjacent mines** (blank cell) is revealed:
1. All of its unrevealed, unflagged neighbors are **automatically revealed**.
2. For each newly revealed neighbor that is also blank (zero adjacent mines), the process repeats recursively.
3. The cascade stops when all reachable blank cells and their numbered borders have been revealed.
4. Flagged cells are **not** auto-revealed during a cascade — flags block the cascade.
5. The cascade can open large sections of the board from a single click.

This is typically implemented as a breadth-first search (BFS) or depth-first search (DFS) flood fill algorithm.

---

## 7. Player Actions

### 7.1 Reveal (Left-Click / Tap)
- Applies to: Unrevealed cells and Question Mark cells.
- If the cell contains a mine → game over (loss).
- If the cell is blank (0 adjacent mines) → reveal and trigger cascade.
- If the cell has adjacent mines → reveal and display number.
- Has no effect on already-revealed cells or flagged cells.

### 7.2 Flag / Unflag (Right-Click / Long-Press)
- Applies to: Unrevealed cells and Flagged/Question Mark cells.
- On an unrevealed cell → places a flag (🚩); mine counter decrements.
- On a flagged cell → either removes the flag (mine counter increments) or cycles to Question Mark.
- On a question mark cell → removes the mark, returning to unrevealed.
- Has no effect on already-revealed cells.
- The player can place more flags than there are mines (the mine counter can go negative).

### 7.3 Chord (Middle-Click, Double-Click, or Left+Right Click on revealed number)
- Applies to: Revealed number cells.
- **Condition:** The number of flags immediately surrounding the cell equals the cell's number value.
- **Effect:** All unrevealed, unflagged neighbors of that cell are revealed simultaneously.
- If the surrounding flags are **incorrectly placed** (a flagged cell does not actually contain a mine), chording will reveal a mine and cause a loss.
- Chording does **not** affect flagged neighbors — only unflagged unrevealed ones.
- Chording a blank (0) cell is typically a no-op since it has no flags and no number.
- Input variants:
  - Classic: Press left + right mouse buttons simultaneously over a revealed number.
  - Alternative: Middle mouse button click.
  - Alternative: Double left-click on a revealed number.
  - Mobile: Tap a revealed number when adjacent flags match the number.

---

## 8. Win Condition

The player **wins** when:
- Every cell that does not contain a mine has been revealed.

The player does **not** need to flag all mines to win. Flagging is optional. As soon as all non-mine cells are revealed, the game ends in a win.

Upon winning:
- The timer stops.
- All un-flagged mines are automatically flagged (optional, common behavior).
- The smiley face changes to the "won" expression (sunglasses face 😎).
- A win message or celebration may be displayed.

---

## 9. Loss Condition

The player **loses** when:
- They reveal a cell that contains a mine (either by direct left-click or by an incorrect chord).

Upon losing:
- The timer stops.
- The clicked mine is shown with an "exploded" appearance (e.g., red background).
- All other un-flagged mines are revealed (plain mine icon).
- All incorrectly flagged cells (flagged but no mine) are revealed with a crossed-out mine icon.
- All correctly flagged mines remain showing the flag icon (or are visually confirmed).
- No further player input affects the board (game is over).
- The smiley face changes to the "dead" / "lost" expression (😵 or X-eyes face).

---

## 10. Game States (Application-Level)

| State     | Description                                                                 |
|-----------|-----------------------------------------------------------------------------|
| Ready     | Game initialized, no clicks yet. Timer has not started. Board is fully covered. |
| Playing   | First click has occurred. Timer is running. Player is actively interacting. |
| Won       | All safe cells revealed. Timer stopped. Win state shown.                    |
| Lost      | A mine was revealed. Timer stopped. All mines exposed. Loss state shown.    |

---

## 11. UI Components

### 11.1 Game Board
- The main grid of cells rendered as tiles.
- Each cell displays its current state visually (covered, flagged, question mark, revealed blank, revealed number, mine, exploded mine, wrong flag).

### 11.2 Mine Counter
- Displayed in the top-left of the header area.
- Shows: `(total mines) - (number of flags placed)`.
- Starts at the total mine count for the chosen difficulty.
- Decrements by 1 for each flag placed; increments by 1 for each flag removed.
- **Can go negative** if the player places more flags than there are mines.
- Displayed as a 3-digit number (e.g., 010, 099), classically styled as an LED/digital readout.

### 11.3 Timer
- Displayed in the top-right of the header area.
- Starts counting up (in seconds) on the **first click**.
- Stops when the game is won or lost.
- Displays 0 before the first click.
- Counts from 000 to 999 seconds maximum (999 = cap, ~16 minutes 39 seconds).
- Classically styled as an LED/digital readout.

### 11.4 Smiley / Reset Button
- Centered in the header between the mine counter and timer.
- Clicking it starts a new game (re-generates the board).
- Face expressions:
  - 🙂 **Normal / Playing:** Default state during gameplay and before first click.
  - 😮 **Surprised / Pressed:** Shown while the player is holding down a left-click on any covered cell (anticipation moment). Reverts to normal when the mouse is released.
  - 😎 **Won (Sunglasses):** Shown after the player wins.
  - 😵 **Dead / Lost (X-Eyes):** Shown after the player loses by clicking a mine.

---

## 12. Board Generation Algorithm

1. Create an empty grid of the specified dimensions (all cells start as unrevealed, no mines).
2. Wait for the player's first click.
3. Randomly place mines on the board, **excluding** the first-clicked cell (and optionally its 8 neighbors for an "opening" guarantee).
4. For every non-mine cell, calculate its adjacent mine count by examining its 8 neighbors.
5. Begin the game in Playing state and process the first click normally.

Alternatively, mines may be pre-placed before the first click, and if the first click lands on a mine, that mine is relocated to a random safe cell before revealing.

---

## 13. Number Color Reference

For implementations following the classic color scheme:

| Number | Color         | Hex (approx) |
|--------|---------------|--------------|
| 1      | Blue          | #0000FF      |
| 2      | Green         | #008000      |
| 3      | Red           | #FF0000      |
| 4      | Dark Navy     | #000080      |
| 5      | Dark Red      | #800000      |
| 6      | Teal / Cyan   | #008080      |
| 7      | Black         | #000000      |
| 8      | Gray          | #808080      |

---

## 14. Summary of All Tile Visual States

| State                  | Trigger                                        | Visual Appearance                            |
|------------------------|------------------------------------------------|----------------------------------------------|
| Covered (unrevealed)   | Default / game start                           | Raised gray tile, no content                 |
| Flagged                | Right-click on covered tile                    | Raised tile with flag icon (🚩)              |
| Question Mark          | Right-click on flagged tile (optional)         | Raised tile with "?" symbol                  |
| Revealed — Blank       | Clicked / cascaded, 0 adjacent mines           | Flat/depressed tile, no text                 |
| Revealed — Number      | Clicked / cascaded, 1–8 adjacent mines         | Flat tile with colored digit (1–8)           |
| Exploded Mine          | Player clicked a mine                          | Flat tile with mine icon, red background     |
| Revealed Mine          | Game over; un-flagged mine elsewhere on board  | Flat tile with mine icon, default background |
| Wrong Flag             | Game over; flagged cell was not a mine         | Flat tile with crossed-out mine icon (⛔/✕)  |
| Correct Flag (end)     | Game over or win; flagged cell was a mine      | Flag icon remains or shown as confirmed      |

---

## 15. Edge Cases & Behavioral Notes

- **Flagged cells cannot be revealed** by left-click. The player must unflag first.
- **Chording with wrong flags** causes an immediate loss if a non-mine neighbor is incorrectly flagged.
- **The mine counter can go negative** — it simply reflects `mines - flags`, no lower bound enforced.
- **Cells on the board edge/corner** have fewer than 8 neighbors; adjacency checks must clamp to valid grid coordinates.
- **Question marks** do not prevent left-click reveals — a question-marked cell is treated the same as an uncovered cell for reveal purposes.
- **Timer precision:** The timer typically updates every second. It starts on first click (not on page load or board generation).
- **No undo mechanic** exists in classic Minesweeper — revealing a mine immediately ends the game.
- **Cascades do not open flagged cells**, even if those cells are safe. The player must manually unflag and reveal them.
- **Winning without flagging** is valid — flags are never required. The win condition only checks that all non-mine cells are revealed.

---

## 16. Custom / Advanced Variants (Optional)

These are not part of the classic rules but are common in modern implementations:

- **No-guess mode:** The board is generated (via rejection sampling) such that it is always logically solvable without guessing.
- **Question mark toggle:** Some implementations allow disabling the question mark cycle, so right-click toggles only between Flagged and Unrevealed.
- **Auto-flag on win:** When the player wins, all remaining unflagged mines are automatically flagged.
- **Highlight satisfied numbers:** Revealed numbers whose adjacent flag count matches their value are visually highlighted to signal they are "complete."
- **Safe first area:** First click always opens an area with multiple revealed cells (the clicked cell and all its neighbors are guaranteed mine-free), not just the single clicked cell.
