// Dependency-free lint: the repository has no install step, so this checks what can be checked with Node alone.
//   node scripts/lint.mjs            errors fail (exit 1); warnings are counted
//   node scripts/lint.mjs --strict   warnings fail too
//   node scripts/lint.mjs --update-baseline   records today's long lines per file in scripts/lint-baseline.json
// Errors: a file that does not parse (node --check), CRLF line endings, tabs for indentation, no final newline, a line longer than MAX.
// Warnings: lines longer than WARN, trailing whitespace. Vendored bundles and embedded data are skipped.
// Ratchet: a file may not have more long lines than scripts/lint-baseline.json records for it (a new file: none), so the count
// can only go down. Shorten lines, then --update-baseline to lock the gain in.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const strict = process.argv.includes('--strict');
const MAX = 1500, WARN = 200;
const skip = [/(^|\/)kit\/vendor\//, /(^|\/)kit\/(samples|fonts)\.js$/, /(^|\/)node_modules\//];

const files = execFileSync('git', ['ls-files', '-z', '*.js', '*.mjs'], { cwd: root, encoding: 'utf8' })
  .split('\0').filter((f) => f && !skip.some((re) => re.test(f)));

const errors = [], warnings = [], longBy = {};
const baselineFile = path.join(root, 'scripts', 'lint-baseline.json'), updateBaseline = process.argv.includes('--update-baseline');
const baseline = fs.existsSync(baselineFile) ? JSON.parse(fs.readFileSync(baselineFile, 'utf8')) : {};
for (const rel of files) {
  const abs = path.join(root, rel);
  const text = fs.readFileSync(abs, 'utf8');
  const parsed = spawnSync(process.execPath, ['--check', abs], { encoding: 'utf8' });
  if (parsed.status !== 0) errors.push(rel + ': does not parse\n' + String(parsed.stderr).split('\n').slice(0, 4).join('\n'));
  if (text.includes('\r')) errors.push(rel + ': CRLF line endings (the repository is LF, see .gitattributes)');
  if (text.length && !text.endsWith('\n')) errors.push(rel + ': no newline at the end of the file');
  text.split('\n').forEach((line, i) => {
    const at = rel + ':' + (i + 1);
    if (/^\t/.test(line)) errors.push(at + ': tab indentation');
    if (line.length > MAX) errors.push(at + ': line of ' + line.length + ' characters (limit ' + MAX + ')');
    else if (line.length > WARN) { warnings.push(at + ': line of ' + line.length + ' characters'); longBy[rel] = (longBy[rel] || 0) + 1; }
    if (/[ \t]+$/.test(line)) warnings.push(at + ': trailing whitespace');
  });
}

if (updateBaseline) {
  const sorted = Object.fromEntries(Object.keys(longBy).sort().map((k) => [k, longBy[k]]));
  fs.writeFileSync(baselineFile, JSON.stringify(sorted, null, 2) + '\n'); console.log('wrote ' + path.relative(root, baselineFile));
} else for (const [rel, n] of Object.entries(longBy)) {
  if (n > (baseline[rel] || 0)) errors.push(rel + ': ' + n + ' lines over ' + WARN + ' characters, the baseline allows ' + (baseline[rel] || 0) + ' (shorten the new ones)');
}
for (const e of errors) console.error('error  ' + e);
const long = warnings.filter((w) => w.includes('characters')).length, ws = warnings.length - long;
console.log(files.length + ' files, ' + errors.length + ' errors, ' + warnings.length + ' warnings (' + long + ' long lines over ' + WARN + ', ' + ws + ' with trailing whitespace)');
process.exit(errors.length || (strict && warnings.length) ? 1 : 0);
