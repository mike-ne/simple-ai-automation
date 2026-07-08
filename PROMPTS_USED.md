# Prompts Used

This file will contain a list of all LLM prompts that were used to generate / maintain this application.

## Generate Minesweeper Details

**Mode**: Build

```
Please research the game "Minesweeper" and put all the rules into a file named minesweeper-details.md. This file will be used by AI to generate a Minesweeper application, so please be sure to include all details needed to actually implement such a game. Include all states for each individual tile (clicked, number, explode, flag, etc.), how the numbers work, how bombs work and how many should be placed, how a user can open a tile vs. flag it, etc.
```

## Adding Requirements Document

**Mode**: Build

```
Please create a requirements document for creating a minesweeper clone website. This game will work like the original minesweeper with one catch, the grid will be a hex grid instead of a regular square grid. You can look in docs/minesweeper-details.md for how the original minesweeper works. Allow "easy", "medium" and "hard" modes. You decide how many tiles will exist for each.

This requirements document shuold only contain requirements, not any implementation plans. Be sure to include acceptance criteria however.
```

## Read Requirements and Create Implementation Plan

**Mode:** build

```
Please read the requirements document in docs/hex-minesweeper-requirements.md and create an implementation plan.
```

## Walk Through Open Questions in Implementation Plan

**Mode:** build

```
Walk me through the open questions in the implementation-plan and let's get them answered.
```

## Create Validator Subagent Skill

**Mode:** build

```
Please create a skill called validator-subagent. This skill should be allowed to use the agent-browser npm package. It shuold pay attention to use cases / user stores and acceptance criteria in docs/hex-minesweeper-requirements.md to determine if the project is completed and working properly. The validator-subagent shuold also output it's verification plan to docs/validator-plan.md. If anything is not functioning properly or is not complete, the validator-subagent shuold communicate this fact to the orchestrator agent that started it so the orchestrator can let other subagents know what to work on.

This validator-subagent shuold only test user stories, use cases and acceptance criteria. It shuold not be testing technology at all. This will be handled by unit testing. The purpose of this skill is to instruct subagents on how to do some smoke testing and ui testing. The description should mention that this skill should be used when an orchestrator agent asks for a validator subagent. 

Any project specifics shuold be referenced, but not copied to the validator-subagent. 
```

## Orchestrate Builder and Validator Subagents

**Mode:** build

```
Please act as an orchestrator for two subagents "builder" and "validator".

"Builder" should implement the requirements in docs/hex-minesweeper-requirements.md by using the plan in implementation-plan.md. Let the builder know it should read these files on the first pass, do not attempt to pass a summary to it.  Once the "builder" thinks it is done run the "validator" by telling it to use the validator-subagent skill. If the "validator" finds any issues, summarize these issues and ask the "builder" to fix them.

Continue this loop until the "validator" thinks all requirements are met and the application is working.
```

## Builder Subagent: Implement Hex Minesweeper

**Mode:** build

```
You are the "builder" subagent. Your job is to implement the hex minesweeper web application.

**Start by reading these two files in full before doing anything else:**
1. `docs/hex-minesweeper-requirements.md` — the full product requirements
2. `implementation-plan.md` — the implementation plan to follow

Then implement the application according to the plan and requirements. Follow all patterns, rules, and guidance found in those documents. Also check `AGENTS.md` at the root for any project-level rules you must follow.

Key project rules from AGENTS.md:
- Update `docs/product.md` when new requirements are added to the project
- Update `docs/architecture.md` when anything about the architecture changes
- Follow patterns that exist in the code
- Keep changes minimal and focused on the task at hand
- Run tests after making changes
- Update `README.md` if any instructions for users have changed
- Never allow tests to pass by changing the test instead of fixing the code
- Ask before adding large dependencies or making irreversible changes (for this task, you may proceed with what is described in the implementation plan)

When you are done implementing:
1. Run the tests and make sure they pass
2. Make sure the application builds without errors
3. Report back with:
   - A summary of everything you implemented
   - The command to start the dev server (so the validator can test it)
   - Any known issues or limitations
   - Whether all tests pass

Working directory: /home/mike/dev/git/github/simple-ai-automation
```

## Validator Subagent: Validate Hex Minesweeper

**Mode:** build

```
You are the "validator" subagent. Use the validator-subagent skill instructions provided below to validate the hex minesweeper application.

## Validator Subagent Skill Instructions

### Purpose

Your job is to verify that the running application satisfies its user stories, use cases, and acceptance criteria from a user's point of view. You are performing smoke testing and UI testing — not technology or unit testing.

You must not concern yourself with implementation details, internal architecture, or code quality. Only observable behavior in the browser matters.
```

---

### What to test vs. what to skip

**Test:** Everything observable by a user in the browser — layout, interactions, game logic outcomes, UI state changes, visual feedback, counter values, timer behavior, cascades, win/loss states.

**Do not test:**
- Source code, file structure, or build output
- Internal data structures or algorithms
- Framework-specific behavior
- Performance benchmarks (AC-15.x) — note these as "manual / out of scope for automated smoke testing"
- Multi-browser compatibility (AC-14.x) — note as "requires separate browser environments"

---

### Reporting back to the orchestrator

When all test cases have been executed, produce a summary and return it to the orchestrator agent that invoked you.

Your summary must include:

1. **Overall status** — PASS (all ACs passed), PARTIAL (some ACs failed or were skipped), or BLOCKED (could not run tests, e.g., app not running).
2. **Failed ACs** — list each failed AC identifier, the expected behavior, the observed behavior, and the path to any screenshot evidence.
3. **Skipped ACs** — list each skipped AC with the reason.
4. **Recommended work items** — for each failure, describe what needs to be fixed in plain language so the orchestrator can assign it to the appropriate subagent.

---

## Your task

1. First, start the dev server by running `npm run dev` in the background in the working directory `/home/mike/dev/git/github/simple-ai-automation`.
2. Read `docs/hex-minesweeper-requirements.md` in full.
3. Write your plan to `docs/validator-plan.md`.
4. Install agent-browser if needed, then open the app at `http://localhost:5173`.
5. Execute every applicable test case.
6. Update `docs/validator-plan.md` with results.
7. Return your final summary to the orchestrator (me).

Working directory: /home/mike/dev/git/github/simple-ai-automation
```

## Log Validator Bugs to docs/bugs.md

**Mode:** build

```
Can you add details about these two bugs to docs/bugs.md so we can fix them on a later pass?
```

## Retry Writing Bugs to docs/bugs.md

**Mode:** build

```
It looks like you failed to write information about our two bugs to docs/bugs.md. Can you try again?
```

## Add .gitignore

**Mode:** build

```
Please add an appropriate .gitignore for this project.
```

## Log Difficulty Switch Ghost Game Bug

**Mode:** build

```
I have found another bug. Can you add this bug to docs/bugs.md in the same format as the other bugs in there? If my description does not suffice for a given section in the description of the bug, please add a placeholder question and I can fill it out manually.

The bug is this:
When you chage difficulty levels, it seems the old game is still running under the new one. You can lose by clicking on a cell that does not have a bomb in the new game, but does in the old one underneath.

I suggest that all game state be reset and recreated when the user selects a new difficulty.
```

## Fix BUG-3 Difficulty Switch Ghost Game

**Mode:** build

```
Please work on fixing BUG #3 in docs/bugs.md
```

## Mark BUG-3 as Fixed in bugs.md

**Mode:** build

```
Can you mark the bug in docs/bugs.md as fixed. Feel free to add a "status" field if need be so all bugs have a status.
```

## Add Anti-Pattern Detection to Code Quality Reviewer Agent

**Mode:** build

```
Please add one thing to the code-quality-reviewer.md agent. It should also look for common anti-patterns in the code.
```

## Create Code Quality Review Agent

**Mode:** build

```
Please create a new agent. This agent shuold be responsible for reviewing code quality, and producing a report. The report can go in docs/reports/code_quality_YYYY-MM-DD.md where YYYY is the curent year, MM is the left padded current month and DD is the left padded day of the month.

You should look at standard code quality metrics. You shuold also determine if the code is following the SOLID principles. You should look for "as a" relationship polymorphism where appropriate. You should determine if we have sufficient test code coverage. You should try to descern whether or not a human would be able to read the code. You should determine if the code uses proper design patterns (there shuold not be an overuse of design patterns, but where one is appropriate it could be suggested).

Do not copy any information about the project itself into the agent definition. Instruct the agent to look for architecture related documentation and to review the code itself.
```

## Add GitHub Action for Code Quality Reviewer

**Mode:** build

```
Please add a github action that runs the code-quality-reviewer.md agent. This github action shuold be runnable by manual dispatch. You can use the gh command line tool to verify that the action is working. Please iterate on this until it is verified working. 

You will need a key for opencode use for this github action. This key has already been set in github "Actions Secrets and Variables" as a "Repository Secret" named `OPENCODE_API_KEY`. 
```

## Test Message

**Mode:** build

```
test
```

## Add Secret Scanning to Code Quality Reviewer

**Mode:** build

```
Please add one more thing to our code-quality-reviewer.md. It is ESSENTIAL that this reviewer agent make sure there are no secure keys/passwords/tokens checked in to the codebase in documents, code or any other file.
```
