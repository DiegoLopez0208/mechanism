// prep-instruments.mjs - une contours.json (scripts/photo2contours.py) con overrides.json (curacion manual y explicita) y la foto recortada,
// y escribe examples/instruments/model.js. Sin escala de referencia NO hay milimetros: todo queda en pixeles de la foto y en proporciones.
import { readFileSync, writeFileSync } from 'node:fs';
const c = JSON.parse(readFileSync('data/instruments/contours.json', 'utf8')), o = JSON.parse(readFileSync('data/instruments/overrides.json', 'utf8'));
const img = readFileSync('data/instruments/photo-crop.jpg').toString('base64');
const byId = Object.fromEntries(c.items.map((t) => [t.id, t]));
const catOf = {}; Object.entries(o.categories).forEach(([k, ids]) => ids.forEach((i) => (catOf[i] = k)));
const merged = new Set(o.merge.flat().filter((i) => !o.merge.some((m) => m[0] === i)));
const ref = byId[o.referenceId].length_px;
const items = c.items.filter((t) => !o.drop.includes(t.id) && !merged.has(t.id)).map((t) => {
  const extra = (o.merge.find((m) => m[0] === t.id) || []).slice(1).map((i) => byId[i]);
  return { id: t.id, name: o.names[t.id], cat: catOf[t.id], shapes: [{ poly: t.poly, holes: t.holes }].concat(extra.map((e) => ({ poly: e.poly, holes: e.holes }))), center: t.center, bbox: t.bbox, length_px: t.length_px, width_px: t.width_px, area_px: t.area_px, rings: t.holes.length + extra.reduce((s, e) => s + e.holes.length, 0), rel: o.excludeFromIndex.includes(t.id) ? null : +(t.length_px / ref).toFixed(3), note: o.notes[t.id] || '' };
});
const model = { image: c.image, referenceId: o.referenceId, referenceLengthPx: ref, namesConf: o.namesConf, items, photo: 'data:image/jpeg;base64,' + img };
writeFileSync('examples/instruments/model.js', '// generado por scripts/prep-instruments.mjs (no editar a mano)\nwindow.INSTR = ' + JSON.stringify(model) + ';\n');
console.log(items.length, 'instrumentos; referencia', o.referenceId, ref, 'px');
items.forEach((t) => console.log(String(t.id).padStart(2), t.name.padEnd(34), t.cat.padEnd(8), 'largo', String(t.length_px).padStart(6), 'rel', t.rel, 'anillos', t.rings));
