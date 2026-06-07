#!/bin/sh
# One-time setup: point git at the version-controlled hooks in .githooks/.
# Safe to re-run. Run once per clone (hooks config is not cloned with the repo).
set -e
repo_root="$(git rev-parse --show-toplevel)"
git config core.hooksPath .githooks
chmod +x "$repo_root/.githooks/"* 2>/dev/null || true
echo "Hooks enabled: core.hooksPath -> .githooks"
echo "AI co-author/attribution trailers will be stripped from commit messages."
