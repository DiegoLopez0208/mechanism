#!/usr/bin/env node
// test-annotate.mjs - runs `node --test` with the given arguments and, on GitHub Actions, turns each failing test into an
// error annotation (title = the test, message = the first lines of its error), so a red check says what failed on the
// pull request page itself. Output and exit code are those of the test run.
//
//   node scripts/test-annotate.mjs --test-concurrency=1 tests/study-quality.test.mjs
import { spawn } from 'node:child_process';

const child = spawn(process.execPath, ['--test', '--test-reporter=tap', ...process.argv.slice(2)], { stdio: ['ignore', 'pipe', 'inherit'] });
let tap = '';
child.stdout.on('data', (chunk) => { process.stdout.write(chunk); tap += chunk; });
child.on('close', (code) => {
  if (code && process.env.GITHUB_ACTIONS) {
    const esc = (s) => s.replace(/%/g, '%25').replace(/\r/g, '').replace(/\n/g, '%0A');
    // a failing test is a "not ok N - name" line followed by an indented YAML block up to its "..." line
    for (const m of tap.matchAll(/^(\s*)not ok \d+ - (.+)\n((?:\1 +.*\n)*?)\1 +\.\.\.$/gm)) {
      const body = m[3].split('\n').filter((l) => !/^\s*(duration_ms:|type:|---$)/.test(l)).slice(0, 30).join('\n');
      console.log(`::error title=${esc(m[2]).slice(0, 200)}::${esc(body).slice(0, 4000)}`);
    }
  }
  process.exit(code ?? 1);
});
