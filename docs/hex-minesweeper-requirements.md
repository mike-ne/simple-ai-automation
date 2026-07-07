# Hex Minesweeper — Requirements Document

## 1. Product Overview

A browser-based Minesweeper clone played on a hexagonal grid. The game follows the rules of classic Minesweeper with the key difference that all cells are hexagons with six neighbors instead of squares with eight. The game must be fully playable without any installation, plugins, or backend server.

---

## 2. Scope

### 2.1 In Scope
- A single-player hex Minesweeper game running entirely in the browser
- Three fixed difficulty presets: Easy, Medium, and Hard
- All core Minesweeper mechanics adapted for hex adjacency
- A responsive layout suitable for desktop and mobile browsers

### 2.2 Out of Scope
- User accounts, leaderboards, or persistent score history
- Multiplayer or cooperative modes
- Custom difficulty configuration
- No-guess / guaranteed-solvable board generation
- Native mobile applications

---

## 3. Difficulty Levels

Hex grids use a different cell count model than rectangular grids. The following presets are defined using a hex grid with a regular hexagonal shape, described by its "radius" (number of rings around a center cell).

| Difficulty | Grid Shape            | Total Cells | Mines | Mine Density |
|------------|-----------------------|-------------|-------|--------------|
| Easy       | Radius 4 (5×5 hex)    | 61          | 7     | ~11.5%       |
| Medium     | Radius 6 (7×7 hex)    | 127         | 20    | ~15.7%       |
| Hard       | Radius 8 (9×9 hex)    | 217         | 45    | ~20.7%       |

A radius-N hex grid contains `3N² + 3N + 1` cells. The densities above are chosen to match the feel of classic Minesweeper beginner, intermediate, and expert modes respectively.

**Acceptance Criteria:**
- AC-3.1: Selecting "Easy" produces a board with exactly 61 cells and 7 mines.
- AC-3.2: Selecting "Medium" produces a board with exactly 127 cells and 20 mines.
- AC-3.3: Selecting "Hard" produces a board with exactly 217 cells and 45 mines.
- AC-3.4: The difficulty selector is visible and accessible at all times during gameplay.
- AC-3.5: Changing difficulty resets the board and starts a new game.

---

## 4. Hex Grid & Adjacency

### 4.1 Grid Layout
- The board is rendered as a regular hexagonal grid using flat-top or pointy-top hexagonal cells (one orientation must be chosen and applied consistently).
- The overall shape of the board is a large regular hexagon.

### 4.2 Adjacency
- Each interior cell has exactly 6 neighbors.
- Edge cells have 4 neighbors.
- Corner cells have 3 neighbors.
- Adjacency follows standard hex-grid neighbor rules (no diagonal adjacency concept exists on a hex grid).

### 4.3 Numbers
- The number displayed on a revealed cell equals the count of mines among all neighboring cells (maximum 6).
- Numbers range from 1 to 6. Zero is displayed as blank.

**Acceptance Criteria:**
- AC-4.1: Every hex cell is visually a regular hexagon.
- AC-4.2: No cell reports more than 6 adjacent mines.
- AC-4.3: The adjacency count for any cell is verifiably correct for the hex topology (not the square-grid 8-neighbor model).
- AC-4.4: Edge and corner cells correctly reflect their reduced neighbor count.

---

## 5. Mine Placement

- Mines are placed randomly, deferred until the player's first click.
- The first-clicked cell and all of its hex neighbors are guaranteed to be mine-free (extended first-click safety).
- Each cell contains at most one mine.
- Mine positions are fixed for the entire game once placed.

**Acceptance Criteria:**
- AC-5.1: The first cell clicked is never a mine.
- AC-5.2: All neighbors of the first clicked cell are also never mines.
- AC-5.3: The total mine count on the board always equals the mine count defined for the selected difficulty.
- AC-5.4: Mines are never repositioned after placement.

---

## 6. Cell States

Every cell is in exactly one of the following states at any time:

| State              | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| Covered            | Default state; content unknown to the player.                               |
| Flagged            | Player has marked the cell as a suspected mine.                             |
| Question Mark      | Optional marker for uncertain cells; does not prevent reveal.               |
| Revealed — Blank   | Revealed; zero adjacent mines. Triggers cascade.                            |
| Revealed — Number  | Revealed; 1–6 adjacent mines. Displays the count.                           |
| Exploded Mine      | Player revealed a mine. Shown with red/highlighted background. Game over.   |
| Revealed Mine      | Game over; un-flagged mine elsewhere on the board.                          |
| Wrong Flag         | Game over; player flagged a cell that was not a mine.                       |
| Correct Flag       | Game end; flagged cell confirmed as a mine.                                 |

**Acceptance Criteria:**
- AC-6.1: All nine cell states are visually distinct from one another.
- AC-6.2: A flagged cell cannot be revealed by a primary click; the player must unflag it first.
- AC-6.3: A question-marked cell can be revealed by a primary click without unflagging.
- AC-6.4: Upon game loss, all un-flagged mines are revealed, all wrongly flagged cells show a crossed-out mine, and the exploded cell is visually distinct from all other mines.
- AC-6.5: Upon game win, all un-flagged mines are automatically flagged.

---

## 7. Player Actions

### 7.1 Reveal (Primary Click / Tap)
- Reveals an unrevealed or question-marked cell.
- If the cell is a mine: game over (loss).
- If the cell has zero adjacent mines: reveal and trigger cascade.
- If the cell has adjacent mines: reveal and display the number.
- Has no effect on covered flagged cells or already-revealed cells.

### 7.2 Flag / Cycle Marker (Secondary Click / Long-Press)
- On a covered cell: places a flag; mine counter decrements by 1.
- On a flagged cell: cycles to Question Mark (mine counter returns to pre-flag value) or directly to Covered.
- On a question-marked cell: returns to Covered.
- Has no effect on already-revealed cells.
- The mine counter may go negative if more flags are placed than mines exist.

### 7.3 Chord (Primary + Secondary Click simultaneously, or equivalent gesture on a revealed number)
- Applies to revealed number cells only.
- Condition: The number of flags immediately surrounding the cell equals the cell's displayed number.
- Effect: All unrevealed, unflagged neighbors are revealed simultaneously.
- If any flag surrounding the cell is incorrect, chording reveals that mine and causes a loss.

**Acceptance Criteria:**
- AC-7.1: Left-click (or tap) on a covered cell reveals it.
- AC-7.2: Right-click (or long-press) on a covered cell cycles its marker state.
- AC-7.3: A flagged cell is not revealed by a left-click alone.
- AC-7.4: Chording a revealed number cell when the surrounding flag count equals the number reveals all unflagged neighbors.
- AC-7.5: Chording with an incorrect flag placement causes an immediate game loss.
- AC-7.6: The mine counter correctly reflects `total mines − flags placed` at all times and can display negative values.

---

## 8. Cascade / Auto-Reveal

- When a blank cell (zero adjacent mines) is revealed, all unrevealed, unflagged neighbors are automatically revealed.
- The process repeats recursively for any newly revealed blank cells.
- Flagged cells are not auto-revealed during a cascade.
- The cascade stops when all reachable blank cells and their numbered borders are revealed.

**Acceptance Criteria:**
- AC-8.1: Revealing a blank cell automatically reveals all connected blank cells and their numbered borders in a single action.
- AC-8.2: Flagged cells are not revealed by a cascade.
- AC-8.3: No mine is ever revealed by a cascade.

---

## 9. Win Condition

- The player wins when every cell that does not contain a mine has been revealed.
- Flagging mines is not required to win.

**Acceptance Criteria:**
- AC-9.1: The game transitions to the Won state immediately when the last non-mine cell is revealed.
- AC-9.2: The win state is triggered regardless of whether any mines have been flagged.
- AC-9.3: No further board input is accepted after the game is won.

---

## 10. Loss Condition

- The player loses when they reveal a cell containing a mine (by direct click or incorrect chord).

**Acceptance Criteria:**
- AC-10.1: Clicking a mine immediately ends the game in a loss.
- AC-10.2: The triggered mine cell is displayed with a visually distinct "exploded" appearance.
- AC-10.3: All other un-flagged mines are revealed upon loss.
- AC-10.4: All incorrectly placed flags are shown with a crossed-out mine icon upon loss.
- AC-10.5: No further board input is accepted after the game is lost.

---

## 11. Game States

| State   | Description                                                                 |
|---------|-----------------------------------------------------------------------------|
| Ready   | Board initialized; no clicks yet; timer not started; all cells covered.     |
| Playing | First click occurred; timer running; player interacting.                    |
| Won     | All safe cells revealed; timer stopped; win indicators shown.               |
| Lost    | A mine was revealed; timer stopped; all mines and wrong flags exposed.      |

**Acceptance Criteria:**
- AC-11.1: The game starts in the Ready state.
- AC-11.2: The timer does not start until the player's first click.
- AC-11.3: The timer stops when the game enters Won or Lost state.
- AC-11.4: The game can be reset from any state using the reset button.

---

## 12. User Interface

### 12.1 Game Board
- The hex grid is the central visual element of the page.
- All cells and their states are rendered clearly and legibly.
- The board scales to fit the viewport without requiring horizontal scrolling on a standard desktop browser at 1280×720 resolution or larger.

### 12.2 Mine Counter
- Displays `total mines − flags placed`.
- Visible in the header area at all times.
- Updates immediately when a flag is placed or removed.
- Supports display of negative values.

### 12.3 Timer
- Displays elapsed seconds since the first click, counting up from 0.
- Caps at 999 seconds.
- Displays 0 before the first click and stops on game end.
- Visible in the header area at all times.

### 12.4 Reset Button
- Centered in the header between the mine counter and timer.
- Clicking it immediately starts a new game with the currently selected difficulty.
- Displays a face icon reflecting the current game state:
  - Default / Playing: neutral face
  - While holding a click on a covered cell: surprised face
  - Won: sunglasses face
  - Lost: dead / X-eyes face

### 12.5 Difficulty Selector
- Allows the player to choose Easy, Medium, or Hard.
- Changing the selection resets the board.
- The currently selected difficulty is clearly indicated.

### 12.6 Number Colors
Numbers on revealed cells follow the classic Minesweeper color scheme adapted for 1–6:

| Number | Color     |
|--------|-----------|
| 1      | Blue      |
| 2      | Green     |
| 3      | Red       |
| 4      | Dark Navy |
| 5      | Dark Red  |
| 6      | Teal      |

**Acceptance Criteria:**
- AC-12.1: The mine counter, timer, reset button, and difficulty selector are all visible without scrolling on a 1280×720 desktop viewport.
- AC-12.2: The reset button face changes to the won expression on a win and the lost expression on a loss.
- AC-12.3: The reset button face changes to the surprised expression while the player is holding a click on a covered cell, and reverts when the mouse is released.
- AC-12.4: Each revealed number 1–6 is displayed in its corresponding color as specified above.
- AC-12.5: The mine counter updates in real time as flags are placed or removed.
- AC-12.6: The timer updates every second and stops on game end.
- AC-12.7: The board fits within the viewport at all three difficulty sizes on a 1280×720 desktop screen without horizontal scroll.

---

## 13. Mobile & Touch Support

- The game must be playable on touchscreen devices.
- A tap is equivalent to a left-click (reveal).
- A long-press is equivalent to a right-click (flag/cycle marker).
- Chording must be accessible on touch devices (e.g., tapping a revealed number when the surrounding flag count equals the number automatically chords).

**Acceptance Criteria:**
- AC-13.1: All cells are large enough to be tapped accurately on a mobile screen (minimum 44×44 CSS px touch target per cell center area).
- AC-13.2: Long-press places or cycles a flag without revealing the cell.
- AC-13.3: Chord behavior is reachable without a physical mouse on a touch device.
- AC-13.4: The full game UI is usable on a viewport of 375×667 (iPhone SE size) without content being cut off.

---

## 14. Browser Compatibility

The game must function correctly in the current stable versions of:
- Google Chrome
- Mozilla Firefox
- Apple Safari
- Microsoft Edge

**Acceptance Criteria:**
- AC-14.1: All gameplay mechanics work identically across the four listed browsers.
- AC-14.2: Visual rendering of the hex grid is consistent across the four listed browsers.

---

## 15. Performance

**Acceptance Criteria:**
- AC-15.1: The board fully renders within 1 second of selecting a difficulty or clicking reset on a modern mid-range device.
- AC-15.2: Cascade reveals complete and render within 500 ms for any board size.
- AC-15.3: No frame drops or input lag are perceptible during normal gameplay on a modern mid-range device.

---

## 16. Accessibility

**Acceptance Criteria:**
- AC-16.1: All interactive elements (cells, reset button, difficulty selector) are keyboard-accessible.
- AC-16.2: The game board has sufficient color contrast for all cell states to meet WCAG 2.1 AA contrast ratios.
- AC-16.3: The mine counter and timer are readable without relying on color alone.
- AC-16.4: Screen reader labels are provided for the reset button, mine counter, timer, and difficulty selector.
