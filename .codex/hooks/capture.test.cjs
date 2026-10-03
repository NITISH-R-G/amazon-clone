const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const script = path.join(__dirname, 'capture.cjs');

function runHook(payload, cwd, temp) {
  return spawnSync(process.execPath, [script], {
    cwd,
    encoding: 'utf8',
    input: JSON.stringify(payload),
    env: {
      ...process.env,
      CODEX_CAPTURE_TEST_LOG_DIR: path.join(temp, 'out logs'),
      CODEX_CAPTURE_TEST_STATE_DIR: path.join(temp, 'private state'),
      CODEX_CAPTURE_TEST_ERROR_LOG: path.join(temp, 'errors', '_capture-errors.log'),
      CODEX_CAPTURE_DIAGNOSTICS: '1',
    },
  });
}

test('real stdin hook path captures prompt and Stop response across Windows paths and sessions', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), '8x synthetic capture '));
  const project = path.join(temp, 'intended repository with spaces');
  const launcherCwd = path.join(temp, 'different cwd');
  const logs = path.join(temp, 'out logs');
  try {
    fs.mkdirSync(project, { recursive: true });
    fs.mkdirSync(launcherCwd, { recursive: true });
    const init = spawnSync('git', ['init', '--quiet', project], { encoding: 'utf8' });
    assert.equal(init.status, 0, init.stderr);

    const prompt = 'Exact prompt — ₹\nwith newlines and Unicode';
    const response = 'Complete final response.\nSecond paragraph.';
    const common = {
      cwd: project,
      model: 'gpt-6.1-sol',
      permission_mode: 'default',
      transcript_path: null,
      session_id: 'synthetic-session-one',
      turn_id: 'turn-one',
    };
    const submitted = runHook({
      ...common,
      hook_event_name: 'UserPromptSubmit',
      prompt,
      reasoning: 'MUST NOT BE LOGGED',
      tool_input: 'MUST NOT BE LOGGED',
    }, launcherCwd, temp);
    assert.equal(submitted.status, 0, submitted.stderr);
    assert.equal(submitted.stdout.trim(), '{}');

    const stopped = runHook({
      ...common,
      hook_event_name: 'Stop',
      stop_hook_active: false,
      last_assistant_message: response,
      tool_output: 'MUST NOT BE LOGGED',
    }, launcherCwd, temp);
    assert.equal(stopped.status, 0, stopped.stderr);

    const secondSession = runHook({
      ...common,
      session_id: 'synthetic-session-two',
      turn_id: 'turn-two',
      hook_event_name: 'UserPromptSubmit',
      prompt: 'A separate session prompt',
    }, launcherCwd, temp);
    assert.equal(secondSession.status, 0, secondSession.stderr);

    const files = fs.readdirSync(logs).filter(name => name.endsWith('.md')).sort();
    assert.equal(files.length, 2);
    const first = fs.readFileSync(path.join(logs, files.find(name => name.includes('synthetic-session-one'))), 'utf8');
    assert.ok(first.includes(prompt));
    assert.ok(first.includes(response));
    assert.ok(first.includes('model: gpt-6.1-sol'));
    assert.match(first, /timestamp: \d{4}-\d{2}-\d{2}T[^\n]+Z/);
    assert.equal((first.match(/type=PROMPT/g) || []).length, 1);
    assert.equal((first.match(/type=RESPONSE/g) || []).length, 1);
    assert.ok(!first.includes('MUST NOT BE LOGGED'));
    const invocations = fs.readFileSync(path.join(temp, 'private state', 'hook-invocations.jsonl'), 'utf8');
    assert.match(invocations, /"hook_event_name":"UserPromptSubmit"/);
    assert.match(invocations, /"hook_event_name":"Stop"/);
    assert.ok(!invocations.includes(prompt));
    assert.ok(!invocations.includes(response));
    const other = fs.readFileSync(path.join(logs, files.find(name => name.includes('synthetic-session-two'))), 'utf8');
    assert.ok(other.includes('A separate session prompt'));
    assert.ok(!other.includes(response));

    const failedStop = runHook({
      ...common,
      turn_id: 'turn-without-prompt',
      hook_event_name: 'Stop',
      stop_hook_active: false,
      last_assistant_message: 'Must not be saved',
    }, launcherCwd, temp);
    assert.notEqual(failedStop.status, 0);
    assert.match(fs.readFileSync(path.join(temp, 'errors', '_capture-errors.log'), 'utf8'), /Stop has no captured prompt/);
    assert.match(fs.readFileSync(path.join(temp, 'private state', 'hook-invocations.jsonl'), 'utf8'), /"status":"error"/);
    assert.ok(!fs.readFileSync(path.join(logs, files.find(name => name.includes('synthetic-session-one'))), 'utf8').includes('Must not be saved'));
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
