const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const SCRIPT_ROOT = path.resolve(__dirname, '../..');

function repositoryRoot(input, fallback = SCRIPT_ROOT) {
  if (typeof input?.cwd === 'string' && input.cwd.trim()) {
    try {
      return path.resolve(execFileSync('git', ['-C', input.cwd, 'rev-parse', '--show-toplevel'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim());
    } catch (_) {
      // The documented cwd may not be a Git checkout (for example, a synthetic test).
    }
  }
  return fallback;
}

function eventType(input) {
  const type = { UserPromptSubmit: 'PROMPT', Stop: 'RESPONSE' }[input?.hook_event_name];
  if (!type) throw new Error(`Unsupported capture event: ${String(input?.hook_event_name)}`);
  return type;
}

function validate(input, type) {
  for (const key of ['session_id', 'turn_id', 'model']) {
    if (typeof input[key] !== 'string' || !input[key]) throw new Error(`Missing runtime ${key}`);
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(input.session_id)) throw new Error('Invalid session id');
  if (input.agent_id) throw new Error('Subagent capture is excluded');
  const value = type === 'PROMPT' ? input.prompt : input.last_assistant_message;
  if (typeof value !== 'string' || (type === 'RESPONSE' && value.length === 0)) {
    throw new Error(type === 'PROMPT' ? 'Missing prompt text' : 'Stop event has no final assistant message');
  }
  return value;
}

function render(events) {
  const first = events[0];
  const prompts = events.filter(event => event.type === 'PROMPT');
  return `---\nsession_id: ${JSON.stringify(first.session)}\ndate: ${first.timestamp.slice(0, 10)}\nauthor: NITISH-R-G\nmodel: ${JSON.stringify(first.model)}\ntool: codex\nproject: Amazon clone\ntotal_exchanges: ${prompts.length}\nfirst_prompt_time: ${prompts[0].timestamp}\nlast_prompt_time: ${prompts.at(-1).timestamp}\n---\n\n# Session Log - ${first.timestamp.slice(0, 10)}\n\nSession: \`${first.session}\` | Project: \`Amazon clone\` | Author: \`NITISH-R-G\`\n\n---\n\n` + events.map(event =>
    `[LOG_ENTRY type=${event.type} num=${event.num} session=${event.session}]\ntimestamp: ${event.timestamp}\nmodel: ${event.model}\n\n${event.text}\n\n`,
  ).join('');
}

function acquireLock(lockPath) {
  for (let attempt = 0; attempt < 80; attempt++) {
    try { return fs.openSync(lockPath, 'wx'); }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      // Bounded wait for another hook invocation in this session.
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
    }
  }
  throw new Error('Capture lock busy; inspect stale lock before retrying');
}

async function capture(input, options = {}) {
  const type = eventType(input);
  const value = validate(input, type);
  const root = options.root || repositoryRoot(input);
  const logDir = options.logDir || path.join(root, '.agent-logs');
  const stateDir = options.stateDir || path.join(root, '.codex', 'capture-state');
  fs.mkdirSync(stateDir, { recursive: true });
  fs.mkdirSync(logDir, { recursive: true });

  const journal = path.join(stateDir, `${input.session_id}.jsonl`);
  const lockPath = `${journal}.lock`;
  const lockFd = acquireLock(lockPath);
  try {
    const events = fs.existsSync(journal)
      ? fs.readFileSync(journal, 'utf8').split('\n').filter(Boolean).map(JSON.parse)
      : [];
    const existing = events.find(event => event.turn === input.turn_id && event.type === type);
    if (existing && (existing.text !== value || existing.model !== input.model)) {
      throw new Error('Conflicting duplicate capture; historical entry preserved');
    }
    if (!existing) {
      const prompt = events.find(event => event.turn === input.turn_id && event.type === 'PROMPT');
      if (type === 'RESPONSE' && !prompt) throw new Error('Stop has no captured prompt');
      const entry = {
        type,
        num: type === 'PROMPT' ? events.filter(event => event.type === 'PROMPT').length + 1 : prompt.num,
        session: input.session_id,
        turn: input.turn_id,
        model: input.model,
        timestamp: new Date().toISOString(),
        text: value,
      };
      fs.appendFileSync(journal, `${JSON.stringify(entry)}\n`, 'utf8');
      events.push(entry);
    }

    const stamp = events[0].timestamp.slice(0, 19).replace('T', '_').replaceAll(':', '-');
    const file = path.join(logDir, `${stamp}_${input.session_id}.md`);
    const temporary = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, render(events), 'utf8');
    fs.renameSync(temporary, file);
  } finally {
    fs.closeSync(lockFd);
    fs.unlinkSync(lockPath);
  }
}

function recordInvocation(input, status, root) {
  const stateDir = process.env.CODEX_CAPTURE_TEST_STATE_DIR || path.join(root, '.codex', 'capture-state');
  fs.mkdirSync(stateDir, { recursive: true });
  const entry = {
    timestamp: new Date().toISOString(),
    hook_event_name: typeof input?.hook_event_name === 'string' ? input.hook_event_name : 'parse',
    session_id: typeof input?.session_id === 'string' ? input.session_id : null,
    turn_id: typeof input?.turn_id === 'string' ? input.turn_id : null,
    model: typeof input?.model === 'string' ? input.model : null,
    cwd: typeof input?.cwd === 'string' ? input.cwd : null,
    status,
  };
  fs.appendFileSync(path.join(stateDir, 'hook-invocations.jsonl'), `${JSON.stringify(entry)}\n`, 'utf8');
}

function errorLogPath(input) {
  if (process.env.CODEX_CAPTURE_TEST_ERROR_LOG) return process.env.CODEX_CAPTURE_TEST_ERROR_LOG;
  return path.join(repositoryRoot(input), '.agent-logs', '_capture-errors.log');
}

async function runCli() {
  let raw = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) raw += chunk;
  let input = {};
  let root = SCRIPT_ROOT;
  try {
    input = JSON.parse(raw);
    root = repositoryRoot(input);
    const options = {
      root,
      logDir: process.env.CODEX_CAPTURE_TEST_LOG_DIR || path.join(root, '.agent-logs'),
      stateDir: process.env.CODEX_CAPTURE_TEST_STATE_DIR || path.join(root, '.codex', 'capture-state'),
    };
    await capture(input, options);
    recordInvocation(input, 'ok', root);
    process.stdout.write('{}\n');
  } catch (error) {
    try {
      root = repositoryRoot(input, root);
      const target = errorLogPath(input);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.appendFileSync(target, `${new Date().toISOString()} ${input.hook_event_name || 'parse'}: ${error.stack || error}\n`, 'utf8');
    } catch (_) {
      // stderr remains the final diagnostic if the error log itself is unavailable.
    }
    try { recordInvocation(input, 'error', root); } catch (_) {}
    process.stderr.write(`8x capture failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { capture, render, repositoryRoot };
if (require.main === module) runCli();
