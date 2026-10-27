# Focus for Todoist

[Focus for Todoist](https://todo.harshgupta.com) is an independent Todoist front end for planning tasks and protecting time for deep work. It adds a gamified focus timer to a weekly planning interface. Pick a Todoist task, run a focus block, and review your progress. Durable focus records and settings stay in Todoist; the browser talks to the Todoist API directly. There is no application server or separate account.

[Open the app](https://todo.harshgupta.com) · [Report a bug or an idea](https://github.com/harshbg/focus-todoist/issues)

## Building it

Use Node 22 (see `.nvmrc`):

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npx playwright test
```

`npm run build` writes the static site to `dist/`. Playwright's Chromium is needed for the browser tests; install it with `npx playwright install chromium` on a new machine.

## Self-hosting

A static host can serve the contents of `dist/`. For Cloudflare Pages, set the build command to `npm run build`, the output directory to `dist`, and the environment variable `NODE_VERSION` to `22`.

"Continue with Todoist" identifies this app through `oauth/client.json`, which the build writes for the public URL. For a copy on another domain, set `PUBLIC_URL` to its full HTTPS address, including a subfolder if used:

```bash
PUBLIC_URL=https://your.domain/ npm run build
```

The generated file must be reachable at `https://your.domain/oauth/client.json` so Todoist can check its redirect URI. A build served at another address explains the mismatch on the sign-in screen. Signing in with an API token does not require that OAuth document.

The browser stores local working data and the active timer on the device. Durable settings and focus history are stored in Todoist. Hosting this static app does not require a database or application server.

## Credit and licence

Focus for Todoist is built on [Enhanced for Todoist by Jules Bertolino (MIT licence)](https://github.com/julesvbertolino/todoist-enhanced). The [MIT licence](LICENSE) retains the original copyright notice and adds Harsh Gupta's.

## Disclaimer

Focus for Todoist is an independent project. It is not created by, affiliated with, or supported by Todoist. “Todoist” is a trademark of Todoist Inc. This project uses the Todoist API and is provided as is, without warranty. For problems with your Todoist account or Todoist itself, contact Todoist; for issues with this app, use this repository's [issue tracker](https://github.com/harshbg/focus-todoist/issues).

## Keeping up with upstream

Upstream changes from [Enhanced for Todoist](https://github.com/julesvbertolino/todoist-enhanced) are offered as pull requests rather than merged automatically. A GitHub Actions workflow (`.github/workflows/upstream-sync.yml`) runs weekly on Monday at 06:17 UTC and on `workflow_dispatch`. It checks for upstream commits that `focus` lacks, merges them into an `upstream-sync/<yyyy-mm-dd>` branch, and runs the test suite (`npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`). Clean merges open a pull request into `focus`; failing checks open a draft pull request naming the failing step; and merge conflicts abort the merge and open a draft pull request pointing to upstream's HEAD with the list of conflicting files. If a sync pull request from an earlier run is still open, the job skips to avoid duplicates.

To run or preview the sync by hand on a Mac:

```bash
# Preview what would be done without making changes
bash scripts/upstream-sync.sh --dry-run

# Run the sync and open a pull request
bash scripts/upstream-sync.sh
```

To allow the workflow to create pull requests, enable this setting in GitHub:
**Settings → Actions → General → Workflow permissions → Allow GitHub Actions to create and approve pull requests**.

**License:** [MIT](LICENSE).

### Privacy

No analytics SDK, usage counters or tracking cookies are included. Settings → Privacy explains local storage and Todoist synchronization. The same information is available before sign-in.
