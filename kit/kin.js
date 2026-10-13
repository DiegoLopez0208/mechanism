/*
 * kit/kin.js - cinematica de trenes de engranajes. Puro (sin three.js): corre en el navegador y en Node, asi scripts/check-spec.mjs
 * verifica las relaciones de transmision sin abrir nada.
 *
 *   const K = MX.kin({ bodies: ['sun','carrier','ring','p1','p2'], teeth: { sun: 24, ring: 72, p1: 24, p2: 24 }, free: 'carrier',
 *                      links: [ { t: 'fixed', a: 'sun' },
 *                               { t: 'ext', a: 'sun',  b: 'p1', carrier: 'carrier' },      // engrane exterior: signos opuestos respecto del portasatelites
 *                               { t: 'int', a: 'ring', b: 'p1', carrier: 'carrier' },      // engrane interior: mismo signo
 *                               { t: 'same', a: 'x', b: 'y' } ] });                        // unidos por el mismo eje
 *   K.rates      -> { id: velocidad angular / velocidad del cuerpo libre }     (sistema lineal: un solo grado de libertad)
 *   K.at(theta)  -> { id: angulo }                                              (theta = angulo del cuerpo libre)
 *   K.ratio(a, b)-> rates[a] / rates[b]
 *   K.phases(meshes) -> { phi: { id: fase de los dientes }, checks: [...] }     (para que los dientes encajen de verdad en la imagen)
 * Relaciones (Willis): ext  za (wa - wc) = - zb (wb - wc);   int  za (wa - wc) = zb (wb - wc)   (a = corona).
 */
(function (g) {
  'use strict';
  const MX = (g.MX = g.MX || {}), TAU = Math.PI * 2;
  const wrap = (x) => ((x + Math.PI) % TAU + TAU) % TAU - Math.PI;

  // resuelve min |A x - b| por ecuaciones normales con Gauss (los sistemas son chicos)
  function solve(A, b, n) {
    const M = Array.from({ length: n }, () => new Array(n + 1).fill(0));
    for (let r = 0; r < A.length; r++) for (let i = 0; i < n; i++) { if (!A[r][i]) continue; for (let j = 0; j < n; j++) M[i][j] += A[r][i] * A[r][j]; M[i][n] += A[r][i] * b[r]; }
    for (let i = 0; i < n; i++) M[i][i] += 1e-12;
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      [M[c], M[p]] = [M[p], M[c]]; const d = M[c][c]; if (Math.abs(d) < 1e-14) continue;
      for (let j = c; j <= n; j++) M[c][j] /= d;
      for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c]; if (f) for (let j = c; j <= n; j++) M[r][j] -= f * M[c][j]; }
    }
    return M.map((row) => row[n]);
  }

  MX.kin = (def) => {
    const ids = def.bodies, ix = Object.fromEntries(ids.map((id, i) => [id, i])), n = ids.length, z = def.teeth || {}, A = [], b = [];
    const row = (terms, rhs) => { const r = new Array(n).fill(0); terms.forEach(([id, c]) => { if (ix[id] == null) throw new Error('cuerpo desconocido en un vinculo: ' + id); r[ix[id]] += c; }); A.push(r); b.push(rhs || 0); };
    const tz = (id) => { if (!z[id]) throw new Error('faltan los dientes de ' + id); return z[id]; };
    def.links.forEach((l) => {
      if (l.t === 'fixed') row([[l.a, 1]], l.value || 0);
      else if (l.t === 'same') row([[l.a, 1], [l.b, -1]]);
      else if (l.t === 'ext' || l.t === 'int') {
        const s = l.t === 'ext' ? 1 : -1, c = l.carrier;        // za wa + s zb wb - (za + s zb) wc = 0
        const terms = [[l.a, tz(l.a)], [l.b, s * tz(l.b)]]; if (c) terms.push([c, -(tz(l.a) + s * tz(l.b))]); row(terms, 0);
      } else throw new Error('tipo de vinculo desconocido: ' + l.t);
    });
    row([[def.free, 1]], 1);
    const x = solve(A, b, n), rates = Object.fromEntries(ids.map((id, i) => [id, Math.abs(x[i]) < 1e-12 ? 0 : x[i]]));
    // consistencia: todos los vinculos deben cumplirse a la vez (si no, hay un tren mal definido o un engrane trabado)
    const resid = A.reduce((m, r, k) => Math.max(m, Math.abs(r.reduce((s, c, i) => s + c * x[i], 0) - b[k])), 0);
    const K = { ids, rates, teeth: z, residual: resid, free: def.free };
    K.at = (theta) => Object.fromEntries(ids.map((id) => [id, rates[id] * theta]));
    K.ratio = (a, c) => rates[a] / rates[c];

    // fases de los dientes. meshes: [{ a, b, t: 'ext' | 'int', beta }]  beta = direccion (rad) del centro de a al centro de b con theta = 0.
    // ext: za (fa - beta) + zb (fb - beta - pi) = pi (mod 2pi);  int (a = corona): za (fa - beta) = zb (fb - beta) (mod 2pi)
    K.phases = (meshes, root) => {
      const phi = { [root || meshes[0].a]: 0 }, checks = [], pending = meshes.slice(), done = [];
      const fwd = (m) => {
        const za = tz(m.a), zb = tz(m.b), fa = phi[m.a];
        return m.t === 'ext' ? (Math.PI - za * (fa - m.beta)) / zb + m.beta + Math.PI : za * (fa - m.beta) / zb + m.beta;
      };
      const back = (m) => {
        const za = tz(m.a), zb = tz(m.b), fb = phi[m.b];
        return m.t === 'ext' ? (Math.PI - zb * (fb - m.beta - Math.PI)) / za + m.beta : zb * (fb - m.beta) / za + m.beta;
      };
      for (let guard = 0; guard < 200 && pending.length; guard++) {
        const i = pending.findIndex((m) => (phi[m.a] != null) !== (phi[m.b] != null)); if (i < 0) break;
        const m = pending.splice(i, 1)[0]; if (phi[m.a] != null) phi[m.b] = fwd(m); else phi[m.a] = back(m); done.push(m);
      }
      pending.concat(done).forEach((m) => {                 // residuo de cada engrane: 0 = los dientes encajan
        if (phi[m.a] == null || phi[m.b] == null) { checks.push({ a: m.a, b: m.b, ok: false, note: 'sin conexion con la raiz' }); return; }
        const za = tz(m.a), zb = tz(m.b), fa = phi[m.a], fb = phi[m.b];
        const r = m.t === 'ext' ? za * (fa - m.beta) + zb * (fb - m.beta - Math.PI) - Math.PI : za * (fa - m.beta) - zb * (fb - m.beta);
        checks.push({ a: m.a, b: m.b, t: m.t, residual: Math.abs(wrap(r)), ok: Math.abs(wrap(r)) < 1e-6 });
      });
      return { phi, checks };
    };
    return K;
  };

  // distancia entre centros que exige la geometria: ext a + b, int a - b (modulo m)
  MX.kin.center = (t, m, za, zb) => m * (t === 'ext' ? za + zb : Math.abs(za - zb)) / 2;
  // condicion de ensamblaje de un planetario con n satelites equiespaciados: (zs + zr) / n debe ser entero y zr = zs + 2 zp
  MX.kin.planetary = (zs, zp, zr, n) => ({ geometry: zr === zs + 2 * zp, assembly: Number.isInteger((zs + zr) / n), ringPerCarrier: (zr + zs) / zr });
})(typeof window !== 'undefined' ? window : globalThis);
