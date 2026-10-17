#!/usr/bin/env python3
"""PreToolUse hook: blocks destructive Bash commands before they run.

Reads the hook payload from stdin. If the command matches a DENY pattern it is
blocked outright; if it matches an ASK pattern the user must approve it, even
in auto mode. Anything else passes through to the normal permission flow.

Patterns are matched per command segment (split on ; && || | and newlines), so
`cd x && git reset --hard` is still caught.
"""
import json
import re
import sys

# Anything that is neither a separator nor a newline: keeps a match inside one command.
ARGS = r"[^;&|\n]*"

DENY = [
    # GitHub CLI
    (rf"\bgh\s+repo\s+(delete|archive|unarchive|rename|transfer)\b", "changes or deletes the repository"),
    (rf"\bgh\s+repo\s+edit\b{ARGS}--visibility\b", "changes repository visibility"),
    (rf"\bgh\s+project\s+(delete|item-delete|field-delete|close)\b", "deletes project board data"),
    (rf"\bgh\s+issue\s+(delete|transfer)\b", "permanently deletes or moves an issue"),
    (rf"\bgh\s+label\s+delete\b", "deletes a label from every issue"),
    (rf"\bgh\s+release\s+delete\b", "deletes a release"),
    (rf"\bgh\s+(secret|variable)\s+(delete|remove)\b", "deletes CI secrets or variables"),
    (rf"\bgh\s+(run|cache)\s+delete\b", "deletes CI history or caches"),
    (rf"\bgh\s+pr\s+merge\b", "merges a PR; the user merges PRs themselves"),
    (rf"\bgh\s+api\b{ARGS}(-X\s*|--method[\s=]+)DELETE\b", "sends a DELETE request to the GitHub API"),
    # Git: remote history and branches
    (rf"\bgit\s+push\b{ARGS}\s(--force(?!-with-lease)\b|-[a-zA-Z]*f[a-zA-Z]*\b|\+\S+)", "force-pushes (overwrites remote history)"),
    (rf"\bgit\s+push\b{ARGS}\s(--delete|-d)\b", "deletes a remote branch or tag"),
    (rf"\bgit\s+push\b{ARGS}\s:\S+", "deletes a remote branch (empty refspec)"),
    (rf"\bgit\s+push\b{ARGS}\s(\S+:)?(main|master)(\s|$)", "pushes directly to main; use a feature branch and PR"),
    # Git: local history and work
    (rf"\bgit\s+branch\b{ARGS}\s(-D|--delete\s+--force|--force\s+--delete)\b", "force-deletes a branch with possibly unmerged work"),
    (rf"\bgit\s+reset\b{ARGS}--hard\b", "discards uncommitted changes"),
    (rf"\bgit\s+clean\b{ARGS}\s-[a-zA-Z]*f", "deletes untracked files"),
    (rf"\bgit\s+checkout\s+(--\s+)?\.(\s|$)", "discards uncommitted changes"),
    (rf"\bgit\s+restore\b(?!{ARGS}--staged){ARGS}\s\.(\s|$)", "discards uncommitted changes"),
    (rf"\bgit\s+stash\s+(drop|clear)\b", "deletes stashed work"),
    (rf"\bgit\s+tag\b{ARGS}\s(-d|--delete)\b", "deletes a tag"),
    # System
    (r"(^|\s)sudo\s", "runs as root"),
    (rf"\b(chmod|chown)\b{ARGS}\s-[a-zA-Z]*R", "changes permissions recursively"),
]

ASK = [
    (rf"\brm\b{ARGS}\s-[a-zA-Z]*(r[a-zA-Z]*f|f[a-zA-Z]*r)|\brm\b{ARGS}\s-r\b{ARGS}\s-f\b|\brm\b{ARGS}\s-f\b{ARGS}\s-r\b", "recursive force delete"),
    (rf"\bgit\s+push\b{ARGS}--force-with-lease\b", "force-pushes a feature branch (e.g. after re-squashing)"),
    (rf"\bgit\s+rebase\b", "rewrites history"),
    # Project rule: every commit and push needs the user's explicit approval after they've reviewed the file list.
    (rf"\bgit\s+commit\b", "creates a commit, which needs your approval after reviewing the files"),
    (rf"\bgit\s+push\b", "pushes to GitHub, which needs your approval"),
]

SEGMENT_SPLIT = re.compile(r"&&|\|\||[;|\n]")


def decide(command):
    segments = [s.strip() for s in SEGMENT_SPLIT.split(command) if s.strip()]
    for decision, rules in (("deny", DENY), ("ask", ASK)):
        for segment in segments:
            for pattern, why in rules:
                if re.search(pattern, " " + segment):
                    return decision, why, segment
    return None


def main():
    payload = json.load(sys.stdin)
    if payload.get("tool_name") != "Bash":
        return
    command = payload.get("tool_input", {}).get("command", "")
    result = decide(command)
    if not result:
        return
    decision, why, segment = result
    verb = "Blocked" if decision == "deny" else "Needs your approval"
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": decision,
            "permissionDecisionReason": f"{verb} by guard-destructive-commands: `{segment}` {why}.",
        }
    }))


if __name__ == "__main__":
    main()
