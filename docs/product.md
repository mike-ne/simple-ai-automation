# Hex Minesweeper — Product Document

## Overview

Hex Minesweeper is a browser-based Minesweeper clone that uses a hexagonal grid instead of the classic square grid. Each cell has up to 6 neighbors (instead of 8), and the overall board shape is a large regular hexagon. The game runs entirely in the browser with no installation, plugins, or backend server required.

## Current Feature Set

### Difficulty Levels

| Difficulty | Grid Radius | Total Cells | Mines | Mine Density |
|------------|-------------|-------------|-------|--------------|
| Easy       | 4           | 61          | 7     | ~11.5%       |
| Medium     | 6           | 127         | 20    | ~15.7%       |
| Hard       | 8           | 217         | 45    | ~20.7%       |

### Core Gameplay

- **Hex grid**: Pointy-top hexagonal cells arranged in a regular hexagon shape using cube coordinates.
- **Adjacency**: Each cell has at most 6 neighbors; numbers range from 1–6 (blank for 0).
- **First-click safety**: Mines are placed after the first click; the clicked cell and all its neighbors are guaranteed mine-free.
- **Cascade**: Revealing a blank cell (0 adjacent mines) auto-reveals all connected blank cells and their numbered borders via BFS.
- **Win condition**: Reveal all non-mine cells (flagging mines is not required).
- **Loss condition**: Reveal a mine cell (direct click or incorrect chord).

### Cell States

| State         | Description                                         |
|---------------|-----------------------------------------------------|
| Covered       | Default; content unknown                           |
| Flagged       | Player-marked suspected mine                        |
| Question Mark | Optional uncertain marker                           |
| Revealed      | Safe; shows blank or number 1–6                     |
| Exploded      | Mine hit; red background; triggers game loss        |
| Revealed Mine | Game over; un-flagged mine exposed                  |
| Wrong Flag    | Game over; flag on a non-mine cell                  |
| Correct Flag  | Win/end; mine correctly flagged                     |

### Player Actions

- **Left-click / Tap**: Reveal a covered or question-marked cell
- **Right-click / Long-press (500ms)**: Cycle cell marker (covered → flagged → question → covered)
- **Chord**: Left+right simultaneous click (or tap on revealed number when surrounding flag count = cell number) reveals all unflagged neighbors

### User Interface

- **Mine counter**: `totalMines − flagsPlaced` (supports negative values)
- **Timer**: Counts up from 0; starts on first click; stops on win/loss; capped at 999s
- **Reset button**: Face icon reflects game state (neutral, surprised, won, lost)
- **Difficulty selector**: Three buttons; changing difficulty resets the board
- **Win/Loss overlay**: Shown on game end; hides on reset
- **Number colors**: 1=Blue, 2=Green, 3=Red, 4=Dark Navy, 5=Dark Red, 6=Teal

### Accessibility

- All header controls have ARIA labels
- Mine counter and timer use `<output>` with `aria-live`
- Canvas has `role="application"` and `aria-label`
- Keyboard navigation: Tab to focus canvas; Arrow keys move cursor; Enter/Space to reveal; F to flag; C to chord

### Mobile Support

- Tap = reveal
- Long-press (500ms) = flag/cycle
- Tap on revealed number = chord
- Touch move cancels long-press

## Out of Scope

- User accounts, leaderboards, or persistent score history
- Multiplayer or cooperative modes
- Custom difficulty configuration
- No-guess / guaranteed-solvable board generation
- Native mobile applications
