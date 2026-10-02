#!/usr/bin/env node
// 8x agent capture. Appends the user prompt and the final response of each turn
// to .agent-logs/<date>_<time>_<session>.md. Captures nothing else (no thinking,
// no tool calls).
//
//   node capture.js prompt   <- UserPromptSubmit hook (stdin JSON has `prompt`)
//   node capture.js response <- Stop hook (stdin JSON has `transcript_path`)
//
// The Stop hook also reconciles against the transcript: if a prompt was never
// logged (e.g. the hook was installed mid-turn) it is logged first, tagged
// `source: transcript-backfill`, so every turn ends up with PROMPT + RESPONSE.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const mode = process.argv[2];
let raw = '';
try { raw = fs.readFileSync(0, 'utf8'); } catch (_) {}
let input = {};
try { input = JSON.parse(raw || '{}'); } catch (_) {}

const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const logDir = path.join(root, '.agent-logs');
const sessionId = input.session_id || 'unknown-session';
const short = sessionId.slice(0, 8);

function readTranscript(p) {
  try {
    return fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch (_) { return null; } }).filter(Boolean);
  } catch (_) { return []; }
}

// Real human prompts: user entries with string content, not meta/sidechain.
function transcriptPrompts(entries) {
  return entries.filter((e) => e.type === 'user' && !e.isSidechain && !e.isMeta && e.message && typeof e.message.content === 'string' && e.message.content.trim());
}

// Authoritative model sources in the Claude Code transcript, newest first:
//   1. assistant entries: message.model (what actually answered)
//   2. the session "model" attachment: attachment.identity.modelId (written at
//      session start, before any assistant entry exists - this is what covers the
//      first prompt of a fresh session)
function lastModel(entries) {
  for (let i = entries.length - 1; i >= 0; i--) {
    const m = entries[i].message;
    if (entries[i].type === 'assistant' && m && m.model && m.model !== '<synthetic>') return m.model;
  }
  for (let i = entries.length - 1; i >= 0; i--) {
    const a = entries[i].attachment;
    if (entries[i].type === 'attachment' && a && a.type === 'model' && a.identity && a.identity.modelId) return a.identity.modelId;
  }
  return null;
}

// Logs whose first prompt predates this are never rewritten (earlier captures are
// left exactly as written).
const BACKFILL_FROM = '2026-10-02T10:30:00.000Z';

// Replace `model: unknown` on the header and on the most recent PROMPT entry with
// the authoritative model, once the Stop hook has seen the turn's real response.
function backfillUnknown(model) {
  const f = findLog();
  if (!f || !model || model === 'unknown') return;
  const fp = path.join(logDir, f);
  let body = fs.readFileSync(fp, 'utf8');
  const first = (body.match(/^first_prompt_time: (.*)$/m) || [])[1];
  if (!first || first < BACKFILL_FROM) return;
  let out = body.replace(/^model: unknown$/m, `model: ${model}`); // header only (first match)
  const i = out.lastIndexOf('[LOG_ENTRY type=PROMPT ');
  if (i >= 0) out = out.slice(0, i) + out.slice(i).replace(/^model: unknown$/m, `model: ${model}`);
  if (out !== body) fs.writeFileSync(fp, out);
}

// Final response = the text blocks of assistant entries after the last user entry
// (a tool_result counts as a user entry, so earlier narration is excluded).
function finalResponse(entries) {
  let start = 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].type === 'user' && !entries[i].isSidechain) { start = i + 1; break; }
  }
  const texts = [];
  let ts = null; let model = null;
  for (let i = start; i < entries.length; i++) {
    const e = entries[i];
    if (e.type !== 'assistant' || e.isSidechain || !e.message || !Array.isArray(e.message.content)) continue;
    for (const b of e.message.content) if (b.type === 'text' && b.text && b.text.trim()) texts.push(b.text);
    ts = e.timestamp || ts;
    if (e.message.model && e.message.model !== '<synthetic>') model = e.message.model;
  }
  return { text: texts.join('\n\n'), ts, model };
}

function gitUser() {
  try { return execSync('git config user.name', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (_) { return ''; }
}

function findLog() {
  fs.mkdirSync(logDir, { recursive: true });
  return fs.readdirSync(logDir).find((f) => f.endsWith(`_${sessionId}.md`)) || null;
}

function stamp(iso) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}_${p(d.getUTCHours())}-${p(d.getUTCMinutes())}-${p(d.getUTCSeconds())}`;
}

function counts(body) {
  return {
    prompts: (body.match(/^\[LOG_ENTRY type=PROMPT /gm) || []).length,
    responses: (body.match(/^\[LOG_ENTRY type=RESPONSE /gm) || []).length,
  };
}

function setFront(body, key, value) {
  return body.replace(new RegExp(`^${key}: .*$`, 'm'), `${key}: ${value}`);
}

function append(type, ts, model, text, extra) {
  let file = findLog();
  let body;
  let fullPath;
  if (!file) {
    const date = new Date(ts).toISOString().slice(0, 10);
    const author = gitUser() || 'Nitish R.G.';
    const project = path.basename(root);
    file = `${stamp(ts)}_${sessionId}.md`;
    body = `---\nsession_id: ${sessionId}\ndate: ${date}\nauthor: ${author}\nmodel: ${model}\ntool: claude-code\nproject: ${project}\ntotal_exchanges: 0\nfirst_prompt_time: ${ts}\nlast_prompt_time: ${ts}\n---\n\n# Session Log - ${date}\n\nSession: \`${short}\` | Project: \`${project}\` | Author: \`${author}\`\n\n---\n\n`;
    fullPath = path.join(logDir, file);
  } else {
    fullPath = path.join(logDir, file);
    body = fs.readFileSync(fullPath, 'utf8');
  }
  const c = counts(body);
  const num = type === 'PROMPT' ? c.prompts + 1 : c.responses + 1;
  body += `[LOG_ENTRY type=${type} num=${num} session=${short}]\ntimestamp: ${ts}\nmodel: ${model}\n${extra ? extra + '\n' : ''}\n${text}\n\n\n`;
  const c2 = counts(body);
  body = setFront(body, 'total_exchanges', String(c2.prompts));
  if (type === 'PROMPT') body = setFront(body, 'last_prompt_time', ts);
  fs.writeFileSync(fullPath, body);
}

function currentCounts() {
  const f = findLog();
  return f ? counts(fs.readFileSync(path.join(logDir, f), 'utf8')) : { prompts: 0, responses: 0 };
}

try {
  const now = new Date().toISOString();
  if (mode === 'prompt') {
    const entries = input.transcript_path ? readTranscript(input.transcript_path) : [];
    const model = input.model || lastModel(entries) || process.env.ANTHROPIC_MODEL || 'unknown';
    append('PROMPT', now, model, input.prompt || '');
  } else if (mode === 'response') {
    const entries = input.transcript_path ? readTranscript(input.transcript_path) : [];
    const resp = finalResponse(entries);
    const text = resp.text || input.last_assistant_message || '';
    const model = resp.model || lastModel(entries) || 'unknown';
    const c = currentCounts();
    if (c.responses >= c.prompts && c.prompts >= 0) {
      // No unanswered prompt logged: reconcile from transcript.
      const prompts = transcriptPrompts(entries);
      if (prompts.length > c.prompts) {
        const p = prompts[prompts.length - 1];
        append('PROMPT', p.timestamp || now, model, p.message.content, 'source: transcript-backfill');
      }
    }
    const c2 = currentCounts();
    if (c2.responses < c2.prompts && text) append('RESPONSE', resp.ts || now, model, text);
    backfillUnknown(resp.model || lastModel(entries));
    const f2 = findLog();
    if (f2 && /^model: unknown$/m.test(fs.readFileSync(path.join(logDir, f2), 'utf8').split('[LOG_ENTRY')[0] + '')) {
      fs.appendFileSync(path.join(logDir, '_capture-errors.log'), `${now} model still unknown for ${sessionId}
`);
    }
  }
} catch (err) {
  try { fs.appendFileSync(path.join(root, '.agent-logs', '_capture-errors.log'), `${new Date().toISOString()} ${mode}: ${err && err.stack}\n`); } catch (_) {}
}
process.exit(0);
