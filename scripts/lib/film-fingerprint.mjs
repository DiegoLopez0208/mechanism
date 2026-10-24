import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
export const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
export function filmInputs(root, film) {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(root, 'kit/manifest.js'), 'utf8'), context);
  const files = context.MX_MANIFEST.order.map(name => 'kit/' + name).concat([
    'kit/manifest.js', 'kit/boot.js', 'kit/fonts.js', 'kit/technical-film.js', 'kit/production-film.js',
    'films/catalog.mjs', 'films/' + film.id + '/index.html', 'scripts/build-films.mjs',
    'scripts/render.mjs', 'scripts/lib/encoding.mjs', 'scripts/lib/browser.mjs', film.source + '/spec.js',
  ]);
  if (fs.existsSync(path.join(root, film.source, 'data.js'))) files.push(film.source + '/data.js');
  const inputs = Object.fromEntries([...new Set(files)].sort().map(file => [file, sha256(path.join(root, file))]));
  return { hash: crypto.createHash('sha256').update(JSON.stringify(inputs)).digest('hex'), inputs };
}
