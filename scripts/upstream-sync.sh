#!/usr/bin/env bash
#
# scripts/upstream-sync.sh
#
# Tells the 'focus' branch's owner when upstream
# (https://github.com/julesvbertolino/todoist-enhanced) has commits it lacks.
#
# It opens, or updates, one GitHub issue, "Upstream changes waiting", listing
# the new commits and whether they merge cleanly. It never pushes a branch:
# GitHub refuses the Actions token any push that touches a workflow file, and
# upstream changes its own workflows, so a pushed merge branch cannot work.
#
# --dry-run prints the issue it would write and changes nothing.

set -euo pipefail

DRY_RUN=false

for arg in "$@"; do
  case "$arg" in
    --dry-run|-n)
      DRY_RUN=true
      ;;
    --help|-h)
      echo "Usage: $0 [--dry-run]"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      echo "Usage: $0 [--dry-run]" >&2
      exit 1
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

UPSTREAM_URL="${UPSTREAM_URL:-https://github.com/julesvbertolino/todoist-enhanced.git}"
BASE_BRANCH="${BASE_BRANCH:-focus}"
SYNC_DATE="$(date +%Y-%m-%d)"
SYNC_BRANCH="upstream-sync/${SYNC_DATE}"
CONFLICT_BRANCH="upstream-sync/${SYNC_DATE}-conflicts"

# Detect default branch of upstream (e.g. main)
UPSTREAM_BRANCH=""
LS_REMOTE_OUTPUT="$(git ls-remote --symref "$UPSTREAM_URL" HEAD 2>/dev/null || true)"
if [ -n "$LS_REMOTE_OUTPUT" ]; then
  UPSTREAM_BRANCH="$(echo "$LS_REMOTE_OUTPUT" | awk '/^ref: refs\/heads\// { sub(/^ref: refs\/heads\//, ""); print $1 }' | head -n 1)"
fi
if [ -z "$UPSTREAM_BRANCH" ]; then
  UPSTREAM_BRANCH="main"
fi

# Configure upstream remote and fetch
if [ "$DRY_RUN" = true ]; then
  # In dry-run mode, do not modify git remotes or fetch into branches; fetch directly into FETCH_HEAD
  git fetch "$UPSTREAM_URL" "$UPSTREAM_BRANCH" --quiet
  UPSTREAM_REF="FETCH_HEAD"
else
  if git remote get-url upstream >/dev/null 2>&1; then
    CURRENT_UPSTREAM_URL="$(git remote get-url upstream)"
    if [ "$CURRENT_UPSTREAM_URL" != "$UPSTREAM_URL" ] && [ "$CURRENT_UPSTREAM_URL" != "${UPSTREAM_URL%.git}" ]; then
      git remote set-url upstream "$UPSTREAM_URL"
    fi
  else
    git remote add upstream "$UPSTREAM_URL"
  fi
  git fetch upstream "$UPSTREAM_BRANCH" --quiet
  UPSTREAM_REF="upstream/$UPSTREAM_BRANCH"
fi

# Identify base reference for focus
if git show-ref --verify --quiet "refs/heads/$BASE_BRANCH"; then
  BASE_REF="$BASE_BRANCH"
elif git show-ref --verify --quiet "refs/remotes/origin/$BASE_BRANCH"; then
  BASE_REF="origin/$BASE_BRANCH"
else
  BASE_REF="$BASE_BRANCH"
fi

# Check for commits in upstream that focus lacks
COMMITS_LACKING="$(git rev-list --count "$BASE_REF..$UPSTREAM_REF" 2>/dev/null || echo "0")"

if [ "$COMMITS_LACKING" -eq 0 ]; then
  echo "Upstream ($UPSTREAM_BRANCH) has no commits that $BASE_BRANCH lacks. Nothing to do."
  if [ "$DRY_RUN" = false ] && [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
    echo "### Upstream Sync" >> "$GITHUB_STEP_SUMMARY"
    echo "" >> "$GITHUB_STEP_SUMMARY"
    echo "Upstream is up to date with \`$BASE_BRANCH\`. No new commits to sync." >> "$GITHUB_STEP_SUMMARY"
  fi
  exit 0
fi

# The new commits, newest first; a long list is cut so the issue stays readable.
COMMIT_LIST_MD="$(git log -n 60 --pretty=format:'- %h %s' "$BASE_REF..$UPSTREAM_REF")"
if [ "$COMMITS_LACKING" -gt 60 ]; then
  COMMIT_LIST_MD="$COMMIT_LIST_MD
- … and $((COMMITS_LACKING - 60)) more"
fi

# merge-tree tries the merge in memory: it reports conflicts and touches no branch or file.
if MERGE_OUTPUT="$(git merge-tree --write-tree --name-only --no-messages "$BASE_REF" "$UPSTREAM_REF" 2>/dev/null)"; then
  MERGE_STATE="merges cleanly"
  CONFLICT_MD="None."
else
  MERGE_STATE="has conflicts"
  CONFLICT_MD="$(echo "$MERGE_OUTPUT" | tail -n +2 | sed '/^$/d' | sed 's/^/- `/; s/$/`/')"
fi

TITLE="Upstream changes waiting"
BODY="Upstream (\`$UPSTREAM_BRANCH\` of julesvbertolino/todoist-enhanced) has **$COMMITS_LACKING commits** that \`$BASE_BRANCH\` lacks, and it **$MERGE_STATE** with \`$BASE_BRANCH\`.

### Files that conflict
$CONFLICT_MD

### New upstream commits
$COMMIT_LIST_MD

To take them, ask Claude to merge upstream into \`$BASE_BRANCH\`. This issue is updated every Monday until then."

if [ "$DRY_RUN" = true ]; then
  echo "[dry-run] Would open or update the issue \"$TITLE\":"
  echo ""
  echo "$BODY"
  exit 0
fi

BODY_FILE="$(mktemp)"
trap 'rm -f "$BODY_FILE"' EXIT
printf '%s\n' "$BODY" > "$BODY_FILE"

EXISTING="$(gh issue list --state open --search "\"$TITLE\" in:title" --json number --jq '.[0].number // empty')"
if [ -n "$EXISTING" ]; then
  gh issue edit "$EXISTING" --body-file "$BODY_FILE"
  echo "Updated issue #$EXISTING."
else
  gh issue create --title "$TITLE" --body-file "$BODY_FILE"
fi

if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  printf '### Upstream Sync\n\n%s commits waiting; upstream %s.\n' "$COMMITS_LACKING" "$MERGE_STATE" >> "$GITHUB_STEP_SUMMARY"
fi
