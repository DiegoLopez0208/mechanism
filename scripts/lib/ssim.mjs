// Local-window SSIM (8x8, luminance, population variance). No dependencies.
// Self-contained so the same implementation can run beside canvas pixels.
export function comparePixels(a, b, width, height, channels = 4) {
  if (a.length !== b.length || a.length !== width * height * channels) throw new Error('pixel dimensions differ');
  let sum = 0, min = 1, windows = 0, bad = 0, abs = 0;
  const bias = [0, 0, 0], c1 = (0.01 * 255) ** 2, c2 = (0.03 * 255) ** 2;
  for (let y = 0; y < height; y += 8) for (let x = 0; x < width; x += 8) {
    let sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0, n = 0;
    for (let j = y; j < Math.min(y + 8, height); j++) for (let i = x; i < Math.min(x + 8, width); i++) {
      const k = (j * width + i) * channels;
      const u = 0.2126 * a[k] + 0.7152 * a[k + 1] + 0.0722 * a[k + 2];
      const v = 0.2126 * b[k] + 0.7152 * b[k + 1] + 0.0722 * b[k + 2];
      sa += u; sb += v; saa += u * u; sbb += v * v; sab += u * v; n++;
      for (let c = 0; c < 3; c++) { const d = a[k + c] - b[k + c]; bias[c] += d; abs += Math.abs(d); }
    }
    const ma = sa / n, mb = sb / n, va = Math.max(0, saa / n - ma * ma), vb = Math.max(0, sbb / n - mb * mb), cov = sab / n - ma * mb;
    const score = ((2 * ma * mb + c1) * (2 * cov + c2)) / ((ma * ma + mb * mb + c1) * (va + vb + c2));
    sum += score; min = Math.min(min, score); if (score < 0.95) bad++; windows++;
  }
  return { ssim: sum / windows, min, badFraction: bad / windows, meanAbs: abs / (width * height * 3), bias: bias.map(v => v / (width * height)) };
}
