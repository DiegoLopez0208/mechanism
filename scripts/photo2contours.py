"""photo2contours.py - segmenta objetos sobre fondo claro y guarda sus contornos reales (en pixeles) + medidas relativas.
   uv run --with opencv-python-headless --with numpy python scripts/photo2contours.py data/<name>/photo.jpg data/<name> [umbral]
   Salida: contours.json (poligonos, agujeros, caja orientada, largo/ancho en px) y debug.png (superposicion para revisar a ojo).
   Sin escala de referencia NO hay milimetros: solo proporciones. Un factor mm/px se aplica despues, desde un objeto de largo conocido."""
import sys, json
import cv2, numpy as np

src, out = sys.argv[1], sys.argv[2]
TH = float(sys.argv[3]) if len(sys.argv) > 3 else 22          # umbral de diferencia con el fondo (las sombras suaves del catalogo quedan por debajo)
MARGIN = 10                                                    # el catalogo trae un marco azul fino: se recorta
img = cv2.imread(src)[MARGIN:-MARGIN, MARGIN:-MARGIN]; H, W = img.shape[:2]
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY); hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
bg = float(np.median(np.concatenate([gray[:6].ravel(), gray[-6:].ravel(), gray[:, :6].ravel(), gray[:, -6:].ravel()])))
print('fondo gris ~', bg, 'imagen', W, 'x', H)
blur = cv2.GaussianBlur(gray, (3, 3), 0)
mask = (np.abs(blur.astype(np.float32) - bg) > TH).astype(np.uint8) * 255
gold = ((hsv[..., 1] > 40) & (hsv[..., 0] > 10) & (hsv[..., 0] < 40)).astype(np.uint8) * 255      # el dorado casi no contrasta en gris
mask = cv2.bitwise_or(mask, gold)
mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))

# separar objetos que se tocan: semillas por transformada de distancia y watershed solo dentro de la mascara
dist = cv2.distanceTransform(mask, cv2.DIST_L2, 3)
core = (dist > 3.2).astype(np.uint8)
core = cv2.morphologyEx(core, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
n0, lab0 = cv2.connectedComponents(core)
rest = cv2.bitwise_and(mask, cv2.bitwise_not(cv2.dilate(core, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))))   # partes finas que la erosion se comio
n1, lab1 = cv2.connectedComponents(rest)
markers = lab0.astype(np.int32); nxt = n0
for k in range(1, n1):
    reg = lab1 == k
    if reg.sum() >= 30:
        markers[reg & (markers == 0)] = nxt; nxt += 1
m2 = markers + 1                                               # 1 = fondo
m2[mask == 0] = 1
m2[(mask > 0) & (markers == 0)] = 0                            # por decidir
SPLIT = len(sys.argv) > 4 and sys.argv[4] == 'split'            # el watershed sobre-segmenta: es opcional
if SPLIT:
    m2 = cv2.watershed(cv2.cvtColor(mask, cv2.COLOR_GRAY2BGR), m2)
else:
    n2, cc = cv2.connectedComponents(mask); m2 = np.where(mask > 0, cc + 1, 1).astype(np.int32)

items = []
for v in np.unique(m2):
    if v <= 1: continue
    mm = ((m2 == v) & (mask > 0)).astype(np.uint8) * 255
    cs, hs = cv2.findContours(mm, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    if not cs: continue
    outer = [i for i in range(len(cs)) if hs[0][i][3] == -1]
    if not outer: continue
    i = max(outer, key=lambda j: cv2.contourArea(cs[j])); c = cs[i]; a = cv2.contourArea(c)
    if a < 120: continue
    holes = [cs[j] for j in range(len(cs)) if hs[0][j][3] == i and cv2.contourArea(cs[j]) > 25]
    x, y, w, h = cv2.boundingRect(c)
    mk = np.zeros(gray.shape, np.uint8); cv2.drawContours(mk, [c], -1, 255, -1)
    sat = float(hsv[..., 1][mk > 0].mean()); hue = float(hsv[..., 0][mk > 0].mean()); mean = float(gray[mk > 0].mean())
    if (sat > 35 and 85 < hue < 135) or mean < 110: continue   # el logo azul marino / negro "WORLDWIDE DELIVERY"
    (cx, cy), (rw, rh), ang = cv2.minAreaRect(c)
    items.append(dict(c=c, holes=holes, area=a, bbox=[x, y, w, h], rect=[cx, cy, max(rw, rh), min(rw, rh), ang]))
items.sort(key=lambda t: (round(t['bbox'][1] / 90), t['bbox'][0]))

res, dbg = [], img.copy()
for n, t in enumerate(items, 1):
    poly = cv2.approxPolyDP(t['c'], 0.9, True).reshape(-1, 2).tolist()
    holes = [cv2.approxPolyDP(h, 0.9, True).reshape(-1, 2).tolist() for h in t['holes']]
    cx, cy, L, Wd, ang = t['rect']
    res.append(dict(id=n, poly=poly, holes=holes, bbox=t['bbox'], area_px=round(t['area'], 1), length_px=round(L, 1), width_px=round(Wd, 1), center=[round(cx, 1), round(cy, 1)], angle=round(ang, 1)))
    cv2.drawContours(dbg, [t['c']], -1, (0, 120, 255), 1)
    cv2.putText(dbg, str(n), (int(cx) - 6, int(cy) + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 220), 1, cv2.LINE_AA)
cv2.imwrite(out + '/photo-crop.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 92])
cv2.imwrite(out + '/debug.png', cv2.resize(dbg, (W * 2, H * 2), interpolation=cv2.INTER_NEAREST))
json.dump(dict(image=dict(w=W, h=H, bg=bg, margin=MARGIN), items=res), open(out + '/contours.json', 'w'))
Lmax = max(r['length_px'] for r in res)
for r in res: print(r['id'], 'largo', r['length_px'], 'ancho', r['width_px'], 'rel', round(r['length_px'] / Lmax, 2), 'agujeros', len(r['holes']), 'bbox', r['bbox'])
print('instrumentos:', len(res))
