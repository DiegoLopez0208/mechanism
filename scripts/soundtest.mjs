// soundtest.mjs - renders a test bench of the sound engine to WAV (to listen to it and measure it without building a film)
import { readFileSync, writeFileSync } from 'node:fs'; import vm from 'node:vm';
const ctx = { window: {}, Math, Float32Array, console }; ctx.globalThis = ctx.window; vm.createContext(ctx);
vm.runInContext('var MX = (window.MX = {}); MX.rng = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };', ctx);
vm.runInContext(readFileSync('kit/sound.js', 'utf8'), ctx); const S = ctx.window.MX.sound;
const mats = ['glass', 'aluminum', 'steel', 'plastic', 'pcb', 'ceramic', 'pouch', 'rubber'], ev = [];
mats.forEach((m, i) => { ev.push({ t: 0.3 + i * 0.9, v: 'impact', mat: m, size: 40, pan: -0.6 + i * 0.17 }); ev.push({ t: 0.6 + i * 0.9, v: 'impact', mat: m, size: 8, pan: -0.6 + i * 0.17, vel: 0.7 }); });
ev.push({ t: 8.0, v: 'whoosh', d: 1.0, pan: -0.5 }, { t: 9.2, v: 'servo', d: 0.9 }, { t: 10.2, v: 'charge', d: 1.3 }, { t: 11.8, v: 'blip', f: 1500 }, { t: 12.0, v: 'tone', f: 880, timbre: 'bell' }, { t: 12.6, v: 'click' }, { t: 13.0, v: 'boom' });
const t0 = Date.now(), o = S.render({ duration: 15, events: ev, bed: { bpm: 104, root: 50, mode: 'mixolydian', level: 0.4 }, room: { size: 1, wet: 0.25 } });
console.log('render', Date.now() - t0, 'ms');
const N = o.L.length, buf = Buffer.alloc(44 + N * 4); buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(44100, 24); buf.writeUInt32LE(44100 * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, o.L[i])) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, o.R[i])) * 32767), 46 + i * 4); }
writeFileSync('out/soundtest.wav', buf); console.log('done out/soundtest.wav');
// ---- objective check: each material must sound different (spectral centroid and decay time) and the size must change the pitch
function feat(o) { const x = o.L, n = 8192, i0 = Math.floor(0.015 * 44100); let peak = 0, pf = 0, num = 0, den = 0; for (let f = 150; f < 7000; f += 12) { let re = 0, im = 0; for (let i = 0; i < n; i++) { const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / n), v = x[i0 + i] * w, ph = 2 * Math.PI * f * i / 44100; re += v * Math.cos(ph); im -= v * Math.sin(ph); } const m = Math.hypot(re, im); if (m > peak) { peak = m; pf = f; } num += m * f; den += m; } let pk = 0; for (let i = 0; i < x.length; i++) pk = Math.max(pk, Math.abs(x[i])); let t60 = 0; for (let i = x.length - 1; i >= 0; i--) if (Math.abs(x[i]) > pk * 0.001) { t60 = i / 44100; break; } return { centroidHz: Math.round(num / den), peakHz: pf, decayS: +t60.toFixed(2) }; }
console.log('material   size     centroid   peak      decay');
for (const m of mats) for (const size of [8, 60]) { const o2 = S.render({ duration: 3.6, events: [{ t: 0.05, v: 'impact', mat: m, size, send: 0 }], room: { wet: 0 } }); const f = feat(o2); console.log(m.padEnd(9), String(size).padStart(5), String(f.centroidHz).padStart(6) + ' Hz', String(f.peakHz).padStart(6) + ' Hz', f.decayS + ' s'); }
