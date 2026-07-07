# Hex Minesweeper

A browser-based Minesweeper clone played on a hexagonal grid. The game follows standard Minesweeper rules, but all cells are hexagons with six neighbors instead of squares with eight.

## Features

- Three difficulty levels: Easy (61 cells, 7 mines), Medium (127 cells, 20 mines), Hard (217 cells, 45 mines)
- First-click safety (the clicked cell and all its neighbors are guaranteed mine-free)
- Cascade reveal, flagging, question marks, and chord actions
- Timer and mine counter in the header
- Keyboard, mouse, and touch support
- No installation or backend required — runs entirely in the browser

## Getting Started

### Prerequisites

- Node.js 18+ (for running the dev server and tests)
- A modern browser (Chrome, Firefox, Safari, or Edge)

### Install dependencies

```bash
npm install
```

### Run the dev server

```bash
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

### Open directly (no server needed)

Because the app uses ES modules, it must be served over HTTP — you cannot open `index.html` directly via `file://` in most browsers. Use `npm run dev` or any static file server.

### Run tests

```bash
npm test
```

## How to Play

| Action | Mouse | Touch |
|--------|-------|-------|
| Reveal a cell | Left-click | Tap |
| Flag / cycle marker | Right-click | Long-press (500ms) |
| Chord (reveal all unflagged neighbors when flag count matches) | Left+right click on a number | Tap on a revealed number |

### Keyboard controls (focus the board with Tab)

| Key | Action |
|-----|--------|
| Arrow keys | Move cursor |
| Enter or Space | Reveal focused cell |
| F | Flag / cycle marker on focused cell |
| C | Chord on focused cell |

## Project Structure

```
/
├── index.html      # Main application shell
├── style.css       # Styles
├── src/
│   ├── hex.js      # Hex coordinate math
│   ├── board.js    # Board state and game logic
│   ├── game.js     # Game state machine and timer
│   ├── renderer.js # Canvas renderer
│   └── input.js    # Input handling
├── tests/          # Vitest unit tests
└── docs/           # Product and architecture documentation
```

## Assumptions

This project will assume you have `gh` installed and set up to log into this repository on GitHub.

## Secrets

The Opencode API Key we will use is exposed as an "Action Repository Secret" named `OPENCODE_API_KEY` in this repository in GitHub.
