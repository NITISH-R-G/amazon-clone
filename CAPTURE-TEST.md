# Capture Gate: 8x Agent Capture Verification

Result: **PASS** (8/8 checks), verified 2026-10-02.

## Mechanism
Two Claude Code hooks run `node .claude/hooks/capture.js`:

| Hook | Mode | Records |
|---|---|---|
| `UserPromptSubmit` | `prompt` | The user prompt, verbatim |
| `Stop` | `response` | The final assistant text of the turn (no thinking, no tool calls) |

Each entry has a UTC timestamp, the model and the session ID. The Stop hook
backfills any prompt missed by the prompt hook. It also replaces
`model: unknown` on the header and the latest PROMPT entry using the
transcript's authoritative model: `message.model` on assistant entries, or
`attachment.identity.modelId` written at session start.

- Tool: Claude Code (desktop app, Code tab)
- Model: `claude-sonnet-5-5` (Claude Sonnet 5.5)

## Files
- `.claude/settings.json`: hook registration
- `.claude/hooks/capture.js`: capture script
- `.agent-logs/<UTC date>_<UTC time>_<session-id>.md`: one log per session
- `.agent-logs/_capture-errors.log`: capture error log

## Canary evidence
| # | Canary | Session | Log |
|---|---|---|---|
| 1 | `CAPTURE TEST — 8x assignment, Nitish R.G.` | `fccd8b18` | `2026-10-02_10-23-51_fccd8b18-...md` (PROMPT num=2, 10:27:21Z) |
| 2 | `CAPTURE TEST 2 — second session, Nitish R.G.` | `54717c12` | `2026-10-02_10-27-55_54717c12-...md` (PROMPT num=1, 10:27:55Z) |
| 3 | `CAPTURE TEST 3 — model verification, Nitish R.G.` | `d28cf18d` | `2026-10-02_10-31-10_d28cf18d-...md` (PROMPT num=1, 10:31:10Z) |

Canary 2 recorded `model: unknown` on its first prompt and header. That is the
defect that failed the earlier gate. Those entries are preserved unmodified as
evidence. The model fallback was added in `capture.js` before canary 3.

## Verification of canary 3 (session `d28cf18d`)
| # | Check | Result |
|---|---|---|
| 1 | Prompt verbatim: `CAPTURE TEST 3 — model verification, Nitish R.G.` | PASS (PROMPT num=1) |
| 2 | Complete assistant response captured | PASS (RESPONSE num=1, 10:31:12Z, full text) |
| 3 | Prompt entry has UTC timestamp, model, session ID | PASS (`2026-10-02T10:31:10.057Z`, `claude-sonnet-5-5`, `session=d28cf18d`) |
| 4 | Response entry has UTC timestamp, model, session ID | PASS (`2026-10-02T10:31:12.429Z`, `claude-sonnet-5-5`, `session=d28cf18d`) |
| 5 | Header has authoritative model | PASS (`model: claude-sonnet-5-5`) |
| 6 | No `unknown` model in the fresh-session capture | PASS (grep finds none in this file) |
| 7 | `_capture-errors.log` has no error caused by this test | PASS (the only line is `10:30:23Z ... 54717c12`, before this session started at 10:31:10Z) |
| 8 | Works independently in a fresh session | PASS (new session ID and new log file; the model was recorded on the first prompt, before any assistant entry, via the session model attachment rather than anything inherited) |
