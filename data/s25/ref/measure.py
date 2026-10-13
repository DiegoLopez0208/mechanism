"""measure.py - mide el S25 Ultra sobre la foto oficial de GSMArena (vista trasera): escala desde el ancho publicado (77,6 mm),
radio de esquina por ajuste de la silueta y diametro/posicion de cada lente por componentes conexas oscuras.
Corre con:  uv run --with opencv-python-headless --with numpy python -I data/s25/ref/measure.py
Marco de coordenadas igual al de phones.json: vista trasera, x desde el borde izquierdo, y desde arriba (mm)."""
import cv2, numpy as np, json, sys

PUB_W, PUB_H = 77.6, 162.8                     # mm, publicado (GSMArena)
img = cv2.imread('data/s25/ref/s25-1.jpg')
print('imagen', img.shape)

def silhouette(img, crop):
    x0, x1, y0, y1 = crop
    g = cv2.cvtColor(img[y0:y1, x0:x1], cv2.COLOR_BGR2GRAY)
    m = (g < 246).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cs, key=cv2.contourArea)
    mask = np.zeros_like(m); cv2.drawContours(mask, [c], -1, 1, -1)
    return mask

def corner_radius(mask):
    ys, xs = np.nonzero(mask); x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max(); rs = []
    for (sx, sy) in [(1, 1), (-1, 1), (1, -1), (-1, -1)]:
        best = None
        for r in range(8, 110):
            err = 0; n = 0
            for k in range(0, r, 2):
                row = y0 + k if sy > 0 else y1 - k
                cols = np.nonzero(mask[row])[0]
                edge = cols.min() - x0 if sx > 0 else x1 - cols.max()
                expect = r - np.sqrt(max(0, r * r - (r - k) ** 2)); err += (edge - expect) ** 2; n += 1
            err /= max(1, n)
            if best is None or err < best[0]: best = (err, r)
        rs.append(best[1])
    return rs, (x0, x1, y0, y1)

# escala: la altura publicada (162,8 mm) sobre la altura en px (la tapa llena la imagen: filas 1..648); el ancho de la tapa esta tapado por el frente,
# asi que se cruza con el ancho del FRENTE (77,6 mm). Borde izquierdo de la tapa: x = 61 (filas 100..300, sin el S Pen).
LEFT, TOP, H_PX = 61, 1, 648
s = PUB_H / H_PX
fmask = silhouette(img, (287, 600, 0, 650)); ys, xs = np.nonzero(fmask); fw = xs.max() - xs.min() + 1
print('escala (altura)', round(s, 4), 'mm/px | ancho del frente', fw, 'px ->', round(fw * s, 2), 'mm (publicado', PUB_W, ') dif', round((fw * s / PUB_W - 1) * 100, 2), '%')
rs, _ = corner_radius(fmask)
print('radios de esquina del FRENTE px [TL, TR, BL, BR]', rs, '-> mm', [round(r * s, 1) for r in rs], '(TR y BR son las visibles)')
bm = silhouette(img, (60, 292, 0, 650)); rb, _ = corner_radius(bm)
print('radios de la TAPA px [TL, TR, BL, BR]', rb, '-> mm', [round(r * s, 1) for r in rb], '(TL y BL son las visibles)')
bx0, by0 = LEFT - 60, TOP
mask = bm; crop = (60, 292, 0, 650)

# lentes: componentes oscuras dentro de la silueta de la tapa
x0c, y0c = crop[0], crop[2]
g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
sub = g[y0c:crop[3], x0c:crop[1]]
dm = ((sub < 70) & (mask > 0)).astype(np.uint8)
dm[300:, :] = 0                                 # solo la zona de camaras (arriba)
dm = cv2.morphologyEx(dm, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
n, lab, stats, cen = cv2.connectedComponentsWithStats(dm)
out = []
for i in range(1, n):
    a = stats[i, cv2.CC_STAT_AREA]
    if a < 40: continue
    d_px = 2 * np.sqrt(a / np.pi); cx = cen[i][0] - bx0; cy = cen[i][1] - by0     # px desde el borde de la tapa
    out.append({'cx_mm': round(cx * s, 1), 'cyTop_mm': round(cy * s, 1), 'd_mm': round(d_px * s, 1), 'area_px': int(a), 'bbox_px': [int(stats[i, 2]), int(stats[i, 3])]})
out.sort(key=lambda o: (o['cx_mm'] > 25, o['cyTop_mm']))
print(json.dumps(out, indent=1))
# brillo del flash: el punto claro entre las lentes
cl = ((sub > 235) & (mask > 0)).astype(np.uint8); cl[250:, :] = 0
n2, lab2, st2, ce2 = cv2.connectedComponentsWithStats(cl)
print('claros pequenos cerca de las lentes:', [(round((ce2[i][0] - bx0) * s, 1), round((ce2[i][1] - by0) * s, 1), int(st2[i, 4])) for i in range(1, n2) if 5 < st2[i, 4] < 400])
