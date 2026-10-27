#!/usr/bin/env bash
#
# scripts/upstream-sync.sh
#
# Synchronizes the 'focus' branch with upstream changes from
# https://github.com/julesvbertolino/todoist-enhanced.
#
# In a clean merge, runs verification checks (lint, typecheck, test, build)
# and opens a pull request. In case of merge conflict, pushes upstream's HEAD
# and opens a draft PR listing conflicting files for manual resolution.
#
# Supports --dry-run to inspect and describe actions without modifying repository state.

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

# Check if a PR from an earlier run is still open
check_open_sync_pr() {
  if ! command -v gh >/dev/null 2>&1; then
    return 1
  fi

  local pr_json
  pr_json="$(gh pr list --base "$BASE_BRANCH" --state open --json number,headRefName,url,title 2>/dev/null || true)"
  if [ -z "$pr_json" ] || [ "$pr_json" = "[]" ]; then
    return 1
  fi

  local open_pr=""
  if command -v jq >/dev/null 2>&1; then
    open_pr="$(echo "$pr_json" | jq -r '.[] | select(.headRefName | startswith("upstream-sync/")) | "#\(.number) (\(.headRefName)): \(.url)"' 2>/dev/null | head -n 1)"
  elif command -v python3 >/dev/null 2>&1; then
    open_pr="$(python3 -c '
import sys, json
try:
    prs = json.loads(sys.stdin.read())
    for pr in prs:
        head = pr.get("headRefName", "")
        if head.startswith("upstream-sync/"):
            num = pr.get("number")
            url = pr.get("url")
            print(f"#{num} ({head}): {url}")
            break
except Exception:
    pass
' <<< "$pr_json" 2>/dev/null || true)"
  else
    if echo "$pr_json" | grep -q '"headRefName":"upstream-sync/'; then
      open_pr="$(echo "$pr_json" | grep -o '"headRefName":"upstream-sync/[^"]*"' | head -n 1)"
    fi
  fi

  if [ -n "$open_pr" ]; then
    echo "$open_pr"
    return 0
  fi
  return 1
}

OPEN_SYNC_PR="$(check_open_sync_pr || true)"
if [ -n "$OPEN_SYNC_PR" ]; then
  if [ "$DRY_RUN" = true ]; then
    echo "[dry-run] Found open pull request from an earlier run: $OPEN_SYNC_PR"
    echo "[dry-run] Upstream sync would skip opening a new PR."
    exit 0
  else
    echo "Skipping: a pull request from an earlier run is still open: $OPEN_SYNC_PR"
    if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
      echo "### Upstream Sync" >> "$GITHUB_STEP_SUMMARY"
      echo "" >> "$GITHUB_STEP_SUMMARY"
      echo "Skipped upstream sync: a pull request from an earlier run is still open ($OPEN_SYNC_PR)." >> "$GITHUB_STEP_SUMMARY"
    fi
    exit 0
  fi
fi

COMMIT_LIST="$(git log --oneline "$BASE_REF..$UPSTREAM_REF")"
COMMIT_LIST_MD="$(git log --pretty=format:"- %h %s" "$BASE_REF..$UPSTREAM_REF")"

if [ "$DRY_RUN" = true ]; then
  echo "[dry-run] Upstream sync dry run preview:"
  echo "  Upstream repository: $UPSTREAM_URL"
  echo "  Upstream branch:     $UPSTREAM_BRANCH"
  echo "  Base branch:         $BASE_BRANCH"
  echo "  New upstream commits ($COMMITS_LACKING):"
  echo "$COMMIT_LIST" | sed 's/^/    /'
  echo ""
  echo "  Actions that would be taken:"
  echo "  1. Configure git identity as github-actions[bot]"
  echo "  2. Create branch '$SYNC_BRANCH' from '$BASE_BRANCH'"
  echo "  3. Attempt merge of '$UPSTREAM_REF' into '$SYNC_BRANCH'"
  echo "  4. On clean merge:"
  echo "     - Run verification checks:"
  echo "       * npm ci"
  echo "       * npm run typecheck"
  echo "       * npm run lint"
  echo "       * npm test"
  echo "       * npm run build"
  echo "     - Push '$SYNC_BRANCH' to origin"
  echo "     - Open pull request into '$BASE_BRANCH' using gh pr create"
  echo "       (marked as draft if any check fails, naming the failing step)"
  echo "  5. On merge conflict:"
  echo "     - Abort merge (git merge --abort)"
  echo "     - Create branch '$CONFLICT_BRANCH' at upstream's HEAD"
  echo "     - Push '$CONFLICT_BRANCH' to origin"
  echo "     - Open draft pull request into '$BASE_BRANCH' listing conflicting files"
  echo ""
  echo "[dry-run] Dry run complete. No changes were made."
  exit 0
fi

# Non-dry-run execution
if [ -n "$(git status --porcelain)" ]; then
  echo "Error: Working directory has uncommitted changes. Please commit or stash them before running upstream sync." >&2
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: GitHub CLI (gh) is required to open pull requests. Please install and authenticate gh." >&2
  exit 1
fi

PR_BODY_FILE=""
cleanup() {
  if [ -n "${PR_BODY_FILE:-}" ] && [ -f "$PR_BODY_FILE" ]; then
    rm -f "$PR_BODY_FILE"
  fi
}
trap cleanup EXIT

# Pass bot identity to commit commands so repository git config is not modified
GIT_IDENTITY=(-c user.name="github-actions[bot]" -c user.email="41898282+github-actions[bot]@users.noreply.github.com")

echo "Checking out $BASE_BRANCH..."
git checkout "$BASE_BRANCH"
echo "Creating sync branch $SYNC_BRANCH from $BASE_BRANCH..."
git checkout -B "$SYNC_BRANCH" "$BASE_BRANCH"

echo "Merging $UPSTREAM_REF into $SYNC_BRANCH..."
if git "${GIT_IDENTITY[@]}" merge --no-edit "$UPSTREAM_REF"; then
  MERGE_SUCCESS=true
else
  MERGE_SUCCESS=false
fi

if [ "$MERGE_SUCCESS" = false ]; then
  echo "Merge conflict detected."

  CONFLICT_FILES="$(git diff --name-only --diff-filter=U 2>/dev/null || true)"
  if [ -z "$CONFLICT_FILES" ]; then
    CONFLICT_FILES_MD="- (No specific conflicting files detected by diff filter)"
  else
    CONFLICT_FILES_MD="$(echo "$CONFLICT_FILES" | sed 's/^/- /')"
  fi

  echo "Aborting merge..."
  git merge --abort

  echo "Checking out upstream HEAD into $CONFLICT_BRANCH..."
  git checkout -B "$CONFLICT_BRANCH" "$UPSTREAM_REF"

  echo "Pushing $CONFLICT_BRANCH to origin..."
  git push -u origin "$CONFLICT_BRANCH" --force

  PR_TITLE="Upstream sync ${SYNC_DATE} (merge conflicts)"
  PR_BODY_FILE="$(mktemp)"
  cat > "$PR_BODY_FILE" <<EOF
## Upstream Sync (${SYNC_DATE})

Automatic merge from upstream (\`$UPSTREAM_BRANCH\`) into \`$BASE_BRANCH\` encountered conflicts.

This branch (\`$CONFLICT_BRANCH\`) points directly to upstream's HEAD. Please resolve the conflicts locally and merge them into \`$BASE_BRANCH\`.

### Conflicting Files
$CONFLICT_FILES_MD

### Upstream Commits
$COMMIT_LIST_MD

### Resolving Locally
\`\`\`bash
git checkout $BASE_BRANCH
git pull origin $BASE_BRANCH
git checkout -b resolve-upstream-sync-$SYNC_DATE $BASE_BRANCH
git merge origin/$CONFLICT_BRANCH
# Resolve conflicts in the files listed above
git add <resolved-files>
git commit
\`\`\`
EOF

  echo "Opening draft pull request..."
  gh pr create \
    --draft \
    --base "$BASE_BRANCH" \
    --head "$CONFLICT_BRANCH" \
    --title "$PR_TITLE" \
    --body-file "$PR_BODY_FILE"
  rm -f "$PR_BODY_FILE"
  PR_BODY_FILE=""

  if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
    cat <<EOF >> "$GITHUB_STEP_SUMMARY"
### Upstream Sync (Merge Conflicts)

Automatic merge from upstream encountered conflicts. A draft pull request has been opened with upstream's HEAD:
- **Branch**: \`$CONFLICT_BRANCH\`
- **Base**: \`$BASE_BRANCH\`
- **Conflicting files**:
$CONFLICT_FILES_MD
EOF
  fi

  exit 0
fi

echo "Clean merge succeeded. Running verification checks..."

CHECKS_PASSED=true
FAILED_STEP=""

run_step() {
  local step_name="$1"
  shift
  echo "==> Running check: $step_name ($*)"
  if ! "$@"; then
    echo "Check failed: $step_name"
    CHECKS_PASSED=false
    FAILED_STEP="$step_name"
    return 1
  fi
  return 0
}

# Run the same verification commands as .github/workflows/ci.yml:
# npm ci, npm run typecheck, npm run lint, npm test, npm run build
run_step "npm ci" npm ci && \
run_step "npm run typecheck" npm run typecheck && \
run_step "npm run lint" npm run lint && \
run_step "npm test" npm test && \
run_step "npm run build" npm run build || true

echo "Pushing sync branch $SYNC_BRANCH to origin..."
git push -u origin "$SYNC_BRANCH" --force

if [ "$CHECKS_PASSED" = true ]; then
  PR_TITLE="Upstream sync ${SYNC_DATE}"
  PR_BODY_FILE="$(mktemp)"
  cat > "$PR_BODY_FILE" <<EOF
## Upstream Sync (${SYNC_DATE})

Upstream changes from \`$UPSTREAM_BRANCH\` were merged cleanly into \`$BASE_BRANCH\`.

### Verification Checks
All checks passed:
- \`npm ci\`
- \`npm run typecheck\`
- \`npm run lint\`
- \`npm test\`
- \`npm run build\`

### Upstream Commits
$COMMIT_LIST_MD
EOF

  echo "Opening pull request..."
  gh pr create \
    --base "$BASE_BRANCH" \
    --head "$SYNC_BRANCH" \
    --title "$PR_TITLE" \
    --body-file "$PR_BODY_FILE"
  rm -f "$PR_BODY_FILE"
  PR_BODY_FILE=""

  if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
    cat <<EOF >> "$GITHUB_STEP_SUMMARY"
### Upstream Sync

- **Branch**: \`$SYNC_BRANCH\`
- **Base**: \`$BASE_BRANCH\`
- **Status**: Clean merge, all checks passed
- **Commits synced**: $COMMITS_LACKING
EOF
  fi

else
  PR_TITLE="Upstream sync ${SYNC_DATE} (checks failed: ${FAILED_STEP})"
  PR_BODY_FILE="$(mktemp)"
  cat > "$PR_BODY_FILE" <<EOF
## Upstream Sync (${SYNC_DATE})

Upstream changes from \`$UPSTREAM_BRANCH\` were merged into \`$BASE_BRANCH\`, but verification checks failed.

### Verification Checks
- **Failed step**: \`$FAILED_STEP\`

This pull request was opened as a draft for review and fixes.

### Upstream Commits
$COMMIT_LIST_MD
EOF

  echo "Opening draft pull request due to failed checks ($FAILED_STEP)..."
  gh pr create \
    --draft \
    --base "$BASE_BRANCH" \
    --head "$SYNC_BRANCH" \
    --title "$PR_TITLE" \
    --body-file "$PR_BODY_FILE"
  rm -f "$PR_BODY_FILE"
  PR_BODY_FILE=""

  if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
    cat <<EOF >> "$GITHUB_STEP_SUMMARY"
### Upstream Sync

- **Branch**: \`$SYNC_BRANCH\`
- **Base**: \`$BASE_BRANCH\`
- **Status**: Checks failed at step \`$FAILED_STEP\` (Draft PR opened)
- **Commits synced**: $COMMITS_LACKING
EOF
  fi
fi

exit 0
