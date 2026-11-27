# Keeping up with upstream

This repo is a fork of
[`julesvbertolino/todoist-enhanced`](https://github.com/julesvbertolino/todoist-enhanced)
("Enhanced for Todoist"). Its releases come here in two steps, and nothing
reaches the live site (`main` and `focus`, deployed by Cloudflare Pages)
until the owner says so.

1. **Notice.** `.github/workflows/upstream-sync.yml` runs every Monday and
   opens or updates the issue "Upstream changes waiting", listing the new
   commits and the files that would conflict (`scripts/upstream-sync.sh`). It
   needs Issues turned on: Settings → General → Features → Issues.
2. **Merge.** A scheduled Claude session runs every Monday morning (Los
   Angeles time) and follows the playbook below: it merges on a branch, fixes
   what conflicts, runs every check, and reports. The owner reviews and says
   "ship it".

## The merge playbook

Read `AGENTS.md` first.

1. `git fetch origin main && git fetch https://github.com/julesvbertolino/todoist-enhanced.git main:refs/remotes/upstream/main`.
   If `git rev-list --count origin/main..upstream/main` is 0, stop: report
   "nothing new upstream".
2. If a branch `upstream/*` from an earlier week is still on `origin`, unmerged
   into `main`, build on it instead of starting again, and say so.
3. Branch `upstream/<upstream version>` (the `version` in upstream's
   `package.json`) from `origin/main`, then `git merge --no-edit upstream/main`.
4. Resolve every conflict by these rules, which hold every time:
   - **The fork's identity stays.** `src/app-info.ts` keeps `APP_NAME = 'Deep Work with Todoist'`,
     `AUTHOR = 'Harsh Gupta'`, `SITE_URL`, `GITHUB_URL`, `AUTHOR_GITHUB_URL`
     and `FEEDBACK_URL` pointing at this fork; take upstream's `VERSION`. Leave
     out upstream's `PRIVACY_EMAIL`, `LINKEDIN_URL`, `X_URL`, `COFFEE_URL`:
     the privacy note links to `FEEDBACK_URL` instead. The `MAC_APP_*`
     constants keep pointing at upstream (its Mac app is upstream's).
   - **No survey.** Upstream's `SurveyBanner`, the account-menu "Tell me how
     you use Enhanced" entry, the visit-day counter in `App.tsx` and the
     `nav.survey*` strings and changelog line stay out: the form is the upstream
     author's. The `survey*` fields in `prefs.ts` may stay; nothing reads them.
   - **No hire note, no coffee link.** Upstream's `HireNote` component, the
     `hireNote` / `setHireNote` store fields and every `hireNoteOpen` use stay
     out; `e2e/hire-note.spec.ts` stays deleted. Remove them wherever upstream
     adds them again, including conditions such as `&& !hireNoteOpen`.
   - **Everything under `src/focus/`, `docs/focus/` and our wiring stays**:
     the Focus, Progress and sidecar routes, the Work/Personal mode, the Start
     focus and Plan buttons in task rows and the task panel, the composer's
     calendar choices, the demo's work projects, and the e2e set-up that pins
     `tde.mode` to `personal` and `tde.demoWork` to `off`.
   - **Otherwise prefer upstream**, then re-apply the fork's small edit on top
     of it. When a file was only touched here to remove the hire note, take
     upstream's file and remove it again.
   - `package.json`: keep both sides' dependencies. Take upstream's
     `package-lock.json`, then run `npm install` to add ours back.
   - `AGENTS.md`: keep ours, with upstream's guardrail under "Upstream guardrail".
5. If upstream changed something the fork's code calls (icons, store fields,
   component props), move the fork's code onto the new form: our focus views
   should look native, for example by using the app's `Icon` component.
6. Run, and make all of them pass: `npm run lint`, `npm run typecheck`,
   `npm test`, `npm run build`, then `npx playwright test --trace off`. A
   failing end-to-end test: run it alone three times, and run it on upstream's
   own `main` (a `git worktree` with our `node_modules` linked). If it passes
   there and fails here, it is ours to fix. If it is flaky on both, a test that
   reads before the page has rendered may wait for it; say so in the report.
7. Commit the merge ("Merge upstream <from>–<to> into focus", what was kept
   and why) and push the branch. **Never push to `main` or `focus`.**
8. Report, in plain words: the versions merged, what is new for the owner
   (the changelog in `src/` names it), each conflict and how it was resolved,
   the check results with numbers, anything that needs a decision, and the
   branch name. End with: reply "ship it" to put it live.

## Shipping

On "ship it": `git checkout main && git merge --ff-only <branch>`, push
`main`, push `main:focus`, delete the branch. Cloudflare Pages deploys both.

## By hand

`bash scripts/upstream-sync.sh --dry-run` lists what upstream has that the
fork lacks, and which files would conflict, without changing anything.
