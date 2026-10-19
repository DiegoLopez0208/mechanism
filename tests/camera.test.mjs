// camera.test.mjs - the Studio film's exploded view -> first tour stop, measured on the scene itself (__pose places it at t without drawing,
// __geom projects every part), on three objects of different shape and size: lock, hub, rtx4090.
//   normal / extended: the whole exploded object is held still and readable 0.8-1 s, then the camera flies to the first stop in 0.7-0.8 s
//   with no jump, no overshoot and no sudden first frames; the card, the bell and the stop's label come with the landing
//   short: no hold; the cut keeps its timing
// Needs a Chromium-based browser (skipped without one, outside CI).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { withBrowser, findBrowser } from '../scripts/lib/browser.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const opts = { skip: !findBrowser() && !process.env.CI ? 'no Chromium browser found' : false, timeout: 600000 };
const EXAMPLES = ['lock', 'hub', 'rtx4090'], FPS = 30;

// opens one example at one length and returns the film's phases and, frame by frame from the end of the separation to the landing, the
// camera, the projected box of every part (screen rect, world box) and the director's state (hint, card alpha, focus)
const measure = (name, length, inject) => withBrowser(async (b) => {
  await b.send('Page.enable');
  if (inject) await b.send('Page.addScriptToEvaluateOnNewDocument', { source: `Object.defineProperty(window,'SPEC',{configurable:true,get(){return this.__spec;},set(v){${inject}this.__spec=v;}});` });
  await b.send('Page.navigate', { url: pathToFileURL(path.join(root, 'examples', name, 'index.html')).href + '?render=1&t=0&length=' + length });
  let ready = false;
  for (let i = 0; i < 400 && !ready; i++) { ready = await b.ev('typeof __pose === "function" && typeof __geom === "function" && typeof __specInfo === "function"'); if (!ready) await sleep(50); }
  assert.ok(ready, name + ' ' + length + ' did not initialize');
  return b.ev(`(() => {
    const info = __specInfo(), ph = info.phases, W = MX.ctx.canvas.width, H = MX.ctx.canvas.height, rows = [];
    for (let t = ph.separated; t <= ph.arrive + 1e-6; t += 1 / ${FPS}) {
      const s = __pose(t), g = __geom(t);
      rows.push({ t, cam: g.cam, focus: g.focus, hint: s.hint, card: s.focusA, parts: g.parts.map((p) => ({ id: p.id, a: p.alpha, behind: p.behind, r: p.rect, min: p.min, max: p.max })) });
    }
    return { info, W, H, rows, sounds: __soundEvents(), tour: info.shots.filter((x) => x.label.startsWith('tour ')).map((x) => x.label.slice(5)) };
  })()`);
}, { label: 'camera-test' });

const dist = (a, b) => Math.hypot(...a.map((v, k) => v - b[k]));
const union = (parts) => parts.filter((p) => !p.behind).reduce((a, p) => [Math.min(a[0], p.r[0]), Math.min(a[1], p.r[1]), Math.max(a[2], p.r[2]), Math.max(a[3], p.r[3])], [1e9, 1e9, -1e9, -1e9]);
const inFrame = (u, W, H) => (Math.max(0, Math.min(u[2], W) - Math.max(u[0], 0)) * Math.max(0, Math.min(u[3], H) - Math.max(u[1], 0))) / ((u[2] - u[0]) * (u[3] - u[1]));

// the exploded view as the viewer sees it during the hold: every part at full opacity, the whole object in frame, and the parts that do not
// move in the world (same box; the mechanism keeps turning slowly, so gears may spin or orbit) still on screen within 2 % of it
function checkHold(m, label) {
  const { info: { phases: ph }, W, H, rows } = m, held = rows.filter((r) => r.t <= ph.approach + 1e-6), r0 = held[0];
  const box0 = Object.fromEntries(r0.parts.map((p) => [p.id, p]));
  const still = (p) => { const q = box0[p.id]; return q && dist(p.min, q.min) < 0.05 && dist(p.max, q.max) < 0.05; };
  for (const r of held) {
    for (const p of r.parts) assert.ok(p.a >= 0.9 * box0[p.id].a, `${label} t=${r.t.toFixed(3)}: "${p.id}" dims during the hold (${p.a.toFixed(2)})`);
    assert.ok(inFrame(union(r.parts), W, H) >= 0.99, `${label} t=${r.t.toFixed(3)}: the exploded object leaves the frame during the hold`);
    for (const p of r.parts.filter(still)) { const q = box0[p.id].r, d = Math.max(Math.abs(p.r[0] - q[0]) / W, Math.abs(p.r[2] - q[2]) / W, Math.abs(p.r[1] - q[1]) / H, Math.abs(p.r[3] - q[3]) / H); assert.ok(d <= 0.02, `${label} t=${r.t.toFixed(3)}: "${p.id}" moves ${(d * 100).toFixed(1)} % of the screen: the camera is not holding`); }
    assert.equal(r.hint, 'EXPLODED VIEW', `${label} t=${r.t.toFixed(3)}: hint`);
    assert.ok(!(r.card > 0), `${label} t=${r.t.toFixed(3)}: a part card shows during the hold`);
  }
}

// the flight to the first stop: no tracked point (a part's box centre on screen) moves more than 20 % of the screen between two frames,
// the first frames start gently, the camera only gets closer to where it lands (no overshoot) and lands on the first stop
function checkFlight(m, label) {
  const { info: { phases: ph }, W, H, rows } = m, fly = rows.filter((r) => r.t >= ph.approach - 1e-6), end = fly[fly.length - 1], travel = dist(fly[0].cam, end.cam);
  let prev = null, far = Infinity;
  fly.forEach((r, i) => {
    if (prev) {
      const q = Object.fromEntries(prev.parts.map((p) => [p.id, p]));
      for (const p of r.parts) {
        const o = q[p.id]; if (!o || p.behind || o.behind) continue;
        const c = [(p.r[0] + p.r[2]) / 2, (p.r[1] + p.r[3]) / 2], d = [(o.r[0] + o.r[2]) / 2, (o.r[1] + o.r[3]) / 2], inside = (x) => x[0] >= 0 && x[0] <= W && x[1] >= 0 && x[1] <= H;
        if (!inside(c) && !inside(d)) continue;
        const jump = Math.max(Math.abs(c[0] - d[0]) / W, Math.abs(c[1] - d[1]) / H);
        assert.ok(jump <= 0.2, `${label} t=${r.t.toFixed(3)}: "${p.id}" jumps ${(jump * 100).toFixed(1)} % of the screen in one frame`);
        if (i <= 3) assert.ok(jump <= 0.05, `${label} t=${r.t.toFixed(3)}: frame ${i} of the flight moves "${p.id}" ${(jump * 100).toFixed(1)} % of the screen: not a gentle start`);
      }
      assert.ok(dist(r.cam, prev.cam) <= 0.12 * travel, `${label} t=${r.t.toFixed(3)}: ${(dist(r.cam, prev.cam) / travel * 100).toFixed(0)} % of the flight in one frame (a cut)`);
    }
    const left = dist(r.cam, end.cam); assert.ok(left <= far + 0.01 * travel, `${label} t=${r.t.toFixed(3)}: the camera moves away from where it lands (overshoot)`); far = Math.min(far, left); prev = r;
  });
  const f = end.parts.find((p) => p.id === m.tour[0]);
  assert.equal(end.focus, m.tour[0], `${label}: the first stop is "${m.tour[0]}"`);
  assert.ok(f && !f.behind && inFrame(f.r, W, H) >= 0.6, `${label}: the first stop "${m.tour[0]}" is not in the frame when the camera lands`);
  assert.ok(Math.abs((f.r[0] + f.r[2]) / 2 - W / 2) <= W * 0.25, `${label}: the camera lands off the first stop`);
}

// the picture and the sound agree: the exploded view's label holds until the stop begins, the card comes with the camera, the stop's bell
// rings as the camera lands, and nothing of the tour sounds while the exploded view is held
function checkSync(m, label) {
  const { info: { phases: ph }, rows, sounds } = m;
  const at = (t) => rows.reduce((b, r) => (Math.abs(r.t - t) < Math.abs(b.t - t) ? r : b));
  assert.equal(at(ph.tour - 0.05).hint, 'EXPLODED VIEW', `${label}: the label changes before the stop begins`);
  assert.match(at(ph.arrive).hint, /^PART 1 OF \d+$/, `${label}: the stop's label`);
  assert.ok(!(at(ph.tour - 0.05).card > 0.01), `${label}: the card shows before the stop begins`);
  const bell = sounds.filter((e) => e.v === 'tone' && e.t > ph.separated).sort((a, b) => a.t - b.t)[0];
  assert.ok(bell && Math.abs(bell.t - ph.arrive) < 1e-6, `${label}: the first stop's bell rings at ${bell && bell.t.toFixed(3)}, the camera lands at ${ph.arrive.toFixed(3)}`);
  const boom = sounds.filter((e) => e.v === 'boom' && e.t < ph.separated).sort((a, b) => b.t - a.t)[0];
  assert.ok(boom && Math.abs(boom.t - (ph.separated - 0.5)) < 1e-6, `${label}: the explosion's boom is tied to the end of the separation`);
  assert.ok(!sounds.some((e) => (e.v === 'tone' || e.v === 'impact' || e.v === 'whoosh') && e.t > ph.separated + 1e-6 && e.t < ph.arrive - 1e-6), `${label}: a tour sound plays before the camera lands`);
}

for (const name of EXAMPLES) test(`${name}: normal and extended hold the whole exploded view still 0.8-1 s, then fly to the first stop in 0.7-0.8 s`, opts, async () => {
  for (const length of ['normal', 'extended']) {
    const m = await measure(name, length), ph = m.info.phases, label = `${name} ${length}`;
    assert.ok(ph.approach - ph.separated >= 0.8 - 1e-9 && ph.approach - ph.separated <= 1 + 1e-9, `${label}: hold ${(ph.approach - ph.separated).toFixed(3)} s`);
    assert.ok(ph.arrive - ph.approach >= 0.7 - 1e-9 && ph.arrive - ph.approach <= 0.8 + 1e-9, `${label}: flight ${(ph.arrive - ph.approach).toFixed(3)} s`);
    checkHold(m, label); checkFlight(m, label); checkSync(m, label);
  }
});

// the short cut keeps its structure: no hold, the stop begins 0.4 s after the separation and the camera lands 0.7 s after it (the timing it
// had before the hold existed); the flight itself has the same smooth curve
test('short: no hold, the same timing as before, and a smooth flight to the first stop', opts, async () => {
  for (const name of EXAMPLES) {
    const m = await measure(name, 'short'), ph = m.info.phases, label = `${name} short`;
    assert.ok(Math.abs(ph.approach - ph.separated) < 1e-9, `${label}: a hold in the short cut`);
    assert.ok(Math.abs(ph.tour - ph.separated - 0.4) < 1e-9 && Math.abs(ph.arrive - ph.separated - 0.7) < 1e-9, `${label}: the stop begins ${(ph.tour - ph.separated).toFixed(3)} s after the separation`);
    checkFlight(m, label); checkSync(m, label);
  }
});

test('director.explodedHold sets the hold, and only the normal and extended cuts get one', opts, async () => {
  const set = 'v.director=Object.assign({},v.director,{explodedHold:0.5});';
  const normal = await measure('lock', 'normal', set), short = await measure('lock', 'short', set), base = await measure('lock', 'normal');
  assert.ok(Math.abs(normal.info.phases.approach - normal.info.phases.separated - 0.5) < 1e-9);
  assert.ok(Math.abs(short.info.phases.approach - short.info.phases.separated) < 1e-9);
  // everything after the hold moves with it, by the same amount
  const shift = base.info.phases.tour - normal.info.phases.tour;
  assert.ok(Math.abs(shift - 0.4) < 1e-9, `the tour moved by ${shift.toFixed(3)} s`);
  assert.ok(Math.abs(base.info.phases.reassemble - normal.info.phases.reassemble - shift) < 1e-9 && Math.abs(base.info.phases.panels - normal.info.phases.panels - shift) < 1e-9);
});
