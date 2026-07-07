# Agents

This file provides guidance for AI agents working in this repository.

## Repository Overview

This is a Minesweeper clone built to run on the web, but the board will be laid out in a hex grid.

## Rules

**Always** do the following:
- Update docs/product.md when new requirements are added to the project.
- Update docs/architecture.md when anything about the architecture of this project changes.
- Follow patterns that exist in the code.
- Keep changes minimal and focused on the task at hand.
- Run tests after making changes.
- Update the README.md if any instructions for users have changed.

**Ask First** before doing any of the following:
- Adding large dependencies.
- Making irreversable changes.

**Never** do the following:
- Allow tests to pass by changing the test instead of fixing the code.
- Commit secrets or API keys.
- Log secrets, API keys or other like tokens.

## Key Files

- `README.md` — Project overview and setup instructions.
- `PROMPTS_USED.md` — Prompts used during development.
- `docs/` — Additional documentation.

## Prompt Logging

**Before doing anything else for every user message**, load the `log-prompt` skill and follow its instructions to append the prompt to `PROMPTS_USED.md`. This must happen without exception, for every single prompt, before any other work begins.

The `log-prompt` skill contains the full formatting rules and entry format. The log serves as a full audit trail of all AI-assisted work done on this project.
