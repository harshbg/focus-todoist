# Driving the agent CLIs

How the Mac-side worker runs Antigravity (`agy`, Gemini) and Codex (`codex`)
unattended. Checked on 2026-10-20 with `agy` 1.4.3 and `codex-cli` 0.163.0.

## Codex — works unattended

```bash
codex exec \
  -C /Users/harsh/Documents/GitHub/focus-todoist \
  --sandbox workspace-write \
  --color never \
  -o /tmp/codex-last.txt \
  "<prompt>" < /dev/null
```

| Need | Flag |
| --- | --- |
| One-shot prompt | `codex exec "<prompt>"` (or `-` to read stdin) |
| Edit files without prompting | `--sandbox workspace-write`: writes inside the working root only, no prompts. Don't use `--dangerously-bypass-approvals-and-sandbox` |
| Working dir | `-C <dir>`; `--skip-git-repo-check` only when outside a git repo |
| Model | `-m <model>`; default from `~/.codex/config.toml` is `gpt-6-sol`, reasoning effort `high` |
| Machine-readable output | `--json` (JSONL events), `-o <file>` (final message only), `--output-schema <file>` |
| Timeout | none built in. macOS has no `timeout`/`gtimeout`, so wrap the call yourself (e.g. the Bash tool's timeout) |

Test: created `hello.ts` + `hello.test.ts` in a scratch dir, both correct,
**15 s**, no prompts, exit 0.

## agy — blocked on file-write permission

```bash
agy -p "<prompt>" \
  --mode accept-edits \
  --model gemini-3.8-flash-high \
  --print-timeout 600s \
  --output-format json < /dev/null
```

| Need | Flag |
| --- | --- |
| One-shot prompt | `-p "<prompt>"` |
| Edit files without prompting | see below. `--mode accept-edits` alone is **not** enough in headless mode |
| Timeout | `--print-timeout 600s` (default is unlimited) |
| Model | `--model <id>`, optional `--effort low…max` |
| Machine-readable output | `--output-format json` (one object with `status`, `response`, `denied_actions`) or `stream-json` |

Models (`agy models`): `gemini-3.8-flash-{high,medium,low}`,
`claude-sonnet-4-6`, `claude-opus-4-6-thinking`, `gpt-oss-120b-medium`.
**No Gemini Pro model is offered on this account**; the strongest Gemini
option for code is `gemini-3.8-flash-high`.

### Why writes fail

Headless runs can't prompt, so any tool that needs approval is soft-denied.
With `--mode accept-edits` the run finished in ~10 s, wrote nothing, and
reported `"denied_actions":[{"action":"write_file"}]`. `--mode auto` prints
"not available for this account" and falls back to the default mode.

Options, narrowest first:

1. **Allow rule (recommended).** Add to
   `~/.gemini/antigravity-cli/settings.json` (or via `/permissions` in an
   interactive `agy` session):
   ```json
   "permissions": {
     "allow": ["write_file(/Users/harsh/Documents/GitHub/focus-todoist)"]
   }
   ```
   This allows writes under the repo only; shell commands still need approval.
   Not applied yet: the worker was not allowed to edit agy's permission
   config itself, so the user has to add this rule.
2. `--dangerously-skip-permissions`: auto-approves every tool, including
   shell. Avoid.

## Gotchas

- **agy exits 0 even when every write was denied.** Check `denied_actions`
  in the JSON output and `git status` after each run. Don't rely on the exit
  code.
- Close stdin (`< /dev/null`). If stdin is piped, codex appends it to the
  prompt, and agy may read it.
- agy trusts workspaces through `trustedWorkspaces` in its settings. The
  repo is already listed there.
- Codex runs read-only shell commands on its own (it ran `sed`, `rg` and
  `git status` to check its work) without prompting under `workspace-write`.
