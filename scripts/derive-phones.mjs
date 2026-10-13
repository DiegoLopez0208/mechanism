// derive-phones.mjs - calcula, a partir de numeros PUBLICADOS, todo lo que se puede derivar de cada telefono y lo cruza con otro dato publicado.
// Escribe examples/phones/model.js. Cada derivacion imprime su verificacion: si no cierra, se dice.
import { readFileSync, writeFileSync } from 'node:fs';
const compare = process.argv.includes('--compare');   // --compare: S25 Ultra contra S26 Ultra (data/s25-vs-s26/s25.json + el S26 de phones.json)
const m = JSON.parse(readFileSync('data/phones/phones.json', 'utf8')), IN = 25.4, DIAG35 = 43.27, MM_PER_INCH_TYPE = 16;
if (compare) m.devices = [JSON.parse(readFileSync('data/s25-vs-s26/s25.json', 'utf8')), m.devices.find((d) => d.id === 's26')];
const f2 = (v, d = 2) => +v.toFixed(d), log = (...a) => console.log(...a);
for (const d of m.devices) {
  log('\n==', d.name);
  // pantalla activa: diagonal + relacion de aspecto de la resolucion (datos publicados); se cruza con el area publicada y los ppi
  const [rw, rh] = d.display.resolution, diag = d.display.diagIn * IN, asp = rh / rw, w = diag / Math.sqrt(1 + asp * asp), h = w * asp;
  const area = (w * h) / 100, pitch = (w / rw) * 1000, ppi = IN / (pitch / 1000);
  d.display.active = { w: f2(w, 1), h: f2(h, 1), method: 'diag ' + d.display.diagIn + ' in and the ' + rw + ' x ' + rh + ' px aspect (published)' };
  d.display.check = { areaCm2: f2(area, 1), areaPublished: d.display.areaCm2, ppi: Math.round(ppi), ppiPublished: d.display.ppi, pixelPitchUm: f2(pitch, 1) };
  d.display.bezelSide = f2((d.body.w - w) / 2, 2); d.display.bezelEnd = f2((d.body.h - h) / 2, 2);
  log('pantalla', f2(w, 1), 'x', f2(h, 1), 'mm | area', f2(area, 1), 'cm2 vs publicado', d.display.areaCm2, '(la diferencia es el redondeo de las esquinas) | ppi', Math.round(ppi), 'vs', d.display.ppi, '| pixel', f2(pitch, 1), 'um | bisel', d.display.bezelSide, d.display.bezelEnd);
  // camaras: sensor por formato optico, cruce con MP x pitch; pupila de entrada por focal equivalente y apertura
  for (const c of [...d.cameras, d.selfie]) {
    // El formato optico "1/x pulgada" es una convencion: los sensores grandes usan 16 mm por pulgada-tipo y los chicos (x > 2) 18 mm.
    const conv = c.format > 2.0 ? 18 : 16, fd = conv / c.format;
    let sd = fd, how = '1/' + c.format + '" optical format (' + conv + ' mm per inch-type)';
    c.sensor = {};
    if (c.pitchUm) { const mm2 = c.mp * 1e6 * (c.pitchUm / 1000) ** 2, wc = Math.sqrt(mm2 * 4 / 3), dc = Math.hypot(wc, wc * 0.75); c.sensor.cross = { diagMm: f2(fd), method: how, deltaPct: f2((fd / dc - 1) * 100, 1) }; sd = dc; how = c.mp + ' MP x (' + c.pitchUm + ' um)^2 at 4:3'; }
    c.sensor.diagMm = f2(sd); c.sensor.w = f2(sd * 0.8); c.sensor.h = f2(sd * 0.6); c.sensor.method = how; c.sensor.byFormatOnly = !c.pitchUm;
    let equiv = c.equivMm; if (!equiv && c.fovDeg) { equiv = DIAG35 / 2 / Math.tan(c.fovDeg * Math.PI / 360); c.equivDerived = true; }
    if (equiv) { const fr = equiv * sd / DIAG35; c.focalMm = f2(fr); c.pupilMm = f2(fr / c.f); c.equivUsed = f2(equiv, 1); }
    log(c.name.padEnd(22), 'sensor', c.sensor.w, 'x', c.sensor.h, 'mm (diag', c.sensor.diagMm + ')', c.sensor.cross ? '| cruce formato ' + c.sensor.cross.diagMm + ' (' + c.sensor.cross.deltaPct + '%)' : '| solo por formato', c.pupilMm ? '| focal ' + c.focalMm + ' mm, pupila ' + c.pupilMm + ' mm' + (c.equivDerived ? ' (focal equiv. derivada del FOV)' : '') : '');
  }
  // bateria: el tamano sale del interior MEDIDO (POCO: bahia de la foto oficial) o estimado (S26); se calcula la densidad de energia implicita como control
  const bat = d.layout.interior.battery, wh = d.battery.mAh / 1000 * 3.87, vol = bat.w * bat.h * bat.t / 1000;
  d.battery.energyWh = f2(wh, 1); d.battery.volumeCm3 = f2(vol, 1); d.battery.size = [bat.w, bat.h, bat.t]; d.battery.impliedWhPerL = Math.round(wh / vol * 1000);
  d.battery.sizeConf = d.id === 'poco' ? 'measured bay, thickness estimated' : 'estimated';
  log('bateria', d.battery.mAh, 'mAh ->', f2(wh, 1), 'Wh en', bat.w, 'x', bat.h, 'x', bat.t, 'mm =', f2(vol, 1), 'cm3 -> densidad implicita', d.battery.impliedWhPerL, 'Wh/L (', d.battery.sizeConf, ')');
}
writeFileSync(compare ? 'examples/s25-vs-s26/model.js' : 'examples/phones/model.js', '// generado por scripts/derive-phones.mjs desde data/phones/phones.json (no editar a mano)\nwindow.PHONES = ' + JSON.stringify(m, null, 1) + ';\n');
