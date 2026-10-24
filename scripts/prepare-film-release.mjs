// Read-only validation of source media, followed by a new external release folder.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { films, edition } from '../films/catalog.mjs';
import { revisionFilms } from '../films/revision-catalog.mjs';
import { filmInputs } from './lib/film-fingerprint.mjs';
import { revisionInputs } from './lib/revision-inputs.mjs';

const root = path.resolve(import.meta.dirname, '..');
const option = name => {
  const at = process.argv.indexOf(name);
  if (at < 0 || !process.argv[at + 1]) throw Error(name + ' <directory> is required');
  return path.resolve(process.argv[at + 1]);
};
const media = option('--media'), out = option('--out');
assert(!fs.existsSync(out), 'Output must be a new directory; existing releases are preserved.');
const receipt = JSON.parse(fs.readFileSync(path.join(media, 'manifest.json'), 'utf8'));
const revisedInputs = revisionInputs(root);
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const catalogue = [...films.slice(0, 3), ...revisionFilms, ...films.slice(3)];
assert.equal(catalogue.length, 34);
assert.equal(new Set(catalogue.map(film => film.id)).size, 34);
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const records = [];
for (const film of catalogue) {
  const record = receipt.films.find(row => row.id === film.id);
  assert(record, 'Missing receipt: ' + film.id);
  const file = film.id + '.mp4', source = path.join(media, file);
  assert.equal(sha(source), record.sha256, 'Media checksum: ' + film.id);
  assert(index.includes('media/' + edition + '/' + file), 'Gallery film: ' + film.id);
  assert(fs.existsSync(path.join(root, 'docs/media', edition, film.id + '.jpg')), 'Missing poster: ' + film.id);
  if (film.id.startsWith('revision-') && film.id !== 'revision-bearing') {
    assert.equal(revisedInputs.items[film.id.slice(9)].fingerprint, record.fingerprint, 'Stale Studio source: ' + film.id);
  } else if (!film.id.startsWith('revision-')) {
    assert.equal(filmInputs(root, film).hash, record.fingerprint.hash, 'Stale original source: ' + film.id);
  }
  records.push({ id: film.id, file, title: film.title, engine: film.engine,
    sha256: record.sha256, bytes: fs.statSync(source).size, duration: record.duration,
    width: record.width || 1600, height: record.height || 900, fps: record.fps || 30,
    viewer: film.viewer || 'films/' + film.id + '/view.html',
    evidence: film.evidencePath || film.source + '/spec.js' });
}
fs.mkdirSync(out, { recursive: true });
for (const record of records) fs.copyFileSync(path.join(media, record.file), path.join(out, record.file));
const manifest = { edition, count: 34, engines: { studio: 22, workflow: 6, paper: 6 },
  limits: 'Construction studies retain their source notes and estimates. Checksums establish file integrity, not physical or artistic validation.',
  films: records };
fs.writeFileSync(path.join(out, 'films-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(path.join(out, 'SHA256SUMS.txt'), records.map(row => row.sha256 + '  ' + row.file).join('\n') + '\n');
console.log('PASS: 34 checksums, 33 source fingerprints, 34 posters and gallery references. Release folder: ' + out);
