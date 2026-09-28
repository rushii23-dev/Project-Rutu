#!/usr/bin/env bash
# Commit refreshed data files if they changed, and push.
#
# Used by the scheduled refresh workflows. Several of them can finish close
# together, so a plain `git push` loses the race to whichever pushed first. They
# touch different files, so rebasing onto the newer main always applies cleanly;
# retry a few times and give up loudly if it still will not go.
#
# Usage: bash scripts/commit_data.sh "<commit message>" <path> [<path>...]
set -euo pipefail

msg="$1"
shift
branch="${GITHUB_REF_NAME:-main}"

git add -- "$@"
if git diff --cached --quiet; then
  echo "no change — nothing to commit"
  exit 0
fi

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git commit -m "$msg"

for attempt in 1 2 3 4 5; do
  if git pull --rebase --quiet origin "$branch" && git push origin "HEAD:$branch"; then
    exit 0
  fi
  echo "push raced another refresh, retrying ($attempt/5)"
  sleep $((attempt * 5))
done
echo "::error::could not push after 5 attempts"
exit 1
