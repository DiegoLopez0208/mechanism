// Version policy (CONTRIBUTING.md, "Versions"): package.json is the version of the full Mechanism plugin and .claude-plugin/plugin.json
// repeats it; every plugin under plugins/<name>/ has its own version, the same in its skill.json, its .claude-plugin/plugin.json and the
// generated files.json; the marketplace lists every plugin folder; manifest links point at pages that exist on main.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = (f) => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
const semver = /^\d+\.\d+\.\d+$/;
const plugins = fs.readdirSync(path.join(root, 'plugins')).filter((n) => fs.existsSync(path.join(root, 'plugins', n, '.claude-plugin', 'plugin.json')));

test('the full plugin repeats the repository version', () => {
  const pkg = json('package.json'), plugin = json('.claude-plugin/plugin.json');
  assert.match(pkg.version, semver); assert.equal(plugin.version, pkg.version, '.claude-plugin/plugin.json must carry the version of package.json');
});

test('each sub-plugin has one version, the same in skill.json, its plugin.json and files.json', () => {
  assert.ok(plugins.length >= 1);
  for (const n of plugins) {
    const skill = json(`plugins/${n}/skill.json`), plugin = json(`plugins/${n}/.claude-plugin/plugin.json`), files = json(`plugins/${n}/files.json`);
    assert.match(skill.version, semver, n);
    assert.equal(plugin.version, skill.version, n + ': plugin.json'); assert.equal(files.version, skill.version, n + ': files.json (rebuild with scripts/build-skill.mjs)');
    assert.equal(plugin.name, n); assert.equal(skill.name, n);
  }
});

test('the marketplace lists the full plugin and every sub-plugin, each at a folder that exists', () => {
  const m = json('.claude-plugin/marketplace.json'), byName = Object.fromEntries(m.plugins.map((p) => [p.name, p]));
  assert.equal(byName.mechanism?.source, './');
  for (const n of plugins) assert.equal(byName[n]?.source, './plugins/' + n, n + ' must be listed in the marketplace');
  for (const p of m.plugins) assert.ok(fs.existsSync(path.join(root, p.source)), p.name + ': ' + p.source + ' does not exist');
});

test('manifest links do not point at repository paths that main may not have (a branch-only folder would 404)', () => {
  for (const f of ['.claude-plugin/plugin.json', ...plugins.map((n) => `plugins/${n}/.claude-plugin/plugin.json`)]) {
    const p = json(f);
    for (const k of ['homepage', 'repository']) if (p[k]) assert.doesNotMatch(p[k], /\/(tree|blob)\//, f + ': ' + k + ' links into a branch path; use the repository URL');
  }
});
