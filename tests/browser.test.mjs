import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { findBrowser, startBrowser, withBrowser } from '../scripts/lib/browser.mjs';

const options = { skip: !findBrowser(), timeout: 90000 };
test('five concurrent sessions use a private pipe (no port), distinct profiles; cleanup is idempotent', options, async () => {
  const sessions = [];
  try {
    const attempts = await Promise.allSettled(Array.from({ length: 5 }, async (_, i) => {
      const b = await startBrowser(); sessions.push(b);
      assert.equal(await b.ev(`${i} + 1`), i + 1);
      assert.equal(b.port, null); assert.ok(existsSync(b.profile));
    }));
    // Wait for every launch before cleanup even if one fails. Otherwise a late
    // successful launch can escape finally and keep the failed test runner alive.
    assert.deepEqual(attempts.filter(r => r.status === 'rejected').map(r => String(r.reason)), []);
    assert.equal(new Set(sessions.map((b) => b.pid)).size, 5);
    assert.equal(new Set(sessions.map((b) => b.profile)).size, 5);
  } finally { for (const b of sessions) { await b.cleanup(); await b.cleanup(); } }
  for (const b of sessions) {
    assert.throws(() => process.kill(b.pid, 0));
    assert.ok(!existsSync(b.profile), b.profile);
  }
});
test('a hung page is killed and retried exactly once, then reported', options, async () => {
  const sessions = [];
  await assert.rejects(withBrowser(async (b) => {
    sessions.push(b); await b.ev('while (true) {}');
  }, { timeout: 5000 }), (e) => e.code === 'WATCHDOG');
  assert.equal(sessions.length, 2);
  for (const b of sessions) assert.throws(() => process.kill(b.pid, 0));
});
test('the frame watchdog also covers a stalled consumer outside CDP', options, async () => {
  let pid;
  await assert.rejects(withBrowser(async (b) => {
    pid = b.pid; b.progress(); await new Promise(() => {});
  }, { timeout: 5000, retries: 0 }), (e) => e.code === 'WATCHDOG');
  assert.ok(Number.isInteger(pid), 'the page session must have started before the frame watchdog expires');
  assert.throws(() => process.kill(pid, 0));
});
test('ordinary failures are cleaned up and never retried', options, async () => {
  let count = 0, pid;
  await assert.rejects(withBrowser(async (b) => { count++; pid = b.pid; throw new Error('bad spec'); }), /bad spec/);
  assert.equal(count, 1); assert.throws(() => process.kill(pid, 0));
});
test('SIGINT cleanup closes the owned browser tree before exiting', options, async () => {
  const helper = new URL('../scripts/lib/browser.mjs', import.meta.url).href;
  const source = `import { startBrowser } from ${JSON.stringify(helper)};
    const b = await startBrowser(); console.log(JSON.stringify({pid:b.pid,profile:b.profile}));
    process.emit('SIGINT');`;
  const p = spawn(process.execPath, ['--input-type=module', '-e', source], { stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = ''; p.stdout.on('data', b => stdout += b); p.stderr.on('data', b => stderr += b);
  const code = await new Promise((r, j) => { p.on('error', j); p.on('close', r); });
  assert.equal(code, 130, stderr); const owned = JSON.parse(stdout.trim());
  assert.throws(() => process.kill(owned.pid, 0)); assert.ok(!existsSync(owned.profile), owned.profile);
});
test('MECHANISM_CDP=port still connects over a loopback port', options, async () => {
  const before = process.env.MECHANISM_CDP; process.env.MECHANISM_CDP = 'port';
  try { await withBrowser(async (b) => { assert.ok(b.port > 0); assert.equal(await b.ev('6 * 7'), 42); }); }
  finally { if (before === undefined) delete process.env.MECHANISM_CDP; else process.env.MECHANISM_CDP = before; }
});
