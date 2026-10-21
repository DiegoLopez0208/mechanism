// Dependency-free lint: the repository has no install step, so this checks what can be checked with Node alone.
//   node scripts/lint.mjs            errors fail (exit 1); warnings are counted
//   node scripts/lint.mjs --strict   warnings fail too
// Errors: a file that does not parse (node --check), CRLF line endings, tabs for indentation, no final newline, a line longer than MAX.
// Warnings: lines longer than WARN, trailing whitespace. Vendored bundles and embedded data are skipped.
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

const errors = [], warnings = [];
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
    else if (line.length > WARN) warnings.push(at + ': line of ' + line.length + ' characters');
    if (/[ \t]+$/.test(line)) warnings.push(at + ': trailing whitespace');
  });
}

for (const e of errors) console.error('error  ' + e);
const long = warnings.filter((w) => w.includes('characters')).length, ws = warnings.length - long;
console.log(files.length + ' files, ' + errors.length + ' errors, ' + warnings.length + ' warnings (' + long + ' long lines over ' + WARN + ', ' + ws + ' with trailing whitespace)');
process.exit(errors.length || (strict && warnings.length) ? 1 : 0);
