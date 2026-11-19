# The "Focus now" signal: reading the running timer from another device

Deep Work with Todoist shares the block that is running right now through the
user's Todoist account, so any device or program that can read that account
can show the timer. This page is written for another AI agent or program that
wants to display it, such as a second screen, a widget or a desk clock. Paste
it to that agent.

## Where it is

- **One comment on the user's Todoist Inbox project** (a project comment, not
  a task comment). The Inbox is the project with `inbox_project: true`.
- Its content starts with this exact first line:

  ```
  Focus now (edited by the app, please leave as is)
  ```

  then a blank line, then one line of JSON.
- Normally there is exactly one such comment. If you find several, use the
  one with the largest `updatedAt`.
- Ignore the Inbox's other comments: `Focus log · …` holds the history (see
  `DASHBOARD-PROMPT.md`), and `Focus for Todoist · settings` holds the settings.

Todoist API v1: `GET https://api.todoist.com/api/v1/comments?project_id=<inbox id>`.
Follow `next_cursor` until there are no more pages. Authenticate as the user,
with a token they keep private. Never ask them to paste it into a chat.

## The JSON

```json
{
  "v": 1,
  "updatedAt": 1795000000000,
  "device": "k3x9q0w1ab",
  "active": {
    "mode": "focus",
    "focusMode": "work",
    "taskId": "6hxqfgXr3qGFw7cR",
    "title": "Write the brief",
    "lane": "Deep Dive",
    "plannedMin": 60,
    "startedAt": 1795000000000,
    "pausedMs": 0,
    "pausedAt": null
  }
}
```

All times are **Unix epoch milliseconds (UTC)**.

| Field | Meaning |
|-------|---------|
| `v` | Always `1`. Ignore the comment if it is anything else. |
| `updatedAt` | When this state was written. Newer wins. |
| `device` | A random id for the browser that wrote it. Display only. |
| `active` | The running block, or **`null` when nothing is running**. |
| `active.mode` | `"focus"` for a focus block, `"unwind"` for a break. |
| `active.focusMode` | `"work"` or `"personal"`. |
| `active.taskId` | The Todoist task being worked on, or `null` (a free block). |
| `active.title` | The task's title. It may contain Markdown such as `**bold**`; strip it for display. |
| `active.lane` | A category label such as "Deep Dive", or `null`. |
| `active.plannedMin` | The block's planned length in minutes. |
| `active.startedAt` | When the block started. |
| `active.pausedMs` | Total time already spent paused, not counting a pause in progress. |
| `active.pausedAt` | When the current pause began, or `null` while running. |

## Showing the timer

```
state:
  active == null            → "Nothing running"
  active.pausedAt != null   → "Paused"
  otherwise                 → "Running"

elapsedMs   = (active.pausedAt ?? now) - active.startedAt - active.pausedMs
remainingMs = max(0, active.plannedMin * 60000 - elapsedMs)
show remainingMs as mm:ss (h:mm:ss at an hour or more)
```

- Compute `now` from your own clock every second. Don't wait for new data to
  tick: the times are absolute, so every screen counts down to the same moment.
- While paused, the remaining time stays frozen.
- When `remainingMs` reaches 0, the block is done. Show "Block complete". The
  app logs it on its own, so never write anything back.
- Show the title, the lane, and Work or Personal alongside the clock.

## How fresh it is

- The app rewrites the comment the moment a block starts, pauses, resumes or
  ends.
- Your copy is only as fresh as your last read. Re-read every 30–60 seconds,
  and right away when the user asks, for example with a "Check now" button.
  Todoist has no push to a browser, so a change can take up to your polling
  interval to appear.
- Don't poll faster than every 15 seconds: Todoist limits API requests.

## Read only

Treat the comment as **read-only**. Don't edit or delete it: the app owns it,
and a stray edit would stop or change the user's timer on all their devices.
