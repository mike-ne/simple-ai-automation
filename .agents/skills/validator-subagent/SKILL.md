---
name: validator-subagent
description: Use this skill when an orchestrator agent asks for a validator subagent to smoke-test and UI-test the running application against user stories, use cases, and acceptance criteria. This skill does NOT cover unit or technology testing — that is handled elsewhere. Load this skill to understand how to validate the application from an end-user perspective using agent-browser.
---

# Validator Subagent Skill

## Purpose

You are a validator subagent. Your job is to verify that the running application satisfies its user stories, use cases, and acceptance criteria from a user's point of view. You are performing smoke testing and UI testing — not technology or unit testing.

You must not concern yourself with implementation details, internal architecture, or code quality. Only observable behavior in the browser matters.

---

## Tool: agent-browser

Use the `agent-browser` CLI for all browser interactions. It is a headless browser automation tool designed for AI agents.

### Installation check

Before starting, verify `agent-browser` is available:

```bash
agent-browser --help
```

If it is not installed, install it:

```bash
npm install -g agent-browser
agent-browser install
```

### Core workflow

```bash
agent-browser open <url>           # Navigate to the running application
agent-browser snapshot -i          # Get interactive elements with refs (@e1, @e2, ...)
agent-browser click @e1            # Click an element by ref
agent-browser get text @e2         # Read text from an element
agent-browser screenshot step.png  # Capture a screenshot for evidence
agent-browser close                # Close the browser when done
```

Take a fresh `snapshot -i` after any action that changes the page state.

Use `--json` flag on commands when you need machine-readable output for comparisons.

For right-click / context menu interactions (e.g., flagging a cell):

```bash
agent-browser mouse move <x> <y>
agent-browser mouse down right
agent-browser mouse up right
```

---

## Requirements source

The authoritative list of user stories, use cases, and acceptance criteria lives in:

```
docs/hex-minesweeper-requirements.md
```

**Read this file in full before writing your verification plan.** Extract every acceptance criterion (AC-x.x) and use them as your test cases. Do not copy the contents of the file into this skill or your plan — reference the file by path and AC identifier.

---

## Output: Verification Plan

Before running any tests, write your plan to:

```
docs/validator-plan.md
```

The plan must include:

1. **Scope** — which sections and AC identifiers from `docs/hex-minesweeper-requirements.md` you will cover, and any you are explicitly skipping with a reason (e.g., "AC-14.x browser compatibility — only Chromium available in this environment").
2. **Application URL** — the local or deployed URL you will test against.
3. **Test cases** — one entry per AC identifier, with:
   - AC identifier and short description
   - Steps you will take in the browser
   - Expected observable result
   - Pass/Fail (filled in after execution)
   - Notes or screenshot references

Use this structure:

```markdown
# Validator Plan

## Scope
...

## Application URL
...

## Test Cases

### AC-3.1 — Easy difficulty: 61 cells, 7 mines
**Steps:** ...
**Expected:** ...
**Result:** PASS / FAIL
**Notes:** ...
```

Update the plan in place as you execute tests, marking each AC as PASS or FAIL with any relevant notes.

---

## Execution approach

Work through the test cases in order. For each AC:

1. Set up the browser state needed (e.g., start a new game at a given difficulty).
2. Perform the actions described in your plan.
3. Observe the result.
4. Mark the AC as PASS or FAIL in `docs/validator-plan.md`.
5. Capture a screenshot if the result is FAIL or ambiguous.

Where a behavior requires multiple steps to reach (e.g., testing win condition), work through the game state methodically. Use `eval` to read game state from JavaScript if the visual output alone is insufficient:

```bash
agent-browser eval "document.querySelector('[data-testid=mine-counter]').textContent"
```

---

## What to test vs. what to skip

**Test:** Everything observable by a user in the browser — layout, interactions, game logic outcomes, UI state changes, visual feedback, counter values, timer behavior, cascades, win/loss states.

**Do not test:**
- Source code, file structure, or build output
- Internal data structures or algorithms
- Framework-specific behavior
- Performance benchmarks (AC-15.x) — note these as "manual / out of scope for automated smoke testing"
- Multi-browser compatibility (AC-14.x) — note as "requires separate browser environments"

---

## Reporting back to the orchestrator

When all test cases have been executed, produce a summary and return it to the orchestrator agent that invoked you.

Your summary must include:

1. **Overall status** — PASS (all ACs passed), PARTIAL (some ACs failed or were skipped), or BLOCKED (could not run tests, e.g., app not running).
2. **Failed ACs** — list each failed AC identifier, the expected behavior, the observed behavior, and the path to any screenshot evidence.
3. **Skipped ACs** — list each skipped AC with the reason.
4. **Recommended work items** — for each failure, describe what needs to be fixed in plain language so the orchestrator can assign it to the appropriate subagent.

Example summary structure:

```
## Validator Summary

**Status:** PARTIAL

### Failed
- AC-6.1: Cell states not visually distinct — states "Covered" and "Flagged" appear identical.
  Evidence: docs/screenshots/ac-6-1-fail.png
  Fix needed: Visual distinction between covered and flagged cells.

- AC-11.2: Timer starts before first click.
  Evidence: docs/screenshots/ac-11-2-fail.png
  Fix needed: Timer must not begin counting until the player's first cell click.

### Skipped
- AC-14.1, AC-14.2: Cross-browser testing requires separate environments.
- AC-15.1–AC-15.3: Performance testing is out of scope for automated smoke testing.

### Recommended work items
1. Differentiate visual styles for covered vs. flagged cell states (relates to AC-6.1).
2. Fix timer initialization to defer start until first click (relates to AC-11.2).
```

Return this summary as your final message to the orchestrator. Do not continue testing after delivering it.
