# Keeping up with upstream — build brief

Branch: `gemini/upstream-sync` off `focus`. Read `AGENTS.md` first.

This repo is a fork of `julesvbertolino/todoist-enhanced` (find its default
branch with `git ls-remote --symref https://github.com/julesvbertolino/todoist-enhanced HEAD`).
Our working branch is `focus`. We want upstream's changes offered to us as a pull
request, never merged automatically.

## Build

1. `.github/workflows/upstream-sync.yml`:
   - Runs weekly (Monday 06:17 UTC) and on `workflow_dispatch`.
   - `permissions: contents: write, pull-requests: write`.
   - Checks out `focus` with full history, adds upstream as a remote, fetches it.
   - Does nothing when upstream has no commits that `focus` lacks.
   - Otherwise creates `upstream-sync/<yyyy-mm-dd>` from `focus` and merges
     upstream into it. Set the git identity to `github-actions[bot]`.
     - **Clean merge**: `npm ci`, then lint, typecheck, test and build (the
       same commands as `.github/workflows/ci.yml`). Push the branch and open a
       PR into `focus` with `gh pr create`. The PR body lists the upstream
       commits and says whether the checks passed. Failing checks still open
       the PR, marked as a draft, with the failing step named.
     - **Conflict**: `git merge --abort`. Push a branch that is just upstream's
       head (`upstream-sync/<date>-conflicts`). Open a **draft** PR into
       `focus` whose body lists the conflicting files from the failed merge
       and says to resolve them locally.
   - If a PR from an earlier run is still open, skip and say so in the job
     summary rather than opening a second one.
2. `scripts/upstream-sync.sh` holding the logic, so it can also be run by hand
   on a Mac (`bash scripts/upstream-sync.sh --dry-run` prints what it would do
   and changes nothing). The workflow calls it.
3. A short "Keeping up with upstream" section at the end of `README.md`. It
   should say what the job does and how to run it by hand. It should also
   name the one repository setting it needs: Settings → Actions → General →
   "Allow GitHub Actions to create and approve pull requests".

## Done means

`bash -n scripts/upstream-sync.sh` passes. The dry run works locally against
the real upstream, and you include its output in your final message. Lint,
typecheck, tests and build still pass. Commit on `gemini/upstream-sync` and
push it. Do not merge into `focus`.
