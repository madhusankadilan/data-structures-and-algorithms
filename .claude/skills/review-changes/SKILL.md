---
name: review-changes
description: Read-only review of this repo's changes (uncommitted work or a branch) before a commit or PR. Scans for secrets, personal data and forbidden files, runs the project checks, reviews the diff against .claude/CLAUDE.md, and reports findings with a verdict. Use before every commit and before opening a PR.
argument-hint: "[uncommitted | branch [base] | auto]"
---

# Review changes

You review the changes in this repository and report findings. This is **read-only**: don't edit, stage, commit or fix anything unless the user asks you to after seeing the report.

## Step 1: Choose the scope

Arguments (optional): `uncommitted`, `branch [base]` or `auto` (the default).

- `uncommitted`: everything not yet committed (staged + unstaged + untracked, excluding gitignored files). Use before a commit.
- `branch [base]`: commits on this branch since it split from `base` (default `main`). Use before a PR.
- `auto`: `uncommitted` if `git status --porcelain` shows anything, otherwise `branch`.

Then gather the facts:

```bash
git rev-parse --abbrev-ref HEAD                     # current branch
git status --short                                  # what's changed
# uncommitted:
git diff HEAD --stat ; git diff HEAD                # tracked changes
git ls-files --others --exclude-standard            # untracked files (read them)
# branch:
git log --oneline main..HEAD                        # commits to review
git diff main...HEAD --stat ; git diff main...HEAD  # changes since the branch point
```

If you're on `main` with no uncommitted changes, there's nothing to review: say so and stop. If the diff is large, read it file by file. Don't skip files. Binary files (`problem.pdf`) can't be read as a diff; note that they changed and check that they were regenerated rather than hand-edited.

## Step 2: Run the scanner (secrets, personal data, forbidden files)

```bash
python3 .claude/skills/review-changes/scripts/scan_changes.py <uncommitted|branch|auto> [base]
```

**What it checks:** the lines the changes add (and untracked files in full) for:
- **secrets:** cloud keys, tokens, private keys, credentials in URLs, hard-coded passwords
- **personal data:** non-example email addresses, local machine paths, phone numbers
- **forbidden files:** `.env`, keys, `.claude/settings.local.json`, `.mcp.json`, `.idea/`, `*.iml`, `.DS_Store`
- files over 1 MB

- **Every scanner finding is a blocker** until you've checked it. Look at the context: a value in a test fixture, a docs placeholder or a regex pattern may be a false positive. Say why you dismissed it.
- **Never print a full secret.** Quote the masked value from the scanner.
- The scanner isn't enough on its own. Also read the diff for things the patterns miss: real names in test data, internal URLs, personal information in generated PDFs or screenshots, account details in config.

## Step 3: Run the project checks

Run whatever is configured, and report the results honestly, failures included:

```bash
npm run lint            # only if a "lint" script exists in package.json
npx tsc --noEmit        # only if tsconfig.json exists
npx vitest run          # all question tests (browser mode, Chromium via Playwright)
```

- Report a check that isn't configured yet (no lint script, no `tsconfig.json`) as **skipped (not configured)**. That isn't a failure.
- Tests run against the learner stubs, so **stub questions are expected to fail**. Note which failures come from unimplemented stubs and which are real.
- If a question has a `-resolve.ts`, check that the reference solution passes the same tests, using the project's resolve-mode runner once it exists. Until then, say this wasn't verified.
- If `node_modules` is missing or the Playwright browser isn't installed, say the checks were skipped and why. Don't install packages or browsers without asking.

## Step 4: Review the diff

Read the project rules first: `.claude/CLAUDE.md`, plus `README.md` and `CONTRIBUTING.md` if they exist. Then check each area.

### A. Security

- **Code execution:** `eval`, `new Function`, `setTimeout` with a string argument, `child_process` with interpolated input.
- **HTML injection:** new triple-stash `{{{...}}}` in `src/_core/html-template.ts`, or other unescaped HTML. Raw HTML is only acceptable for author-written `description` fields in `problem.ts`, never for external input. The same applies to Puppeteer `page.setContent` / `page.evaluate`.
- **File system:** `_core` writes files. Check that paths are built with `path.join` from known directories and can't escape the repo.
- **Dependencies:** new or changed entries in `package.json`. Is each one needed, maintained and reputable? Is `package-lock.json` updated in the same change? Does it belong in `devDependencies` rather than `dependencies`? Flag `postinstall` scripts and unusual sources (git URLs, tarballs).
- **CI** (once it exists): secrets echoed into logs, `pull_request_target` misuse, unpinned third-party actions, overly broad permissions.

### B. Questions and tests

For each question folder (`src/problems/NN-kebab-name/`), check it against the conventions in `.claude/CLAUDE.md`:

- **Stub stays a stub:** `kebab-name.ts` exports the right signature with a placeholder body and TSDoc. **A solution in the stub is a blocker**, because it gives away the answer to learners.
- **Reference solution:** `kebab-name-resolve.ts` has the same exported signature as the stub, plus TSDoc giving the approach and its time/space complexity. Check that the complexity it claims is correct.
- **Tests import from the stub** (`./kebab-name`), not from `-resolve`.
- **Test coverage:** examples from `problem.ts`, the happy path, edge cases from the constraints (bounds, negatives, zeros, duplicates, empty/minimal input) and a performance check where the problem asks for a complexity.
- **Test quality:**
  - The tests check behaviour, not how the function is implemented.
  - Where the answer may be returned in any order, the result is sorted before comparing.
  - No randomness without a fixed seed.
  - Performance thresholds are generous enough not to flake.
  - Test names describe the case.
- **Tests match the problem:** no test expects behaviour the problem statement rules out (e.g. testing "no solution" when the constraints guarantee one) unless the test says why.
- **`problem.ts`:**
  - Valid `ProblemData`.
  - Examples and constraints match the original problem.
  - The `description` HTML is well-formed.
- **Generated files** (`problem.pdf`, `problem.md`, `docs/`): changed only by regenerating, and in step with `problem.ts`. If `problem.ts` changed but they didn't, flag that `npm run question:generate` wasn't run.
- **Folder naming:** zero-padded number, kebab-case, and file names that match the folder.

### C. Code quality (`src/_core` and solutions)

- **TypeScript:** no `any`, exported types for shared shapes (`src/_core/interfaces`), and no unused imports.
- **General quality:** dead code, leftover `console.log` in solutions or tests (the CLI output in `_core` is intended), commented-out code, TODOs without an issue, duplication and unclear names.
- **Match the surrounding code:** naming, comment density, 3-space indentation and so on.

### D. Git workflow

- **Branch:** not `main`, and named `feature/DSA-<n>-short-description`.
- **Commits** (branch scope):
  - Format is `[DSA-<n>][NEW|CHG] Message`.
  - Each commit is one logical change.
  - No leftover work-in-progress commits: squash "wip", "fix typo" and "fix lint" into the commit they fix.
  - No attribution lines the project doesn't use.
- **Staging:** no unrelated changes mixed in. Suggest splitting if the diff covers several issues or several questions.
- **Deletions:** check that they're intentional, and that nothing still references a deleted file.

### E. Docs

- A question was added, or a convention, command or workflow changed: check that `.claude/CLAUDE.md` (and `README.md` if relevant) is updated, including the TODO list.
- TSDoc on stubs and solutions is complete, since `npm run docs` builds the public docs from it.

## Step 5: Report

Use this structure. Be specific: every finding has a `file:line` (or file), what's wrong, why it matters, and a concrete fix.

```
## Review: <scope> (<N> files)

**Verdict:** ⛔ Blocked | ⚠️ OK with fixes recommended | ✅ Ready to commit/PR

### Blockers (must fix before committing)
| # | Area | Location | Problem | Fix |
|---|---|---|---|---|

### Should fix
| # | Area | Location | Problem | Fix |
|---|---|---|---|---|

### Suggestions (nice to have)
- ...

### What's done well
- Specific good practices in this change (edge-case coverage, clear complexity notes, naming, etc.)

### Checks
| Check | Result |
|---|---|
| Secrets / personal data scan | clean / N findings |
| Lint | pass / fail / skipped (reason) |
| Type-check | ... |
| Tests | ... (separate stub-expected failures from real ones) |

### Commands run
(every command, in order, per CLAUDE.md)
```

**Severity guide:**

- **Blocker:**
  - any real secret or personal data
  - a forbidden file
  - a security vulnerability
  - a solution leaked into a learner stub
  - a failing reference solution, lint, type-check or real test
  - a behaviour change without tests
  - a commit straight to `main`
- **Should fix:**
  - convention violations (file naming, `any`, tests importing `-resolve`)
  - generated files out of date
  - missing docs for a scope change
  - wrong branch or commit format
- **Suggestion:** readability, naming, small refactors, extra edge cases.

End with the next step and wait for the user's answer:

- **If there are blockers:** offer to fix them.
- **If it's ready:** present the commit plan, with each commit message and its full list of added / modified / deleted files, and ask the user to review and approve it. Never commit or push without explicit approval of that exact list (see "Commits: approval is a hard rule" in `.claude/CLAUDE.md`).
