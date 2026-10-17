#!/usr/bin/env python3
"""Scan this repo's changes for secrets, personal data and forbidden files.

Usage: scan_changes.py [uncommitted|branch|auto] [base]

- uncommitted: lines added vs HEAD (staged + unstaged) plus untracked files in full.
- branch:      lines added on this branch since it split from base (default main).
- auto:        uncommitted if the working tree is dirty, otherwise branch.

Only added lines are scanned, so removing a secret doesn't trigger a finding.
Secrets are printed masked. Exits 1 if anything is found, 0 if clean, 2 on usage errors.
"""
import fnmatch
import os
import re
import subprocess
import sys

MAX_BYTES = 1024 * 1024

# Generated or vendored files: their content isn't scanned (they're still checked by name and size).
SKIP_CONTENT = ["package-lock.json", "docs/assets/*"]

FORBIDDEN_FILES = [
    (".env", "environment file (may hold secrets)"),
    (".env.*", "environment file (may hold secrets)"),
    ("*.pem", "private key or certificate"),
    ("*.key", "private key"),
    ("*.p12", "keystore"),
    ("*.pfx", "keystore"),
    ("id_rsa*", "SSH key"),
    ("id_ed25519*", "SSH key"),
    (".claude/settings.local.json", "machine-specific Claude settings"),
    (".mcp.json", "machine-specific MCP config"),
    (".idea/*", "IDE config"),
    ("*.iml", "IDE config"),
    (".DS_Store", "macOS Finder metadata (leaks local file names)"),
]

SECRETS = [
    (r"\bAKIA[0-9A-Z]{16}\b", "AWS access key id"),
    (r"\bgh[pousr]_[A-Za-z0-9]{36,}\b", "GitHub token"),
    (r"\bgithub_pat_[A-Za-z0-9_]{40,}\b", "GitHub fine-grained token"),
    (r"\bxox[abprs]-[A-Za-z0-9-]{10,}\b", "Slack token"),
    (r"\bAIza[0-9A-Za-z_-]{35}\b", "Google API key"),
    (r"\bsk-ant-[A-Za-z0-9_-]{20,}\b", "Anthropic API key"),
    (r"\bsk-(?:proj-)?[A-Za-z0-9]{20,}\b", "OpenAI-style API key"),
    (r"\b[rs]k_live_[A-Za-z0-9]{16,}\b", "Stripe live key"),
    (r"\bnpm_[A-Za-z0-9]{36}\b", "npm token"),
    (r"-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----", "private key"),
    (r"\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}", "JWT"),
    (r"\b[a-z][a-z0-9+.-]*://[^\s:/@'\"]+:[^\s@'\"]{3,}@[^\s'\"]+", "credentials in URL"),
    (r"(?i)\b(?:password|passwd|pwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token)\b[\"']?\s*[:=]\s*[\"'][^\"'\s]{6,}[\"']",
     "hard-coded credential"),
]

EMAIL = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
SAFE_EMAIL_DOMAINS = re.compile(r"(?i)@(?:[a-z0-9-]+\.)*(?:example\.(?:com|org|net)|test|invalid|localhost)$|@users\.noreply\.github\.com$|^noreply@")
PERSONAL = [
    (r"/Users/[A-Za-z0-9._-]+/", "local macOS path"),
    (r"/home/[A-Za-z0-9._-]+/", "local Linux path"),
    (r"(?i)\b[A-Z]:\\Users\\[A-Za-z0-9._-]+\\", "local Windows path"),
    (r"(?<![\w+])\+\d{1,3}[\s-]?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}\b", "phone number"),
]


def git(*args, check=True):
    result = subprocess.run(["git", *args], capture_output=True, text=True, errors="replace")
    if check and result.returncode != 0:
        sys.exit(f"git {' '.join(args)} failed: {result.stderr.strip()}")
    return result.stdout


def mask(value):
    if len(value) <= 8:
        return value[:2] + "***"
    return f"{value[:4]}***{value[-2:]} ({len(value)} chars)"


def matches(path, patterns):
    name = os.path.basename(path)
    return any(fnmatch.fnmatch(path, p) or fnmatch.fnmatch(name, p) for p in patterns)


def parse_added_lines(diff):
    """Yield (path, line_no, text) for each added line of a unified diff (-U0)."""
    path, line_no = None, 0
    for line in diff.splitlines():
        if line.startswith("+++ "):
            path = line[6:] if line.startswith("+++ b/") else None  # None for /dev/null (deleted file)
        elif line.startswith("@@"):
            m = re.search(r"\+(\d+)", line)
            line_no = int(m.group(1)) if m else 0
        elif line.startswith("+") and path:
            yield path, line_no, line[1:]
            line_no += 1


def scan_line(path, line_no, text, findings):
    if matches(path, SKIP_CONTENT):
        return
    for pattern, label in SECRETS:
        for m in re.finditer(pattern, text):
            findings.append(("secret", f"{path}:{line_no}", f"{label}: {mask(m.group(0))}"))
    for m in EMAIL.finditer(text):
        if not SAFE_EMAIL_DOMAINS.search(m.group(0)):
            findings.append(("personal", f"{path}:{line_no}", f"email address: {m.group(0)}"))
    for pattern, label in PERSONAL:
        for m in re.finditer(pattern, text):
            findings.append(("personal", f"{path}:{line_no}", f"{label}: {m.group(0)}"))


def is_binary(data):
    return b"\0" in data[:8000]


def resolve_mode(argv):
    mode = argv[1] if len(argv) > 1 else "auto"
    base = argv[2] if len(argv) > 2 else "main"
    if mode not in ("uncommitted", "branch", "auto"):
        print(__doc__)
        sys.exit(2)
    if mode == "auto":
        mode = "uncommitted" if git("status", "--porcelain").strip() else "branch"
    return mode, base


def main(argv):
    mode, base = resolve_mode(argv)
    os.chdir(git("rev-parse", "--show-toplevel").strip())
    has_head = bool(git("rev-parse", "--verify", "-q", "HEAD", check=False).strip())

    findings = []
    if mode == "uncommitted":
        diff_range = ["HEAD"] if has_head else ["--cached"]
        untracked = [p for p in git("ls-files", "--others", "--exclude-standard", "-z").split("\0") if p]
        size_of = lambda p: os.path.getsize(p) if os.path.isfile(p) else 0
        scope = "uncommitted changes"
    else:
        diff_range = [f"{base}...HEAD"]
        untracked = []
        size_of = lambda p: int(git("cat-file", "-s", f"HEAD:{p}", check=False).strip() or 0)
        scope = f"branch changes since {base}"

    changed = [p for p in git("diff", *diff_range, "--name-only", "--diff-filter=d", "-z").split("\0") if p]
    diff = git("diff", *diff_range, "-U0", "--no-color", "--no-ext-diff")
    for path, line_no, text in parse_added_lines(diff):
        scan_line(path, line_no, text, findings)

    for path in untracked:
        if not os.path.isfile(path) or matches(path, SKIP_CONTENT):
            continue
        with open(path, "rb") as fh:
            data = fh.read(MAX_BYTES + 1)
        if is_binary(data):
            continue
        for i, text in enumerate(data.decode("utf-8", "replace").splitlines(), 1):
            scan_line(path, i, text, findings)

    for path in sorted(set(changed + untracked)):
        for pattern, label in FORBIDDEN_FILES:
            if matches(path, [pattern]):
                findings.append(("forbidden", path, label))
                break
        size = size_of(path)
        if size > MAX_BYTES:
            findings.append(("large", path, f"{size / 1024 / 1024:.1f} MB (limit 1 MB)"))

    files = len(set(changed + untracked))
    print(f"Scanned {scope}: {files} file(s), {len(untracked)} untracked.")
    if not findings:
        print("Clean: no secrets, personal data, forbidden or oversized files found.")
        return 0

    titles = [("secret", "Secrets"), ("personal", "Personal data"), ("forbidden", "Forbidden files"), ("large", "Large files")]
    for kind, title in titles:
        group = [f for f in findings if f[0] == kind]
        if group:
            print(f"\n{title} ({len(group)}):")
            for _, where, what in group:
                print(f"  {where}: {what}")
    print(f"\n{len(findings)} finding(s). Treat each as a blocker until checked.")
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
