# Prompt: build a deep-work dashboard from the focus log

Paste everything below the line into another AI. Then give it the data in one
of two ways: connect your Todoist account to it, or paste the text of the
"Focus log" comments from your Todoist Inbox. Never paste an API token into a
chat.

---

I track deep work with an app called "Deep Work with Todoist". It stores
every focus session in my Todoist account, as **comments on my Inbox
project** (project comments, not task comments). Build me a dashboard of my
deep-work hours from that data. Here is exactly how the data is stored and
how to read it.

## Where the data is

- Project: my Todoist **Inbox** (the project with `inbox_project: true`).
- Comments on that project whose content starts with **`Focus log · `**.
  Ignore every other comment.
- Todoist API v1, if you can call it: list the Inbox's comments with
  `GET https://api.todoist.com/api/v1/comments?project_id=<inbox id>`, and
  follow `next_cursor` until there are no more pages.

## Comment format

Each comment covers one ISO week (Monday to Sunday). A week holds one comment,
or several parts if the week is long:

```
Focus log · 2026-W46 · part 1 (edited by the app, please leave as is)

{"v":1,"e":[["2026-11-11T18:10",60,"6hxqfgXr3qGFw7cR","Read Chapter 4","Reading",4,"t","p"]]}
```

- Line 1: `Focus log · <ISO week-year>-W<week> · part <n> (edited by the app, please leave as is)`.
- Then a blank line, then JSON `{"v":1,"e":[ …entries… ]}`. Only `v: 1` exists.
- Each entry is an array:
  `[start, minutes, taskId, title, lane, rating, source, mode]`

| # | Field | Meaning |
|---|-------|---------|
| 0 | start | `"yyyy-MM-ddTHH:mm"`. Local wall-clock time with **no time zone**, read as I lived it. Never convert it. The date part decides which day a session counts for. |
| 1 | minutes | Integer ≥ 1: focused minutes actually spent, pauses excluded. **Use this, not end − start.** |
| 2 | taskId | The Todoist task id as a string, or `null` for a session not tied to a task. |
| 3 | title | The task's title when the session ran, at most 120 characters (a cut title ends with "…"). It may contain Markdown such as `**bold**`; strip it for display. |
| 4 | lane | A category (a Todoist label name such as "Deep Dive", "Analysis" or "Reading"), or `null`. |
| 5 | rating | My 1–5 rating of the session's focus quality, or `null` if I didn't rate it. |
| 6 | source | `"t"` = timed with the app's timer, `"m"` = added by hand afterwards. |
| 7 | mode | `"w"` = Work, `"p"` = Personal. **May be missing** in old entries: missing means Work. |

## Cleaning rules

- **Duplicates:** the same session can appear in two comments, for example when
  two devices wrote the same week. Two entries are the same session when they
  share `start` and `taskId`, or `start` and `title` when `taskId` is null. Keep
  one: the one from the comment that appears later.
- **Skip** any entry that does not match the shape above. Never fail on one bad
  row.
- Comments with the same week and part number can occur. Read them all, then
  remove duplicates with the rule above.

## My targets (optional, for goal lines)

Another Inbox comment starts with `Focus for Todoist · settings`, followed by a
blank line and JSON. Inside it, `focus` holds:

- **Work** (top level of `focus`): `dailyTargetMin`, `weeklyTargetMin`,
  `runThresholdMin`, and `workdays` (ISO weekdays, 1 = Monday … 7 = Sunday).
- **Personal**: the same fields inside `focus.personal`.
- `exemptDays`: `[{date: "yyyy-MM-dd", kind: "pto" | "holiday"}]`, days off.
- `lanes`: the Work lanes, and `personal.lanes`: the Personal ones.

If you can't read the settings, use these defaults: Work 240 min a day and 1,200
a week, Personal 60 and 300.

## How the app itself counts (match these)

- **Day total:** the sum of `minutes` for entries whose `start` date is that day.
- **Week total:** the sum over the ISO week (Monday start) of `start`.
- **Daily quest:** today's total against the daily target, shown as four
  quarters.
- **Run / streak:** consecutive eligible days whose total is at least
  `runThresholdMin`.
  - An eligible day is one of the `workdays` and not in `exemptDays`.
  - Days that aren't eligible pause the run without breaking it.
  - Today does not break the run until it is over.
- Work and Personal are always counted **separately**, each against its own
  targets. Show them separately, or with a filter.

## Dashboard I'd like

1. Hours per day for the last 30 days and per week for the last 12 weeks, with
   the target line. Split Work and Personal.
2. The current and longest run.
3. Time per lane and per task (the top 10 by hours).
4. The average rating, and the share of sessions that were rated.
5. When I focus: a heatmap of the hour of day (from `start`) by weekday.
6. Timed versus manual minutes.

Show the totals as hours and minutes (for example 3 h 30). Say how many
sessions you read and how many you skipped as malformed or duplicates, so I
can trust the numbers.
