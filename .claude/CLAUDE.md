# CLAUDE.md

This file gives Claude Code guidance for working in this repository.

## Project purpose

Free, open DSA (data structures & algorithms) practice. Platforms like LeetCode and HackerRank put many questions, test cases, and solutions behind paywalls. This repo gives away all of it: every question, its full test suite, and a reference solution, so anyone can practice for free.

The goal is to cover as many questions as possible. In **phase 1**, each question ships as a readable PDF or Markdown statement plus a stub file that the learner implements in place.

## Tech stack

- Node.js + TypeScript, run through `tsx` (there is no `tsconfig.json` or build step yet)
- Vitest 4 in **browser mode**, using `@vitest/browser-playwright` (Chromium) and `@testing-library/dom`
- TypeDoc generates the API docs into `docs/`
- Puppeteer + Handlebars + Turndown generate the per-question PDF and Markdown

## Repository layout

```
src/
  _core/                    # Project utilities (currently: question doc/PDF generator)
    DocGenerator.ts         # Reads each problems/*/problem.ts → writes problem.pdf + problem.md
    cli.ts                  # Entry point for `npm run question:generate`
    html-template.ts        # Handlebars HTML template used for the PDF/MD
    constants.ts            # ROOT_DIR = 'problems', PROBLEM_FILE = 'problem.ts'
    interfaces/             # ProblemData, Examples
  problems/
    NN-kebab-name/          # One folder per question, zero-padded number prefix
      problem.ts            # Question data (ProblemData): source of truth for PDF/MD
      problem.pdf           # GENERATED, do not edit by hand
      problem.md            # GENERATED, do not edit by hand
      kebab-name.ts         # Stub the learner implements (exported function, empty body)
      kebab-name.test.ts    # Full Vitest suite for the question
      kebab-name-resolve.ts # Reference solution (planned, see below)
docs/                       # GENERATED TypeDoc site (`npm run docs`)
```

## Conventions for a question folder

When adding a new question `NN-kebab-name`:

1. **`problem.ts`**: export `const data: ProblemData` (import from `../../_core`). `description` is an HTML string (`<code>`, `<strong>`, `<em>`, `</br>`). `tags` uses the form `"Easy | Algorithms"`. `followUps` is optional.
2. **`kebab-name.ts`**: the learner-facing stub. Export the function with the correct signature and a placeholder body (e.g. `return [];`). Add a TSDoc block (`@title`, `@description`, `@param`, `@returns`) because TypeDoc builds `docs/` from it. **Do not put the solution here.**
3. **`kebab-name-resolve.ts`**: the reference solution, with the same exported signature as the stub, plus TSDoc covering the approach and its time/space complexity.
4. **`kebab-name.test.ts`**: imports from `./kebab-name` (the stub), so learners run the tests against their own code. Group the tests with `describe` blocks the way `01-two-sum` does: happy path, numerical edge cases, invalid/edge inputs, and a performance/complexity check. Where the problem says the answer may come back in any order, sort the result before comparing.
5. Run `npm run question:generate` to regenerate `problem.pdf` and `problem.md`.

Folder names drive the generated title: `01-two-sum` becomes `1. Two Sum`.

## Commands

```bash
npm run test:browser                  # Vitest (browser mode, Chromium via Playwright), watch mode
npx vitest run src/problems/01-two-sum  # Run a single question's tests once
npm run question:generate             # Regenerate problem.pdf + problem.md for every question
npm run docs                          # Regenerate the TypeDoc site in docs/
```

`npm test` is still the npm placeholder and exits with an error.

## TODO / open work

- **Per-question runner.** There should be an easy way to run one question by number or name, e.g. `npm run q 01` or `npm run q two-sum`, that runs that question's tests against the learner's `[question].ts`. Vitest's path filter already does most of this (`vitest run 01-two-sum`), so a thin script or a Vitest `--project`/filter wrapper may be enough. Another option is a small `tsx` CLI in `_core/` that resolves the folder and spawns Vitest.
- An option to run the same tests against `-resolve.ts` (e.g. an env flag or alias), to check that the reference solutions pass.
- `02-add-two-numbers`: the stub has no return value yet, `ListNode` isn't exported, and the test file is empty.
- Add `-resolve.ts` reference solutions for every question (`01-two-sum` is the first).
- Add a `tsconfig.json` and a real `npm test` script.

## Notes

- `problem.pdf`, `problem.md` and `docs/` are build outputs. Change `problem.ts` or the template instead, then regenerate.
- Performance tests use `performance.now()` with ms thresholds, so they can be flaky on slow machines. Keep the thresholds generous.
- `.DS_Store` and `.idea/` should not be committed.

## Showing your work

- **Show every shell command.** At the end of each response that ran commands, add a "Commands run" section. List each command in a code block, in order, with a short note on what it did. Include commands that failed. For long scripts, show the script's path and summarise what it does.

## Security and privacy

- **Never commit or push secrets or personal data.** Assume the repo is public. Before every commit, review the staged diff (`git diff --cached`) and stop if it contains any of these:
  - Secrets: API keys, tokens, passwords, private keys, `.env` files, cloud credentials or account IDs, connection strings.
  - Personal data: emails, phone numbers, real names in test data, local machine paths (e.g. `/Users/<name>/...`).
  - Machine-specific config: `.claude/settings.local.json`, `.mcp.json`, `.idea/`, `*.iml`.
- Use obviously fake data in tests (e.g. `jane@example.com`).
- If something sensitive is already committed, tell me. Don't rewrite history yourself.

## Destructive commands

- Destructive commands are blocked or need approval: force push, pushing to `main`, `branch -D`, `reset --hard`, `rm -rf`, rebase, and so on. This is enforced by the PreToolUse hook `.claude/hooks/guard-destructive-commands.py` (registered in `.claude/settings.json`).
- Never try to work around a block. Tell me what you wanted to run and let me run it.

## Commits: approval is a hard rule, never skip it

Before **every** commit, in this order:

1. **Review locally:** run the `review-changes` skill (`.claude/skills/review-changes/`) on the uncommitted changes and fix any blockers. Don't commit while blockers remain unless I explicitly accept a specific finding.
2. **Present the commit plan.** For each planned commit, show:
   - the **exact final commit message**
   - the **full list of files**, marked added / modified / deleted
   - the review result
3. **Ask me to review and approve, then stop and wait.**
   - Don't stage and commit "while waiting".
   - Don't treat earlier approvals, approval of a plan, or "go ahead with all of it" as approval for a commit I haven't seen.
4. **Commit only after I explicitly approve that list.** If anything changes after approval (message text, files, grouping), show it to me again first.
5. **Push only with separate approval.** Before opening a PR, run the review again on the whole branch.

- **Group changes into related commits.** Each commit is one logical change (e.g. "remove old config", "add docs", "update README"). Don't lump everything into one commit, and don't leave WIP commits behind.
- Stage files by name (`git add <path>`). Never use `git add .` or `git add -A`.

## Git workflow

- **Never commit directly to `main`.** All work happens on `feature/DSA-<issue-number>-short-description`.
- Clean up the history **before the first push**: squash "wip"/"fix typo"/"fix lint" commits so each remaining commit is one logical change. Force-pushing is blocked, so this has to happen before pushing.
- Commit message format: `[DSA-<issue-number>][NEW|CHG] Message`
  - `NEW`: something new (feature, component, test suite, tooling).
  - `CHG`: a change to something that already exists (fix, refactor, update).
- PRs go to `main`. The title summarises the change. The body lists the commits and includes `Closes #<issue-number>` (the closing keyword needs `#n`).
- PRs are merged with **Rebase and merge**, never squash, so each logical commit lands on `main` as-is. **I merge, never you.**

## Task tracking

- Tasks are GitHub Issues on a GitHub Projects board.
  - Status: Backlog → Todo → In Progress → In Review → Done.
  - Priority: P0–P2. Size: S/M/L.
  - Labels: feature, bug, test, ci, chore, docs.
  - Plus milestones.
- Task IDs are `DSA-<issue-number>`. Move an issue to In Progress when work starts and to Done when it's merged.

## Delegation

- Send long-running specialised work (e.g. design work in a design tool) to a background subagent with a self-contained brief, so the main chat isn't blocked. Relay its summary to me and update the docs yourself.
