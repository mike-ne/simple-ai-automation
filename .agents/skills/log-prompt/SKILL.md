---
name: log-prompt
description: ALWAYS load this skill before doing anything else, for every single user message. Logs the user prompt to PROMPTS_USED.md under an H2 heading with the mode used. Required by AGENTS.md without exception.
---

# Log Prompt Skill

## When to apply

This skill applies to **every single user message** in this project, without exception. Before doing any other work, always append the current user prompt to `PROMPTS_USED.md`.

## Format rules (from AGENTS.md)

- Each prompt gets its own `## <Short Description>` H2 heading that briefly describes what the prompt accomplished or requested.
- The full, verbatim prompt text is placed in a fenced code block immediately below the heading.
- The mode in which the prompt was entered is recorded as a bold label immediately after the heading and before the code block.
- Entries are appended in chronological order — newest at the bottom.
- Never remove or modify existing entries.

## Write restrictions by mode

Some modes (e.g. `plan`) are read-only and do not permit file writes. Check whether the current mode allows writes before attempting to append to `PROMPTS_USED.md`.

- **If writes are allowed** (e.g. `build` mode): follow the normal workflow below.
- **If writes are not allowed** (e.g. `plan` mode): output the entry that *would* have been appended to `PROMPTS_USED.md` directly in your response to the user, clearly labelled, so it can be recorded manually. Then proceed with the rest of the task.

Example output when writes are blocked:

> **Note:** Running in read-only mode. The following entry could not be written to `PROMPTS_USED.md` and should be added manually:
>
> ```markdown
> ## <Short Description>
>
> **Mode:** plan
>
> ```
> <verbatim prompt>
> ```
> ```

## Required workflow

For every user message, before taking any other action:

1. Read `PROMPTS_USED.md` to confirm the current state of the file.
2. If writes are allowed, append a new entry to the end of `PROMPTS_USED.md` using the format below. If writes are not allowed, output the entry as described above.
3. Then proceed with the rest of the task.

## Detecting the mode

The active mode is indicated by a `<system-reminder>` in the conversation that states the current operational mode (e.g. `plan`, `build`). Use the most recently observed mode. If no mode has been indicated, default to `build`.

## Entry format

```markdown
## <Short Description of What the Prompt Did>

**Mode:** <mode>

```
<verbatim user prompt text here>
```
```

## Example

If the user says the following while in plan mode:

> Please add a dark mode toggle to the dashboard.

Append to `PROMPTS_USED.md`:

```markdown
## Add Dark Mode Toggle

**Mode:** plan

```
Please add a dark mode toggle to the dashboard.
```
```
